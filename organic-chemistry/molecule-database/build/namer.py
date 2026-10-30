"""IUPAC-style namer for acyclic mono-functional organic molecules (C, N, O only).
Returns (modern, classic) names, e.g. ('pentan-2-ol', '2-pentanol'). Verified against OPSIN."""
from rdkit import Chem
from rdkit.Chem import rdCIPLabeler

STEM = ['', 'meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec', 'undec', 'dodec']
MULT = {1: '', 2: 'di', 3: 'tri', 4: 'tetra', 5: 'penta'}
PAT = {k: Chem.MolFromSmarts(v) for k, v in dict(
    acid='[CX3](=O)[OX2H1]', ester='[CX3](=O)[OX2H0][#6]', ald='[CX3H1,CX3H2]=O', nitrile='[CX2]#N',
    ketone='[#6][CX3](=O)[#6]', alcohol='[CX4][OX2H1]', thiol='[CX4][SX2H1]', amine='[NX3;!$(N-C=O)]',
    ether='[CX4][OX2H0][CX4]', azide='[CX4]N=[N+]=[N-]', halo='[CX4][F,Cl,Br,I]').items()}
HAL = {9: 'fluoro', 17: 'chloro', 35: 'bromo', 53: 'iodo'}


class NameError_(Exception):
    pass


def _nbrs(m, i, allowed):
    return [n.GetIdx() for n in m.GetAtomWithIdx(i).GetNeighbors() if n.GetIdx() in allowed]


def _frag(m, start, block):
    """carbon atoms connected to start without crossing atoms in block"""
    seen, st = set(), [start]
    while st:
        a = st.pop()
        if a in seen:
            continue
        seen.add(a)
        for n in m.GetAtomWithIdx(a).GetNeighbors():
            if n.GetAtomicNum() == 6 and n.GetIdx() not in block and n.GetIdx() not in seen:
                st.append(n.GetIdx())
    return seen


def _subtree(m, att, parent, F):
    seen, st = set(), [(att, parent)]
    while st:
        a, p = st.pop()
        seen.add(a)
        for n in _nbrs(m, a, F):
            if n != p and n not in seen:
                st.append((n, a))
    return seen


def alkyl_name(m, att, parent, F):
    """name of the alkyl group rooted at att (attached to parent), within carbon fragment F"""
    S = _subtree(m, att, parent, F)
    size = len(S)
    deg = len(_nbrs(m, att, S))
    mx = max(len(_nbrs(m, a, S)) for a in S)
    table = {(1, 0, 0): 'methyl', (2, 1, 1): 'ethyl', (3, 1, 2): 'propyl', (3, 2, 2): 'isopropyl',
             (4, 1, 2): 'butyl', (4, 1, 3): 'isobutyl', (4, 2, 2): 'sec-butyl', (4, 3, 3): 'tert-butyl'}
    if (size, deg, mx) in table:
        return table[(size, deg, mx)]
    if size == 5 and deg == 1 and mx == 2:
        return 'pentyl'
    raise NameError_(f'unsupported alkyl group size={size}')


def _akey(name):
    return name.replace('tert-', '').replace('sec-', '')


def _paths(m, F, must, ends):
    leaves = [a for a in F if len(_nbrs(m, a, F)) <= 1]
    out = []
    for s in leaves:
        stack = [[s]]
        while stack:
            p = stack.pop()
            ext = False
            for n in _nbrs(m, p[-1], F):
                if n not in p:
                    stack.append(p + [n])
                    ext = True
            if not ext and must <= set(p):
                out.append(p)
    if len(F) == 1:
        out = [list(F)]
    if ends:
        out = [p for p in out if p[0] in ends]
    return out


