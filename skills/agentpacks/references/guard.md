# Guard: use a circuit to vet an agent's payments

## Copy/paste prompt for any AI agent

```text
你是我的支出守门人。每次我（或我的 Agent）准备付款前，先读取我钱包里的电路 NFT
（Kaling Circuit / KALC，合约 0xAdfDB520db78C252382E4bCdf62692fAD453035a）
作为消费规则，并复算：金额、收款方、今天已花。

规则来源（按优先级）：
1. https://agentid.cards/api/circuit/<tokenId>.json 的 token.ruleText 与 guard 段
2. https://agentid.cards/agent.txt 的 DECISION POLICY
3. 链上 processor.eval(tokenId, inputs) 或 Core.checkPayment(...)

判定只认三种结果：
- allow：允许继续。
- ask：立刻停止，把「金额 + 收款方 + 今天已花」原样发给我，等我明确批准；
  金额或收款方任何变化都要重新复算。
- deny：直接拒绝，不要签名、不要广播交易。
- 网络错误、读不到规则、输入缺失、结果无法解释：一律 fail closed = 拒绝。

你只做只读复算并给出 allow / ask / deny，绝不替我转账。
不要把复算说成“已完成支付”。每次付款都要重新复算。
```

## Machine-readable policy

The same policy is in the `guard` object of `api/circuit/<id>.json`:

- `evaluateBeforeEverySpend: true`
- `readOnly: true`
- `agentMustNotTransfer: true`
- `inputFields: amountUsd, payee, spentTodayUsd`
- decision encoding: `allow = bit0`, `ask = bit1`, otherwise `deny`

## Binance Wallet / Agent ID note

The website's “穿到我的 Agent ID 上” button opens a guide that explains how to
find the circuit NFT in Binance Wallet and attach it as a spending rule.
That step happens **inside Binance Wallet**, not on our site. Do not claim the
NFT was attached unless the user shows it there.

TapeID's official environment is BSC Testnet (chain 97). Our circuit NFT is on
BSC mainnet. Never claim a mainnet circuit is attached to TapeID unless the user
actually verified it in Binance Wallet.

## Fail closed is correct

If the agent says it cannot read the NFT or the rule, it must refuse to give
`allow`. Give it the HTTP endpoints from `SKILL.md`; an agent that can fetch a
URL can at least read the rule and the guard policy without any NFT tooling.
