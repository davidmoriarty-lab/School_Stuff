"""Build the master searchable index (index.html) for everything in this repo.

Run from anywhere:  python3 tools/build_index.py
To add a new collection, write a loader that returns items shaped like the ones below and add it to LOADERS.
Item fields: k (collection key), id, title, tag, text (full-text search blob), img, and optional
q (question/body), a (answer), why, opts, meta (small dict shown on expand), link.
"""
import os, json, html

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
MOL = 'organic-chemistry/molecule-database/'
SNE = 'organic-chemistry/substitution-elimination/'
QZ = 'organic-chemistry/acids-bases/'


def load(rel):
    return json.load(open(os.path.join(ROOT, rel), encoding='utf-8'))


def molecules():
    for r in load(MOL + 'molecules.json'):
        yield dict(k='mol', id=r['id'], title=r['name'], tag=r['class'] + (f" ({r['subclass']})" if r['subclass'] else ''),
                   sub=' · '.join(x for x in (r['name_classic'] if r['name_classic'] != r['name'] else '', r['common_name'], r['formula']) if x),
                   text=' '.join(str(v) for v in r.values()), img=MOL + r['image'],
                   meta={'SMILES': r['smiles'], 'Formula': r['formula'], 'Mol. weight': r['mol_weight'], 'Carbons': r['carbons'],
                         'Stereocenters (unspecified)': r['stereocenters']})


def problems():
    for p in load(SNE + 'problems.json'):
        yield dict(k='prob', id=p['id'], title=p['type'], tag=p['type'], sub=f"{p['mechanism']} · difficulty {p['difficulty']}",
                   text=' '.join(str(p[x]) for x in ('id', 'type', 'mechanism', 'question', 'answer', 'explanation')),
                   img=SNE + p['question_image'] if p['question_image'] else '', q=p['question'], a=p['answer'], why=p['explanation'],
                   aimg=SNE + p['answer_image'] if p['answer_image'] else '', meta={'Source': p['source']})


def quiz():
    for q in load(QZ + 'questions.json'):
        opts = [dict(type=o['type'], value=(QZ + o['value']) if o['type'] == 'img' else o['value']) for o in q['options']]
        txt = ' '.join([q['id'], q['topic'], q['level'], q['stem'], q['why']] + [o['value'] for o in q['options'] if o['type'] == 'text'])
        yield dict(k='quiz', id=q['id'], title=f"Quiz {q['id']} · {q['topic']}", tag=q['topic'], sub=q['level'], text=txt,
                   img=(QZ + q['stem_image']) if q['stem_image'] else '', q=q['stem'], opts=opts, a='ABCD'[0] if False else q['answer'], why=q['why'])


def sims():
    yield dict(k='sim', id='SIM1', title='Enthalpy of Dissolution Virtual Lab', tag='Simulation', sub='Interactive lab simulation',
               text='enthalpy of dissolution virtual lab calorimetry simulation', img='', link='simulations/enthalpy-dissolution-lab/index.html')


LOADERS = [molecules, problems, quiz, sims]
DOCS = [('Quiz (Word)', QZ + 'Acids_Bases_Nomenclature_Quiz.docx'), ('Quiz answer key', QZ + 'Acids_Bases_Nomenclature_Quiz_Answer_Key.docx'),
        ('Sub/Elim problems (Word)', SNE + 'SN_E_Problems.docx'), ('Sub/Elim answer key', SNE + 'SN_E_Answer_Key.docx'),
        ('Molecule gallery', MOL + 'index.html'), ('Molecule data (CSV)', MOL + 'molecules.csv')]
LABELS = {'mol': 'Molecules', 'prob': 'Sub/Elim problems', 'quiz': 'Quiz questions', 'sim': 'Simulations'}

