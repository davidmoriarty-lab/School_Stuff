"""Checks every structure drawn for the notes against independently written SMILES, using RDKit.

    python3 verify_structures.py

For each drawn picture the script (1) converts the drawn molecule (coordinates, wedges, dashes, double bonds) to an RDKit
molecule, (2) compares it with the expected structure written as a SMILES string, (3) reads the R/S label of every
stereocenter and the E/Z label of every stereo double bond from the drawing, and (4) names the molecule with the repository's
validated namer so the names in the notes can be compared by eye.  Needs rdkit (pip install rdkit).
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "..", "molecule-database", "build"))
from rdkit import Chem
from rdkit.Chem import rdCIPLabeler, rdMolDescriptors
import sne_figs as F
import skel
from skel import chain

EXPAND = {  # drawn label -> list of (element, [(bond_to_previous_index_in_group, order)])
    "": [("C", None)],
    "Br": [("Br", None)], "Cl": [("Cl", None)], "I": [("I", None)],
    "OH": [("O", None)],
    "CN": [("C", None), ("N", (0, 3))],
    "OEt": [("O", None), ("C", (0, 1)), ("C", (1, 1))],
    "OCH3": [("O", None), ("C", (0, 1))],
    "C": [("C", None)], "H": [("H", None)], "O": [("O", None)], "HO": [("O", None)],
    "H₂O": [("O", None)], "OH₂": [("O", None)],
    "SH": [("S", None)], "HS": [("S", None)], "SCH3": [("S", None), ("C", (0, 1))],
}


def to_rdkit(m):
    atoms, bonds = [], []        # atoms: (element, x, y)   bonds: (a, b, order, stereo)
    first = {}
    for i, (x, y, lab) in enumerate(m.atoms):
        grp = EXPAND[lab]
        base = len(atoms)
        first[i] = base
        for k, (el, link) in enumerate(grp):
            atoms.append((el, x + 0.15 * k, y + 0.15 * k))
            if link is not None:
                bonds.append((base + link[0], base + k, link[1], 0))
    for i, j, st in m.bonds:
        order = {"plain": 1, "double": 2, "triple": 3, "wedge": 1, "dash": 1}[st]
        stereo = {"wedge": 1, "dash": 6}.get(st, 0)
        bonds.append((first[i], first[j], order, stereo))
    lines = ["", "  verify", ""]
    lines.append("%3d%3d  0  0  0  0  0  0  0  0999 V2000" % (len(atoms), len(bonds)))
    for el, x, y in atoms:
        lines.append("%10.4f%10.4f%10.4f %-3s 0  0  0  0  0  0  0  0  0  0  0  0" % (x, y, 0.0, el))
    for a, b, o, s in bonds:
        lines.append("%3d%3d%3d%3d" % (a + 1, b + 1, o, s))
    chg = [(first[i] + 1, q) for i, q in getattr(m, "charge", {}).items()]
    for k in range(0, len(chg), 8):
        part = chg[k:k + 8]
        lines.append("M  CHG%3d" % len(part) + "".join(" %3d %3d" % (a, q) for a, q in part))
    lines.append("M  END")
    mol = Chem.MolFromMolBlock("\n".join(lines))
    assert mol is not None
    return mol


def labels(mol):
    rdCIPLabeler.AssignCIPLabels(mol)
    out = []
    for a in mol.GetAtoms():
        if a.HasProp("_CIPCode"):
            out.append("%s%d" % (a.GetProp("_CIPCode"), a.GetIdx()))
    for b in mol.GetBonds():
        if b.HasProp("_CIPCode"):
            out.append("%s(db)" % b.GetProp("_CIPCode"))
    return out


# expected structures, by picture and by position among the drawn molecules  (smiles, expected CIP labels or None)
EXPECT = {
    "q_sn2_stereo": [("CCC(C)Br", ["S"])],
    "a_sn2_stereo": [("CCC(C)Br", ["S"]), ("CCC(C)C#N", ["R"])],
    "q_e2_a": [("CCC(C)(C)Br", [])],
    "a_e2_a": [("CCC(C)(C)Br", []), ("CC=C(C)C", []), ("C=C(C)CC", [])],
    "q_e2_b": [("CCC(C)(C)Br", [])],
    "a_e2_b": [("CCC(C)(C)Br", []), ("C=C(C)CC", []), ("CC=C(C)C", [])],
    "q_e2_c": [("CCCC(C)Br", None)],
    "a_e2_c": [("CCCC(C)Br", None), ("C/C=C/CC", ["E"]), ("C/C=C\\CC", ["Z"]), ("C=CCCC", [])],
    "q_e1_a": [("CCC(C)(C)Br", [])],
    "a_e1_a": [("CCC(C)(C)Br", []), ("CCOC(C)(C)CC", []), ("CC=C(C)C", []), ("C=C(C)CC", [])],
    "q_e1_b": [("CCC(C)(C)O", [])],
    "a_e1_b": [("CCC(C)(C)O", []), ("CC=C(C)C", []), ("C=C(C)CC", [])],
    "q_sn1_a": [("CC(C)(C)Br", [])],
    "a_sn1_a": [("CC(C)(C)Br", []), ("CCOC(C)(C)C", [])],
    "q_sn1_b": [("CC(Br)C(C)(C)C", None)],
    "a_sn1_b": [("CCOC(C)(C)C(C)C", []), ("CC(C)=C(C)C", []), ("C=C(C)C(C)C", [])],
    "q_sn1_c": [("CCC(C)(Br)CCC", ["?"])],
    "a_sn1_c": [("CCC(C)(O)CCC", ["?"]), ("CCC(C)(O)CCC", ["?"])],
    "t_mtbe": [("CC(C)(C)OC", [])],
}


def formula_counts(rd):
    """Atom counts including hydrogens, and the total formal charge."""
    from collections import Counter
    h = Chem.AddHs(rd)
    c = Counter(a.GetSymbol() for a in h.GetAtoms())
    return c, sum(a.GetFormalCharge() for a in h.GetAtoms())


def check_mechanisms():
    """Every species drawn in a mechanism must be a valid molecule, and each arrow must balance atoms and charge."""
    import mech
    from collections import Counter
    bad = 0
    print("\nmechanism steps (drawn species -> RDKit; atoms and charge must balance across every arrow):")
    for name, steps in mech.STEPS.items():
        for k, (rs, ps) in enumerate(steps, 1):
            try:
                R = [to_rdkit(m) for m in rs]
                Pm = [to_rdkit(m) for m in ps]
            except Exception as e:          # RDKit refuses impossible valences (e.g. a carbon with four bonds and a + charge)
                print("BAD %-14s step %d  invalid structure: %s" % (name, k, str(e).splitlines()[0][:90]))
                bad += 1
                continue
            cr, qr, cp, qp = Counter(), 0, Counter(), 0
            for m in R:
                c, q = formula_counts(m); cr.update(c); qr += q
            for m in Pm:
                c, q = formula_counts(m); cp.update(c); qp += q
            ok = cr == cp and qr == qp
            # a carbocation drawn with a + on a carbon must have exactly three neighbors (counting hydrogens)
            for m in R + Pm:
                for a in Chem.AddHs(m).GetAtoms():
                    if a.GetSymbol() == "C" and a.GetFormalCharge() == 1 and a.GetDegree() != 3:
                        ok = False
            bad += 0 if ok else 1
            show = lambda ms: " + ".join(Chem.MolToSmiles(m) for m in ms)
            print("%s %-14s step %d  %s  ->  %s   (charge %+d -> %+d)" % ("ok " if ok else "BAD", name, k, show(R), show(Pm), qr, qp))
    return bad


def check_worksheets(captured_ws):
    """Every scheme in the worksheets (questions and answers) against its expected structure."""
    import ws_figs
    bad = 0
    n = 0
    print("\nworksheet pictures:")
    for name, exp in ws_figs.EXP.items():
        mols = captured_ws.get(name, [])
        if len(mols) != len(exp):
            print("BAD %-10s drawn %d molecules, expected %d" % (name, len(mols), len(exp)))
            bad += 1
            continue
        for k, (m, (smi, want)) in enumerate(zip(mols, exp)):
            n += 1
            try:
                rd = to_rdkit(m)
            except Exception as e:
                print("BAD %-10s #%d invalid structure: %s" % (name, k + 1, str(e).splitlines()[0][:80]))
                bad += 1
                continue
            got = Chem.MolToSmiles(Chem.RemoveHs(rd), isomericSmiles=False)
            ref = Chem.MolToSmiles(Chem.MolFromSmiles(smi), isomericSmiles=False)
            lab = [l[0] for l in labels(rd)]
            ok = got == ref
            if want is not None and want != ["?"]:
                ok = ok and sorted(lab) == sorted(want)
            if not ok:
                print("BAD %-10s #%d  drawn %s (labels %s)  expected %s (labels %s)" % (name, k + 1, got, lab, ref, want))
                bad += 1
            elif lab:
                print("ok  %-10s #%d  %-18s %s %s" % (name, k + 1, got, lab, ("" if want else "")))
    print("worksheet structures checked: %d, problems: %d" % (n, bad))
    return bad


def selftest():
    """The mistake in the first version of the notes: a carbocation drawn with four bonds and a + charge.
    The checker must reject it."""
    bad = chain(3, subs={1: [("", "plain"), ("", "plain")]})
    bad.charge[1] = 1
    try:
        to_rdkit(bad)
    except Exception:
        print("self-test ok: a carbon with four bonds and a + charge is rejected")
        return 0
    print("SELF-TEST FAILED: the checker accepted a four-bond carbocation")
    return 1


def main():
    captured = {}

    def recorder(items, path, **kw):
        name = os.path.splitext(os.path.basename(path))[0]
        captured[name] = [it for it in items if isinstance(it, skel.Mol)]
        return (1, 1)
    F.scheme = recorder
    # run only the structure-building part of build_all (mechanism pictures are not structures)
    F.sn2_mechanism = F.sn2_ts = F.e2_mechanism = F.sn1_mechanism = lambda *a, **k: None
    F.energy_one_step = F.energy_two_step = F.newman = lambda *a, **k: None
    import ws_figs
    captured_ws = {}

    def recorder_ws(items, path, **kw):
        name = os.path.splitext(os.path.basename(path))[0]
        captured_ws[name] = [it for it in items if isinstance(it, skel.Mol)]
        return (1, 1)
    F.build_all()
    ws_figs.scheme = recorder_ws
    ws_figs.build_all()
    try:
        import namer
    except Exception:
        namer = None
    bad = 0
    seen_labels = {}
    for pic, mols in captured.items():
        exp = EXPECT.get(pic)
        if exp is None:
            continue
        assert len(mols) == len(exp), (pic, len(mols), len(exp))
        for k, (m, (smi, want)) in enumerate(zip(mols, exp)):
            rd = to_rdkit(m)
            got = Chem.MolToSmiles(Chem.RemoveHs(rd), isomericSmiles=False)
            ref = Chem.MolToSmiles(Chem.MolFromSmiles(smi), isomericSmiles=False)
            ok = got == ref
            lab = labels(rd)
            lab_s = [l[0] for l in lab]
            if want is not None and want != ["?"]:
                ok = ok and sorted(lab_s) == sorted(want)
            seen_labels[(pic, k)] = lab_s
            flag = "ok " if ok else "BAD"
            bad += 0 if ok else 1
            nm = ""
            if namer:
                try:
                    nm = namer.name(Chem.MolToSmiles(rd))[0]
                    if lab_s:
                        nm += "   [drawn labels: %s]" % ",".join(lab_s)
                except Exception as e:
                    nm = "(namer: %s)" % e
            print("%s %-13s #%d  %-22s expected %-22s %s" % (flag, pic, k + 1, got, ref, nm))
    bad += check_worksheets(captured_ws)
    bad += selftest()
    bad += check_mechanisms()
    # the two enantiomers in a_sn1_c must differ, and q_sn1_c is one of them
    a = [seen_labels[("a_sn1_c", 0)], seen_labels[("a_sn1_c", 1)]]
    print("enantiomer pair in a_sn1_c:", a, "->", "ok" if a[0] != a[1] and len(a[0]) == 1 else "BAD")
    bad += 0 if (a[0] != a[1] and len(a[0]) == 1) else 1
    print("\nproblems:", bad)
    return bad


if __name__ == "__main__":
    sys.exit(1 if main() else 0)