def _best_chain(m, F, must, principal, unsat, ends, extra_subs):
    """must: atoms the chain has to contain; principal: atom carrying the principal group (numbering);
    ends: atoms that must be C1; extra_subs: {atom: [names]} non-carbon substituents."""
    paths = _paths(m, F, set(must) | set(unsat) | set(ends or ()), ends)
    if not paths:
        raise NameError_('no chain')
    L = max(len(p) for p in paths)
    best = None
    for p in [p for p in paths if len(p) == L]:
        subs, cs = [], set(p)
        for pos, a in enumerate(p, 1):
            for n in _nbrs(m, a, F):
                if n not in cs:
                    subs.append((pos, alkyl_name(m, n, a, F)))
            for nm in extra_subs.get(a, []):
                subs.append((pos, nm))
        anc = p.index(principal) + 1 if principal is not None else 0
        un = tuple(sorted(p.index(a) + 1 for a in unsat)) if unsat else ()
        key = (-len(p), -len(subs), anc, un, tuple(sorted(x for x, _ in subs)),
               tuple(x for x, _ in sorted(subs, key=lambda t: (_akey(t[1]), t[0]))))
        if best is None or key < best[0]:
            best = (key, p, subs, anc, un)
    return best, L


def _prefix(subs, omit=False):
    groups = {}
    for loc, nm in subs:
        groups.setdefault(nm, []).append(loc)
    parts = []
    for nm in sorted(groups, key=_akey):
        locs = sorted(groups[nm], key=lambda x: (isinstance(x, str), 0 if isinstance(x, str) else x))
        mult = MULT[len(locs)]
        parts.append((mult + nm) if omit else (','.join(str(x) for x in locs) + '-' + mult + nm))
    return '-'.join(parts) if not omit else ''.join(parts)


def _join(prefix, parent):
    if not prefix:
        return parent
    return prefix + ('-' if parent[0].isdigit() else '') + parent


