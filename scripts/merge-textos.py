#!/usr/bin/env python3
"""Junta los textos de los casos nuevos (art/textos/<id>.json) con motives.ts y grudges.ts y quita los de los casos descartados.
   python3 scripts/merge-textos.py"""
import json, os, re, shutil, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DROP = ['stranger', 'avecina', 'walking', 'calamar', 'papel', 'starwars', 'padrino']
src = os.path.join(root, 'art', 'textos')

def q(t):
    return "'" + t.replace('\\', '\\\\').replace("'", "\\'") + "'"
KEY = re.compile(r'^[A-Za-z_$][\w$]*$')
def key(k):
    return k if KEY.match(k) else q(k)

def merge(path, field):
    s = open(path).read()
    head, sep, body = s.partition('= {\n')
    assert sep, path
    end = body.rindex('};')
    tail = body[end:]
    body = body[:end]
    blocks = re.findall(r'^  (\'?[\w-]+\'?): \{\n(.*?)^  \},\n', body, flags=re.M | re.S)
    out = {k.strip("'"): v for k, v in blocks}
    for d in DROP:
        out.pop(d, None)
    for f in sorted(os.listdir(src)):
        if not f.endswith('.json'):
            continue
        cid = f[:-5]
        j = json.load(open(os.path.join(src, f)))
        out[cid] = ''.join(f"    {key(k)}: {q(v)},\n" for k, v in j[field].items())
    text = ''.join(f"  {key(k)}: {{\n{v}  }},\n" for k, v in out.items())
    open(path, 'w').write(head + sep + text + tail)
    print(path, len(out), 'casos')

merge(os.path.join(root, 'src', 'data', 'motives.ts'), 'motives')
merge(os.path.join(root, 'src', 'data', 'grudges.ts'), 'grudges')
