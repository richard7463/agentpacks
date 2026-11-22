# AgentPackCore · 部署与验证手册

> 前置：`cd hackathon/agentpacks/contracts && forge test` → **30/30 全绿**
> 合约：自包含单文件（零依赖 ERC-721，BscScan 单文件验证最省事）

---

## 1. 测试网先行（BSC Testnet, chain 97）

```bash
# 1) 部署 Mock AgentIdRegistry（仅测试网；主网用官方注册表）
forge create test/AgentPackCore.t.sol:MockAgentIdRegistry \
  --rpc-url $BSC_TESTNET_RPC --private-key $KEY --broadcast

# 给测试地址发 .ai：
cast send <MOCK_ADDR> "give(address)" <YOUR_ADDR> --rpc-url $BSC_TESTNET_RPC --private-key $KEY

# 2) 部署主合约（constructor: mock 地址 + 公示奖池地址）
forge create src/AgentPackCore.sol:AgentPackCore \
  --constructor-args <MOCK_ADDR> <PRIZE_POOL_ADDR> \
  --rpc-url $BSC_TESTNET_RPC --private-key $KEY --broadcast
```

全流程走一遍（可用 cast 或前端）：
`give → claimDailyPack → packCommit → (roll) → packReveal → claimIntoPool → equip → starUp → invite → redeemPoints`

## 2. 主网部署（BNB Smart Chain）

```bash
# constructor 参数：
#   1) 官方 Agent ID 注册表: 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F（公告给定，勿改）
#   2) prizePool: 公示奖池地址（建议多签/透明地址，写进 Terms 页并披露）
forge create src/AgentPackCore.sol:AgentPackCore \
  --constructor-args 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F <PRIZE_POOL_ADDR> \
  --rpc-url $BSC_RPC --private-key $KEY --broadcast
```

## 3. BscScan 源码验证（硬性要求）

```bash
forge verify-contract <DEPLOYED_ADDR> src/AgentPackCore.sol:AgentPackCore \
  --chain 56 --verifier etherscan --etherscan-api-key $BSCSCAN_KEY \
  --constructor-args 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F <PRIZE_POOL_ADDR>
```

验证后必查三件事（截图进提交材料）：
1. **无 owner**：合约里没有任何 admin/setter——权限披露段在文件头注释
2. **概率表**：`RARITY_ODDS` 公开可读 = [464,300,150,60,20,5,1]
3. **官方注册表调用**：BscScan 上可见 `balanceOf(0x60B9…022f)` 的读取——这就是"实际使用 Agent ID"的链上证据

## 4. 前端接线清单（game/index.html → 主网）

| 演示档按钮/动作 | 主网函数 | 备注 |
|---|---|---|
| 领取免费包 | `claimDailyPack()` | 24h 冷却；奖励包走 `pendingBonusPacks` |
| 买包三档 | `buyPack(tier)` | msg.value == TIER_PRICE[tier]，50/50 分账 |
| 开包动画 | `packCommit()` + `packReveal()` | 前端生成 salt；概率/保底由合约执行 |
| 穿卡 | `equip(cardId)` / `unequip()` | |
| 升星 | `starUp(base, fuel[])` | |
| 卖卡换分 | v1 链下积分账本（披露）→ v2 链上 | |
| 兑 SR | `redeemPoints()` | 500 分 |
| 入池/退池 | `claimIntoPool()` / `leavePool()` | |
| 邀请 | `invite(inviter)` | 开满 15 包双方各得 1 奖励包 |

## 5. 提交表单回填清单

- [ ] 主网合约地址（验证后）→ 填进 `HACKATHON_CHECKLIST.md` 与表单
- [ ] 官网 URL（game/index.html 挂域名后即为可体验产品）
- [ ] Agent ID 使用说明（`HACKATHON_CHECKLIST.md` §1 已就绪，附 `balanceOf` 调用证据链接）
- [ ] ≥30 真实 .ai 地址（目标 80）——免费包每日回访就是数据引擎
