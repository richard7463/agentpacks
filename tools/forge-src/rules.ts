/* ── rules.ts ───────────────────────────────────────────────────────────────
   TapeID rule certificates, on top of the TapeForge compiler.

   Every certificate uses the same circuit: the "AI spending guard" template.
   Its inputs are the payment (in steps of money), what is left of today's
   budget (same steps), whether the payee is on the owner's list, and whether
   a person approved it. Its outputs are "allow" and "ask a person". The owner's
   own numbers (budget, step size, payees) live on the name card, not in the
   circuit, so one set of bytes serves every owner and anyone can check a
   certificate by comparing bytes.

   The record replays a wallet's real outgoing transfers through the circuit:
   each transfer becomes one input word, and the circuit's answer is the verdict.
   --------------------------------------------------------------------------- */
import { forge, type Forged } from "./forge.js";
import { evalWord } from "./netlist.js";
import { pack, unpack } from "./spec.js";
import { templateById } from "./templates.js";

export const SPEND_TEMPLATE_ID = "agent-spend";

/** The largest step value the 4-bit inputs hold; 15 means "15 or more". */
export const MAX_STEPS = 15;

let cached: Forged | null = null;

/** The spending-guard circuit, compiled once and proven on all 1,024 cases. */
export function spendCircuit(): Forged {
  if (cached) return cached;
  const template = templateById(SPEND_TEMPLATE_ID);
  if (!template) throw new Error(`template ${SPEND_TEMPLATE_ID} is missing`);
  cached = forge(template.spec, "gates");
  return cached;
}

export interface SpendInputs {
  /** Payment size in steps, rounded up, capped at 15. */
  amount: number;
  /** Budget left today in steps, rounded down, capped at 15. */
  left_today: number;
  payee_known: 0 | 1;
  human_ok: 0 | 1;
}

export type Verdict = "ok" | "ask" | "over";

export interface SpendAnswer {
  word: number;
  allow: 0 | 1;
  ask_human: 0 | 1;
  verdict: Verdict;
}

export function spendWord(inputs: SpendInputs): number {
  return pack(spendCircuit().spec.inputs, inputs as unknown as Record<string, number>);
}

/** Answer from the circuit itself (gate by gate), not from the rule text. */
export function verdictOf(outputWord: number): Omit<SpendAnswer, "word"> {
  const out = unpack(spendCircuit().spec.outputs, outputWord);
  const allow = (out.allow ? 1 : 0) as 0 | 1;
  const ask_human = (out.ask_human ? 1 : 0) as 0 | 1;
  return { allow, ask_human, verdict: allow ? "ok" : ask_human ? "ask" : "over" };
}

export function runSpend(inputs: SpendInputs): SpendAnswer {
  const word = spendWord(inputs);
  return { word, ...verdictOf(evalWord(spendCircuit().netlist, word)) };
}

/** USD → steps for a payment: rounded up, so a payment never looks smaller than it is. */
export function amountSteps(usd: number, unitUsd: number): number {
  if (usd <= 0) return 0;
  return Math.min(MAX_STEPS, Math.ceil(usd / unitUsd - 1e-9));
}

/** USD → steps for what is left: rounded down, so the budget never looks bigger than it is. */
export function leftSteps(usd: number, unitUsd: number): number {
  if (usd <= 0) return 0;
  return Math.min(MAX_STEPS, Math.floor(usd / unitUsd + 1e-9));
}

/** What the record needs from a certificate (the card's `tapeid.rules`). */
export interface SpendTerms {
  unitUsd: number;
  dailyBudgetUsd: number;
  payees: string[];
}

export interface RecordTransfer {
  txHash: string;
  logIndex: number;
  to: string;
  /** Amount in USD (stablecoins count as $1). */
  usd: number;
  /** Seconds since epoch. */
  timestamp: number;
  chainId?: number;
  tokenSymbol?: string;
}

export interface RecordEntry extends RecordTransfer {
  /** UTC day, YYYY-MM-DD. Budgets reset at 00:00 UTC. */
  day: string;
  /** Spent earlier the same day, before this transfer. */
  spentBeforeUsd: number;
  inputs: SpendInputs;
  answer: SpendAnswer;
}

export interface RecordSummary {
  total: number;
  ok: number;
  ask: number;
  over: number;
  firstAt: number | null;
  lastAt: number | null;
}

export interface SpendRecord {
  entries: RecordEntry[];
  summary: RecordSummary;
}

const utcDay = (seconds: number) => new Date(seconds * 1000).toISOString().slice(0, 10);

/**
 * Replays transfers through the circuit in time order. Every transfer counts
 * towards the day's spending, whatever its verdict: the money left either way.
 * Nothing on chain says whether a person approved a payment, so `human_ok` is
 * always 0 here and a payment the rule would put to a person shows as "ask".
 */
export function judgeTransfers(transfers: RecordTransfer[], terms: SpendTerms): SpendRecord {
  const payees = new Set(terms.payees.map((p) => p.toLowerCase()));
  const sorted = [...transfers].sort((a, b) => a.timestamp - b.timestamp || a.logIndex - b.logIndex);
  const spentByDay = new Map<string, number>();
  const entries: RecordEntry[] = [];
  for (const t of sorted) {
    const day = utcDay(t.timestamp);
    const spentBeforeUsd = spentByDay.get(day) ?? 0;
    const inputs: SpendInputs = {
      amount: amountSteps(t.usd, terms.unitUsd),
      left_today: leftSteps(terms.dailyBudgetUsd - spentBeforeUsd, terms.unitUsd),
      payee_known: payees.has(t.to.toLowerCase()) ? 1 : 0,
      human_ok: 0
    };
    entries.push({ ...t, day, spentBeforeUsd, inputs, answer: runSpend(inputs) });
    spentByDay.set(day, spentBeforeUsd + t.usd);
  }
  const count = (v: Verdict) => entries.filter((e) => e.answer.verdict === v).length;
  return {
    entries,
    summary: {
      total: entries.length,
      ok: count("ok"),
      ask: count("ask"),
      over: count("over"),
      firstAt: entries.length ? entries[0].timestamp : null,
      lastAt: entries.length ? entries[entries.length - 1].timestamp : null
    }
  };
}
