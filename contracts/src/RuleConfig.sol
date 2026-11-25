// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title RuleConfig — 不可变电路 + 用户可签名参数（TapeID 同款模型）
/// @notice 电路字节永远不变；用户只能改自己钱包下某条规则的数字参数（额度/冷却/窗口）。
///         单位由规则决定：t0/t2 = 美分，t7 = 秒，t11 = 秒。任何人可读取，用于守门判定。
contract RuleConfig {
    error BadValue();

    event OverrideSet(address indexed who, uint256 indexed rule, uint256 value, uint64 updatedAt);

    mapping(address => mapping(uint256 => uint256)) public overrideValue;
    mapping(address => mapping(uint256 => uint64)) public updatedAt;

    /// @notice 设置参数。value=0 表示清除回退到卡档位默认值。
    function setOverride(uint256 rule, uint256 value) external {
        if (rule > 11) revert BadValue();
        overrideValue[msg.sender][rule] = value;
        updatedAt[msg.sender][rule] = uint64(block.timestamp);
        emit OverrideSet(msg.sender, rule, value, uint64(block.timestamp));
    }

    function getOverride(address who, uint256 rule) external view returns (uint256 value, uint64 at) {
        return (overrideValue[who][rule], updatedAt[who][rule]);
    }
}
