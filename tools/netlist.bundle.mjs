// forge-src/netlist.ts
function checkNetlist(n) {
  const base = 2 + n.nIn;
  n.gates.forEach(([a, b], i) => {
    const self = base + i;
    if (!(a >= 0 && a < self && b >= 0 && b < self)) throw new Error(`gate ${i}: future signal`);
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
function gateDepth(n) {
  const base = 2 + n.nIn;
  const total = base + n.gates.length;
  const depth = new Array(total).fill(0);
  let maxD = 0;
  for (let i = 0; i < n.gates.length; i++) {
    const [a, b] = n.gates[i];
    const d = 1 + Math.max(depth[a], depth[b]);
    depth[base + i] = d;
    if (d > maxD) maxD = d;
  }
  const cols = Array.from({ length: maxD + 1 }, () => []);
  for (let i = 0; i < n.gates.length; i++) cols[depth[base + i]].push(base + i);
  return { depth, cols };
}
export {
  checkNetlist,
  evalTrace,
  evalWord,
  gateDepth
};
