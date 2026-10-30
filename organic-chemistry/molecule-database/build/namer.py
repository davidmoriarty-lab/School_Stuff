"""IUPAC-style namer for acyclic mono-functional organic molecules (C, N, O only).
Returns (modern, classic) names, e.g. ('pentan-2-ol', '2-pentanol'). Verified against OPSIN."""
from rdkit import Chem
from rdkit.Chem import rdCIPLabeler

STEM = ['', 'meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec', 'undec', 'dodec']
MULT = {1: '', 2: 'di', 3: 'tri', 4: 'tetra', 5: 'penta'}
PAT = {k: Chem.MolFromSmarts(v) for k, v in dict(
    acid='[CX3](=O)[OX2H1]', ester='[CX3](=O)[OX2H0][#6]', ald='[CX3H1,CX3H2]=O',
    ketone='[#6][CX3](=O)[#6]', alcohol='[CX4][OX2H1]', amine='[NX3;!$(N-C=O)]',
    ether='[CX4][OX2H0][CX4]').items()}


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


def _best_chain(m, F, anchor, unsat, ends, extra_subs):
    """anchor: atom idx that carries the principal group (or None); unsat: set of C atoms of multiple bond;
    ends: atoms that must be C1; extra_subs: {atom: [names]} non-carbon substituents (alkoxy)."""
    must = set(unsat) | ({anchor} if anchor is not None else set())
    best = None
    paths = _paths(m, F, must | set(ends or ()), ends)
    L = max(len(p) for p in paths)
    for p in [p for p in paths if len(p) == L]:
        subs = []
        cs = set(p)
        for pos, a in enumerate(p, 1):
            for n in _nbrs(m, a, F):
                if n not in cs:
                    subs.append((pos, alkyl_name(m, n, a, F)))
            for nm in extra_subs.get(a, []):
                subs.append((pos, nm))
        anc = p.index(anchor) + 1 if anchor is not None else 0
        un = tuple(sorted(p.index(a) + 1 for a in unsat)) if unsat else ()
        for sub_order in (0,):
            key = (-len(p), -len(subs), anc, un, tuple(sorted(x for x, _ in subs)),
                   tuple(x for x, _ in sorted(subs, key=lambda t: (_akey(t[1]), t[0]))))
            if best is None or key < best[0]:
                best = (key, p, subs, anc, un)
    if best is None:
        raise NameError_('no chain')
    return best


def _prefix(subs):
    groups = {}
    for loc, nm in subs:
        groups.setdefault(nm, []).append(loc)
    parts = []
    for nm in sorted(groups, key=_akey):
        locs = sorted(groups[nm], key=lambda x: (isinstance(x, str), x if not isinstance(x, str) else 0))
        parts.append(','.join(str(x) for x in locs) + '-' + MULT[len(locs)] + nm)
    return '-'.join(parts)


def _join(prefix, parent):
    if not prefix:
        return parent
    return prefix + ('-' if parent[0].isdigit() else '') + parent


