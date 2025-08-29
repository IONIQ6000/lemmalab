import { ProofLineInput, ProofValidationResult } from "./types";
import { Parser } from "./parser";
import { Ast } from "./ast";
import { equalsCanonical } from "./ast";

function normalizeFormula(formula: string | undefined): string {
  if (!formula) return "";
  return formula
    .replace(/\s+/g, "")
    .replace(/∧|&/g, "^")
    .replace(/→|=>/g, "->")
    .replace(/∨|\|\|/g, "v")
    .replace(/↔|<=>/g, "<->")
    .replace(/¬|~/g, "!")
    .replace(/∀/g, "forall")
    .replace(/∃/g, "exists");
}

function isConjunction(formula: string): boolean {
  const f = normalizeFormula(formula);
  // Very naive: expects something like (A^B) with outer parens
  return /^\([^()]+\^[^()]+\)$/.test(f);
}

function splitConjunction(formula: string): [string, string] | null {
  const f = normalizeFormula(formula);
  const match = f.match(/^\((.+)\^(.+)\)$/);
  if (!match) return null;
  return [match[1], match[2]];
}

// --- Alpha-equivalence helpers (string-based, heuristic) ---
function parseQuantified(src?: string): { kind: "forall" | "exists"; v: string; body: string } | null {
  const s = normalizeFormula(src);
  let m = s.match(/^forall([a-zA-Z])\((.*)\)$/);
  if (m) return { kind: "forall", v: m[1], body: m[2] };
  m = s.match(/^exists([a-zA-Z])\((.*)\)$/);
  if (m) return { kind: "exists", v: m[1], body: m[2] };
  return null;
}

function replaceVar(body: string, v: string, term: string): string {
  return body.replace(new RegExp(`(?<![a-zA-Z0-9_])${v}(?![a-zA-Z0-9_])`, "g"), term);
}

function alphaEqual(a?: string, b?: string): boolean {
  const sa = normalizeFormula(a);
  const sb = normalizeFormula(b);
  if (sa === sb) return true;
  const qa = parseQuantified(sa);
  const qb = parseQuantified(sb);
  if (qa && qb && qa.kind === qb.kind) {
    const bodyA = replaceVar(qa.body, qa.v, "_v");
    const bodyB = replaceVar(qb.body, qb.v, "_v");
    return bodyA === bodyB;
  }
  return false;
}

function extractIdentifiers(s: string): string[] {
  const ids = new Set<string>();
  const m = s.match(/[a-zA-Z][a-zA-Z0-9_]*/g) || [];
  for (const t of m) {
    if (t === "forall" || t === "exists") continue;
    ids.add(t);
  }
  return Array.from(ids);
}

function isInstanceOf(body: string, variable: string, target: string): boolean {
  const normBody = normalizeFormula(body);
  const normTarget = normalizeFormula(target);
  if (normBody === normTarget) return true;
  const tokens = extractIdentifiers(normTarget);
  for (const tok of tokens) {
    if (normalizeFormula(replaceVar(normBody, variable, tok)) === normTarget) return true;
  }
  return false;
}

const parseMemo = new Map<string, Ast>();
function parseAstSafe(src: string | undefined): Ast | undefined {
  const key = src ?? "";
  if (parseMemo.has(key)) return parseMemo.get(key);
  try {
    const ast = new Parser(src ?? "").parse();
    parseMemo.set(key, ast);
    return ast;
  } catch {
    return undefined;
  }
}

