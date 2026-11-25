# AgentPackCore + GuardVault · 部署与验证手册（v3）

> 前置：`cd contracts && forge test` → **58/58 全绿**
> 合约：自包含单文件（零依赖 ERC-721，BscScan 单文件验证最省事）
> 编译器：solc 0.8.28 · `via_ir = true` · evm_version = cancun

---

## 0. 已部署主网（2026-11-23 · BNB Smart Chain 56）

| 合约 | 地址 | 说明 |
|---|---|---|
| 自建 Processor (circuits) | `0xAdfDB520db78C252382E4bCdf62692fAD453035a` | CPU Factory 创建，processor number **1496** |
| Transistors (NAND token 0) | `0x250cF36a4A0a09948318B74f69bba51e0d317094` | creator = 部署钱包，NAND 收入归我们 |
| AgentPackCore | `0xEe7928436A480AF5f93C3558a8Ef27588c511d7b` | 构造固化 `TAPE_PROCESSOR` + `BEM`；`buyPack` 对所有人开放 |
| GuardVault | `0xA0fb1D7F76D4b1Bc55A8060CDbcf773C1D8D8d3D` | 指向上面的新 Core |

定价：`mintPrice = 1,734,000` raw BEM = 0.01734 BEM/门 ≈ $0.167/门 → **平均 60 门 ≈ $10**；protocolFee 1e6 raw、TAPEOUT_FEE 2e14 wei、supplyCap 1e6。

**PublicTapeOut（2026-11-25 v86 重新部署）**：`0x6714b52c342e5889d35344b9bbec4a70737f2a64`（旧 `0x682de0…578c`、`0xfbe8…f62` 均已作废）。

规则与定价（按用户反馈调整）：
- **只开放 4 条规则**（四个家族各一条）：t0 止损（36 门）、t2 风控（4 门）、t7 钻石手（31 门）、t11 委托（4 门）；其余 8 条在 `quote()` 里直接 revert。
- **用户价收窄到 $5~$12**（含 0.0002 BNB ≈ $0.11 流片费）：主网实测 t2/t11 = 52,030,000 raw BEM ≈ **$5.11**，t7 = 81,631,000 raw ≈ **$7.96**，t0 = 94,636,000 raw ≈ **$9.21**。
- **NAND 收入 $0.25/门**：`target = gates × mintPrice × 1.5 + protocolFee`（主网 mintPrice = 1,734,000 raw ≈ $0.167/门，×1.5 ≈ $0.25/门）；`minBemCost = 52,030,000`、`maxBemCost = 123,700,000`。
- **差额自动进 treasury**：`tapeoutRaw()` 只把真实 NAND 成本 approve 给 transistor，用户价高出部分（含 $5 下限差额）直接 `bem.transfer(treasury, extra)`；treasury 默认部署钱包，owner 可 `setTreasury()` 改。`sweepBem()` 仅作兜底。
- owner 可用 `setPriceBounds(min,max)`、`setAllowed(rule,bool)`、`setTreasury()` 调整。

`forge test` **70/70**。前端 `app.js` 的 `ruleUSD()` 已同步；`ACTIVE_RULES=[0,2,7,11]`。

**主网实测**：`approve(0.1 BEM)` → `createCPU` → `mint(0,4)`（买 4 门 NAND）→ `processor.tapeout(t2网表,1,2)`（付 2e14 wei）→ `ownerOf(1)` = 部署钱包 → `eval(1,0x00)=0x00`；`minted` 从 0 变 4。

**关键修复（第二轮）**：官方 transistor 的 `mint()` 是 **BEM transferFrom**，不收原生 BNB；旧版 Core 给 mint 发 BNB 会 revert。现 Core 已改为：

```
tapeNandCost(cardId) → (bemAmount, gates)     // BEM 部分
tapeCost(cardId)     → (tapeoutFeeWei, gates) // BNB 部分
流程：BEM.approve(core, bemAmount) → core.tapeOut{value: tapeoutFee}(cardId)
     Core 内部 transferFrom BEM → approve transistor → mint() → tapeout() → NFT 进钱包
```

`forge test` **64/64**（新增 3 个 BEM 路径测试）。旧主网 Core `0xdc2d…2650`、`0xcCfb…9f5e` 均已作废，不要再用。

## 0b. 已部署测试网（2026-11-23 · BSC Testnet 97）

| 合约 | 地址 | 说明 |
|---|---|---|
| MockAgentIdRegistry | `0x087cca8DB0B6D1c17Ba837e2629127A2C3D3d0cF` | 已给测试地址与部署者发 .ai |
| MockTapeProcessor | `0x36b5b5b0b8a8ee405d4db1c53dac591c1f5e8ac9` | 真 NAND `eval()`，测试网先用它 |
| AgentPackCore | `0xdc2dcE427379a048280Bb43AeC5E7A302B732650` | BscScan testnet 可查 |
| GuardVault | `0xA0fb1D7F76D4b1Bc55A8060CDbcf773C1D8D8d3D` | 指向上面的新 Core |

前端已把 Core / Vault 地址预置为测试网默认值（`netId()` 默认 61）。测试地址 `0x3f665386…0108` 同时作为 PRIZE_POOL。