def name(smiles):
    m = Chem.MolFromSmiles(smiles)
    if m.GetRingInfo().NumRings():
        raise NameError_('rings not supported')
    rdCIPLabeler.AssignCIPLabels(m)
    heavy = {a.GetIdx() for a in m.GetAtoms()}
    C = {a.GetIdx() for a in m.GetAtoms() if a.GetAtomicNum() == 6}
    nonC = heavy - C
    order = ('acid', 'ester', 'ald', 'nitrile', 'ketone', 'alcohol', 'thiol', 'amine', 'ether', 'azide', 'halo')
    cls = next((k for k in order if m.HasSubstructMatch(PAT[k])), None)
    dbl = [b for b in m.GetBonds() if b.GetBondType() == Chem.BondType.DOUBLE and b.GetBeginAtom().GetAtomicNum() == 6 and b.GetEndAtom().GetAtomicNum() == 6]
    trp = [b for b in m.GetBonds() if b.GetBondType() == Chem.BondType.TRIPLE and b.GetBeginAtom().GetAtomicNum() == 6 and b.GetEndAtom().GetAtomicNum() == 6]
    if cls is None:
        cls = 'ene' if dbl else 'yne' if trp else 'ane'
    elif dbl or trp:
        raise NameError_('multiple bond plus functional group not supported')
    if len(dbl) + len(trp) > 1:
        raise NameError_('more than one multiple bond')
    unsat = set()
    for b in dbl + trp:
        unsat = {b.GetBeginAtomIdx(), b.GetEndAtomIdx()}
    stereo = ''.join('(' + b.GetProp('_CIPCode') + ')-' for b in dbl if b.HasProp('_CIPCode'))
    mf = m.GetSubstructMatch(PAT[cls]) if cls in PAT else ()
    must, principal, ends, extra, nsubs, ester_alkyl = set(), None, None, {}, [], ''
    if cls in ('acid', 'ald', 'ester', 'nitrile'):
        c = mf[0]
        ends = [c]
        F = _frag(m, c, nonC)
        if cls == 'ester':
            ester_alkyl = alkyl_name(m, mf[3], mf[2], _frag(m, mf[3], nonC))
    elif cls in ('ketone', 'alcohol', 'thiol'):
        principal = mf[1] if cls == 'ketone' else mf[0]
        must = {principal}
        F = _frag(m, principal, nonC)
    elif cls == 'amine':
        n = mf[0]
        frs = sorted(((len(_frag(m, c, {n})), c, _frag(m, c, {n})) for c in _nbrs(m, n, C)), key=lambda t: -t[0])
        _, principal, F = frs[0]
        must = {principal}
        nsubs = [('N', alkyl_name(m, c, n, Fc)) for _, c, Fc in frs[1:]]
    elif cls == 'ether':
        o = mf[1]
        a1, a2 = mf[0], mf[2]
        f1, f2 = _frag(m, a1, {o}), _frag(m, a2, {o})
        if len(f1) < len(f2) or (len(f1) == len(f2) and a1 > a2):
            a1, a2, f1, f2 = a2, a1, f2, f1
        F = f1
        must = {a1}
        al = alkyl_name(m, a2, o, f2)
        extra = {a1: [al[:-2] + 'oxy' if al.endswith('yl') else al + 'oxy']}
    elif cls in ('halo', 'azide'):
        F = _frag(m, next(iter(C)), nonC)
        for a in m.GetAtoms():
            if a.GetAtomicNum() in HAL:
                c = _nbrs(m, a.GetIdx(), C)[0]
                extra.setdefault(c, []).append(HAL[a.GetAtomicNum()])
                must.add(c)
            elif cls == 'azide' and a.GetAtomicNum() == 7 and a.GetFormalCharge() == 0 and len(_nbrs(m, a.GetIdx(), C)) == 1:
                c = _nbrs(m, a.GetIdx(), C)[0]
                extra.setdefault(c, []).append('azido')
                must.add(c)
    else:
        F = _frag(m, next(iter(unsat or C)), nonC)
    (key, chain, subs, anc, un), L = _best_chain(m, F, must, principal, unsat, ends, extra)
    if cls in ('halo', 'azide', 'ether'):   # substituents must sit on the longest chain of the fragment
        longest = max(len(p) for p in _paths(m, F, set(), None)) if len(F) > 1 else 1
        if len(chain) < longest:
            raise NameError_('substituent not on longest chain')
    n = len(chain)
    stem = STEM[n]
    allsubs = list(subs) + nsubs
    only_one = len({nm for _, nm in allsubs}) == 1 and len(allsubs) == 1
    omit = cls in ('ether', 'halo', 'azide', 'ane') and (n == 1 or (n == 2 and only_one))
    pre = _prefix(allsubs, omit=omit)
    if cls in ('ane', 'ether', 'halo', 'azide'):
        modern = classic = stem + 'ane'
    elif cls in ('ene', 'yne'):
        loc = un[0]
        if n <= 2:
            modern = classic = stem + cls
        else:
            modern, classic = f'{stem}-{loc}-{cls}', f'{loc}-{stem}{cls}'
            if n == 3:
                classic = stem + cls
    elif cls in ('alcohol', 'ketone', 'amine', 'thiol'):
        sfx = {'alcohol': 'ol', 'ketone': 'one', 'amine': 'amine', 'thiol': 'thiol'}[cls]
        e = 'e' if cls == 'thiol' else ''
        if n <= 2 and cls != 'ketone':
            modern = classic = stem + 'an' + e + sfx
        else:
            modern, classic = f'{stem}an{e}-{anc}-{sfx}', f'{anc}-{stem}an{e}{sfx}'
            if cls == 'ketone' and n == 3:
                classic = 'propanone'
    elif cls == 'ald':
        modern = classic = stem + 'anal'
    elif cls == 'acid':
        modern = classic = stem + 'anoic acid'
    elif cls == 'nitrile':
        modern = classic = stem + 'anenitrile'
    elif cls == 'ester':
        full = ester_alkyl + ' ' + (pre + stem + 'anoate' if pre else stem + 'anoate')
        return (stereo + full, stereo + full)
    return (stereo + _join(pre, modern), stereo + _join(pre, classic))
