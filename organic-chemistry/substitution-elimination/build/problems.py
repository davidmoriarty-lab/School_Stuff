"""100 SN1/SN2/E1/E2 problems in many question types, generated from the rule engine."""
import os, sys, random
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..', '..', '_shared'))
import engine as E
from engine import REAG, SOLV, mol, smi, lg_info, level, CLS, LGQ
from chemdraw import Struct, Arrow, Text, Plus, compose
from rdkit import Chem

IMG = os.path.join(ROOT, 'images'); os.makedirs(IMG, exist_ok=True)
canon = lambda s: Chem.MolToSmiles(Chem.MolFromSmiles(s))
RING = {canon(k): v for k, v in {
    'C1CCCCC1Br': 'bromocyclohexane', 'CC1(Br)CCCCC1': '1-bromo-1-methylcyclohexane', 'C1CCCCC1N=[N+]=[N-]': 'azidocyclohexane',
    'CC1=CCCCC1': '1-methylcyclohexene', 'C=C1CCCCC1': 'methylenecyclohexane', 'C1=CCCCC1': 'cyclohexene',
    'CC1(O)CCCCC1': '1-methylcyclohexan-1-ol', 'CC1(OC)CCCCC1': '1-methoxy-1-methylcyclohexane',
    'C1CCCO1': 'tetrahydrofuran (oxolane)', 'C1CCCCO1': 'tetrahydropyran (oxane)', 'Brc1ccccc1': 'bromobenzene',
    'C=CBr': 'bromoethene (vinyl bromide)', 'BrCCCCO': '4-bromobutan-1-ol', 'BrCCCCCO': '5-bromopentan-1-ol',
    'IC1CCCCC1': 'iodocyclohexane'}.items()}
SRC_SN, SRC_E = 'Klein Ch. 7 framework (four factors)', 'Standard elimination conventions (Zaitsev/Hofmann); not from the provided PDF'
P = []


def nm(s):
    c = canon(s)
    if c in RING:
        return RING[c]
    base = E.iupac(s) or c
    labs = E.cip_alpha(s)
    return f'({labs[0]})-{base}' if len(labs) == 1 and E.is_chiral(s) else base


def S(s, **kw):
    return Struct(s, redh=False, cip=E.is_chiral(s), **kw)


def scheme(pid, tag, sub, prod=None, top=(), bottom=(), extra=None):
    items = [S(sub), Arrow(top, bottom)]
    if prod is None:
        items.append(Text('?', 44, True))
    else:
        for k, p in enumerate(prod if isinstance(prod, (list, tuple)) else [prod]):
            if k: items.append(Plus())
            items.append(S(p))
    path = os.path.join(IMG, f'{pid}_{tag}.png')
    compose(items, path=path, scale=2, gap=14)
    return f'images/{pid}_{tag}.png'


def imgs(pid, tag, structs, labels=None):
    items = []
    for k, s in enumerate(structs):
        if labels: items.append(Text(labels[k], 22, True))
        items.append(S(s))
    path = os.path.join(IMG, f'{pid}_{tag}.png'); compose(items, path=path, scale=2, gap=22)
    return f'images/{pid}_{tag}.png'


def add(typ, mech, level_, q, a, why='', qimg=None, aimg=None, src=SRC_SN, smiles=None):
    pid = f'P{len(P) + 1:03d}'
    P.append(dict(id=pid, type=typ, mechanism=mech, difficulty=level_, question=q, answer=a, explanation=why,
                  question_image=qimg(pid) if callable(qimg) else qimg, answer_image=aimg(pid) if callable(aimg) else aimg,
                  source=src, smiles=smiles or {}))


def rs(r, so):
    """reagent-in-solvent phrase; neutral solvolysis reagents are the solvent"""
    return f"{REAG[r]['label']} as the solvent" if r == so else f"{REAG[r]['label']} in {so}"


def cond(reagent, solvent, heat=False):
    lab = REAG[reagent]['label'] if reagent in REAG else reagent
    if reagent == solvent:
        return [lab], (['Δ'] if heat else [])
    return [lab], [solvent + (', Δ' if heat else '')]


def product(sub, reagent, mech, hofmann=False):
    info = lg_info(sub)
    if mech == 'SN2':
        return E.substitute(sub, REAG[reagent]['nuc'], invert=E.is_chiral(sub))
    if mech == 'SN1':
        r = E.rearranged(sub)
        return E.racemic(E.substitute(r[0] if r else sub, REAG[reagent]['nuc']))
    if mech in ('E2', 'E1'):
        r = E.rearranged(sub) if mech == 'E1' else None
        return E.eliminate(r[0] if r else sub, hofmann)[0]


