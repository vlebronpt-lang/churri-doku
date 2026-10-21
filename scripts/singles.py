"""Procesa retratos individuales art/singles/<id>-<char>.png → public/img/portraits/<id>/<char>.webp
Recorta al contenido (quita márgenes blancos), luego un cuadrado centrado con un pequeño margen interior."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parent.parent

# Retratos en los que el personaje salió pequeño: se amplían para que la cabeza ocupe lo mismo que en el resto de su caso
# (sin buscar marcos oscuros, que confundirían un traje negro con un marco).
ZOOM = {'stranger-O': 2.2, 'piratas-A': 1.7, 'miercoles-B': 1.45, 'padrino-So': 1.4, 'office-P': 1.35}
# Retratos sin margen interior (lo que hay junto al borde, como el dorsal de Ali, no se corta).
NO_INSET = {'calamar-Al'}


def zoom_to_head(img, zoom):
    """Cuadrado 1/zoom del lado, con la coronilla cerca del borde de arriba y la cabeza centrada."""
    a = np.asarray(img).astype(int)
    h, w, _ = a.shape
    k = max(4, min(h, w) // 40)
    bg = np.median(np.concatenate([a[:k, :k].reshape(-1, 3), a[:k, -k:].reshape(-1, 3)]), axis=0)
    fg = np.abs(a - bg).sum(axis=2) > 60
    e = max(4, min(h, w) // 60)  # franja junto al borde que no cuenta (restos del margen blanco)
    rows = np.where(fg[:, e:-e].mean(axis=1) > 0.02)[0]
    rows = rows[rows >= e]
    top = int(rows[0]) if len(rows) else 0
    c = int(min(h, w) / zoom)
    xs = np.where(fg[top:top + c // 2, e:-e].mean(axis=0) > 0.05)[0] + e
    cx = int((xs[0] + xs[-1]) / 2) if len(xs) else w // 2
    y0 = min(max(0, top - int(c * 0.06)), h - c)
    x0 = min(max(0, cx - c // 2), w - c)
    return img.crop((x0, y0, x0 + c, y0 + c))


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
    if (t or bt or l or r) and f.stem not in ZOOM:
        pad = int(min(hh, ww) * 0.02)
        img = img.crop((l + pad if l else 0, t + pad if t else 0, ww - (r + pad if r else 0), hh - (bt + pad if bt else 0)))
    if f.stem in ZOOM:
        img = zoom_to_head(img, ZOOM[f.stem])
    w, h = img.size
    s = min(w, h)
    inset = 0 if f.stem in NO_INSET or f.stem in ZOOM else int(s * 0.035)
    left, top = (w - s) // 2 + inset, (h - s) // 2 + inset
    img = img.crop((left, top, left + s - 2 * inset, top + s - 2 * inset)).resize((384, 384), Image.LANCZOS)
    out = root / 'public' / 'img' / 'portraits' / pid / f'{cid}.webp'
    img.save(out, 'WEBP', quality=86, method=6)
    print('✔', out.relative_to(root), f'(contenido {x1 - x0}x{y1 - y0})')
