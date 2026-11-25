// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PublicTapeOut — 任何人可把 12 条官方 NAND 网表之一直接流片成 circuit NFT
/// @notice 不要求 Agent ID、不要求持有卡（未流片的卡只是本地数据）。
///         付款：BEM（买 NAND，进 transistor 的 creator，即我们）+ BNB（tapeout 费）。
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
    event MinBemCostUpdated(uint256 oldValue, uint256 newValue);
    event BemSwept(address indexed to, uint256 amount);

    ICoreNetlists public immutable core;
    IPTapeOut public immutable proc;
    IBEM20 public immutable bem;
    uint8 public constant RULES = 12;
    uint32 public constant NOUT = 2;

    address public owner;
    /// @notice BEM 计价下限（raw，8 位小数）。默认 52_030_000 ≈ $5.00 @ $9.61/BEM
    ///         低价卡（4~22 门）按这个下限收，让所有电路卡价格集中在 $5 以上。
    uint256 public minBemCost;

    constructor(address core_, address proc_, address bem_) {
        if (core_ == address(0) || proc_ == address(0) || bem_ == address(0)) revert NoProcessor();
        core = ICoreNetlists(core_);
        proc = IPTapeOut(proc_);
        bem = IBEM20(bem_);
        owner = msg.sender;
        minBemCost = 52_030_000;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @notice 按 BEM 美元价调整下限；报价与收款立刻生效
    function setMinBemCost(uint256 value) external onlyOwner {
        emit MinBemCostUpdated(minBemCost, value);
        minBemCost = value;
    }

    /// @notice 提取低价卡多付的 BEM（下限与实际 NAND 成本的差额）
    function sweepBem(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (!bem.transfer(to, amount)) revert BadBEM();
        emit BemSwept(to, amount);
    }

    /// @notice 报价：BEM（NAND + 协议费，含 $5 下限）与 BNB（tapeout 费）分开
    function quote(uint8 rule) public view returns (uint256 bemCost, uint256 bnbCost, uint256 gates, uint32 nIn) {
        if (rule >= RULES) revert BadRule();
        bytes memory nl = core.HOUSE_NETLIST(rule);
        gates = nl.length / 7;
        nIn = core.HOUSE_NIN(rule);
        address trans = proc.transistors();
        uint256 raw = gates * IPTTransistors(trans).mintPrice() + IPTTransistors(trans).protocolFee();
        bemCost = raw > minBemCost ? raw : minBemCost;
        bnbCost = proc.TAPEOUT_FEE();
    }

    /// @notice 直接流片。先 approve(bem, address(this), bemCost)，再带 bnbCost 调本函数。
    function tapeoutRaw(uint8 rule) external payable returns (uint256 circuitId) {
        (uint256 bemCost, uint256 bnbCost, uint256 gates, uint32 nIn) = quote(rule);
        if (msg.value != bnbCost) revert BadValue();

        address trans = proc.transistors();
        if (!bem.transferFrom(msg.sender, address(this), bemCost)) revert BadBEM();
        if (bem.allowance(address(this), trans) != 0) bem.approve(trans, 0);
        if (!bem.approve(trans, bemCost)) revert BadBEM();
        IPTTransistors(trans).mint(0, gates); // 官方 transistor 用 BEM，不收原生币
        // 下限高于实际 NAND 成本时，剩余额度留在合约里由 owner sweep，别留给 transistor
        if (bem.allowance(address(this), trans) != 0) bem.approve(trans, 0);

        circuitId = proc.tapeout{value: bnbCost}(core.HOUSE_NETLIST(rule), nIn, NOUT);
        proc.transferFrom(address(this), msg.sender, circuitId); // NFT 直接进调用者钱包
        emit PublicTaped(msg.sender, rule, circuitId, bemCost, bnbCost);
    }
}
