// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PublicTapeOut — 任何人可把「已开放」的官方 NAND 网表直接流片成 circuit NFT
/// @notice 当前只开放 4 条规则（t0 止损 / t2 风控 / t7 钻石手 / t11 委托），价格收窄到 $5~$12。
///         付款：BEM（买 NAND，NAND 钱进 transistor creator + 差价自动进 treasury）+ BNB（tapeout 费）。
///         规则字节与参数直接读 AgentPackCore 的公开网表，任何人可逐门复算。
interface ICoreNetlists {
    function HOUSE_NETLIST(uint256 i) external view returns (bytes memory);
    function HOUSE_NIN(uint256 i) external view returns (uint32);
}
interface IPTapeOut {
    function tapeout(bytes calldata nl, uint32 nIn, uint32 nOut) external payable returns (uint256 id);
    function transistors() external view returns (address);
    function TAPEOUT_FEE() external view returns (uint256);
    function transferFrom(address from, address to, uint256 id) external;
}
interface IPTTransistors {
    function mintPrice() external view returns (uint256);
    function protocolFee() external view returns (uint256);
    function mint(uint256 id, uint256 amount) external payable;
}
interface IBEM20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract PublicTapeOut {
    error BadRule();
    error BadValue();
    error BadBEM();
    error NoProcessor();
    error NotOwner();
    error ZeroAddress();
    error BadMeta();

    /// @notice 用户/前端提供的元数据（一次写全，避免以后改合约）
    struct MetaInput {
        string cardName;        // 来源卡名，如「止损电路」
        uint8 rarity;           // 0..6
        uint8 star;             // 0..5
        uint32 sourceCardId;    // 0 = 实验室直接流片
        uint256 paramValue;     // 用户设定的数字（额度/冷却/窗口）
        uint256 paramValue2;    // 第二参数（会签人数/试付金额等）
        uint8 paramUnit;        // 0 无 / 1 美分 / 2 秒 / 3 笔
        uint8 approvals;        // 需要的批准人数
        uint8 printType;        // 0 无 / 1 Gold / 2 Black / 3 Genesis
        uint32 printEdition;    // 印次编号
        uint16 series;          // 战季/系列
        uint16 campaignId;      // 活动 id
        address referrer;       // 邀请人 / KOL
        bytes32 payeeRoot;      // 收款方白名单根
        uint32 flags;           // 位标记（failClosed 等）
    }

    /// @notice 链上永久保存的完整元数据
    struct CircuitMeta {
        address originalOwner;  // 流片者（NFT 可转手，这个不变）
        address processor;      // 流片用的 processor
        uint8 version;          // 元数据版本
        uint8 rule;             // 规则 id
        uint8 family;           // 0 交易 1 风控 2 安全 3 协作
        uint8 rarity;           // 来源卡稀有度
        uint8 star;             // 来源卡星级
        uint32 sourceCardId;
        string cardName;
        uint32 gates;
        uint32 nIn;
        uint32 nOut;
        bytes32 netlistHash;
        uint256 bemCost;        // 用户付的 BEM raw
        uint256 bnbCost;        // 用户付的 BNB wei
        uint256 nandCost;       // 实际 NAND 成本
        uint256 treasuryExtra;  // 下限多收进 treasury 的部分
        uint256 paramValue;
        uint256 paramValue2;
        uint8 paramUnit;
        uint8 approvals;
        uint8 printType;
        uint32 printEdition;
        uint16 series;
        uint16 campaignId;
        address referrer;
        bytes32 payeeRoot;
        uint32 flags;
        uint64 timestamp;
    }

    struct TapeResult {
        uint256 cid;
        uint256 bemCost;
        uint256 bnbCost;
        uint256 nandCost;
        uint256 extra;
        uint256 gates;
        uint32 nIn;
    }

    mapping(uint256 => CircuitMeta) public meta;

    function getMeta(uint256 circuitId) external view returns (CircuitMeta memory) { return meta[circuitId]; }

