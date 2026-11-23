/* ── core/forge.ts ───────────────────────────────────────────────────────────
   The three things TapeForge does, as plain functions:

     forge(spec)            rule → NAND circuit, checked on every possible input
     checkAgainst(n, spec)  does this circuit do what this rule says? lists every case where it doesn't
     explain(n, layout?)    any circuit → a readable rule list (and a spec that rebuilds it)

   Everything is exhaustive: with at most 16 input bits there are at most
   65,536 cases, and every one of them is run.
   --------------------------------------------------------------------------- */
import { evalWord, checkNetlist, type Netlist } from "./netlist.js";
import { build, verifyNetlist, netDepth, cost } from "./synth.js";
import { netlistBytes } from "./tapeout.js";
import { compileSpec, unpack, totalBits, type Field, type Spec, type Cond, type Rule } from "./spec.js";

export interface Stats { gates: number; depth: number; cost: number; bytes: number; inputs: number; outputs: number; cases: number }

export const statsOf = (n: Netlist): Stats => ({
  gates: n.gates.length, depth: netDepth(n), cost: cost(n), bytes: n.gates.length * 7,
  inputs: n.nIn, outputs: n.nOut, cases: 2 ** n.nIn
});

export interface Forged {
  spec: Spec;
  netlist: Netlist;
  stats: Stats;
  bytes: `0x${string}`;
  /** Always true when forge returns: a mismatch throws instead. */
  checked: true;
  warnings: string[];
}

export type Goal = "gates" | "rank";

/**
 * Rule → circuit. Tries many input orders and keeps the best by the goal:
 * "gates" (fewest gates: each gate burns one NAND when taped out) or "rank"
 * (TapeOut's ranking cost, gates × depth³). The result is proven on every input.
 * The same rule always gives the same bytes: the orders tried are fixed.
 */
export function forge(rawSpec: unknown, goal: Goal = "gates"): Forged {
  const c = compileSpec(rawSpec);
  const f = (w: number) => c.table[w];
  const nIn = c.nIn;
  const groups: number[][] = [];
  let off = 0;
  for (const fl of c.spec.inputs) { groups.push(Array.from({ length: fl.bits }, (_, b) => off + fl.bits - 1 - b)); off += fl.bits; }
  const orders: number[][] = [
    Array.from({ length: nIn }, (_, i) => nIn - 1 - i),
    Array.from({ length: nIn }, (_, i) => i),
    groups.flat(),
    groups.slice().reverse().flat(),
    interleave(groups, false),
    interleave(groups, true),
    interleave(groups.slice().reverse(), false)
  ];
  if (nIn <= 14) orders.push(Array.from({ length: nIn }, (_, i) => i).sort((a, b) => influence(c.table, nIn, b) - influence(c.table, nIn, a)));
  const extra = nIn <= 8 ? 60 : nIn <= 11 ? 24 : nIn <= 13 ? 6 : 0;
  let seed = 0x9e3779b9;
  const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let k = 0; k < extra; k++) {
    // Shuffle whole fields, keep each field's bits together (high bit first); every other one also shuffles within.
    const g = groups.map((x) => x.slice());
    for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [g[i], g[j]] = [g[j], g[i]]; }
    let o = k % 3 === 2 ? interleave(g, rnd() < 0.5) : g.flat();
    if (k % 2) { o = o.slice(); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } }
    orders.push(o);
  }
  const score = (n: Netlist) => (goal === "gates" ? n.gates.length * 1e6 + netDepth(n) : cost(n) * 1e3 + n.gates.length);
  let best: Netlist | null = null;
  for (const o of dedupe(orders, nIn)) {
    const n = build(nIn, c.nOut, f, o, c.spec.name);
    if (!best || score(n) < score(best)) best = n;
  }
  const netlist = best!;
  checkNetlist(netlist);
  const bad = verifyNetlist(netlist, f);
  if (bad.length) throw new Error(`internal error: the circuit disagrees with the rule on ${bad.length} cases; nothing was produced`);
  return { spec: c.spec, netlist, stats: statsOf(netlist), bytes: netlistBytes(netlist), checked: true, warnings: c.warnings };
}

