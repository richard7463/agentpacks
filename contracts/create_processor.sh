#!/usr/bin/env bash
# 在 BNB 主网用 TapeOut CPU Factory 创建我们自己的 processor + transistor。
# 参数见下方默认值；私钥从环境变量 PROCESSOR_PK 读入，不写进仓库。
set -euo pipefail

RPC="${RPC:-https://bsc-dataseed.bnbchain.org}"
BEM="0x5ce033B2bFCa3Af30b3e8C8457DeaF776A8b695a"
FACTORY="0x68224F668083c29e9800Be2a646d42d18cedF7e2"
PK="${PROCESSOR_PK:-$(cat "$(dirname "$0")/../.deploy-testnet.key")}"

NAME="${NAME:-Kaling Circuit}"
SYMBOL="${SYMBOL:-KALC}"
STORY="${STORY:-Kaling War: 12 NAND rule circuits verified by exhaustive enumeration.}"
SUPPLY="${SUPPLY:-1000000}"      # NAND raw units (token 0)
MINT_PRICE="${MINT_PRICE:-1734000}" # 0.01734 BEM/gate ≈ $0.167/gate @ BEM=$9.61 → 60 门≈$10
FEE="10000000"                   # 0.1 BEM deploy fee (deployFee())

GAS=(--gas-price 300000000 --priority-gas-price 100000000)

WHO=$(cast wallet address --private-key "$PK")
echo "creator: $WHO  rpc: $RPC"
echo "BEM balance: $(cast call "$BEM" 'balanceOf(address)(uint256)' "$WHO" --rpc-url "$RPC")"
echo "factory deployFee: $(cast call "$FACTORY" 'deployFee()(uint256)' --rpc-url "$RPC")"
echo "params: name=$NAME symbol=$SYMBOL supply=$SUPPLY mintPrice=$MINT_PRICE raw BEM units"

COUNT_BEFORE=$(cast call "$FACTORY" 'cpuCount()(uint256)' --rpc-url "$RPC")
echo "cpuCount before: $COUNT_BEFORE"

echo "1/2 approve BEM…"
cast send "$BEM" 'approve(address,uint256)' "$FACTORY" "$FEE" \
  --private-key "$PK" --rpc-url "$RPC" "${GAS[@]}" >/dev/null

echo "2/2 createCPU…"
cast send "$FACTORY" \
  'createCPU(string,string,string,uint256,uint256)' \
  "$NAME" "$SYMBOL" "$STORY" "$SUPPLY" "$MINT_PRICE" \
  --private-key "$PK" --rpc-url "$RPC" "${GAS[@]}"

sleep 3
COUNT_AFTER=$(cast call "$FACTORY" 'cpuCount()(uint256)' --rpc-url "$RPC")
if [ "$COUNT_AFTER" = "$COUNT_BEFORE" ]; then
  echo "ERROR: cpuCount 没增加，创建失败" >&2
  exit 1
fi

IDX=$((COUNT_AFTER - 1))
PROC=$(cast call "$FACTORY" 'cpuAt(uint256)(address)' "$IDX" --rpc-url "$RPC")
TRANS=$(cast call "$PROC" 'transistors()(address)' --rpc-url "$RPC")
echo "processor number: $IDX"
echo "processor (circuits): $PROC"
echo "transistors:          $TRANS"
echo "name: <circuitId>.$IDX.tape"
echo ""
echo "把 processor 地址写进主网部署："
echo "  export TAPE_PROCESSOR=$PROC"
