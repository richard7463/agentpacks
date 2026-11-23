/* ── core/expr.ts ────────────────────────────────────────────────────────────
   A tiny, safe formula language for rules, e.g.

       holds_nft && (followed || retweeted) && wallet_age >= 2
       amount <= daily_left ? 1 : 0
       min(a + b, 15)

   Integers only. Comparisons and logic give 1 or 0. Nothing is ever passed to
   JavaScript's eval: formulas are parsed here into a tree and walked.

   Operators, loosest first:
     ?:   ||   &&   |   ^   &   == !=   < <= > >=   << >>   + -   * / %   ! ~ - (unary)
   Functions: min(a,b,…) max(a,b,…) abs(a) count(a,b,…) (how many are non-zero)
   Literals: 12, 0x0f, 0b101, true, false. Division or modulo by zero gives 0.
   --------------------------------------------------------------------------- */

export type Expr =
  | { k: "num"; v: number }
  | { k: "var"; name: string }
  | { k: "un"; op: string; a: Expr }
  | { k: "bin"; op: string; a: Expr; b: Expr }
  | { k: "if"; c: Expr; a: Expr; b: Expr }
  | { k: "call"; fn: string; args: Expr[] };

const FUNCS = new Set(["min", "max", "abs", "count"]);
const BIN: [string[], number][] = [
  [["||"], 1], [["&&"], 2], [["|"], 3], [["^"], 4], [["&"], 5],
  [["==", "!="], 6], [["<", "<=", ">", ">="], 7], [["<<", ">>"], 8], [["+", "-"], 9], [["*", "/", "%"], 10]
];
const PREC = new Map<string, number>();
for (const [ops, p] of BIN) for (const o of ops) PREC.set(o, p);

const PUNCT = ["<<", ">>", "<=", ">=", "==", "!=", "&&", "||", "+", "-", "*", "/", "%", "<", ">", "&", "|", "^", "!", "~", "?", ":", "(", ")", ","];

interface Tok { t: "num" | "id" | "op"; v: string; at: number }

export class ExprError extends Error {
  constructor(msg: string, readonly at: number) { super(msg); }
}

function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    const num = /^(0x[0-9a-fA-F]+|0b[01]+|\d+)/.exec(src.slice(i));
    if (num) { out.push({ t: "num", v: num[0], at: i }); i += num[0].length; continue; }
    const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
    if (id) { out.push({ t: "id", v: id[0], at: i }); i += id[0].length; continue; }
    const p = PUNCT.find((q) => src.startsWith(q, i));
    if (p) { out.push({ t: "op", v: p, at: i }); i += p.length; continue; }
    throw new ExprError(`unexpected character "${c}"`, i);
  }
  return out;
}

