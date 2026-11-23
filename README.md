# 卡灵战争 · Agent Packs — agentid.cards

> 你抽到的不是英雄，是一条规则。
> 每张卡 = 一条链上可读、可复算的 NAND 支出规则，流片后成为你钱包里的电路 NFT。

**线上试玩**：https://agentid.cards （HTTPS · 雅加达直连）
**世界观**：https://agentid.cards/story.html ｜ **English**：https://agentid.cards/en/

Binance Agent ID Hackathon · Season 0：

- **开包**：commit-reveal 链上开包，七档稀有度，概率写死在合约里无 setter
- **12 种电路卡**：止损 / 梭哈 / 白名单 / 加仓 / 清仓 / 抄底 / 杠杆 / 钻石手 / 封控 / 双签 / 会签 / 委托
- **真 NAND 网表**：4 → 189 门，全输入穷举验证（`tools/mint12.mjs`）
- **流片 tapeOut**：按真门数买 NAND，电路 NFT 进钱包、可转售；未流片不能装备
- **判定在电路里**：`checkPayment` → `staticcall processor.eval()`，读不到就 fail-closed
- **GuardVault**：`pay()` 先问电路再转账，规则不通过直接 revert —— 卡真的能挡住钱
- **身份卡**：真实 `.ai` 正主自愿入池，被抽到得分润；装备后支付锁定到正主地址
- **实验室**：11 门电路剧场 + 10 笔实战守门 + 上链复算，无需钱包也能玩
- **分享**：28 组 OG 落地页，X 自动渲染卡图，分享 +1 包/天

## 快速验证

```bash
# 合约测试 58/58
cd contracts && forge test

# 本地 anvil 全旅程：领包 → 开包 → 流片 → 穿卡 → 入池 → 买包 → 邀请
./run_local_e2e.sh

# 复现 12 条真网表（穷举验证）
cd tools && node mint12.mjs

# 录制产品实录（需 playwright）
python3 tools/record_demo.py
```

## 目录

```
index.html · app.js · ui.css · fx.js   ← 游戏（无构建步骤，v58）
story.html                             ← 世界观（六章）
terms.html                             ← 服务条款与免责声明
pitch.html                             ← 一页式 Pitch
en/                                    ← English landing / story / lab
contracts/                             ← AgentPackCore + GuardVault + 58 测试 + E2E
tools/                                 ← mint12 网表铸造器 · record_demo
docs/                                  ← 品牌 / 世界观 / 经济 / 四家族 / 提示词
faces/ · heroes/ · og/ · c/            ← 名人照片 / 英雄立绘 / OG 图 / 分享落地页
```

红线自查：无 token 发行 / 无赌场模式 / 无 owner 提款路径 / 概率与价格无 setter /
卡池仅收自愿认领者 / 不按名字查钱包。