def steps(mech, neutral=False, alcohol=False, rearr=None):
    s = []
    if mech == 'SN2':
        if alcohol: s.append('Proton transfer: the acid protonates the OH group so that water can leave.')
        s.append('One concerted step: the nucleophile attacks the α carbon from the back side while the leaving group departs (inversion).')
        if neutral: s.append('Proton transfer: a base removes the proton from the positively charged nucleophile atom.')
    elif mech == 'SN1':
        if alcohol: s.append('Proton transfer: the acid protonates the OH group so that water can leave.')
        s.append('Loss of the leaving group gives a planar carbocation (rate-determining step).')
        if rearr: s.append(f'Carbocation rearrangement ({rearr}) gives a more stable carbocation.')
        s.append('Nucleophilic attack on the carbocation (either face).')
        if neutral: s.append('Proton transfer removes the positive charge from the oxonium ion.')
    elif mech == 'E2':
        s.append('One concerted step: the base removes a β hydrogen (anti to the leaving group) as the π bond forms and the leaving group departs.')
    else:
        if alcohol: s.append('Proton transfer: the acid protonates the OH group.')
        s.append('Loss of water gives a carbocation (rate-determining step).')
        if rearr: s.append(f'Carbocation rearrangement ({rearr}) gives a more stable carbocation.')
        s.append('A base (water or HSO₄⁻) removes a β hydrogen next to the cation, forming the alkene.')
    return ' '.join(f'({i}) {t}' for i, t in enumerate(s, 1))


def why(sub, reagent, solvent, mech, minor=''):
    d = E.decide(sub, reagent, solvent)
    return '; '.join(d['factors']) + f'. These favor {mech}.' + (f' Competing pathway: {minor}.' if minor and minor != 'none' else '')


# ---------------------------------------------------------------- curated reaction lists
SN2 = [('CI', 'NaCN', 'DMSO'), ('CCBr', 'NaN3', 'DMF'), ('CCCBr', 'NaSH', 'DMSO'), ('CCCCI', 'NaCN', 'CH3CN'),
       ('CCCCCl', 'NaI', 'acetone'), ('CCCBr', 'NaOMe', 'MeOH'), ('CC(C)Br', 'NaCN', 'DMSO'), ('CCC(C)Br', 'NaSH', 'DMSO'),
       ('CCC(C)I', 'NaN3', 'DMF'), ('C1CCCCC1Br', 'NaN3', 'DMF'), ('CCCCBr', 'NaOAc', 'DMF'), ('CCCBr', 'NaC≡CH', 'DMSO')]
SN1 = [('CC(C)(C)Br', 'H2O', 'H2O'), ('CCC(C)(C)Cl', 'EtOH', 'EtOH'), ('CC1(Br)CCCCC1', 'MeOH', 'MeOH'),
       ('CCC(C)(CC)Br', 'EtOH', 'EtOH'), ('CC(C)(C)I', 'AcOH', 'AcOH'), ('CCC(C)(C)Br', 'MeOH', 'MeOH'),
       ('CCCC(C)(C)Cl', 'H2O', 'H2O'), ('CC(C)(C)Br', 'MeOH', 'MeOH')]
E2 = [('CC(C)Br', 'NaOEt', 'EtOH'), ('CCC(C)Br', 'NaOEt', 'EtOH'), ('CCC(C)(C)Br', 'NaOEt', 'EtOH'),
      ('CCC(C)(C)Br', 'KOtBu', 'tBuOH'), ('CCC(C)I', 'KOtBu', 'tBuOH'), ('CCCC(C)Br', 'NaOH', 'EtOH'),
      ('C1CCCCC1Br', 'NaOEt', 'EtOH'), ('CC1(Br)CCCCC1', 'NaOEt', 'EtOH'), ('CC1(Br)CCCCC1', 'KOtBu', 'tBuOH'),
      ('CCCBr', 'KOtBu', 'tBuOH'), ('CCC(CC)(C)Br', 'NaOMe', 'MeOH'), ('CC(C)CC(C)Br', 'NaOEt', 'EtOH')]
for lst, want in ((SN2, 'SN2'), (SN1, 'SN1'), (E2, 'E2')):
    for sub, r, so in lst:
        assert E.decide(sub, r, so)['mech'] == want, (sub, r, want, E.decide(sub, r, so)['mech'])
DEHYD = ['CC(C)(C)O', 'CCC(C)(C)O', 'CC1(O)CCCCC1', 'CCC(C)O', 'CC(C)C(C)O', 'CC(C)(C)C(C)O']
STEREO_SN2 = [('C[C@H](Br)CC', 'NaSH', 'DMSO'), ('CCC[C@H](C)Cl', 'NaCN', 'DMSO'), ('CC[C@@H](I)CCC', 'NaN3', 'DMF'),
              ('CCCC[C@@H](C)Br', 'NaI', 'acetone')]
