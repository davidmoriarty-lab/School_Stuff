"""Quiz content (30 questions) and image generation.

Each question: stem text, optional stem image, four choices (text or drawn),
the correct letter, and an ARIO explanation for the answer key.
For choices the FIRST entry is the correct one; distractors follow in order and
the correct answer is placed at the letter listed in LETTERS.
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), '..', '..', '_shared'))

import os
from chemdraw import Struct, Text, Plus, Equil, compose, compose_with_arrows
from check_names import name_alkane

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, "..", "img")
os.makedirs(IMG, exist_ok=True)

CF3 = "CF<sub>3</sub>"
F3C = "F<sub>3</sub>C"


def S(smi, **kw):
    kw.setdefault("redh", False)
    return Struct(smi, **kw)


def SH(smi, labels, **kw):
    """Structure whose labeled H atoms are red with subscript letters."""
    return Struct(smi, hlabels=labels, **kw)


def save(name, items, **kw):
    path = os.path.join(IMG, name + ".png")
    compose(items, path=path, **kw)
    return path


# ---------------------------------------------------------------- arrow figures
def acetate(variant, letter):
    s = S("C[C:1](=[O:2])[O-:3]", lone=[2])
    good1 = lambda: s.arrow(("lpa", 3, 315), ("bond", 1, 3), bend=0.35)
    if variant == "correct":
        good1()
        s.arrow(("bond", 1, 2), ("atom", 2), bend=0.7, e_off=12)
    elif variant == "one_arrow":
        good1()
    elif variant == "to_carbon":
        good1()
        s.arrow(("bond", 1, 2), ("atom", 1), bend=-0.6, s_off=0, e_off=0)
    elif variant == "reversed":
        s.arrow(("bond", 1, 3), ("atom", 3), bend=0.5, e_off=-10)
        s.arrow(("lpa", 2, 270), ("bond", 1, 2), bend=-0.6)
    return [Text(letter + ")", 22, True), s]


def phenoxide(variant, letter):
    s = S("[O-:1][C:2]1=[CH:3][CH:4]=CC=C1", charge_pref=15)
    if variant == "correct":
        s.arrow(("lpa", 1, 270), ("bond", 1, 2), bend=-0.5)
        s.arrow(("bond", 2, 3), ("atom", 3), bend=0.6, s_off=-7, e_off=14)
    elif variant == "meta":
        s.arrow(("lpa", 1, 270), ("bond", 1, 2), bend=-0.5)
        s.arrow(("bond", 3, 4), ("atom", 4), bend=0.6, s_off=-7, e_off=14)
    elif variant == "direct":
        s.arrow(("lpa", 1, 270), ("atom", 3), bend=-0.5)
    elif variant == "one_arrow":
        s.arrow(("lpa", 1, 270), ("bond", 1, 2), bend=-0.5)
    return [Text(letter + ")", 22, True), s]


def proton_transfer(variant, letter):
    hy = S("[H:5][O-:1]")
    ph = S("[H:2][O:3]C1=CC=CC=C1", lone=[3], rotate=210)
    cross = []
    if variant == "correct":
        cross.append(dict(i=2, frm=("lp", 1), j=4, to=("atom", 2), bend=0.4))
        ph.arrow(("bondf", 2, 3, 0.15), ("atom", 3), bend=0.55, e_off=-9)
    elif variant == "one_arrow":
        cross.append(dict(i=2, frm=("lp", 1), j=4, to=("atom", 2), bend=0.4))
    elif variant == "reversed":
        cross.append(dict(i=4, frm=("atom", 2), j=2, to=("lp", 1), bend=0.4))
        ph.arrow(("lpa", 3, 90), ("bond", 2, 3), bend=0.5)
    elif variant == "to_oxygen":
        cross.append(dict(i=2, frm=("lp", 1), j=4, to=("atom", 3), bend=-0.4))
        ph.arrow(("bond", 2, 3), ("atom", 2), bend=0.5, s_off=0, e_off=0)
    items = [Text(letter + ")", 22, True), None, hy, Plus(), ph]
    return items, cross


def save_pt(name, variant, letter):
    items, cross = proton_transfer(variant, letter)
    # items: [text, None, hy, plus, ph]; drop the placeholder
    items = [items[0]] + items[2:]
    # indices shift by -1 after dropping the placeholder
    cross = [dict(c, i=c["i"] - 1, j=c["j"] - 1) for c in cross]
    path = os.path.join(IMG, name + ".png")
    compose_with_arrows(items, cross, gap=22, path=path)
    return path


# ---------------------------------------------------------------- questions
LETTERS = "CBABDCABACDBADCCBDACDBADBCDCABADBCDACBAD"  # answer letter for Q1..Q30


def build():
    Q = []

    def add(**kw):
        kw["n"] = len(Q) + 1
        Q.append(kw)

    # ===== Part 1: Atom ====================================================
    add(topic="Atom", level="Direct",
        stem="Ethanolamine has three different kinds of hydrogen, labeled below. Which labeled H is the most acidic?",
        stem_img=save("q01", [SH("[H:3]OC([H:1])CN[H:2]", {1: "1", 2: "2", 3: "3"})]),
        choices=["H₃ (the O–H)", "H₁ (the C–H on the carbon bearing O)", "H₂ (the N–H)",
                 "All three are about equally acidic"],
        why="Each conjugate base has its charge on a different atom: C, N or O. These are in the same row, so electronegativity decides. O is the most electronegative, so RO⁻ is the most stable base and the O–H is the most acidic.")

    add(topic="Atom", level="Two-factor",
        stem="Which labeled hydrogen in 3-mercaptopropan-1-ol is the most acidic?",
        stem_img=save("q02", [SH("[H:1]OCCC([H:3])S[H:2]", {1: "1", 2: "2", 3: "3"})]),
        choices=["H₂ (the S–H), because S is larger than O and spreads the charge over a larger volume",
                 "H₁ (the O–H), because O is more electronegative than S",
                 "H₃ (the C–H next to S), because it is closest to the large S atom",
                 "H₁ and H₂ are equally acidic because O and S are in the same column"],
        why="Compare RS⁻ with RO⁻. O and S are in the same column, so size is the dominant effect, not electronegativity. The larger S⁻ is more stable, so the S–H is more acidic.")

    add(topic="Atom", level="Two-factor",
        stem="Acetaminophen (Tylenol) is shown below. Which labeled H is the most acidic?",
        stem_img=save("q03", [SH("[H:1]OC1=C([H:3])C=C(C=C1)N([H:2])C(=O)C[H:4]",
                                 {1: "1", 2: "2", 3: "3", 4: "4"})]),
        choices=["H₁ (the phenol O–H), because O is more electronegative than N",
                 "H₂ (the amide N–H), because the N⁻ charge is delocalized onto the carbonyl O",
                 "H₃ (the aromatic C–H), because it is on an sp²-hybridized carbon",
                 "H₄ (the CH₃ hydrogen), because it is next to a C=O"],
        why="H₁ and H₂ both give resonance-stabilized bases, so look at factor 1 first: the charge is on O in one and on N in the other. Same row, so the more electronegative O wins. H₃ and H₄ are C–H bonds, which is the weakest factor 1 outcome.")

    add(topic="Atom", level="Direct",
        stem="Two anions are shown. Which is the stronger base, and why?",
        stem_img=save("q04", [Text("I", 22, True), S("CC[O-:1]"), Text("II", 22, True), S("CC[N-:2][H]")], gap=22),
        choices=["II, because N is less electronegative than O, so the negative charge on N is less stable",
                 "I, because O is more electronegative, so its charge is held more tightly",
                 "I, because O is larger than N",
                 "They are equally basic because both anions have a lone pair"],
        why="Both charges are in the same row of the periodic table, so electronegativity decides. N is less electronegative than O, so N⁻ is less stable (stronger base).")

    # ===== Part 2: Resonance ===============================================
    add(topic="Resonance", level="Direct",
        stem="4-Hydroxybutanoic acid has the labeled hydrogens shown. Which is the most acidic?",
        stem_img=save("q05", [SH("[H:2]OCCC([H:3])C(=O)O[H:1]", {1: "1", 2: "2", 3: "3"})]),
        choices=["H₁ (the carboxylic acid O–H), because its conjugate base is resonance stabilized",
                 "H₂ (the alcohol O–H), because alcohols are more acidic than carboxylic acids",
                 "H₃ (the C–H next to C=O), because it is next to a carbonyl",
                 "H₁ and H₂ are equally acidic because both are on oxygen"],
        why="H₁ and H₂ both put the charge on O, so atom does not decide. The carboxylate is delocalized over two oxygens by resonance; the alkoxide is localized. H₃ is a C–H (atom favors O).")

    add(topic="Resonance", level="Two-factor",
        stem="Which labeled hydrogen in the following compound is the most acidic?",
        stem_img=save("q06", [SH("CN([H:1])C([H:4])C([H:3])C(=O)N([H:2])C",
                                 {1: "1", 2: "2", 3: "3", 4: "4"})]),
        choices=["H₂ (the amide N–H)", "H₁ (the amine N–H)", "H₃ (the C–H next to C=O)",
                 "H₄ (the C–H next to the amine N)"],
        why="H₁ and H₂ are both N–H, so factor 1 ties. Deprotonating the amide N–H gives a base whose charge is delocalized onto the carbonyl O by resonance; the amine N⁻ is localized. H₃ and H₄ are C–H bonds and lose on factor 1.")

    add(topic="Resonance", level="Direct",
        stem="Which labeled hydrogen is the most acidic?",
        stem_img=save("q07", [SH("[H:1]OC1=CC=C(C=C1)C([H:3])O[H:2]", {1: "1", 2: "2", 3: "3"})]),
        choices=["H₁ (the phenol O–H), because the phenoxide charge is delocalized into the ring",
                 "H₂ (the benzylic alcohol O–H), because the alkoxide is more electronegative",
                 "H₃ (the benzylic C–H), because the carbanion is next to a ring",
                 "All three are equally acidic"],
        why="H₁ and H₂ both give O⁻, so factor 1 does not decide (H₃ is a C–H, which loses). Only the phenoxide is resonance stabilized; the benzylic alkoxide is not.")

    add(topic="Resonance", level="Two-factor",
        stem="Ethyl acetoacetate has the labeled hydrogens shown. Which one is the most acidic?",
        stem_img=save("q08", [SH("C([H:1])C(=O)C([H:2])C(=O)OC([H:3])C[H:4]",
                                 {1: "1", 2: "2", 3: "3", 4: "4"})]),
        choices=["H₂ (the CH₂ between the two C=O groups)",
                 "H₁ (the CH₃ next to the ketone)",
                 "H₃ (the OCH₂ hydrogen)",
                 "H₄ (the CH₃ of the ethyl group)"],
        why="All four are C–H bonds, so factor 1 is a tie. Only removing H₂ gives a base whose charge is delocalized onto two carbonyl oxygens. H₁ gives a base delocalized onto only one.")

    def add_arrow_q(topic, level, stem, builder, variants, why, name):
        # variants[0] is the correct one
        n = len(Q) + 1
        letter = LETTERS[n - 1]
        order = list(variants[1:])
        order.insert("ABCD".index(letter), variants[0])
        choices, correct = [], None
        for k, v in enumerate(order):
            L = "ABCD"[k]
            path = os.path.join(IMG, f"q{n:02d}_{L}.png")
            if builder is save_pt:
                builder(f"q{n:02d}_{L}", v, L)
            else:
                compose(builder(v, L), path=path, gap=14)
            choices.append(("img", path))
        add(topic=topic, level=level, stem=stem, stem_img=None, choices_img=choices, why=why,
            correct=letter, arrow_q=True)

    add_arrow_q("Resonance", "Two-factor",
                "Acetate is shown. Which set of curved arrows correctly converts this resonance structure into the other one?",
                acetate, ["correct", "one_arrow", "to_carbon", "reversed"],
                "Arrow 1 starts on a lone pair of O⁻ and ends between O and C (forming the C=O π bond). Arrow 2 starts on the C=O π bond and ends on the other O (becoming a lone pair). Every arrow goes from electrons to where the electrons end up.", "q09")

    add_arrow_q("Resonance", "Two-factor",
                "Which set of curved arrows correctly shows the charge of phenoxide moving onto an ortho carbon?",
                phenoxide, ["correct", "meta", "direct", "one_arrow"],
                "Arrow 1: lone pair on O⁻ forms the C=O π bond. Arrow 2: the adjacent ring C=C π bond moves onto the ortho carbon as a lone pair. A single arrow leaves the ipso carbon with five bonds, and moving the electrons to a meta carbon is not a valid resonance shift. The delocalization of charge into the ring is why phenol is more acidic than an alcohol.", "q10")

    add(topic="Resonance", level="Two-factor",
        stem="Cyclopentadiene is shown. Which labeled hydrogen is the most acidic?",
        stem_img=save("q11", [SH("C1([H:1])C([H:2])=C([H:3])C=C1", {1: "1", 2: "2", 3: "3"})]),
        choices=["H₁ (the CH₂ hydrogen)", "H₂ (the vinyl H next to the CH₂)", "H₃ (the other vinyl H)",
                 "All three are equally acidic"],
        why="All are C–H bonds. Removing H₁ gives the cyclopentadienyl anion, with the charge delocalized over five carbons by resonance. Removing a vinyl H (H₂ or H₃) puts the charge in an sp² orbital that does not overlap with the π system, so there is no resonance.")

    # ===== Part 3: Induction ===============================================
    add(topic="Induction", level="Two-factor",
        stem="Rank the carboxylic acids from LEAST acidic to MOST acidic.",
        stem_img=save("q12", [Text("I", 22, True), S("CCCC(=O)O"), Text("II", 22, True), S("ClCCCC(=O)O"),
                              Text("III", 22, True), S("CCC(Cl)C(=O)O")], gap=18),
        choices=["I < II < III", "III < II < I", "II < I < III", "I < III < II"],
        why="All three have the same atom and resonance. Cl withdraws electron density by induction and stabilizes the carboxylate. The effect weakens with distance: III (Cl on the α carbon) > II (Cl on the γ carbon) > I (no Cl).")

    add(topic="Induction", level="Two-factor",
        stem="Which labeled hydrogen is the most acidic?",
        stem_img=save("q13", [SH("[H:1]OC([*:9])([*:8])CCCO[H:2]", {1: "1", 2: "2"},
                                 atomlabels={8: CF3, 9: CF3})]),
        choices=["H₁, because the CF₃ groups stabilize the nearby alkoxide by induction",
                 "H₂, because primary alcohols are less hindered",
                 "H₂, because it is far from the electron-withdrawing groups",
                 "H₁ and H₂ are equally acidic"],
        why="Both conjugate bases have the charge on O with no resonance. The three F atoms on each CF₃ pull electron density through the σ bonds and stabilize the nearby O⁻. The other alkoxide is too far away to feel it.")

    add(topic="Induction", level="Two-factor",
        stem="Which acid is the strongest?",
        choices_img=[
            ("img", None, "FCC(=O)O"), ("img", None, "CC(=O)O"), ("img", None, "BrCC(=O)O"),
            ("img", None, "ICC(=O)O")],
        why="Same atom, no change in resonance. The halogen on the α carbon withdraws electron density by induction. F is the most electronegative, so FCH₂CO₂⁻ is the most stabilized.")

    # ===== Part 4: Orbitals ===============================================
    add(topic="Orbitals", level="Direct",
        stem="Which labeled hydrogen in the following compound is the most acidic?",
        stem_img=save("q15", [SH("[H:1]C#CCC([H:4])CC([H:2])=C[H:3]", {1: "1", 2: "2", 3: "3", 4: "4"})]),
        choices=["H₁ (the alkyne H)", "H₂ (the internal vinyl H)", "H₃ (the terminal vinyl H)", "H₄ (the CH₂)"],
        why="All are C–H bonds, with no resonance or induction available. Only the orbital differs: sp (alkyne) > sp² (vinyl) > sp³ (alkyl). The sp orbital has the most s character, holding the lone pair closest to the nucleus.")

    add(topic="Orbitals", level="Direct",
        stem="Which of these anions is the strongest base?",
        choices_img=[
            ("img", None, "CCCCC[CH2-:1]"), ("img", None, "CCCCC#[C-:1]"),
            ("img", None, "CCCCC=[CH-:1]"), ("text", "All three are equally basic because the charge is on carbon in each")],
        why="The charge is on carbon in all three, with no resonance or induction. The orbital differs: the alkyl anion has the charge in an sp³ orbital (highest energy, least stable, strongest base). The alkynide is in an sp orbital (most stable, weakest base).")

    add(topic="Orbitals", level="Direct",
        stem="A terminal alkyne C–H is more acidic than an alkene C–H. Which statement best explains why?",
        stem_img=None,
        choices=["The electron pair in the sp orbital is held closer to the nucleus, so the alkynide ion is more stable",
                 "The sp carbon has more p character, so it is more electronegative",
                 "The alkynide ion has resonance structures that spread out the charge",
                 "The triple bond withdraws electron density from the C–H bond by induction"],
        why="This is factor 4 (orbitals). An sp orbital is 50% s character, which is closer to the nucleus than the 33% s character of an sp² orbital, so the lone pair in an sp orbital is lower in energy.")

    # ===== Part 5: Competing factors =======================================
    add(topic="Competing factors", level="Challenge",
        stem="Which of the labeled hydrogens is more acidic?",
        stem_img=save("q18", [Text("I", 22, True), SH("CCO[H:1]", {1: "1"}),
                              Text("II", 22, True), SH("C=CC[H:2]", {2: "2"})], gap=30),
        choices=["H₁ in I (ethanol), because the atom (O vs. C) outranks resonance",
                 "H₂ in II (propene), because the allyl anion is resonance stabilized",
                 "H₂ in II (propene), because the carbon is sp² hybridized",
                 "They are about equal"],
        why="Propene's CH₃ gives a resonance-stabilized allyl anion, but the charge is on carbon. Ethoxide has the charge on O. The atom (factor 1) takes priority over resonance (factor 2).")

    add(topic="Competing factors", level="Challenge",
        stem="Which labeled hydrogen is the most acidic?",
        stem_img=save("q19", [SH("O=C(O[H:1])CCCC(O[H:2])[*:9]", {1: "1", 2: "2"},
                                 atomlabels={9: CF3})]),
        choices=["H₁, because resonance outranks induction",
                 "H₂, because the CF₃ group stabilizes the alkoxide by induction",
                 "H₂, because alcohols are more acidic than carboxylic acids",
                 "They are equally acidic"],
        why="Both put the charge on O, so factor 1 ties. The carboxylate is resonance stabilized (factor 2); the alkoxide only has the inductive effect of CF₃ (factor 3). Resonance beats induction.")

    add(topic="Competing factors", level="Challenge",
        stem="Which labeled hydrogen is more acidic?",
        stem_img=save("q20", [SH("[H:1]C#CCCO[H:2]", {1: "1", 2: "2"})]),
        choices=["H₂, because the atom (O vs. C) outranks the orbital",
                 "H₁, because an sp carbanion is the most stable",
                 "H₁, because the alkynide ion is resonance stabilized",
                 "They are about equal"],
        why="H₁ gives a carbanion on an sp carbon; H₂ gives an alkoxide. Atom comes before orbital: O⁻ is more stable than C⁻ even in an sp orbital.")

    add(topic="Competing factors", level="Challenge",
        stem="Rank these from LEAST acidic to MOST acidic.",
        stem_img=save("q21", [Text("I", 22, True), S("CCO"), Text("II", 22, True), S("OCC(F)(F)F"),
                              Text("III", 22, True), S("CC(=O)O")], gap=18),
        choices=["I < II < III", "III < II < I", "II < I < III", "I < III < II"],
        why="All three have the charge on O. III is resonance stabilized (factor 2), the strongest effect here. II has the inductive effect of three F atoms (factor 3), and I has neither.")

    add(topic="Competing factors", level="Two-factor",
        stem="Aspirin is shown. Which labeled hydrogen is the most acidic?",
        stem_img=save("q22", [SH("O=C(O[H:1])C1=C(OC(=O)C[H:3])C([H:2])=CC=C1", {1: "1", 2: "2", 3: "3"})]),
        choices=["H₁ (the carboxylic acid O–H)", "H₂ (the aromatic C–H)", "H₃ (the CH₃ on the acetyl group)",
                 "All three are about equally acidic"],
        why="H₁ puts the charge on O (factor 1) and the carboxylate is resonance stabilized. H₂ and H₃ put the charge on carbon, which loses on factor 1.")

    # ===== Part 6: Position of equilibrium =================================
    def rxn(name, left, right):
        items = []
        for k, side in enumerate((left, right)):
            for j, m in enumerate(side):
                if j:
                    items.append(Plus())
                items.append(m)
            if k == 0:
                items.append(Equil())
        return save(name, items, gap=18)

    add(topic="Equilibrium", level="Two-factor",
        stem="Which side of the equilibrium is favored?",
        stem_img=rxn("q23", [S("CC[O-:1]"), S("CC(=O)O")], [S("CCO"), S("CC(=O)[O-:2]")]),
        choices=["The products, because acetate is resonance stabilized and is the more stable anion",
                 "The reactants, because ethoxide is more stable",
                 "Neither side, because both anions have the charge on O",
                 "The products, because ethanol is a stronger acid than acetic acid"],
        why="The equilibrium favors the more stable ion. Both anions have O⁻, so compare resonance: acetate is delocalized over two O atoms, ethoxide is not. Acetate is the weaker base, so the products are favored.")

    add(topic="Equilibrium", level="Two-factor",
        stem="Which side of the equilibrium is favored?",
        stem_img=rxn("q24", [S("[H:5][O-:1]"), S("CCS")], [Text("H₂O", 22), S("CC[S-:2]")]),
        choices=["The products, because the larger S atom stabilizes the charge better",
                 "The reactants, because O is more electronegative than S",
                 "Neither side, because O and S are both in group 16",
                 "The reactants, because hydroxide is the smaller anion"],
        why="Compare HO⁻ with RS⁻. O and S are in the same column, so size decides. The larger RS⁻ is more stable (weaker base), so the equilibrium favors the products.")

    add(topic="Equilibrium", level="Challenge",
        stem="Which side of the equilibrium is favored?",
        stem_img=rxn("q25", [S("CC[O-:1]"), S("[H]C#C[H]")], [S("CCO"), S("[H]C#[C-:2]")]),
        choices=["The reactants, because ethoxide (O⁻) is more stable than the sp carbanion (C⁻)",
                 "The products, because the sp carbanion is the most stable carbanion",
                 "The products, because the alkynide ion has resonance structures",
                 "Neither side, because both anions have lone pairs"],
        why="Compare RO⁻ with the alkynide. Atom (factor 1) before orbital (factor 4): O is more electronegative than C, so ethoxide is more stable. The reactants are favored.")

    add(topic="Equilibrium", level="Two-factor",
        stem="Which side of the equilibrium is favored?",
        stem_img=rxn("q26", [S("[O-:1]C1=CC=CC=C1"), S("CCO")], [S("OC1=CC=CC=C1"), S("CC[O-:2]")]),
        choices=["The reactants, because phenoxide is resonance stabilized",
                 "The products, because ethanol is the more acidic reactant",
                 "The products, because ethoxide is more stable",
                 "Neither side, because both anions have the charge on O"],
        why="Both anions have O⁻, so compare resonance. Phenoxide is delocalized into the ring; ethoxide is not. The more stable anion (phenoxide) is on the reactant side, so the reactants are favored.")

    add(topic="Equilibrium", level="Challenge",
        stem="Which side of the equilibrium is favored?",
        stem_img=rxn("q27", [S("[*:9]C(=O)[O-:1]", atomlabels={9: CF3}), S("CC(=O)O")],
                     [S("[*:9]C(=O)O", atomlabels={9: CF3}), S("CC(=O)[O-:2]")]),
        choices=["The reactants, because CF₃CO₂⁻ is stabilized by induction",
                 "The products, because acetate is resonance stabilized",
                 "The products, because CH₃ donates electron density to the carboxylate",
                 "Neither side, because both anions are resonance stabilized"],
        why="Both anions are carboxylates, so atom and resonance tie. The three F atoms stabilize CF₃CO₂⁻ by induction (factor 3), so CF₃CO₂⁻ is more stable and the reactant side is favored.")

    add_arrow_q("Equilibrium", "Two-factor",
                "Hydroxide deprotonates phenol. Which set of curved arrows correctly shows the proton transfer?",
                save_pt, ["correct", "one_arrow", "reversed", "to_oxygen"],
                "A proton transfer always uses at least two arrows. Arrow 1 starts on a lone pair of the base (HO⁻) and ends on the H. Arrow 2 starts on the O–H bond and ends on the O of the acid, which becomes the conjugate base.", "q28")

    add(topic="Equilibrium", level="Two-factor",
        stem="Which side of the equilibrium is favored?",
        stem_img=rxn("q29", [S("CCC#[C-:1]"), S("CCC=C")], [S("CCC#C[H]"), S("CCC=[CH-:2]")]),
        choices=["The reactants, because the alkynide (charge in an sp orbital) is more stable than the vinyl anion (charge in an sp² orbital)",
                 "The products, because the vinyl anion is resonance stabilized",
                 "The products, because an sp² orbital is closer to the nucleus than an sp orbital",
                 "Neither side, because both anions have the charge on carbon"],
        why="Both ions have the charge on carbon, with no resonance and no inductive effects, so only the orbital differs (factor 4). An sp orbital (50% s character) holds the lone pair closer to the nucleus than an sp² orbital (33% s), so the alkynide is more stable. The more stable ion is on the reactant side, so the reactants are favored.")

    add(topic="Equilibrium", level="Challenge",
        stem="Which anion is a strong enough base to deprotonate ethanol so that the equilibrium favors the products?",
        choices_img=[("img", None, "[H]C#[C-:1]"), ("img", None, "CC(=O)[O-:1]"),
                     ("img", None, "[O-:1]C1=CC=CC=C1"), ("img", None, "C[S-:1]")],
        why="Ethanol deprotonates to give ethoxide, so the base must be a less stable (stronger) base than ethoxide. Acetate (resonance), phenoxide (resonance), and CH₃S⁻ (larger atom) are all more stable than ethoxide. The alkynide ion has the charge on C and is less stable.")

    # ===== Part 7: Nomenclature of branched alkanes ========================
    def name_q(n_img, smi, correct, wrong, why, stem="Which is the correct IUPAC name for this alkane?"):
        # independent check: the stated answer must match the structure
        assert name_alkane(smi) == correct, (smi, correct, name_alkane(smi))
        for w in wrong:
            assert w != correct
        add(topic="Nomenclature", level="Direct", stem=stem,
            stem_img=save(n_img, [S(smi)]), choices=[correct] + wrong, why=why)

    name_q("q31", "CC(C)CCC", "2-methylpentane",
           ["4-methylpentane", "3-methylpentane", "2-ethylbutane"],
           "The longest chain has 5 carbons (pentane) with one methyl branch. Number from the end that gives the branch the lower number: 2-methylpentane, not 4-methylpentane.")
    name_q("q32", "CCC(C)CCC", "3-methylhexane",
           ["4-methylhexane", "2-ethylpentane", "3-methylpentane"],
           "The longest chain has 6 carbons (hexane). The methyl is on carbon 3 when numbered from the left and carbon 4 from the right, so use the lower number: 3-methylhexane.")
    name_q("q33", "CC(C)(C)CC", "2,2-dimethylbutane",
           ["3,3-dimethylbutane", "2-ethyl-2-methylpropane", "2,2-dimethylpropane"],
           "The longest chain has 4 carbons (butane) with two methyl groups on the same carbon. Number from the end that gives them the lower number (2,2), and repeat the locant for each methyl.")
    name_q("q34", "CC(C)C(C)CC", "2,3-dimethylpentane",
           ["3,4-dimethylpentane", "2-methyl-3-methylpentane", "2,3-dimethylhexane"],
           "The longest chain has 5 carbons (pentane) with two methyl branches. Numbering from the left gives locants 2,3; from the right it gives 3,4. Use 2,3 and combine the identical groups as dimethyl.")
    name_q("q35", "CCC(CC)CC", "3-ethylpentane",
           ["3-methylhexane", "3-propylbutane", "heptane"],
           "The longest chain has 5 carbons: the central carbon can be reached by chains through any two of the three ethyl groups. The third ethyl is the branch on carbon 3: 3-ethylpentane. (Choosing a 6-carbon chain is not possible for this structure.)")
    name_q("q36", "CC(C)CC(CC)CC", "4-ethyl-2-methylhexane",
           ["3-ethyl-5-methylhexane", "2-methyl-4-ethylhexane", "2-ethyl-4-methylhexane"],
           "The longest chain has 6 carbons (hexane). Numbering from the left gives locants 2,4; from the right it gives 3,5, so use 2,4. List the substituents in alphabetical order: ethyl comes before methyl, so 4-ethyl-2-methylhexane.")
    name_q("q37", "CC(C)CC(C)(C)C", "2,2,4-trimethylpentane",
           ["2,4,4-trimethylpentane", "2,2,3-trimethylpentane", "2,2,4-trimethylhexane"],
           "The longest chain has 5 carbons (pentane) with three methyl groups. Numbering from the end that gives the lowest locants gives 2,2,4 (from the other end the set would be 2,4,4). Three identical groups use the prefix tri.")
    name_q("q38", "CC(C)C(CC)CC", "3-ethyl-2-methylpentane",
           ["2-methyl-3-ethylpentane", "3-ethyl-4-methylpentane", "2,3-diethylbutane"],
           "The longest chain has 5 carbons (pentane). Numbering from the left gives the substituents locants 2 and 3; from the right they would be 3 and 4. Alphabetical order puts ethyl before methyl: 3-ethyl-2-methylpentane.")
    name_q("q39", "CC(C)CCC(C)C", "2,5-dimethylhexane",
           ["2,4-dimethylhexane", "1,1,4-trimethylpentane", "2-methyl-5-methylhexane"],
           "The longest chain has 6 carbons (hexane) with a methyl on each side. The molecule is symmetric, so both directions give 2,5. Combine the two identical groups as dimethyl: 2,5-dimethylhexane.")

    # ---- structure from a name (drawn choices)
    assert name_alkane("CC(C)C(C)(C)CC") == "2,3,3-trimethylpentane"
    for smi, nm in (("CC(C)(C)C(C)CC", "2,2,3-trimethylpentane"), ("CC(C)C(C)C(C)C", "2,3,4-trimethylpentane"),
                    ("CC(C)CC(C)(C)C", "2,2,4-trimethylpentane")):
        assert name_alkane(smi) == nm, (smi, nm)
    add(topic="Nomenclature", level="Two-factor",
        stem="Which structure is 2,3,3-trimethylpentane?",
        choices_img=[("img", None, "CC(C)C(C)(C)CC"), ("img", None, "CC(C)(C)C(C)CC"),
                     ("img", None, "CC(C)C(C)C(C)C"), ("img", None, "CC(C)CC(C)(C)C")],
        why="Draw a 5-carbon chain and put one methyl on carbon 2 and two methyls on carbon 3. The other three choices are the isomers 2,2,3-trimethylpentane, 2,3,4-trimethylpentane and 2,2,4-trimethylpentane.")

    return Q
