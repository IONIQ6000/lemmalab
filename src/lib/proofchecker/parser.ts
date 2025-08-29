import { Ast, makeAnd, makeIff, makeImp, makeNot, makeOr, makeVar } from "./ast";

// Tokenizer for TFL with symbols: !, ~, ¬, ^, &, v, ∨, ->, →, <->, ↔, (, ), identifiers

type TokKind = "lparen" | "rparen" | "not" | "and" | "or" | "imp" | "iff" | "ident" | "eof";
interface Tok { kind: TokKind; text: string }

function normalize(input: string): string {
  return input
    .replace(/\s+/g, "")
    .replace(/¬|~/g, "!")
    .replace(/∧|&/g, "^")
    .replace(/∨/g, "v")
    .replace(/→/g, "->")
    .replace(/↔/g, "<->");
}

function tokenize(input: string): Tok[] {
  const s = normalize(input);
  const toks: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '(') { toks.push({ kind: "lparen", text: c }); i++; continue; }
    if (c === ')') { toks.push({ kind: "rparen", text: c }); i++; continue; }
    if (c === '!') { toks.push({ kind: "not", text: c }); i++; continue; }
    if (c === '^') { toks.push({ kind: "and", text: c }); i++; continue; }
    if (c === 'v') { toks.push({ kind: "or", text: c }); i++; continue; }
    if (s.startsWith("<->", i)) { toks.push({ kind: "iff", text: "<->" }); i += 3; continue; }
    if (s.startsWith("->", i)) { toks.push({ kind: "imp", text: "->" }); i += 2; continue; }
    // identifiers: letters, digits, underscores
    if (/[a-zA-Z]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++;
      toks.push({ kind: "ident", text: s.slice(i, j) });
      i = j; continue;
    }
    // Unknown char: skip to avoid throwing in first pass
    i++;
  }
  toks.push({ kind: "eof", text: "" });
  return toks;
}

export class Parser {
  private toks: Tok[];
  private i: number;
  constructor(input: string) {
    this.toks = tokenize(input);
    this.i = 0;
  }

  private peek(): Tok { return this.toks[this.i]; }
  private eat(kind?: TokKind): Tok {
    const t = this.toks[this.i];
    if (kind && t.kind !== kind) throw new Error(`Expected ${kind} but got ${t.kind}`);
    this.i++;
    return t;
  }

  // Grammar (right-assoc for ->, <->):
  // expr := iff
  // iff  := imp ( '<->' imp )*
  // imp  := or  ( '->'  imp )?
  // or   := and ( 'v' and )*
  // and  := not ( '^' not )*
  // not  := '!' not | atom
  // atom := ident | '(' expr ')'

  parse(): Ast {
    const node = this.parseIff();
    if (this.peek().kind !== "eof") throw new Error("Unexpected tokens at end");
    return node;
  }

  private parseIff(): Ast {
    let left = this.parseImp();
    while (this.peek().kind === "iff") {
      this.eat("iff");
      const right = this.parseImp();
      left = makeIff(left, right);
    }
    return left;
  }

  private parseImp(): Ast {
    const left = this.parseOr();
    if (this.peek().kind === "imp") {
      this.eat("imp");
      const right = this.parseImp();
      return makeImp(left, right);
    }
    return left;
  }

  private parseOr(): Ast {
    let left = this.parseAnd();
    while (this.peek().kind === "or") {
      this.eat("or");
      const right = this.parseAnd();
      left = makeOr(left, right);
    }
    return left;
  }

  private parseAnd(): Ast {
    let left = this.parseNot();
    while (this.peek().kind === "and") {
      this.eat("and");
      const right = this.parseNot();
      left = makeAnd(left, right);
    }
    return left;
  }

  private parseNot(): Ast {
    if (this.peek().kind === "not") {
      this.eat("not");
      return makeNot(this.parseNot());
    }
    return this.parseAtom();
  }

  private parseAtom(): Ast {
    const t = this.peek();
    if (t.kind === "ident") {
      this.eat("ident");
      return makeVar(t.text);
    }
    if (t.kind === "lparen") {
      this.eat("lparen");
      const e = this.parseIff();
      this.eat("rparen");
      return e;
    }
    // Fallback var to avoid hard failures in early integration
    this.eat();
    return makeVar("?");
  }
}


