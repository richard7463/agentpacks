// forge-src/netlist.ts
function checkNetlist(n) {
  const base = 2 + n.nIn;
  n.gates.forEach(([a, b2], i) => {
    const self = base + i;
    if (!(a >= 0 && a < self && b2 >= 0 && b2 < self)) throw new Error(`gate ${i}: future signal`);
  });
  if (n.gates.length < n.nOut) throw new Error("fewer gates than outputs");
}
function evalWord(n, word) {
  return outputOf(evalTrace(n, word), n);
}
function outputOf(sig, n) {
  let out = 0;
  const first = sig.length - n.nOut;
  for (let k = 0; k < n.nOut; k++) out |= sig[first + k] << k;
  return out;
}
function evalTrace(n, word) {
  const sig = new Uint8Array(2 + n.nIn + n.gates.length);
  sig[1] = 1;
  for (let i = 0; i < n.nIn; i++) sig[2 + i] = word >>> i & 1;
  const base = 2 + n.nIn;
  for (let i = 0; i < n.gates.length; i++) {
    const g = n.gates[i];
    sig[base + i] = sig[g[0]] & sig[g[1]] ? 0 : 1;
  }
  return sig;
}

// forge-src/synth.ts
var C0 = 0;
var C1 = 1;
var Builder = class {
  constructor(nIn) {
    this.nIn = nIn;
  }
  nIn;
  gates = [];
  cache = /* @__PURE__ */ new Map();
  inv = /* @__PURE__ */ new Map();
  get base() {
    return 2 + this.nIn;
  }
  input(i) {
    return 2 + i;
  }
  nand(a, b2) {
    if (a > b2) [a, b2] = [b2, a];
    if (a === C0) return C1;
    if (a === C1) return this.not(b2);
    if (this.inv.get(a) === b2) return C1;
    const key = a + "," + b2;
    const hit = this.cache.get(key);
    if (hit !== void 0) return hit;
    const s = this.base + this.gates.length;
    this.gates.push([a, b2]);
    this.cache.set(key, s);
    if (a === b2) {
      this.inv.set(a, s);
      this.inv.set(s, a);
    }
    return s;
  }
  not(a) {
    if (a === C0) return C1;
    if (a === C1) return C0;
    const k = this.inv.get(a);
    if (k !== void 0) return k;
    return this.nand(a, a);
  }
  and(a, b2) {
    if (a === C0 || b2 === C0) return C0;
    if (a === C1) return b2;
    if (b2 === C1) return a;
    if (a === b2) return a;
    return this.not(this.nand(a, b2));
  }
  or(a, b2) {
    if (a === C1 || b2 === C1) return C1;
    if (a === C0) return b2;
    if (b2 === C0) return a;
    if (a === b2) return a;
    return this.nand(this.not(a), this.not(b2));
  }
  /** s ? hi : lo */
  mux(s, hi, lo) {
    if (hi === lo) return hi;
    if (hi === C1 && lo === C0) return s;
    if (hi === C0 && lo === C1) return this.not(s);
    if (lo === C0) return this.and(s, hi);
    if (hi === C0) return this.and(this.not(s), lo);
    if (lo === C1) return this.or(this.not(s), hi);
    if (hi === C1) return this.or(s, lo);
    return this.nand(this.nand(s, hi), this.nand(this.not(s), lo));
  }
};
function tableOf(nIn, f, bit) {
  const t = new Uint8Array(1 << nIn);
  for (let w = 0; w < t.length; w++) t[w] = f(w) >> bit & 1;
  return t;
}
function build(nIn, nOut, f, order, version) {
  const B = new Builder(nIn);
  const memo = /* @__PURE__ */ new Map();
  const perm = (w) => {
    let p = 0;
    for (let j = 0; j < nIn; j++) if (w >> order[j] & 1) p |= 1 << nIn - 1 - j;
    return p;
  };
  const node = (t, level) => {
    let ones = 0;
    for (let i = 0; i < t.length; i++) ones += t[i];
    if (ones === 0) return C0;
    if (ones === t.length) return C1;
    const key = level + ":" + t.join("");
    const hit = memo.get(key);
    if (hit !== void 0) return hit;
    const half = t.length >> 1;
    const lo = node(t.subarray(0, half), level + 1);
    const hi = node(t.subarray(half), level + 1);
    const s = B.mux(B.input(order[level]), hi, lo);
    memo.set(key, s);
    return s;
  };
  const outs = [];
  for (let k = 0; k < nOut; k++) {
    const t = tableOf(nIn, f, k);
    const p = new Uint8Array(t.length);
    for (let w = 0; w < t.length; w++) p[perm(w)] = t[w];
    outs.push(node(p, 0));
  }
  return finish(B.gates, outs, nIn, nOut, version);
}
function finish(gates, bits, nIn, nOut, version) {
  const base = 2 + nIn;
  const all = gates.slice();
  const finals = [];
  const used = /* @__PURE__ */ new Set();
  for (const s of bits) {
    if (s >= base && !used.has(s)) {
      finals.push(all[s - base]);
      used.add(s);
    } else {
      all.push([s, s]);
      const ns = base + all.length - 1;
      finals.push([ns, ns]);
    }
  }
  const live = new Uint8Array(all.length);
  const stack = [];
  for (const [a, b2] of finals) stack.push(a, b2);
  while (stack.length) {
    const s = stack.pop();
    if (s < base) continue;
    const i = s - base;
    if (live[i]) continue;
    live[i] = 1;
    stack.push(all[i][0], all[i][1]);
  }
  const remap = /* @__PURE__ */ new Map();
  for (let s = 0; s < base; s++) remap.set(s, s);
  const out = [];
  for (let i = 0; i < all.length; i++) {
    if (!live[i]) continue;
    remap.set(base + i, base + out.length);
    out.push([remap.get(all[i][0]), remap.get(all[i][1])]);
  }
  for (const [a, b2] of finals) out.push([remap.get(a), remap.get(b2)]);
  return { version, nIn, nOut, gates: out };
}
function netDepth(n) {
  const base = 2 + n.nIn;
  const d = new Array(base + n.gates.length).fill(0);
  let max = 0;
  n.gates.forEach(([a, b2], i) => {
    d[base + i] = 1 + Math.max(d[a], d[b2]);
    max = Math.max(max, d[base + i]);
  });
  return max;
}
var cost = (n) => n.gates.length * netDepth(n) ** 3;
function verifyNetlist(n, f) {
  const bad = [];
  const mask = (1 << n.nOut) - 1;
  for (let w = 0; w < 1 << n.nIn; w++) if (evalWord(n, w) !== (f(w) & mask)) bad.push(w);
  return bad;
}

