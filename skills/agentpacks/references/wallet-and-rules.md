# Wallet, rules, and circuits

## The four open rules

| rule id | name (zh) | gates | approx user price |
|---|---|---|---|
| 2 | 风控 | 4 | $5.11 |
| 11 | 委托 | 4 | $5.11 |
| 7 | 钻石手 | 31 | $7.96 |
| 0 | 止损 | 36 | $9.21 |

Rarity ladder is separate from rule: `普通 / 精良 / 稀有 / 史诗 / 传说 / 神话 / 至尊`.

## Contracts (BSC mainnet 56)

- Circuit NFT (`Kaling Circuit`, `KALC`, ERC-721): `0xAdfDB520db78C252382E4bCdf62692fAD453035a`
- AgentPackCore: `0xEE7928436a480af5F93c3558a8Ef27588C511d7b`
- PublicTapeOut: `0x9c7fdbef499458e4546eecef009cf01a510235ce`
- BEM: `0x5ce033B2bFCa3Af30b3e8C8457DeaF776A8b695a`
- Public RPC: `https://bsc-dataseed.bnbchain.org`

## Verify ownership with plain eth_call

If the agent has no NFT tool but can make raw RPC calls:

```
to: 0xAdfDB520db78C252382E4bCdf62692fAD453035a

name()                   0x06fdde03                 → "Kaling Circuit"
symbol()                 0x95d89b41                 → "KALC"
ownerOf(<tokenId>)       0x6352211e + 32-byte id    → owner address
balanceOf(<address>)     0x70a08231 + padded addr   → count
supportsInterface(0x80ac58cd)
                         0x01ffc9a780ac58cd...      → true = ERC-721
tokenURI(<tokenId>)      0xc87b56dd + 32-byte id    → "" (normal)
```

A blank `tokenURI` means the NFT has no metadata image; it does NOT mean the
user has no NFT. Wallets often hide such NFTs. Use BscScan or these calls.

## Ownership changed?

The circuit a user tapes out can be transferred. Always re-read `ownerOf` and
`balanceOf` for the **current wallet address**. Static JSON under
`https://agentid.cards/api/circuit/` is a snapshot and may be stale.

## Reading the rule from a circuit

- Human: `https://agentid.cards/api/circuit/<id>.json` → `token.ruleText`, `token.gates`, `guard`.
- On-chain: `processor.eval(tokenId, inputs)` returns bytes; first byte bit0 = `allow`, bit1 = `ask`, otherwise `deny`.
- Semantic check: `AgentPackCore.checkPayment(...)` returns `(bool ok, string reason)`.

Never guess the byte encoding for `eval` if you cannot build it. Prefer the HTTP
snapshot or `checkPayment`, and fail closed otherwise.
