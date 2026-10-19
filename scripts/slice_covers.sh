#!/bin/bash
# Recorta las hojas 2x2 de portadas (art/covers/<hoja>.png) en art/covers_raw/<id>.webp
# y después las retoca (scripts/cover_fix.py) en public/img/covers/<id>.webp
set -e
c() { python3 scripts/slice.py "art/covers/$1.png" 2 2 "$2" "$3" --size 768 > /dev/null && echo "✔ $1"; }
c A art/covers_raw shrek,simpson,toystory,stranger
c B art/covers_raw piratas,friends,office,dragonball
c C art/covers_raw jurassic,peaky,breaking,vikingos
c D art/covers_raw miercoles,avecina,walking,papel
c E art/covers_raw starwars,batman,calamar,titanes
c F art/covers_raw tronos,potter,marvel,anillos
c G art/covers_raw padrino,-,-,-
python3 scripts/slice.py art/covers/G.png 2 2 public/img/ui -,board,desk,files --size 900 > /dev/null && echo "✔ ui"
python3 scripts/cover_fix.py
