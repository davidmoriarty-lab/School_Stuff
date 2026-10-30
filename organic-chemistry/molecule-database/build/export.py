"""Write images, CSV, JSON, gallery and README from _records.pkl (run generate.py first)."""
import os, sys, csv, json, pickle, warnings
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..', '..', '_shared'))
warnings.filterwarnings('ignore')
from rdkit import Chem, RDLogger
from rdkit.Chem import Descriptors, rdMolDescriptors, inchi
RDLogger.DisableLog('rdApp.*')
from chemdraw import Struct, compose
import generate as g

ORDER = ['alkane', 'alkene', 'alkyne', 'alcohol', 'aldehyde', 'ketone', 'carboxylic acid', 'ester', 'ether', 'amine']
recs = pickle.load(open(os.path.join(HERE, '_records.pkl'), 'rb'))
recs.sort(key=lambda r: (ORDER.index(r[3]), g.carbons(r[0]), r[1]))
os.makedirs(os.path.join(ROOT, 'images'), exist_ok=True)
rows = []
for i, (smi, mo, cl, cls, sub) in enumerate(recs, 1):
    m = Chem.MolFromSmiles(smi)
    mid = f'M{i:03d}'
    path = os.path.join(ROOT, 'images', mid + '.png')
    compose([Struct(smi, redh=False)], path=path, scale=2)
    if cls == 'alcohol':
        c = m.GetSubstructMatch(Chem.MolFromSmarts('[CX4][OX2H1]'))[0]
        k = sum(1 for n in m.GetAtomWithIdx(c).GetNeighbors() if n.GetAtomicNum() == 6)
        sub = {0: 'primary', 1: 'primary', 2: 'secondary', 3: 'tertiary'}[k]
    centers = Chem.FindMolChiralCenters(m, includeUnassigned=True, useLegacyImplementation=False)
    ez = ('E' in mo[:3] or 'Z' in mo[:3]) and mo.startswith('(')
    rows.append(dict(id=mid, **{'class': cls}, subclass=sub, name=mo, name_classic=cl,
                     common_name=g.COMMON.get(smi, ''), formula=rdMolDescriptors.CalcMolFormula(m),
                     mol_weight=round(Descriptors.MolWt(m), 2), carbons=g.carbons(smi), smiles=smi,
                     inchikey=inchi.MolToInchiKey(m), stereocenters=len(centers), ez_isomer=ez,
                     image=f'images/{mid}.png'))
cols = list(rows[0])
with open(os.path.join(ROOT, 'molecules.csv'), 'w', newline='') as f:
    w = csv.DictWriter(f, cols); w.writeheader(); w.writerows(rows)
json.dump(rows, open(os.path.join(ROOT, 'molecules.json'), 'w'), indent=1)
slim = [{k: r[k] for k in ('id', 'class', 'subclass', 'name', 'name_classic', 'common_name', 'formula', 'carbons', 'image')} for r in rows]
html = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Molecule Database</title><style>
body{font:15px system-ui,sans-serif;margin:0;background:#f6f7f9;color:#1c2430}header{position:sticky;top:0;background:#fff;border-bottom:1px solid #dde;padding:12px 16px;z-index:2}
input,select{font:inherit;padding:6px 8px;margin-right:8px;border:1px solid #bbc;border-radius:6px}#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;padding:16px}
.c{background:#fff;border:1px solid #dde;border-radius:8px;padding:8px;text-align:center}.c img{max-width:100%;height:120px;object-fit:contain}
.id{font-weight:700;color:#356}.n{font-size:13px;margin-top:4px}.s{color:#667;font-size:12px}#cnt{color:#667}
</style></head><body><header><b>Molecule Database</b> <input id="q" placeholder="Search name, formula, ID"><select id="k"><option value="">All classes</option></select><span id="cnt"></span></header><div id="grid"></div>
<script>const D=__DATA__;const k=document.getElementById('k'),q=document.getElementById('q'),g=document.getElementById('grid');
[...new Set(D.map(d=>d.class))].forEach(c=>k.add(new Option(c,c)));
function draw(){const t=q.value.toLowerCase(),c=k.value;const L=D.filter(d=>(!c||d.class==c)&&(!t||(d.id+d.name+d.name_classic+d.common_name+d.formula).toLowerCase().includes(t)));
g.innerHTML=L.map(d=>`<div class="c"><img loading="lazy" src="${d.image}" alt="${d.name}"><div class="id">${d.id}</div><div class="n">${d.name}</div><div class="s">${d.name_classic!=d.name?d.name_classic+'<br>':''}${d.common_name?'('+d.common_name+') ':''}${d.formula}</div></div>`).join('');
document.getElementById('cnt').textContent=L.length+' of '+D.length}
q.oninput=k.onchange=draw;draw();</script></body></html>'''.replace('__DATA__', json.dumps(slim))
open(os.path.join(ROOT, 'index.html'), 'w').write(html)
print('exported', len(rows))
