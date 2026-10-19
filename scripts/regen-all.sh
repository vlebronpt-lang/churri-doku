#!/bin/bash
# Regenera la colocación y las pistas de los casos con la escala de dificultad actual
# (conserva el asesino y la sala de la víctima de cada historia).
#   bash scripts/regen-all.sh [paralelos] [id ...]     (ESCALA=2 dobla el tiempo de cada caso; PARAR=3 acaba al tener 3 candidatos)
cd "$(dirname "$0")/.."
P=${1:-7}
shift
IDS=${*:-"tronos marvel potter anillos padrino papel starwars batman calamar titanes breaking vikingos miercoles avecina walking office friends dragonball jurassic peaky shrek simpson toystory stranger piratas"}
mkdir -p .gen/regen
jobs=""
for id in $IDS; do
  lvl=$(grep -m1 -E "^\s+level: [0-9]" src/data/puzzles/$id.ts | grep -oE "[0-9]")
  case $lvl in
    1) t=420; a=180 ;;
    2) t=540; a=220 ;;
    3) t=660; a=260 ;;
    4) t=900; a=320 ;;
    5) t=1200; a=400 ;;
  esac
  s=${ESCALA:-1}
  jobs+="$id $((t * s)) $((a * s))"$'\n'
done
export PARAR
printf "%s" "$jobs" | xargs -P "$P" -L 1 bash -c 'npx tsx scripts/gen.ts "$0" --tries 100000 --time "$1" --attempt "$2" --top 3 --write 1 --stop ${PARAR:-0} > ".gen/regen/$0.log" 2>&1; echo "hecho $0"'
