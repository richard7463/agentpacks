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

## 2. 搬进 Agent Packs 的架构（Phase 1）

```
AgentPackCore（现有，加 3 处）
 ├─ constructor 加 tapeOutProcessor 地址 + 8 个 house 电路的 circuitId（部署时固化，无 setter）
 ├─ circuitOf(cardId) view → (processor, circuitId, nIn, nOut)
 └─ checkPayment(...) 升级：把支付上下文打包成输入字 → staticcall processor.eval(circuitId, word)
     → 答案由真 NAND 门产生；eval 异常 = fail-closed（unproven → 拒绝/转人工）
```

**8 张 house 电路卡各绑定一条真网表**（止损/梭哈/风控/加仓/清仓/抄底/杠杆/钻石手），
用 TapeForge 的 spec 语言重写（每个都是 4-6 bit 进 / 2 bit 出的小分类电路，参考
templates.ts 里 liquidation/circuit-breaker 的写法）。稀有度/星级不改电路，只改
**配置**（预算步长、冷却秒数档位）——和 TapeID「同字节 + 各人参数」完全同构。

一次流片 8 条电路（各约 20-60 门），NAND 成本 ≈ agent-spend 单价水平，可忽略。

## 3. 前端与测试

- **卡详情页加 TAPE-OUT 面板**：circuit id、门数、深度、BscScan 链接、
  「问它一个问题」按钮（ethers 调真 `eval()`）
- **演示档本地复算同一套字节**：把 8 条网表 hardcode 进 `app.js`（40 行 evalWord），
  与链上同源，无钱包也能展示
- **守门人**：规则栈判定文案改为「电路 eval() 的回答」
- **forge 测试**：加 MockProcessor（带 eval/netlist 的最小桩）覆盖
  电路判定 + fail-closed 分支；8 条 spec 在 CI 里全 1,024 输入验证

## 4. 不搬 / 诚实边界

- **不说「合约自动拦截所有转账」**——TapeID 自己也不这么说；拦截在 signer 层，普通钱包可绕过
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
