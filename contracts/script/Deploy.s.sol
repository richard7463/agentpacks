// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {MockTapeProcessor} from "../test/mocks/MockTapeProcessor.sol";
import {AgentPackCore} from "../src/AgentPackCore.sol";
import {GuardVault} from "../src/GuardVault.sol";
import {MockAgentIdRegistry} from "../test/AgentPackCore.t.sol";

/// @notice 本地 Anvil / BSC 测试网：先部署 Mock 注册表，再部署主合约 + 金库
contract DeployLocal is Script {
    function run() external returns (AgentPackCore core, GuardVault vault, MockAgentIdRegistry reg) {
        vm.startBroadcast();
        reg = new MockAgentIdRegistry();
        MockTapeProcessor proc = new MockTapeProcessor();
        core = new AgentPackCore(address(reg), msg.sender, address(proc)); // 本地：奖池=部署者
        vault = new GuardVault(address(core));
        reg.give(msg.sender); // 给部署者发一个 .ai 便于全流程测试
        vm.stopBroadcast();
    }
}

/// @notice BNB 智能链主网：官方 Agent ID 注册表 + 公示奖池 + 真处理器 + 金库
///         环境变量：
///           AGENT_ID_REGISTRY  （默认官方 0x60B9…022F）
///           PRIZE_POOL         （必填，建议多签）
///           TAPE_PROCESSOR     （必填，CPU Factory createCPU 自部署）
///           GUARD_VAULT_OWNER  （可选，默认部署者；金库是"每人自建"，这里只是模板实例）
contract DeployMainnet is Script {
    address constant OFFICIAL_REGISTRY = 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F;

    function run() external returns (AgentPackCore core, GuardVault vault) {
        address registry = vm.envOr("AGENT_ID_REGISTRY", OFFICIAL_REGISTRY);
        // ⚠ PRIZE_POOL 必须是公示地址（建议多签）；env 未设时回退 msg.sender 仅便于冒烟
        address prize = vm.envOr("PRIZE_POOL", msg.sender);
        // ⚠ TAPE_PROCESSOR = CPU Factory createCPU 自部署的处理器（docs/tapeid-port-plan.md）。
        //   未设 = tapeOut 不可用，且电路卡无法 equip（NotTaped）——上线前必须接好。
        address proc = vm.envOr("TAPE_PROCESSOR", address(0));
        vm.startBroadcast();
        core = new AgentPackCore(registry, prize, proc);
        vault = new GuardVault(address(core));
        vm.stopBroadcast();
    }
}
