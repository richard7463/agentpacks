// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentId { function balanceOf(address who) external view returns (uint256); }

/// @title KalingGiveaway — 链上可验证的 .ai 持有者电路卡赠送活动
/// @notice 任何人都能扫描：谁能领、是否已领、领取时间、对应的 circuit NFT。
contract KalingGiveaway {
    error NotOwner();
    error NotEligible();       // 没有 Binance Agent ID
    error AlreadyClaimed();
    error BadCampaign();
    error Full();

    struct Campaign {
        uint8 rule;            // 赠送的电路规则
        uint8 rarity;          // 来源卡稀有度
        uint32 max;            // 最大名额
        uint32 claimed;        // 已领取人数
        bool active;
    }
    struct Claim {
        uint256 circuitId;     // 0 = 尚未流片交付
        uint64 at;
        bool fulfilled;
    }

    address public owner;
    IAgentId public immutable agentId;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => Claim)) public claims;
    mapping(uint256 => address[]) public claimants;

    event CampaignCreated(uint256 indexed id, uint8 rule, uint8 rarity, uint32 max);
    event Claimed(uint256 indexed id, address indexed who, uint32 index);
    event Fulfilled(uint256 indexed id, address indexed who, uint256 circuitId);

    constructor(address agentId_) {
        owner = msg.sender;
        agentId = IAgentId(agentId_);
    }

    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }

    function createCampaign(uint256 id, uint8 rule, uint8 rarity, uint32 max) external onlyOwner {
        if (max == 0) revert BadCampaign();
        campaigns[id] = Campaign({rule: rule, rarity: rarity, max: max, claimed: 0, active: true});
        emit CampaignCreated(id, rule, rarity, max);
    }

    function closeCampaign(uint256 id) external onlyOwner {
        campaigns[id].active = false;
    }

    /// @notice 持有 Binance Agent ID 的地址才能领，一个地址一次
    function claim(uint256 id) external {
        Campaign storage c = campaigns[id];
        if (!c.active) revert BadCampaign();
        if (claims[id][msg.sender].at != 0) revert AlreadyClaimed();
        if (agentId.balanceOf(msg.sender) == 0) revert NotEligible();
        if (c.claimed >= c.max) revert Full();
        claims[id][msg.sender].at = uint64(block.timestamp);
        claimants[id].push(msg.sender);
        c.claimed += 1;
        emit Claimed(id, msg.sender, c.claimed);
    }

    /// @notice 我们在链上流片后，把 circuit token id 写回，任何人可核验交付
    function fulfill(uint256 id, address who, uint256 circuitId) external onlyOwner {
        if (claims[id][who].at == 0) revert BadCampaign();
        claims[id][who].circuitId = circuitId;
        claims[id][who].fulfilled = true;
        emit Fulfilled(id, who, circuitId);
    }

    function isEligible(address who) external view returns (bool) {
        return agentId.balanceOf(who) > 0;
    }

    function getClaim(uint256 id, address who) external view returns (uint256 circuitId, uint64 at, bool fulfilled) {
        Claim storage c = claims[id][who];
        return (c.circuitId, c.at, c.fulfilled);
    }

    function getClaimants(uint256 id) external view returns (address[] memory) {
        return claimants[id];
    }
}
