"""Rule engine for SN1 / SN2 / E1 / E2 (textbook four-factor logic) built on RDKit.
Substitution rules follow Klein ch. 7 (substrate, nucleophile, leaving group, solvent); elimination rules
(Zaitsev/Hofmann, E1 via carbocation, alcohol dehydration) are standard textbook conventions."""
import os, sys, itertools
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'molecule-database', 'build'))
from rdkit import Chem, RDLogger
from rdkit.Chem import AllChem, rdCIPLabeler
RDLogger.DisableLog('rdApp.*')
from namer import name as _iupac

TOS = 'OS(=O)(=O)c1ccc(C)cc1'
LGSMARTS = {'F': '[F]', 'Cl': '[Cl]', 'Br': '[Br]', 'I': '[I]', 'OTs': TOS, 'OH': '[OH]'}
CLS = {0: 'methyl', 1: 'primary (1°)', 2: 'secondary (2°)', 3: 'tertiary (3°)'}

# nucleophile / base library: nuc = attached fragment, strong = strong nucleophile, base = strong|weak, bulky
REAG = {
    'NaCN': dict(label='NaCN', nuc='C#N', strong=True, base='weak', ion='cyanide', pclass='nitrile'),
    'NaN3': dict(label='NaN₃', nuc='N=[N+]=[N-]', strong=True, base='weak', ion='azide', pclass='alkyl azide'),
    'NaI': dict(label='NaI', nuc='I', strong=True, base='weak', ion='iodide', pclass='alkyl iodide'),
    'NaBr': dict(label='NaBr', nuc='Br', strong=True, base='weak', ion='bromide', pclass='alkyl bromide'),
    'NaCl': dict(label='NaCl', nuc='Cl', strong=True, base='weak', ion='chloride', pclass='alkyl chloride'),
    'NaSH': dict(label='NaSH', nuc='S', strong=True, base='weak', ion='hydrosulfide', pclass='thiol'),
    'NaOAc': dict(label='NaOAc', nuc='OC(C)=O', strong=False, base='weak', ion='acetate', pclass='ester'),
    'NaOH': dict(label='NaOH', nuc='O', strong=True, base='strong', ion='hydroxide', pclass='alcohol'),
    'NaOMe': dict(label='NaOMe', nuc='OC', strong=True, base='strong', ion='methoxide', pclass='ether'),
    'NaOEt': dict(label='NaOEt', nuc='OCC', strong=True, base='strong', ion='ethoxide', pclass='ether'),
    'KOtBu': dict(label='KOtBu', nuc='OC(C)(C)C', strong=True, base='strong', bulky=True, ion='tert-butoxide', pclass='ether'),
    'NaC≡CH': dict(label='NaC≡CH', nuc='C#C', strong=True, base='strong', ion='acetylide', pclass='alkyne'),
    'H2O': dict(label='H₂O', nuc='O', strong=False, base='weak', neutral=True, ion='water', pclass='alcohol'),
    'MeOH': dict(label='MeOH', nuc='OC', strong=False, base='weak', neutral=True, ion='methanol', pclass='ether'),
    'EtOH': dict(label='EtOH', nuc='OCC', strong=False, base='weak', neutral=True, ion='ethanol', pclass='ether'),
    'AcOH': dict(label='CH₃CO₂H', nuc='OC(C)=O', strong=False, base='weak', neutral=True, ion='acetic acid', pclass='ester'),
}
SOLV = {'DMSO': 'aprotic', 'DMF': 'aprotic', 'CH3CN': 'aprotic', 'acetone': 'aprotic', 'HMPA': 'aprotic',
        'H2O': 'protic', 'MeOH': 'protic', 'EtOH': 'protic', 'AcOH': 'protic', 'tBuOH': 'protic'}
LGQ = {'I': 'excellent (conjugate base of HI, pKa about -11)', 'Br': 'good (conjugate base of HBr)',
       'Cl': 'good (conjugate base of HCl)', 'OTs': 'excellent (tosylate, conjugate base of a strong sulfonic acid)',
       'OH': 'poor (hydroxide is a strong base) unless protonated or converted to OTs', 'F': 'poor (fluoride is a stronger base)'}


def mol(s):
    return Chem.MolFromSmiles(s)


def smi(m):
    return Chem.MolToSmiles(m)


def iupac(s):
    try:
        return _iupac(s)[0]
    except Exception:
        return None


