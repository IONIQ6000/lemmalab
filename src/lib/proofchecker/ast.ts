export type Ast = Var | Not | And | Or | Imp | Iff;

export interface Var {
  kind: "var";
  name: string;
}

export interface Not {
  kind: "not";
  arg: Ast;
}

export interface And {
  kind: "and";
  left: Ast;
  right: Ast;
}

export interface Or {
  kind: "or";
  left: Ast;
  right: Ast;
}

export interface Imp {
  kind: "imp";
  left: Ast;
  right: Ast;
}

export interface Iff {
  kind: "iff";
  left: Ast;
  right: Ast;
}

export function makeVar(name: string): Var {
  return { kind: "var", name };
}

export function makeNot(arg: Ast): Not {
  return { kind: "not", arg };
}

export function makeAnd(left: Ast, right: Ast): And {
  return { kind: "and", left, right };
}

export function makeOr(left: Ast, right: Ast): Or {
  return { kind: "or", left, right };
}

export function makeImp(left: Ast, right: Ast): Imp {
  return { kind: "imp", left, right };
}

export function makeIff(left: Ast, right: Ast): Iff {
  return { kind: "iff", left, right };
}

export function equalsAst(a: Ast, b: Ast): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "var":
      return (b as Var).name === a.name;
    case "not":
      return equalsAst(a.arg, (b as Not).arg);
    case "and":
    case "or":
    case "imp":
    case "iff": {
      const ab = b as And | Or | Imp | Iff;
      return equalsAst(a.left as any, (ab as any).left) && equalsAst((a as any).right, (ab as any).right);
    }
  }
}

// Canonicalization utilities
function keyOf(ast: Ast): string {
  switch (ast.kind) {
    case "var":
      return `v:${ast.name}`;
    case "not":
      return `n:(${keyOf(ast.arg)})`;
    case "and":
      return `a:(${keyOf(ast.left)}),(${keyOf(ast.right)})`;
    case "or":
      return `o:(${keyOf(ast.left)}),(${keyOf(ast.right)})`;
    case "imp":
      return `i:(${keyOf(ast.left)})->(${keyOf(ast.right)})`;
    case "iff":
      return `b:(${keyOf(ast.left)})<->(${keyOf(ast.right)})`;
  }
}

function flatten(ast: Ast, kind: "and" | "or", acc: Ast[]): void {
  if (ast.kind === kind) {
    flatten(ast.left as any, kind, acc);
    flatten((ast as any).right, kind, acc);
  } else {
    acc.push(ast);
  }
}

function buildLeftAssoc(kind: "and" | "or", nodes: Ast[]): Ast {
  if (nodes.length === 0) throw new Error("empty nodes to build");
  if (nodes.length === 1) return nodes[0];
  let cur = nodes[0];
  for (let i = 1; i < nodes.length; i++) {
    cur = kind === "and" ? makeAnd(cur, nodes[i]) : makeOr(cur, nodes[i]);
  }
  return cur;
}

export function canonicalizeAst(ast: Ast): Ast {
  switch (ast.kind) {
    case "var":
      return ast;
    case "not":
      return makeNot(canonicalizeAst(ast.arg));
    case "imp":
      return makeImp(canonicalizeAst(ast.left), canonicalizeAst(ast.right));
    case "iff": {
      const l = canonicalizeAst(ast.left);
      const r = canonicalizeAst(ast.right);
      // Commutative: order sides by key
      const [a, b] = keyOf(l) <= keyOf(r) ? [l, r] : [r, l];
      return makeIff(a, b);
    }
    case "and": {
      const parts: Ast[] = [];
      flatten(ast, "and", parts);
      const canon = parts.map(canonicalizeAst);
      canon.sort((x, y) => (keyOf(x) < keyOf(y) ? -1 : keyOf(x) > keyOf(y) ? 1 : 0));
      return buildLeftAssoc("and", canon);
    }
    case "or": {
      const parts: Ast[] = [];
      flatten(ast, "or", parts);
      const canon = parts.map(canonicalizeAst);
      canon.sort((x, y) => (keyOf(x) < keyOf(y) ? -1 : keyOf(x) > keyOf(y) ? 1 : 0));
      return buildLeftAssoc("or", canon);
    }
  }
}

export function equalsCanonical(a: Ast | undefined, b: Ast | undefined): boolean {
  if (!a || !b) return false;
  const ca = canonicalizeAst(a);
  const cb = canonicalizeAst(b);
  return equalsAst(ca, cb);
}


