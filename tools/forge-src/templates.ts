/* ── core/templates.ts ───────────────────────────────────────────────────────
   Ready-made rules. Each one is a plain sentence plus the spec that says the
   same thing exactly. The tests forge every template and prove it on every
   input, so each of these is known to become a working circuit.

   Circuits decide which bucket something falls in; contracts do the exact
   arithmetic on amounts. So money values here are tiers or small numbers, and
   the sentence says what each number means.
   --------------------------------------------------------------------------- */
import type { Spec } from "./spec.js";

export type Category = "finance" | "agents" | "access" | "governance" | "games" | "basics";

export interface Template {
  id: string;
  category: Category;
  title: { zh: string; en: string };
  sentence: { zh: string; en: string };
  spec: Spec;
}

export const CATEGORIES: { id: Category; zh: string; en: string }[] = [
  { id: "finance", zh: "金融规则", en: "Finance" },
  { id: "agents", zh: "AI 代理", en: "AI agents" },
  { id: "access", zh: "资格与空投", en: "Access & airdrops" },
  { id: "governance", zh: "投票与治理", en: "Governance" },
  { id: "games", zh: "游戏规则", en: "Games" },
  { id: "basics", zh: "基础电路", en: "Basics" }
];

export const TEMPLATES: Template[] = [
  {
    id: "liquidation",
    category: "finance",
    title: { zh: "清算判断", en: "Liquidation check" },
    sentence: {
      zh: "抵押率低于 120% 就清算，低于 150% 先预警；预言机报价过期或互相对不上时，先暂停，谁也不清算。",
      en: "Liquidate below 120% collateral, warn below 150%; if the price feed is stale or the feeds disagree, pause and liquidate no one."
    },
    spec: {
      name: "Liquidation check",
      about: "status: 0 safe, 1 warning, 2 liquidate, 3 paused",
      inputs: [
        { name: "ratio", bits: 5, about: "collateral ratio in 10% steps: 15 means 150%, 31 means 310% or more" },
        { name: "feed_fresh", bits: 1, about: "the price was updated recently" },
        { name: "feeds_agree", bits: 1, about: "independent price feeds are within tolerance" }
      ],
      outputs: [{ name: "status", bits: 2, about: "0 safe · 1 warning · 2 liquidate · 3 paused" }],
      rules: [
        { if: "!feed_fresh || !feeds_agree", then: { status: 3 }, note: "bad prices: pause" },
        { when: { ratio: [0, 11] }, then: { status: 2 }, note: "below 120%" },
        { when: { ratio: [12, 14] }, then: { status: 1 }, note: "120% to 149%" }
      ],
      otherwise: { status: 0 }
    }
  },
  {
    id: "circuit-breaker",
    category: "finance",
    title: { zh: "熔断刹车", en: "Circuit breaker" },
    sentence: {
      zh: "10 分钟内跌 10% 以上，或者预言机差得离谱，就暂停交易；跌 5% 以上、成交量暴增或预言机有偏差，就限制单笔大小。",
      en: "Pause trading on a 10%+ drop in ten minutes or a wild price-feed gap; limit order size on a 5%+ drop, a volume spike or a noticeable gap."
    },
    spec: {
      name: "Circuit breaker",
      inputs: [
        { name: "drop_pct", bits: 4, about: "price drop over the last 10 minutes, in %, 15 means 15% or more" },
        { name: "volume_spike", bits: 2, about: "0 normal … 3 extreme" },
        { name: "feed_gap", bits: 2, about: "disagreement between price feeds, 0 none … 3 wild" }
      ],
      outputs: [{ name: "mode", bits: 2, about: "0 normal · 1 limit order size · 2 pause" }],
      rules: [
        { if: "drop_pct >= 10 || feed_gap == 3", then: { mode: 2 } },
        { if: "drop_pct >= 5 || volume_spike == 3 || feed_gap == 2", then: { mode: 1 } }
      ],
      otherwise: { mode: 0 }
    }
  },
  {
    id: "vesting",
    category: "finance",
    title: { zh: "代币解锁", en: "Token vesting" },
    sentence: {
      zh: "锁 4 个季度，到期先解锁 25%，剩下 75% 在之后 12 个季度里平均解锁完。",
      en: "A one-year cliff (4 quarters) releases 25%; the other 75% unlocks evenly over the next 12 quarters."
    },
    spec: {
      name: "Token vesting",
      inputs: [{ name: "quarters", bits: 4, about: "quarters since the start, 15 means 15 or more" }],
      outputs: [{ name: "unlocked_pct", bits: 7, about: "percent unlocked, 0–100" }],
      formulas: { unlocked_pct: "quarters < 4 ? 0 : min(25 + (quarters - 4) * 75 / 12, 100)" }
    }
  },
  {
    id: "treasury",
    category: "finance",
    title: { zh: "金库支出规则", en: "Treasury spending" },
    sentence: {
      zh: "小额 2 人签字，中额 3 人，大额 5 人；用途不明的大额支出一律拒绝；紧急情况下小额 2 人签字即可。",
      en: "Small amounts need 2 signatures, medium 3, large 5; large spending with no stated purpose is always refused; in an emergency small amounts go through on 2."
    },
    spec: {
      name: "Treasury spending",
      inputs: [
        { name: "amount_tier", bits: 3, about: "0 under 1k … 7 over 1M" },
        { name: "signatures", bits: 3 },
        { name: "purpose", bits: 2, about: "0 operations · 1 grants · 2 investment · 3 other" },
        { name: "emergency", bits: 1 }
      ],
      outputs: [{ name: "decision", bits: 2, about: "0 refuse · 1 approve · 2 needs more signatures" }],
      rules: [
        { if: "emergency && amount_tier <= 2 && signatures >= 2", then: { decision: 1 }, note: "emergency, small" },
        { if: "purpose == 3 && amount_tier >= 5", then: { decision: 0 }, note: "large and no stated purpose" },
        { if: "signatures >= (amount_tier <= 1 ? 2 : amount_tier <= 4 ? 3 : 5)", then: { decision: 1 } }
      ],
      otherwise: { decision: 2 }
    }
  },
  {
    id: "fee-tiers",
    category: "finance",
    title: { zh: "手续费阶梯", en: "Fee tiers" },
    sentence: {
      zh: "基础费率 30 个基点；交易量每高一档减 3，持仓每高一档减 2，挂单再减 10，最低为 0。",
      en: "Base fee 30 bps; minus 3 per volume tier, minus 2 per holder tier, minus 10 for maker orders, never below 0."
    },
    spec: {
      name: "Fee tiers",
      inputs: [
        { name: "volume_tier", bits: 3 },
        { name: "holder_tier", bits: 2 },
        { name: "maker", bits: 1 }
      ],
      outputs: [{ name: "fee_bps", bits: 6 }],
      formulas: { fee_bps: "max(30 - volume_tier * 3 - holder_tier * 2 - (maker ? 10 : 0), 0)" }
    }
  },
  {
    id: "revenue-split",
    category: "finance",
    title: { zh: "收入分账", en: "Revenue split" },
    sentence: {
      zh: "创作者拿 60%，每高一个等级多拿 5%，平台活动期间再多 5%；有推荐人就分推荐人 10%；剩下的归平台。",
      en: "The creator gets 60%, plus 5% per creator level and 5% during a promotion; a referrer gets 10%; the platform keeps the rest."
    },
    spec: {
      name: "Revenue split",
      inputs: [
        { name: "creator_level", bits: 2 },
        { name: "promotion", bits: 1 },
        { name: "has_referrer", bits: 1 }
      ],
      outputs: [
        { name: "creator_pct", bits: 7 },
        { name: "referrer_pct", bits: 4 }
      ],
      formulas: {
        creator_pct: "60 + creator_level * 5 + (promotion ? 5 : 0)",
        referrer_pct: "has_referrer ? 10 : 0"
      }
    }
  },
  {
    id: "credit-tier",
    category: "finance",
    title: { zh: "信用档位", en: "Credit tier" },
    sentence: {
      zh: "两次及以上逾期没有额度；否则账户够老、按时还过款、还款次数多、抵押够，每满足一条升一档，每次逾期降一档，最高 3 档。",
      en: "Two or more late payments: no credit. Otherwise one tier each for an older account, past repayments, many repayments and enough collateral, minus one per late payment, up to tier 3."
    },
    spec: {
      name: "Credit tier",
      inputs: [
        { name: "account_age", bits: 3, about: "0 new … 7 several years" },
        { name: "repaid", bits: 3, about: "loans repaid on time, 7 means 7 or more" },
        { name: "late", bits: 2, about: "late payments, 3 means 3 or more" },
        { name: "collateral_tier", bits: 2 }
      ],
      outputs: [{ name: "tier", bits: 2 }],
      formulas: {
        tier: "late >= 2 ? 0 : max(0, min(3, (account_age >= 2) + (repaid >= 2) + (repaid >= 5) + (collateral_tier >= 2) - late))"
      }
    }
  },
  {
    id: "flight-insurance",
    category: "finance",
    title: { zh: "航班延误险", en: "Flight delay cover" },
    sentence: {
      zh: "延误 3 小时赔一档，6 小时赔两档，取消全赔；同一张保单已经赔过就不再赔。",
      en: "Pay tier 1 from a 3-hour delay, tier 2 from 6 hours, full on cancellation; nothing if this policy already paid."
    },
    spec: {
      name: "Flight delay cover",
      inputs: [
        { name: "delay_hours", bits: 4, about: "15 means 15 or more" },
        { name: "cancelled", bits: 1 },
        { name: "already_paid", bits: 1 }
      ],
      outputs: [{ name: "payout", bits: 2, about: "0 none · 1 small · 2 medium · 3 full" }],
      rules: [
        { when: { already_paid: 1 }, then: { payout: 0 } },
        { when: { cancelled: 1 }, then: { payout: 3 } },
        { when: { delay_hours: [6, 15] }, then: { payout: 2 } },
        { when: { delay_hours: [3, 5] }, then: { payout: 1 } }
      ],
      otherwise: { payout: 0 }
    }
  },
  {
    id: "agent-spend",
    category: "agents",
    title: { zh: "AI 花钱底线", en: "AI spending guard" },
    sentence: {
      zh: "超过今天剩余额度一律拒绝；收款方在白名单里或者人已经批准，就放行；其他情况先问人。",
      en: "Anything over today's remaining budget is refused; a known payee or a human approval lets it through; otherwise ask a human."
    },
    spec: {
      name: "AI spending guard",
      inputs: [
        { name: "amount", bits: 4, about: "in units of 10 USD, 15 means 150 or more" },
        { name: "left_today", bits: 4, about: "budget left today, same units" },
        { name: "payee_known", bits: 1 },
        { name: "human_ok", bits: 1 }
      ],
      outputs: [
        { name: "allow", bits: 1 },
        { name: "ask_human", bits: 1 }
      ],
      rules: [
        { if: "amount > left_today", then: { allow: 0, ask_human: 0 }, note: "over budget: refuse" },
        { if: "payee_known || human_ok", then: { allow: 1 } }
      ],
      otherwise: { allow: 0, ask_human: 1 }
    }
  },
  {
    id: "agent-escrow",
    category: "agents",
    title: { zh: "AI 外包验收", en: "AI job escrow" },
    sentence: {
      zh: "交付物通过检查且没超时，就把钱放给干活的 AI；超时没交付就退给雇主；有人提出争议就冻结等人裁决。",
      en: "Release payment to the worker agent when the delivery passes its checks on time; refund the client after the deadline with no delivery; freeze on a dispute."
    },
    spec: {
      name: "AI job escrow",
      inputs: [
        { name: "delivered", bits: 1 },
        { name: "checks_passed", bits: 2, about: "how many of the 3 acceptance checks passed" },
        { name: "past_deadline", bits: 1 },
        { name: "disputed", bits: 1 }
      ],
      outputs: [{ name: "action", bits: 2, about: "0 wait · 1 pay worker · 2 refund client · 3 freeze" }],
      rules: [
        { when: { disputed: 1 }, then: { action: 3 } },
        { if: "delivered && checks_passed == 3", then: { action: 1 } },
        { if: "past_deadline", then: { action: 2 } }
      ],
      otherwise: { action: 0 }
    }
  },
  {
    id: "airdrop",
    category: "access",
    title: { zh: "空投资格", en: "Airdrop eligibility" },
    sentence: {
      zh: "持有 NFT、关注或转发过、钱包不是新建的，就有资格；三样都做了且钱包超过一年再给加成；被标记两次以上的疑似小号一律没有。",
      en: "Holds the NFT, followed or reposted, and the wallet isn't brand new: eligible; all three plus a wallet over a year old: bonus; two or more sybil flags: nothing."
    },
    spec: {
      name: "Airdrop eligibility",
      inputs: [
        { name: "holds_nft", bits: 1 },
        { name: "followed", bits: 1 },
        { name: "reposted", bits: 1 },
        { name: "wallet_age", bits: 2, about: "0 under a week · 1 under a month · 2 under a year · 3 over a year" },
        { name: "sybil_flags", bits: 2 }
      ],
      outputs: [
        { name: "eligible", bits: 1 },
        { name: "bonus", bits: 1 }
      ],
      rules: [
        { when: { sybil_flags: [2, 3] }, then: { eligible: 0, bonus: 0 } },
        { if: "holds_nft && followed && reposted && wallet_age == 3", then: { eligible: 1, bonus: 1 } },
        { if: "holds_nft && (followed || reposted) && wallet_age >= 1", then: { eligible: 1 } }
      ],
      otherwise: { eligible: 0, bonus: 0 }
    }
  },
  {
    id: "vote-2-of-3",
    category: "governance",
    title: { zh: "三人投票", en: "Two of three" },
    sentence: { zh: "三个人里至少两个人同意就通过。", en: "Passes when at least two of the three agree." },
    spec: {
      name: "Two of three",
      inputs: [{ name: "alice", bits: 1 }, { name: "bob", bits: 1 }, { name: "carol", bits: 1 }],
      outputs: [{ name: "passed", bits: 1 }],
      formulas: { passed: "alice + bob + carol >= 2" }
    }
  },
  {
    id: "quorum",
    category: "governance",
    title: { zh: "法定人数投票", en: "Quorum vote" },
    sentence: { zh: "至少 6 票参与，而且赞成票多于反对票，才算通过。", en: "Passes with at least 6 votes cast and more yes than no." },
    spec: {
      name: "Quorum vote",
      inputs: [{ name: "yes", bits: 4 }, { name: "no", bits: 4 }],
      outputs: [{ name: "passed", bits: 1 }],
      formulas: { passed: "yes + no >= 6 && yes > no" }
    }
  },
  {
    id: "predation",
    category: "games",
    title: { zh: "游戏捕食", en: "Predation" },
    sentence: {
      zh: "攻击者体型加埋伏加成，大于防守者体型加护甲；成群的防守者再加 2。",
      en: "The attack lands when attacker size plus ambush beats defender size plus armour, plus 2 if the defender is in a group."
    },
    spec: {
      name: "Predation",
      inputs: [
        { name: "attacker_size", bits: 2 }, { name: "ambush", bits: 1 },
        { name: "defender_size", bits: 2 }, { name: "armor", bits: 2 }, { name: "grouped", bits: 1 }
      ],
      outputs: [{ name: "success", bits: 1 }],
      formulas: { success: "attacker_size + ambush > defender_size + armor + (grouped ? 2 : 0)" }
    }
  },
  {
    id: "compare",
    category: "basics",
    title: { zh: "比大小", en: "Compare" },
    sentence: { zh: "比较两个 0 到 15 的数：哪个大，还是一样大。", en: "Compare two numbers from 0 to 15: which is bigger, or equal." },
    spec: {
      name: "Compare",
      inputs: [{ name: "a", bits: 4 }, { name: "b", bits: 4 }],
      outputs: [{ name: "a_bigger", bits: 1 }, { name: "equal", bits: 1 }],
      formulas: { a_bigger: "a > b", equal: "a == b" }
    }
  },
  {
    id: "adder",
    category: "basics",
    title: { zh: "加法器", en: "Adder" },
    sentence: { zh: "两个 0 到 15 的数相加。", en: "Add two numbers from 0 to 15." },
    spec: {
      name: "Adder",
      inputs: [{ name: "a", bits: 4 }, { name: "b", bits: 4 }],
      outputs: [{ name: "sum", bits: 5 }],
      formulas: { sum: "a + b" }
    }
  }
];

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id);
