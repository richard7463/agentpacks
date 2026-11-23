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
    2. buyPack          付费包（BNB，50% 当笔销毁 + 50% 进公示奖池；三档 = 单包/十连/百连）
    3. packCommit       开包承诺（commit-reveal 第一段）
    4. packReveal       开包（commit-reveal 第二段，5 张卡，保底生效）
    5. claimIntoPool    正主自愿把 .ai 身份入卡池（opt-in；被抽到得积分）
    6. equip/unequip    穿卡：把卡上规则电路挂到自己身份上（电路卡须已流片）
    6.5 tapeOut         流片：参数卡 → 真身 circuit NFT（买 NAND 逐门烧、进卡主钱包可转售）
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

/// @dev TapeOut 生态处理器接口（processor 由 CPU Factory 自部署，费用参数归本项目）
interface ITapeOutProcessor {
    function tapeout(bytes calldata nl, uint32 nIn, uint32 nOut) external payable returns (uint256 id);
    function eval(uint256 id, bytes calldata inputs) external view returns (bytes memory);
    function transistors() external view returns (address);
    function TAPEOUT_FEE() external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function transferFrom(address from, address to, uint256 tokenId) external;
}

/// @dev NAND 晶体管（ERC-1155 语义）：流片前按门数购买，流片时逐门烧掉
interface ITransistors {
    function mint(uint256 id, uint256 amount) external payable;
    function mintPrice() external view returns (uint256);
    function protocolFee() external view returns (uint256);
}

interface IAgentIdRegistry {
    function balanceOf(address owner) external view returns (uint256);
}

/// @dev BEM (ERC-20)：官方 CPU Factory 创建的 transistor 用 BEM 收 NAND 钱，不是原生 BNB
interface IBEM {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
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
    event CardTaped(uint256 indexed cardId, uint256 indexed circuitId, address indexed owner, uint256 cost);
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
    error NoProcessor();      // 处理器未接线（构造传 0）
    error NotCircuitCard();    // 只有电路卡可以流片
    error AlreadyTaped();      // 这张卡已流片
    error NotTaped();          // 电路卡未流片，不能装备真身规则
    error NotCircuitOwner();   // 电路 NFT 已被转走，卡主失去规则使用权
    error BadBEM();            // BEM 扣款/授权失败
    error DailyBuyCap();       // 每身份每日购买上限
    error GenesisSoldOut();    // 创世百连售罄，永久绝版

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
    /// @notice 三档购买数量：1 / 10 / 100 包（单包价统一 0.002 BNB）
    uint16[3] public TIER_QTY = [1, 10, 100];
    /// @notice 防女巫阀 1：每身份每日最多购买 120 包（Agent ID 一个 KYC 只有一个）
    uint16 public constant BUY_DAILY_CAP = 120;
    /// @notice 防女巫阀 2：创世百连限量 333 笔，售完永久绝版（EmberWorld Pass 同款叙事）
    uint16 public constant GENESIS_MAX  = 333;
    uint8  public constant GENESIS_TIER = 2;

    uint64 public constant DAILY_COOLDOWN   = 24 hours;
    uint32 public constant PITY_SR_EVERY    = 10;  // 连续 10 张无 SR+，第 10 张强制 ≥SR
    uint8  public constant RARITY_SSR       = 4;
    uint8  public constant RARITY_SR        = 3;
    uint32 public constant POINTS_PER_PACK  = 5;    // 每开 1 包得 5 分
    uint32 public constant SR_REDEEM_POINTS = 500;  // 500 分兑 1 张 SR
    uint32 public constant POOL_POINTS_PER_PULL = 10; // 正主身份被抽到 → 得 10 分
    /// @notice house 电路卡共 12 种，四类家族（docs/four-circuit-families.md）：
    ///         ①交易（止损/梭哈/加仓/清仓/抄底）②风控（钻石手/封控）
    ///         ③安全（白名单/杠杆/身份·正主）④协作（双签/会签/委托）
    uint8  public constant HOUSE_CARDS      = 12;
    uint8  public constant MAX_STAR         = 5;

