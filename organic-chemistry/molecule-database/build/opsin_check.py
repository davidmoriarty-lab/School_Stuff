import warnings, contextlib, io, os, sys
warnings.filterwarnings('ignore')
from py2opsin import py2opsin
from rdkit import Chem
def check(pairs):
    """pairs: [(smiles, name)] -> list of mismatches"""
    names=[n for _,n in pairs]
    with open(os.devnull,'w') as dn, contextlib.redirect_stderr(dn):
        back=py2opsin(names)
    bad=[]
    for (s,n),b in zip(pairs,back):
        try: ok = b and Chem.CanonSmiles(b)==Chem.CanonSmiles(s)
        except Exception: ok=False
        if not ok: bad.append((s,n,b))
    return bad