STEREO_SN1 = [('CCC[C@](C)(Br)CC', 'MeOH', 'MeOH'), ('CC[C@](C)(Cl)CCC', 'EtOH', 'EtOH'), ('CCC[C@@](C)(Br)CC', 'H2O', 'H2O')]
REARR = [('CC(C)C(C)Br', 'EtOH', 'EtOH'), ('CC(C)(C)CBr', 'EtOH', 'EtOH'), ('CC(C)(C)C(C)Br', 'MeOH', 'MeOH'),
         ('CCC(C)C(C)Br', 'MeOH', 'MeOH'), ('CC(C)(C)C(C)I', 'EtOH', 'EtOH')]
used = {'reag': 0}


def rp(sub, reagent, solvent):
    d = E.decide(sub, reagent, solvent)
    m = d['mech']
    return m, product(sub, reagent, m, hofmann=(reagent == 'KOtBu')), d


# ---------------------------------------------------------------- 1. reagents needed (11)
for sub, r, so in SN2[0:3] + SN2[6:8] + SN1[0:1] + E2[0:2] + E2[3:5]:
    m, p, d = rp(sub, r, so)
    heat = m == 'E2'
    add('Choose the reagents', m, 2 if m != 'SN2' else 1,
        f'What reagent(s) and solvent would convert {nm(sub)} into {nm(p)}? Name the mechanism and justify your choice with the four factors (substrate, nucleophile, leaving group, solvent).',
        f"{rs(r, so).capitalize() if r == so else rs(r, so)}{' with heat' if heat else ''} ({m}).", why(sub, r, so, m, d['minor']),
        qimg=lambda pid, sub=sub, p=p: scheme(pid, 'q', sub, p, ['?'], []), aimg=lambda pid, sub=sub, p=p, r=r, so=so, heat=heat: scheme(pid, 'a', sub, p, *cond(r, so, heat)),
        src=SRC_SN if m != 'E2' else SRC_E, smiles=dict(substrate=sub, product=p))
# ---------------------------------------------------------------- 2. predict the product (10)
for sub, r, so in SN2[3:6] + SN2[8:10] + SN1[1:3] + E2[5:7] + E2[8:9]:
    m, p, d = rp(sub, r, so)
    add('Predict the product', m, 2,
        f'Predict the major organic product of {nm(sub)} with {rs(r, so)}. State the mechanism and any minor pathway.',
        f'{nm(p)} via {m}.' + (f" Minor: {d['minor']}." if d['minor'] not in ('none',) else ''), why(sub, r, so, m, d['minor']),
        qimg=lambda pid, sub=sub, r=r, so=so: scheme(pid, 'q', sub, None, *cond(r, so)), aimg=lambda pid, sub=sub, p=p, r=r, so=so: scheme(pid, 'a', sub, p, *cond(r, so)),
        src=SRC_SN if m != 'E2' else SRC_E, smiles=dict(substrate=sub, product=p))
# ---------------------------------------------------------------- 3. identify the mechanism (9)
for sub, r, so in [SN2[1], SN2[10], SN1[3], SN1[4], E2[5], E2[9], E2[10], SN2[4], E2[2]]:
    m, p, d = rp(sub, r, so)
    add('Identify the mechanism', m, 2,
        f'Which mechanism (SN1, SN2, E1 or E2) predominates when {nm(sub)} reacts with {rs(r, so)}? List the factors that support your answer and give the major product.',
        f'{m}. Major product: {nm(p)}.', why(sub, r, so, m, d['minor']),
        qimg=lambda pid, sub=sub, r=r, so=so: scheme(pid, 'q', sub, None, *cond(r, so)), aimg=lambda pid, sub=sub, p=p, r=r, so=so: scheme(pid, 'a', sub, p, *cond(r, so)),
        src=SRC_SN if m != 'E2' else SRC_E, smiles=dict(substrate=sub, product=p))
# ---------------------------------------------------------------- 4. stereochemistry (8)
for sub, r, so in STEREO_SN2:
    m, p, d = rp(sub, r, so); assert m == 'SN2'
    add('Stereochemistry', 'SN2', 2, f'Draw the product of {nm(sub)} with {rs(r, so)}. Give the configuration (R or S) of the substrate and the product and explain the stereochemical outcome.',
        f'{nm(p)}: inversion of configuration ({E.cip_alpha(sub)[0]} → {E.cip_alpha(p)[0]}).',
        'SN2 proceeds by back-side attack, so the α carbon inverts like an umbrella in the wind. Note that the R/S label changes only if the CIP priorities keep the same order; the geometry always inverts. ' + why(sub, r, so, 'SN2'),
        qimg=lambda pid, sub=sub, r=r, so=so: scheme(pid, 'q', sub, None, *cond(r, so)), aimg=lambda pid, sub=sub, p=p, r=r, so=so: scheme(pid, 'a', sub, p, *cond(r, so)), smiles=dict(substrate=sub, product=p))