// forge-src/tapeout.ts
var hex6 = (v) => v.toString(16).padStart(6, "0");
function netlistBytes(n) {
  let s = "0x";
  for (const [a, b2] of n.gates) s += "00" + hex6(a) + hex6(b2);
  return s;
}

// forge-src/expr.ts
var FUNCS = /* @__PURE__ */ new Set(["min", "max", "abs", "count"]);
var BIN = [
  [["||"], 1],
  [["&&"], 2],
  [["|"], 3],
  [["^"], 4],
  [["&"], 5],
  [["==", "!="], 6],
  [["<", "<=", ">", ">="], 7],
  [["<<", ">>"], 8],
  [["+", "-"], 9],
  [["*", "/", "%"], 10]
];
var PREC = /* @__PURE__ */ new Map();
for (const [ops, p] of BIN) for (const o of ops) PREC.set(o, p);
var PUNCT = ["<<", ">>", "<=", ">=", "==", "!=", "&&", "||", "+", "-", "*", "/", "%", "<", ">", "&", "|", "^", "!", "~", "?", ":", "(", ")", ","];
var ExprError = class extends Error {
  constructor(msg, at) {
    super(msg);
    this.at = at;
  }
  at;
};
function lex(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const num2 = /^(0x[0-9a-fA-F]+|0b[01]+|\d+)/.exec(src.slice(i));
    if (num2) {
      out.push({ t: "num", v: num2[0], at: i });
      i += num2[0].length;
      continue;
    }
    const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
    if (id) {
      out.push({ t: "id", v: id[0], at: i });
      i += id[0].length;
      continue;
    }
    const p = PUNCT.find((q) => src.startsWith(q, i));
    if (p) {
      out.push({ t: "op", v: p, at: i });
      i += p.length;
      continue;
    }
    throw new ExprError(`unexpected character "${c}"`, i);
  }
  return out;
}
function parseExpr(src) {
  if (src.length > 2e3) throw new ExprError("formula is too long (2,000 characters at most)", 0);
  const toks = lex(src);
  let p = 0;
  const peek = () => toks[p];
  const at = () => toks[p] ? toks[p].at : src.length;
  const take = (v) => {
    const t = toks[p];
    if (!t || v !== void 0 && t.v !== v) throw new ExprError(v ? `expected "${v}"` : "formula ends too early", at());
    p++;
    return t;
  };
  let depth = 0;
  const ternary = () => {
    if (++depth > 200) throw new ExprError("formula is nested too deeply", at());
    const c = binary(1);
    let r = c;
    if (peek()?.v === "?") {
      take("?");
      const a = ternary();
      take(":");
      const b2 = ternary();
      r = { k: "if", c, a, b: b2 };
    }
    depth--;
    return r;
  };
  const binary = (min) => {
    let left = unary();
    for (; ; ) {
      const t = peek();
      const prec = t && t.t === "op" ? PREC.get(t.v) : void 0;
      if (prec === void 0 || prec < min) return left;
      p++;
      const right = binary(prec + 1);
      left = { k: "bin", op: t.v, a: left, b: right };
    }
  };
  const unary = () => {
    const t = peek();
    if (t && t.t === "op" && (t.v === "!" || t.v === "~" || t.v === "-")) {
      p++;
      return { k: "un", op: t.v, a: unary() };
    }
    return atom();
  };
  const atom = () => {
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
        const args = [];
        if (peek()?.v !== ")") {
          args.push(ternary());
          while (peek()?.v === ",") {
            take(",");
            args.push(ternary());
          }
        }
        take(")");
        if (args.length === 0 || t.v === "abs" && args.length !== 1) throw new ExprError(`wrong number of arguments for ${t.v}`, t.at);
        return { k: "call", fn: t.v, args };
      }
      return { k: "var", name: t.v };
    }
    if (t.v === "(") {
      const e2 = ternary();
      take(")");
      return e2;
    }
    throw new ExprError(`unexpected "${t.v}"`, t.at);
  };
  const e = ternary();
  if (p < toks.length) throw new ExprError(`unexpected "${toks[p].v}"`, toks[p].at);
  return e;
}
function varsOf(e, out = /* @__PURE__ */ new Set()) {
  switch (e.k) {
    case "var":
      out.add(e.name);
      break;
    case "un":
      varsOf(e.a, out);
      break;
    case "bin":
      varsOf(e.a, out);
      varsOf(e.b, out);
      break;
    case "if":
      varsOf(e.c, out);
      varsOf(e.a, out);
      varsOf(e.b, out);
      break;
    case "call":
      e.args.forEach((a) => varsOf(a, out));
      break;
  }
  return out;
}
var b = (x) => x ? 1 : 0;
function evalExpr(e, env) {
  switch (e.k) {
    case "num":
      return e.v;
    case "var": {
      const v = env[e.name];
      if (v === void 0) throw new Error(`unknown name "${e.name}"`);
      return v;
    }
    case "un": {
      const a = evalExpr(e.a, env);
      return e.op === "!" ? b(a === 0) : e.op === "~" ? ~a : -a;
    }
    case "if":
      return evalExpr(e.c, env) !== 0 ? evalExpr(e.a, env) : evalExpr(e.b, env);
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
        case "|":
          return x | y;
        case "^":
          return x ^ y;
        case "&":
          return x & y;
        case "==":
          return b(x === y);
        case "!=":
          return b(x !== y);
        case "<":
          return b(x < y);
        case "<=":
          return b(x <= y);
        case ">":
          return b(x > y);
        case ">=":
          return b(x >= y);
        case "<<":
          return y >= 31 || y < 0 ? 0 : x << y;
        case ">>":
          return y >= 31 || y < 0 ? x < 0 ? -1 : 0 : x >> y;
        case "+":
          return x + y;
        case "-":
          return x - y;
        case "*":
          return x * y;
        case "/":
          return y === 0 ? 0 : Math.trunc(x / y);
        case "%":
          return y === 0 ? 0 : x % y;
      }
    }
  }
  throw new Error("bad formula");
}

