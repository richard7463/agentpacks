# AgentPackCore + GuardVault · 部署与验证手册（v3）

> 前置：`cd contracts && forge test` → **58/58 全绿**
> 合约：自包含单文件（零依赖 ERC-721，BscScan 单文件验证最省事）
> 编译器：solc 0.8.28 · `via_ir = true` · evm_version = cancun

---

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
