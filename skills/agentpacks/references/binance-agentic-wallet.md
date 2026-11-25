# Binance Agentic Wallet on BSC

Binance Agentic Wallet supports **BNB Smart Chain, chainId 56** at launch — no
chain migration needed. This reference explains setup and how our Skill plugs in.

## Setup (human does the App steps; agent does the CLI steps)

1. Prerequisites: Node.js 18+, a Binance account, and an MPC Wallet created in the Binance App.
2. Install the Binance wallet skill:
   ```bash
   npx skills add binance/binance-skills-hub/skills/binance-web3/binance-agentic-wallet
   ```
3. Say: `Create my Binance Agentic Wallet`. Open the link on mobile or scan the QR,
   agree to "Secure Auto Sign", tap **Create Agentic Wallet**.
4. Say: `Sign in to Binance Agentic Wallet`. Scan the QR, **verify the 6-character
   pairing code**, accept the three security checks, confirm.
5. Verify with `baw wallet settings --json` (read-only): confirm the BSC address,
   daily limit, token whitelist and address-book restrictions.
6. Then give the agent our skill: `https://agentid.cards/skills/agentpacks/SKILL.md`.

## What the agent can do with our Skill (no extra contracts)

- Discover its own circuit NFT token IDs from its BSC address using the main Skill's
  "Wallet-centric discovery" (site 「我的」 address query, `eth_getLogs`, or Multicall3 ownerOf).
- Read the corresponding rule and price from `api/circuit/<discoveredTokenId>.json`
  or the dynamic JSON copied from the site, then apply `guard.md` to each payment.
- Return `allow` / `ask` / `deny` with fail-closed behavior.

## Binance-side constraints (separate from our rules)

- Default capabilities are swap / transfer / limit order / prediction market / DeFi.
  Arbitrary contract calls require **Developer Mode**, enabled only in the Binance App,
  with its own 24h quota, 7-day expiry, preview → confirm → execute flow.
- Transfers are restricted to addresses in the Binance App Address Book.
- Daily limits and token whitelists are enforced by Binance, not by our circuit.

## Honest boundary (important)

The current integration is **Skill-level rule execution**: the agent reads the rule
and is instructed to follow it. It is **not** chain-level enforcement — if the agent
uses Binance's built-in transfer/swap to bypass the Skill, our circuit cannot stop it.
Do not claim "every payment must pass our circuit" unless an on-chain guard is added
in a later version.

When demoing, say clearly: "规则由 Agent 按 Skill 执行；币安自身的限额/白名单是另一层保护。"
