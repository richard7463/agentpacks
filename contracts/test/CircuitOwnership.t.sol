// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CoreHarness, MockAgentIdRegistry} from "./AgentPackCore.t.sol";
import {MockTapeProcessor} from "./mocks/MockTapeProcessor.sol";
import {AgentPackCore} from "../src/AgentPackCore.sol";

/// @title 电路 NFT 所有权测试
/// @notice 电路 NFT 可转售；转走后卡主不能再拿它当规则用（fail-closed）
contract CircuitOwnershipTest is Test {
    CoreHarness internal core;
    MockAgentIdRegistry internal reg;
    MockTapeProcessor internal proc;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal prize = makeAddr("prize");

    function setUp() public {
        reg = new MockAgentIdRegistry();
        proc = new MockTapeProcessor(address(0));
        core = new CoreHarness(address(reg), prize, address(proc), address(0));
        reg.give(alice);
        reg.give(bob);
        vm.deal(alice, 10 ether);
    }

    function _tapedCard() internal returns (uint256 cardId, uint256 circuitId) {
        cardId = core.mintTest(alice, 0, 0, 0, 0); // 止损 $20/日
        (uint256 cost, ) = core.tapeCost(cardId);
        vm.prank(alice);
        core.tapeOut{value: cost}(cardId);
        circuitId = core.cardCircuit(cardId);
    }

    function test_TransferredCircuit_InvalidatesRule() public {
        (uint256 cardId, uint256 circuitId) = _tapedCard();
        vm.prank(alice);
        core.equip(cardId);

        (bool ok, string memory why) = core.checkPayment(alice, 100, bob, 0, 0, 0, false, 0, false);
        assertTrue(ok, "before transfer: rule works");
        assertEq(why, "within daily cap");

        // 卡主把电路 NFT 卖掉
        vm.prank(alice);
        proc.transferFrom(alice, bob, circuitId);

        (ok, why) = core.checkPayment(alice, 100, bob, 0, 0, 0, false, 0, false);
        assertFalse(ok, "after transfer: rule must fail-closed");
        assertEq(why, "circuit not owned by card owner");
    }

    function test_Equip_RejectsWhenCircuitNotOwned() public {
        (uint256 cardId, uint256 circuitId) = _tapedCard();
        vm.prank(alice);
        proc.transferFrom(alice, bob, circuitId);

        vm.prank(alice);
        vm.expectRevert(AgentPackCore.NotCircuitOwner.selector);
        core.equip(cardId);
    }

    function test_NewOwnerCanEquipWithBothNFTs() public {
        (uint256 cardId, uint256 circuitId) = _tapedCard();

        vm.startPrank(alice);
        proc.transferFrom(alice, bob, circuitId);
        core.transferFrom(alice, bob, cardId); // 卡转卖时自动脱下
        vm.stopPrank();

        assertEq(core.activeCircuit(alice), 0, "seller auto-unequipped");

        vm.prank(bob);
        core.equip(cardId); // 新主人同时持有卡 + 电路 NFT → 可穿
        assertEq(core.activeCircuit(bob), cardId);

        (bool ok, ) = core.checkPayment(bob, 100, alice, 0, 0, 0, false, 0, false);
        assertTrue(ok, "new owner's rule works");
    }
}
