# 卡灵战争 · 交接说明

## 1. 项目定位
卡牌 = 可验证的 NAND 支出规则。开包抽卡 → 付费流片成 BSC 电路 NFT → AI Agent 读 NFT 里的规则守门付款。Binance Agent ID 做身份，TapeOut 电路做灵魂。
线上：https://agentid.cards （线上 v115；本包 v116 = 中世纪 UI 重做，待部署）。Chain：BSC 主网 56。

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
1. ~~UI/UX 重做为中世纪战士风格~~ → **v116 已完成**，见下方 §8 与 `DESIGN.md`
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

## 8. v116 变更记录（中世纪 UI 重做）
- `ui.css`：`:root` 换成暗金 token；文件末尾追加「v5 铁与羊皮纸」覆盖层（石碑面板、雕刻金属按钮、七种材质卡框、纹章角标、羊皮纸规则卷轴、古地图 + 骑士剪影 + 火把落地页、锻造炉实验室、骑士档案「我的」）。旧霓虹色字面量已统一替换。
- `app.js`：`RCOL` 改材质色，新增 `MAT`（材质名）；`packArt` 改成皮革蜡封包（去掉「第 0 季」）；`SFX` 换音色并新增 `SFX.draw`；收藏按稀有度排序时按材质分栏（新增 `.armory-h` 标题行，不影响卡片节点）；赔率图例加材质名；`artSVG` 兜底徽记改成盾 + 剑；流片按钮 ⚡ → ⚒。
- `app.js` 顺手修了 v115 就有的报错：打开**身份卡**详情时 `autoCardQuote` 写空节点（`cto` 为 null）抛 TypeError。
- **音效 v5.1**：`SFX` 整套换成开卡包手感（撕箔、发牌落桌、翻面脆响、稀有度铃音琶音、收牌洗牌声），新增 `SFX.packIn / pop / grain / collect`；开包、撕缝线、收进收藏都已接上；`beep()` 签名不变，音色从方波改柔和。离线渲染峰值 ≤ 0.7，无削波。
- `fx.js`：WebGL 着色器改古金光泽；撕包时蜡屑 / 火星粒子；稀有翻卡金粒子聚拢 + 爆开（`fxBurst / fxConverge` 首次真正接上，并补了 `.fx-layer` 样式）。
- `index.html`：标题改为「卡是武器，电路是灵魂，誓约焊死在链上」；字体换 Cinzel + Noto Serif SC；撕包文案改「蜡封 / 缝线」；删掉自走棋文案里的「30 分」（积分概念）；版本号 v116。
- `skill.html / agent-wallet.html / demo.html`：古书页 hero + 石碑卡片 + 传令卷轴；演示页「不构成链上强制拦截」保留，并改成红色蜡印标签更醒目。
- 未改：`contracts/`、`api/`、`skills/`、`c/`、`en/`、`story.html`、`pitch.html`（这些页面不加载 `ui.css`，仍是旧风格，如需统一另开任务）。

### 验收自查
- 所有页面的 id / class、`app.js / fx.js` 函数签名与 v115 逐一比对：无缺失。
- 无头 Chrome（桌面 1440 + 手机 390）跑过：开包 → 撕开 → 全部翻开 → 收进收藏 → 各 Tab → 我的 → 卡牌详情 → Agent ▾ 菜单；普通与 reduced-motion 两种模式均无 JS 报错。
- `forge test`：本次没有改合约；交接环境里没有 foundry，未重跑（应仍为 76/76）。
- `deweb/site/` 是旧版镜像：部署 DeWEB 前需重跑 `python3 tools/build_deweb.py`。

### 部署
`ui.css app.js fx.js index.html skill.html agent-wallet.html demo.html DESIGN.md HANDOFF.md` scp 到 `/var/www/agentpacks/`（引用已改 `?v=116`）。
