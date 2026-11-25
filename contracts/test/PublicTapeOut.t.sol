// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CoreHarness, MockAgentIdRegistry} from "./AgentPackCore.t.sol";
import {MockTapeProcessor} from "./mocks/MockTapeProcessor.sol";
import {MockBEM} from "./mocks/MockBEM.sol";
import {PublicTapeOut} from "../src/PublicTapeOut.sol";

contract PublicTapeOutTest is Test {
    CoreHarness internal core;
    MockAgentIdRegistry internal reg;
    MockTapeProcessor internal proc;
    MockBEM internal bem;
    PublicTapeOut internal pub;

    address internal carol = makeAddr("carol"); // 没有 .ai 的普通钱包

    function setUp() public {
        reg = new MockAgentIdRegistry();
        bem = new MockBEM();
        proc = new MockTapeProcessor(address(bem));
        core = new CoreHarness(address(reg), makeAddr("prize"), address(proc), address(bem));
        pub = new PublicTapeOut(address(core), address(proc), address(bem));
        // 桩的 BEM 计价是 1e14/门（主网是 1.734e6/门），下限同比例抬高
        pub.setMinBemCost(700_000_000_000_000);
        vm.deal(carol, 10 ether);
    }

    function test_AnyWalletCanTapeOutRuleWithoutCardOrAgentId() public {
        assertFalse(reg.balanceOf(carol) > 0, "no Agent ID");
        (uint256 bemCost, uint256 bnbCost, uint256 gates, uint32 nIn) = pub.quote(2);
        assertEq(gates, 4);
        assertEq(nIn, 1);
        assertGt(bemCost, 0);
        assertGt(bnbCost, 0);

        bem.mint(carol, bemCost);
        vm.startPrank(carol);
        bem.approve(address(pub), bemCost);
        uint256 cid = pub.tapeoutRaw{value: bnbCost}(2);
        vm.stopPrank();

        assertGt(cid, 0);
        assertEq(proc.ownerOf(cid), carol, "circuit NFT goes to any wallet");
        assertEq(bem.balanceOf(carol), 0, "buyer paid BEM");
        uint256 actual = 4 * proc.mintPrice() + proc.protocolFee();
        assertEq(bem.balanceOf(address(pub)), bemCost - actual, "price floor retained for sweep");
        assertEq(bem.balanceOf(address(proc)), actual, "transistor got real NAND cost");
        assertEq(proc.eval(cid, hex"00"), hex"00", "eval works");
    }

    function test_PriceFloorAppliesToCheapRules() public {
        (uint256 bem2, , uint256 gates2, ) = pub.quote(2);
        (uint256 bem9, , uint256 gates9, ) = pub.quote(9);
        (uint256 bem6, , uint256 gates6, ) = pub.quote(6);
        assertEq(gates2, 4);
        assertLt(gates2 * proc.mintPrice() + proc.protocolFee(), pub.minBemCost(), "mock raw price below floor");
        assertEq(bem2, pub.minBemCost(), "cheap rule lifted to $5 floor");
        assertEq(bem9, 189 * proc.mintPrice() + proc.protocolFee(), "expensive rule keeps real cost");
        assertEq(bem6, 125 * proc.mintPrice() + proc.protocolFee());
        assertLt(bem2, bem6);
        assertLt(bem6, bem9);
    }

    function test_OwnerCanSetFloorAndSweep() public {
        (uint256 bemCost, uint256 bnbCost, , ) = pub.quote(2);
        bem.mint(carol, bemCost);
        vm.startPrank(carol);
        bem.approve(address(pub), bemCost);
        pub.tapeoutRaw{value: bnbCost}(2);
        vm.stopPrank();
        uint256 extra = bem.balanceOf(address(pub));
        assertGt(extra, 0);

        vm.expectRevert(PublicTapeOut.NotOwner.selector);
        vm.prank(carol);
        pub.sweepBem(carol, extra);

        pub.setMinBemCost(800_000_000_000_000);
        assertEq(pub.minBemCost(), 800_000_000_000_000);
        (uint256 newCost, , , ) = pub.quote(2);
        assertEq(newCost, 800_000_000_000_000);

        pub.sweepBem(makeAddr("treasury"), extra);
        assertEq(bem.balanceOf(makeAddr("treasury")), extra);
        assertEq(bem.balanceOf(address(pub)), 0);
    }

    function test_BadRuleReverts() public {
        vm.expectRevert(PublicTapeOut.BadRule.selector);
        pub.quote(12);
    }

    function test_WrongBnbReverts() public {
        (uint256 bemCost, , , ) = pub.quote(2);
        bem.mint(carol, bemCost);
        vm.startPrank(carol);
        bem.approve(address(pub), bemCost);
        vm.expectRevert(PublicTapeOut.BadValue.selector);
        pub.tapeoutRaw{value: 1 wei}(2);
        vm.stopPrank();
    }
}
