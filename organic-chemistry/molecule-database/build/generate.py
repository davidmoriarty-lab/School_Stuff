"""Build the 500-molecule database: structures, verified names, images, CSV/JSON, gallery."""
import os, sys, csv, json, random, itertools, warnings
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..', '..', '_shared'))
warnings.filterwarnings('ignore')
from rdkit import Chem, RDLogger
from rdkit.Chem import Descriptors, rdMolDescriptors
RDLogger.DisableLog('rdApp.*')
from namer import name
from opsin_check import check
rng = random.Random(2026)
BR = {'Me': '(C)', 'Et': '(CC)', 'Pr': '(CCC)', 'iPr': '(C(C)C)'}
ALK = ['C', 'CC', 'CCC', 'C(C)C', 'CCCC', 'C(C)(C)C', 'CC(C)C', 'C(C)CC']


def chain(n, br=None, deco=None, bonds=None, start=0, head=''):
    """SMILES for a carbon chain of n atoms. start=1 means atom 0 is written in `head`."""
    br, deco, bonds = br or {}, deco or {}, bonds or {}
    s = head
    for i in range(start, n):
        s += 'C' + ''.join(deco.get(i, [])) + ''.join(BR[b] for b in br.get(i, []))
        if i < n - 1:
            s += bonds.get(i, '')
    return s


def rbr(n, lo, hi, maxk=3, ethyl_ok=True):
    k = rng.choice([0, 1, 1, 1, 2, 2, 3][:7 if maxk >= 3 else 5])
    pos = [p for p in range(lo, hi + 1)]
    out = {}
    for p in rng.sample(pos, min(k, len(pos))):
        out.setdefault(p, []).append(rng.choice(['Me', 'Me', 'Me', 'Et'] if ethyl_ok and n >= 5 else ['Me']))
    return out


def cand(fam, n_lo, n_hi):
    n = rng.randint(n_lo, n_hi)
    if fam == 'alkane':
        return chain(n, rbr(n, 1, n - 2))
    if fam in ('alkene', 'alkyne'):
        p = rng.randint(0, n - 2)
        return chain(n, rbr(n, 0, n - 1), bonds={p: '=' if fam == 'alkene' else '#'})
    if fam == 'alcohol':
        p = rng.randint(0, n - 1)
        return chain(n, rbr(n, 0, n - 1), deco={p: ['(O)']})
    if fam == 'ketone':
        p = rng.randint(1, n - 2)
        return chain(n, rbr(n, 1, n - 2), deco={p: ['(=O)']})
    if fam == 'aldehyde':
        return 'O=C' + chain(n, rbr(n, 1, n - 1), start=1)
    if fam == 'acid':
        return 'OC(=O)' + chain(n, rbr(n, 1, n - 1), start=1)
    if fam == 'ester':
        return rng.choice(ALK) + 'OC(=O)' + chain(n, rbr(n, 1, n - 1), start=1)
    if fam == 'ether':
        p = rng.randint(0, n - 1)
        return chain(n, rbr(n, 0, n - 1, 2), deco={p: ['(O' + rng.choice(ALK) + ')']})
    if fam == 'amine1':
        p = rng.randint(0, n - 1)
        return chain(n, rbr(n, 0, n - 1), deco={p: ['(N)']})
    if fam == 'amine2':
        p = rng.randint(0, n - 1)
        return chain(n, rbr(n, 0, n - 1, 2), deco={p: ['(N' + rng.choice(ALK[:5]) + ')']})
    if fam == 'amine3':
        p = rng.randint(0, n - 1)
        return chain(n, rbr(n, 0, n - 1, 1), deco={p: ['(N(' + rng.choice(ALK[:4]) + ')' + rng.choice(ALK[:4]) + ')']})