export function parseExpr(src: string): Expr {
  if (src.length > 2000) throw new ExprError("formula is too long (2,000 characters at most)", 0);
  const toks = lex(src);
  let p = 0;
  const peek = () => toks[p];
  const at = () => (toks[p] ? toks[p].at : src.length);
  const take = (v?: string) => {
    const t = toks[p];
    if (!t || (v !== undefined && t.v !== v)) throw new ExprError(v ? `expected "${v}"` : "formula ends too early", at());
    p++;
    return t;
  };
  let depth = 0;
  const ternary = (): Expr => {
    if (++depth > 200) throw new ExprError("formula is nested too deeply", at());
    const c = binary(1);
    let r = c;
    if (peek()?.v === "?") { take("?"); const a = ternary(); take(":"); const b = ternary(); r = { k: "if", c, a, b }; }
    depth--;
    return r;
  };
  const binary = (min: number): Expr => {
    let left = unary();
    for (;;) {
      const t = peek();
      const prec = t && t.t === "op" ? PREC.get(t.v) : undefined;
      if (prec === undefined || prec < min) return left;
      p++;
      const right = binary(prec + 1);
      left = { k: "bin", op: t!.v, a: left, b: right };
    }
  };
  const unary = (): Expr => {
    const t = peek();
    if (t && t.t === "op" && (t.v === "!" || t.v === "~" || t.v === "-")) { p++; return { k: "un", op: t.v, a: unary() }; }
    return atom();
  };
  const atom = (): Expr => {
    const t = take();
    if (t.t === "num") {
      const v = t.v.startsWith("0b") ? parseInt(t.v.slice(2), 2) : Number(t.v);
      if (!Number.isSafeInteger(v)) throw new ExprError("number too large", t.at);
      return { k: "num", v };
    }
    if (t.t === "id") {
      if (t.v === "true") return { k: "num", v: 1 };
      if (t.v === "false") return { k: "num", v: 0 };
      if (peek()?.v === "(") {
        if (!FUNCS.has(t.v)) throw new ExprError(`unknown function "${t.v}" (use min, max, abs or count)`, t.at);
        take("(");
        const args: Expr[] = [];
        if (peek()?.v !== ")") { args.push(ternary()); while (peek()?.v === ",") { take(","); args.push(ternary()); } }
        take(")");
        if (args.length === 0 || (t.v === "abs" && args.length !== 1)) throw new ExprError(`wrong number of arguments for ${t.v}`, t.at);
        return { k: "call", fn: t.v, args };
      }
      return { k: "var", name: t.v };
    }
    if (t.v === "(") { const e = ternary(); take(")"); return e; }
    throw new ExprError(`unexpected "${t.v}"`, t.at);
  };
  const e = ternary();
  if (p < toks.length) throw new ExprError(`unexpected "${toks[p].v}"`, toks[p].at);
  return e;
}

export function varsOf(e: Expr, out = new Set<string>()): Set<string> {
  switch (e.k) {
    case "var": out.add(e.name); break;
    case "un": varsOf(e.a, out); break;
    case "bin": varsOf(e.a, out); varsOf(e.b, out); break;
    case "if": varsOf(e.c, out); varsOf(e.a, out); varsOf(e.b, out); break;
    case "call": e.args.forEach((a) => varsOf(a, out)); break;
  }
  return out;
}

const b = (x: boolean) => (x ? 1 : 0);

export function evalExpr(e: Expr, env: Record<string, number>): number {
  switch (e.k) {
    case "num": return e.v;
    case "var": {
      const v = env[e.name];
      if (v === undefined) throw new Error(`unknown name "${e.name}"`);
      return v;
    }
    case "un": {
      const a = evalExpr(e.a, env);
      return e.op === "!" ? b(a === 0) : e.op === "~" ? ~a : -a;
    }
    case "if": return evalExpr(e.c, env) !== 0 ? evalExpr(e.a, env) : evalExpr(e.b, env);
    case "call": {
      const xs = e.args.map((a) => evalExpr(a, env));
      if (e.fn === "min") return Math.min(...xs);
      if (e.fn === "max") return Math.max(...xs);
      if (e.fn === "abs") return Math.abs(xs[0]);
      return xs.filter((x) => x !== 0).length;
    }
    case "bin": {
      if (e.op === "&&") return b(evalExpr(e.a, env) !== 0 && evalExpr(e.b, env) !== 0);
      if (e.op === "||") return b(evalExpr(e.a, env) !== 0 || evalExpr(e.b, env) !== 0);
      const x = evalExpr(e.a, env), y = evalExpr(e.b, env);
      switch (e.op) {
        case "|": return x | y; case "^": return x ^ y; case "&": return x & y;
        case "==": return b(x === y); case "!=": return b(x !== y);
        case "<": return b(x < y); case "<=": return b(x <= y); case ">": return b(x > y); case ">=": return b(x >= y);
        case "<<": return y >= 31 || y < 0 ? 0 : x << y;
        case ">>": return y >= 31 || y < 0 ? (x < 0 ? -1 : 0) : x >> y;
        case "+": return x + y; case "-": return x - y; case "*": return x * y;
        case "/": return y === 0 ? 0 : Math.trunc(x / y);
        case "%": return y === 0 ? 0 : x % y;
      }
    }
  }
  throw new Error("bad formula");
}
