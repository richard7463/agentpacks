// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {KalingGiveaway} from "../src/KalingGiveaway.sol";

contract MockAgentId {
    mapping(address => uint256) public balanceOf;
    function give(address a) external { balanceOf[a] = 1; }
}

contract KalingGiveawayTest is Test {
    MockAgentId reg;
    KalingGiveaway g;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address noAi = makeAddr("noAi");

    function setUp() public {
        reg = new MockAgentId();
        g = new KalingGiveaway(address(reg));
        reg.give(alice);
        reg.give(bob);
        g.createCampaign(1, 0, 4, 2);
    }

    function test_ClaimRequiresAgentId() public {
        vm.prank(noAi);
        vm.expectRevert(KalingGiveaway.NotEligible.selector);
        g.claim(1);
    }

    function test_ClaimAndFulfill() public {
        vm.prank(alice);
        g.claim(1);
        vm.prank(bob);
        g.claim(1);
        (,,,uint32 claimed,) = g.campaigns(1);
        assertEq(claimed, 2);

        vm.prank(alice);
        vm.expectRevert(KalingGiveaway.AlreadyClaimed.selector);
        g.claim(1);

        g.fulfill(1, alice, 7);
        (uint256 cid, uint64 at, bool done) = g.getClaim(1, alice);
        assertEq(cid, 7);
        assertGt(at, 0);
        assertTrue(done);

        address[] memory list = g.getClaimants(1);
        assertEq(list.length, 2);
        assertEq(list[0], alice);
        assertEq(list[1], bob);
    }

    function test_FullAndOwner() public {
        vm.prank(alice); g.claim(1);
        vm.prank(bob); g.claim(1);
        reg.give(makeAddr("carol"));
        vm.prank(makeAddr("carol"));
        vm.expectRevert(KalingGiveaway.Full.selector);
        g.claim(1);

        vm.prank(bob);
        vm.expectRevert(KalingGiveaway.NotOwner.selector);
        g.createCampaign(2, 0, 4, 10);
    }
}
