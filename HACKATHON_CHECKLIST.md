# 卡灵战争 · Agent Packs — 黑客松提交清单（v3 · 2026-11-23）

> 截止 **2026-12-09 16:00（UTC+8）**。目标：真实 Agent ID 交互地址 ≥ 80（门槛 30），同时把"规则可验证"讲成技术差异点。

---

## 0. 一句话

**你抽到的不是英雄，是一条规则。** 12 条 NAND 电路流片在 BNB Chain 上，每张卡替持有 Agent ID 的真人守住 AI 的每一笔付款——判定从门电路里读出来，任何人可复算。

- 官网：**https://agentid.cards**
- 世界观：https://agentid.cards/story.html
- 英文站：https://agentid.cards/en/
- Pitch：https://agentid.cards/pitch.html
- 仓库：https://github.com/richard7463/agentpacks

---

## 1. 提交表单字段

| 字段 | 内容 |
|---|---|
| 项目名称 | **卡灵战争（Agent Packs）** |
| 官网 | https://agentid.cards |
| 合约 | Core（测试网）：`0xdc2dcE427379a048280Bb43AeC5E7A302B732650`<br>Vault（测试网）：`0x43AfFA20eAC55aAFFD8aB7B90729413d6aDCBc3A`<br>主网：`[部署后回填]` |
| 链 | BNB Smart Chain 56（测试网 97） |
| 开源 | MIT，BscScan 已验证源码 |

**Agent ID 使用说明（表单粘贴版）：**

> 卡灵战争把 Binance Agent ID 做成卡牌的身份本体。持有 .ai 的地址才能领每日免费包（`claimDailyPack`）与购买卡包（`buyPack`），合约直接校验官方注册表 `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`。抽到的电路卡经 `tapeOut` 流片成链上电路 NFT，`equip` 后绑定到该 Agent ID（`activeCircuit[agent]`）；任何支付方可调用 `checkPayment` 从 NAND 电路得到放行/拦截判定。`GuardVault` 让规则真正拦住资金：规则不通过则交易 revert。我们不提供按名字查询他人钱包或资产的功能，身份只用于权益归属与卡面署名。

---

## 2. 技术验证（全部可复现）

| 项 | 数字 / 状态 | 证据 |
|---|---|---|
| 规则数 | 12（kind 0）+ 身份卡（kind 1） | `AgentPackCore.sol` 常量 |
| 真 NAND 网表 | 12 条，4 → 189 门 | `tools/netlists12.json` |
| 全输入穷举 | 2 → 8,192 例/条，全部通过 | `tools/mint12.mjs` |
| 合约测试 | **58 / 58** | `forge test`（Core 42 + Vault 16） |
| 本地 E2E | 全绿 | `contracts/run_local_e2e.sh` |
| 判定路径 | `checkPayment → staticcall processor.eval` | fail-closed |
| 前端 | 6 tab + 实验室 + 世界观 + EN | v58 已上线 |
| OG 分享 | 28 组落地页 + 1200×630 图 | Twitterbot 实测抓取 |

---

## 3. 九条安全红线对照

| # | 红线 | 对照 |
|---|---|---|
| 1 | 不扫码登录 / 不存会话 | 纯前端钱包直连，无后端会话 ✅ |
| 2 | 不绕过用户确认 | 买包 / 开包 / 流片 / 付款每笔钱包确认 ✅ |
| 3 | 不无感转走 / 无限授权 | 无 approve；BNB 直接支付；GuardVault 只能由本人或授权 agent 发起 ✅ |
| 4 | 开源 + 披露权限 | MIT；无 owner 提款路径；奖池地址公开；GuardVault 无管理员 ✅ |
| 5 | 不冒用币安品牌 | 名称 / 域名零品牌词 ✅ |
| 6 | 不收集助记词 / 私钥 | ✅ |
| 7 | 不承诺收益 | 无 token、无年化；积分不可提现 ✅ |
| 8 | 风险提示 | 开包页概率公示 + `/terms.html` 条款与免责声明 ✅ |
| 9 | Agent ID ≠ 查钱包工具 | 仅校验"是否持有"，仅用于署名与权益 ✅ |

