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
        MockTapeProcessor proc = new MockTapeProcessor(address(0));
        core = new AgentPackCore(address(reg), msg.sender, address(proc), address(0)); // 本地：奖池=部署者
        vault = new GuardVault(address(core));
        reg.give(msg.sender); // 给部署者发一个 .ai 便于全流程测试
        vm.stopBroadcast();
    }
}

/// @notice BSC 测试网全流程：Mock 注册表（给测试地址发 .ai）+ Mock 真 NAND 处理器 + Core + 金库
///         PRIZE_POOL 固定为测试收款地址；部署私钥走环境变量 DEPLOY_PK（不要写进仓库）
contract DeployTestnet is Script {
    address constant PRIZE_POOL = 0x3f665386b41Fa15c5ccCeE983050a236E6a10108;

    function run() external returns (AgentPackCore core, GuardVault vault, MockAgentIdRegistry reg) {
        uint256 pk = vm.envUint("DEPLOY_PK");
        address deployer = vm.addr(pk);
        vm.startBroadcast(pk);
        reg = new MockAgentIdRegistry();
        MockTapeProcessor proc = new MockTapeProcessor(address(0));
        core = new AgentPackCore(address(reg), PRIZE_POOL, address(proc), address(0));
        vault = new GuardVault(address(core));
        reg.give(PRIZE_POOL);   // 测试地址持 .ai，可领免费包 / 买包 / 入池
        reg.give(deployer);     // 部署者自己也可跑全流程
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
        core = new AgentPackCore(registry, prize, proc, 0x5ce033B2bFCa3Af30b3e8C8457DeaF776A8b695a);
        vault = new GuardVault(address(core));
        vm.stopBroadcast();
    }
}
