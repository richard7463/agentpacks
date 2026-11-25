# Web actions on agentid.cards

Use these only with a browser tool the agent actually has. `selector` values are
stable CSS selectors from the live site. Take a fresh snapshot after any click
because refs go stale.

## Open a pack (抽卡 / 刮卡)

1. `navigate` to `https://agentid.cards/`.
2. If the user has no packs, go to 补给 (`[data-v="shop"]`) and click `[data-buy="0"]` for 1 free demo pack.
3. Click `#bOpen1` (开 1 包) or `#bLandOpen` (free pack from landing page).
4. The overlay opens with `#bOpenIt` (撕开卡包). Click it.
5. Cards appear as `.slot`. Click `#bAll` (全部翻开) to flip/scratch all at once, or click each `.slot`.
6. Click `#bDone` (收进收藏). The cards are now in the local collection.

Notes:
- Pack contents are demo data stored in `localStorage` (`apacks_v5`).
- A circuit card gets a small `⚡ 流片` button (`.pkt`) with `data-rule` = rule index.
- The first pack guarantees a high-rarity card.

## Collection / read a card

1. Click nav `[data-v="cards"]` (收藏).
2. Click a card tile (`.cg` / card element) → detail modal `#mmodal`.
3. The modal shows: rarity (Chinese names 普通/精良/稀有/史诗/传说/神话/至尊), ATK/DEF/RAT, rule family, rule text, and the tapeout panel.
4. To close: `#bClose`-style close on overlay, or click outside `#mmodal`.

Chinese rarity ladder:
`普通 Common · 精良 Uncommon · 稀有 Rare · 史诗 Epic · 传说 Legendary · 神话 Mythic · 至尊 Ultimate`.

## Tapeout (流片 — SPENDS BEM + BNB)

There are three entry points; all end in the same on-chain result.

### A. From a pack result
After flipping, each circuit card has `.pkt` with `data-rule`. Click it.
The result banner is `#pktMsg`.

### B. From card detail
In `#mmodal`, click `#mTapeChain` (直接流片).
Price is shown in `#mTapePrice` and `#chainTapeOut`.

### C. From the Lab (no card needed)
1. Click nav `[data-v="gate"]` (实验室).
2. In section ⑤, choose a rule in `#pubRule`. Only 4 options exist:
   - `2` 风控 (4 gates, ~$5.11)
   - `11` 委托 (4 gates, ~$5.11)
   - `7` 钻石手 (31 gates, ~$7.96)
   - `0` 止损 (36 gates, ~$9.21)
3. Read `#pubPrice`, then click `#bPubTape`.

### Requirements and confirmation
- User wallet must hold at least the quoted BEM (e.g. 0.5203 BEM for a 4-gate card) and 0.0002 BNB.
- Show the price and get explicit confirmation before clicking.
- Success shows `circuit #N` + BscScan link. Failure shows a human-readable reason.
- The NFT is minted to the connected wallet automatically.

## Profile / my circuits

1. Click top-right `#bMeEntry` (我的).
2. Connect the browser wallet with `#bMeConnect` if needed. **Use the address that actually owns the NFT.**
3. `#meBox` lists each owned circuit: `#id`, rule name, gates, BscScan link.
4. A dynamic verification block is shown with JSON and three copy buttons:
   - `#meCopyVerify` — verification prompt for an agent that can call `eth_call`
   - `#meCopyGuard` — short guard prompt
   - `#meCopyUrl` — links to `agent.txt` and `api/circuit/<id>.json`

## “Wear / equip on my Agent ID”

Clicking `穿到我的 Agent ID 上` in card detail opens `#useBox`, a guide with:
- steps for Binance Wallet → NFT / Agent ID → Attach Circuit,
- a copyable agent prompt (`#ubPrompt`, `#ubCopy`),
- a button `#ubDone` to mark the card as equipped in the local demo.

This is guidance only; it does not move funds or attach an NFT by itself.

## Common mistakes

- Looking at the wrong wallet address. Check `ownerOf(<id>)` before saying the user has no NFT.
- Using a market-data API for KALC. KALC is an ERC-721 collection; there is no ticker/price feed.
- Assuming a blank NFT image means no NFT. `tokenURI` is deliberately empty.
- Claiming a read-only `eval`/`checkPayment` result means a payment happened.
