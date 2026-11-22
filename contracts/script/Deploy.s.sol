// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {AgentPackCore} from "../src/AgentPackCore.sol";
import {MockAgentIdRegistry} from "../test/AgentPackCore.t.sol";

/// @notice 本地 Anvil / BSC 测试网：先部署 Mock 注册表，再部署主合约
contract DeployLocal is Script {
    function run() external returns (AgentPackCore core, MockAgentIdRegistry reg) {
        vm.startBroadcast();
        reg = new MockAgentIdRegistry();
        core = new AgentPackCore(address(reg), msg.sender); // 本地：奖池=部署者
        reg.give(msg.sender); // 给部署者发一个 .ai 便于全流程测试
        vm.stopBroadcast();
    }
}

/// @notice BNB 智能链主网：官方 Agent ID 注册表 + 公示奖池
contract DeployMainnet is Script {
    address constant OFFICIAL_REGISTRY = 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F;

    function run() external returns (AgentPackCore core) {
        address registry = vm.envOr("AGENT_ID_REGISTRY", OFFICIAL_REGISTRY);
        // ⚠ PRIZE_POOL 必须是公示地址（建议多签）；env 未设时回退 msg.sender 仅便于冒烟
        address prize = vm.envOr("PRIZE_POOL", msg.sender);
        vm.startBroadcast();
        core = new AgentPackCore(registry, prize);
        vm.stopBroadcast();
    }
}