def stereo_variants(smi):
    m = Chem.MolFromSmiles(smi)
    out = []
    for b in m.GetBonds():
        if b.GetBondType() == Chem.BondType.DOUBLE and b.GetBeginAtom().GetAtomicNum() == 6 and b.GetEndAtom().GetAtomicNum() == 6:
            a, c = b.GetBeginAtom(), b.GetEndAtom()
            na = [x.GetIdx() for x in a.GetNeighbors() if x.GetIdx() != c.GetIdx()]
            nc = [x.GetIdx() for x in c.GetNeighbors() if x.GetIdx() != a.GetIdx()]
            if not na or not nc:
                continue
            na2 = [Chem.MolToSmiles(m)]  # placeholder
            # stereo possible only if each end has two different substituents
            ca = {Chem.MolFragmentToSmiles(m, atomsToUse=[x]) for x in na}
            def sig(atom, other):
                return sorted(Chem.CanonSmiles(Chem.MolToSmiles(m, rootedAtAtom=x.GetIdx())) + str(len(list(x.GetNeighbors()))) for x in atom.GetNeighbors() if x.GetIdx() != other.GetIdx())
            if len(na) == 2 and sig(a, c)[0] == sig(a, c)[1]:
                continue
            if len(nc) == 2 and sig(c, a)[0] == sig(c, a)[1]:
                continue
            for st in (Chem.BondStereo.STEREOCIS, Chem.BondStereo.STEREOTRANS):
                mm = Chem.RWMol(m)
                bb = mm.GetBondWithIdx(b.GetIdx())
                bb.SetStereoAtoms(na[0], nc[0])
                bb.SetStereo(st)
                out.append(Chem.MolToSmiles(mm))
            return out
    return [smi]


def pool(fam, nlo, nhi, tries):
    seen = {}
    for _ in range(tries):
        s = cand(fam, nlo, nhi)
        m = Chem.MolFromSmiles(s) if s else None
        if m is None:
            continue
        for v in (stereo_variants(Chem.MolToSmiles(m)) if fam == 'alkene' else [Chem.MolToSmiles(m)]):
            seen.setdefault(v, None)
    return list(seen)


def alkane_exhaustive():
    seen = set()
    for n in range(1, 9):
        pos = list(range(1, n - 1))
        for combo in itertools.product([None, 'Me', 'Et', 'iPr', 'Pr'], repeat=len(pos)):
            br = {p: [b] for p, b in zip(pos, combo) if b}
            if sum({'Me': 1, 'Et': 2, 'iPr': 3, 'Pr': 3}[b[0]] for b in br.values()) + n > 10:
                continue
            m = Chem.MolFromSmiles(chain(n, br))
            if m:
                seen.add(Chem.MolToSmiles(m))
    return list(seen)


def carbons(s):
    return sum(1 for a in Chem.MolFromSmiles(s).GetAtoms() if a.GetAtomicNum() == 6)


def pick(cands, quota, cmin, cmax, forced=()):
    """balanced pick across carbon counts; cands: list of (smiles, modern, classic)"""
    chosen = [c for c in cands if c[0] in forced]
    rest = [c for c in cands if c[0] not in forced]
    buckets = {}
    for c in rest:
        buckets.setdefault(carbons(c[0]), []).append(c)
    for b in buckets.values():
        rng.shuffle(b)
    keys = [k for k in sorted(buckets) if cmin <= k <= cmax]
    while len(chosen) < quota and any(buckets[k] for k in keys):
        for k in keys:
            if buckets[k] and len(chosen) < quota:
                chosen.append(buckets[k].pop())
    return chosen


