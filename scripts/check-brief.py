#!/usr/bin/env python3
"""Compara cada caso nuevo con su encargo (art/ampliacion.json): título, nivel, tamaño, reparto, grupos y reglas.
   python3 scripts/check-brief.py [id ...]"""
import json, os, re, subprocess, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
brief = json.load(open(os.path.join(root, 'art', 'ampliacion.json')))
only = set(sys.argv[1:])
js = """
import { pathToFileURL } from 'node:url';
const ids = process.argv.slice(2);
const out: Record<string, unknown> = {};
for (const id of ids) {
  try { out[id] = (await import(pathToFileURL(`src/data/puzzles/${id}.ts`).href)).default; } catch (e) { out[id] = { error: String(e) }; }
}
console.log(JSON.stringify(out));
"""
ids = [c['id'] for c in brief if (not only or c['id'] in only) and os.path.exists(os.path.join(root, 'src/data/puzzles', c['id'] + '.ts'))]
tmp = os.path.join(root, 'scripts', '.tmp-brief.ts')
open(tmp, 'w').write(js)
res = subprocess.run(['npx', 'tsx', tmp, *ids], cwd=root, capture_output=True, text=True)
os.remove(tmp)
data = json.loads(res.stdout.strip().splitlines()[-1]) if res.stdout.strip() else {}
if not data: print(res.stderr[:2000])
bad = 0
for c in brief:
    if c['id'] not in data: continue
    d = data[c['id']]
    errs = []
    if 'error' in d: errs.append(d['error'])
    else:
        for k in ['id', 'num', 'level', 'size', 'franchise', 'title']:
            if d.get(k) != c[k]: errs.append(f'{k}: {d.get(k)!r} ≠ {c[k]!r}')
        if d.get('wantMurderer') != c['murderer']: errs.append(f"wantMurderer: {d.get('wantMurderer')!r}")
        cast = {x['id']: x for x in d['cast']}
        if set(cast) != {x['id'] for x in c['cast']}: errs.append(f'reparto: {sorted(cast)}')
        for x in c['cast']:
            y = cast.get(x['id'])
            if not y: continue
            for k in ['tag', 'name', 'gender', 'article', 'nonhuman', 'portrait']:
                if x.get(k) != y.get(k): errs.append(f"{x['id']}.{k}: {y.get(k)!r} ≠ {x.get(k)!r}")
            if sorted(x.get('groups', [])) != sorted(y.get('groups', [])): errs.append(f"{x['id']}.groups: {y.get('groups')}")
            if bool(y.get('victim')) != (x['id'] == c['victim']): errs.append(f"{x['id']}.victim")
        if json.dumps(d.get('groups', {}), sort_keys=True, ensure_ascii=False) != json.dumps(c['groups'], sort_keys=True, ensure_ascii=False): errs.append('groups distintos')
        rules = d.get('rules', [])
        if len(rules) != len(c['rules']): errs.append(f'reglas: {len(rules)} (encargo: {len(c["rules"])})')
        else:
            for a, b in zip(rules, c['rules']):
                if a['t'] != b['t'] or a.get('n') != b.get('n') or a.get('group') != b.get('group'): errs.append(f'regla distinta: {a} / {b}')
    t = os.path.join(root, 'art/textos', c['id'] + '.json')
    if not os.path.exists(t): errs.append('faltan los textos')
    else:
        j = json.load(open(t))
        sus = [x['id'] for x in c['cast'] if x['id'] != c['victim']]
        for k in ['motives', 'grudges']:
            miss = [s for s in sus if s not in j.get(k, {})]
            if miss: errs.append(f'{k}: faltan {miss}')
        need = [x['id'] for x in c['cast'] if 'portrait' not in x]
        miss = [s for s in need if s not in j.get('looks', {})]
        if miss: errs.append(f'looks: faltan {miss}')
        if not j.get('cover'): errs.append('falta cover')
    print(('✘ ' if errs else '✔ ') + c['id'] + (': ' + ' · '.join(errs) if errs else ''))
    bad += bool(errs)
print(f'{len(data) - bad}/{len(data)} casos conformes; faltan {len(brief) - len(data)} por crear')
sys.exit(1 if bad else 0)