for sub, r, so in STEREO_SN1[:3]:
    m, p, d = rp(sub, r, so); assert m == 'SN1'
    a_inv = E.substitute(sub, REAG[r]['nuc'], invert=True); a_ret = E.substitute(sub, REAG[r]['nuc'])
    add('Stereochemistry', 'SN1', 3, f'{nm(sub)} reacts with {rs(r, so)}. Draw the product(s), including stereochemistry, and explain why the result differs from an SN2 reaction.',
        f'Both enantiomers form: {nm(a_inv)} (inversion, slightly in excess because of ion pairing) and {nm(a_ret)} (retention).',
        'The leaving group departs first to give a planar carbocation, which the solvent attacks from either face, so the stereocenter racemizes. ' + why(sub, r, so, 'SN1', d['minor']),
        qimg=lambda pid, sub=sub, r=r, so=so: scheme(pid, 'q', sub, None, *cond(r, so)),
        aimg=lambda pid, sub=sub, a=a_inv, b=a_ret, r=r, so=so: scheme(pid, 'a', sub, [a, b], *cond(r, so)), smiles=dict(substrate=sub, product_inversion=a_inv, product_retention=a_ret))
m, p, d = rp('C[C@H](Br)CC', 'NaOEt', 'EtOH')
add('Stereochemistry', 'E2', 3, f'{nm("C[C@H](Br)CC")} is treated with NaOEt in EtOH. What is the major product? Does the stereocenter of the starting material appear in the product?',
    f'{nm(p)} (Zaitsev, trans); the product has no stereocenter, so the configuration of the substrate is lost.', why('C[C@H](Br)CC', 'NaOEt', 'EtOH', 'E2', d['minor']) + ' Anti-periplanar elimination; the more stable trans (E) alkene predominates.',
    qimg=lambda pid: scheme(pid, 'q', 'C[C@H](Br)CC', None, *cond('NaOEt', 'EtOH', True)), aimg=lambda pid, p=p: scheme(pid, 'a', 'C[C@H](Br)CC', p, *cond('NaOEt', 'EtOH', True)), src=SRC_E)
# ---------------------------------------------------------------- 5. draw / describe the mechanism (8)
for sub, r, so in [SN2[1], SN2[5], SN1[0], SN1[1], E2[1], SN2[7], REARR[1], SN1[5]]:
    m, p, d = rp(sub, r, so)
    rr = E.rearranged(sub) if m == 'SN1' else None
    add('Draw the mechanism', m, 3, f'Describe the complete mechanism (list each step and the curved arrows) for the reaction of {nm(sub)} with {rs(r, so)}. How many steps are there?',
        steps(m, REAG[r].get('neutral', False), False, rr[1] if rr else None), 'Each ionic mechanism is built from nucleophilic attack, loss of a leaving group, proton transfer and rearrangement. ' + why(sub, r, so, m, d['minor']),
        qimg=lambda pid, sub=sub, r=r, so=so: scheme(pid, 'q', sub, None, *cond(r, so)), aimg=lambda pid, sub=sub, p=p, r=r, so=so: scheme(pid, 'a', sub, p, *cond(r, so)),
        src=SRC_SN if m != 'E2' else SRC_E, smiles=dict(substrate=sub, product=p))
# ---------------------------------------------------------------- 6. what went wrong (7)
FAIL = [
    ('CC(C)(C)Br', 'NaCN', 'DMSO', 'A student predicts an SN2 reaction to give a nitrile.', 'No SN2: a tertiary carbon is too hindered for back-side attack. Cyanide is a weak base but the only feasible path is E2, giving 2-methylpropene (isobutylene).', 'C=C(C)C'),
    ('CC(C)(C)CBr', 'NaOH', 'DMSO', 'A student says a primary halide always reacts quickly by SN2.', 'Neopentyl bromide is primary but the three β methyl groups block back-side attack; SN2 is extremely slow (like a tertiary substrate). The primary carbocation is also too unstable for SN1.', None),
    ('C=CBr', 'NaOH', 'DMSO', 'A student predicts substitution to give vinyl alcohol.', 'Vinyl halides do not react by SN2 (sp² carbon, back side blocked) or SN1 (unstable vinyl cation). No substitution occurs.', None),
    ('Brc1ccccc1', 'NaCN', 'DMSO', 'A student predicts benzonitrile.', 'Aryl halides do not undergo SN2 or SN1: back-side attack is impossible and the phenyl cation is unstable. No reaction under these conditions.', None),
    ('CCCCO', 'NaBr', 'DMF', 'A student predicts 1-bromobutane.', 'Hydroxide is a poor leaving group (strong base), so bromide cannot displace it. The OH must first be protonated (HBr) or converted to a tosylate or bromide with PBr₃.', None),
    ('CCC(C)Br', 'NaOEt', 'EtOH', 'A student predicts the ether 2-ethoxybutane by SN2.', 'Ethoxide is a strong base and the substrate is secondary, so E2 predominates: (E)-but-2-ene is the major product with some but-1-ene.', 'C/C=C/C'),
    ('CCCF', 'NaCN', 'DMSO', 'A student predicts butanenitrile.', 'Fluoride is a poor leaving group (conjugate base of a weak acid, HF), so no SN2 reaction occurs at a useful rate.', None)]
