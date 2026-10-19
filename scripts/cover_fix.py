#!/usr/bin/env python3
"""
Retoca las portadas: cambia los textos sin sentido que dejó la IA (cintas policiales y carteles)
por textos limpios y con sentido. Lee de art/covers_raw/ (lo que deja scripts/slice_covers.sh) y
escribe en public/img/covers/, así que se puede ejecutar las veces que haga falta.

  python3 scripts/cover_fix.py            → retoca todas
  python3 scripts/cover_fix.py shrek ...  → solo esas
"""
import math
import os
import shutil
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'art', 'covers_raw')
OUT = os.path.join(ROOT, 'public', 'img', 'covers')
IMPACT = '/System/Library/Fonts/Supplemental/Impact.ttf'
GEORGIA_B = '/System/Library/Fonts/Supplemental/Georgia Bold.ttf'
ARIAL_BLACK = '/System/Library/Fonts/Supplemental/Arial Black.ttf'
COPPER = '/System/Library/Fonts/Supplemental/Copperplate.ttc'

YELLOW = (246, 200, 30)
INK = (30, 24, 28)
SS = 3  # supermuestreo para bordes suaves

# Cintas en las esquinas: (esquina, texto). La posición se mide sobre la imagen.
TAPES = {
    'anillos': [('TL', None)],
    'marvel': [('BR', None)],
    'potter': [('BR', None)],
    'shrek': [('TL', None), ('BR', None)],
    'simpson': [('BR', None)],
    'stranger': [('TL', None), ('BR', None)],
    'toystory': [('BR', None)],
    'tronos': [('TL', None)],
}