// forge-src/spec.ts
var LIMITS = { inputBits: 16, outputBits: 16, fieldBits: 16, rules: 128 };
var NAME = /^[A-Za-z_][A-Za-z0-9_]{0,31}$/;
var RESERVED = /* @__PURE__ */ new Set(["true", "false", "min", "max", "abs", "count"]);
var SpecError = class extends Error {
  constructor(problems) {
    super(problems.join("\n"));
    this.problems = problems;
  }
  problems;
};
var num = (v) => typeof v === "boolean" ? v ? 1 : 0 : v;
var totalBits = (fs) => fs.reduce((s, f) => s + f.bits, 0);
function unpack(fields, word) {
  const env = {};
  let shift = 0;
  for (const f of fields) {
    env[f.name] = word >>> shift & (1 << f.bits) - 1;
    shift += f.bits;
  }
  return env;
}
function pack(fields, values) {
  let w = 0, shift = 0;
  for (const f of fields) {
    w |= ((values[f.name] ?? 0) & (1 << f.bits) - 1) << shift;
    shift += f.bits;
  }
  return w >>> 0;
}
function condHolds(c, v) {
  if (typeof c === "number" || typeof c === "boolean") return v === num(c);
  if (Array.isArray(c)) return v >= c[0] && v <= c[1];
  return c.oneOf.includes(v);
}
function compileSpec(raw) {
  const P = [];
  const s = raw;
  if (!s || typeof s !== "object") throw new SpecError(["the rule must be a JSON object"]);
  if (typeof s.name !== "string" || !s.name.trim()) P.push('give the rule a "name"');
  const fieldsOk = (fs, kind, maxBits) => {
    if (!Array.isArray(fs) || fs.length === 0) {
      P.push(`"${kind}" must be a non-empty list`);
      return false;
    }
    for (const f of fs) {
      if (!f || typeof f.name !== "string" || !NAME.test(f.name) || RESERVED.has(f.name)) P.push(`${kind}: "${f?.name}" is not a usable name (letters, digits and _, starting with a letter)`);
      if (!Number.isInteger(f?.bits) || f.bits < 1 || f.bits > LIMITS.fieldBits) P.push(`${kind}: "${f?.name}" needs "bits" between 1 and ${LIMITS.fieldBits}`);
    }
    const tb = totalBits(fs);
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
  const fits = (v, bits) => typeof v === "boolean" || Number.isInteger(v) && v >= 0 && v < 2 ** bits;
  const parse = (src, where) => {
    if (typeof src !== "string") {
      P.push(`${where}: a formula must be text`);
      return null;
    }
    try {
      const e = parseExpr(src);
      for (const v of varsOf(e)) if (!inBits.has(v)) P.push(`${where}: "${v}" is not one of the inputs`);
      return e;
    } catch (err) {
      P.push(`${where}: ${err.message}${err instanceof ExprError ? ` (at character ${err.at + 1})` : ""}`);
      return null;
    }
  };
  const formulas = /* @__PURE__ */ new Map();
  for (const [out, src] of Object.entries(s.formulas ?? {})) {
    if (!outBits.has(out)) {
      P.push(`formulas: "${out}" is not one of the outputs`);
      continue;
    }
    const e = parse(src, `formula for ${out}`);
    if (e) formulas.set(out, e);
  }
  const rules = s.rules ?? [];
  if (!Array.isArray(rules)) P.push('"rules" must be a list');
  if (rules.length > LIMITS.rules) P.push(`at most ${LIMITS.rules} rules`);
  const ruleIf = [];
  rules.forEach((r, i) => {
    const where = `rule ${i + 1}`;
    if (!r || typeof r !== "object" || !r.then || typeof r.then !== "object") {
      P.push(`${where}: needs "then"`);
      ruleIf.push(null);
      return;
    }
    for (const [k, c] of Object.entries(r.when ?? {})) {
      const bits = inBits.get(k);
      if (bits === void 0) {
        P.push(`${where}: "${k}" is not one of the inputs`);
        continue;
      }
      const vals = typeof c === "number" || typeof c === "boolean" ? [c] : Array.isArray(c) ? c : c && Array.isArray(c.oneOf) ? c.oneOf : null;
      if (!vals || Array.isArray(c) && c.length !== 2) P.push(`${where}: condition on "${k}" must be a value, [low, high] or { "oneOf": [...] }`);
      else for (const v of vals) if (!fits(v, bits)) P.push(`${where}: ${k} is ${bits} bit${bits > 1 ? "s" : ""} (0\u2013${2 ** bits - 1}), so ${v} can't happen`);
    }
    ruleIf.push(r.if !== void 0 ? parse(r.if, where) : null);
    for (const [k, v] of Object.entries(r.then)) {
      const bits = outBits.get(k);
      if (bits === void 0) P.push(`${where}: "${k}" is not one of the outputs`);
      else if (formulas.has(k)) P.push(`${where}: "${k}" already comes from a formula`);
      else if (!fits(v, bits)) P.push(`${where}: ${k} is ${bits} bit${bits > 1 ? "s" : ""}, so it can't be ${v}`);
    }
  });
  for (const [k, v] of Object.entries(s.otherwise ?? {})) {
    const bits = outBits.get(k);
    if (bits === void 0) P.push(`otherwise: "${k}" is not one of the outputs`);
    else if (!fits(v, bits)) P.push(`otherwise: ${k} can't be ${v}`);
  }
  if (P.length) throw new SpecError(P);
  const nIn = totalBits(s.inputs), nOut = totalBits(s.outputs);
  const table = new Uint32Array(2 ** nIn);
  const over = /* @__PURE__ */ new Map();
  for (let w = 0; w < table.length; w++) {
    const env = unpack(s.inputs, w);
    const out = {};
    for (const f of s.outputs) out[f.name] = num(s.otherwise?.[f.name] ?? 0);
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      let hit = true;
      for (const [k, c] of Object.entries(r.when ?? {})) if (!condHolds(c, env[k])) {
        hit = false;
        break;
      }
      if (hit && ruleIf[i] && evalExpr(ruleIf[i], env) === 0) hit = false;
      if (hit) {
        for (const [k, v] of Object.entries(r.then)) out[k] = num(v);
        break;
      }
    }
    for (const [k, e] of formulas) {
      const v = evalExpr(e, env), bits = outBits.get(k);
      if (v < 0 || v >= 2 ** bits) over.set(k, (over.get(k) ?? 0) + 1);
      out[k] = v & 2 ** bits - 1;
    }
    table[w] = pack(s.outputs, out);
  }
  const warnings = [...over].map(([k, n]) => `formula for ${k} went outside 0\u2013${2 ** outBits.get(k) - 1} on ${n} of ${table.length} cases; only its low bits are kept there`);
  return { spec: s, nIn, nOut, table, warnings };
}

