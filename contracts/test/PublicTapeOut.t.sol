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
    address internal treasury = makeAddr("treasury");

    function setUp() public {
        reg = new MockAgentIdRegistry();
        bem = new MockBEM();
        proc = new MockTapeProcessor(address(bem));
        core = new CoreHarness(address(reg), makeAddr("prize"), address(proc), address(bem));
        pub = new PublicTapeOut(address(core), address(proc), address(bem));
        // 桩的 BEM 计价是 1e14/门（主网是 1.734e6/门），上下限同比例抬高
        pub.setPriceBounds(800_000_000_000_000, 8_000_000_000_000_000);
        pub.setTreasury(treasury);
        vm.deal(carol, 10 ether);
    }

    function test_AnyWalletCanTapeOutRuleWithoutCardOrAgentId() public {
        assertFalse(reg.balanceOf(carol) > 0, "no Agent ID");
        (uint256 bemCost, uint256 bnbCost, uint256 gates, uint32 nIn) = pub.quote(2);
        assertEq(gates, 4);
        assertEq(nIn, 1);
        assertEq(bemCost, pub.minBemCost());

        bem.mint(carol, bemCost);
        vm.startPrank(carol);
        bem.approve(address(pub), bemCost);
        uint256 cid = pub.tapeoutRaw{value: bnbCost}(2);
        vm.stopPrank();

        assertGt(cid, 0);
        assertEq(proc.ownerOf(cid), carol, "circuit NFT goes to any wallet");
        assertEq(bem.balanceOf(carol), 0, "buyer paid BEM");
        uint256 actual = 4 * proc.mintPrice() + proc.protocolFee();
        assertEq(bem.balanceOf(address(pub)), 0, "no BEM retained in contract");
        assertEq(bem.balanceOf(address(proc)), actual, "transistor got real NAND cost");
        assertEq(bem.balanceOf(treasury), bemCost - actual, "extra auto-forwarded to treasury");
        assertEq(proc.eval(cid, hex"00"), hex"00", "eval works");
    }

    function test_PriceRangeIsNarrowAndOnlyFourRulesOpen() public {
        (uint256 bem2, , , ) = pub.quote(2);
        (uint256 bem0, , uint256 gates0, ) = pub.quote(0);
        (uint256 bem7, , , ) = pub.quote(7);
        (uint256 bem11, , , ) = pub.quote(11);
        assertEq(gates0, 36);
        assertEq(bem2, pub.minBemCost(), "cheap rule lifted to floor");
        assertEq(bem11, pub.minBemCost(), "4-gate rule lifted to floor");
        assertEq(bem7, 31 * proc.mintPrice() * 3 / 2 + proc.protocolFee());
        assertEq(bem0, 36 * proc.mintPrice() * 3 / 2 + proc.protocolFee());
        assertLt(bem2, bem7);
        assertLt(bem7, bem0);
        assertLe(bem0, pub.maxBemCost());

        vm.expectRevert(PublicTapeOut.BadRule.selector);
        pub.quote(9); // 189 门太贵，暂不开放
        vm.expectRevert(PublicTapeOut.BadRule.selector);
        pub.quote(6);
    }

    function test_OwnerCanChangeBoundsTreasuryAndSweep() public {
        (uint256 bemCost, uint256 bnbCost, , ) = pub.quote(2);
        bem.mint(carol, bemCost);
        vm.startPrank(carol);
        bem.approve(address(pub), bemCost);
        pub.tapeoutRaw{value: bnbCost}(2);
        vm.stopPrank();
        uint256 extra = bem.balanceOf(treasury);
        assertGt(extra, 0);

        vm.expectRevert(PublicTapeOut.NotOwner.selector);
        vm.prank(carol);
        pub.sweepBem(carol, extra);

        pub.setPriceBounds(900_000_000_000_000, 9_000_000_000_000_000);
        assertEq(pub.minBemCost(), 900_000_000_000_000);
        (uint256 newCost, , , ) = pub.quote(2);
        assertEq(newCost, 900_000_000_000_000);
        pub.setTreasury(makeAddr("treasury2"));
        assertEq(pub.treasury(), makeAddr("treasury2"));

        bem.mint(address(pub), extra);
        pub.sweepBem(makeAddr("treasury2"), extra);
        assertEq(bem.balanceOf(makeAddr("treasury2")), extra);
        assertEq(bem.balanceOf(treasury), extra);
        assertEq(bem.balanceOf(address(pub)), 0);
    }

    function test_AcceptsErc1155Nand() public {
        assertEq(pub.onERC1155Received(address(0), address(0), 0, 1, ""), bytes4(0xf23a6e61));
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amts = new uint256[](1);
        amts[0] = 1;
        assertEq(pub.onERC1155BatchReceived(address(0), address(0), ids, amts, ""), bytes4(0xbc197c81));
        assertTrue(pub.supportsInterface(0x4e2312e0));
    }

    function test_BadRuleReverts() public {
        vm.expectRevert(PublicTapeOut.BadRule.selector);
        pub.quote(12);
        vm.expectRevert(PublicTapeOut.BadRule.selector);
        pub.quote(1); // 未开放的规则也不能直接流片
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
