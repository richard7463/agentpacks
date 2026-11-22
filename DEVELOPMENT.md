# Agent Packs · 开发文档（Season 0 MVP + 长线架构）

> 一句话定位：**用 Binance Agent ID 做身份，用 TapeOut 电路做灵魂，做成可开包、可对战、可自己造卡的 Agent 卡牌游戏。**
> 本文为可执行开发文档：18 天黑客松版（Season 0）+ 后续赛季架构。联动细节（检察官/节点加成等）归档在 §8 Backlog，不占主体。

---

## 0. 18 天最小切法（最重要的一节）

**Season 0 只做四件事，其余全部砍掉：**

| 做 | 不做（推后） |
|---|---|
| ✅ 开包（7 档稀有度 + 公开概率 + 保底） | ❌ 赌场模式（赌博敏感，S3 再评估） |
| ✅ 每日免费包（.ai 校验，24h 冷却） | ❌ 玩家造卡（S1） |
| ✅ Agent ID 认领自己的卡 | ❌ TapeOut 真电路执行（S1，先用预制技能映射表） |
| ✅ 自走棋 lite（3 卡自动战斗，预制技能） | ❌ 二级市场（S3） |
| ✅ 邀请裂变（开满 15 包算有效邀请） | ❌ 积分上链（v1 链下账本+披露） |

**为什么这样砍**：黑客松要的不是功能全，是「上线 + ≥30 个 Agent ID 地址 + 高频交互」。每日免费包是全盘最重的一颗棋：**它让每个 .ai 用户每天回来签一笔便宜交易**——领航奖的交互地址数和交易笔数同时被喂养。

---

## 1. 系统架构

```
┌────────────────────────────────────────────────┐
│ 前端（静态站/Next）：开包页 · 收藏册 · 认领 · 对战场 │
├────────────────────────────────────────────────┤
│ 合约层（BNB Smart Chain，BscScan 验证开源）        │
│  AgentPackCore：packs / cards(ERC-721) / 邀请     │
│  ├─ 官方 Agent ID 注册表校验（0x60B9…022f）       │
│  ├─ 概率表 + 保底计数（链上常量，不可改）          │
│  └─ 升星（销毁重复卡） · 认领 · 每日领取           │
├────────────────────────────────────────────────┤
│ 链下（客户端，可复算）                            │
│  开包随机（commit-reveal）· 自走棋模拟器 · 积分账本 │
│  技能映射表：circuitId → 技能逻辑（S1 换真电路 eval）│
└────────────────────────────────────────────────┘
```

## 2. 核心合约接口草图（Solidity）

```solidity
interface IAgentIdRegistry { function balanceOf(address) external view returns (uint256); }

contract AgentPackCore is ERC721 {
    IAgentIdRegistry public immutable agentId;   // 官方注册表
    address public constant BURN = 0x...dEaD;
    uint256 public constant PACK_SIZE = 5;

    // 概率表（链上常量 = 公开且不可改）
    uint16[7] public RARITY_ODDS = [464, 300, 150, 60, 20, 5, 1]; // C,UC,R,SR,SSR,UR,LR ‰

    // ── 免费包：每日一次，必须持有 Agent ID ──
    function claimDailyPack() external;               // .ai 校验 + 24h 冷却

    // ── 付费包（BNB，全额去向公示：销毁 / 奖池分账，Terms 页写死）──
    function buyPack(uint8 tier) external payable;    // 三档 = 单包(1)/十连(10)/百连(100)，单包价统一 0.002 BNB

    // ── 开包：commit-reveal 两段式 ──
    function openCommit(uint256 packId, bytes32 commit) external;   // 存哈希承诺
    function openReveal(uint256 packId, bytes32 salt) external;     // 用未来 blockhash+salt 定档

    // ── 认领：卡面关联你的 .ai ──
    function claimAgentCard(uint256 cardId) external;  // .ai 校验

    // ── 邀请：被邀请人开满 15 包 → 双方各得奖励包 ──
    function invite(address invitee) external;
    event EffectiveInvite(address indexed inviter, address indexed invitee);

    // ── 升星：销毁重复卡 ──
    function starUp(uint256 baseCardId, uint256[] calldata fuelCards) external;

    // ── 认领进卡池：正主自愿 opt-in（短 ID 卡的唯一合法来源）──
    function claimIntoPool() external;   // .ai 校验；身份入池，被抽到即分润
    function leavePool() external;       // 退出：已流通卡停发进入"绝版"状态

    // ── 流片：参数卡 → 真身 circuit NFT（docs/economy.md 三重收入的第二重）──
    function tapeOut(uint256 cardId) external payable; // 买 NAND 逐门烧 → circuit NFT 归卡主，可转售
    function tapeCost(uint256 cardId) external view returns (uint256 cost, uint256 gates);
    mapping(uint256 => uint256) public cardCircuit;    // 卡 → circuit NFT（0 = 未流片）

    function equip(uint256 cardId) external;      // .ai 校验；电路卡须已流片（NotTaped）
    function unequip() external;
    mapping(address => uint256) public activeCircuit; // 我的 Agent 当前穿哪张卡

    // ── 卡的实际作用：规则电路可读、可复算（view，任何人可调）──
    function ruleOf(uint256 cardId) external view returns (uint8 ruleType, uint256 p1, uint256 p2);
    function equippedRule(address agent) external view returns (uint256 cardId, uint8 ruleType, uint256 p1, uint256 p2);
    function checkPayment(address agent, uint256 amountCents, address payee, uint256 spentTodayCents,
                          uint16 txCountToday, uint64 lastPaymentAt, bool humanApproved)
                          external view returns (bool ok, string reason);
}
```