export function validateProof(
  premises: string[],
  conclusion: string,
  lines: ProofLineInput[],
  rules: string
): ProofValidationResult {
  const lineByNo = new Map<string, { raw: ProofLineInput; ast?: Ast }>();
  const results = [] as { lineNo: string; ok: boolean; messages: string[]; evidence?: { rule: string; refs: string[]; info?: string } }[];

  // Seed premises as known statements (not lines)
  const known = new Set(premises.map((p) => normalizeFormula(p)));
  const knownAst = new Set<Ast>();
  for (const p of premises) {
    const a = parseAstSafe(p);
    if (a) knownAst.add(a);
  }

  const getAst = (no: string): Ast | undefined => lineByNo.get(no)?.ast;

  // Track subproof frames from depth changes
  type Frame = { depth: number; startIdx: number; startLineNo: string; assumptionFormula?: string; endIdx?: number; endLineNo?: string };
  const frames: Frame[] = [];
  const stack: Frame[] = [];

  for (let i = 0; i < lines.length; i++) {
    const curDepth = lines[i]?.depth ?? 0;
    const prevDepth = i > 0 ? (lines[i - 1]?.depth ?? 0) : 0;
    // Opening frames
    if (curDepth > prevDepth) {
      for (let d = prevDepth; d < curDepth; d++) {
        const f: Frame = { depth: d + 1, startIdx: i, startLineNo: String(lines[i].lineNo), assumptionFormula: lines[i].formula };
        stack.push(f); frames.push(f);
      }
    }
    // Closing frames
    if (curDepth < prevDepth) {
      for (let d = prevDepth; d > curDepth; d--) {
        const f = stack.pop();
        if (f) { f.endIdx = i - 1; f.endLineNo = String(lines[i - 1].lineNo); }
      }
    }
  }
  // Close any remaining frames at end
  while (stack.length) {
    const f = stack.pop()!; f.endIdx = lines.length - 1; f.endLineNo = String(lines[lines.length - 1].lineNo);
  }

  // Quick map for ref -> index
  const lineIndexByNo = new Map<string, number>();
  lines.forEach((l, idx) => lineIndexByNo.set(String(l.lineNo), idx));

  for (const line of lines) {
    const messages: string[] = [];
    const lineNo = String(line.lineNo ?? "?");
    const formula = normalizeFormula(line.formula);
    const rule = (line.rule ?? "").trim();
    const refs = (line.refs ?? []).map((r) => String(r));
    const ast = parseAstSafe(line.formula);

    if (!lineNo) messages.push("Line number required");
    if (!formula) messages.push("Formula required");

    let evidence: { rule: string; refs: string[]; info?: string } | undefined;

    // Rule checks (very minimal draft)
    if (rule === "" || /premise/i.test(rule)) {
      // Accept any as premise
      known.add(formula);
      if (ast) knownAst.add(ast);
      evidence = { rule: "Premise", refs: [] };
    } else if (/reiteration/i.test(rule)) {
      if (refs.length !== 1) messages.push("Reiteration needs exactly 1 reference");
      const ref = refs[0];
      const refLine = lineByNo.get(ref)?.raw;
      if (!refLine?.formula) messages.push("Referenced line not found");
      if (refLine?.formula && normalizeFormula(refLine.formula) !== formula) {
        messages.push("Reiteration formula must match referenced line");
      }
      evidence = { rule: "Reiteration", refs };
    } else if (/conjunction\s*intro/i.test(rule) || /\bci\b/i.test(rule)) {
      // AST-aware: current must be And(ref1, ref2)
      if (refs.length !== 2) messages.push("Conjunction Introduction needs 2 references");
      const a1 = getAst(refs[0]);
      const a2 = getAst(refs[1]);
      const a = ast;
      if (a && a1 && a2) {
        if (!(a as any).kind || (a as any).kind !== "and") {
          messages.push("Conclusion must be a conjunction A^B");
        } else {
          const left = (a as any).left as Ast;
          const right = (a as any).right as Ast;
          if (!equalsCanonical(left, a1) || !equalsCanonical(right, a2)) {
            messages.push("Conjuncts must match referenced lines in order");
          }
        }
      } else {
        if (!isConjunction(formula)) messages.push("Formula must be a conjunction like (A ^ B)");
        const parts = splitConjunction(formula);
        if (parts) {
          const [left, right] = parts;
          const [r1, r2] = refs.map((r) => lineByNo.get(r)?.raw.formula).map((f) => normalizeFormula(f));
          if (!r1 || !r2) messages.push("Referenced lines missing");
          if (r1 && r1 !== left) messages.push("Left conjunct must match first reference");
          if (r2 && r2 !== right) messages.push("Right conjunct must match second reference");
        }
      }
      evidence = { rule: "Conjunction Intro", refs };
    } else if (/conjunction\s*elim/i.test(rule) || /\bce\b/i.test(rule)) {
      // AST-aware: from And(X,Y) infer X or Y
      if (refs.length !== 1) messages.push("Conjunction Elimination needs 1 reference");
      const refA = getAst(refs[0]);
      if (ast && refA) {
        if ((refA as any).kind !== "and") {
          messages.push("Referenced line is not a conjunction");
        } else {
          const left = (refA as any).left as Ast;
          const right = (refA as any).right as Ast;
          if (!equalsCanonical(ast, left) && !equalsCanonical(ast, right)) {
            messages.push("Result must be one conjunct of the referenced conjunction");
          }
        }
      }
      evidence = { rule: "Conjunction Elim", refs };
    } else if (/conditional\s*elim/i.test(rule) || /modus\s*ponens/i.test(rule) || /\bmp\b/i.test(rule)) {
      // AST-aware: from A and (A->B) infer B (order-insensitive)
      if (refs.length !== 2) messages.push("Conditional Elim needs 2 references");
      const a1 = getAst(refs[0]);
      const a2 = getAst(refs[1]);
      if (ast && a1 && a2) {
        const check = (prem: Ast, cond: Ast): boolean => (cond as any).kind === "imp" && equalsCanonical((cond as any).left, prem) && equalsCanonical(ast as Ast, (cond as any).right);
        if (!check(a1, a2) && !check(a2, a1)) {
          messages.push("References must be A and (A->B); conclusion must be B");
        }
      }
      evidence = { rule: "Conditional Elim", refs };
    } else if (/modus\s*tollens/i.test(rule) || /\bmt\b/i.test(rule)) {
      // AST-aware: from (A->B) and !B infer !A (order-insensitive)
      if (refs.length !== 2) messages.push("Modus Tollens needs 2 references");
      const a1 = getAst(refs[0]);
      const a2 = getAst(refs[1]);
      if (ast && a1 && a2) {
        const isNot = (x: Ast) => (x as any).kind === "not";
        const check = (cond: Ast, notB: Ast): boolean =>
          (cond as any).kind === "imp" && isNot(notB) && equalsCanonical((notB as any).arg, (cond as any).right) && (ast as any).kind === "not" && equalsCanonical(((ast as any).arg as Ast), (cond as any).left);
        if (!check(a1, a2) && !check(a2, a1)) {
          messages.push("References must be (A->B) and !B; conclusion must be !A");
        }
      }
      evidence = { rule: "Modus Tollens", refs };
    } else if (/biconditional\s*intro/i.test(rule)) {
      // AST-aware: from (A->B) and (B->A) infer (A<->B)
      if (refs.length !== 2) messages.push("Biconditional Intro needs 2 references");
      const c = ast;
      const r1 = getAst(refs[0]);
      const r2 = getAst(refs[1]);
      if (c && r1 && r2) {
        const isImp = (x: Ast) => (x as any).kind === "imp";
        const isIff = (x: Ast) => (x as any).kind === "iff";
        if (!isIff(c) || !isImp(r1) || !isImp(r2)) {
          messages.push("Must use two conditionals to conclude a biconditional");
        } else {
          const r1l = (r1 as any).left as Ast, r1r = (r1 as any).right as Ast;
          const r2l = (r2 as any).left as Ast, r2r = (r2 as any).right as Ast;
          const cl = (c as any).left as Ast, cr = (c as any).right as Ast;
          const ok = (equalsCanonical(r1l, cl) && equalsCanonical(r1r, cr) && equalsCanonical(r2l, cr) && equalsCanonical(r2r, cl))
                 || (equalsCanonical(r1l, cr) && equalsCanonical(r1r, cl) && equalsCanonical(r2l, cl) && equalsCanonical(r2r, cr));
          if (!ok) messages.push("Conditionals must match both directions of the biconditional");
        }
      }
      evidence = { rule: "Biconditional Intro", refs };
    } else if (/biconditional\s*elim/i.test(rule)) {
      // AST-aware: from (A<->B) and A infer B (or with B infer A)
      if (refs.length !== 2) messages.push("Biconditional Elim needs 2 references");
      const c = ast;
      const a1 = getAst(refs[0]);
      const a2 = getAst(refs[1]);
      if (c && a1 && a2) {
        const isIff = (x: Ast) => (x as any).kind === "iff";
        const sideFromIff = (iff: Ast, side: Ast): Ast | undefined => {
          const l = (iff as any).left as Ast, r = (iff as any).right as Ast;
          if (equalsCanonical(side, l)) return r;
          if (equalsCanonical(side, r)) return l;
          return undefined;
        };
        let ok = false;
        if (isIff(a1)) {
          const other = sideFromIff(a1, a2!);
          if (other && equalsCanonical(c, other)) ok = true;
        }
        if (!ok && isIff(a2)) {
          const other = sideFromIff(a2, a1!);
          if (other && equalsCanonical(c, other)) ok = true;
        }
        if (!ok) messages.push("One reference must be a biconditional, the other a matching side");
      }
      evidence = { rule: "Biconditional Elim", refs };
    } else if (/negation\s*intro/i.test(rule)) {
      const notM = normalizeFormula(line.formula).match(/^!(.+)$/);
      if (!notM) messages.push("¬Intro conclusion must be a negation !A");
      if (refs.length < 1) messages.push("¬Intro expects references inside the subproof");
      const frame = frames.find(fr => notM && alphaEqual(fr.assumptionFormula, notM[1]));
      if (!frame) messages.push("No subproof frame found for assumption A");
      let contradiction = false;
      if (frame) {
        const inside = (ref: string) => {
          const idx = lineIndexByNo.get(String(ref));
          return idx != null && idx >= frame.startIdx && (frame.endIdx == null || idx <= frame.endIdx);
        };
        const refIndices = refs.filter(inside).map(r => lineIndexByNo.get(String(r))!).filter(i => i != null);
        // Look for (X^!X) or X and !X
        for (const idx of refIndices) {
          const s = normalizeFormula(lines[idx]?.formula);
          const m = s.match(/^\((.+)\^(.+)\)$/);
          if (m) {
            const a1 = parseAstSafe(m[1]); const a2 = parseAstSafe(m[2]);
            if (a1 && a2 && ((a1 as any).kind === "not" ? equalsCanonical((a1 as any).arg, a2) : (a2 as any).kind === "not" && equalsCanonical((a2 as any).arg, a1))) {
              contradiction = true; break;
            }
          }
        }
        if (!contradiction) {
          for (let i = 0; i < refIndices.length; i++) for (let j = i + 1; j < refIndices.length; j++) {
            const x = parseAstSafe(lines[refIndices[i]]?.formula);
            const y = parseAstSafe(lines[refIndices[j]]?.formula);
            if (x && y && ( (x as any).kind === "not" ? equalsCanonical((x as any).arg, y!) : (y as any).kind === "not" && equalsCanonical((y as any).arg, x!) )) {
              contradiction = true; break;
            }
          }
        }
      }
      if (!contradiction) messages.push("No contradiction found inside subproof");
      evidence = { rule: "Negation Intro", refs, info: frame ? `Assumption @${frame.startLineNo}` : undefined };
    } else if (/conditional\s*intro/i.test(rule)) {
      const imp = normalizeFormula(line.formula).match(/^\((.+)->(.+)\)$/);
      if (!imp) messages.push("→Intro conclusion must be a conditional (A->B)");
      if (refs.length !== 2) messages.push("→Intro expects [assumptionLine, derivedLine]");
      const [assRef, derivedRef] = refs;
      const frame = frames.find(fr => Number(fr.startLineNo) === Number(assRef));
      if (!frame) messages.push("No subproof frame matches the assumption ref");
      const derivedIdx = lineIndexByNo.get(String(derivedRef));
      if (frame && (derivedIdx == null || derivedIdx < frame.startIdx || (frame.endIdx != null && derivedIdx > frame.endIdx))) {
        messages.push("Derived line must be inside the subproof");
      }
      if (imp && frame) {
        const ante = imp[1], cons = imp[2];
        if (!alphaEqual(frame.assumptionFormula, ante)) messages.push("Assumption must match antecedent");
        const derivedAst = parseAstSafe(lines[derivedIdx ?? -1]?.formula);
        const consAst = parseAstSafe(cons);
        if (!(derivedAst && consAst && equalsCanonical(derivedAst, consAst))) messages.push("Derived line must match conditional consequent");
      }
      evidence = { rule: "Conditional Intro", refs, info: frame ? `Discharged @${frame.startLineNo}` : undefined };
    } else if (/^(indirect\s*proof|ip)$/i.test(rule)) {
      const cAst = parseAstSafe(line.formula);
      if (!cAst) messages.push("IP conclusion must be a formula A");
      const frame = frames.find(fr => {
        const a = normalizeFormula(fr.assumptionFormula);
        const m = a.match(/^!(.+)$/);
        if (!m) return false;
        const asum = parseAstSafe(m[1]);
        return asum && cAst && equalsCanonical(asum, cAst);
      });
      if (!frame) messages.push("No subproof frame found with assumption !A");
      let contradiction = false;
      if (frame) {
        const inside = (ref: string) => {
          const idx = lineIndexByNo.get(String(ref));
          return idx != null && idx >= frame.startIdx && (frame.endIdx == null || idx <= frame.endIdx);
        };
        const refIndices = refs.filter(inside).map(r => lineIndexByNo.get(String(r))!).filter(i => i != null);
        for (const idx of refIndices) {
          const s = normalizeFormula(lines[idx]?.formula);
          const m = s.match(/^\((.+)\^(.+)\)$/);
          if (m) {
            const a1 = parseAstSafe(m[1]); const a2 = parseAstSafe(m[2]);
            if (a1 && a2 && ((a1 as any).kind === "not" ? equalsCanonical((a1 as any).arg, a2) : (a2 as any).kind === "not" && equalsCanonical((a2 as any).arg, a1))) {
              contradiction = true; break;
            }
          }
        }
        if (!contradiction) {
          for (let i = 0; i < refIndices.length; i++) for (let j = i + 1; j < refIndices.length; j++) {
            const x = parseAstSafe(lines[refIndices[i]]?.formula);
            const y = parseAstSafe(lines[refIndices[j]]?.formula);
            if (x && y && ( (x as any).kind === "not" ? equalsCanonical((x as any).arg, y!) : (y as any).kind === "not" && equalsCanonical((y as any).arg, x!) )) {
              contradiction = true; break;
            }
          }
        }
      }
      if (!contradiction) messages.push("No contradiction found inside subproof");
      evidence = { rule: "Indirect Proof", refs, info: frame ? `Assumption @${frame.startLineNo}` : undefined };
    } else if (/^universal\s*intro$/i.test(rule)) {
      const m = normalizeFormula(line.formula).match(/^forall([a-zA-Z])\((.+)\)$/);
      if (!m) messages.push("Universal Intro: conclusion must be forallx(P(x))");
      if (refs.length !== 1) messages.push("Universal Intro needs one reference");
      if (m) {
        const body = m[2];
        const refF = lineByNo.get(String(refs[0]))?.raw.formula;
        if (!isInstanceOf(body, m[1], normalizeFormula(refF))) messages.push("Reference must match body up to alpha-equivalence");
      }
      evidence = { rule: "Universal Intro", refs };
    } else if (/^universal\s*elim$/i.test(rule)) {
      if (refs.length !== 1) messages.push("Universal Elim needs one reference");
      const ref = normalizeFormula(lineByNo.get(String(refs[0]))?.raw.formula);
      const qm = parseQuantified(ref);
      if (!qm || qm.kind !== "forall") messages.push("Reference must be forallx(P(x))");
      else {
        if (!isInstanceOf(qm.body, qm.v, normalizeFormula(line.formula))) messages.push("Conclusion must be instance of body (capture-avoiding)");
      }
      evidence = { rule: "Universal Elim", refs };
    } else if (/^existential\s*intro$/i.test(rule)) {
      // From P(c) infer existsx(P(x)): check body with x replaced by c equals ref
      if (refs.length !== 1) messages.push("Existential Intro needs one reference");
      const concl = normalizeFormula(line.formula);
      const qm = parseQuantified(concl);
      if (!qm || qm.kind !== "exists") messages.push("Conclusion must be existsx(P(x))");
      const ref = normalizeFormula(lineByNo.get(String(refs[0]))?.raw.formula);
      if (qm && !isInstanceOf(qm.body, qm.v, ref)) messages.push("Reference must be instance of body");
      evidence = { rule: "Existential Intro", refs };
    } else if (/^existential\s*elim$/i.test(rule)) {
      // Heuristic structure check; full correctness requires structured subproof representation
      if (refs.length < 2) messages.push("Existential Elim needs exists premise and subproof result");
      const ex = normalizeFormula(lineByNo.get(String(refs[0]))?.raw.formula);
      const q = parseQuantified(ex);
      if (!q || q.kind !== "exists") messages.push("First reference must be existsx(P(x))");
      evidence = { rule: "Existential Elim", refs };
    }

    const ok = messages.length === 0;
    if (ok) {
      known.add(formula);
      if (ast) knownAst.add(ast);
    }
    lineByNo.set(lineNo, { raw: line, ast });
    results.push({ lineNo, ok, messages, evidence });
  }

  return {
    ok: results.every((r) => r.ok) && Boolean(conclusion),
    lines: results,
    subproofs: frames.map(f => ({ depth: f.depth, startLineNo: f.startLineNo, endLineNo: f.endLineNo ?? f.startLineNo, assumptionFormula: f.assumptionFormula }))
  };
}


