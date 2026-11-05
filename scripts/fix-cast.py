#!/usr/bin/env python3
"""Reescribe el reparto de los casos nuevos tal como viene en el encargo (art/ampliacion.json).
   python3 scripts/fix-cast.py <id> ..."""
import json, os, re, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
brief = json.load(open(os.path.join(root, 'art', 'ampliacion.json')))
only = set(sys.argv[1:])
if not only: sys.exit('Indica los casos: python3 scripts/fix-cast.py <id> ... (reescribe su reparto con el del encargo y pierde lo retocado a mano)')
def q(t): return "'" + t.replace("'", "\\'") + "'"
for c in brief:
    if only and c['id'] not in only: continue
    p = os.path.join(root, 'src', 'data', 'puzzles', c['id'] + '.ts')
    if not os.path.exists(p): continue
    s = open(p).read()
    lines = []
    for x in c['cast']:
        parts = [f"id: {q(x['id'])}", f"tag: {q(x['tag'])}", f"name: {q(x['name'])}"]
        if x.get('article'): parts.append(f"article: {q(x['article'])}")
        parts.append(f"gender: {q(x['gender'])}")
        if x.get('nonhuman'): parts.append('nonhuman: true')
        if x['id'] == c['victim']: parts.append('victim: true')
        if x.get('groups'): parts.append('groups: [' + ', '.join(q(g) for g in x['groups']) + ']')
        if x.get('portrait'): parts.append(f"portrait: {q(x['portrait'])}")
        parts.append('clues: []')
        lines.append('    { ' + ', '.join(parts) + ' },')
    block = 'cast: [\n' + '\n'.join(lines) + '\n  ],'
    new, n = re.subn(r"cast: \[\n.*?\n  \],", lambda m: block, s, count=1, flags=re.S)
    if n != 1: print('✘ sin reparto', c['id']); continue
    new = re.sub(r"\n  art: '[^']*',", '', new)
    if new != s:
        open(p, 'w').write(new)
        print('✔ arreglado', c['id'])
