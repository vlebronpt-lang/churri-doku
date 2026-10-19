#!/usr/bin/env python3
"""
Retratos ligeros para los PDF: JPEG (Chrome los incrusta tal cual, sin recomprimir en PNG),
a color y en escala de grises. public/img/portraits/<caso>/<id>.webp → public/img/print/<caso>/<id>(-bn).jpg
"""
import os
from PIL import Image, ImageEnhance, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public', 'img', 'portraits')
DST = os.path.join(ROOT, 'public', 'img', 'print')
SIZE = 220

n = 0
for case in sorted(os.listdir(SRC)):
    d = os.path.join(SRC, case)
    if not os.path.isdir(d):
        continue
    os.makedirs(os.path.join(DST, case), exist_ok=True)
    for f in sorted(os.listdir(d)):
        if not f.endswith('.webp'):
            continue
        im = Image.open(os.path.join(d, f)).convert('RGB').resize((SIZE, SIZE), Image.LANCZOS)
        base = os.path.join(DST, case, f[:-5])
        im.save(base + '.jpg', 'JPEG', quality=84, optimize=True, progressive=False)
        g = ImageEnhance.Contrast(ImageOps.grayscale(im)).enhance(1.05)
        g.save(base + '-bn.jpg', 'JPEG', quality=84, optimize=True, progressive=False)
        n += 1
print(f'{n} retratos para imprimir')
