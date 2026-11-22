// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentPackCore} from "../src/AgentPackCore.sol";

/// @dev 官方 Agent ID 注册表的测试桩（ERC-721 语义：balanceOf > 0 = 持有 .ai）
contract MockAgentIdRegistry {
    mapping(address => uint256) private _held;

    function balanceOf(address owner) external view returns (uint256) {
        return _held[owner];
    }

    function give(address to) external {
        _held[to] = 1;
    }

    function take(address from) external {
        _held[from] = 0;
    }
}

/// @dev 测试专用：暴露 internal _mint，用来精确构造指定稀有度/编号的卡
contract CoreHarness is AgentPackCore {
    constructor(address r, address p) AgentPackCore(r, p) {}

    function mintTest(address to, uint8 rarity, uint8 star, uint8 kind, uint32 ref)
        external returns (uint256 id)
    {
        id = _mint(to, CardInfo({rarity: rarity, star: star, kind: kind, ref: ref}));
    }
}

contract AgentPackCoreTest is Test {
    CoreHarness internal core;
    MockAgentIdRegistry internal reg;

    address internal alice = makeAddr("alice"); // 有 .ai 的普通玩家
    address internal bob = makeAddr("bob");     // 有 .ai 的玩家 + 卡池正主
    address internal carol = makeAddr("carol"); // 无 .ai 的路人
    address internal prizePool = makeAddr("prize");

    function setUp() public {
        reg = new MockAgentIdRegistry();
        core = new CoreHarness(address(reg), prizePool);
        reg.give(alice);
        reg.give(bob);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    /*──── helpers ────*/
    function _give(address who) internal {
        reg.give(who);
        vm.deal(who, 10 ether);
    }

    /// @dev 买一个包并完成 commit-reveal 开包，返回 5 张新卡的 id
    function _openBought(address who, uint256 saltSeed) internal returns (uint256[5] memory ids) {
        uint256 before = core.cardCount();
        vm.startPrank(who);
        uint256 pid = core.buyPack{value: core.TIER_PRICE(0)}(0);
        core.packCommit(pid, keccak256(abi.encodePacked(bytes32(saltSeed))));
        vm.roll(block.number + 1);
        core.packReveal(pid, bytes32(saltSeed));
        vm.stopPrank();
        for (uint256 i = 0; i < 5; i++) ids[i] = before + 1 + i;
    }

    function _openDaily(address who, uint256 saltSeed) internal {
        vm.startPrank(who);
        uint256 pid = core.claimDailyPack();
        core.packCommit(pid, keccak256(abi.encodePacked(bytes32(saltSeed))));
        vm.roll(block.number + 1);
        core.packReveal(pid, bytes32(saltSeed));
        vm.stopPrank();
    }

    /*──── 1 · Agent ID 门禁：无 .ai 一律拒绝 ────*/
    function test_NoAgentId_RevertsEverywhere() public {
        vm.deal(carol, 1 ether);
        vm.prank(carol);
        vm.expectRevert(AgentPackCore.NoAgentId.selector);
        core.claimDailyPack();

        vm.prank(carol);
        vm.expectRevert(AgentPackCore.NoAgentId.selector);
        core.buyPack{value: 0.002 ether}(0);

        vm.prank(carol);
        vm.expectRevert(AgentPackCore.NoAgentId.selector);
        core.claimIntoPool();

        vm.prank(carol);
        vm.expectRevert(AgentPackCore.NoAgentId.selector);
        core.equip(1);
    }

    /*──── 2 · 每日免费包 + 冷却 ────*/
    function test_DailyClaim_AndCooldown() public {
        vm.prank(alice);
        core.claimDailyPack();

        vm.prank(alice);
        vm.expectRevert(AgentPackCore.DailyCooldown.selector);
        core.claimDailyPack();

        vm.warp(block.timestamp + 24 hours + 1);
        vm.prank(alice);
        core.claimDailyPack(); // 冷却过后可再领
    }

    /*──── 3 · 付费包：价格校验 + 50/50 分账 ────*/
    function test_BuyPack_SplitsFunds() public {
        uint256 prizeBefore = prizePool.balance;
        vm.prank(alice);
        core.buyPack{value: 0.002 ether}(0);

        assertEq(prizePool.balance, prizeBefore + 0.001 ether, "prize pool gets half");
        assertEq(0x000000000000000000000000000000000000dEaD.balance, 0.001 ether, "half burned");
        assertEq(core.packCount(), 1);
    }

    function test_BuyPack_BadValueAndTier() public {
        vm.startPrank(alice);
        vm.expectRevert(AgentPackCore.BadValue.selector);
        core.buyPack{value: 0.001 ether}(0);
        vm.expectRevert(AgentPackCore.BadTier.selector);
        core.buyPack{value: 0.002 ether}(3);
        vm.stopPrank();
    }

    /*──── 4 · commit-reveal：错盐拒绝、同块拒绝、开包发卡 ────*/
    function test_Reveal_WrongSalt_Reverts() public {
        vm.startPrank(alice);
        uint256 pid = core.buyPack{value: 0.002 ether}(0);
        core.packCommit(pid, keccak256(abi.encodePacked(bytes32(uint256(1)))));
        vm.roll(block.number + 1);
        vm.expectRevert(AgentPackCore.BadCommit.selector);
        core.packReveal(pid, bytes32(uint256(2))); // 盐不匹配
        vm.stopPrank();
    }

    function test_Reveal_SameBlock_Reverts() public {
        vm.startPrank(alice);
        uint256 pid = core.buyPack{value: 0.002 ether}(0);
        core.packCommit(pid, keccak256(abi.encodePacked(bytes32(uint256(1)))));
        vm.expectRevert(AgentPackCore.BadCommit.selector);
        core.packReveal(pid, bytes32(uint256(1))); // 必须晚于承诺区块
        vm.stopPrank();
    }

    function test_Open_MintsFiveCards() public {
        uint256[5] memory ids = _openBought(alice, 42);
        assertEq(core.balanceOf(alice), 5);
        for (uint256 i = 0; i < 5; i++) {
            assertEq(core.ownerOf(ids[i]), alice);
        }
        (, , uint32 openedPacks, , , ) = core.players(alice);
        assertEq(openedPacks, 1);
        assertEq(core.packPoints(alice), 5); // 每包 5 分
    }

    /*──── 5 · 新手保底：首包第 5 张必 ≥SSR ────*/
    function test_FirstPackPity_FifthCardAtLeastSSR() public {
        uint256[5] memory ids = _openBought(alice, 7);
        (uint8 rarity,,,, ) = _card(ids[4]);
        assertGe(rarity, 4, "5th card of first pack must be >= SSR");
    }

    function _card(uint256 id) internal view returns (uint8, uint8, uint8, uint32, address) {
        (uint8 rarity, uint8 star, uint8 kind, uint32 ref) = _info(id);
        return (rarity, star, kind, ref, core.ownerOf(id));
    }

    function _info(uint256 id)
        internal
        view
        returns (uint8 rarity, uint8 star, uint8 kind, uint32 ref)
    {
        (rarity, star, kind, ref) = core.cardInfo(id);
    }

    /*──── 6 · SR 保底不变量：任何连续 10 张内必有 ≥SR ────*/
    function test_Pity_InvariantMaxNineNonSRStreak() public {
        uint256 streak;
        uint256 maxStreak;
        for (uint256 n = 0; n < 30; n++) {
            uint256[5] memory ids = _openBought(alice, 1000 + n);
            for (uint256 i = 0; i < 5; i++) {
                (uint8 rarity,,,, ) = _card(ids[i]);
                if (rarity >= 3) {
                    streak = 0;
                } else {
                    streak++;
                    maxStreak = streak > maxStreak ? streak : maxStreak;
                }
            }
        }
        assertLe(maxStreak, 9, "never more than 9 consecutive cards below SR");
    }

    /*──── 7 · 卡池：入池 / 退出 / 重入 / 双入拒绝 ────*/
    function test_Pool_JoinLeaveRejoin() public {
        vm.startPrank(bob);
        core.claimIntoPool();
        assertEq(core.poolSize(), 1);
        assertEq(core.poolIndex(bob), 1);

        vm.expectRevert(AgentPackCore.AlreadyInPool.selector);
        core.claimIntoPool();

        core.leavePool();
        (,, bool active) = core.pool(0);
        assertFalse(active, "left pool = inactive");

        core.claimIntoPool(); // 重新激活，不新增条目
        (,, active) = core.pool(0);
        assertTrue(active);
        assertEq(core.poolSize(), 1);
        vm.stopPrank();
    }

    /*──── 8 · 身份卡：正主在池时，SR+ 会开出身份卡并给正主积分 ────*/
    function test_IdentityCard_GrantsPoolPoints() public {
        vm.prank(bob);
        core.claimIntoPool(); // bob 自己在池（单人池 → SR+ 必为身份卡）

        uint256 pulls;
        for (uint256 n = 0; n < 40 && pulls == 0; n++) {
            uint256[5] memory ids = _openBought(bob, 5000 + n);
            for (uint256 i = 0; i < 5; i++) {
                (uint8 rarity, , uint8 kind, uint32 ref) = _info(ids[i]);
                if (kind == 1) {
                    pulls++;
                    assertGe(rarity, 3, "identity cards only at SR+");
                    (address poolAgent, , bool active) = core.pool(ref);
                    assertEq(poolAgent, bob);
                    assertTrue(active);
                }
            }
        }
        assertGe(pulls, 1, "40 packs must yield at least one identity card");
        (, , uint32 openedPacks, , , ) = core.players(bob);
        assertGe(
            core.packPoints(bob),
            uint256(openedPacks) * 5 + 10,
            "pool agent earned pull points on top of pack points"
        );
    }

    /*──── 9 · 穿卡 ────*/
    function test_EquipUnequip() public {
        uint256[5] memory ids = _openBought(alice, 9);
        uint256 cardId = ids[0];

        vm.prank(bob);
        vm.expectRevert(AgentPackCore.NotCardOwner.selector);
        core.equip(cardId);

        vm.prank(alice);
        core.equip(cardId);
        assertEq(core.activeCircuit(alice), cardId);

        vm.prank(alice);
        core.unequip();
        assertEq(core.activeCircuit(alice), 0);
    }

    /*──── 10 · 升星：烧燃料卡 ────*/
    function test_StarUp_BurnsFuel() public {
        uint256[5] memory ids = _openBought(alice, 11);
        uint256 base = ids[0];
        uint256[] memory fuel = new uint256[](2);
        fuel[0] = ids[1];
        fuel[1] = ids[2];

        uint256 balBefore = core.balanceOf(alice);
        vm.prank(alice);
        core.starUp(base, fuel);

        assertEq(core.balanceOf(alice), balBefore - 2);
        (uint8 rarity, uint8 star,,) = _info(base);
        assertEq(star, 2);

        vm.expectRevert(AgentPackCore.NonexistentCard.selector);
        core.ownerOf(ids[1]); // 已销毁
    }

    /*──── 11 · 邀请：开满 15 包双方得奖励包 ────*/
    function test_Invite_At15PacksBothGetBonus() public {
        vm.prank(bob);
        core.invite(alice);

        for (uint256 n = 0; n < 14; n++) {
            _openBought(bob, 2000 + n);
            assertEq(core.pendingBonusPacks(alice), 0, "not yet");
        }

        _openBought(bob, 2014);
        assertEq(core.pendingBonusPacks(alice), 1, "inviter got bonus pack");
        assertEq(core.pendingBonusPacks(bob), 1, "invitee got bonus pack");

        // 奖励包立即可领（不占每日冷却）
        vm.prank(alice);
        core.claimDailyPack();
    }

    function test_Invite_SelfAndReinvite_Revert() public {
        vm.startPrank(bob);
        vm.expectRevert(AgentPackCore.CannotInviteSelf.selector);
        core.invite(bob);

        core.invite(alice);
        vm.expectRevert(AgentPackCore.AlreadyInvited.selector);
        core.invite(alice);
        vm.stopPrank();
    }

    /*──── 12 · 积分兑 SR ────*/
    function test_RedeemPoints() public {
        for (uint256 n = 0; n < 100; n++) {
            _openBought(alice, 3000 + n);
        }
        assertGe(core.packPoints(alice), 500);

        uint256 before = core.cardCount();
        vm.prank(alice);
        uint256 cardId = core.redeemPoints();

        assertEq(core.cardCount(), before + 1);
        (uint8 rarity,,,,) = _card(cardId);
        assertEq(rarity, 3, "redeemed card is SR");
        assertEq(core.ownerOf(cardId), alice);
    }

    /*──── 13 · ERC-721 基本流转 ────*/
    function test_ERC721_TransferAndAutoUnequip() public {
        uint256[5] memory ids = _openBought(alice, 21);
        uint256 cardId = ids[0];

        vm.prank(bob);
        vm.expectRevert(AgentPackCore.NotApproved.selector);
        core.transferFrom(alice, bob, cardId);

        vm.prank(alice);
        core.approve(bob, cardId);
        vm.prank(bob);
        core.transferFrom(alice, bob, cardId);
        assertEq(core.ownerOf(cardId), bob);

        // 穿着卖掉自动脱下
        vm.prank(alice);
        core.equip(ids[1]);
        vm.prank(alice);
        core.approve(bob, ids[1]);
        vm.prank(bob);
        core.transferFrom(alice, bob, ids[1]);
        assertEq(core.activeCircuit(alice), 0, "equipped card transferred = auto unequip");
    }

    /*──── 14 · tokenURI：链上自包含 ────*/
    function test_TokenURI_IsSelfContainedJSON() public {
        for (uint256 n = 0; n < 100; n++) {
            _openBought(alice, 4000 + n);
        }
        vm.prank(alice);
        uint256 cardId = core.redeemPoints();

        string memory uri = core.tokenURI(cardId);
        (bool okPrefix,) = _startsWith(uri, "data:application/json;base64,");
        assertTrue(okPrefix, "token uri is a base64 data uri");
    }

    function _startsWith(string memory s, string memory p)
        internal
        pure
        returns (bool, bytes memory)
    {
        bytes memory sb = bytes(s);
        bytes memory pb = bytes(p);
        if (sb.length < pb.length) return (false, "");
        for (uint256 i = 0; i < pb.length; i++) {
            if (sb[i] != pb[i]) return (false, "");
        }
        return (true, sb);
    }

    /*──── 10 · 规则电路：卡的实际作用 ────*/
    function _equipNew(address who, uint8 rarity, uint8 star, uint8 kind, uint32 ref)
        internal returns (uint256 id)
    {
        id = core.mintTest(who, rarity, star, kind, ref);
        vm.prank(who);
        core.equip(id);
    }

    function test_RuleOf_ParamsScaleWithRarityAndStar() public {
        uint256 c0 = core.mintTest(alice, 0, 0, 0, 0);
        (uint8 t0, uint256 p0,) = core.ruleOf(c0);
        assertEq(t0, core.RULE_DAILY_CAP());
        assertEq(p0, 2000); // $20

        uint256 c1 = core.mintTest(alice, 4, 2, 0, 0); // SSR + 2 星 → mult 100+160+40=300
        (, uint256 p1,) = core.ruleOf(c1);
        assertEq(p1, 6000); // $60

        uint256 cd = core.mintTest(alice, 0, 0, 0, 7);
        (, uint256 cool,) = core.ruleOf(cd);
        assertEq(cool, 3600);

        vm.expectRevert(AgentPackCore.NoSuchCard.selector);
        core.ruleOf(99999);
    }

    function test_CheckPayment_NoEquippedRule() public view {
        (bool ok, string memory why) = core.checkPayment(alice, 100, bob, 0, 0, 0, false);
        assertFalse(ok);
        assertEq(why, "no rule equipped");
    }

    function test_CheckPayment_DailyCap() public {
        _equipNew(alice, 0, 0, 0, 0); // $20/day
        (bool ok,) = core.checkPayment(alice, 1500, bob, 0, 0, 0, false);
        assertTrue(ok);
        (ok,) = core.checkPayment(alice, 2001, bob, 0, 0, 0, false);
        assertFalse(ok);
        (ok,) = core.checkPayment(alice, 500, bob, 1900, 0, 0, false); // 1900+500 > 2000
        assertFalse(ok);
        (ok,) = core.checkPayment(alice, 500, bob, 1900, 0, 0, true);  // 人工放行
        assertTrue(ok);
    }

    function test_CheckPayment_SingleMax() public {
        _equipNew(alice, 0, 0, 0, 1); // $50 single
        (bool ok,) = core.checkPayment(alice, 5000, bob, 0, 0, 0, false);
        assertTrue(ok);
        (ok,) = core.checkPayment(alice, 5001, bob, 0, 0, 0, false);
        assertFalse(ok);
    }

    function test_CheckPayment_AgentIdOnly() public {
        _equipNew(alice, 0, 0, 0, 2);
        (bool ok,) = core.checkPayment(alice, 100000, bob, 0, 0, 0, false); // bob 有 .ai
        assertTrue(ok);
        (ok,) = core.checkPayment(alice, 100000, carol, 0, 0, 0, false);   // carol 没有
        assertFalse(ok);
    }

    function test_CheckPayment_Growth() public {
        _equipNew(alice, 0, 0, 0, 3); // $30 base, +2%/tx
        (bool ok,) = core.checkPayment(alice, 3000, bob, 0, 0, 0, false);
        assertTrue(ok);
        (ok,) = core.checkPayment(alice, 3001, bob, 0, 0, 0, false);
        assertFalse(ok);
        (ok,) = core.checkPayment(alice, 3600, bob, 0, 10, 0, false); // 3000*120%
        assertTrue(ok);
        (ok,) = core.checkPayment(alice, 3601, bob, 0, 10, 0, false);
        assertFalse(ok);
    }

    function test_CheckPayment_DailyCount() public {
        _equipNew(alice, 0, 0, 0, 4); // 3 笔/日
        (bool ok,) = core.checkPayment(alice, 1, bob, 0, 2, 0, false);
        assertTrue(ok);
        (ok,) = core.checkPayment(alice, 1, bob, 0, 3, 0, false);
        assertFalse(ok);
    }

    function test_CheckPayment_MicroPass() public {
        _equipNew(alice, 0, 0, 0, 5); // < $5 免确认
        (bool ok,) = core.checkPayment(alice, 500, bob, 0, 0, 0, false);
        assertTrue(ok);
        (ok,) = core.checkPayment(alice, 501, bob, 0, 0, 0, false);
        assertFalse(ok);
        (ok,) = core.checkPayment(alice, 900, bob, 0, 0, 0, true);
        assertTrue(ok);
    }

    function test_CheckPayment_HighLimitNeedsHuman() public {
        _equipNew(alice, 0, 0, 0, 6); // $100, 超一半要人工
        (bool ok,) = core.checkPayment(alice, 5000, bob, 0, 0, 0, false);
        assertTrue(ok);
        (ok,) = core.checkPayment(alice, 5001, bob, 0, 0, 0, false);
        assertFalse(ok);
        (ok,) = core.checkPayment(alice, 5001, bob, 0, 0, 0, true);
        assertTrue(ok);
        (ok,) = core.checkPayment(alice, 10001, bob, 0, 0, 0, true);
        assertFalse(ok);
    }

    function test_CheckPayment_Cooldown() public {
        vm.warp(100000);
        _equipNew(alice, 0, 0, 0, 7); // 60 分钟
        (bool ok,) = core.checkPayment(alice, 1, bob, 0, 0, uint64(block.timestamp - 3601), false);
        assertTrue(ok);
        (ok,) = core.checkPayment(alice, 1, bob, 0, 0, uint64(block.timestamp), false);
        assertFalse(ok);
        (ok,) = core.checkPayment(alice, 1, bob, 0, 0, 0, false); // 从未付过
        assertTrue(ok);
    }

    function test_CheckPayment_IdentityCardNamedPayee() public {
        vm.prank(bob);
        core.claimIntoPool(); // pool[0] = bob
        uint256 id = core.mintTest(alice, 3, 0, 1, 0);
        vm.prank(alice);
        core.equip(id);

        (bool ok,) = core.checkPayment(alice, 999999, bob, 0, 0, 0, false);
        assertTrue(ok);
        (ok,) = core.checkPayment(alice, 1, carol, 0, 0, 0, false);
        assertFalse(ok);
    }

    function test_EquippedRule_ReadsActiveCard() public {
        (uint256 none, uint8 tNone,,) = core.equippedRule(alice);
        assertEq(none, 0);
        assertEq(tNone, 255);

        uint256 id = _equipNew(alice, 3, 0, 0, 1);
        (uint256 cid, uint8 t, uint256 p1,) = core.equippedRule(alice);
        assertEq(cid, id);
        assertEq(t, core.RULE_SINGLE_MAX());
        assertEq(p1, 5000 * (100 + 3 * 40) / 100); // SR → $110
    }
}
