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
        assertEq(bem.balanceOf(address(pub)), 0, "no BEM retained");
        assertEq(proc.eval(cid, hex"00"), hex"00", "eval works");
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