for sub, r, so, claim, ans, prod in FAIL:
    add('What went wrong', 'SN2/E2', 2, f'{claim} Reaction: {nm(sub)} + {rs(r, so)}. Explain what is wrong and give the correct outcome.', ans,
        'Apply the four factors in order: substrate, nucleophile/base, leaving group, solvent.', qimg=lambda pid, sub=sub, r=r, so=so: scheme(pid, 'q', sub, None, *cond(r, so)),
        aimg=(lambda pid, sub=sub, prod=prod, r=r, so=so: scheme(pid, 'a', sub, prod, *cond(r, so, True))) if prod else None, smiles=dict(substrate=sub))
# ---------------------------------------------------------------- 7. competing pathways (6)
COMP = [('CC(C)Br', ('NaCN', 'DMSO', False), ('NaOEt', 'EtOH', True)), ('CCC(C)(C)Br', ('EtOH', 'EtOH', False), ('NaOEt', 'EtOH', True)),
        ('CCCBr', ('NaOEt', 'EtOH', False), ('KOtBu', 'tBuOH', False)), ('CCC(C)Br', ('NaN3', 'DMF', False), ('KOtBu', 'tBuOH', False)),
        ('CC(C)(C)Br', ('H2O', 'H2O', False), ('NaOH', 'EtOH', True)), ('C1CCCCC1Br', ('NaSH', 'DMSO', False), ('NaOMe', 'MeOH', True))]
for sub, c1, c2 in COMP:
    res = []
    for r, so, h in (c1, c2):
        d = E.decide(sub, r, so); m = d['mech']; res.append((r, so, h, m, product(sub, r, m, hofmann=(r == 'KOtBu'))))
    add('Compare two conditions', f'{res[0][3]} vs {res[1][3]}', 3,
        f'{nm(sub)} is treated under two different conditions: (a) {REAG[c1[0]]["label"]} in {c1[1]}; (b) {REAG[c2[0]]["label"]} in {c2[1]}{" with heat" if c2[2] else ""}. For each, name the mechanism and the major product.',
        f'(a) {res[0][3]}: {nm(res[0][4])}. (b) {res[1][3]}: {nm(res[1][4])}.', f'(a) {why(sub, c1[0], c1[1], res[0][3])} (b) {why(sub, c2[0], c2[1], res[1][3])}',
        qimg=lambda pid, sub=sub, c1=c1, c2=c2: scheme(pid, 'q', sub, None, *cond(c1[0], c1[1])) if False else imgs(pid, 'q', [sub], None), aimg=lambda pid, res=res, sub=sub: imgs(pid, 'a', [res[0][4], res[1][4]], ['(a)', '(b)']),
        src=SRC_E, smiles=dict(substrate=sub, product_a=res[0][4], product_b=res[1][4]))
# ---------------------------------------------------------------- 8. alcohol activation and conversion (6)
ACT = [('C[C@H](O)CC', 'PBr3', 'Br', 'SN2'), ('CC(C)(C)O', 'HBr', 'Br', 'SN1'), ('CCCCO', 'HBr', 'Br', 'SN2'), ('CC(C)O', 'SOCl2, pyridine', 'Cl', 'SN2'),
       ('C[C@@H](O)CCC', 'TsCl, pyridine; then NaCN, DMSO', 'C#N', 'SN2'), ('CCCCO', 'TsCl, pyridine; then NaN3, DMF', 'N=[N+]=[N-]', 'SN2')]
for alc, route, nuc, m in ACT:
    inv = E.is_chiral(alc) and m == 'SN2'
    p = E.substitute(alc, nuc, invert=inv)
    add('Functional group conversion', m, 2, f'Propose reagents to convert {nm(alc)} into {nm(p)}. Explain why the OH group cannot simply be displaced, and state the stereochemical outcome if there is a stereocenter.',
        f'{route} ({m}).' + (' Inversion at the stereocenter.' if inv else ''),
        'Hydroxide is a bad leaving group, so the OH must be activated first: protonated by HX (SN1 for tertiary, SN2 for primary), or converted to a tosylate (TsCl/pyridine) or halide (PBr₃, SOCl₂) for SN2. Tosylate formation does not touch the stereocenter, so one inversion occurs in the substitution step.',
        qimg=lambda pid, alc=alc, p=p: scheme(pid, 'q', alc, p, ['?'], []), aimg=lambda pid, alc=alc, p=p, route=route: scheme(pid, 'a', alc, p, route.split('; '), []), smiles=dict(substrate=alc, product=p))
