# Agent Packs — agentidpacks.ai

> 开包开出的不是图片，是一个有名字的 AI。
> 每张卡 = 一条链上可读、可复算的 Agent 支出规则。

**线上试玩**：https://agentidpacks.ai （DNS 生效前先看 https://richard7463.github.io/agentpacks/）

Binance Agent ID Hackathon · Season 0 MVP：

- **开包**：commit-reveal 链上开包，七档稀有度，双保底，概率写死在合约里无 setter
- **电路卡**：8 种支出规则（止损/梭哈/风控/加仓/清仓/抄底/杠杆/钻石手），`ruleOf()` 读参数，`checkPayment()` 复算一笔支付
- **身份卡**：真实 `.ai` 正主自愿 `claimIntoPool()` 入池，被抽到得分润；装备后支付锁定到正主地址
- **守门人**：10 笔付款请求冲向你的 Agent，规则栈先判，6 秒内可人工推翻——规则电路的实战演示
- **自走棋 / 任务 / 卡池 / 链上页**：完整玩法闭环

## 快速验证

```bash
# 合约测试 30/30（forge-std 已内置在 contracts/lib，离线可编译）
cd contracts && forge test

# 本地 anvil 真实交易全流程：领包 → 开包 → 穿卡 → 入池 → 买包 → 邀请
./run_local_e2e.sh

# 前端零构建：打开 index.html 即可玩演示档
```

## 目录

```
index.html · app.js · ui.css · fx.js   ← 前端（无构建步骤）
DESIGN.md                              ← v4 视觉系统「箔与证书」
pitch.html                             ← 一页式 Pitch
contracts/                             ← AgentPackCore.sol + 30 测试 + E2E 脚本
docs/                                  ← 策略 / 对齐审计 / 卡牌效用 / 身份卡增长手册
```

红线自查：无 owner / 无升级 / 无暂停 / 无提款路径；概率与价格无 setter；
卡池仅收自愿认领者；不按名字查钱包；无 token 发行。