def yellow_mask(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (r > 185) & (g > 135) & (b < 125) & (r - b > 105)


def band_range(im, corner):
    """Tramo [d0, d1] (d = distancia «diagonal» a la esquina) que ocupa la cinta amarilla."""
    a = np.asarray(im.convert('RGB')).astype(int)
    H, W, _ = a.shape
    ys, xs = np.mgrid[0:H, 0:W]
    d = xs + ys if corner == 'TL' else (W - 1 - xs) + (H - 1 - ys)
    yl = yellow_mask(a)
    maxd = int(0.27 * W)  # las cintas de esquina nunca pasan de ahí
    ratio = np.zeros(maxd)
    for v in range(12, maxd):
        sel = d == v
        ratio[v] = yl[sel].mean()
    sm = np.convolve(ratio, np.ones(5) / 5, mode='same')
    on = sm > 0.28
    best, start = (0, 0), None
    for i, v in enumerate(list(on) + [False]):
        if v and start is None:
            start = i
        if not v and start is not None:
            if i - start > best[1] - best[0]:
                best = (start, i)
            start = None
    return best


def tape_strip(length, thick, text, font_path=IMPACT):
    """Tira horizontal de cinta policial (RGBA), con el texto repetido y centrado."""
    L, T = int(length * SS), int(round(thick * SS))
    strip = Image.new('RGBA', (L, T), YELLOW + (255,))
    dr = ImageDraw.Draw(strip)
    # sombreado suave en los bordes y contorno oscuro de dibujo animado
    edge = max(2, int(T * 0.06))
    dr.rectangle([0, 0, L, edge], fill=(214, 168, 18, 255))
    dr.rectangle([0, T - edge, L, T], fill=(214, 168, 18, 255))
    ow = max(SS, int(1.6 * SS))
    dr.rectangle([0, 0, L, ow], fill=INK + (255,))
    dr.rectangle([0, T - ow, L, T], fill=INK + (255,))
    size = int(T * 0.66)
    font = ImageFont.truetype(font_path, size)
    sep = '   •   '
    unit_w = dr.textlength(text + sep, font=font)
    text_w = dr.textlength(text, font=font)
    x0 = L / 2 - text_w / 2
    # hacia la izquierda y la derecha hasta cubrir la tira
    starts = []
    x = x0
    while x > -unit_w:
        starts.append(x)
        x -= unit_w
    x = x0 + unit_w
    while x < L:
        starts.append(x)
        x += unit_w
    bbox = font.getbbox('ESCENA')
    ty = (T - (bbox[3] + bbox[1])) / 2
    for sx in starts:
        dr.text((sx, ty), text + sep, font=font, fill=INK + (255,))
    return strip


def paste_rotated(base, strip, angle, center, clip_right=None):
    rot = strip.rotate(angle, resample=Image.BICUBIC, expand=True)
    rot = rot.resize((max(1, rot.width // SS), max(1, rot.height // SS)), Image.LANCZOS)
    x = int(round(center[0] - rot.width / 2))
    y = int(round(center[1] - rot.height / 2))
    layer = Image.new('RGBA', base.size, (0, 0, 0, 0))
    layer.alpha_composite(rot, (max(0, x), max(0, y)), (max(0, -x), max(0, -y)))
    if clip_right is not None:
        ImageDraw.Draw(layer).rectangle([int(clip_right), 0, base.width, base.height], fill=(0, 0, 0, 0))
    base.alpha_composite(layer)


def fix_corner(im, corner, text):
    W, H = im.size
    d0, d1 = band_range(im, corner)
    if d1 - d0 < 20:
        print(f'   (no encuentro la cinta en {corner})')
        return
    d0 -= 7
    d1 += 7
    c = (d0 + d1) / 2
    thick = (d1 - d0) / math.sqrt(2)
    visible = c * math.sqrt(2)
    phrase = text or ('NO PASAR' if visible < 250 else 'ESCENA DEL CRIMEN')
    strip = tape_strip(visible + 4 * thick, thick, phrase)
    center = (c / 2, c / 2) if corner == 'TL' else (W - 1 - c / 2, H - 1 - c / 2)
    paste_rotated(im, strip, 45, center)
    print(f'   cinta {corner}: d={d0}–{d1} grosor={thick:.0f}px «{phrase}»')


def fix_padrino(im):
    """Cinta «DETECTION DETECTIVE» que cruza la pared hasta la puerta del baño."""
    a = np.asarray(im.convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    yl = (r > 215) & (g > 175) & (b < 90)
    cols, cen, th = [], [], []
    for x in range(4, 500):
        col = yl[250:440, x]
        best, start = (0, 0), None
        for i, v in enumerate(list(col) + [False]):
            if v and start is None:
                start = i
            if not v and start is not None:
                if i - start > best[1] - best[0]:
                    best = (start, i)
                start = None
        if best[1] - best[0] >= 14:
            cols.append(x)
            cen.append(250 + (best[0] + best[1]) / 2)
            th.append(best[1] - best[0])
    cols, cen = np.array(cols, float), np.array(cen)
    # pendiente robusta (Theil–Sen sobre pares separados)
    idx = np.arange(len(cols))
    slopes = [(cen[j] - cen[i]) / (cols[j] - cols[i]) for i in idx[::7] for j in idx[::7] if cols[j] - cols[i] > 60]
    m = float(np.median(slopes))
    b0 = float(np.median(cen - m * cols))
    ang = math.degrees(math.atan(m))
    thick = float(np.percentile(th, 85)) * math.cos(math.atan(m)) + 10
    x_end = float(cols.max()) + 3
    x_start = -60
    length = (x_end + 40 - x_start) / math.cos(math.atan(m))
    cx = (x_start + x_end + 40) / 2
    strip = tape_strip(length, thick, 'ESCENA DEL CRIMEN')
    # el extremo derecho se corta en vertical, junto al marco de la puerta, como el original
    paste_rotated(im, strip, -ang, (cx, m * cx + b0), clip_right=x_end)
    print(f'   cinta central: ángulo={ang:.1f}° grosor={thick:.0f}px hasta x={x_end:.0f}')


def fill_sample(im, box, sample_box):
    """Rellena box con el color medio de sample_box y un leve degradado vertical."""
    a = np.asarray(im.convert('RGB').crop(sample_box)).reshape(-1, 3)
    med = np.median(a, axis=0)
    dr = ImageDraw.Draw(im)
    dr.rectangle(box, fill=tuple(int(v) for v in med) + (255,))


def glow_text(im, xy, text, font, fill, glow, anchor='mm', radius=6):
    layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).text(xy, text, font=font, fill=glow + (200,), anchor=anchor)
    layer = layer.filter(ImageFilter.GaussianBlur(radius))
    im.alpha_composite(layer)
    ImageDraw.Draw(im).text(xy, text, font=font, fill=fill + (255,), anchor=anchor)


def soft_patch(im, box, fill=None, blur=0, feather=4):
    """Tapa una zona con un color liso o con la propia imagen muy desenfocada, con bordes suaves."""
    x0, y0, x1, y1 = box
    if fill is not None:
        patch = Image.new('RGBA', (x1 - x0, y1 - y0), fill + (255,))
    else:
        pad = blur * 2
        big = im.crop((x0 - pad, y0 - pad, x1 + pad, y1 + pad)).filter(ImageFilter.GaussianBlur(blur))
        patch = big.crop((pad, pad, pad + x1 - x0, pad + y1 - y0))
    mask = Image.new('L', patch.size, 0)
    ImageDraw.Draw(mask).rectangle([feather, feather, patch.width - 1 - feather, patch.height - 1 - feather], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(feather / 2))
    patch.putalpha(mask)
    im.alpha_composite(patch, (x0, y0))


def fix_friends(im):
    # Placa de la pared: «1990 York» → «CENTRAL PERK» (las líneas pequeñas se quedan, como un menú).
    a = np.asarray(im.convert('RGB')).astype(int)

    def bg_at(x0, x1):
        region = a[238:322, x0:x1].reshape(-1, 3)  # fondo de la placa bajo el título (sin letras grandes)
        dark = region[region.sum(axis=1) <= np.percentile(region.sum(axis=1), 50)]
        return np.median(dark, axis=0)

    left, right = bg_at(280, 320), bg_at(395, 435)
    grad = Image.new('RGBA', (162, 78))
    gd = ImageDraw.Draw(grad)
    for x in range(grad.width):
        t = x / (grad.width - 1)
        gd.line([(x, 0), (x, grad.height)], fill=tuple(int(left[k] * (1 - t) + right[k] * t) for k in range(3)) + (255,))
    mask = Image.new('L', grad.size, 0)
    ImageDraw.Draw(mask).rectangle([5, 5, grad.width - 6, grad.height - 6], fill=255)
    grad.putalpha(mask.filter(ImageFilter.GaussianBlur(2.5)))
    im.alpha_composite(grad, (276, 158))
    cream = (234, 222, 198, 255)
    dr = ImageDraw.Draw(im)
    dr.text((357, 182), 'CENTRAL', font=ImageFont.truetype(GEORGIA_B, 24), fill=cream, anchor='mm')
    dr.text((357, 212), 'PERK', font=ImageFont.truetype(GEORGIA_B, 24), fill=cream, anchor='mm')
    print('   placa: CENTRAL PERK')


def fix_office(im):
    # Calendario: «Dull Pennsylania» → «DUNDER MIFFLIN» (papel ligeramente inclinado).
    a = np.asarray(im.convert('RGB')).astype(int)
    region = a[30:68, 370:540].reshape(-1, 3)
    bright = region[region.sum(axis=1) >= np.percentile(region.sum(axis=1), 75)]
    paper = tuple(int(v) for v in np.median(bright, axis=0))
    ImageDraw.Draw(im).polygon([(357, 34), (551, 23), (551, 69), (357, 72)], fill=paper + (255,))
    font = ImageFont.truetype(ARIAL_BLACK, 19)
    txt = Image.new('RGBA', (240, 50), (0, 0, 0, 0))
    ImageDraw.Draw(txt).text((120, 25), 'DUNDER MIFFLIN', font=font, fill=(44, 44, 58, 255), anchor='mm')
    txt = txt.rotate(3.2, resample=Image.BICUBIC)
    im.alpha_composite(txt, (453 - 120, 48 - 25))
    print('   calendario: DUNDER MIFFLIN')


def fix_peaky(im):
    # Letrero luminoso del bar: «19200» → «THE GARRISON». Se desenfoca el letrero (queda el brillo) y se escribe encima.
    soft_patch(im, (584, 96, 768, 210), blur=22, feather=8)
    gold, glow = (255, 216, 128), (255, 168, 56)
    glow_text(im, (676, 126), 'THE', ImageFont.truetype(GEORGIA_B, 17), gold, glow, radius=5)
    glow_text(im, (676, 162), 'GARRISON', ImageFont.truetype(GEORGIA_B, 27), gold, glow, radius=7)
    print('   letrero: THE GARRISON')


SPECIAL = {'padrino': fix_padrino, 'friends': fix_friends, 'office': fix_office, 'peaky': fix_peaky}


def main():
    os.makedirs(RAW, exist_ok=True)
    ids = sys.argv[1:] or sorted(f[:-5] for f in os.listdir(RAW) if f.endswith('.webp'))
    for cid in ids:
        raw = os.path.join(RAW, f'{cid}.webp')
        out = os.path.join(OUT, f'{cid}.webp')
        if not os.path.exists(raw):
            shutil.copyfile(out, raw)
        if cid not in TAPES and cid not in SPECIAL:
            shutil.copyfile(raw, out)
            continue
        im = Image.open(raw).convert('RGBA')
        print(cid)
        for corner, text in TAPES.get(cid, []):
            fix_corner(im, corner, text)
        if cid in SPECIAL:
            SPECIAL[cid](im)
        im.convert('RGB').save(out, 'WEBP', quality=88, method=6)


if __name__ == '__main__':
    main()
