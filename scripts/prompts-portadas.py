#!/usr/bin/env python3
"""Prompts de las portadas de los casos nuevos (art/prompts-portadas.json): hojas de 2×2 a partir de `cover` en los textos.
   python3 scripts/prompts-portadas.py"""
import json, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
brief = json.load(open(os.path.join(root, 'art', 'ampliacion.json')))
HEAD = ('Use the attached image ONLY as the style reference: same comic-book cartoon illustration style, bold dark outlines, rich flat colors, moody lighting. '
        'Draw a NEW sheet: a grid of 2 rows x 2 columns of equal square illustrations separated by thin white gutters, each one a different crime scene. '
        'Do NOT copy any scene from the reference. NO people and NO characters at all. ABSOLUTELY NO TEXT anywhere: no letters, no numbers, no signs with words, no captions. '
        'Each scene has one small blank yellow folded evidence marker on the floor. Scenes in reading order, left to right and top to bottom. First scene: ')
ids = [c['id'] for c in brief]
out = []
for k in range(0, len(ids), 4):
    part = ids[k:k + 4]
    covers = []
    for cid in part:
        path = os.path.join(root, 'art', 'textos', cid + '.json')
        covers.append(json.load(open(path))['cover'].strip().rstrip('.'))
    while len(part) < 4:
        part.append('-')
        covers.append('an empty dark room with a single window')
    out.append({'sheet': f'N{k // 4 + 1}', 'ids': part, 'prompt': HEAD + '. Next scene: '.join(covers) + '.'})
json.dump(out, open(os.path.join(root, 'art', 'prompts-portadas.json'), 'w'), ensure_ascii=False, indent=1)
print(len(out), 'hojas de portadas;', max(len(o['prompt']) for o in out), 'caracteres como máximo')
