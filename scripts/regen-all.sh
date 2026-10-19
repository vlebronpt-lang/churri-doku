#!/bin/bash
# Regenera las pistas de los 25 casos con la escala de dificultad actual (conserva la colocación).
#   bash scripts/regen-all.sh [paralelos]
cd "$(dirname "$0")/.."
P=${1:-7}
mkdir -p .gen/regen
jobs=""
for id in tronos marvel potter anillos padrino papel starwars batman calamar titanes breaking vikingos miercoles avecina walking office friends dragonball jurassic peaky shrek simpson toystory stranger piratas; do
  lvl=$(grep -m1 -E "^\s+level: [0-9]" src/data/puzzles/$id.ts | grep -oE "[0-9]")
  case $lvl in
    1) t=200; a=40 ;;
    2) t=600; a=120 ;;
    3) t=1000; a=200 ;;
    4) t=1500; a=260 ;;
    5) t=2100; a=320 ;;
  esac
  jobs+="$id $t $a"$'\n'
done
printf "%s" "$jobs" | xargs -P "$P" -L 1 bash -c 'npx tsx scripts/gen.ts "$0" --keep-solution --tries 5000 --time "$1" --attempt "$2" --top 3 --write 1 > ".gen/regen/$0.log" 2>&1; echo "hecho $0"'
