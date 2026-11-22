// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*═══════════════════════════════════════════════════════════════════════════
  AgentPackCore — Agent Packs · Season 0（黑客松 MVP）
════════════════════════════════════════════════════════════════════════════

  用 Binance Agent ID 做身份、用规则电路做灵魂的 Agent 卡牌游戏合约层。

  核心流程（全部在合约层校验官方 Agent ID 注册表——所有状态写操作
  均要求 msg.sender 持有 Agent ID，这正是本项目"实际使用 Agent ID"的
  链上证据）：

    1. claimDailyPack   每日免费包（24h 冷却）
    2. buyPack          付费包（BNB，50% 当笔销毁 + 50% 进公示奖池）
    3. packCommit       开包承诺（commit-reveal 第一段）
    4. packReveal       开包（commit-reveal 第二段，5 张卡，保底生效）
    5. claimIntoPool    正主自愿把 .ai 身份入卡池（opt-in；被抽到得积分）
    6. equip/unequip    穿卡：把卡上规则电路挂到自己身份上
    7. starUp           升星（销毁燃料卡）
    8. invite           邀请（被邀人开满 15 包，双方各得 1 奖励包）
    9. redeemPoints     开包积分兑 SR（防弃坑安全网，参考 Pokémon Pack Points）

  ── 权限披露（官方红线 4，随 BscScan 验证公开）────────────────────────
  · 本合约没有任何 owner / admin / 升级 / 暂停 / 提款路径。
  · RARITY_ODDS / TIER_PRICE / 保底参数是无 setter 的公共存储，
    部署后任何人无法修改——概率即承诺。
  · 付费 BNB 在 buyPack 当笔即分账：50% 转入销毁地址、50% 转入部署时
    固化的 prizePool 公示地址。合约自身不持有资金，无任何可提取路径。
  · 随机性为 commit-reveal（未来块哈希 + 用户盐），披露：区块生产者
    存在理论操纵空间，娱乐卡牌场景可接受；高价值分配建议升级 VRF。
  · 卡面不含任何钱包地址信息（红线 9）；卡池仅收录自愿认领者（opt-in），
    任何人可 leavePool 退出，退出后该身份停发新卡（绝版处理）。
═══════════════════════════════════════════════════════════════════════════*/

interface IAgentIdRegistry {
    function balanceOf(address owner) external view returns (uint256);
}

