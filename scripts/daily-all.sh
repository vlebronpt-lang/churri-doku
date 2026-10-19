#!/bin/bash
# Genera el calendario de casos del día en paralelo (los ya generados se saltan).
#   bash scripts/daily-all.sh [días] [paralelos]
cd "$(dirname "$0")/.."
DAYS=${1:-365}
P=${2:-7}
mkdir -p .gen/daily-logs
for k in $(seq 0 $((P - 1))); do
  npx tsx scripts/daily.ts gen --from 2026-10-19 --days "$DAYS" --shard "$k/$P" > ".gen/daily-logs/shard-$k.log" 2>&1 &
done
wait
echo "calendario generado"