    /*──────────────────── 类型 ────────────────────*/
    struct Player {
        uint64 lastDailyClaim;
        uint32 packsSinceLastSR; // 自上次 SR+ 以来未出的卡数
        uint32 openedPacks;
        uint64 buyDay;           // 最近付费购买日（UTC day）
        uint16 boughtToday;       // 当日已购包数（含 bundle 数量）
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

    /*──────────────────── 流片（卡 → 真身 circuit NFT）────────────────────*/
    /// @notice 自部署的 TapeOut 处理器（constructor 注入；0 = 未接线，tapeOut 不可用）
    address public immutable tapeProcessor;
    /// @notice BEM 代币地址（0 = 旧版 Mock：NAND 用原生 BNB 付；非 0 = 官方 transistor：先 pull BEM 再 mint）
    address public immutable bemToken;
    /// @notice 卡 → circuit NFT id（0 = 未流片：仅游戏内参数卡）
    mapping(uint256 => uint256) public cardCircuit;
    /// @notice 创世百连已售笔数
    uint16 public genesisSold;
    /// @dev 12 条真网表（TapeForge 合成 · NAND-only · 全输入穷举验证）。
    ///      TapeOut 编码：每门 7 字节 = 0x00 + 两信号 u24；部署期写入、无 setter。
    ///      字节由 tools/mint12.mjs 铸造（源语义与 ruleOf/checkPayment 同构）。
    ///      门数档位：t2/t11=4 门(I) … t0/t3=36-39 门(II) … t9=189 门(IV)。
    bytes[] public HOUSE_NETLIST;
    /// @dev 每条网表的真实输入位数（调用方打包运行时事实 + 配置 mult 进输入字）
    uint32[12] public HOUSE_NIN;
    /// @dev 统一 allow/ask 双输出
    uint32 public constant HOUSE_NOUT = 2;

