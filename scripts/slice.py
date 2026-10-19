"""Recorta una hoja de retratos (cuadrícula filas x columnas) en retratos individuales WebP.

Uso:
  python3 scripts/slice.py <hoja.png|jpg|webp> <filas> <columnas> <carpeta_salida> <id1,id2,...> [--size 384]

Detecta los canales blancos entre casillas; si no los encuentra, divide en partes iguales.
Cada retrato se recorta cuadrado (centrado) y se guarda como <id>.webp.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def runs(mask):
    """Tramos [ini, fin) donde mask es True."""
    out, start = [], None
    for i, v in enumerate(mask):
        if v and start is None:
            start = i
        elif not v and start is not None:
            out.append((start, i))
            start = None
    if start is not None:
        out.append((start, len(mask)))
    return out


def segments(white_frac, n, length):
    """Devuelve n segmentos (ini, fin) de contenido separados por canales blancos."""
    gut = white_frac > 0.92
    content = runs(~gut)
    # descartar tramos diminutos
    content = [(a, b) for a, b in content if b - a > length * 0.06]
    if len(content) == n:
        return content
    # fusionar o dividir de forma simple: reparto equitativo
    step = length / n
    return [(int(i * step), int((i + 1) * step)) for i in range(n)]


def main():
    args = sys.argv[1:]
    size = 384
    if '--size' in args:
        k = args.index('--size')
        size = int(args[k + 1])
        args = args[:k] + args[k + 2:]
    src, rows, cols, outdir, ids = args[0], int(args[1]), int(args[2]), Path(args[3]), args[4].split(',')
    outdir.mkdir(parents=True, exist_ok=True)
    img = Image.open(src).convert('RGB')
    a = np.asarray(img).astype(np.int16)
    white = (a[:, :, 0] > 238) & (a[:, :, 1] > 238) & (a[:, :, 2] > 238)
    h, w = white.shape
    col_frac = white.mean(axis=0)
    row_frac = white.mean(axis=1)
    xs = segments(col_frac, cols, w)
    ys = segments(row_frac, rows, h)
    k = 0
    for r in range(rows):
        for c in range(cols):
            if k >= len(ids):
                break
            cid = ids[k]
            k += 1
            if not cid or cid == '-':
                continue
            x0, x1 = xs[c]
            y0, y1 = ys[r]
            tile = img.crop((x0, y0, x1, y1))
            tw, th = tile.size
            s = min(tw, th)
            inset = int(s * 0.03)
            left = (tw - s) // 2 + inset
            top = (th - s) // 2 + inset
            tile = tile.crop((left, top, left + s - 2 * inset, top + s - 2 * inset))
            tile = tile.resize((size, size), Image.LANCZOS)
            tile.save(outdir / f'{cid}.webp', 'WEBP', quality=86, method=6)
            print(f'{cid}: ({x0},{y0})-({x1},{y1}) -> {outdir / (cid + ".webp")}')


if __name__ == '__main__':
    main()