/** Take the top bit of each field in turn, then the next bit of each: good for sums and comparisons. */
function interleave(groups: number[][], lowFirst: boolean): number[] {
  const gs = groups.map((g) => (lowFirst ? g.slice().reverse() : g.slice()));
  const out: number[] = [];
  const longest = Math.max(...gs.map((g) => g.length));
  for (let i = 0; i < longest; i++) {
    for (const g of gs) {
      const idx = lowFirst ? i : i - (longest - g.length);
      if (idx >= 0 && idx < g.length) out.push(g[idx]);
    }
  }
  return out;
}

/** How many input words change their output when this pin flips. */
function influence(t: Uint32Array, nIn: number, pin: number): number {
  let n = 0;
  for (let w = 0; w < 2 ** nIn; w++) if (!((w >> pin) & 1) && t[w] !== t[w | (1 << pin)]) n++;
  return n;
}

function dedupe(orders: number[][], nIn: number): number[][] {
  const seen = new Set<string>();
  return orders.filter((o) => o.length === nIn && !seen.has(o.join()) && !!seen.add(o.join()));
}

/** Every output word of a circuit, in input order. */
export function tableOf(n: Netlist): Uint32Array {
  if (n.nIn > 20) throw new Error("too many inputs to run every case here (20 at most)");
  const t = new Uint32Array(2 ** n.nIn);
  for (let w = 0; w < t.length; w++) t[w] = evalWord(n, w) >>> 0;
  return t;
}

export interface Mismatch { case: Record<string, number>; rule: Record<string, number>; circuit: Record<string, number> }
export interface CheckResult { ok: boolean; cases: number; wrong: number; examples: Mismatch[] }

/** Does this circuit do exactly what this rule says, on every input? */
export function checkAgainst(n: Netlist, rawSpec: unknown): CheckResult {
  const c = compileSpec(rawSpec);
  if (c.nIn !== n.nIn || c.nOut !== n.nOut) throw new Error(`the rule has ${c.nIn} input and ${c.nOut} output bits but the circuit has ${n.nIn} and ${n.nOut}`);
  const t = tableOf(n);
  const examples: Mismatch[] = [];
  let wrong = 0;
  for (let w = 0; w < t.length; w++) {
    if (t[w] === c.table[w]) continue;
    wrong++;
    if (examples.length < 20) examples.push({ case: unpack(c.spec.inputs, w), rule: unpack(c.spec.outputs, c.table[w]), circuit: unpack(c.spec.outputs, t[w]) });
  }
  return { ok: wrong === 0, cases: t.length, wrong, examples };
}

export interface Explained {
  stats: Stats;
  inputs: Field[];
  outputs: Field[];
  /** Input fields that never change any output: a circuit that ignores something it claims to check. */
  unusedInputs: string[];
  /** Output fields that are the same for every input. */
  constantOutputs: { name: string; value: number }[];
  /** How often each distinct answer comes up. */
  answers: { values: Record<string, number>; count: number }[];
  /** A rule list (disjoint rules + otherwise) that rebuilds exactly this circuit, or null if it would need more than the rule limit. */
  spec: Spec | null;
  ruleCount: number;
}

export function defaultLayout(nIn: number, nOut: number): { inputs: Field[]; outputs: Field[] } {
  return {
    inputs: Array.from({ length: nIn }, (_, i) => ({ name: `in${i}`, bits: 1 })),
    outputs: Array.from({ length: nOut }, (_, i) => ({ name: `out${i}`, bits: 1 }))
  };
}

