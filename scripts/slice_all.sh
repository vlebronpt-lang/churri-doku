#!/bin/bash
# Recorta todas las hojas de retratos (art/sheets) en public/img/portraits/<id>/<char>.webp
set -e
s() { python3 scripts/slice.py "art/sheets/$1.png" "$2" "$3" "public/img/portraits/$1" "$4" > /dev/null && echo "✔ $1"; }
s shrek 2 3 S,A,F,D,LF,-
s simpson 2 3 H,M,B,L,G,V
s toystory 2 3 W,B,J,K,Bb,L
s piratas 2 3 J,W,E,G,N,B
s friends 2 4 Ra,M,P,Ro,C,J,H,-
s office 2 4 M,D,J,P,A,K,T,-
s dragonball 2 4 G,V,B,P,F,M,K,-
s jurassic 2 4 A,E,I,H,M,D,N,-
s peaky 2 4 T,A,P,J,Al,G,C,-
s breaking 2 4 W,J,Sk,Ha,Sa,M,He,G
s vikingos 2 4 R,L,Ro,F,B,A,I,At
s miercoles 2 4 M,E,T,X,B,W,C,R
s batman 3 3 B,R,G,C,H,P,E,Hi,J
s titanes 3 3 E,M,A,L,J,R,B,An,Ma
s tronos 2 5 T,C,J,S,O,M,Me,V,P,Jo
s potter 2 5 H,He,R,S,D,B,M,Hg,V,Du
s marvel 2 5 I,C,T,H,V,O,S,D,L,Th
s anillos 2 5 G,A,L,Gi,T,M,P,B,Gr,S
# Los retratos de la ampliación NO se pueden rehacer desde sus hojas: Seedream cambió de sitio muchas casillas y hay
# retratos recortados a mano o rehechos sueltos. La fuente de verdad es public/img/portraits; para uno nuevo o rehecho:
#   python3 scripts/slice.py art/sheets/<id>.png <filas> <cols> public/img/portraits/<id> <ids> --inset 0.055
#   python3 scripts/singles.py <id>-<personaje> ...
