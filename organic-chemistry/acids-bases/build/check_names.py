"""Independent IUPAC check for simple branched alkanes (methyl/ethyl branches).

Used to verify every nomenclature answer in the quiz against its structure.
Rules applied: longest chain; if tied, the chain with the most substituents;
then lowest locants at the first point of difference; then alphabetical order.
"""
from itertools import product
from rdkit import Chem

PARENT = {1: "meth", 2: "eth", 3: "prop", 4: "but", 5: "pent", 6: "hex", 7: "hept",
          8: "oct", 9: "non", 10: "dec"}
MULT = {1: "", 2: "di", 3: "tri", 4: "tetra", 5: "penta"}


def _adj(m):
    return {a.GetIdx(): [n.GetIdx() for n in a.GetNeighbors()] for a in m.GetAtoms()}


def _longest_chains(adj):
    best, L = [], 0
    for s in adj:
        if len(adj[s]) <= 1:
            stack = [[s]]
            while stack:
                p = stack.pop()
                ext = False
                for nb in adj[p[-1]]:
                    if nb not in p:
                        stack.append(p + [nb])
                        ext = True
                if not ext:
                    if len(p) > L:
                        L, best = len(p), [p]
                    elif len(p) == L:
                        best.append(p)
    return best


def _branch_name(adj, chain_set, root, start):
    seen, stack = {root}, [start]
    atoms = []
    while stack:
        a = stack.pop()
        if a in seen:
            continue
        seen.add(a)
        atoms.append(a)
        stack.extend(n for n in adj[a] if n not in seen and n not in chain_set)
    if len(atoms) == 1:
        return "methyl"
    if len(atoms) == 2:
        return "ethyl"
    if len(atoms) == 3:
        return "isopropyl" if len([n for n in adj[start] if n != root]) == 2 else "propyl"
    raise ValueError("branch too complex for this checker")


def _subs(adj, chain):
    cs = set(chain)
    out = []
    for pos, c in enumerate(chain, start=1):
        for nb in adj[c]:
            if nb not in cs:
                out.append((pos, _branch_name(adj, cs, c, nb)))
    return out


def name_alkane(smiles):
    m = Chem.MolFromSmiles(smiles)
    adj = _adj(m)
    cands = []
    for chain in _longest_chains(adj):
        subs = _subs(adj, chain)
        cands.append((chain, subs))
    maxsubs = max(len(s) for _, s in cands)
    cands = [(c, s) for c, s in cands if len(s) == maxsubs]
    # lowest locant set, then alphabetical order of the names at those locants
    def key(item):
        chain, subs = item
        locs = sorted(p for p, _ in subs)
        alpha = [n for _, n in sorted(subs, key=lambda t: (t[0], t[1]))]
        return (locs, alpha)
    # chains come in both directions already (each leaf start), so numbering is covered
    best = min(cands, key=key)
    chain, subs = best
    groups = {}
    for p, n in subs:
        groups.setdefault(n, []).append(p)
    parts = []
    for n in sorted(groups):
        locs = ",".join(str(p) for p in sorted(groups[n]))
        parts.append(f"{locs}-{MULT[len(groups[n])]}{n}")
    return "-".join(parts) + PARENT[len(chain)] + "ane" if parts else PARENT[len(chain)] + "ane"


if __name__ == "__main__":
    tests = {
        "CC(C)CCC": "2-methylpentane",
        "CCC(C)CCC": "3-methylhexane",
        "CC(C)(C)CC": "2,2-dimethylbutane",
        "CC(C)C(C)CC": "2,3-dimethylpentane",
        "CCC(CC)CC": "3-ethylpentane",
        "CC(C)CC(CC)CC": "4-ethyl-2-methylhexane",
        "CC(C)CC(C)(C)C": "2,2,4-trimethylpentane",
        "CC(C)C(CC)CC": "3-ethyl-2-methylpentane",
        "CC(C)CCC(C)C": "2,5-dimethylhexane",
        "CC(C)C(C)(C)CC": "2,3,3-trimethylpentane",
    }
    ok = True
    for smi, want in tests.items():
        got = name_alkane(smi)
        flag = "ok " if got == want else "MISMATCH"
        ok &= got == want
        print(f"{flag} {smi:18s} expected {want:26s} got {got}")
    print("ALL OK" if ok else "SOME MISMATCHES")
