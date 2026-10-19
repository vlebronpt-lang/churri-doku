"""Procesa retratos individuales art/singles/<id>-<char>.png → public/img/portraits/<id>/<char>.webp
Recorta al contenido (quita márgenes blancos), luego un cuadrado centrado con un pequeño margen interior."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parent.parent
for f in sorted((root / 'art' / 'singles').glob('*.png')):
    pid, cid = f.stem.split('-', 1)
    img = Image.open(f).convert('RGB')
    a = np.asarray(img).astype(int)
    nonwhite = ~((a[:, :, 0] > 236) & (a[:, :, 1] > 236) & (a[:, :, 2] > 236))
    ys, xs = np.where(nonwhite)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    img = img.crop((x0, y0, x1 + 1, y1 + 1))
    # Quitar marcos oscuros (líneas casi negras en los bordes).
    b = np.asarray(img.convert('L')).astype(int)
    hh, ww = b.shape
    lim = int(min(hh, ww) * 0.12)
    dark = b < 70
    t = 0
    while t < lim and dark[t, :].mean() > 0.5: t += 1
    bt = 0
    while bt < lim and dark[hh - 1 - bt, :].mean() > 0.5: bt += 1
    l = 0
    while l < lim and dark[:, l].mean() > 0.5: l += 1
    r = 0
    while r < lim and dark[:, ww - 1 - r].mean() > 0.5: r += 1
    if t or bt or l or r:
        pad = int(min(hh, ww) * 0.02)
        img = img.crop((l + pad if l else 0, t + pad if t else 0, ww - (r + pad if r else 0), hh - (bt + pad if bt else 0)))
    w, h = img.size
    s = min(w, h)
    inset = int(s * 0.035)
    left, top = (w - s) // 2 + inset, (h - s) // 2 + inset
    img = img.crop((left, top, left + s - 2 * inset, top + s - 2 * inset)).resize((384, 384), Image.LANCZOS)
    out = root / 'public' / 'img' / 'portraits' / pid / f'{cid}.webp'
    img.save(out, 'WEBP', quality=86, method=6)
    print('✔', out.relative_to(root), f'(contenido {x1 - x0}x{y1 - y0})')
