// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {RuleConfig} from "../src/RuleConfig.sol";

contract RuleConfigTest is Test {
    RuleConfig cfg;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public { cfg = new RuleConfig(); }

    function test_SetAndReadOverride() public {
        (uint256 v0, ) = cfg.getOverride(alice, 0);
        assertEq(v0, 0, "no override by default");

        vm.prank(alice);
        cfg.setOverride(0, 10000); // $100 daily cap in cents

        (uint256 v, uint64 at) = cfg.getOverride(alice, 0);
        assertEq(v, 10000);
        assertGt(at, 0);
        (uint256 other, ) = cfg.getOverride(bob, 0);
        assertEq(other, 0, "other wallet unaffected");
        (uint256 otherRule, ) = cfg.getOverride(alice, 7);
        assertEq(otherRule, 0, "other rule unaffected");
    }

    function test_ClearOverride() public {
        vm.startPrank(alice);
        cfg.setOverride(0, 10000);
        cfg.setOverride(0, 0);
        vm.stopPrank();
        (uint256 v, ) = cfg.getOverride(alice, 0);
        assertEq(v, 0, "0 clears override");
    }

    function test_BadRuleReverts() public {
        vm.prank(alice);
        vm.expectRevert(RuleConfig.BadValue.selector);
        cfg.setOverride(12, 1);
    }
}