# ---------------------------------------------------------------- 9. rearrangements (5) and dehydrations that rearrange
for sub, r, so in REARR[:4]:
    m, p, d = rp(sub, r, so); rr = E.rearranged(sub)
    add('Carbocation rearrangement', m, 3, f'Will {nm(sub)} rearrange when heated in {so}? Show the carbocation that forms, the shift involved, and the major substitution product.',
        f'Yes: {rr[1]} converts the initial cation into a more stable tertiary cation; major product {nm(p)}.' if rr else f'No rearrangement; product {nm(p)}.',
        steps(m, True, False, rr[1] if rr else None) + ' ' + why(sub, r, so, m), qimg=lambda pid, sub=sub, r=r, so=so: scheme(pid, 'q', sub, None, *cond(r, so)),
        aimg=lambda pid, sub=sub, p=p, r=r, so=so: scheme(pid, 'a', sub, p, *cond(r, so)), smiles=dict(substrate=sub, product=p))
sub = 'CC(C)C(C)O'; rr = E.rearranged(sub); p = E.eliminate(rr[0])[0]
add('Carbocation rearrangement', 'E1', 3, f'Predict the major alkene from heating {nm(sub)} with H₂SO₄. Explain the rearrangement.',
    f'{nm(p)} via E1 after a {rr[1]}.', steps('E1', False, True, rr[1]) + ' Zaitsev elimination from the rearranged tertiary cation.',
    qimg=lambda pid: scheme(pid, 'q', sub, None, ['H₂SO₄'], ['Δ']), aimg=lambda pid: scheme(pid, 'a', sub, p, ['H₂SO₄'], ['Δ']), src=SRC_E, smiles=dict(substrate=sub, product=p))
# ---------------------------------------------------------------- 10. dehydration of alcohols (E1) (rest) -> 4 more E1
for alc in ['CC(C)(C)O', 'CCC(C)(C)O', 'CC1(O)CCCCC1', 'CCC(C)O']:
    p = E.eliminate(alc)[0]
    add('Elimination (E1)', 'E1', 2, f'What happens when {nm(alc)} is heated with concentrated H₂SO₄? Give the major product, name the mechanism and explain why the OH must be protonated first.',
        f'{nm(p)} via E1' + (' (Zaitsev)' if len(E.alkenes(alc)) > 1 else '') + '.', steps('E1', False, True, None), qimg=lambda pid, alc=alc: scheme(pid, 'q', alc, None, ['H₂SO₄'], ['Δ']),
        aimg=lambda pid, alc=alc, p=p: scheme(pid, 'a', alc, p, ['H₂SO₄'], ['Δ']), src=SRC_E, smiles=dict(substrate=alc, product=p))
# ---------------------------------------------------------------- 11. Zaitsev vs Hofmann (5)
for sub in ['CCC(C)(C)Br', 'CCC(C)Br', 'CCCC(C)Br', 'CC1(Br)CCCCC1', 'CCC(CC)(C)Br']:
    z = E.eliminate(sub)[0]; h = E.eliminate(sub, True)[0]
    add('Regiochemistry of elimination', 'E2', 3, f'Starting from {nm(sub)}, choose reagents to make (a) the more substituted alkene and (b) the less substituted alkene. Give both products.',
        f'(a) NaOEt/EtOH (small base, Zaitsev): {nm(z)}. (b) KOtBu/tBuOH (bulky base, Hofmann): {nm(h)}.',
        'A small base removes the β hydrogen that leads to the more stable, more substituted alkene (Zaitsev). A bulky base removes the more accessible, less hindered hydrogen (Hofmann).',
        qimg=lambda pid, sub=sub: imgs(pid, 'q', [sub]), aimg=lambda pid, z=z, h=h: imgs(pid, 'a', [z, h], ['(a)', '(b)']), src=SRC_E, smiles=dict(substrate=sub, zaitsev=z, hofmann=h))
# ---------------------------------------------------------------- 12. Williamson ether design (3) + intramolecular (2)
for target, halide, alkoxide, bad in [('COC(C)(C)C', 'CI', 'sodium tert-butoxide', 'tert-butyl bromide with sodium methoxide'),
                                      ('CCOC(C)C', 'CCBr', 'sodium isopropoxide', '2-bromopropane with sodium ethoxide'),
                                      ('CC(C)(C)OCC', 'CCI', 'sodium tert-butoxide', 'tert-butyl bromide with sodium ethoxide')]:
    add('Synthesis design', 'SN2', 3, f'Design a synthesis of {nm(target)} from an alkyl halide and an alkoxide. Which combination works, and why does the other combination fail?',
        f'Use {nm(halide)} with {alkoxide}. The alternative, {bad}, fails because it gives E2 elimination instead of substitution.',
        'The Williamson ether synthesis is an SN2 reaction, so the halide must be methyl or primary. A secondary or tertiary halide with a strongly basic alkoxide gives E2 elimination.',
        qimg=lambda pid, t=target: imgs(pid, 'q', [t]), aimg=lambda pid, h=halide, t=target: scheme(pid, 'a', h, t, [alkoxide], []), smiles=dict(target=target))