**链上实测记录**：`claimDailyPack → packCommit → packReveal`（开出 5 张）→ `tapeOut(#1)`（2.9e15 wei / 22 门）→ `equip(#1)` → `GuardVault.setRate(1e14) / deposit(0.05) / pay(0.01)` 成功；第 5 笔付款被拒：`Blocked("daily tx count reached")` —— 规则真的拦住了钱。

复跑命令：

```bash
export DEPLOY_PK=$(cat ../.deploy-testnet.key)
forge script script/Deploy.s.sol:DeployTestnet \
  --rpc-url https://data-seed-prebsc-1-s1.binance.org:8545 --private-key $DEPLOY_PK --broadcast
```

## 1. 测试网先行（BSC Testnet, chain 97）

```bash
# 0) 一键本地全旅程（anvil，无需任何凭据）
./run_local_e2e.sh

# 1) 部署 Mock AgentIdRegistry（仅测试网；主网用官方注册表）
forge create test/AgentPackCore.t.sol:MockAgentIdRegistry \
  --rpc-url $BSC_TESTNET_RPC --private-key $KEY --broadcast

# 给测试地址发 .ai：
cast send <MOCK_ADDR> "give(address)" <YOUR_ADDR> --rpc-url $BSC_TESTNET_RPC --private-key $KEY

# 2) 部署主合约 + 金库
forge create src/AgentPackCore.sol:AgentPackCore \
  --constructor-args <MOCK_ADDR> <PRIZE_POOL_ADDR> <TAPE_PROCESSOR_ADDR> \
  --rpc-url $BSC_TESTNET_RPC --private-key $KEY --broadcast

forge create src/GuardVault.sol:GuardVault \
  --constructor-args <CORE_ADDR> \
  --rpc-url $BSC_TESTNET_RPC --private-key $KEY --broadcast
```

全流程：`give → claimDailyPack → packCommit → (roll) → packReveal → tapeOut → equip → claimIntoPool → starUp → invite → redeemPoints → vault.deposit → vault.setRate → vault.pay`

## 2. 主网部署（BNB Smart Chain 56）

```bash
export AGENT_ID_REGISTRY=0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F
export PRIZE_POOL=0x...        # 公示奖池（建议多签）
export TAPE_PROCESSOR=0x...    # CPU Factory createCPU 自部署

forge script script/Deploy.s.sol:DeployMainnet \
  --rpc-url $BSC_RPC_URL --private-key $PRIVATE_KEY --broadcast --verify \
  --etherscan-api-key $BSCSCAN_KEY
```

> ⚠ `TAPE_PROCESSOR` 未设 = `tapeOut` 不可用、电路卡无法 `equip`（`NotTaped`）。上线前必须接好。
> ⚠ `PRIZE_POOL` 必须是公示地址，写进 Terms 页并披露。

## 3. BscScan 源码验证

```bash
forge verify-contract <CORE_ADDR> src/AgentPackCore.sol:AgentPackCore \
  --chain 56 --verifier etherscan --etherscan-api-key $BSCSCAN_KEY \
  --constructor-args $AGENT_ID_REGISTRY $PRIZE_POOL $TAPE_PROCESSOR

forge verify-contract <VAULT_ADDR> src/GuardVault.sol:GuardVault \
  --chain 56 --verifier etherscan --etherscan-api-key $BSCSCAN_KEY \
  --constructor-args <CORE_ADDR>
```

验证后必查四件事（截图进提交材料）：

1. **无 owner / 无 setter**：概率、价格、规则全部无管理员入口
2. **概率表**：`RARITY_ODDS = [464,300,150,60,20,5,1]` 公开可读
3. **官方注册表调用**：BscScan 上可见对 `0x60B9…022f` 的读取
4. **真网表**：`HOUSE_NETLIST(0)` 返回 36 门 × 7 字节；`HOUSE_NIN = [7,6,1,8,6,5,10,8,5,13,12,2]`

## 4. 前端接线清单

| 前端动作 | 主网函数 | 备注 |
|---|---|---|
| 领取免费包 | `claimDailyPack()` | 24h 冷却 |
| 买包三档 | `buyPack(tier)` | 1 / 10 / 100，单包同价 |
| 开包 | `packCommit()` + `packReveal()` | commit-reveal，下一区块出结果 |
| 流片 | `tapeOut(cardId)` | 按真门数计价，circuit NFT 进钱包 |
| 穿卡 | `equip(cardId)` / `unequip()` | 未流片 → `NotTaped` |
| 复算 | `checkPayment(...)` | view，staticcall `processor.eval` |
| 入池/退池 | `claimIntoPool()` / `leavePool()` | |
| 邀请 | `invite(inviter)` | 开满 15 包双方各得 1 包 |
| 金库 | `GuardVault.deposit / setRate / setAgent / approveNext / pay` | 规则不通过 → revert |

## 5. 提交表单回填

- [ ] `AgentPackCore` 地址（验证后）
- [ ] `GuardVault` 地址（验证后）
- [ ] 官网 URL
- [ ] Agent ID 使用说明（`HACKATHON_CHECKLIST.md` §1）
- [ ] ≥30 真实 .ai 地址（目标 80）