**关键设计说明**
- **随机性**：commit-reveal（开包先存哈希承诺，下一区块 hash + 用户 salt 决定卡档）。披露：blockhash 存在理论可操纵性，**娱乐卡牌场景可接受**；若未来高价值分配改 VRF。
- **保底**：v1 链下计数（新号首包第 5 张必 SSR；每 10 包保底 SR），计数与结果全部写入公开日志可审计；v2 迁链上。
- **无 owner 路径**：不设 admin 提款；付费 BNB 按公开规则分账（销毁 + 赛季奖池），红线 4 披露段照此写。

## 2.5 卡的实际作用：一条能复算的 Agent 规则（已实现）

> 对标 tapeid.xyz 的 rule certificate：**规则不阻止支付，它让「这个 Agent 有没有守约」变成任何人都能验证的事实。**
> Packs 把同一套思路做成卡：抽到卡 = 抽到一条支出规则；equip 后规则跟着 Agent ID 走。

`ruleOf(cardId)` 从 `(kind, ref, rarity, star)` 直接算出参数（无额外存储、无 admin 改参数）；`checkPayment(...)` 用同一套参数复算一笔支付。金额单位统一为美分。

| # | 卡 | 规则 | 参数（随稀有度/星级放大） |
|---|---|---|---|
| 0 | 止损电路 | 每日支出上限 | `$20 × (100 + rarity×40 + star×20)%` |
| 1 | 梭哈电路 | 单笔上限 | `$50 × mult` |
| 2 | 风控电路 | 只付给持有 Agent ID 的地址 | 调用官方注册表 `balanceOf(payee) > 0` |
| 3 | 加仓电路 | 当日额度随成功笔数增长 | `$30 起，+2%/笔` |
| 4 | 清仓电路 | 每日笔数上限 | `3 + rarity/2 + star` |
| 5 | 抄底电路 | 小额免人工确认 | `$5 × mult` 以内直接放行 |
| 6 | 杠杆电路 | 高额度 + 人工闸门 | `$100 × mult`，超过一半需人工 |
| 7 | 钻石手电路 | 两笔支付冷却 | `3600 - rarity×300 - star×120` 秒，最低 300 |
| 8 | 身份卡 | 只付给这张卡的正主 | `payee == pool[ref].agent` |

**诚实边界**（与 tapeid.xyz 一致）：
- 这是 **view 复算**，不是钱包级拦截；调用方提供当日流水（已花/笔数/上一笔时间），任何人可重放。
- 不做「余额托管」，不碰用户资金，合约仍无 owner / 无提款路径。
- 前端演示档用同一套参数在本地复算；链上页连钱包后直接调 `equippedRule()` / `checkPayment()`。
- 游戏层（自走棋）复用同一张卡的技能，但**卡的价值主张是规则，不是战力**。

## 3. 数据模型

```
Card { uint256 id; uint8 rarity(0-6); string agentName; uint256 circuitId; uint8 star; uint256 creatorAgentId; }
Pack { uint256 id; uint8 tier; address owner; uint64 openedAt; bool opened; }
Player { address addr; uint64 lastDailyClaim; uint256 openedPacks; mapping(uint256=>uint256) cardBalances; uint256 points; uint256 activeCircuitId; }
```

