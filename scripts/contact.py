#!/usr/bin/env python3
"""Hoja de contacto con los retratos de un caso, en el orden del reparto, para revisarlos de un vistazo.
   python3 scripts/contact.py <id> <salida.jpg>"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cid, out = sys.argv[1], sys.argv[2]
brief = {c['id']: c for c in json.load(open(os.path.join(root, 'art', 'ampliacion.json')))}
cast = brief[cid]['cast']
T = 220; L = 26
cols = 5
rows = (len(cast) + cols - 1) // cols
im = Image.new('RGB', (cols * (T + 8) + 8, rows * (T + L + 8) + 8), 'white')
d = ImageDraw.Draw(im)
font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 16)
for k, ch in enumerate(cast):
    path = ch.get('portrait') or f"{cid}/{ch['id']}"
    f = os.path.join(root, 'public', 'img', 'portraits', path + '.webp')
    x, y = 8 + (k % cols) * (T + 8), 8 + (k // cols) * (T + L + 8)
    if os.path.exists(f):
        im.paste(Image.open(f).convert('RGB').resize((T, T), Image.LANCZOS), (x, y))
    else:
        d.rectangle((x, y, x + T, y + T), outline='red', width=3)
        d.text((x + 10, y + 100), 'FALTA', fill='red', font=font)
    d.text((x + 2, y + T + 3), f"{ch['tag']} · {ch['name']}", fill='black', font=font)
im.save(out, quality=85)
print(out, im.size)
