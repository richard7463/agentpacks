// forge-src/tapeout.ts
var hex2 = (v) => v.toString(16).padStart(2, "0");
var hex6 = (v) => v.toString(16).padStart(6, "0");
function netlistBytes(n) {
  let s = "0x";
  for (const [a, b] of n.gates) s += "00" + hex6(a) + hex6(b);
  return s;
}
var BytesError = class extends Error {
};
function parseNetlistBytes(hex, nIn, nOut, version = "from bytes") {
  const h = hex.trim().replace(/^0x/i, "").replace(/\s+/g, "");
  if (!/^[0-9a-fA-F]*$/.test(h)) throw new BytesError("the bytes contain characters that aren't hex");
  if (h.length === 0 || h.length % 14 !== 0) throw new BytesError(`a circuit is a whole number of 7-byte gates; this is ${h.length / 2} bytes`);
  if (!Number.isInteger(nIn) || nIn < 1 || nIn > 24) throw new BytesError("inputs must be between 1 and 24 pins");
  const gates = [];
  for (let i = 0; i < h.length; i += 14) {
    const kind = parseInt(h.slice(i, i + 2), 16);
    if (kind !== 0) throw new BytesError(`gate ${i / 14} has type 0x${hex2(kind)}; only plain NAND (0x00) is read here (latches aren't supported yet)`);
    gates.push([parseInt(h.slice(i + 2, i + 8), 16), parseInt(h.slice(i + 8, i + 14), 16)]);
  }
  const base = 2 + nIn;
  gates.forEach(([a, b], i) => {
    if (a >= base + i || b >= base + i) throw new BytesError(`gate ${i} reads a signal that isn't made yet; are the input count (${nIn}) and the bytes right?`);
  });
  if (!Number.isInteger(nOut) || nOut < 1 || nOut > gates.length) throw new BytesError(`outputs must be between 1 and the gate count (${gates.length})`);
  return { version, nIn, nOut, gates };
}
function minInputs(hex) {
  const h = hex.trim().replace(/^0x/i, "").replace(/\s+/g, "");
  let need = 1;
  for (let i = 0, g = 0; i + 14 <= h.length; i += 14, g++) {
    const a = parseInt(h.slice(i + 2, i + 8), 16), b = parseInt(h.slice(i + 8, i + 14), 16);
    need = Math.max(need, Math.max(a, b) - 1 - g);
  }
  return need;
}
function evalInputBytes(word, nIn) {
  let s = "0x";
  for (let i = 0; i < Math.ceil(nIn / 8); i++) s += hex2(word >>> 8 * i & 255);
  return s;
}
function decodeAnswer(out, nOut) {
  const hex = out.replace(/^0x/, "");
  const b = [];
  for (let i = 0; i < hex.length; i += 2) b.push(parseInt(hex.slice(i, i + 2), 16));
  if (b.length === Math.ceil(nOut / 8)) return b.reduce((v, x, i) => v | x << 8 * i, 0) & 2 ** nOut - 1;
  if (b.length === nOut) return b.reduce((v, x, i) => v | (x & 1) << i, 0);
  throw new Error(`eval returned ${b.length} bytes; expected ${Math.ceil(nOut / 8)} (packed) or ${nOut} (one per output)`);
}
export {
  BytesError,
  decodeAnswer,
  evalInputBytes,
  minInputs,
  netlistBytes,
  parseNetlistBytes
};