def lg_info(s):
    m = mol(s)
    for kind in ('OTs', 'Br', 'Cl', 'I', 'F', 'OH'):
        patt = Chem.MolFromSmarts('[CX4]' + LGSMARTS[kind])
        mt = m.GetSubstructMatch(patt)
        if mt:
            return dict(kind=kind, alpha=mt[0], lg=mt[1])
    return None


def level(m, a):
    return sum(1 for n in m.GetAtomWithIdx(a).GetNeighbors() if n.GetAtomicNum() == 6)


def classify(s):
    info = lg_info(s)
    return level(mol(s), info['alpha'])


def cip_alpha(s):
    m = mol(s)
    rdCIPLabeler.AssignCIPLabels(m)
    return [a.GetProp('_CIPCode') for a in m.GetAtoms() if a.HasProp('_CIPCode')]


def is_chiral(s):
    return bool(cip_alpha(s))


def substitute(s, nu, invert=False):
    """replace the leaving group with fragment `nu`; invert=True gives SN2 inversion at the alpha carbon"""
    info = lg_info(s)
    rxn = AllChem.ReactionFromSmarts(f"[CX4:1]{LGSMARTS[info['kind']]}>>[C:1]{nu}")
    p = rxn.RunReactants((mol(s),))[0][0]
    Chem.SanitizeMol(p)
    if invert:
        for a in p.GetAtoms():
            if a.HasProp('old_mapno') and a.GetIntProp('old_mapno') == 1:
                t = a.GetChiralTag()
                if t == Chem.ChiralType.CHI_TETRAHEDRAL_CW:
                    a.SetChiralTag(Chem.ChiralType.CHI_TETRAHEDRAL_CCW)
                elif t == Chem.ChiralType.CHI_TETRAHEDRAL_CCW:
                    a.SetChiralTag(Chem.ChiralType.CHI_TETRAHEDRAL_CW)
    return smi(p)


def racemic(s):
    """strip stereo (SN1 product mixture drawn flat)"""
    m = mol(s)
    Chem.RemoveStereochemistry(m)
    return smi(m)


def _strip_lg(rw, alpha, lg):
    rw.RemoveBond(alpha, lg)
    keep = None
    for f in Chem.GetMolFrags(rw):
        if alpha in f:
            keep = set(f)
    for idx in sorted((a.GetIdx() for a in rw.GetAtoms() if a.GetIdx() not in keep), reverse=True):
        rw.RemoveAtom(idx)
    return rw


def alkenes(s):
    """all E2/E1 alkene products: list of (smiles, substitution_level, beta_idx)"""
    info = lg_info(s)
    m = mol(s)
    a = info['alpha']
    out = []
    for b in m.GetAtomWithIdx(a).GetNeighbors():
        if b.GetAtomicNum() != 6 or b.GetTotalNumHs() == 0:
            continue
        rw = Chem.RWMol(m)
        for at in rw.GetAtoms():
            at.SetIntProp('o', at.GetIdx())
        _strip_lg(rw, a, info['lg'])
        ia = next(x.GetIdx() for x in rw.GetAtoms() if x.GetIntProp('o') == a)
        ib = next(x.GetIdx() for x in rw.GetAtoms() if x.GetIntProp('o') == b.GetIdx())
        rw.GetBondBetweenAtoms(ia, ib).SetBondType(Chem.BondType.DOUBLE)
        for at in rw.GetAtoms():
            at.SetChiralTag(Chem.ChiralType.CHI_UNSPECIFIED)
            at.ClearProp('o')
        mm = rw.GetMol()
        Chem.SanitizeMol(mm)
        sub = level(mm, ia) - 1 + level(mm, ib) - 1
        out.append((smi(Chem.MolFromSmiles(smi(mm))), sub, b.GetIdx()))
    uniq = {}
    for o in out:
        uniq.setdefault(o[0], o)
    return list(uniq.values())


def trans_form(a_smi):
    """for 1,2-disubstituted acyclic alkenes return the E isomer; otherwise unchanged"""
    m = mol(a_smi)
    for b in m.GetBonds():
        if b.GetBondType() == Chem.BondType.DOUBLE and not b.IsInRing():
            x, y = b.GetBeginAtom(), b.GetEndAtom()
            nx = [n.GetIdx() for n in x.GetNeighbors() if n.GetIdx() != y.GetIdx()]
            ny = [n.GetIdx() for n in y.GetNeighbors() if n.GetIdx() != x.GetIdx()]
            if len(nx) == 1 and len(ny) == 1 and len(set(smi(Chem.MolFromSmiles(a_smi)))) >= 0:
                for st in (Chem.BondStereo.STEREOTRANS,):
                    mm = Chem.RWMol(m)
                    bb = mm.GetBondWithIdx(b.GetIdx())
                    bb.SetStereoAtoms(nx[0], ny[0])
                    bb.SetStereo(st)
                    return smi(mm)
            if len(nx) == 2 and len(ny) == 1 or len(nx) == 1 and len(ny) == 2:
                pass
    return a_smi


