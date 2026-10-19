#!/bin/bash
# Recorta todas las hojas de retratos (art/sheets) en public/img/portraits/<id>/<char>.webp
set -e
s() { python3 scripts/slice.py "art/sheets/$1.png" "$2" "$3" "public/img/portraits/$1" "$4" > /dev/null && echo "✔ $1"; }
s shrek 2 3 S,A,F,D,LF,-
s simpson 2 3 H,M,B,L,G,V
s toystory 2 3 W,B,J,K,Bb,L
s stranger 2 3 N,S,J,T,D,B
s piratas 2 3 J,W,E,G,N,B
s friends 2 4 Ra,M,P,Ro,C,J,H,-
s office 2 4 M,D,J,P,A,K,T,-
s dragonball 2 4 G,V,B,P,F,M,K,-
s jurassic 2 4 A,E,I,H,M,D,N,-
s peaky 2 4 T,A,P,J,Al,G,C,-
s breaking 2 4 W,J,Sk,Ha,Sa,M,He,G
s vikingos 2 4 R,L,Ro,F,B,A,I,At
s miercoles 2 4 M,E,T,X,B,W,C,R
s avecina 2 4 AR,E,Am,M,B,C,J,V
s walking 2 4 R,M,D,C,G,Ma,H,Go
s papel 3 3 P,T,B,N,R,D,M,E,A
s starwars 3 3 L,H,Lu,C,3P,R2,B,La,J
s batman 3 3 B,R,G,C,H,P,E,Hi,J
s calamar 3 3 Gi,Sw,Sb,Il,Al,Mn,Jy,Li,Dk
s titanes 3 3 E,M,A,L,J,R,B,An,Ma
s tronos 2 5 T,C,J,S,O,M,Me,V,P,Jo
s potter 2 5 H,He,R,S,D,B,M,Hg,V,Du
s marvel 2 5 I,C,T,H,V,O,S,D,L,Th
s anillos 2 5 G,A,L,Gi,T,M,P,B,Gr,S
s padrino 2 5 M,V,S,F,T,K,C,Cl,Mc,So
python3 scripts/singles.py > /dev/null && echo "✔ singles"