/** Any circuit → what it actually does. `layout` names the pins; without it each pin is its own 1-bit field. */
export function explain(n: Netlist, layout?: { inputs: Field[]; outputs: Field[] }, maxRules = 128): Explained {
  checkNetlist(n);
  const L = layout ?? defaultLayout(n.nIn, n.nOut);
  if (totalBits(L.inputs) !== n.nIn || totalBits(L.outputs) !== n.nOut) throw new Error(`the names cover ${totalBits(L.inputs)} input and ${totalBits(L.outputs)} output bits, but the circuit has ${n.nIn} and ${n.nOut}`);
  if (n.nIn > 16) throw new Error("explaining needs 16 input bits or fewer");
  const t = tableOf(n);
  const N = t.length;

  const fieldMask = (fs: Field[]) => { let s = 0; return fs.map((f) => { const m = ((2 ** f.bits - 1) << s) >>> 0; s += f.bits; return { f, m, s: s - f.bits }; }); };
  const inF = fieldMask(L.inputs), outF = fieldMask(L.outputs);

  const unusedInputs = inF.filter(({ m }) => {
    for (let w = 0; w < N; w++) {
      if (w & m) continue;
      for (let v = m; v; v = (v - 1) & m) if (t[w] !== t[w | v]) return false;
    }
    return true;
  }).map(({ f }) => f.name);

  const constantOutputs = outF.flatMap(({ f, m, s }) => {
    const v0 = (t[0] & m) >>> s;
    for (let w = 1; w < N; w++) if (((t[w] & m) >>> s) !== v0) return [];
    return [{ name: f.name, value: v0 }];
  });

  const counts = new Map<number, number>();
  for (let w = 0; w < N; w++) counts.set(t[w], (counts.get(t[w]) ?? 0) + 1);
  const byFreq = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const answers = byFreq.map(([v, count]) => ({ values: unpack(L.outputs, v), count }));

  // Cover each non-default answer with cubes that contain only that answer, then write each cube as conditions per field.
  const dflt = byFreq[0][0];
  const covered = new Uint8Array(N);
  const rules: Rule[] = [];
  let tooMany = false;
  for (const [v] of byFreq.slice(1)) {
    for (let w = 0; w < N && !tooMany; w++) {
      if (t[w] !== v || covered[w]) continue;
      let free = 0;
      for (let pin = n.nIn - 1; pin >= 0; pin--) {
        const bit = 1 << pin;
        const trial = free | bit;
        if (cubeAll(t, w & ~trial, trial, v)) free = trial;
      }
      const base = w & ~free;
      forEachInCube(base, free, (x) => { covered[x] = 1; });
      if (rules.length >= maxRules) { tooMany = true; break; }
      rules.push(cubeToRule(base, free, inF, L.outputs, v, dflt));
    }
  }
  const spec: Spec | null = tooMany ? null : {
    name: n.version || "circuit",
    inputs: L.inputs,
    outputs: L.outputs,
    rules,
    otherwise: unpack(L.outputs, dflt)
  };
  return { stats: statsOf(n), inputs: L.inputs, outputs: L.outputs, unusedInputs, constantOutputs, answers, spec, ruleCount: tooMany ? -1 : rules.length };
}

function forEachInCube(base: number, free: number, fn: (w: number) => void) {
  for (let sub = free; ; sub = (sub - 1) & free) { fn(base | sub); if (sub === 0) break; }
}

function cubeAll(t: Uint32Array, base: number, free: number, v: number): boolean {
  for (let sub = free; ; sub = (sub - 1) & free) { if (t[base | sub] !== v) return false; if (sub === 0) return true; }
}

function cubeToRule(base: number, free: number, inF: { f: Field; m: number; s: number }[], outs: Field[], v: number, dflt: number): Rule {
  const when: Record<string, Cond> = {};
  for (const { f, m, s } of inF) {
    if ((free & m) === m) continue; // field unconstrained
    const fixedMask = (~free & m) >>> s, fixedVal = (base & m) >>> s;
    const vals: number[] = [];
    for (let x = 0; x < 2 ** f.bits; x++) if ((x & fixedMask) === fixedVal) vals.push(x);
    when[f.name] = vals.length === 1 ? vals[0] : vals[vals.length - 1] - vals[0] === vals.length - 1 ? [vals[0], vals[vals.length - 1]] : { oneOf: vals };
  }
  const now = unpack(outs, v), was = unpack(outs, dflt);
  const then: Record<string, number> = {};
  for (const o of outs) if (now[o.name] !== was[o.name]) then[o.name] = now[o.name];
  return { when, then };
}

/** One row of a rule's table: inputs, and what the rule answers. */
export function sampleRows(spec: Spec, max = 64): { inputs: Record<string, number>; outputs: Record<string, number> }[] {
  const c = compileSpec(spec);
  const rows = [];
  const step = Math.max(1, Math.floor(c.table.length / max));
  for (let w = 0; w < c.table.length && rows.length < max; w += step) rows.push({ inputs: unpack(spec.inputs, w), outputs: unpack(spec.outputs, c.table[w]) });
  return rows;
}
