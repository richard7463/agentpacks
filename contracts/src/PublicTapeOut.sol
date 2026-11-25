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

    /// @notice 直接流片。先 approve(bem, address(this), quote(rule))，再带 bnbCost 调本函数。
    function tapeoutRaw(uint8 rule) external payable returns (uint256 circuitId) {
        (uint256 bemCost, uint256 bnbCost, uint256 gates, uint32 nIn) = quote(rule);
        if (msg.value != bnbCost) revert BadValue();

        address trans = proc.transistors();
        uint256 nand = gates * IPTTransistors(trans).mintPrice() + IPTTransistors(trans).protocolFee();
        if (!bem.transferFrom(msg.sender, address(this), bemCost)) revert BadBEM();

        // 只授权真实 NAND 成本，多余额度不留给 transistor
        if (bem.allowance(address(this), trans) != 0) bem.approve(trans, 0);
        if (!bem.approve(trans, nand)) revert BadBEM();
        IPTTransistors(trans).mint(0, gates); // 官方 transistor 用 BEM，不收原生币
        if (bem.allowance(address(this), trans) != 0) bem.approve(trans, 0);

        // 用户价里高出真实 NAND 成本的部分（含 $5 下限差额）自动转我们的 treasury
        uint256 extra = bemCost - nand;
        if (extra > 0 && !bem.transfer(treasury, extra)) revert BadBEM();

        circuitId = proc.tapeout{value: bnbCost}(core.HOUSE_NETLIST(rule), nIn, NOUT);
        proc.transferFrom(address(this), msg.sender, circuitId); // NFT 直接进调用者钱包
        emit BemToTreasury(treasury, extra);
        emit PublicTaped(msg.sender, rule, circuitId, bemCost, bnbCost);
    }
}