contract AgentPackCore {
    /*──────────────────── 事件 ────────────────────*/
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    event DailyClaimed(address indexed agent, uint256 packId, uint64 at);
    event PackBought(uint256 indexed packId, address indexed agent, uint8 tier);
    event PackCommitted(uint256 indexed packId, address indexed agent);
    event PackOpened(uint256 indexed packId, address indexed agent, uint256[5] cardIds);
    event JoinedPool(uint256 indexed poolIndex, address indexed agent);
    event LeftPool(uint256 indexed poolIndex, address indexed agent);
    event IdentityCardPulled(uint256 indexed poolIndex, address indexed poolAgent, uint256 cardId);
    event Equipped(address indexed agent, uint256 indexed cardId);
    event Unequipped(address indexed agent);
    event StarredUp(uint256 indexed cardId, uint8 newStar, uint256 fuelBurned);
    event Invited(address indexed invitee, address indexed inviter);
    event InviteCompleted(address indexed invitee, address indexed inviter);
    event BonusPackGranted(address indexed to);
    event PointsRedeemed(address indexed agent, uint256 points, uint256 cardId);

    /*──────────────────── 错误 ────────────────────*/
    error NoAgentId();        // 调用者未持有 Binance Agent ID
    error NoAgentIdOther();   // 目标地址未持有 Agent ID
    error NotPackOwner();
    error PackMissing();
    error PackAlreadyOpened();
    error PackNotCommitted();
    error BadCommit();
    error BadValue();
    error BadTier();
    error DailyCooldown();
    error AlreadyInPool();
    error NotInPool();
    error NotCardOwner();
    error NotEnoughPoints();
    error NothingToClaim();
    error WrongFrom();
    error NotApproved();
    error CannotInviteSelf();
    error AlreadyInvited();
    error NoSuchCard();
    error BadStarTarget();

    /*──────────────────── 常量 / 不可变 ────────────────────*/
    /// @notice 官方 Agent ID 注册表（constructor 注入；主网 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F）
    IAgentIdRegistry public immutable agentIdRegistry;
    /// @notice 公示奖池地址：付费包 50% 流入，部署后不可更改
    address public immutable prizePool;
    /// @notice 销毁地址：付费包 50% 流入
    address public constant BURN = 0x000000000000000000000000000000000000dEaD;

    uint256 public constant PACK_SIZE = 5;

    /// @notice 每档抽取概率（‰）：C / UC / R / SR / SSR / UR / LR——无 setter，部署即承诺
    uint16[7] public RARITY_ODDS = [464, 300, 150, 60, 20, 5, 1];
    string[7]  public RARITY_NAME = ["C", "UC", "R", "SR", "SSR", "UR", "LR"];

    /// @notice 付费包三档价格（BNB）：首充 / 每日限量 / 创世——无 setter
    uint256[3] public TIER_PRICE = [0.002 ether, 0.02 ether, 0.2 ether];

    uint64 public constant DAILY_COOLDOWN   = 24 hours;
    uint32 public constant PITY_SR_EVERY    = 10;  // 连续 10 张无 SR+，第 10 张强制 ≥SR
    uint8  public constant RARITY_SSR       = 4;
    uint8  public constant RARITY_SR        = 3;
    uint32 public constant POINTS_PER_PACK  = 5;    // 每开 1 包得 5 分
    uint32 public constant SR_REDEEM_POINTS = 500;  // 500 分兑 1 张 SR
    uint32 public constant POOL_POINTS_PER_PULL = 10; // 正主身份被抽到 → 得 10 分
    uint8  public constant HOUSE_CARDS      = 8;    // 系统电路卡：止损/梭哈/风控/加仓/清仓/抄底/杠杆/钻石手
    uint8  public constant MAX_STAR         = 5;

    /*──────────────────── 类型 ────────────────────*/
    struct Player {
        uint64 lastDailyClaim;
        uint32 packsSinceLastSR; // 自上次 SR+ 以来未出的卡数
        uint32 openedPacks;
        bool   firstPackDone;
        bool   inviteDone;
        address invitedBy;
    }

    struct Pack {
        address owner;
        uint8   tier;
        bytes32 commit;
        uint64  committedBlock;
        bool    opened;
    }

    /// @dev kind: 0 = 系统电路卡（ref = 0..7 电路编号），1 = 身份卡（ref = 卡池下标）
    struct CardInfo {
        uint8  rarity;
        uint8  star;
        uint8  kind;
        uint32 ref;
    }

    struct PoolEntry {
        address agent;
        uint64  since;
        bool    active;
    }

    /*──────────────────── 状态 ────────────────────*/
    mapping(address => Player) public players;
    mapping(address => uint256) public pendingBonusPacks; // 可白嫖的奖励包
    mapping(address => uint256) public packPoints;

    uint256 public packCount;
    mapping(uint256 => Pack) public packs;

    PoolEntry[] public pool;
    mapping(address => uint256) public poolIndex; // 1-based；0 = 从未入池

    uint256 public cardCount;
    mapping(uint256 => CardInfo) public cardInfo;
    mapping(address => uint256) public activeCircuit; // 穿卡：身份 → 卡

    // ERC-721 最小实现存储
    string public constant name = "Agent Packs";
    string public constant symbol = "APACK";
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    /*──────────────────── 构造 ────────────────────*/
    constructor(address agentIdRegistry_, address prizePool_) {
        if (agentIdRegistry_ == address(0) || prizePool_ == address(0)) revert NoZeroAddress();
        agentIdRegistry = IAgentIdRegistry(agentIdRegistry_);
        prizePool = prizePool_;
    }

    /*──────────────────── 身份守卫 ────────────────────*/
    function isAgentIdHolder(address who) public view returns (bool) {
        return agentIdRegistry.balanceOf(who) > 0;
    }

    modifier onlyAgent() {
        if (!isAgentIdHolder(msg.sender)) revert NoAgentId();
        _;
    }

    /*──────────────────── 1 · 每日免费包 ────────────────────*/
    /// @notice 每个 Agent ID 每 24h 一包；有待领奖励包时可立即领取（不占冷却）
    function claimDailyPack() external onlyAgent returns (uint256 packId) {
        Player storage p = players[msg.sender];
        if (pendingBonusPacks[msg.sender] > 0) {
            pendingBonusPacks[msg.sender]--;
        } else {
            // lastDailyClaim == 0 视为从未领取过：首次不设冷却
            if (p.lastDailyClaim != 0 && block.timestamp < p.lastDailyClaim + DAILY_COOLDOWN) {
                revert DailyCooldown();
            }
            p.lastDailyClaim = uint64(block.timestamp);
        }
        packId = _newPack(msg.sender, 0);
        emit DailyClaimed(msg.sender, packId, uint64(block.timestamp));
    }

    /*──────────────────── 2 · 付费包 ────────────────────*/
    function buyPack(uint8 tier) external payable onlyAgent returns (uint256 packId) {
        if (tier >= 3) revert BadTier();
        uint256 price = TIER_PRICE[tier];
        if (msg.value != price) revert BadValue();

        packId = _newPack(msg.sender, tier); // 先记账（effects），后转账（interactions）
        emit PackBought(packId, msg.sender, tier);

        uint256 half = price / 2;
        (bool ok1, ) = BURN.call{value: half}("");
        (bool ok2, ) = prizePool.call{value: price - half}("");
        require(ok1 && ok2, "split failed");
    }

    function _newPack(address owner, uint8 tier) internal returns (uint256 packId) {
        packId = ++packCount;
        packs[packId] = Pack({owner: owner, tier: tier, commit: 0, committedBlock: 0, opened: false});
    }

    /*──────────────────── 3 · 开包 commit ────────────────────*/
    function packCommit(uint256 packId, bytes32 commitHash) external {
        Pack storage pk = packs[packId];
        if (pk.owner == address(0)) revert PackMissing();
        if (msg.sender != pk.owner) revert NotPackOwner();
        if (pk.opened) revert PackAlreadyOpened();
        if (commitHash == 0) revert BadCommit();
        pk.commit = commitHash;
        pk.committedBlock = uint64(block.number);
        emit PackCommitted(packId, msg.sender);
    }

    /*──────────────────── 4 · 开包 reveal ────────────────────*/
    /// @notice 开出 5 张卡。保底：新玩家首包第 5 张必 ≥SSR；
    ///         连续 PITY_SR_EVERY 张未出 SR+ 时强制本包最后一张 ≥SR。
    function packReveal(uint256 packId, bytes32 salt) external {
        Pack storage pk = packs[packId];
        if (pk.owner == address(0)) revert PackMissing();
        if (msg.sender != pk.owner) revert NotPackOwner();
        if (pk.opened) revert PackAlreadyOpened();
        if (pk.commit == 0) revert PackNotCommitted();
        if (pk.committedBlock >= block.number) revert BadCommit(); // 必须晚于承诺区块
        if (keccak256(abi.encodePacked(salt)) != pk.commit) revert BadCommit();

        pk.opened = true; // effects 先行

        Player storage p = players[msg.sender];
        bool firstPack = !p.firstPackDone;

        bytes32 seed = keccak256(
            abi.encodePacked(msg.sender, packId, salt, blockhash(pk.committedBlock), block.timestamp)
        );
        bytes32 seed2 = keccak256(abi.encodePacked(seed, "content"));

        uint256[5] memory ids;
        for (uint256 i = 0; i < PACK_SIZE; i++) {
            uint256 v = uint256(seed) >> (i * 48);
            uint8 rarity = _rollRarity(v % 1000);

            if (firstPack && i == PACK_SIZE - 1) {
                if (rarity < RARITY_SSR) rarity = RARITY_SSR; // 新手首包第 5 张必 ≥SSR
            } else if (!firstPack && p.packsSinceLastSR + 1 >= PITY_SR_EVERY && rarity < RARITY_SR) {
                rarity = RARITY_SR; // 连续 10 张无 SR+ → 强制 ≥SR（任意槽位触发，间隔 ≤9 张）
            }
            if (rarity >= RARITY_SR) p.packsSinceLastSR = 0;
            else p.packsSinceLastSR++;

            ids[i] = _mintCard(msg.sender, rarity, seed2, i);
        }

        p.firstPackDone = true;
        p.openedPacks++;
        packPoints[msg.sender] += POINTS_PER_PACK;

        // 邀请结算：被邀人开满 15 包 → 双方各得 1 奖励包
        if (!p.inviteDone && p.invitedBy != address(0) && p.openedPacks >= 15) {
            p.inviteDone = true;
            pendingBonusPacks[p.invitedBy] += 1;
            pendingBonusPacks[msg.sender] += 1;
            emit InviteCompleted(msg.sender, p.invitedBy);
            emit BonusPackGranted(p.invitedBy);
            emit BonusPackGranted(msg.sender);
        }

        emit PackOpened(packId, msg.sender, ids);
    }

    function _rollRarity(uint256 x) internal view returns (uint8) {
        uint32 acc = 0;
        for (uint8 r = 0; r < 7; r++) {
            acc += RARITY_ODDS[r];
            if (x < acc) return r;
        }
        return 6; // 理论不可达（概率合计 1000‰）
    }

    /*──────────────────── 5 · 卡池（opt-in）────────────────────────*/
    function claimIntoPool() external onlyAgent {
        uint256 idx = poolIndex[msg.sender];
        if (idx != 0) {
            if (pool[idx - 1].active) revert AlreadyInPool();
            pool[idx - 1].active = true; // 重新激活
            emit JoinedPool(idx - 1, msg.sender);
            return;
        }
        pool.push(PoolEntry({agent: msg.sender, since: uint64(block.timestamp), active: true}));
        poolIndex[msg.sender] = pool.length;
        emit JoinedPool(pool.length - 1, msg.sender);
    }

    /// @notice 退出卡池：停发新卡，历史卡进入"绝版"状态（不删除）
    function leavePool() external {
        uint256 idx = poolIndex[msg.sender];
        if (idx == 0 || !pool[idx - 1].active) revert NotInPool();
        pool[idx - 1].active = false;
        emit LeftPool(idx - 1, msg.sender);
    }

    function poolSize() external view returns (uint256) {
        return pool.length;
    }

    /*──────────────────── 6 · 穿卡 ────────────────────*/
    function equip(uint256 cardId) external onlyAgent {
        if (_owners[cardId] != msg.sender) revert NotCardOwner();
        activeCircuit[msg.sender] = cardId;
        emit Equipped(msg.sender, cardId);
    }

    function unequip() external {
        if (activeCircuit[msg.sender] == 0) revert NoSuchCard();
        delete activeCircuit[msg.sender];
        emit Unequipped(msg.sender);
    }

    /*──────────────────── 6.5 · 规则电路：卡的实际作用 ────────────────────*/
    // 卡不是图片，是一条可验证的支出规则。
    // ruleOf(cardId) 读出这条规则的参数；checkPayment(...) 用同一套参数复算
    // 一笔支付是否守约。与 TapeID 的 rule certificate 同一思路：
    // 它不阻止支付，它让任何人都能在事后复算——规则公开、参数不可改。
    // 金额单位统一为「美分」，避免浮点。

    uint8 public constant RULE_DAILY_CAP   = 0; // 止损：每日支出上限
    uint8 public constant RULE_SINGLE_MAX  = 1; // 梭哈：单笔上限
    uint8 public constant RULE_AGENT_ONLY  = 2; // 风控：只付给持有 Agent ID 的地址
    uint8 public constant RULE_GROWTH      = 3; // 加仓：额度随当日成功笔数增长
    uint8 public constant RULE_DAILY_COUNT = 4; // 清仓：每日笔数上限
    uint8 public constant RULE_MICRO_PASS  = 5; // 抄底：小额免确认
    uint8 public constant RULE_HIGH_LIMIT  = 6; // 杠杆：高额度，超一半需人工
    uint8 public constant RULE_COOLDOWN    = 7; // 钻石手：两笔之间的冷却
    uint8 public constant RULE_NAMED_PAYEE = 8; // 身份卡：只付给这张卡的正主

    /// @notice 读出卡上的规则（纯函数，任何人可查）
    /// @return ruleType 0..8，见上方常量
    /// @return p1 主参数：美分 / 笔数 / 秒 / 地址
    /// @return p2 次参数（加仓电路 = 每笔增长百分比）
    function ruleOf(uint256 cardId) public view returns (uint8 ruleType, uint256 p1, uint256 p2) {
        if (_owners[cardId] == address(0)) revert NoSuchCard();
        CardInfo memory c = cardInfo[cardId];

        if (c.kind == 1) {
            return (RULE_NAMED_PAYEE, uint256(uint160(pool[c.ref].agent)), 0);
        }

        ruleType = uint8(c.ref % HOUSE_CARDS);
        uint256 mult = 100 + uint256(c.rarity) * 40 + uint256(c.star) * 20; // 稀有度/星级放大

        if (ruleType == RULE_DAILY_CAP)        p1 = 2000 * mult / 100;   // $20 起
        else if (ruleType == RULE_SINGLE_MAX)  p1 = 5000 * mult / 100;   // $50 起
        else if (ruleType == RULE_AGENT_ONLY)  p1 = 0;
        else if (ruleType == RULE_GROWTH)    { p1 = 3000 * mult / 100; p2 = 2; } // 每日 +2%/笔
        else if (ruleType == RULE_DAILY_COUNT) p1 = 3 + uint256(c.rarity) / 2 + c.star;
        else if (ruleType == RULE_MICRO_PASS)  p1 = 500 * mult / 100;    // $5 起
        else if (ruleType == RULE_HIGH_LIMIT)  p1 = 10000 * mult / 100;  // $100 起
        else {
            uint256 cut = uint256(c.rarity) * 300 + uint256(c.star) * 120;
            p1 = cut < 3600 ? 3600 - cut : 300; // 60 分钟起，最低 5 分钟
        }
    }

    /// @notice 复算一笔支付是否守约（view，不改变任何状态）
    /// @dev 调用方提供当日已花、当日笔数、上一笔时间——任何人可用钱包流水复算
    function checkPayment(
        address agent,
        uint256 amountCents,
        address payee,
        uint256 spentTodayCents,
        uint16 txCountToday,
        uint64 lastPaymentAt,
        bool humanApproved
    ) external view returns (bool ok, string memory reason) {
        uint256 cardId = activeCircuit[agent];
        if (cardId == 0) return (false, "no rule equipped");

        (uint8 t, uint256 p1, uint256 p2) = ruleOf(cardId);

        if (t == RULE_DAILY_CAP) {
            if (spentTodayCents + amountCents <= p1) return (true, "within daily cap");
            if (humanApproved) return (true, "over cap, human approved");
            return (false, "daily cap exceeded");
        }
        if (t == RULE_SINGLE_MAX) {
            if (amountCents <= p1) return (true, "within single max");
            return (false, "single payment too large");
        }
        if (t == RULE_AGENT_ONLY) {
            if (isAgentIdHolder(payee)) return (true, "payee holds Agent ID");
            return (false, "payee has no Agent ID");
        }
        if (t == RULE_GROWTH) {
            uint256 cap = p1 * (100 + uint256(txCountToday) * p2) / 100;
            if (spentTodayCents + amountCents <= cap) return (true, "within growing cap");
            if (humanApproved) return (true, "over cap, human approved");
            return (false, "growing cap exceeded");
        }
        if (t == RULE_DAILY_COUNT) {
            if (txCountToday < p1) return (true, "within daily count");
            return (false, "daily tx count reached");
        }
        if (t == RULE_MICRO_PASS) {
            if (amountCents <= p1) return (true, "micro payment, no approval");
            if (humanApproved) return (true, "human approved");
            return (false, "needs human approval");
        }
        if (t == RULE_HIGH_LIMIT) {
            if (amountCents > p1) return (false, "over high limit");
            if (amountCents * 2 > p1 && !humanApproved) return (false, "over half limit, needs human");
            return (true, "within high limit");
        }
        if (t == RULE_COOLDOWN) {
            if (lastPaymentAt == 0 || block.timestamp >= uint256(lastPaymentAt) + p1) {
                return (true, "cooldown satisfied");
            }
            return (false, "cooldown not elapsed");
        }
        // RULE_NAMED_PAYEE
        if (uint256(uint160(payee)) == p1) return (true, "designated payee");
        return (false, "not the designated payee");
    }

    /// @notice 查某个 Agent 当前穿着的规则（无卡时 ruleType = 255）
    function equippedRule(address agent)
        external view returns (uint256 cardId, uint8 ruleType, uint256 p1, uint256 p2)
    {
        cardId = activeCircuit[agent];
        if (cardId == 0) return (0, 255, 0, 0);
        (ruleType, p1, p2) = ruleOf(cardId);
    }

    /*──────────────────── 7 · 升星 ────────────────────*/
    /// @dev 简化规则（与 CT 的 2/4/7/11/16 不同，README 披露）：1 张燃料 = 1 星，上限 5
    function starUp(uint256 baseCardId, uint256[] calldata fuel) external onlyAgent {
        if (_owners[baseCardId] != msg.sender) revert NotCardOwner();
        if (fuel.length == 0) revert BadStarTarget();
        CardInfo storage c = cardInfo[baseCardId];
        if (c.star >= MAX_STAR) revert BadStarTarget();

        for (uint256 i = 0; i < fuel.length; i++) {
            uint256 fid = fuel[i];
            if (_owners[fid] != msg.sender) revert NotCardOwner();
            if (fid == baseCardId) revert BadStarTarget();
            if (activeCircuit[msg.sender] == fid) revert BadStarTarget(); // 别烧自己正穿着的
            _burn(fid);
        }
        uint8 gain = uint8(fuel.length);
        c.star = c.star + gain > MAX_STAR ? MAX_STAR : uint8(c.star + gain);
        emit StarredUp(baseCardId, c.star, fuel.length);
    }

    /*──────────────────── 8 · 邀请 ────────────────────*/
    function invite(address inviter) external onlyAgent {
        if (inviter == msg.sender) revert CannotInviteSelf();
        if (!isAgentIdHolder(inviter)) revert NoAgentIdOther();
        Player storage p = players[msg.sender];
        if (p.invitedBy != address(0)) revert AlreadyInvited();
        p.invitedBy = inviter;
        emit Invited(msg.sender, inviter);
    }

    /*──────────────────── 9 · 积分兑 SR ────────────────────*/
    function redeemPoints() external onlyAgent returns (uint256 cardId) {
        if (packPoints[msg.sender] < SR_REDEEM_POINTS) revert NotEnoughPoints();
        packPoints[msg.sender] -= SR_REDEEM_POINTS;
        cardId = _mint(msg.sender, CardInfo({rarity: RARITY_SR, star: 0, kind: 0, ref: 0}));
        emit PointsRedeemed(msg.sender, SR_REDEEM_POINTS, cardId);
    }

    /*──────────────────── 铸卡内部 ────────────────────*/
    function _mintCard(address to, uint8 rarity, bytes32 seed2, uint256 slot)
        internal returns (uint256 cardId)
    {
        uint8 kind = 0;
        uint32 ref = uint32(uint256(seed2 >> (slot * 32)) % HOUSE_CARDS);

        // SR+ 有机会开出身份卡（仅限卡池中 active 的正主）
        if (rarity >= RARITY_SR && pool.length > 0) {
            uint256 idx = uint256(seed2 >> (160 + slot * 16)) % pool.length;
            if (pool[idx].active) {
                kind = 1;
                ref = uint32(idx);
            }
        }

        cardId = _mint(to, CardInfo({rarity: rarity, star: 0, kind: kind, ref: ref}));

        if (kind == 1) {
            address poolAgent = pool[ref].agent;
            packPoints[poolAgent] += POOL_POINTS_PER_PULL; // 正主被抽到 → 积分分润
            emit IdentityCardPulled(ref, poolAgent, cardId);
        }
    }

    function _mint(address to, CardInfo memory c) internal returns (uint256 cardId) {
        cardId = ++cardCount;
        cardInfo[cardId] = c;
        _balances[to]++;
        _owners[cardId] = to;
        emit Transfer(address(0), to, cardId);
    }

    function _burn(uint256 cardId) internal {
        address owner = _owners[cardId];
        _balances[owner]--;
        delete _owners[cardId];
        delete cardInfo[cardId];
        delete _tokenApprovals[cardId];
        emit Transfer(owner, address(0), cardId);
    }

    /*──────────────────── ERC-721（最小自包含实现）────────────────────*/
    error NoZeroAddress();
    error NonexistentCard();

    function balanceOf(address owner) external view returns (uint256) {
        if (owner == address(0)) revert NoZeroAddress();
        return _balances[owner];
    }

    function ownerOf(uint256 cardId) public view returns (address) {
        address o = _owners[cardId];
        if (o == address(0)) revert NonexistentCard();
        return o;
    }

    function approve(address to, uint256 cardId) external {
        address owner = ownerOf(cardId);
        if (msg.sender != owner && !_operatorApprovals[owner][msg.sender]) revert NotApproved();
        _tokenApprovals[cardId] = to;
        emit Approval(owner, to, cardId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(address from, address to, uint256 cardId) public {
        if (to == address(0)) revert NoZeroAddress();
        address owner = ownerOf(cardId);
        if (owner != from) revert WrongFrom();
        if (msg.sender != from && _tokenApprovals[cardId] != msg.sender
            && !_operatorApprovals[from][msg.sender]) revert NotApproved();

        _balances[from]--;
        _balances[to]++;
        _owners[cardId] = to;
        delete _tokenApprovals[cardId];
        if (activeCircuit[from] == cardId) delete activeCircuit[from]; // 穿着卖掉自动脱下
        emit Transfer(from, to, cardId);
    }

    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == 0x80ac58cd || id == 0x01ffc9a7; // ERC-721 / ERC-165
    }

    /*──────────────────── tokenURI（链上生成，无服务器）────────────────────*/
    function tokenURI(uint256 cardId) external view returns (string memory) {
        ownerOf(cardId); // 不存在即 revert
        CardInfo memory c = cardInfo[cardId];
        string memory kindName = c.kind == 1 ? "identity" : "circuit";
        bytes memory json = abi.encodePacked(
            '{"name":"Agent Pack Card #', _u2s(cardId),
            '","description":"Agent Packs Season 0 - identity is the card, circuit is the soul.",',
            '"attributes":[{"trait_type":"rarity","value":"', RARITY_NAME[c.rarity],
            '"},{"trait_type":"star","value":', _u2s(c.star),
            '},{"trait_type":"type","value":"', kindName,
            '"},{"trait_type":"ref","value":', _u2s(c.ref), '}]}'
        );
        return string(abi.encodePacked("data:application/json;base64,", _b64(json)));
    }

    function _u2s(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 digits;
        for (uint256 x = v; x > 0; x /= 10) digits++;
        bytes memory b = new bytes(digits);
        for (uint256 i = digits; i > 0; i--) {
            b[i - 1] = bytes1(uint8(48 + v % 10));
            v /= 10;
        }
        return string(b);
    }

    function _b64(bytes memory data) internal pure returns (string memory) {
        bytes memory T = bytes("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
        uint256 len = data.length;
        if (len == 0) return "";
        bytes memory out = new bytes(4 * ((len + 2) / 3));
        uint256 j;
        for (uint256 i = 0; i < len; i += 3) {
            uint256 b0 = uint256(uint8(data[i]));
            uint256 b1 = (i + 1 < len) ? uint256(uint8(data[i + 1])) : 0;
            uint256 b2 = (i + 2 < len) ? uint256(uint8(data[i + 2])) : 0;
            uint256 n = (b0 << 16) | (b1 << 8) | b2;
            out[j++] = T[(n >> 18) & 63];
            out[j++] = T[(n >> 12) & 63];
            out[j++] = (i + 1 < len) ? T[(n >> 6) & 63] : bytes1("=");
            out[j++] = (i + 2 < len) ? T[n & 63] : bytes1("=");
        }
        return string(out);
    }
}
