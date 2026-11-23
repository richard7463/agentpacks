/* ── core/synth.ts ───────────────────────────────────────────────────────────
   Any small function → a NAND-only netlist in TapeOut's numbering.

   A rule is first turned into a plain function of its input bits (core/spec.ts).
   This file turns such a function into gates: it takes the full truth table,
   splits it one input at a time (Shannon expansion, like a decision diagram),
   shares every identical sub-table, and builds each split as a multiplexer
   out of NAND gates. A few input orders are tried and the cheapest circuit by
   TapeOut's own ranking cost (gates × depth³) is kept.

   Because the result comes from the full truth table, `verifyNetlist` can then
   check it against the same function on every possible input. Nothing here is
   trusted without that check.
   --------------------------------------------------------------------------- */
import { evalWord, type Netlist } from "./netlist.js";

const C0 = 0, C1 = 1;

class Builder {
  gates: [number, number][] = [];
  private cache = new Map<string, number>();
  private inv = new Map<number, number>();
  constructor(readonly nIn: number) {}
  get base() { return 2 + this.nIn; }
  input(i: number) { return 2 + i; }
  nand(a: number, b: number): number {
    if (a > b) [a, b] = [b, a];
    if (a === C0) return C1;
    if (a === C1) return this.not(b);
    if (this.inv.get(a) === b) return C1;
    const key = a + "," + b;
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit;
    const s = this.base + this.gates.length;
    this.gates.push([a, b]);
    this.cache.set(key, s);
    if (a === b) { this.inv.set(a, s); this.inv.set(s, a); }
    return s;
  }
  not(a: number): number {
    if (a === C0) return C1;
    if (a === C1) return C0;
    const k = this.inv.get(a);
    if (k !== undefined) return k;
    return this.nand(a, a);
  }
  and(a: number, b: number): number {
    if (a === C0 || b === C0) return C0;
    if (a === C1) return b;
    if (b === C1) return a;
    if (a === b) return a;
    return this.not(this.nand(a, b));
  }
  or(a: number, b: number): number {
    if (a === C1 || b === C1) return C1;
    if (a === C0) return b;
    if (b === C0) return a;
    if (a === b) return a;
    return this.nand(this.not(a), this.not(b));
  }
  /** s ? hi : lo */
  mux(s: number, hi: number, lo: number): number {
    if (hi === lo) return hi;
    if (hi === C1 && lo === C0) return s;
    if (hi === C0 && lo === C1) return this.not(s);
    if (lo === C0) return this.and(s, hi);
    if (hi === C0) return this.and(this.not(s), lo);
    if (lo === C1) return this.or(this.not(s), hi);
    if (hi === C1) return this.or(s, lo);
    return this.nand(this.nand(s, hi), this.nand(this.not(s), lo));
  }
}

/** Truth table of one output bit, indexed by input word. */
function tableOf(nIn: number, f: (w: number) => number, bit: number): Uint8Array {
  const t = new Uint8Array(1 << nIn);
  for (let w = 0; w < t.length; w++) t[w] = (f(w) >> bit) & 1;
  return t;
}

export function build(nIn: number, nOut: number, f: (w: number) => number, order: number[], version: string): Netlist {
  const B = new Builder(nIn);
  const memo = new Map<string, number>();
  // order[0] is split first. Re-index each table so the first-split variable is the top bit.
  const perm = (w: number) => { let p = 0; for (let j = 0; j < nIn; j++) if ((w >> order[j]) & 1) p |= 1 << (nIn - 1 - j); return p; };
  const node = (t: Uint8Array, level: number): number => {
    let ones = 0;
    for (let i = 0; i < t.length; i++) ones += t[i];
    if (ones === 0) return C0;
    if (ones === t.length) return C1;
    const key = level + ":" + t.join("");
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    const half = t.length >> 1;
    const lo = node(t.subarray(0, half), level + 1);
    const hi = node(t.subarray(half), level + 1);
    const s = B.mux(B.input(order[level]), hi, lo);
    memo.set(key, s);
    return s;
  };
  const outs: number[] = [];
  for (let k = 0; k < nOut; k++) {
    const t = tableOf(nIn, f, k);
    const p = new Uint8Array(t.length);
    for (let w = 0; w < t.length; w++) p[perm(w)] = t[w];
    outs.push(node(p, 0));
  }
  return finish(B.gates, outs, nIn, nOut, version);
}

/** Outputs must be the last nOut gates; drop dead gates and renumber. */
function finish(gates: [number, number][], bits: number[], nIn: number, nOut: number, version: string): Netlist {
  const base = 2 + nIn;
  const all = gates.slice();
  const finals: [number, number][] = [];
  const used = new Set<number>();
  for (const s of bits) {
    if (s >= base && !used.has(s)) { finals.push(all[s - base]); used.add(s); }
    else { all.push([s, s]); const ns = base + all.length - 1; finals.push([ns, ns]); }
  }
  const live = new Uint8Array(all.length);
  const stack: number[] = [];
  for (const [a, b] of finals) stack.push(a, b);
  while (stack.length) {
    const s = stack.pop()!;
    if (s < base) continue;
    const i = s - base;
    if (live[i]) continue;
    live[i] = 1;
    stack.push(all[i][0], all[i][1]);
  }
  const remap = new Map<number, number>();
  for (let s = 0; s < base; s++) remap.set(s, s);
  const out: [number, number][] = [];
  for (let i = 0; i < all.length; i++) {
    if (!live[i]) continue;
    remap.set(base + i, base + out.length);
    out.push([remap.get(all[i][0])!, remap.get(all[i][1])!]);
  }
  for (const [a, b] of finals) out.push([remap.get(a)!, remap.get(b)!]);
  return { version, nIn, nOut, gates: out };
}

export function netDepth(n: Netlist): number {
  const base = 2 + n.nIn;
  const d = new Array<number>(base + n.gates.length).fill(0);
  let max = 0;
  n.gates.forEach(([a, b], i) => { d[base + i] = 1 + Math.max(d[a], d[b]); max = Math.max(max, d[base + i]); });
  return max;
}

/** TapeOut's ranking cost: gates × depth³ (no latches here). */
export const cost = (n: Netlist) => n.gates.length * netDepth(n) ** 3;

/**
 * Synthesize f (nIn bits in, nOut bits out) into NAND gates. Tries the natural
 * input order, its reverse, and the given extra orders; keeps the cheapest.
 */
export function synthesize(nIn: number, nOut: number, f: (w: number) => number, version: string, orders: number[][] = []): Netlist {
  const nat = Array.from({ length: nIn }, (_, i) => nIn - 1 - i);
  const tries = [nat, nat.slice().reverse(), ...orders].map((o) => build(nIn, nOut, f, o, version));
  return tries.reduce((best, n) => (cost(n) < cost(best) || (cost(n) === cost(best) && n.gates.length < best.gates.length) ? n : best));
}

/** Words on which the netlist disagrees with f. Empty means proven on every input. */
export function verifyNetlist(n: Netlist, f: (w: number) => number): number[] {
  const bad: number[] = [];
  const mask = (1 << n.nOut) - 1;
  for (let w = 0; w < 1 << n.nIn; w++) if (evalWord(n, w) !== (f(w) & mask)) bad.push(w);
  return bad;
}