    event CircuitMetaSet(uint256 indexed circuitId, address indexed who, uint8 rarity, uint8 star,
        uint8 rule, uint8 printType, address referrer);
    event PublicTaped(address indexed who, uint8 indexed rule, uint256 circuitId, uint256 bemCost, uint256 bnbCost);
    event PriceBoundsUpdated(uint256 minValue, uint256 maxValue);
    event TreasuryUpdated(address oldValue, address newValue);
    event RuleAllowed(uint8 indexed rule, bool allowed);
    event BemToTreasury(address indexed to, uint256 amount);
    event BemSwept(address indexed to, uint256 amount);

    /* official transistor 把 NAND(ERC-1155) 铸给调用者，所以本合约必须能接收 ERC-1155 */
    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;

    ICoreNetlists public immutable core;
    IPTapeOut public immutable proc;
    IBEM20 public immutable bem;
    uint8 public constant RULES = 12;
    uint32 public constant NOUT = 2;

    address public owner;
    /// @notice 我们自己的收款地址：每笔流片里「用户价 - 实际 NAND 成本」的差额自动进这里
    address public treasury;
    /// @notice 目标 NAND 收入 = 每门 1.5 × transistor.mintPrice（主网 ≈ $0.25/门）
    uint256 public constant NAND_MULTIPLIER = 3;
    uint256 public constant NAND_DIVISOR = 2;
    /// @notice BEM 计价上下限（raw，8 位小数）。对齐用户总价 $5~$12（含 BNB 流片费）。
    uint256 public minBemCost;
    uint256 public maxBemCost;
    /// @notice 当前开放的规则：0 止损 / 2 白名单 / 7 钻石手 / 11 委托（四个家族各一条）
    mapping(uint8 => bool) public allowed;

    constructor(address core_, address proc_, address bem_) {
        if (core_ == address(0) || proc_ == address(0) || bem_ == address(0)) revert NoProcessor();
        core = ICoreNetlists(core_);
        proc = IPTapeOut(proc_);
        bem = IBEM20(bem_);
        owner = msg.sender;
        treasury = msg.sender;
        minBemCost = 52_030_000;   // ≈ $5.00 @ $9.61/BEM
        maxBemCost = 123_700_000;  // ≈ $11.89/BEM → 加 BNB 费 ≈ $12
        allowed[0] = true;
        allowed[2] = true;
        allowed[7] = true;
        allowed[11] = true;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setPriceBounds(uint256 minValue, uint256 maxValue) external onlyOwner {
        minBemCost = minValue;
        maxBemCost = maxValue;
        emit PriceBoundsUpdated(minValue, maxValue);
    }

    function setTreasury(address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, to);
        treasury = to;
    }

    function setAllowed(uint8 rule, bool ok) external onlyOwner {
        if (rule >= RULES) revert BadRule();
        allowed[rule] = ok;
        emit RuleAllowed(rule, ok);
    }

    /// @notice 保留旧接口：只改下限，上限不动
    function setMinBemCost(uint256 value) external onlyOwner {
        minBemCost = value;
        emit PriceBoundsUpdated(value, maxBemCost);
    }

    /// @notice 紧急提取（正常流片会自动进 treasury，这里只做兜底）
    function sweepBem(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (!bem.transfer(to, amount)) revert BadBEM();
        emit BemSwept(to, amount);
    }

    /// @notice 报价：含 $5~$12 收窄区间的 BEM + BNB tapeout 费
    function quote(uint8 rule) public view returns (uint256 bemCost, uint256 bnbCost, uint256 gates, uint32 nIn) {
        if (rule >= RULES || !allowed[rule]) revert BadRule();
        bytes memory nl = core.HOUSE_NETLIST(rule);
        gates = nl.length / 7;
        nIn = core.HOUSE_NIN(rule);
        address trans = proc.transistors();
        uint256 perGate = IPTTransistors(trans).mintPrice();
        uint256 target = gates * perGate * NAND_MULTIPLIER / NAND_DIVISOR + IPTTransistors(trans).protocolFee();
        if (target < minBemCost) target = minBemCost;
        if (target > maxBemCost) target = maxBemCost;
        uint256 nand = gates * perGate + IPTTransistors(trans).protocolFee();
        if (target < nand) target = nand; // 绝不自掏腰包补贴
        bemCost = target;
        bnbCost = proc.TAPEOUT_FEE();
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external pure returns (bytes4) { return ERC1155_RECEIVED; }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external pure returns (bytes4) { return ERC1155_BATCH_RECEIVED; }

    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == 0x01ffc9a7 || id == 0x4e2312e0; // ERC-165 / ERC-1155Receiver
    }

