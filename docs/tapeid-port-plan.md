# TapeID → Agent Packs 电路卡搬运方案

> 读完 TapeID 全源码（`packages/circuit` + `contracts/` + `apps/signer/guard.ts`）后的移植设计。
> 目标：把电路卡从「view 复算」升级成「真的 NAND 流片 NFT」——卡上的规则不只是一段参数，
> 而是一条部署在 BNB Chain TapeOut processor 上的真电路，任何人可调 `eval()`。

## 1. TapeID 已核实的事实（搬运基础）

| 事实 | 出处 |
|---|---|
| 电路 = NAND 网表，7 字节/门，`tapeout(bytes, nIn, nOut)` 流片为 NFT | `packages/circuit/src/tapeout.ts` + processor ABI |
| 每人同一套电路字节（45 门深度 18 的 agent-spend）；**预算/步长/收款名单不在电路里**，在 owner 签名卡里 | `rules.ts` — 不可变电路 + 签名配置分离 |
| 链上验证 = 字节一致 + 64 个采样 `eval()` 答案一致 + NFT owner 一致（本地全 1,024 验证） | `certify.ts` |
| 复算引擎现成：`judgeTransfers()` 把钱包真实转账逐笔喂给电路出 verdict | `rules.ts` |
| `TapeOutProcessor` **已上线 BNB Chain**（`0x6Ac1…011C`，`eval` 是免费 view） | `chain.ts` 注释 + `config/chains.json` |
| 「付款前拦截」= signer/API 的 allow/ask/deny，网络故障 fail-closed；普通钱包可绕过 | `apps/signer/src/guard.ts` |
| 原子流片 + 注册（quote 签名绑定电路字节哈希）；原子打包转售 | `TapeIDPackageCheckout.sol` / `TapeIDPackageMarket.sol` |
| spec → forge 编译管线：输入规则用中文一句话就能写成 spec，编译出网表 | `spec.ts` / `forge.ts` / `templates.ts` |

## 2. 搬进 Agent Packs 的架构（定稿版 2026-11-22）

> 与 owner 对齐的关键变更：**处理器自部署**（CPU Factory `0x6822…7e2`，BNB），
> 不借用共享 processor——NAND 铸价/tapeout 费归我们；
> **流片 = 装备门槛**：参数卡免费玩，流片后 circuit NFT 进用户钱包，
> 装备才能让 Agent/钱包结算前真的调 eval()；
> **guard 直接抄 `apps/signer/src/guard.ts`**（allow/ask/deny、fail-closed）。

```
自部署处理器（createCPU 一次 ~0.007 BNB，费用参数归我们）
        │
AgentPackCore（加 5 处）
 ├─ tapeOut(cardId) payable：买 NAND（单门自定价）→ 流片该卡规则网表
 │   → circuit NFT 铸给卡主 → card.circuitId 绑定 → 装备/转售解锁
 ├─ circuitOf(cardId) view → (ourProcessor, circuitId, nIn, nOut)
 ├─ setRuleConfig(cardId, cfg) onlyCardOwner ← 用户可编辑的数值配置（见 2.1）
 ├─ equip：kind0 卡未流片 = 仅游戏内生效；流片后 = 规则真身模式
 └─ checkPayment(...) 升级：staticcall ourProcessor.eval(circuitId, word)
     → 答案由真 NAND 门产生；eval 异常 = fail-closed（unproven → 拒绝/转人工）

guard 层（抄 TapeID apps/signer/src/guard.ts 原样逻辑）
 └─ evaluatePayment(input, apiUrl) → POST /v1/packages/:name/evaluate
     → allow 签名继续 / ask 停下问人 / deny 拒签 / 网络异常 fail-closed 不签
```

### 2.1 数值可编辑（TapeID 同款「不可变电路 + 用户配置」分离）

TapeID 的分工：电路字节全生态一套（45 门 agent-spend，谁都是同一段字节）；
**unitUsd / dailyBudgetUsd / payees 不在电路里**，在 owner 签名卡里——所以改预算
不用重新流片，改的只是配置。参数编辑器只生成 diff 预览、确认才发布（OneSentenceRuleEditor）。