COMMON = {'C': 'methane', 'CC': 'ethane', 'CCC': 'propane', 'CCCC': 'butane', 'CC(C)C': 'isobutane', 'CC(C)(C)C': 'neopentane',
          'CCC(C)C': 'isopentane', 'CO': 'methyl alcohol', 'CCO': 'ethyl alcohol', 'CC(C)O': 'isopropyl alcohol',
          'CC(C)(C)O': 'tert-butyl alcohol', 'CCCO': 'propyl alcohol', 'CC(=O)C': 'acetone', 'CC=O': 'acetaldehyde',
          'C=O': 'formaldehyde', 'CC(=O)O': 'acetic acid', 'O=CO': 'formic acid', 'CCOCC': 'diethyl ether',
          'CC(=O)OCC': 'ethyl acetate', 'CC(=O)OC': 'methyl acetate', 'C=C': 'ethylene', 'C=CC': 'propylene',
          'C#C': 'acetylene', 'CCC(=O)O': 'propionic acid', 'CCCC(=O)O': 'butyric acid', 'CCC=O': 'propionaldehyde',
          'CCCC=O': 'butyraldehyde', 'CCN': 'ethylamine', 'CN': 'methylamine', 'CCNCC': 'diethylamine',
          'CCN(CC)CC': 'triethylamine', 'CN(C)C': 'trimethylamine', 'CCC(C)=O': 'ethyl methyl ketone',
          'CC(C)=C': 'isobutylene', 'COC': 'dimethyl ether', 'CNC': 'dimethylamine', 'CC(C)N': 'isopropylamine',
          'CC(=O)CC(C)C': 'isobutyl methyl ketone'}
COMMON = {Chem.CanonSmiles(k): v for k, v in COMMON.items()}

FAMS = [  # (family, class label, quota, nlo, nhi, tries, cmin, cmax)
    ('alkene', 'alkene', 65, 2, 9, 9000, 2, 9), ('alkyne', 'alkyne', 40, 2, 9, 7000, 2, 9),
    ('alcohol', 'alcohol', 80, 1, 9, 9000, 1, 9), ('ketone', 'ketone', 45, 3, 9, 7000, 3, 9),
    ('aldehyde', 'aldehyde', 35, 1, 9, 6000, 1, 9), ('acid', 'carboxylic acid', 40, 1, 9, 6000, 1, 9),
    ('ester', 'ester', 35, 1, 6, 9000, 3, 9), ('ether', 'ether', 30, 1, 6, 9000, 2, 8),
    ('amine1', 'amine', 30, 1, 9, 6000, 1, 9), ('amine2', 'amine', 12, 1, 6, 9000, 2, 8),
    ('amine3', 'amine', 8, 1, 6, 9000, 3, 8)]


def named(smiles_list):
    out = []
    for s in smiles_list:
        try:
            mo, cl = name(s)
            out.append((s, mo, cl))
        except Exception:
            pass
    return out


def main():
    records = []
    # alkanes: everything up to C8 (<=10 carbons total), balanced fill with C9/C10
    alk = named(alkane_exhaustive() + [Chem.MolToSmiles(Chem.MolFromSmiles('C' * n)) for n in range(9, 11)]
                + pool('alkane', 9, 10, 4000))
    uniq = {c[0]: c for c in alk}
    alk = list(uniq.values())
    sel = pick(alk, 80, 1, 10, forced={Chem.CanonSmiles('C' * n) for n in range(1, 11)})
    records += [(s, mo, cl, 'alkane', 'alkane') for s, mo, cl in sel]
    for fam, label, quota, nlo, nhi, tries, cmin, cmax in FAMS:
        c = named(pool(fam, nlo, nhi, tries))
        sel = pick(c, quota, cmin, cmax)
        sub = {'amine1': 'primary amine', 'amine2': 'secondary amine', 'amine3': 'tertiary amine'}.get(fam, '')
        records += [(s, mo, cl, label, sub) for s, mo, cl in sel]
    # verify names (both styles) with OPSIN, drop failures, report
    bad = {b[0] for b in check([(r[0], r[1]) for r in records]) + check([(r[0], r[2]) for r in records])}
    print('OPSIN mismatches:', len(bad), list(bad)[:5])
    records = [r for r in records if r[0] not in bad]
    # unique names, then fill shortfall (rare) is reported
    seen, final = set(), []
    for r in records:
        if r[1] not in seen:
            seen.add(r[1]); final.append(r)
    print('total molecules:', len(final))
    return final


if __name__ == '__main__':
    final = main()
    import pickle
    pickle.dump(final, open(os.path.join(HERE, '_records.pkl'), 'wb'))
    from collections import Counter
    print(Counter(r[3] for r in final))
