// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRuleOracle {
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
    ) external view returns (bool ok, string memory reason);
}

/// @title GuardVault — 卡灵的闸门
/// @notice 钱从这里走，卡才从"建议"变成"法律"。
///         每个用户一个独立金库；owner 管钱与费率，agent（热钱包 / AI）
///         只能发起付款，超规则一律 revert。判定完全来自 AgentPackCore.checkPayment
///         ——也就是流片后的真 NAND 电路，任何人可复算。
contract GuardVault {
    error NotOwner();
    error NotOperator();
    error NoFunds();
    error BadRate();
    error Blocked(string reason);

    event Deposited(address indexed who, uint256 amount);
    event Withdrawn(address indexed who, uint256 amount);
    event RateSet(address indexed who, uint256 weiPerCent);
    event AgentSet(address indexed who, address agent);
    event Tripped(address indexed who, bool state);
    event Paid(
        address indexed who,
        address indexed to,
        uint256 amountWei,
        uint256 amountCents,
        uint256 circuitId,
        string reason
    );

    struct Spend {
        uint256 day;
        uint256 spentCents;
        uint16 count;
        uint64 lastAt;
        bool tripped;
    }

    IRuleOracle public immutable core;

    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public rateWeiPerCent; // 1 美分 = 多少 wei
    mapping(address => address) public agentOf;
    mapping(address => bool) public approvePending;
    mapping(address => Spend) public spendOf;

    constructor(address core_) {
        core = IRuleOracle(core_);
    }

    /*──────── 资金 ────────*/

    function deposit() external payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        if (amount > balanceOf[msg.sender]) revert NoFunds();
        balanceOf[msg.sender] -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "withdraw failed");
        emit Withdrawn(msg.sender, amount);
    }

    /*──────── 配置 ────────*/

    /// @notice 设定"1 美分 = 多少 wei"（由 owner 声明，agent 改不了）
    function setRate(uint256 weiPerCent) external {
        if (weiPerCent == 0) revert BadRate();
        rateWeiPerCent[msg.sender] = weiPerCent;
        emit RateSet(msg.sender, weiPerCent);
    }

    /// @notice 授权一个热钱包 / AI agent 代为发起付款
    function setAgent(address a) external {
        agentOf[msg.sender] = a;
        emit AgentSet(msg.sender, a);
    }

    /// @notice owner 给下一笔"人工放行"（一次性，用完即焚）
    function approveNext() external {
        approvePending[msg.sender] = true;
    }

    /// @notice 标记今日被骗（触发封控卡的全线锁死）
    function setTripped(bool state) external {
        spendOf[msg.sender].tripped = state;
        emit Tripped(msg.sender, state);
    }

    /*──────── 付款 ────────*/

    /// @notice 从自己的金库付款。规则不通过 → revert（fail-closed）。
    /// @param to 收款方
    /// @param amountWei 金额（wei）
    /// @param approvals 会签人数（双签/会签卡用）
    /// @return cents 本次按费率折算的美分
    function pay(address to, uint256 amountWei, uint8 approvals)
        external
        returns (uint256 cents)
    {
        return _pay(msg.sender, to, amountWei, approvals);
    }

    /// @notice agent 代 owner 付款（principal 必须是授权了自己的地址）
    function payFor(address principal, address to, uint256 amountWei, uint8 approvals)
        external
        returns (uint256 cents)
    {
        if (agentOf[principal] != msg.sender) revert NotOperator();
        return _pay(principal, to, amountWei, approvals);
    }

    function _pay(address principal, address to, uint256 amountWei, uint8 approvals)
        internal
        returns (uint256 cents)
    {
        if (amountWei > balanceOf[principal]) revert NoFunds();
        uint256 rate = rateWeiPerCent[principal];
        if (rate == 0) revert BadRate();
        cents = amountWei / rate;

        Spend storage s = spendOf[principal];
        uint256 day = block.timestamp / 1 days;
        if (s.day != day) {
            s.day = day;
            s.spentCents = 0;
            s.count = 0;
        }

        bool human = approvePending[principal];
        if (human) approvePending[principal] = false;

        (bool ok, string memory reason) = core.checkPayment(
            principal, cents, to, s.spentCents, s.count, s.lastAt, human, approvals, s.tripped
        );
        if (!ok) revert Blocked(reason);

        s.spentCents += cents;
        s.count += 1;
        s.lastAt = uint64(block.timestamp);
        balanceOf[principal] -= amountWei;

        (bool sent, ) = to.call{value: amountWei}("");
        require(sent, "transfer failed");

        emit Paid(principal, to, amountWei, cents, 0, reason);
    }

    /// @notice 只读预演：这笔会不会被拦（前端 / agent 先问再发）
    function preview(address principal, address to, uint256 amountWei, uint8 approvals)
        external
        view
        returns (bool ok, string memory reason, uint256 cents)
    {
        uint256 rate = rateWeiPerCent[principal];
        if (rate == 0) return (false, "rate not set", 0);
        cents = amountWei / rate;
        Spend memory s = spendOf[principal];
        bool human = approvePending[principal];
        (ok, reason) = core.checkPayment(
            principal, cents, to, s.spentCents, s.count, s.lastAt, human, approvals, s.tripped
        );
    }
}
