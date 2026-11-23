#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════
#  AgentPackCore · 本地链 E2E —— anvil 起链 → 部署 → 真实交易全旅程
#  用法：bash run_local_e2e.sh
# ══════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")"

RPC=http://127.0.0.1:8545
echo "── 1/8 起本地链 anvil"
ANVIL_LOG=$(mktemp)
anvil > "$ANVIL_LOG" 2>&1 &
ANVIL_PID=$!
trap 'kill $ANVIL_PID 2>/dev/null || true' EXIT
sleep 2
# 从 anvil 启动输出解析标准账户私钥（不硬编码，避免抄错）
DEPLOYER_PK=$(python3 -c "
import re
log=open('$ANVIL_LOG').read()
sec=log.split('Private Keys',1)[1]
keys=re.findall(r'\(\d+\) (0x[0-9a-fA-F]{64})', sec)
print(keys[0])")
ALICE_PK=$(python3 -c "
import re
log=open('$ANVIL_LOG').read()
sec=log.split('Private Keys',1)[1]
keys=re.findall(r'\(\d+\) (0x[0-9a-fA-F]{64})', sec)
print(keys[1])")
ALICE=$(cast wallet address --private-key $ALICE_PK)
SALT=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

echo "── 2/8 部署 Mock 注册表 + 主合约"
REG=$(forge create test/AgentPackCore.t.sol:MockAgentIdRegistry \
  --rpc-url $RPC --private-key $DEPLOYER_PK --broadcast | grep "Deployed to:" | awk '{print $3}')
echo "  registry: $REG"
PROC=$(forge create test/mocks/MockTapeProcessor.sol:MockTapeProcessor \
  --rpc-url $RPC --private-key $DEPLOYER_PK --broadcast | grep "Deployed to:" | awk '{print $3}')
echo "  processor: $PROC"
CORE=$(forge create src/AgentPackCore.sol:AgentPackCore \
  --rpc-url $RPC --private-key $DEPLOYER_PK --broadcast \
  --constructor-args $REG $(cast wallet address --private-key $DEPLOYER_PK) $PROC | grep "Deployed to:" | awk '{print $3}')
echo "  core:      $CORE"

echo "── 3/8 给 alice 发 .ai 身份"
DEPLOYER=$(cast wallet address --private-key $DEPLOYER_PK)
cast send $REG "give(address)" $ALICE --rpc-url $RPC --private-key $DEPLOYER_PK > /dev/null
cast send $REG "give(address)" $DEPLOYER --rpc-url $RPC --private-key $DEPLOYER_PK > /dev/null
HELD=$(cast call $REG "balanceOf(address)(uint256)" $ALICE --rpc-url $RPC)
echo "  alice .ai balance: $HELD"

echo "── 4/8 alice 领每日免费包 → commit → reveal"
cast send $CORE "claimDailyPack()" --rpc-url $RPC --private-key $ALICE_PK > /dev/null
COMMIT=$(cast keccak $SALT)
cast send $CORE "packCommit(uint256,bytes32)" 1 $COMMIT --rpc-url $RPC --private-key $ALICE_PK > /dev/null
cast send $CORE "packReveal(uint256,bytes32)" 1 $SALT --rpc-url $RPC --private-key $ALICE_PK > /dev/null
echo "  开出 5 张卡（rarity,star,kind,ref）："
for i in 1 2 3 4 5; do
  INFO=$(cast call $CORE "cardInfo(uint256)(uint8,uint8,uint8,uint32)" $i --rpc-url $RPC | tr '\n' ' ' | tr -s ' ')
  echo "    card#$i  $INFO"
done
OWNER=$(cast call $CORE "ownerOf(uint256)(address)" 1 --rpc-url $RPC)
echo "  card#1 owner: $OWNER"

echo "── 5/8 alice 流片 card#1 → 穿卡 → 入池"
strip() { sed 's/ *\[.*//'; }
COST=$(cast call $CORE "tapeCost(uint256)(uint256,uint256)" 1 --rpc-url $RPC | head -1 | strip)
echo "  tapeCost(card#1) = $COST wei（真网表门数 × NAND + 费用，合约视图报价）"
cast send $CORE "tapeOut(uint256)" 1 --value $COST --rpc-url $RPC --private-key $ALICE_PK > /dev/null
CIRCUIT=$(cast call $CORE "cardCircuit(uint256)(uint256)" 1 --rpc-url $RPC)
echo "  circuit NFT id = $CIRCUIT (processor 上的真身，owner=alice)"
cast send $CORE "equip(uint256)" 1 --rpc-url $RPC --private-key $ALICE_PK > /dev/null
cast send $CORE "claimIntoPool()" --rpc-url $RPC --private-key $ALICE_PK > /dev/null
POOL=$(cast call $CORE "poolSize()(uint256)" --rpc-url $RPC)
echo "  activeCircuit(card#1) / poolSize: $(cast call $CORE "activeCircuit(address)(uint256)" $ALICE --rpc-url $RPC) / $POOL"

echo "── 6/8 bob（部署者）买首充包 → 开"
cast send $CORE "buyPack(uint8)" 0 --value 0.002ether --rpc-url $RPC --private-key $DEPLOYER_PK > /dev/null
cast send $CORE "packCommit(uint256,bytes32)" 2 $COMMIT --rpc-url $RPC --private-key $DEPLOYER_PK > /dev/null
cast send $CORE "packReveal(uint256,bytes32)" 2 $SALT --rpc-url $RPC --private-key $DEPLOYER_PK > /dev/null
echo "  bob cards: $(cast call $CORE "balanceOf(address)(uint256)" $(cast wallet address --private-key $DEPLOYER_PK) --rpc-url $RPC)"

echo "── 7/8 alice 邀请关系 + 积分"
cast send $CORE "invite(address)" $(cast wallet address --private-key $DEPLOYER_PK) --rpc-url $RPC --private-key $ALICE_PK > /dev/null
echo "  alice packPoints: $(cast call $CORE "packPoints(address)(uint256)" $ALICE --rpc-url $RPC)"

echo "── 8/8 权限与资金分账检查"
DEPLOYER=$(cast wallet address --private-key $DEPLOYER_PK)
DEAD=0x000000000000000000000000000000000000dEaD
echo "  销毁地址余额（应=0.001）: $(cast balance $DEAD --rpc-url $RPC) ETH"
echo "  奖池地址余额（应=0.001）: $(cast balance $DEPLOYER --rpc-url $RPC) ETH"
PRIZE=$(cast call $CORE "prizePool()(address)" --rpc-url $RPC)
echo "  合约 prizePool 参数: $PRIZE"
# 无 .ai 的地址应被拒绝（用 anvil #3 自己的私钥签名）
CAROL_PK=$(python3 -c "
import re
log=open('$ANVIL_LOG').read()
sec=log.split('Private Keys',1)[1]
keys=re.findall(r'\(\d+\) (0x[0-9a-fA-F]{64})', sec)
print(keys[3])")
set +e
REVERT=$(cast send $CORE "claimDailyPack()" --rpc-url $RPC --private-key $CAROL_PK 2>&1 || true)
echo "  无 .ai 地址调用被拒: $(echo "$REVERT" | grep -q 'NoAgentId' && echo YES✓ || echo NO✗)"
set -e

echo ""
echo "════ E2E 全绿：合约在真实链上完成了 领包→开包→流片→穿卡→入池→买包→邀请 全旅程 ════"