for sub, prod in [('BrCCCCO', 'C1CCCO1'), ('BrCCCCCO', 'C1CCCCO1')]:
    add('Intramolecular substitution', 'SN2', 3, f'Treatment of {nm(sub)} with NaOH gives a cyclic ether, {nm(prod)}. Explain the mechanism and why a ring forms.',
        'NaOH deprotonates the OH to give an alkoxide, which attacks the carbon bearing bromine intramolecularly (SN2, 5- or 6-membered ring) displacing bromide.',
        'Intramolecular SN2 is favored because the nucleophile and electrophile are tethered together; 5- and 6-membered rings form fastest.',
        qimg=lambda pid, s=sub, p=prod: scheme(pid, 'q', s, p, ['NaOH'], []), smiles=dict(substrate=sub, product=prod))
# ---------------------------------------------------------------- 13. concept questions (20)
add('Nucleophile strength', 'SN2', 2, 'Rank the halide ions F⁻, Cl⁻, Br⁻, I⁻ by nucleophilicity (a) in methanol (a protic solvent) and (b) in DMSO (a polar aprotic solvent). Explain the reversal.',
    '(a) in methanol: I⁻ > Br⁻ > Cl⁻ > F⁻; (b) in DMSO: F⁻ > Cl⁻ > Br⁻ > I⁻.', 'In protic solvents the small anions are strongly solvated by hydrogen bonding and are tied up; in polar aprotic solvents anions are not solvated, so basicity (F⁻ most basic) tracks nucleophilicity.')
add('Nucleophile strength', 'SN2', 2, 'Classify each as a strong or weak nucleophile and state whether it favors SN2 or SN1: (a) HS⁻ (b) H₂O (c) CH₃CH₂O⁻ (d) CH₃CH₂OH (e) I⁻ (f) CN⁻.',
    'Strong (favor SN2): HS⁻, CH₃CH₂O⁻, I⁻, CN⁻. Weak (allow SN1 to compete): H₂O, CH₃CH₂OH.', 'Strong nucleophiles speed up SN2; the rate of SN1 does not depend on the nucleophile, so weak nucleophiles disfavor SN2 and let SN1 compete.')
add('Substrate reactivity', 'SN2', 2, 'Rank bromomethane, 1-bromopropane, 2-bromopropane and 2-bromo-2-methylpropane from fastest to slowest toward SN2. Then give the order for SN1.',
    'SN2: bromomethane > 1-bromopropane > 2-bromopropane >> 2-bromo-2-methylpropane (essentially unreactive). SN1 is the reverse: 2-bromo-2-methylpropane > 2-bromopropane > 1-bromopropane > bromomethane.',
    'SN2 is limited by steric hindrance in the transition state; SN1 is limited by carbocation stability.', qimg=lambda pid: imgs(pid, 'q', ['CBr', 'CCCBr', 'CC(C)Br', 'CC(C)(C)Br'], ['I', 'II', 'III', 'IV']))
add('Substrate reactivity', 'SN2', 3, 'Neopentyl bromide, (CH₃)₃CCH₂Br, is a primary alkyl halide. Predict whether it reacts well by SN2 or by SN1 and explain.',
    'It reacts very poorly by SN2 because of the bulky β substituents, and a primary carbocation is too unstable for SN1 (a rearrangement concerted with ionization can occur in ionizing solvents).',
    'Steric hindrance at the β position slows SN2 almost as much as α branching.', qimg=lambda pid: imgs(pid, 'q', ['CC(C)(C)CBr']))
add('Leaving groups', 'SN1/SN2', 2, 'Which is the better leaving group in each pair, and why? (a) Cl⁻ or I⁻ (b) HO⁻ or H₂O (c) CH₃O⁻ or TsO⁻.',
    '(a) I⁻. (b) H₂O. (c) TsO⁻.', 'Good leaving groups are weak bases, the conjugate bases of strong acids. Iodide is the conjugate base of HI; water is the conjugate base of H₃O⁺; tosylate is the conjugate base of a strong sulfonic acid.')
add('Leaving groups', 'SN2', 2, 'Rank 1-chlorobutane, 1-bromobutane and 1-iodobutane by their rate of reaction with NaCN in DMSO, and explain.',
    '1-iodobutane > 1-bromobutane > 1-chlorobutane.', 'The rate of SN2 depends on the leaving group: iodide is the weakest base and the best leaving group.', qimg=lambda pid: imgs(pid, 'q', ['CCCCCl', 'CCCCBr', 'CCCCI'], ['I', 'II', 'III']))