// forge-src/forge.ts
var statsOf = (n) => ({
  gates: n.gates.length,
  depth: netDepth(n),
  cost: cost(n),
  bytes: n.gates.length * 7,
  inputs: n.nIn,
  outputs: n.nOut,
  cases: 2 ** n.nIn
});
function forge(rawSpec, goal = "gates") {
  const c = compileSpec(rawSpec);
  const f = (w) => c.table[w];
  const nIn = c.nIn;
  const groups = [];
  let off = 0;
  for (const fl of c.spec.inputs) {
    groups.push(Array.from({ length: fl.bits }, (_, b2) => off + fl.bits - 1 - b2));
    off += fl.bits;
  }
  const orders = [
    Array.from({ length: nIn }, (_, i) => nIn - 1 - i),
    Array.from({ length: nIn }, (_, i) => i),
    groups.flat(),
    groups.slice().reverse().flat(),
    interleave(groups, false),
    interleave(groups, true),
    interleave(groups.slice().reverse(), false)
  ];
  if (nIn <= 14) orders.push(Array.from({ length: nIn }, (_, i) => i).sort((a, b2) => influence(c.table, nIn, b2) - influence(c.table, nIn, a)));
  const extra = nIn <= 8 ? 60 : nIn <= 11 ? 24 : nIn <= 13 ? 6 : 0;
  let seed = 2654435769;
  const rnd = () => {
    seed = seed + 1831565813 >>> 0;
    let t = seed;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  for (let k = 0; k < extra; k++) {
    const g = groups.map((x) => x.slice());
    for (let i = g.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [g[i], g[j]] = [g[j], g[i]];
    }
    let o = k % 3 === 2 ? interleave(g, rnd() < 0.5) : g.flat();
    if (k % 2) {
      o = o.slice();
      for (let i = o.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [o[i], o[j]] = [o[j], o[i]];
      }
    }
    orders.push(o);
  }
  const score = (n) => goal === "gates" ? n.gates.length * 1e6 + netDepth(n) : cost(n) * 1e3 + n.gates.length;
  let best = null;
  for (const o of dedupe(orders, nIn)) {
    const n = build(nIn, c.nOut, f, o, c.spec.name);
    if (!best || score(n) < score(best)) best = n;
  }
  const netlist = best;
  checkNetlist(netlist);
  const bad = verifyNetlist(netlist, f);
  if (bad.length) throw new Error(`internal error: the circuit disagrees with the rule on ${bad.length} cases; nothing was produced`);
  return { spec: c.spec, netlist, stats: statsOf(netlist), bytes: netlistBytes(netlist), checked: true, warnings: c.warnings };
}
function interleave(groups, lowFirst) {
  const gs = groups.map((g) => lowFirst ? g.slice().reverse() : g.slice());
  const out = [];
  const longest = Math.max(...gs.map((g) => g.length));
  for (let i = 0; i < longest; i++) {
    for (const g of gs) {
      const idx = lowFirst ? i : i - (longest - g.length);
      if (idx >= 0 && idx < g.length) out.push(g[idx]);
    }
  }
  return out;
}
function influence(t, nIn, pin) {
  let n = 0;
  for (let w = 0; w < 2 ** nIn; w++) if (!(w >> pin & 1) && t[w] !== t[w | 1 << pin]) n++;
  return n;
}
function dedupe(orders, nIn) {
  const seen = /* @__PURE__ */ new Set();
  return orders.filter((o) => o.length === nIn && !seen.has(o.join()) && !!seen.add(o.join()));
}
function tableOf2(n) {
  if (n.nIn > 20) throw new Error("too many inputs to run every case here (20 at most)");
  const t = new Uint32Array(2 ** n.nIn);
  for (let w = 0; w < t.length; w++) t[w] = evalWord(n, w) >>> 0;
  return t;
}
function checkAgainst(n, rawSpec) {
  const c = compileSpec(rawSpec);
  if (c.nIn !== n.nIn || c.nOut !== n.nOut) throw new Error(`the rule has ${c.nIn} input and ${c.nOut} output bits but the circuit has ${n.nIn} and ${n.nOut}`);
  const t = tableOf2(n);
  const examples = [];
  let wrong = 0;
  for (let w = 0; w < t.length; w++) {
    if (t[w] === c.table[w]) continue;
    wrong++;
    if (examples.length < 20) examples.push({ case: unpack(c.spec.inputs, w), rule: unpack(c.spec.outputs, c.table[w]), circuit: unpack(c.spec.outputs, t[w]) });
  }
  return { ok: wrong === 0, cases: t.length, wrong, examples };
}
function defaultLayout(nIn, nOut) {
  return {
    inputs: Array.from({ length: nIn }, (_, i) => ({ name: `in${i}`, bits: 1 })),
    outputs: Array.from({ length: nOut }, (_, i) => ({ name: `out${i}`, bits: 1 }))
  };
}
function explain(n, layout, maxRules = 128) {
  checkNetlist(n);
  const L = layout ?? defaultLayout(n.nIn, n.nOut);
  if (totalBits(L.inputs) !== n.nIn || totalBits(L.outputs) !== n.nOut) throw new Error(`the names cover ${totalBits(L.inputs)} input and ${totalBits(L.outputs)} output bits, but the circuit has ${n.nIn} and ${n.nOut}`);
  if (n.nIn > 16) throw new Error("explaining needs 16 input bits or fewer");
  const t = tableOf2(n);
  const N = t.length;
  const fieldMask = (fs) => {
    let s = 0;
    return fs.map((f) => {
      const m = 2 ** f.bits - 1 << s >>> 0;
      s += f.bits;
      return { f, m, s: s - f.bits };
    });
  };
  const inF = fieldMask(L.inputs), outF = fieldMask(L.outputs);
  const unusedInputs = inF.filter(({ m }) => {
    for (let w = 0; w < N; w++) {
      if (w & m) continue;
      for (let v = m; v; v = v - 1 & m) if (t[w] !== t[w | v]) return false;
    }
    return true;
  }).map(({ f }) => f.name);
  const constantOutputs = outF.flatMap(({ f, m, s }) => {
    const v0 = (t[0] & m) >>> s;
    for (let w = 1; w < N; w++) if ((t[w] & m) >>> s !== v0) return [];
    return [{ name: f.name, value: v0 }];
  });
  const counts = /* @__PURE__ */ new Map();
  for (let w = 0; w < N; w++) counts.set(t[w], (counts.get(t[w]) ?? 0) + 1);
  const byFreq = [...counts].sort((a, b2) => b2[1] - a[1] || a[0] - b2[0]);
  const answers = byFreq.map(([v, count]) => ({ values: unpack(L.outputs, v), count }));
  const dflt = byFreq[0][0];
  const covered = new Uint8Array(N);
  const rules = [];
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
      forEachInCube(base, free, (x) => {
        covered[x] = 1;
      });
      if (rules.length >= maxRules) {
        tooMany = true;
        break;
      }
      rules.push(cubeToRule(base, free, inF, L.outputs, v, dflt));
    }
  }
  const spec = tooMany ? null : {
    name: n.version || "circuit",
    inputs: L.inputs,
    outputs: L.outputs,
    rules,
    otherwise: unpack(L.outputs, dflt)
  };
  return { stats: statsOf(n), inputs: L.inputs, outputs: L.outputs, unusedInputs, constantOutputs, answers, spec, ruleCount: tooMany ? -1 : rules.length };
}
function forEachInCube(base, free, fn) {
  for (let sub = free; ; sub = sub - 1 & free) {
    fn(base | sub);
    if (sub === 0) break;
  }
}
function cubeAll(t, base, free, v) {
  for (let sub = free; ; sub = sub - 1 & free) {
    if (t[base | sub] !== v) return false;
    if (sub === 0) return true;
  }
}
function cubeToRule(base, free, inF, outs, v, dflt) {
  const when = {};
  for (const { f, m, s } of inF) {
    if ((free & m) === m) continue;
    const fixedMask = (~free & m) >>> s, fixedVal = (base & m) >>> s;
    const vals = [];
    for (let x = 0; x < 2 ** f.bits; x++) if ((x & fixedMask) === fixedVal) vals.push(x);
    when[f.name] = vals.length === 1 ? vals[0] : vals[vals.length - 1] - vals[0] === vals.length - 1 ? [vals[0], vals[vals.length - 1]] : { oneOf: vals };
  }
  const now = unpack(outs, v), was = unpack(outs, dflt);
  const then = {};
  for (const o of outs) if (now[o.name] !== was[o.name]) then[o.name] = now[o.name];
  return { when, then };
}
function sampleRows(spec, max = 64) {
  const c = compileSpec(spec);
  const rows = [];
  const step = Math.max(1, Math.floor(c.table.length / max));
  for (let w = 0; w < c.table.length && rows.length < max; w += step) rows.push({ inputs: unpack(spec.inputs, w), outputs: unpack(spec.outputs, c.table[w]) });
  return rows;
}
export {
  checkAgainst,
  defaultLayout,
  explain,
  forge,
  sampleRows,
  statsOf,
  tableOf2 as tableOf
};