TEMPLATE = r'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Teaching Materials Index</title><style>
:root{--bg:#f5f6f8;--card:#fff;--ink:#1b2430;--mute:#667085;--line:#dde1e8;--acc:#1f5fa8;--chip:#e8eef7;--ok:#17653a}
@media(prefers-color-scheme:dark){:root{--bg:#12161c;--card:#1b222b;--ink:#e6eaf0;--mute:#9aa6b5;--line:#2c3643;--acc:#6aa7ee;--chip:#243042;--ok:#6fd49b}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,sans-serif}
header{position:sticky;top:0;z-index:5;background:var(--card);border-bottom:1px solid var(--line);padding:12px 16px}
h1{font-size:18px;margin:0 0 8px}.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
input[type=search],select{font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)}
input[type=search]{flex:1 1 260px;min-width:0}
button.chip{font:inherit;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;padding:5px 12px;cursor:pointer}
button.chip[aria-pressed=true]{background:var(--acc);border-color:var(--acc);color:#fff}
.docs{font-size:13px;color:var(--mute);margin-top:8px}.docs a{color:var(--acc);margin-right:12px;white-space:nowrap}
#info{color:var(--mute);font-size:13px;padding:10px 16px}
#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;padding:0 16px 16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:6px;min-width:0}
.card.span{grid-column:span 2}@media(max-width:700px){.card.span{grid-column:auto}}
.top{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--mute)}.tag{background:var(--chip);border-radius:6px;padding:1px 7px}
.t{font-weight:650}.sub{font-size:12.5px;color:var(--mute)}.q{font-size:14px}
.card img{max-width:100%;max-height:190px;object-fit:contain;align-self:center;background:#fff;border-radius:6px}
details{font-size:14px}summary{cursor:pointer;color:var(--acc);font-weight:600}
.ans{color:var(--ok);font-weight:600}.meta{font-size:12px;color:var(--mute);word-break:break-all}
.opts{display:grid;grid-template-columns:1fr 1fr;gap:6px}.opts div{font-size:13px}.opts img{max-height:110px}
#more{display:block;margin:6px auto 24px}a{color:var(--acc)}
</style></head><body>
<header><h1>Teaching Materials Index</h1>
<div class="row"><input id="q" type="search" placeholder="Search everything: names, SMILES, questions, answers, mechanisms…" aria-label="Search">
<select id="sub" aria-label="Filter by type"><option value="">All types</option></select></div>
<div class="row" id="chips" style="margin-top:8px"></div><div class="docs">__DOCS__</div></header>
<div id="info"></div><div id="grid"></div><button class="chip" id="more" hidden>Show more</button>
<script>
const DATA=__DATA__,LAB=__LAB__,PAGE=48;
const $=id=>document.getElementById(id);let coll='',shown=PAGE,list=[];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const IDX=DATA.map(d=>(d.text||'').toLowerCase());
function chips(){const ks=Object.keys(LAB);$('chips').innerHTML='<button class="chip" data-k="" aria-pressed="'+(coll==='')+'">All ('+DATA.length+')</button>'+
ks.map(k=>'<button class="chip" data-k="'+k+'" aria-pressed="'+(coll===k)+'">'+LAB[k]+' ('+DATA.filter(d=>d.k===k).length+')</button>').join('')}
function subs(){const tags=[...new Set(DATA.filter(d=>!coll||d.k===coll).map(d=>d.tag))].sort();const cur=$('sub').value;
$('sub').innerHTML='<option value="">All types</option>'+tags.map(t=>'<option>'+esc(t)+'</option>').join('');if(tags.includes(cur))$('sub').value=cur}
function card(d){let h='<div class="card'+(d.k==='quiz'&&d.opts&&d.opts.some(o=>o.type==='img')?' span':'')+'"><div class="top"><span>'+esc(d.id)+'</span><span class="tag">'+esc(d.tag)+'</span></div>'+
'<div class="t">'+esc(d.title)+'</div>'+(d.sub?'<div class="sub">'+esc(d.sub)+'</div>':'')+(d.q?'<div class="q">'+esc(d.q)+'</div>':'')+(d.img?'<img loading="lazy" src="'+esc(d.img)+'" alt="">':'');
if(d.link)h+='<a href="'+esc(d.link)+'">Open →</a>';
if(d.a||d.meta||d.opts){h+='<details><summary>'+(d.a?'Show answer':'Details')+'</summary>';
if(d.opts)h+='<div class="opts">'+d.opts.map((o,i)=>'<div>'+(o.type==='img'?'<img loading="lazy" src="'+esc(o.value)+'" alt="">':'<b>'+'ABCD'[i]+')</b> '+esc(o.value))+'</div>').join('')+'</div>';
if(d.a)h+='<p class="ans">Answer: '+esc(d.a)+'</p>';if(d.aimg)h+='<img loading="lazy" src="'+esc(d.aimg)+'" alt="">';
if(d.why)h+='<p>'+esc(d.why)+'</p>';if(d.meta)h+='<div class="meta">'+Object.entries(d.meta).map(([k,v])=>esc(k)+': '+esc(v)).join('<br>')+'</div>';h+='</details>'}
return h+'</div>'}
function run(reset){if(reset)shown=PAGE;const t=$('q').value.toLowerCase().trim().split(/\s+/).filter(Boolean),s=$('sub').value;
list=DATA.filter((d,i)=>(!coll||d.k===coll)&&(!s||d.tag===s)&&t.every(w=>IDX[i].includes(w)));
$('grid').innerHTML=list.slice(0,shown).map(card).join('');$('more').hidden=list.length<=shown;
$('info').textContent=list.length+' of '+DATA.length+' items';}
$('q').oninput=()=>run(true);$('sub').onchange=()=>run(true);$('more').onclick=()=>{shown+=PAGE;run(false)};
$('chips').onclick=e=>{const b=e.target.closest('button');if(!b)return;coll=b.dataset.k;chips();subs();run(true)};
chips();subs();run(true);
</script></body></html>'''


def main():
    data = [it for loader in LOADERS for it in loader()]
    docs = ''.join(f'<a href="{html.escape(p)}">{html.escape(n)}</a>' for n, p in DOCS if os.path.exists(os.path.join(ROOT, p)))
    out = TEMPLATE.replace('__DATA__', json.dumps(data, ensure_ascii=False).replace('</', '<\\/')).replace('__LAB__', json.dumps(LABELS)).replace('__DOCS__', docs)
    open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(out)
    print(f'{len(data)} items, {len(out) // 1024} KB')


if __name__ == '__main__':
    main()
