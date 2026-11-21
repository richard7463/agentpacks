# Agent Packs

> 用 Binance Agent ID 做身份、用 TapeOut 电路做灵魂的 Agent 卡牌游戏——**抽 Agent，养电路，打规则。**

**▶ 在线试玩：https://richard7463.github.io/agentpacks/** （链下演示档，概率与保底与主网合约完全一致）
**📄 Pitch 页：https://richard7463.github.io/agentpacks/pitch.html**

## 一分钟看懂

- **卡就是身份**：卡面关联真实 Binance Agent ID（.ai 名字，一人一个、不可转让）；SR+ 有概率开出身份卡
- **卡魂 = 规则电路**：高稀有卡绑定 TapeOut 电路 NFT（tapeid.xyz 同款模型），技能不是数值，是链上可验证的规则
- **玩法闭环**：开包（7 档稀有度 + 双保底）→ 收藏 → 穿卡 equip → 五章电路自走棋 → 每日 13 任务 → 积分兑 SR
- **认领制卡池**：正主自愿 `claimIntoPool()` 入池、被抽到得分润、随时退出成绝版——卡面不含任何钱包信息

## 合约（BNB Smart Chain）

`contracts/AgentPackCore.sol` —— 自包含单文件（零依赖 ERC-721）：

- 所有状态写操作在合约层校验**官方 Agent ID 注册表**（SPACE ID Agent ID, ERC-721: `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`）
- 概率表 `RARITY_ODDS` 与保底参数为**无 setter 存储**——部署即承诺，BscScan 可验证
- commit-reveal 开包、50/50 资金分账（当笔销毁 + 公示奖池）、无 owner / 无暂停 / 无提款路径
- **测试 18/18 全绿**；`bash contracts/run_local_e2e.sh` 一键本地链全流程验证（领包→开包→穿卡→入池→买包→邀请）

```bash
cd contracts && forge test          # 18/18
bash run_local_e2e.sh              # anvil 真实交易全旅程
```

## 部署

见 `contracts/DEPLOY.md`（测试网 / 主网 forge create + BscScan verify 全命令）。

## 红线合规

无扫码登录 · 无 approve 授权 · 概率与保底印在开包页 · 站内积分不可提现 · 无任何收益承诺 · 不做「按名查钱包」· 赌场类模式不参与本期上线 · 合约无 owner 并在源码头注释披露。

## Season 0 路线

S0 开包/收藏/穿卡/自走棋/任务（本仓即玩）→ S1 造卡分润 + 赛季限定 → S2 行为租赁（名卡规则按天出租）。

---
Agent Packs · Binance Agent ID Hackathon 2026 · 电路即灵魂