    function _family(uint8 rule) internal pure returns (uint8) {
        if (rule == 0) return 0;       // 交易
        if (rule == 7) return 1;       // 风控
        if (rule == 2) return 2;       // 安全
        if (rule == 11) return 3;      // 协作
        return 0;
    }

    function _tape(uint8 rule) internal returns (TapeResult memory r) {
        (r.bemCost, r.bnbCost, r.gates, r.nIn) = quote(rule);
        if (msg.value != r.bnbCost) revert BadValue();

        address trans = proc.transistors();
        r.nandCost = r.gates * IPTTransistors(trans).mintPrice() + IPTTransistors(trans).protocolFee();
        if (!bem.transferFrom(msg.sender, address(this), r.bemCost)) revert BadBEM();

        if (bem.allowance(address(this), trans) != 0) bem.approve(trans, 0);
        if (!bem.approve(trans, r.nandCost)) revert BadBEM();
        IPTTransistors(trans).mint(0, r.gates);
        if (bem.allowance(address(this), trans) != 0) bem.approve(trans, 0);

        r.extra = r.bemCost - r.nandCost;
        if (r.extra > 0 && !bem.transfer(treasury, r.extra)) revert BadBEM();

        r.cid = proc.tapeout{value: r.bnbCost}(core.HOUSE_NETLIST(rule), r.nIn, NOUT);
        proc.transferFrom(address(this), msg.sender, r.cid);
        emit BemToTreasury(treasury, r.extra);
        emit PublicTaped(msg.sender, rule, r.cid, r.bemCost, r.bnbCost);
    }

    function _writeMeta(uint256 cid, uint8 rule, TapeResult memory r, MetaInput memory m) internal {
        meta[cid] = CircuitMeta({
            originalOwner: msg.sender,
            processor: address(proc),
            version: 1,
            rule: rule,
            family: _family(rule),
            rarity: m.rarity,
            star: m.star,
            sourceCardId: m.sourceCardId,
            cardName: m.cardName,
            gates: uint32(r.gates),
            nIn: r.nIn,
            nOut: NOUT,
            netlistHash: keccak256(core.HOUSE_NETLIST(rule)),
            bemCost: r.bemCost,
            bnbCost: r.bnbCost,
            nandCost: r.nandCost,
            treasuryExtra: r.extra,
            paramValue: m.paramValue,
            paramValue2: m.paramValue2,
            paramUnit: m.paramUnit,
            approvals: m.approvals,
            printType: m.printType,
            printEdition: m.printEdition,
            series: m.series,
            campaignId: m.campaignId,
            referrer: m.referrer,
            payeeRoot: m.payeeRoot,
            flags: m.flags,
            timestamp: uint64(block.timestamp)
        });
        emit CircuitMetaSet(cid, msg.sender, m.rarity, m.star, rule, m.printType, m.referrer);
    }

    /// @notice 兼容旧接口：不传元数据的流片
    function tapeoutRaw(uint8 rule) external payable returns (uint256 circuitId) {
        TapeResult memory r = _tape(rule);
        _writeMeta(r.cid, rule, r, MetaInput({
            cardName: "", rarity: 0, star: 0, sourceCardId: 0,
            paramValue: 0, paramValue2: 0, paramUnit: 0, approvals: 0,
            printType: 0, printEdition: 0, series: 0, campaignId: 0,
            referrer: address(0), payeeRoot: bytes32(0), flags: 0
        }));
        return r.cid;
    }

    /// @notice 完整流片：来源卡稀有度/星级/参数/印次/邀请人等全部写进链上
    function tapeoutWithMeta(uint8 rule, MetaInput calldata m) external payable returns (uint256 circuitId) {
        if (m.rarity > 6 || m.star > 5 || m.printType > 3 || m.paramUnit > 3) revert BadMeta();
        TapeResult memory r = _tape(rule);
        _writeMeta(r.cid, rule, r, m);
        return r.cid;
    }
}