## 4. 概率与保底（产品页公开披露版）

| 档位 | C | UC | R | SR | SSR | UR | LR |
|---|---|---|---|---|---|---|---|
| 概率 | 46.4% | 30% | 15% | 6% | 2% | 0.5% | 0.1% |

- 新号首包第 5 张**必出 SSR**；每 10 个免费包**保底 SR**
- 付费档位：单包 0.002 BNB · 十连 0.02（10 包）· 百连 0.2（100 包）——单包价统一 0.002 BNB，量涨价不涨；合约 `TIER_QTY=[1,10,100]` 与 UI 逐字一致（数字沿用 CT Packs 已验证的定价心智）
- **积分不可提现**、无任何收益话术

## 5. Agent ID 强制使用的流程清单（提交材料用）

1. `claimDailyPack` —— 每日免费包，合约校验官方 ERC-721 注册表
2. `claimAgentCard` —— 认领卡面身份
3. `invite` 奖励结算 —— 双方均为 .ai 持有者
4. （S1）`createCard` 造卡 —— 设计者身份 + 分润归 .ai 名下

## 6. 18 天排期（若立项）

```
D1–D3   合约（Foundry + mock 注册表）→ 测试网全流程
D3–D4   主网部署 + BscScan 验证 + 概率披露页
D4–D7   前端：开包动画 + 收藏册 + 认领 + 每日领取
D8–D11  自走棋 lite（3 卡自动战斗，预制技能表）+ 邀请系统
D12–D14 打磨 + X 推广 + ≥80 地址冲刺
D15     提交表单早交（此后数据继续累计）
D16–D18 日常运营 + 免费包回访维持
```

## 7. 风险与红线自检

| 风险 | 对策 |
|---|---|
| 赌博认定 | **赌场不上线**；对战无现金结算；积分不可提现 |
| 概率黑箱质疑 | 概率表链上常量 + 保底规则印在开包页 |
| 收益承诺 | 全站 utility 措辞；卡牌价值波动不背书 |
| 随机数操纵 | commit-reveal + 披露说明；v2 升 VRF |
| **名卡授权（我们不拥有 .ai 身份）** | **认领制卡池**：只有正主 opt-in 才生成卡；版税分账本尊；随时退出（绝版处理）；卡面零钱包信息——详见 `docs/card-utility-benchmark.md` §5 |
| 品牌冒充 | 零 Binance/币安词；引用生态注明出处 |
| 按名查钱包 | 身份仅用于自己卡面署名 |

## 8. Backlog（记录，不占主体）

- **TapeAI 检察官联动**：持任意检察官电路 → 每日免费包 +1、SSR 概率微升；质押 → 对战积分加成、造卡手续费减免；特定编号 → 专属卡背/技能次数
- **TapeUP 节点联动**：节点凭证 → 保底升一档；高活跃地址 → 每周「验证包」开出「已验证」卡面标签；检察官+节点双持 → 「双核」卡组（自走棋带 4 卡）
- **真电路执行**：S1 将技能映射表换成 TapeOut 链上 eval；「止损/梭哈/风控」电路成为卡的真实行为
- **赛季限定卡（S1）**：付费包出限定强化卡（总评+2、攻防+10%、自走棋加被动），**S1 停售绝版**——CT 验证过的 FOMO 收入引擎，详见 §10.3
- **行为租赁（S2）**：把卡牌规则电路按天借给他人 .ai 使用——托管合约 + 自动归还 + 按天计费（参考 Splinterlands 卡片租赁与 Pythia's Deckbox 的 USDC 按天模型）；租的是「行为」不是图片；页面对租金**不承诺任何收益率**
- **Pack Points 兜底（S0 应带）**：攒开包积分换指定卡——宝可梦 TCG Pocket 验证过的"防弃坑安全网"
- **造卡分润**：S1 设计→流片→进卡池；分润记账至 .ai；设计大赛优秀作品直升 SSR

## 9. 与 tapeid.xyz 的自家协同（关键差异化）

> tapeid.xyz（我们自己的项目，BNB Chain 测试网已上线）：**AI 的名字 NFT + 规则电路**——"A wallet gives AI hands. TapeID gives it limits." 一笔交易原子铸造名字+电路，无 token 授权，无 owner 风险。