我们的落地：

| 层 | 谁定 | 怎么存 |
|---|---|---|
| **电路字节**（8 条网表） | 部署时流片一次，合约固化 circuitId | processor 链上，永不可改 |
| **数值配置**（预算步长 / 冷却档位 / 收款名单 root） | **卡主自己调** | `setRuleConfig(cardId, cfg)`，`onlyCardOwner`，链上存储 |
| **数值** | 与稀有度无关，玩家自定 | 所有稀有度同规则；默认 $52/日，用户可改；稀有度只影响收集与权益 |

要点：
- `setRuleConfig` 是**卡主自己的数据**，不是协议 setter——与"合约无 owner/无 admin"原则不冲突
- 稀有度与数值解耦：稀有度只管收集价值，数值由玩家自定（实用价值）
- 前端编辑器照抄 TapeID 的模式：改动先生成 diff 预览，`确认 → 一笔交易上链`，不直接发布
- `ruleOf()` 返回 `(circuitId, 网表哈希, 用户配置, 上限)`——复算方拿到的就是完整事实

### 2.2 电路 NFT 的售卖与限量（事实核查）

- **可以售卖**：circuit NFT 是标准 ERC-721（processor `tapeout()` 铸造、`transferFrom` 过户）。
  TapeID 的 `TapeIDPackageMarket` 就是用它把「名字 + 全部电路」一笔交易打包转售的。
  我们的卡同样是 ERC-721，穿着卖掉自动脱下（已实现）
- **字节层面无法限量**：网表字节是公开的，任何人可以拿同一段字节再流片一次（新 id 新 NFT）。
  这是 TapeOut 生态的 permissionless 本质
- **限量限的是卡，不是字节**：AgentPackCore 控制铸卡节奏（免费包 1/天 + 付费包），
  正主退池 = 身份卡绝版（已实现），百连创世停售（已实现）。卡的稀缺性来自
  集合本身（稀有度/星级/绝版），不来自字节独占——和 CT Packs 的卡一个道理

## 3. 前端与测试

- **卡详情页加 TAPE-OUT 面板**：circuit id、门数、深度、BscScan 链接、
  「问它一个问题」按钮（ethers 调真 `eval()`）
- **演示档本地复算同一套字节**：把 8 条网表 hardcode 进 `app.js`（40 行 evalWord），
  与链上同源，无钱包也能展示
- **守门人**：规则栈判定文案改为「电路 eval() 的回答」
- **forge 测试**：加 MockProcessor（带 eval/netlist 的最小桩）覆盖
  电路判定 + fail-closed 分支；8 条 spec 在 CI 里全 1,024 输入验证

## 4. 不搬 / 诚实边界

- **不说「合约自动拦截所有转账」**——TapeID 自己也不这么说；拦截在 signer 层（guard 已原样抄入），普通钱包可绕过
- **电路字节无限供应，接受**：同字节谁都能再流片；价值锚在卡（稀有度/星级/绝版），不在字节独占——与 CT Packs 同理，已与 owner 确认「无所谓」
- `TapeIDRecordRegistry`（事后裁决记录）→ S1：给守门人战绩上链存证
- `PackageCheckout/Market`（原子打包转售）→ S1：连卡带包转售 + EIP-2981 版税（身份卡转售给正主抽成）
- agent-spend 的 4-bit 步长设计原样保留（预算 16 档够了，省门数）

## 5. 排期

| 步骤 | 工作量 | 依赖 |
|---|---|---|
| ① 8 条 spec 用 TapeForge 编译出网表 + 本地 1,024 验证 | 0.5 天 | 无（`packages/circuit` 直接复用） |
| ② AgentPackCore 三处改动 + 测试（MockProcessor） | 0.5 天 | 无 |
| ③ 前端 TAPE-OUT 面板 + 演示档网表 | 0.5 天 | 无 |
| ④ BSC 测试网真实流片 8 条 + 合约接线 | 0.5 天 | **`BSC_TESTNET_RPC` + 私钥（等用户）** |

①②③ 可立刻开工，④ 等部署凭据。