add('Solvent effects', 'SN2/SN1', 2, 'Classify each solvent as protic or polar aprotic and say which substitution mechanism it favors: DMSO, methanol, acetonitrile, water, DMF, acetic acid.',
    'Polar aprotic (favor SN2): DMSO, acetonitrile, DMF. Protic (favor SN1): methanol, water, acetic acid.', 'Protic solvents have an H on an electronegative atom; they stabilize ions and intermediates (SN1) but solvate and weaken anionic nucleophiles. Polar aprotic solvents leave the nucleophile unsolvated.')
add('Solvent effects', 'SN2', 2, 'The SN2 reaction of 1-bromobutane with azide is about 1300 times faster in DMSO than in methanol. Explain.',
    'In methanol the azide ion is hydrogen-bonded to the solvent, which lowers its energy and raises the barrier. DMSO solvates the cation but not the anion, so the nucleophile is higher in energy and reacts faster.', 'See the effect of polar aprotic solvents on nucleophile energy in the SN2 energy diagram.')
for sub, r, so in [SN2[7], SN1[1], E2[1], SN2[4]]:
    m = E.decide(sub, r, so)['mech']
    law = {'SN2': 'rate = k[substrate][nucleophile]', 'E2': 'rate = k[substrate][base]', 'SN1': 'rate = k[substrate]', 'E1': 'rate = k[substrate]'}[m]
    dep = m in ('SN2', 'E2')
    add('Kinetics', m, 2, f'The reaction of {nm(sub)} with {rs(r, so)} follows the mechanism predicted for these conditions. Write the rate law. What happens to the rate if (a) [substrate] is doubled and [{REAG[r]["ion"]}] is unchanged, and (b) [{REAG[r]["ion"]}] is tripled and [substrate] is unchanged?',
        f'{m}: {law}. (a) Rate doubles. (b) ' + ('Rate triples.' if dep else 'No change.'), 'The rate law reflects the species in the rate-determining step.', src=SRC_SN if m != 'E2' else SRC_E)
for sub in ['CC(C)CBr', 'CCC(C)Br', 'CC(C)(C)Br']:
    lv = level(mol(sub), lg_info(sub)['alpha'])
    pass
add('Classify the substrate', 'SN1/SN2', 2, 'For each substrate, classify the α carbon (methyl, 1°, 2° or 3°), identify the leaving group, and state whether SN2, SN1, both or neither is feasible: (I) iodoethane (II) 2-bromo-2-methylbutane (III) 2-chlorobutane (IV) bromobenzene.',
    'I: 1°, I⁻, SN2 only. II: 3°, Br⁻, SN1 (SN2 impossible). III: 2°, Cl⁻, either (conditions decide). IV: aryl halide, Br⁻, neither.',
    'Methyl/primary favor SN2, tertiary favors SN1, secondary can go either way, and aryl/vinyl halides do not react.', qimg=lambda pid: imgs(pid, 'q', ['CCI', 'CCC(C)(C)Br', 'CCC(C)Cl', 'Brc1ccccc1'], ['I', 'II', 'III', 'IV']))
add('Classify the substrate', 'SN1/SN2', 2, 'Label each carbon bearing a leaving group as 1°, 2° or 3° and say which substitution mechanism is favored by the substrate alone: (I) 1-bromobutane (II) 3-bromo-3-methylpentane (III) iodocyclohexane.',
    'I: 1°, SN2. II: 3°, SN1. III: 2°, either.', 'This is the first of the four factors; secondary substrates need the nucleophile and solvent to decide.', qimg=lambda pid: imgs(pid, 'q', ['CCCCBr', 'CCC(C)(CC)Br', 'IC1CCCCC1'], ['I', 'II', 'III']))
add('Which reacts faster?', 'SN2', 2, 'Which compound reacts faster with NaN₃ in DMF, 1-bromobutane or 2-bromobutane? Which reacts faster with ethanol (solvolysis), 2-bromo-2-methylpropane or 2-bromopropane?',
    '1-bromobutane (less hindered SN2). 2-bromo-2-methylpropane (more stable tertiary carbocation, SN1).', 'SN2 rate falls as steric hindrance increases; SN1 rate rises with carbocation stability.')
add('Energy diagrams', 'SN1', 3, 'Sketch the reaction energy diagram for the SN1 solvolysis of 2-bromo-2-methylpropane in water. How many transition states and intermediates are there, and which step is rate-determining?',
    'Two steps give two transition states and one carbocation intermediate (plus a proton transfer at the end because water is neutral, so three steps). The first step, loss of bromide, is rate-determining.',
    'The number of humps equals the number of steps; the highest hump is the rate-determining step.')
add('Energy diagrams', 'SN2', 2, 'How does the energy diagram of an SN2 reaction differ from that of an SN1 reaction? Include the number of steps, transition states and intermediates.',
    'SN2: one step, one transition state, no intermediate. SN1: two core steps, two transition states and a carbocation intermediate.', 'SN2 is concerted; SN1 is stepwise.')
assert len(P) == 100, len(P)
