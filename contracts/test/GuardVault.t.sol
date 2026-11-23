// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {CoreHarness, MockAgentIdRegistry} from "./AgentPackCore.t.sol";
import {MockTapeProcessor} from "./mocks/MockTapeProcessor.sol";
import {GuardVault} from "../src/GuardVault.sol";

contract GuardVaultTest is Test {
    CoreHarness internal core;
    MockAgentIdRegistry internal reg;
    MockTapeProcessor internal proc;
    GuardVault internal vault;

    address internal alice = makeAddr("alice");   // owner / 金库主人
    address internal ai    = makeAddr("ai");      // 热钱包 / AI agent
    address internal bob   = makeAddr("bob");     // 有 .ai 的收款方
    address internal carol = makeAddr("carol");   // 无 .ai 的路人
    address internal prize = makeAddr("prize");

    uint256 internal constant RATE = 1e14; // 1 美分 = 0.0001 BNB（BNB≈$100 的演示口径）

    function setUp() public {
        reg = new MockAgentIdRegistry();
        proc = new MockTapeProcessor();
        core = new CoreHarness(address(reg), prize, address(proc));
        vault = new GuardVault(address(core));
        reg.give(alice);
        reg.give(bob);
        vm.deal(alice, 100 ether);
        vm.deal(ai, 1 ether);
    }

    function _equip(address who, uint32 ref) internal returns (uint256 id) {
        id = core.mintTest(who, 0, 0, 0, ref);
        (uint256 cost, ) = core.tapeCost(id);
        vm.deal(who, 100 ether);
        vm.prank(who);
        core.tapeOut{value: cost}(id);
        vm.prank(who);
        core.equip(id);
    }

    function _vaultReady() internal {
        vm.startPrank(alice);
        vault.setRate(RATE);
        vault.setAgent(ai);
        vault.deposit{value: 1 ether}();
        vm.stopPrank();
    }

    /*──────── 资金 ────────*/

    function test_DepositWithdraw() public {
        vm.startPrank(alice);
        vault.deposit{value: 2 ether}();
        assertEq(vault.balanceOf(alice), 2 ether);
        vault.withdraw(1 ether);
        assertEq(vault.balanceOf(alice), 1 ether);
        assertEq(alice.balance, 99 ether);
        vm.stopPrank();
    }

    function test_Withdraw_NoFunds() public {
        vm.prank(alice);
        vm.expectRevert(GuardVault.NoFunds.selector);
        vault.withdraw(1);
    }

    /*──────── 规则闸门 ────────*/

    function test_Pay_WithinCap() public {
        _equip(alice, 0); // 止损 $20/日
        _vaultReady();

        vm.prank(alice);
        uint256 cents = vault.pay(bob, 0.05 ether, 0); // 500 美分
        assertEq(cents, 500);
        assertEq(bob.balance, 0.05 ether);
        assertEq(vault.balanceOf(alice), 0.95 ether);

        (uint256 spent, uint16 count, , ) = _spend(alice);
        assertEq(spent, 500);
        assertEq(count, 1);
    }

    function test_Pay_OverCap_Reverts() public {
        _equip(alice, 0); // $20/日
        _vaultReady();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(GuardVault.Blocked.selector, "daily cap exceeded"));
        vault.pay(bob, 0.3 ether, 0); // 3000 美分 > 2000
    }

    function test_Pay_HumanApproval_Rescues() public {
        _equip(alice, 0); // $20/日
        _vaultReady();

        vm.prank(alice);
        vault.approveNext();
        vm.prank(alice);
        vault.pay(bob, 0.3 ether, 0); // 人工放行
        assertEq(bob.balance, 0.3 ether);
    }

    function test_ApproveNext_IsOneShot() public {
        _equip(alice, 0);
        _vaultReady();

        vm.startPrank(alice);
        vault.approveNext();
        vault.pay(bob, 0.3 ether, 0);
        vm.expectRevert(abi.encodeWithSelector(GuardVault.Blocked.selector, "daily cap exceeded"));
        vault.pay(bob, 0.3 ether, 0); // 第二次没有放行了
        vm.stopPrank();
    }

    /*──────── agent 权限 ────────*/

    function test_Agent_CannotPayWithoutAuthorization() public {
        _equip(alice, 0);
        _vaultReady();

        vm.prank(carol);
        vm.expectRevert(GuardVault.NotOperator.selector);
        vault.payFor(alice, bob, 0.01 ether, 0);
    }

    function test_Agent_PayFor_WithinCap() public {
        _equip(alice, 0);
        _vaultReady();

        vm.prank(ai);
        vault.payFor(alice, bob, 0.01 ether, 0); // 100 美分
        assertEq(bob.balance, 0.01 ether);
    }

    function test_Agent_OverCap_NeedsOwnerApproval() public {
        _equip(alice, 0);
        _vaultReady();

        vm.prank(ai);
        vm.expectRevert(abi.encodeWithSelector(GuardVault.Blocked.selector, "daily cap exceeded"));
        vault.payFor(alice, bob, 0.3 ether, 0);

        vm.prank(alice);
        vault.approveNext();
        vm.prank(ai);
        vault.payFor(alice, bob, 0.3 ether, 0); // owner 点头后 agent 才能过
        assertEq(bob.balance, 0.3 ether);
    }

    /*──────── 封控卡 ────────*/

    function test_Lockdown_BlocksEverything() public {
        _equip(alice, 8); // 封控
        _vaultReady();

        vm.prank(alice);
        vault.pay(bob, 0.001 ether, 0); // 未封控，放行

        vm.prank(alice);
        vault.setTripped(true);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(GuardVault.Blocked.selector, "lockdown active"));
        vault.pay(bob, 0.001 ether, 0);
    }

    /*──────── 白名单卡 ────────*/

    function test_AgentOnly_PayeeMustHoldAgentId() public {
        _equip(alice, 2); // 只付给持 .ai 的地址
        _vaultReady();

        vm.prank(alice);
        vault.pay(bob, 0.01 ether, 0);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(GuardVault.Blocked.selector, "payee has no Agent ID"));
        vault.pay(carol, 0.01 ether, 0);
    }

    /*──────── 预演 ────────*/

    function test_Preview_MatchesExecution() public {
        _equip(alice, 0);
        _vaultReady();

        (bool ok, string memory why, uint256 cents) = vault.preview(alice, bob, 0.3 ether, 0);
        assertFalse(ok);
        assertEq(cents, 3000);
        assertEq(why, "daily cap exceeded");

        (ok, why, cents) = vault.preview(alice, bob, 0.01 ether, 0);
        assertTrue(ok);
        assertEq(cents, 100);
        assertEq(why, "within daily cap");
    }

    function test_Preview_NoRate() public {
        (bool ok, string memory why, ) = vault.preview(alice, bob, 1, 0);
        assertFalse(ok);
        assertEq(why, "rate not set");
    }

    /*──────── 日内重置 ────────*/

    function test_DailyReset() public {
        _equip(alice, 0);
        _vaultReady();

        vm.prank(alice);
        vault.pay(bob, 0.15 ether, 0); // 1500 美分，剩 500

        vm.warp(block.timestamp + 1 days);
        vm.prank(alice);
        vault.pay(bob, 0.15 ether, 0); // 新的一天重新计数
        assertEq(bob.balance, 0.3 ether);
    }

    /*──────── 边界 ────────*/

    function test_Pay_NoFunds() public {
        _equip(alice, 0);
        vm.startPrank(alice);
        vault.setRate(RATE);
        vault.deposit{value: 0.01 ether}();
        vm.expectRevert(GuardVault.NoFunds.selector);
        vault.pay(bob, 0.02 ether, 0);
        vm.stopPrank();
    }

    function test_Pay_NoRule_Blocked() public {
        // 没有穿卡 → checkPayment 返回 no rule equipped
        vm.startPrank(alice);
        vault.setRate(RATE);
        vault.deposit{value: 1 ether}();
        vm.expectRevert(abi.encodeWithSelector(GuardVault.Blocked.selector, "no rule equipped"));
        vault.pay(bob, 0.01 ether, 0);
        vm.stopPrank();
    }

    function _spend(address who) internal view returns (uint256 spent, uint16 count, uint64 last, bool tripped) {
        (uint256 day, uint256 s, uint16 c, uint64 l, bool t) = vault.spendOf(who);
        day; // silence
        return (s, c, l, t);
    }
}
