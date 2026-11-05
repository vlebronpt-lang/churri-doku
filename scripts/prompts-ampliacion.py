#!/usr/bin/env python3
"""Prompts de retratos y portadas de la ampliación (art/prompts-ampliacion.json), a partir de art/ampliacion.json y art/textos.
   python3 scripts/prompts-ampliacion.py
Para cada caso: hojas de retratos (solo los que no reutilizan uno existente) y descripción de la portada."""
import json, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
brief = json.load(open(os.path.join(root, 'art', 'ampliacion.json')))
PREFIX = ('Use the attached image ONLY as the style reference: same cute flat cartoon style, same thin dark outlines, same simple faces with small dark eyes and rosy cheeks, '
          'same plain pastel square backgrounds and same white gutters and margin. Draw a NEW sheet: a grid of {R} rows x {C} columns of equal square tiles with NEW characters, '
          'one head-and-shoulders portrait per tile, centered and facing the viewer, each one entirely inside its own tile (hats and hair never cross into another tile). '
          'Do NOT copy any character, hat, glasses or beard from the reference. ABSOLUTELY NO TEXT anywhere: no names, no captions, no labels, no letters, no numbers. No black borders around the tiles. '
          'People have normal round human ears. Tiles in reading order, left to right and top to bottom. First tile: ')
GRID = {1: (1, 1), 2: (1, 2), 3: (2, 2), 4: (2, 2), 5: (2, 3), 6: (2, 3), 7: (2, 4), 8: (2, 4), 9: (3, 3), 10: (2, 5)}
RATIO = {(1, 1): '1:1', (1, 2): '16:9', (2, 2): '1:1', (2, 3): '3:2', (2, 4): '16:9', (3, 3): '1:1', (2, 5): '21:9'}
out = []
for c in brief:
    path = os.path.join(root, 'art', 'textos', c['id'] + '.json')
    if not os.path.exists(path):
        continue
    t = json.load(open(path))
    new = [x for x in c['cast'] if 'portrait' not in x]
    if not new:
        continue
    r, k = GRID[len(new)]
    tiles = [t['looks'].get(x['id'], '???' + x['name']).strip().rstrip('.') for x in new]
    extra = r * k - len(new)
    if extra:
        tiles += ['a plain pastel background with no character' for j in range(extra)]
    prompt = PREFIX.format(R=r, C=k) + '. Next tile: '.join(tiles) + '.'
    out.append({'id': c['id'], 'rows': r, 'cols': k, 'ratio': RATIO[(r, k)], 'ids': [x['id'] for x in new] + ['-'] * extra, 'names': [x['name'] for x in new], 'prompt': prompt, 'cover': t.get('cover', '')})
json.dump(out, open(os.path.join(root, 'art', 'prompts-ampliacion.json'), 'w'), ensure_ascii=False, indent=1)
print(len(out), 'hojas,', sum(len(o['names']) for o in out), 'retratos')
print(max(len(o['prompt']) for o in out), 'caracteres como máximo en un prompt')
