# 卡灵战争 · 交接说明

## 1. 项目定位
卡牌 = 可验证的 NAND 支出规则。开包抽卡 → 付费流片成 BSC 电路 NFT → AI Agent 读 NFT 里的规则守门付款。Binance Agent ID 做身份，TapeOut 电路做灵魂。
线上：https://agentid.cards （当前 v115）。Chain：BSC 主网 56。

## 2. 合约（BSC 主网 56，全部已部署）
| 合约 | 地址 | 用途 |
|---|---|---|
| 电路 NFT (ERC-721 KALC) | `0xAdfDB520db78C252382E4bCdf62692fAD453035a` | processor / circuit NFT |
| AgentPackCore | `0xEE7928436a480af5F93c3558a8Ef27588C511d7b` | 规则参数 / checkPayment |
| PublicTapeOut (v114) | `0xf86a0d9164554957bc59c91cfa46b818ebda1cee` | 公开流片 + `getMeta(tokenId)` 全量元数据 |
| RuleConfig | `0xc02722543e54f2e5fe049e6f3696c75e28b72910` | 用户签名的数字参数 `setOverride(rule,value)` |
| GuardVault | `0xa0fb1d7f76d4b1bc55a8060cdbcf773c1d8d8d3d` | 链上金库（当前未接主流程） |
| BEM | `0x5ce033B2bFCa3Af30b3e8C8457DeaF776A8b695a` | NAND 支付代币 |

`forge test` 76/76；新增 fork 实测：circuit #3 流片后 `getMeta(3).rarity = 4` ✅

## 3. 已开放 4 条规则（价格含 0.0002 BNB）
t2 白名单 4 门 $5.11 / t11 委托 4 门 $5.11 / t7 钻石手 31 门 $7.96 / t0 止损 36 门 $9.21。
规则参数**与稀有度无关**，默认 $52 / 60 分钟 / 12 小时，用户可改。
电路 NFT 元数据（稀有度、星级、来源卡、参数、印次、邀请人…）已全部上链，`getMeta()` 可读。

## 4. Agent 入口
- Skill：`https://agentid.cards/skills/agentpacks/SKILL.md`
- llms.txt / llms-full.txt：网站根目录
- 机器数据：`/api/rules.json`、`/api/circuit/index.json`、`/agent.txt`
- 正式提示词：
  ```
  先完整读 https://agentid.cards/skills/agentpacks/SKILL.md 并遵守它；
  用我钱包里实际拥有的电路 NFT 的 token ID 去读对应规则；
  读不到就从链上网表识别；仍读不到就 fail closed。
  ```
- 已验证：独立 Agent 不用静态 JSON、靠 `netlist()` vs `HOUSE_NETLIST(i)` 逐字节比对，正确认出 #1=t2、#2=t0。

## 5. 已验证流程
开包/翻卡、流片报价、我的页 NFT 列表、任意地址查询、稀有度继承、地址查询、Agent 下拉菜单、llms.txt、对抗测试（冒充 owner / 紧急退款均 ask）。

## 6. 当前待办
1. **UI/UX 重做为中世纪战士风格** → 见 `docs/UIUX-MEDIEVAL-BRIEF.md`（本次交接重点）
2. 每日 rate-up（CT Packs 第三个钩子）
3. 换真实演示截图到 `demo/` 目录
4. 跑完剩余 8 个对抗 prompt 并补进演示页
5. 链上强制拦截（接 GuardVault / `payFor()`）—— 与 Fusebox 的真正差距
6. BscScan 验证（缺 BSCSCAN_KEY）
7. DeWEB 发布 / ≥30 个真实 .ai 地址推广

## 7. 约束
- DOM id/class、函数签名、合约地址、Skill 端点不要改
- 不新增 npm 依赖；移动端可用
- 不出现「积分 / 第 0 战季」
- 演示页必须保留「不构成链上强制拦截」的诚实边界
- 部署：`scp` 到 `root@43.133.140.70:/var/www/agentpacks/`，域名 `agentid.cards`