| 层 | tapeid.xyz | Agent Packs |
|---|---|---|
| 角色 | 正式身份层（Name / Card ERC-8004 / Record） | **消费与娱乐入口**——用开包分发规则电路 |
| 关系 | 每个名字可挂规则电路，钱包级强制 | 卡魂 = 同款规则电路；**equip 到自己的 .ai**，对战按它行动 |
| 导流 | 严肃用户在 tapeid 造身份 | 玩家在 Packs 里第一次接触"规则电路"概念 → 认知反哺 tapeid |

**实现路径与诚实披露**：
- 黑客松 MVP：自含电路 NFT，**沿用 tapeid 同款模式**（一笔原子铸造、零 approve、规则链上常量）——工程独立，叙事互通。
- S1：`card.circuitId` 直接指向 TapeID 注册表铸造的电路，两个项目合约互通。
- **钱包级真实强制执行以 TapeID 生产合约为准（当前测试网）**——Packs 的 equip 在 MVP 内 = 规则参数链上可读 + 任何人可复算一笔支付 + 游戏对阵生效；**不做钱包级拦截**，与 TapeID 的诚实边界一致。
- 叙事一句话：**tapeid 给 AI 上锁，Agent Packs 让锁变成卡牌——玩家集齐的，是自家 AI 的性格库。**

## 10. 收入模型与合规护栏（对标 CT Packs 拆解）

> 行业背景：数字卡包 2026-11 年化收入已达 **$2B**，周活 5 万→170 万——赛道在爆发期。
> CT Packs 不公开收入，但其定价设计即商业模式，五个齿轮全部可验证：

### 10.1 五齿轮（照抄已验证部分）

| 齿轮 | 机制 | 本项目落地 |
|---|---|---|
| ① 三层包漏斗 | 单包 $1.3 / 十连 / 百连 · 创世绝版 | ✅ 合约 `TIER_PRICE`+`TIER_QTY` 对齐，单包价统一 |
| ② 卖保底不卖彩票 | 黑包保底 UR、彩虹保底 SSR | ✅ 双保底已实现（首包 SSR + 每 10 张 SR） |
| ③ 赛季限定 | 付费包出"限定版"强化卡，**赛季结束停售** | 📅 **排 S1**（见 10.3） |
| ④ 免费玩家引擎 | 免费包+13 任务+连登养日活 → 裂变观众 | ✅ 已实现 |
| ⑤ 卡有用途 | 自走棋/模式让卡有需求 → 包有需求 | ✅ 五章自走棋已实现 |

### 10.2 改一加三（我们的收入结构）

**改掉**：CT 的"荣誉点期货"（未公布的未来权益）——红线 7 风险，替换为**透明赛季奖金池**（规则赛前公示、链上可审计）。

**加三个 CT 没有的引擎**：

| 引擎 | 收入模式 | 排期 |
|---|---|---|
| **造卡分润** | 玩家设计电路→流片→进卡池→被抽到分润；平台抽造卡手续费；UGC 卡池零内容成本 | S1 |
| **行为租赁** | 名卡规则电路按天出租，平台抽成（参照 Pythia's Deckbox：USDC 按天租赁已成独立生意） | S2 |
| **TapeID 导流** | 游戏即 tapeid 规则电路的消费展示层，玩家转化至身份层产品 | 持续 |

**体感粗算**：2000 DAU × 付费率 3% × ARPPU $8/日 ≈ $480/日、$14k/月；鲸鱼脉冲（创世包）另计。对照黑客松命中任意名次 800–10,000 USDC——**先拿奖再谈生意，同一漏斗前后两段**。

### 10.3 赛季限定卡设计（S1 排期项）

- 付费包在 S1 期间开出的卡带「SEASON 1 限定」标记：**总评 +2、ATK/DEF +10%、自走棋额外被动**
- **S1 结束永久停售**，限定卡进入绝版（二级市场流通）
- 合约实现：`CardInfo` 增加 `season` 字段；对战引擎按 season 加成读取——对已部署合约无破坏性（v2 平行合约发布）

### 10.4 合规护栏（对照红线逐条）

| 项 | 护栏 |
|---|---|
| 收益承诺（红线 7） | 全站"奖金/prize/bounty"话术；荣誉类权益**不做未公布期货**；积分不可提现声明 |
| 租赁收益 | 租金由市场定价，页面对回报率**零承诺**（仅展示历史成交） |
| 概率黑箱 | 概率表链上常量 + 保底印在开包页（已实现） |
| 山寨风险 | 卡面/玩法会被模仿（pumpfun 已现 CTPACKS 山寨 meme 币），护城河=造卡分润+行为租赁+TapeID 生态联动，**不是卡面美术** |