---

## 4. 主网部署（等凭据）

需要用户提供：

```bash
export BSC_RPC_URL=...          # 主网 RPC
export PRIVATE_KEY=...          # 部署私钥（建议新钱包，只放部署 gas）
export BSCSCAN_KEY=...          # 合约开源验证
export PRIZE_POOL=0x...         # 公示奖池（建议多签）
export TAPE_PROCESSOR=0x...     # CPU Factory createCPU 自部署的处理器
```

执行：

```bash
cd contracts
forge script script/Deploy.s.sol:DeployMainnet \
  --rpc-url $BSC_RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
```

部署后：

1. 把 `AgentPackCore` 与 `GuardVault` 地址写进前端（当前支持 localStorage，正式版应硬编码默认值）。
2. 用 `createCPU` 自建处理器，写入 `TAPE_PROCESSOR`，跑一遍 12 条网表流片。
3. 主网实测：领包 → 开包 → 流片 → 穿卡 → GuardVault 付款（成功 + 被拦各一笔）。
4. BscScan 源码验证（MIT）。

---

## 5. 数据冲刺（目标 ≥80 个 .ai 地址）

| 机制 | 作用 |
|---|---|
| 每日免费包 | 每个 .ai 每天一笔低成本 tx，交互地址 × 留存天数 |
| 分享 +1 包/天 | OG 卡图直接进 X 时间线，点击回站 |
| 邀请 | 开满 15 包双方结算奖励包 |
| 名人卡 | 每包必出 1 张，抽到即可晒 |
| 实验室 | 无需钱包也能玩，降低首访门槛 |
| 渠道 | 黑客松同行、CT 卡包玩家、币安钱包社区 |

**纪律**：不批量注册、不机械互刷。

---

## 6. 提交前 48 小时

- [x] 测试网部署（Core/Vault/Mock registry+processor）+ 链上全流程实测
- [ ] 主网部署 + BscScan 验证
- [ ] 处理器 `createCPU` + 12 条网表流片
- [ ] 主网三笔实测（领包 / 买包 / GuardVault 付款）
- [ ] 前端默认合约地址硬编码 + `?v=59`
- [ ] ≥30 真实 .ai 地址（目标 80）
- [x] demo 提交视频（`demo/kaling-demo-90s.mp4`，70s：立绘片头 → 44s 产品实录 → 落款片尾；合成脚本 `tools/make_demo.py`）
- [ ] 表单四要素填好，12-05 前早交
- [ ] 确认独立队伍身份（一队一项目）

---

## 7. 已知缺口

| 缺口 | 影响 | 计划 |
|---|---|---|
| 普通手机浏览器钱包 | 手机端连接 | ✅ 改用 **Privy**（X / 邮箱登录 → BNB Chain 嵌入式钱包），已打包 `privy-widget.js`；⚠ 需在 Privy 后台把 `agentid.cards` 加进 Allowed domains |
| 游戏内英文 | 主界面 | ✅ 已上线中/EN 切换（`i18n.js`，主要 UI 全覆盖） |
| 主网未部署 | 无法展示真实 tx | 等凭据 |
| demo 终版未合成 | 只有 44s 产品实录 | 等 AI《守门之夜》片段，合成 60–90s |

## 8. DeWEB 链上版（已准备）

- `python3 tools/build_deweb.py` → `deweb/site/` + `deweb/manifest.json`（116 文件 / 10.69 MB，HTML/CSS 链外引用 0）
- `node tools/publish_deweb.mjs --container ... --pk ... --name "<id>.<cpu>.tape"` 发布并激活
- 详见 `deweb/README.md`；需主网 circuit NFT + 已开通 container