def name(smiles):
    m = Chem.MolFromSmiles(smiles)
    rdCIPLabeler.AssignCIPLabels(m)
    heavy = {a.GetIdx() for a in m.GetAtoms()}
    C = {a.GetIdx() for a in m.GetAtoms() if a.GetAtomicNum() == 6}
    cls = next((k for k in ('acid', 'ester', 'ald', 'ketone', 'alcohol', 'amine', 'ether') if m.HasSubstructMatch(PAT[k])), None)
    dbl = [b for b in m.GetBonds() if b.GetBondType() == Chem.BondType.DOUBLE and b.GetBeginAtom().GetAtomicNum() == 6 and b.GetEndAtom().GetAtomicNum() == 6]
    trp = [b for b in m.GetBonds() if b.GetBondType() == Chem.BondType.TRIPLE]
    if cls is None:
        cls = 'ene' if dbl else 'yne' if trp else 'ane'
    elif dbl or trp:
        raise NameError_('multiple bond plus functional group not supported')
    if len(dbl) + len(trp) > 1:
        raise NameError_('more than one multiple bond')
    unsat = set()
    for b in dbl + trp:
        unsat = {b.GetBeginAtomIdx(), b.GetEndAtomIdx()}
    stereo = ''
    for b in dbl:
        if b.HasProp('_CIPCode'):
            stereo = '(' + b.GetProp('_CIPCode') + ')-'
    mf = m.GetSubstructMatch(PAT[cls]) if cls in PAT else ()
    lead_sub, nsubs, anchor, ends, extra, F = [], [], None, None, {}, None
    prefix_extra = ''   # for esters (alkyl group) / ether handled below
    nsub_names = []
    if cls in ('acid', 'ald', 'ester'):
        c = mf[0]
        ends = [c]
        blockO = set(a for a in heavy if a not in C)
        F = _frag(m, c, blockO)
        anchor = c
        if cls == 'ester':
            o = mf[2]
            rc = mf[3]
            Fr = _frag(m, rc, blockO)
            prefix_extra = alkyl_name(m, rc, o, Fr)
    elif cls in ('ketone', 'alcohol'):
        anchor = mf[1] if cls == 'ketone' else mf[0]
        F = _frag(m, anchor, set(a for a in heavy if a not in C))
    elif cls == 'amine':
        n = mf[0]
        frs = [(len(_frag(m, c, {n})), c, _frag(m, c, {n})) for c in _nbrs(m, n, C)]
        frs.sort(key=lambda t: -t[0])
        _, anchor, F = frs[0]
        for _, c, Fc in frs[1:]:
            nsub_names.append(('N', alkyl_name(m, c, n, Fc)))
    elif cls == 'ether':
        o = mf[1]
        a1, a2 = mf[0], mf[2]
        f1, f2 = _frag(m, a1, {o}), _frag(m, a2, {o})
        if len(f1) < len(f2) or (len(f1) == len(f2) and a1 > a2):
            a1, a2, f1, f2 = a2, a1, f2, f1
        F, att = f1, a1
        al = alkyl_name(m, a2, o, f2)
        extra = {att: [al[:-2] + 'oxy' if al.endswith('yl') else al + 'oxy']}
    else:
        F = _frag(m, next(iter(unsat or C)), set(a for a in heavy if a not in C))
    key, chain, subs, anc, un = _best_chain(m, F, anchor if cls not in ('acid', 'ald', 'ester') else None,
                                            unsat, ends, extra)
    if cls == 'ether':
        pass
    n = len(chain)
    stem = STEM[n]
    allsubs = list(subs) + nsub_names
    pre = _prefix(allsubs if not (n <= 2 and cls in ('ether', 'ane') and len(subs) == 1 and not nsub_names) else [('', subs[0][1])])
    pre = pre.lstrip('-') if pre.startswith('-') else pre
    if cls == 'ane':
        modern = classic = stem + 'ane'
    elif cls in ('ene', 'yne'):
        sfx = cls
        loc = un[0]
        if n <= 2:
            modern = classic = stem + sfx
        else:
            modern = f'{stem}-{loc}-{sfx}'
            classic = f'{loc}-{stem}{sfx}'
            if len(subs) == 0 and n == 3:
                classic = stem + sfx
    elif cls == 'ether':
        modern = classic = stem + 'ane'
    elif cls in ('alcohol', 'ketone', 'amine'):
        sfx = {'alcohol': 'ol', 'ketone': 'one', 'amine': 'amine'}[cls]
        if n <= 2 and cls != 'ketone':
            modern = classic = stem + 'an' + ('' if cls == 'amine' else '') + sfx if cls != 'alcohol' else stem + 'an' + 'ol'
            modern = classic = stem + 'an' + sfx
        else:
            modern = f'{stem}an-{anc}-{sfx}'
            classic = f'{anc}-{stem}an{sfx}'
            if cls == 'ketone' and n == 3:
                classic = 'propanone'
    elif cls == 'ald':
        modern = classic = stem + 'anal'
    elif cls == 'acid':
        modern = classic = stem + 'anoic acid'
    elif cls == 'ester':
        modern = classic = prefix_extra + ' ' + _join_acyl(pre, stem + 'anoate')
        return (stereo + modern, stereo + classic)
    return (stereo + _join(pre, modern), stereo + _join(pre, classic))


def _join_acyl(pre, parent):
    return (pre + parent) if pre else parent
