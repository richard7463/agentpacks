/* ── core/spec.ts ────────────────────────────────────────────────────────────
   A rule, written down so a person or an AI can read it and a machine can turn
   it into a circuit. Example:

     {
       "name": "Airdrop check",
       "inputs":  [{ "name": "holds_nft", "bits": 1 }, { "name": "followed", "bits": 1 },
                   { "name": "wallet_age", "bits": 2, "about": "0 new … 3 over a year" }],
       "outputs": [{ "name": "eligible", "bits": 1 }],
       "rules": [{ "if": "holds_nft && followed && wallet_age >= 1", "then": { "eligible": 1 } }],
       "otherwise": { "eligible": 0 }
     }

   Inputs and outputs are small unsigned numbers of a few bits each. An output
   comes either from a formula (core/expr.ts) or from the rule list: rules are
   tried top to bottom and the first one that matches sets the outputs it
   names; anything it doesn't name, and every output when nothing matches,
   takes the "otherwise" value (0 if not given).

   A rule matches when all of its conditions hold. "when" checks each named
   input against a value, a range [lo, hi] or { "oneOf": [...] }; "if" is a
   formula. A rule may have both.

   Packing, the same as TapeOut's pins: the first input's lowest bit is input
   pin 0, then its next bit, then the next input; outputs likewise.
   --------------------------------------------------------------------------- */
import { evalExpr, parseExpr, varsOf, ExprError, type Expr } from "./expr.js";

export interface Field { name: string; bits: number; about?: string }
export type Cond = number | boolean | [number, number] | { oneOf: number[] };
export interface Rule { when?: Record<string, Cond>; if?: string; then: Record<string, number | boolean>; note?: string }
export interface Spec {
  name: string;
  about?: string;
  inputs: Field[];
  outputs: Field[];
  rules?: Rule[];
  otherwise?: Record<string, number | boolean>;
  formulas?: Record<string, string>;
}

export const LIMITS = { inputBits: 16, outputBits: 16, fieldBits: 16, rules: 128 } as const;
const NAME = /^[A-Za-z_][A-Za-z0-9_]{0,31}$/;
const RESERVED = new Set(["true", "false", "min", "max", "abs", "count"]);

export class SpecError extends Error {
  constructor(readonly problems: string[]) { super(problems.join("\n")); }
}

export interface Compiled {
  spec: Spec;
  nIn: number;
  nOut: number;
  /** out[word] = output word, for every input word. */
  table: Uint32Array;
  /** Formula results that didn't fit their output and were cut to the low bits. */
  warnings: string[];
}

const num = (v: number | boolean) => (typeof v === "boolean" ? (v ? 1 : 0) : v);
export const totalBits = (fs: Field[]) => fs.reduce((s, f) => s + f.bits, 0);

/** Split an input word into named field values. */
export function unpack(fields: Field[], word: number): Record<string, number> {
  const env: Record<string, number> = {};
  let shift = 0;
  for (const f of fields) { env[f.name] = (word >>> shift) & ((1 << f.bits) - 1); shift += f.bits; }
  return env;
}

export function pack(fields: Field[], values: Record<string, number>): number {
  let w = 0, shift = 0;
  for (const f of fields) { w |= ((values[f.name] ?? 0) & ((1 << f.bits) - 1)) << shift; shift += f.bits; }
  return w >>> 0;
}

function condHolds(c: Cond, v: number): boolean {
  if (typeof c === "number" || typeof c === "boolean") return v === num(c);
  if (Array.isArray(c)) return v >= c[0] && v <= c[1];
  return c.oneOf.includes(v);
}