    // ERC-721 最小实现存储
    string public constant name = "Agent Packs";
    string public constant symbol = "APACK";
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    /*──────────────────── 构造 ────────────────────*/
    constructor(address agentIdRegistry_, address prizePool_, address tapeProcessor_, address bemToken_) {
        if (agentIdRegistry_ == address(0) || prizePool_ == address(0)) revert NoZeroAddress();
        agentIdRegistry = IAgentIdRegistry(agentIdRegistry_);
        prizePool = prizePool_;
        tapeProcessor = tapeProcessor_;
        bemToken = bemToken_;
        HOUSE_NETLIST.push(hex"0000000500000500000002000009000000060000060000000a00000a0000000b00000c0000000600000a0000000e00000e0000000300000f000000030000030000000d00001100000010000012000000070000070000001300001300000014000015000000070000130000001700001700000004000018000000040000040000001600001a0000001900001b000000080000080000001c00001c0000000d00000d0000000300000e0000001100001f0000002000002100000014000022000000230000230000002200002200000007000025000000040000260000001a000024000000270000280000001d0000290000001d00001e0000002a00002a"); // t0 止损 · 36 门 · 7b 进 · 穷举 128 全过
        HOUSE_NETLIST.push(hex"000000050000050000000200000800000006000006000000090000090000000a00000b000000060000090000000d00000d0000000300000e000000030000030000000c0000100000000f0000110000000700000700000012000012000000130000140000000700001200000016000016000000040000170000000400000400000015000019000000000000000000001800001a0000001b00001b"); // t1 梭哈 · 22 门 · 6b 进 · 穷举 64 全过
        HOUSE_NETLIST.push(hex"00000002000002000000000000000000000300000300000004000004"); // t2 白名单 · 4 门 · 1b 进 · 穷举 2 全过
        HOUSE_NETLIST.push(hex"000000060000060000000200000a000000070000070000000b00000b0000000c00000d0000000700000b0000000f00000f00000003000010000000030000030000000e00001200000011000013000000080000080000001400001400000015000016000000080000140000001800001800000004000019000000040000040000001700001b0000001a00001c000000050000050000001d00001e000000090000090000000e00000e0000000300000f000000120000210000002200002300000015000024000000250000250000002400002400000008000027000000040000280000001b0000260000002900002a0000002b00002b0000001e00002c0000002000002d0000001f0000200000002e00002e"); // t3 加仓 · 39 门 · 8b 进 · 穷举 256 全过
        HOUSE_NETLIST.push(hex"000000020000020000000500000800000009000009000000060000060000000900000b0000000600000a0000000d00000d0000000300000e000000030000030000000c0000100000000f0000110000000700000700000012000012000000130000140000000700001200000016000016000000040000170000000400000400000015000019000000000000000000001800001a0000001b00001b"); // t4 清仓 · 22 门 · 6b 进 · 穷举 64 全过
        HOUSE_NETLIST.push(hex"000000040000040000000200000700000005000005000000080000080000000900000a000000050000080000000c00000c0000000300000d000000030000030000000b00000f0000000e00001000000006000006000000110000110000000b00000b0000000300000c0000000f00001400000015000016000000120000170000001200001300000018000018"); // t5 抄底 · 20 门 · 5b 进 · 穷举 32 全过
        HOUSE_NETLIST.push(hex"00000002000002000000050000050000000200000d0000000800000e000000080000080000000c0000100000000f000011000000020000100000000b0000130000000b00000b0000001200001500000014000016000000030000030000001700001800000019000019000000130000180000001b00001b0000000600001c000000060000060000001a00001e0000001d00001f0000000e00000e00000015000021000000140000140000000300002300000018000022000000240000250000001700001700000003000027000000060000280000001e0000260000002900002a0000000900002b000000090000090000002000002d0000002c00002e000000040000040000002f000030000000310000310000001300001300000003000033000000090000340000001c00002d00000035000036000000300000370000003800003800000007000039000000070000070000003200003b0000003a00003c0000000300000b0000002500003e0000002200002200000003000040000000060000410000001e00003f0000004200004300000018000023000000450000450000000b00001800000024000047000000090000480000002d0000460000004900004a0000000400004b000000300000440000004c00004d0000002f00002f0000000400004f000000070000500000003b00004e000000510000520000000a0000530000000a00000a0000003d000055000000080000210000005700005700000015000058000000590000590000001800005a0000005b00005b0000001e00005c0000005d00005d000000130000150000005f00005f0000000300006000000018000040000000610000620000000300005a00000064000064000000060000650000001e00006300000066000067000000090000680000002d00005e0000006900006a0000003000006b0000006c00006c0000003b00006d0000006e00006e000000030000150000006200007000000041000041000000060000720000001e0000710000007300007400000018000060000000760000760000001500001800000061000078000000090000790000002d0000770000007a00007b0000000400007c000000300000750000007d00007e0000000400006b00000080000080000000070000810000003b00007f000000820000830000000a0000840000005500006f0000005400005600000085000086"); // t6 杠杆 · 125 门 · 10b 进 · 穷举 1024 全过
        HOUSE_NETLIST.push(hex"000000020000020000000600000a000000070000070000000b00000c0000000d00000d0000000b00000b0000000700000f00000003000010000000030000030000000e00001200000011000013000000080000080000001400001500000016000016000000140000140000000800001800000004000019000000040000040000001700001b0000001a00001c000000090000090000001d00001e0000001f00001f0000001d00001d00000009000021000000050000220000000500000500000020000024000000000000000000002300002500000026000026"); // t7 钻石手 · 31 门 · 8b 进 · 穷举 256 全过
        HOUSE_NETLIST.push(hex"000000030000030000000500000700000006000006000000080000090000000a00000a000000080000080000000600000c0000000400000d000000040000040000000b00000f0000000e00001000000011000011000000000000000000000200001200000013000013"); // t8 封控 · 15 门 · 5b 进 · 穷举 32 全过
        HOUSE_NETLIST.push(hex"000000060000060000000200000f0000000a00000a00000010000010000000110000120000000e0000130000000e00000e0000001000001500000014000016000000030000030000001700001800000019000019000000030000120000000700001b000000070000070000001a00001d0000001c00001e00000012000015000000020000110000000e000021000000220000220000000300002300000018000020000000240000250000001700001700000003000027000000070000280000001d0000260000002900002a0000000b00002b0000000b00000b0000001f00002d0000002c00002e000000040000040000002f0000300000003100003100000010000018000000330000330000001d0000340000001c000035000000360000360000000400003700000008000038000000080000080000003200003a0000003900003b0000000300000e0000002500003d000000200000200000000300003f000000070000400000001d00003e0000004100004200000018000023000000440000440000000e000018000000240000460000000b0000470000002d000045000000480000490000000400004a000000300000430000004b00004c0000002f00002f0000000400004e0000000800004f0000003a00004d000000500000510000000c0000520000000c00000c0000003c00005400000053000055000000050000050000005600005700000058000058000000300000360000005a00005a0000003a00005b0000003900005c0000005d00005d0000000500005e0000000900005f0000000900000900000059000061000000600000620000000400000e0000004c0000640000004300004300000004000066000000080000670000003a000065000000680000690000003000004a0000006b00006b0000000e0000300000004b00006d0000000c00006e0000005400006c0000006f000070000000050000710000005700006a0000007200007300000056000056000000050000750000000900007600000061000074000000770000780000000d0000790000000d00000d0000006300007b0000000a0000120000007d00007d0000001500007e0000007f00007f00000018000080000000810000810000001d000082000000830000830000001500002100000085000085000000030000860000001800003f00000087000088000000030000800000008a00008a0000000700008b0000001d0000890000008c00008d0000000b00008e0000002d0000840000008f00009000000030000091000000920000920000003a00009300000094000094000000030000150000008800009600000040000040000000070000980000001d0000970000009900009a000000180000860000009c00009c000000150000180000008700009e0000000b00009f0000002d00009d000000a00000a1000000040000a20000003000009b000000a30000a400000004000091000000a60000a6000000080000a70000003a0000a5000000a80000a90000000c0000aa00000054000095000000ab0000ac000000570000ad000000ae0000ae000000610000af000000b00000b000000004000015000000a40000b20000000400009b000000b40000b4000000080000b50000003a0000b3000000b60000b7000000300000a2000000b90000b900000015000030000000a30000bb0000000c0000bc000000540000ba000000bd0000be000000050000bf000000570000b8000000c00000c1000000050000ad000000c30000c3000000090000c4000000610000c2000000c50000c60000000d0000c70000007b0000b10000007a00007c000000c80000c9"); // t9 双签 · 189 门 · 13b 进 · 穷举 8192 全过
        HOUSE_NETLIST.push(hex"0000000a00000a0000000c00000e000000060000060000000f00000f000000100000110000001200001200000002000013000000020000100000000d0000150000000d00000d0000001400001700000016000018000000140000140000000d00001a0000000b00001b0000000b00000b0000001900001d0000001c00001e000000070000070000001f00001f000000200000210000000f000017000000230000230000000d0000110000000b0000250000001d000024000000260000270000000700001f000000200000280000002900002a0000000300002b000000030000030000002200002d0000002c00002e000000080000080000002f00002f000000300000310000000800002f00000028000030000000330000340000000400003500000004000004000000320000370000003600003800000009000009000000390000390000003a00003b000000090000390000002800003a0000003d00003e0000000500003f000000050000050000003c000041000000150000150000000d0000430000001700001a000000440000450000001b00001b0000000b0000470000001d000046000000480000490000002000004a0000004b00004b000000250000250000000b00004d0000001d0000230000004e00004f0000000700004a0000002000005000000051000052000000030000530000002d00004c00000054000055000000300000560000005700005700000008000056000000300000500000005900005a0000000400005b000000370000580000005c00005d0000003a00005e0000005f00005f0000000900005e0000003a0000500000006100006200000005000063000000410000600000004000004200000064000065"); // t10 会签 · 90 门 · 12b 进 · 穷举 4096 全过
        HOUSE_NETLIST.push(hex"00000002000003000000000000000000000400000400000005000005"); // t11 委托 · 4 门 · 2b 进 · 穷举 4 全过
        HOUSE_NIN = [7,6,1,8,6,5,10,8,5,13,12,2];
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
    /// @dev 三档 = 单包(1)/十连(10)/百连(100)，单包价统一 0.002 BNB：
    ///      0.002 / 0.02 / 0.2 正好是 数量 × 单包价。第一个包当场铸造，
    ///      其余记入 pendingBonusPacks（claimDailyPack 逐包领取、无冷却），
    ///      避免百连铸造 100 个包 ID 的 gas 尖峰。
    function buyPack(uint8 tier) external payable onlyAgent returns (uint256 packId) {
        if (tier >= 3) revert BadTier();
        uint256 price = TIER_PRICE[tier];
        if (msg.value != price) revert BadValue();

        // 防女巫双阀：创世限量绝版 + 每身份每日总量
        if (tier == GENESIS_TIER) {
            if (genesisSold >= GENESIS_MAX) revert GenesisSoldOut();
            genesisSold++;
        }
        uint16 qty = TIER_QTY[tier];
        Player storage p = players[msg.sender];
        uint64 day = uint64(block.timestamp / 1 days);
        if (p.buyDay != day) { p.buyDay = day; p.boughtToday = 0; }
        if (uint256(p.boughtToday) + qty > BUY_DAILY_CAP) revert DailyBuyCap();
        p.boughtToday += qty;
        if (qty > 1) pendingBonusPacks[msg.sender] += qty - 1; // 先记账（effects）

        packId = _newPack(msg.sender, tier);
        emit PackBought(packId, msg.sender, tier);

        uint256 half = price / 2; // 后转账（interactions）
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

    /*──────────────────── 6 · 穿卡 + 流片 ────────────────────*/
    /// @notice 流片：把参数卡升级为真身 circuit NFT（进卡主钱包，可装备/可转售）。
    ///         付款 = 门数 × NAND 铸价 + 协议费 + tapeout 费（处理器实时报价，无溢价）。
    ///         NAND 逐门烧掉 = 本项目持续收入（见 docs/economy.md）。
    /// @notice 流片。官方 transistor 用 BEM 买 NAND、用 BNB 付 tapeout 费：
    ///         调用方需先 approve(bemToken, core, nandCost)，再带 tapeCost() 的 BNB 调本函数。
    ///         bemToken = 0 时为旧版 Mock 路径（NAND 也用 BNB 付），供本地/测试网 E2E。
    function tapeOut(uint256 cardId) external payable {
        if (tapeProcessor == address(0)) revert NoProcessor();
        if (_owners[cardId] != msg.sender) revert NotCardOwner();
        CardInfo memory c = cardInfo[cardId];
        if (c.kind != 0) revert NotCircuitCard();
        if (cardCircuit[cardId] != 0) revert AlreadyTaped();

        (uint256 bemAmount, uint256 gates) = tapeNandCost(cardId);
        ITapeOutProcessor proc = ITapeOutProcessor(tapeProcessor);
        address trans = proc.transistors();
        uint256 tapeFee = proc.TAPEOUT_FEE();
        uint256 expected = bemToken == address(0) ? bemAmount + tapeFee : tapeFee;
        if (msg.value != expected) revert BadValue();

        if (bemToken != address(0)) {
            // 官方 TapeOut：BEM → Core → approve → transistor.mint()（mint 不收原生币）
            if (!IBEM(bemToken).transferFrom(msg.sender, address(this), bemAmount)) revert BadBEM();
            if (IBEM(bemToken).allowance(address(this), trans) != 0) IBEM(bemToken).approve(trans, 0);
            if (!IBEM(bemToken).approve(trans, bemAmount)) revert BadBEM();
            ITransistors(trans).mint(0, gates);
        } else {
            // 旧版 Mock：NAND 也是原生 BNB
            ITransistors(trans).mint{value: bemAmount}(0, gates);
        }

        uint256 circuitId = proc.tapeout{value: tapeFee}(nlOf(c, gates), HOUSE_NIN[uint8(c.ref % HOUSE_CARDS)], HOUSE_NOUT);
        proc.transferFrom(address(this), msg.sender, circuitId); // circuit NFT 进卡主钱包

        cardCircuit[cardId] = circuitId;
        emit CardTaped(cardId, circuitId, msg.sender, expected);
    }

    function nlOf(CardInfo memory c, uint256 gates) internal view returns (bytes memory) {
        bytes memory nl = HOUSE_NETLIST[c.ref % HOUSE_CARDS];
        require(nl.length / 7 == gates, "bad netlist");
        return nl;
    }

    /// @notice NAND 部分的 BEM 报价（与 tapeCost 的 BNB 报价分开）
    function tapeNandCost(uint256 cardId) public view returns (uint256 bemAmount, uint256 gates) {
        if (tapeProcessor == address(0)) revert NoProcessor();
        if (_owners[cardId] == address(0)) revert NoSuchCard();
        CardInfo memory c = cardInfo[cardId];
        gates = HOUSE_NETLIST[c.ref % HOUSE_CARDS].length / 7;
        address trans = ITapeOutProcessor(tapeProcessor).transistors();
        bemAmount = gates * ITransistors(trans).mintPrice() + ITransistors(trans).protocolFee();
    }

    /// @notice 这张卡流片要付的 BNB（官方 transistor 只含 tapeout 费；NAND 另付 BEM）
    function tapeCost(uint256 cardId) external view returns (uint256 cost, uint256 gates) {
        (uint256 bemAmount, uint256 g) = tapeNandCost(cardId);
        gates = g;
        uint256 tapeFee = ITapeOutProcessor(tapeProcessor).TAPEOUT_FEE();
        cost = bemToken == address(0) ? bemAmount + tapeFee : tapeFee;
    }

    /// @notice 穿卡：电路卡必须已流片（真身才能装备到身份上）；
    ///         身份卡（kind 1）是注册表规则，无需流片。
    function equip(uint256 cardId) external onlyAgent {
        if (_owners[cardId] != msg.sender) revert NotCardOwner();
        CardInfo memory c = cardInfo[cardId];
        if (c.kind == 0) {
            uint256 cid = cardCircuit[cardId];
            if (cid == 0) revert NotTaped();
            // 电路 NFT 可转售：转走后原卡主不再拥有这条规则的使用权
            if (ITapeOutProcessor(tapeProcessor).ownerOf(cid) != msg.sender) revert NotCircuitOwner();
        }
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
    // house 规则 t = ref % 12，与前端四类卡 0..11 逐位对齐：
    uint8 public constant RULE_LOCKDOWN     = 8;  // 封控：当日一旦被骗，剩余时间全锁
    uint8 public constant RULE_DUAL_SIGN    = 9;  // 双签：超半额需两人批准
    uint8 public constant RULE_MULTISIG     = 10; // 会签：超额需 M 人批准
    uint8 public constant RULE_DELEGATION   = 11; // 委托：限时窗口内放行
    uint8 public constant RULE_NAMED_PAYEE  = 12; // 身份卡（kind1 独立命名空间）：只付给正主

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
        else if (ruleType == RULE_COOLDOWN) {
            uint256 cut = uint256(c.rarity) * 300 + uint256(c.star) * 120;
            p1 = cut < 3600 ? 3600 - cut : 300; // 60 分钟起，最低 5 分钟
        }
        else if (ruleType == RULE_LOCKDOWN)    p1 = 7200 * mult / 100;   // 封控：锁 2 小时 × mult
        else if (ruleType == RULE_DUAL_SIGN)    p1 = 5000 * mult / 100;   // 双签：基准 $50
        else if (ruleType == RULE_MULTISIG)   { p1 = 5000 * mult / 100; p2 = 2 + uint256(c.star) / 2; } // M = 2 + star/2
        else                                    p1 = 12 hours * mult / 100; // 委托：窗口 12h × mult（RULE_DELEGATION）
    }

    /// @notice 复算一笔支付是否守约（view，不改变任何状态）
    /// @dev v3：判定改由真 NAND 电路产生——本函数把运行时事实打包成输入字，
    ///      staticcall 处理器 eval() 读出 (allow, ask)；eval 异常 = fail-closed。
    ///      事实打包：金额按档位上限量化（超限走事实位），收款方身份查注册表，
    ///      审批数/封控态由调用方提供。多因子组合（人工救援、会签、ask/allow）
    ///      全部在电路里完成。参数语义见 docs/four-circuit-families.md。
    function checkPayment(
        address agent,
        uint256 amountCents,
        address payee,
        uint256 spentTodayCents,
        uint16 txCountToday,
        uint64 lastPaymentAt,
        bool humanApproved,
        uint8 approvals,
        bool trippedToday
    ) external view returns (bool ok, string memory reason) {
        uint256 cardId = activeCircuit[agent];
        if (cardId == 0) return (false, "no rule equipped");
        uint256 circuitId = cardCircuit[cardId];
        (uint8 t, uint256 p1, uint256 p2) = ruleOf(cardId);

        // 身份卡：注册表规则，不在 NAND 命名空间里，无需流片
        if (t == RULE_NAMED_PAYEE) {
            if (uint256(uint160(payee)) == p1) return (true, "designated payee");
            return (false, "not the designated payee");
        }
        if (circuitId == 0) revert NotTaped(); // 真身判定需要已流片
        // 电路 NFT 被转售后，判定立即失效（fail-closed），不能被原主人继续引用
        if (ITapeOutProcessor(tapeProcessor).ownerOf(circuitId) != ownerOf(cardId)) {
            return (false, "circuit not owned by card owner");
        }

        PayCtx memory c = PayCtx(amountCents, payee, spentTodayCents, txCountToday, lastPaymentAt, humanApproved, approvals, trippedToday);
        uint256 word = _packInputs(t, p1, p2, c);
        (bool good, bytes memory ret) = tapeProcessor.staticcall(
            abi.encodeWithSelector(ITapeOutProcessor.eval.selector, circuitId, _wordBytes(word, HOUSE_NIN[t]))
        );
        if (!good || ret.length < 64) return (false, "eval failed: fail-closed"); // 宁拒不猜
        bytes memory verdictBytes = abi.decode(ret, (bytes));
        if (verdictBytes.length < 1) return (false, "eval empty: fail-closed");
        uint8 verdict = uint8(verdictBytes[0]);
        bool allow = (verdict & 1) == 1;
        bool ask = (verdict >> 1) & 1 == 1;
        return _verdict(t, p1, amountCents, spentTodayCents, lastPaymentAt, txCountToday, allow, ask);
    }

    struct PayCtx {
        uint256 amount; address payee; uint256 spent; uint256 count;
        uint256 last; bool human; uint8 appr; bool tripped;
    }

    /// @dev uint256 → 输入字节串（低位在前，与 TapeOut eval 的 input[i/8] 位序一致）
    function _wordBytes(uint256 w, uint256 nIn) internal pure returns (bytes memory b) {
        uint256 n = (nIn + 7) / 8;
        b = new bytes(n);
        for (uint256 i = 0; i < n; i++) b[i] = bytes1(uint8(w >> (8 * i)));
    }

    /// @dev 打包输入字（低位在前，字段顺序与 tools/mint12.mjs 的 spec 一致）
    ///      金额→电路是"事实翻译"：Solidity 先算 cents 是否越界，再把它写成
    ///      比较位的取值——被比较量固定为 2，阈值位"满足=2 / 违反=1"，
    ///      于是电路里的 a<=b 恰好等价于事实成立。多因子组合（人工救援 /
    ///      半闸 / 双签 / 会签 / 封锁窗口）仍只能由 NAND 网表给出。
    function _packInputs(uint8 t, uint256 p1, uint256 p2, PayCtx memory c)
        internal view returns (uint256 w)
    {
        uint256 amount = c.amount; uint256 spent = c.spent;
        uint256 count = c.count; uint256 last = c.last; bool human = c.human;
        uint8 appr = c.appr; bool tripped = c.tripped;
        bool payeeOk = isAgentIdHolder(c.payee);
        // 事实位：满足=2，违反=1；电路里 a<=b 因此精确等于事实成立
        uint256 ok2 = 2;

        if (t == RULE_DAILY_CAP) {          // amount3 left3 human
            bool within = amount + spent <= p1;
            w = ok2 | ((within ? ok2 : 1) << 3) | (uint256(human ? 1 : 0) << 6);
        } else if (t == RULE_SINGLE_MAX) {  // amount3 cap3
            bool within = amount <= p1;
            w = ok2 | ((within ? ok2 : 1) << 3);
        } else if (t == RULE_AGENT_ONLY) {  // payee1
            w = payeeOk ? 1 : 0;
        } else if (t == RULE_GROWTH) {      // amount4 grown3 human
            uint256 grown = p1 * (100 + count * 2) / 100;
            bool within = amount <= grown;
            w = ok2 | ((within ? ok2 : 1) << 4) | (uint256(human ? 1 : 0) << 7);
        } else if (t == RULE_DAILY_COUNT) { // paid3 limit3 (paid < limit)
            w = ok2 | ((count < p1 ? 3 : 1) << 3);
        } else if (t == RULE_MICRO_PASS) {  // amount2 micro2 human
            bool within = amount <= p1;
            w = ok2 | ((within ? ok2 : 1) << 2) | (uint256(human ? 1 : 0) << 4);
        } else if (t == RULE_HIGH_LIMIT) {  // amount3 half3 cap3 human
            bool withinCap = amount <= p1;
            bool withinHalf = amount * 2 <= p1;
            w = ok2 | ((withinHalf ? ok2 : 1) << 3) | ((withinCap ? ok2 : 1) << 6) | (uint256(human ? 1 : 0) << 9);
        } else if (t == RULE_COOLDOWN) {    // elapsed4 cool4 (elapsed >= cool)
            bool enough = last == 0 || block.timestamp >= last + p1;
            w = uint256(1) | ((enough ? 1 : 2) << 4);
        } else if (t == RULE_LOCKDOWN) {    // tripped1 elapsed2 lock2
            bool enough = last != 0 && block.timestamp >= last + p1;
            w = (tripped ? 1 : 0) | (uint256(1) << 1) | ((enough ? 1 : 2) << 3);
        } else if (t == RULE_DUAL_SIGN) {   // amount4 half4 cap4 appr1
            bool withinCap = amount <= p1;
            bool withinHalf = amount * 2 <= p1;
            w = ok2 | ((withinHalf ? ok2 : 1) << 4) | ((withinCap ? ok2 : 1) << 8) | (uint256(appr >= 2 ? 1 : 0) << 12);
        } else if (t == RULE_MULTISIG) {    // amount4 cap4 appr2 need2
            bool withinCap = amount <= p1;
            w = ok2 | ((withinCap ? ok2 : 1) << 4) | (uint256(appr > 3 ? 3 : appr) << 8) | (uint256(p2 > 3 ? 3 : p2) << 10);
        } else {                            // RULE_DELEGATION window1 payee1
            bool window = last != 0 && block.timestamp <= last + p1;
            w = (window ? 1 : 0) | ((payeeOk ? 1 : 0) << 1);
        }
    }

    /// @dev 电路判定 → (ok, 人类可读理由)；字符串与 v2 逐条对齐
    function _verdict(
        uint8 t, uint256 p1, uint256 amount, uint256 spent, uint256 last, uint256 count,
        bool allow, bool ask
    ) internal pure returns (bool ok, string memory reason) {
        if (t == RULE_DAILY_CAP) {
            if (allow) return (true, amount + spent <= p1 ? "within daily cap" : "over cap, human approved");
            return (false, "daily cap exceeded");
        }
        if (t == RULE_SINGLE_MAX) return allow ? (true, "within single max") : (false, "single payment too large");
        if (t == RULE_AGENT_ONLY) return allow ? (true, "payee holds Agent ID") : (false, "payee has no Agent ID");
        if (t == RULE_GROWTH) {
            if (allow) return (true, "within growing cap");
            return ask ? (false, "growing cap exceeded") : (false, "growing cap exceeded");
        }
        if (t == RULE_DAILY_COUNT) return allow ? (true, "within daily count") : (false, "daily tx count reached");
        if (t == RULE_MICRO_PASS) {
            if (allow) return amount <= p1 ? (true, "micro payment, no approval") : (true, "human approved");
            return (false, "needs human approval");
        }
        if (t == RULE_HIGH_LIMIT) {
            if (allow) return (true, "within high limit");
            if (ask) return (false, "over half limit, needs human");
            return (false, "over high limit");
        }
        if (t == RULE_COOLDOWN) return allow ? (true, "cooldown satisfied") : (false, "cooldown not elapsed");
        if (t == RULE_LOCKDOWN) return allow ? (true, "not locked") : (false, "lockdown active");
        if (t == RULE_DUAL_SIGN) {
            if (allow) return amount * 2 <= p1 ? (true, "within half, no second sig") : (true, "two approvals");
            if (ask) return (false, "needs two approvals");
            return (false, "over dual-sig ceiling");
        }
        if (t == RULE_MULTISIG) {
            if (allow) return amount <= p1 ? (true, "within multisig ceiling") : (true, "quorum reached");
            return (false, "quorum not reached");
        }
        if (t == RULE_NAMED_PAYEE) revert("named payee handled in Solidity");
        // RULE_DELEGATION
        if (allow) return (true, "within delegation window");
        if (last == 0) return (false, "no delegation anchor");
        return (false, "delegation window expired");
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
