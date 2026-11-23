// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CoreHarness, MockAgentIdRegistry} from "./AgentPackCore.t.sol";
import {MockTapeProcessor} from "./mocks/MockTapeProcessor.sol";
import {MockBEM} from "./mocks/MockBEM.sol";

/// @title 官方 processor 路径：NAND 用 BEM 付、tapeout 用 BNB 付
contract BemTapeOutTest is Test {
    CoreHarness internal core;
    MockAgentIdRegistry internal reg;
    MockTapeProcessor internal proc;
    MockBEM internal bem;

    address internal alice = makeAddr("alice");
    address internal prize = makeAddr("prize");

    function setUp() public {
        reg = new MockAgentIdRegistry();
        bem = new MockBEM();
        proc = new MockTapeProcessor(address(bem));
        core = new CoreHarness(address(reg), prize, address(proc), address(bem));
        reg.give(alice);
        vm.deal(alice, 10 ether);
    }

    function test_BemTapeOut_PullsBemAndMintsCircuit() public {
        uint256 cardId = core.mintTest(alice, 0, 0, 0, 2); // 白名单 4 门
        (uint256 bemCost, uint256 gates) = core.tapeNandCost(cardId);
        (uint256 bnbCost, uint256 gates2) = core.tapeCost(cardId);
        assertEq(gates, 4);
        assertEq(gates2, 4);
        assertGt(bemCost, 0);
        assertEq(bnbCost, proc.tapeoutFee()); // BNB 部分只有 tapeout 费

        bem.mint(alice, bemCost);
        vm.prank(alice);
        bem.approve(address(core), bemCost);

        vm.prank(alice);
        core.tapeOut{value: bnbCost}(cardId);

        assertEq(bem.balanceOf(alice), 0, "BEM pulled from buyer");
        assertEq(bem.balanceOf(address(core)), 0, "Core holds no BEM");
        assertEq(bem.balanceOf(address(proc)), bemCost, "NAND money goes to processor");
        assertEq(core.cardCircuit(cardId), 1, "circuit #1 bound to card");
        assertEq(proc.ownerOf(1), alice, "circuit NFT belongs to card owner");
    }

    function test_BemTapeOut_RevertsWithoutApproval() public {
        uint256 cardId = core.mintTest(alice, 0, 0, 0, 2);
        (uint256 bnbCost, ) = core.tapeCost(cardId);
        vm.prank(alice);
        vm.expectRevert();
        core.tapeOut{value: bnbCost}(cardId);
    }

    function test_BemTapeOut_WrongBnbValueReverts() public {
        uint256 cardId = core.mintTest(alice, 0, 0, 0, 2);
        (uint256 bemCost, ) = core.tapeNandCost(cardId);
        bem.mint(alice, bemCost);
        vm.prank(alice);
        bem.approve(address(core), bemCost);
        vm.prank(alice);
        vm.expectRevert();
        core.tapeOut{value: 1 wei}(cardId);
    }
}
