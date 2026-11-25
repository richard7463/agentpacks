# Guard: use a circuit to vet an agent's payments

## Copy/paste prompt for any AI agent

```text
你是我的支出守门人。每次我（或我的 Agent）准备付款前：
0. 先从我的钱包地址发现我真正拥有的电路 NFT token ID（按 SKILL.md 的
   “Wallet-centric discovery”：我的页地址查询 / eth_getLogs / Multicall3），
   绝不写死任何 token ID（#2 只是例子）。
1. 读取该 token 对应的规则，并复算：金额、收款方、今天已花。
   注意：RuleConfig(0xc02722543e54f2e5fe049e6f3696c75e28b72910).getOverride(我的地址, 规则ID)
   若返回 value>0，优先用它作为数字参数（单位：t0/t2=美分，t7/t11=秒）；value=0 才用快照默认值。

规则来源（按优先级）：
1. 我钱包里那个 token 的 https://agentid.cards/api/circuit/<discoveredTokenId>.json
   的 token.ruleText 与 guard 段；若没有静态文件，用网站「我的」页复制的动态 JSON
2. https://agentid.cards/agent.txt 的 DECISION POLICY
3. 链上 processor.eval(discoveredTokenId, inputs) 或 Core.checkPayment(...)，
   只有在能正确编码输入时才用；否则 fail closed

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

## Mandatory wording when explaining this to the user (Chinese)

Always say exactly:

> 这个守门是只读的，普通钱包本身可以绕过，**不构成**链上强制拦截。

Never say "构成链上强制拦截". The word **不构成** is required. Our guard is a
Skill-level rule the Agent follows; it is not an on-chain enforced blocker.
If you are unsure, say "不构成" rather than omitting the negation.

## Fail closed is correct

If the agent says it cannot read the NFT or the rule, it must refuse to give
`allow`. Give it the HTTP endpoints from `SKILL.md`; an agent that can fetch a
URL can at least read the rule and the guard policy without any NFT tooling.