def eliminate(s, hofmann=False):
    opts = alkenes(s)
    if not opts:
        return None
    best = (min if hofmann else max)(opts, key=lambda o: o[1])
    ties = [o for o in opts if o[1] == best[1]]
    major = ties[0][0]
    return trans_form(major) if not hofmann or best[1] >= 2 else major, [o[0] for o in opts]


def _move_lg(rw, alpha, lg, new):
    rw.RemoveBond(alpha, lg)
    rw.AddBond(new, lg, Chem.BondType.SINGLE)


def rearranged(s):
    """carbocation rearrangement of the cation formed from s: returns (new_substrate_smiles, kind) or None.
    The LG is moved to the carbon that would bear the positive charge after a 1,2-H or 1,2-CH3 shift."""
    info = lg_info(s)
    m = mol(s)
    a = info['alpha']
    la = level(m, a)
    best = None
    for b in m.GetAtomWithIdx(a).GetNeighbors():
        if b.GetAtomicNum() != 6:
            continue
        bi = b.GetIdx()
        if b.GetTotalNumHs() > 0:                       # hydride shift
            lb = level(m, bi)
            if lb > la and (best is None or lb > best[0]):
                best = (lb, 'H', bi, None)
        else:                                            # methyl shift from a quaternary beta carbon
            for c in b.GetNeighbors():
                if c.GetIdx() != a and c.GetAtomicNum() == 6 and c.GetDegree() == 1:
                    lb = level(m, bi) - 1
                    if lb > la and (best is None or lb > best[0]):
                        best = (lb, 'CH3', bi, c.GetIdx())
                    break
    if not best:
        return None
    _, kind, bi, ci = best
    rw = Chem.RWMol(m)
    if kind == 'CH3':
        rw.RemoveBond(bi, ci)
        rw.AddBond(a, ci, Chem.BondType.SINGLE)
    _move_lg(rw, a, info['lg'], bi)
    for at in rw.GetAtoms():
        at.SetChiralTag(Chem.ChiralType.CHI_UNSPECIFIED)
    mm = rw.GetMol()
    Chem.SanitizeMol(mm)
    return smi(Chem.MolFromSmiles(smi(mm))), ('hydride shift' if kind == 'H' else 'methyl shift')


def decide(s, reagent, solvent=None, heat=False):
    """returns dict(mech, minor, steps, factors[list])"""
    info = lg_info(s)
    lv = level(mol(s), info['alpha'])
    r = REAG[reagent] if reagent in REAG else None
    kind = info['kind']
    sp = SOLV.get(solvent, '') if solvent else ''
    f = [f"Substrate: {CLS[lv]} alkyl {'halide' if kind in ('Cl','Br','I','F') else 'tosylate' if kind=='OTs' else 'alcohol'}",
         f"Leaving group: {LGQ[kind].split(' (')[0]} leaving group ({kind if kind != 'OTs' else 'OTs'})"]
    if r:
        f.append(f"Nucleophile/base: {r['ion']} is a {'strong' if r['strong'] else 'weak'} nucleophile and a {r['base']} base"
                 + (' (bulky)' if r.get('bulky') else ''))
    if solvent:
        f.append(f"Solvent: {solvent} is {sp}")
    if r is None:
        return dict(mech=None, factors=f, level=lv)
    if r['base'] == 'strong':
        if lv == 0 or (lv == 1 and not r.get('bulky')):
            mech, minor = 'SN2', 'E2 (minor)'
        elif lv == 1:
            mech, minor = 'E2', 'SN2 (minor)'
        else:
            mech, minor = 'E2', 'SN1/E1 do not compete under strongly basic conditions'
    elif r.get('neutral'):
        if lv >= 2:
            mech, minor = 'SN1', 'E1 (minor; favored by heat)'
        else:
            mech, minor = 'SN2', 'none significant (slow solvolysis)'
    else:
        mech, minor = ('SN2', 'none') if lv <= 2 else ('E2', 'SN1 is too slow with a weakly basic nucleophile; SN2 is impossible')
    return dict(mech=mech, minor=minor, factors=f, level=lv)