/** Check a spec and prepare it. Throws SpecError listing every problem found. */
export function compileSpec(raw: unknown): Compiled {
  const P: string[] = [];
  const s = raw as Spec;
  if (!s || typeof s !== "object") throw new SpecError(["the rule must be a JSON object"]);
  if (typeof s.name !== "string" || !s.name.trim()) P.push('give the rule a "name"');
  const fieldsOk = (fs: unknown, kind: string, maxBits: number) => {
    if (!Array.isArray(fs) || fs.length === 0) { P.push(`"${kind}" must be a non-empty list`); return false; }
    for (const f of fs as Field[]) {
      if (!f || typeof f.name !== "string" || !NAME.test(f.name) || RESERVED.has(f.name)) P.push(`${kind}: "${f?.name}" is not a usable name (letters, digits and _, starting with a letter)`);
      if (!Number.isInteger(f?.bits) || f.bits < 1 || f.bits > LIMITS.fieldBits) P.push(`${kind}: "${f?.name}" needs "bits" between 1 and ${LIMITS.fieldBits}`);
    }
    const tb = totalBits(fs as Field[]);
    if (tb > maxBits) P.push(`${kind} use ${tb} bits in total; the limit is ${maxBits} (every extra bit doubles the cases to check)`);
    return true;
  };
  const okIn = fieldsOk(s.inputs, "inputs", LIMITS.inputBits);
  const okOut = fieldsOk(s.outputs, "outputs", LIMITS.outputBits);
  if (!okIn || !okOut || P.length) throw new SpecError(P);

  const names = [...s.inputs, ...s.outputs].map((f) => f.name);
  const dup = names.filter((n, i) => names.indexOf(n) !== i);
  if (dup.length) P.push(`names must be unique: ${[...new Set(dup)].join(", ")}`);
  const inBits = new Map(s.inputs.map((f) => [f.name, f.bits]));
  const outBits = new Map(s.outputs.map((f) => [f.name, f.bits]));
  const fits = (v: unknown, bits: number) => (typeof v === "boolean") || (Number.isInteger(v) && (v as number) >= 0 && (v as number) < 2 ** bits);

  const parse = (src: unknown, where: string): Expr | null => {
    if (typeof src !== "string") { P.push(`${where}: a formula must be text`); return null; }
    try {
      const e = parseExpr(src);
      for (const v of varsOf(e)) if (!inBits.has(v)) P.push(`${where}: "${v}" is not one of the inputs`);
      return e;
    } catch (err) {
      P.push(`${where}: ${(err as Error).message}${err instanceof ExprError ? ` (at character ${err.at + 1})` : ""}`);
      return null;
    }
  };

  const formulas = new Map<string, Expr>();
  for (const [out, src] of Object.entries(s.formulas ?? {})) {
    if (!outBits.has(out)) { P.push(`formulas: "${out}" is not one of the outputs`); continue; }
    const e = parse(src, `formula for ${out}`);
    if (e) formulas.set(out, e);
  }

  const rules = s.rules ?? [];
  if (!Array.isArray(rules)) P.push('"rules" must be a list');
  if (rules.length > LIMITS.rules) P.push(`at most ${LIMITS.rules} rules`);
  const ruleIf: (Expr | null)[] = [];
  rules.forEach((r, i) => {
    const where = `rule ${i + 1}`;
    if (!r || typeof r !== "object" || !r.then || typeof r.then !== "object") { P.push(`${where}: needs "then"`); ruleIf.push(null); return; }
    for (const [k, c] of Object.entries(r.when ?? {})) {
      const bits = inBits.get(k);
      if (bits === undefined) { P.push(`${where}: "${k}" is not one of the inputs`); continue; }
      const vals = typeof c === "number" || typeof c === "boolean" ? [c] : Array.isArray(c) ? c : c && Array.isArray((c as { oneOf: number[] }).oneOf) ? (c as { oneOf: number[] }).oneOf : null;
      if (!vals || (Array.isArray(c) && c.length !== 2)) P.push(`${where}: condition on "${k}" must be a value, [low, high] or { "oneOf": [...] }`);
      else for (const v of vals) if (!fits(v, bits)) P.push(`${where}: ${k} is ${bits} bit${bits > 1 ? "s" : ""} (0–${2 ** bits - 1}), so ${v} can't happen`);
    }
    ruleIf.push(r.if !== undefined ? parse(r.if, where) : null);
    for (const [k, v] of Object.entries(r.then)) {
      const bits = outBits.get(k);
      if (bits === undefined) P.push(`${where}: "${k}" is not one of the outputs`);
      else if (formulas.has(k)) P.push(`${where}: "${k}" already comes from a formula`);
      else if (!fits(v, bits)) P.push(`${where}: ${k} is ${bits} bit${bits > 1 ? "s" : ""}, so it can't be ${v}`);
    }
  });
  for (const [k, v] of Object.entries(s.otherwise ?? {})) {
    const bits = outBits.get(k);
    if (bits === undefined) P.push(`otherwise: "${k}" is not one of the outputs`);
    else if (!fits(v, bits)) P.push(`otherwise: ${k} can't be ${v}`);
  }
  if (P.length) throw new SpecError(P);

  const nIn = totalBits(s.inputs), nOut = totalBits(s.outputs);
  const table = new Uint32Array(2 ** nIn);
  const over = new Map<string, number>();
  for (let w = 0; w < table.length; w++) {
    const env = unpack(s.inputs, w);
    const out: Record<string, number> = {};
    for (const f of s.outputs) out[f.name] = num(s.otherwise?.[f.name] ?? 0);
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      let hit = true;
      for (const [k, c] of Object.entries(r.when ?? {})) if (!condHolds(c, env[k])) { hit = false; break; }
      if (hit && ruleIf[i] && evalExpr(ruleIf[i]!, env) === 0) hit = false;
      if (hit) { for (const [k, v] of Object.entries(r.then)) out[k] = num(v); break; }
    }
    for (const [k, e] of formulas) {
      const v = evalExpr(e, env), bits = outBits.get(k)!;
      if (v < 0 || v >= 2 ** bits) over.set(k, (over.get(k) ?? 0) + 1);
      out[k] = v & (2 ** bits - 1);
    }
    table[w] = pack(s.outputs, out);
  }
  const warnings = [...over].map(([k, n]) => `formula for ${k} went outside 0–${2 ** outBits.get(k)! - 1} on ${n} of ${table.length} cases; only its low bits are kept there`);
  return { spec: s, nIn, nOut, table, warnings };
}
