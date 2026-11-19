"""Builds the Honors Unit 6 Stoichiometry packet built around BCA tables (student notes and teacher edition).

    python3 make_stoich.py

Needs python-docx, Pillow, NumPy, Matplotlib (the same as the other packets). Every number in the key is computed here
from the data in the problem, using atomic masses to 0.01 g/mol, 22.4 L/mol at STP, and unrounded values carried through
to the final answer. A BCA table is built by the Rxn class: it finds mol rxn (moles / coefficient) for each reactant, the
limiting reactant (the smallest mol rxn), the Change row (coefficient x that smallest value) and the After row, and it
asserts that the equation is balanced by checking that mass is conserved.
"""
import sys, os, random
sys.path.insert(0, os.path.dirname(__file__))
import lib
from lib import *
import build_moles as B
from build_moles import sf, pct, mm, mm_exact, pretty, MASS, OUTDIR
from build_gases import Packet

MASS.update({"Zn": 65.38})          # Zn is not in the shared table
VM = 22.4                            # L/mol at STP


# ============================================================================ the BCA engine (answer key)
class Rxn:
    """A balanced reaction plus the starting moles of each reactant."""

    def __init__(self, eq, before):
        # eq: [(coefficient, 'plain formula', 'R' or 'P')]   before: {'plain formula': moles}
        self.sp = [dict(coef=c, f=f, pf=pretty(f), role=r) for c, f, r in eq]
        mass_change = 0.0
        for s in self.sp:
            if s["role"] == "R":
                s["before"] = before[s["f"]]
                s["rxn"] = s["before"] / s["coef"]
            else:
                s["before"], s["rxn"] = 0.0, None
        reacts = [s for s in self.sp if s["role"] == "R"]
        rs = sorted(s["rxn"] for s in reacts)
        assert len(rs) < 2 or rs[1] - rs[0] > 1e-9 * rs[0], "tie: no single limiting reactant"
        self.lim = min(reacts, key=lambda s: s["rxn"])
        self.x = self.lim["rxn"]
        for s in self.sp:
            s["change"] = (-1 if s["role"] == "R" else 1) * s["coef"] * self.x
            s["after"] = s["before"] + s["change"]
            mass_change += s["change"] * mm_exact(s["f"])
            assert s["after"] > -1e-9
        assert abs(self.lim["after"]) < 1e-9
        assert abs(mass_change) < 1e-6, "equation is not balanced (mass is not conserved): " + str(mass_change)

    def get(self, f):
        return next(s for s in self.sp if s["f"] == f)

    def excess(self):
        return [s for s in self.sp if s["role"] == "R" and s is not self.lim]


def fm(v):
    return "0" if abs(v) < 1e-9 else sf(v, 3)


def grams(v, f):
    return v * mm_exact(f)


# ============================================================================ the computed data
# ---- 6.1 mole ratios
r61_water = 10 * 2 / 2                          # 2H2 + O2 -> 2H2O, mol H2O from 10 mol H2
r61_nh3 = 3.00 * 2 / 3                          # N2 + 3H2 -> 2NH3, mol NH3 from 3.00 mol H2
r61_h2 = 0.600 * 3 / 2                          # mol H2 to make 0.600 mol NH3
r61_n2 = 37 * 1 / 1                             # N2H4 + 2H2O2 -> N2 + 4H2O, mol N2 from 37 mol N2H4
r61_h2o2 = 23 * 2 / 4                           # mol H2O2 for 23 mol H2O (2 sig figs -> 12)
assert all(abs(a - b) < 1e-9 for a, b in zip((r61_water, r61_nh3, r61_h2, r61_n2, r61_h2o2), (10, 2.0, 0.9, 37, 11.5)))

# ---- 6.2 grams and liters
w62_mol_s8 = 2.4 / mm_exact("S8")
w62_fes = w62_mol_s8 * 8                        # 8Fe + S8 -> 8FeS
a62 = [
    39.64 / mm_exact("C") * 4 / 3 * MASS["Fe"],                  # 2Fe2O3 + 3C -> 4Fe + 3CO2 : g Fe from g C
    5.7 / mm_exact("CO") * 2 * mm_exact("H2"),                   # CO + 2H2 -> CH3OH : g H2 from g CO
    30.2 / VM * mm_exact("H2O"),                                 # 2H2 + O2 -> 2H2O : g H2O from L H2 (2:2)
    15.0 / VM * 2 * mm_exact("NaCl"),                            # 2Na + Cl2 -> 2NaCl : g NaCl from L Cl2
]

# ---- 6.3 BCA ladder
EQ_NH3 = [(1, "N2", "R"), (3, "H2", "R"), (2, "NH3", "P")]
L1 = Rxn(EQ_NH3, {"N2": 2.00, "H2": 4.50})                       # worked, in moles
assert L1.lim["f"] == "H2" and abs(L1.x - 1.5) < 1e-12 and abs(L1.get("NH3")["after"] - 3.0) < 1e-12
L2 = Rxn([(1, "CH4", "R"), (2, "Cl2", "R"), (1, "CH2Cl2", "P"), (2, "HCl", "P")], {"CH4": 1.5, "Cl2": 2.5})  # guided
assert L2.lim["f"] == "Cl2"
L3 = Rxn(EQ_NH3, {"N2": 15.0 / mm_exact("N2"), "H2": 4.50 / mm_exact("H2")})                               # grams
assert L3.lim["f"] == "N2"
L4 = Rxn([(2, "Na", "R"), (1, "Cl2", "R"), (2, "NaCl", "P")], {"Na": 7.50 / mm_exact("Na"), "Cl2": 18.5 / VM})
assert L4.lim["f"] == "Na"
L5 = Rxn([(4, "NH3", "R"), (5, "O2", "R"), (4, "NO", "P"), (6, "H2O", "P")], {"NH3": 17.5 / VM, "O2": 12.5 / VM})
assert L5.lim["f"] == "O2"

# ---- 6.4 percent yield
W4 = Rxn([(2, "Al", "R"), (3, "CuCl2", "R"), (2, "AlCl3", "P"), (3, "Cu", "P")],
         {"Al": 1.00 / mm_exact("Al"), "CuCl2": 5.00 / mm_exact("CuCl2")})
assert W4.lim["f"] == "CuCl2"
W4_theo = grams(W4.get("Cu")["after"], "Cu")
W4_act = 2.05
W4_pct = 100 * W4_act / W4_theo
P41 = Rxn([(1, "CH4", "R"), (2, "O2", "R"), (1, "CO2", "P"), (2, "H2O", "P")], {"CH4": 100.0, "O2": 10.0 / mm_exact("O2")})
assert P41.lim["f"] == "O2"                                         # CH4 is "in excess": 100 mol stands in for plenty
P41_theo = grams(P41.get("CO2")["after"], "CO2")
P41_pct = 100 * 6.50 / P41_theo
P42 = Rxn([(1, "CaCl2", "R"), (2, "AgNO3", "R"), (1, "Ca(NO3)2", "P"), (2, "AgCl", "P")],
          {"CaCl2": 15.0 / mm_exact("CaCl2"), "AgNO3": 10.0 / mm_exact("AgNO3")})
assert P42.lim["f"] == "AgNO3"
P42_theo = grams(P42.get("AgCl")["after"], "AgCl")
P42_pct = 100 * 4.50 / P42_theo
HW_BAD = 11.3 / grams(Rxn([(1, "AlCl3", "R"), (3, "NaOH", "R"), (1, "Al(OH)3", "P"), (3, "NaCl", "P")],
                          {"AlCl3": 15.0 / mm_exact("AlCl3"), "NaOH": 20.0 / mm_exact("NaOH")}).get("Al(OH)3")["after"],
                      "Al(OH)3") * 100
assert HW_BAD > 100                                                 # the homework's AlCl3 item cannot be right

# ---- warm-ups
mc_q6 = (2.43 / mm_exact("Mg") * 2 * mm_exact("HCl"))               # g HCl to react with 2.43 g Mg
mc_q8 = 33.6 / VM * 2 / 3 * mm_exact("NaN3")
mc_q15 = Rxn([(2, "H2", "R"), (1, "O2", "R"), (2, "H2O", "P")], {"H2": 6.00 / mm_exact("H2"), "O2": 32.0 / mm_exact("O2")})
assert mc_q15.lim["f"] == "O2"

# ---- FRQ 1: lead(II) iodide precipitation
F1 = Rxn([(1, "Pb(NO3)2", "R"), (2, "KI", "R"), (1, "PbI2", "P"), (2, "KNO3", "P")],
         {"Pb(NO3)2": 2.00 / mm_exact("Pb(NO3)2"), "KI": 3.00 / mm_exact("KI")})
assert F1.lim["f"] == "Pb(NO3)2"
F1_theo = grams(F1.get("PbI2")["after"], "PbI2")
F1_paper, F1_both = 0.92, 3.20
F1_act = F1_both - F1_paper
F1_pct = 100 * F1_act / F1_theo
F1_ex_g = grams(F1.get("KI")["after"], "KI")

# ---- FRQ 2: decomposition of baking soda  2NaHCO3 -> Na2CO3 + H2O + CO2
F2_cru, F2_with, F2_after = 24.30, 28.50, 26.88
F2_m = round(F2_with - F2_cru, 2)                                    # 4.20 g NaHCO3
F2_act = round(F2_after - F2_cru, 2)                                 # 2.58 g Na2CO3
F2_theo = F2_m / mm_exact("NaHCO3") / 2 * mm_exact("Na2CO3")
F2_pct = 100 * F2_act / F2_theo
F2_lost = round(F2_with - F2_after, 2)
assert abs(mm_exact("NaHCO3") * 2 - (mm_exact("Na2CO3") + mm_exact("H2O") + mm_exact("CO2"))) < 1e-6   # balanced

# ---- FRQ 3: zinc and copper(II) sulfate
F3 = Rxn([(1, "Zn", "R"), (1, "CuSO4", "R"), (1, "ZnSO4", "P"), (1, "Cu", "P")],
         {"Zn": 1.50 / mm_exact("Zn"), "CuSO4": 3.00 / mm_exact("CuSO4")})
assert F3.lim["f"] == "CuSO4"
F3_theo = grams(F3.get("Cu")["after"], "Cu")
F3_act = 1.05
F3_pct = 100 * F3_act / F3_theo
F3_zn_left = grams(F3.get("Zn")["after"], "Zn")
assert 0 < F1_pct < 100 and 0 < F2_pct < 100 and 0 < F3_pct < 100 and 0 < P41_pct < 100 and 0 < P42_pct < 100


# ============================================================================ document helpers
class StoichPacket(Packet):
    def save(self, path, title):
        sec = self.doc.sections[0]
        for r in sec.footer.paragraphs[0].runs:
            if "Unit 4" in r.text:
                r.text = "  Unit 6: "
            elif r.text.startswith("Reactions"):
                r.text = "Stoichiometry  •"
        if self.T:
            for r in sec.footer.paragraphs[0].runs:
                if r.text.strip() == "page":
                    r.text = "  TEACHER EDITION  •  page "
        self.doc.core_properties.title = title
        self.doc.save(path)

    def mcq(self, n, stem, opts, right, why=""):
        """Options go on one line if they are short, two per line if medium, one per line if long."""
        assert len(set(opts)) == 4, (n, opts)
        longest = max(len(o) for o in opts)
        lines = ["ABCD"[i] + ")  " + o for i, o in enumerate(opts)]
        if longest <= 14:
            groups = ["        ".join(lines)]
        elif longest <= 34:
            groups = ["        ".join(lines[:2]), "        ".join(lines[2:])]
        else:
            groups = lines
        FLOW.add(0.3 + 0.2 * len(groups) + 0.2 * (stem.count("\n") + len(stem) // 95) + (0.22 if self.T else 0))
        self.emit(('<w:p><w:pPr><w:keepNext/><w:spacing w:before="70" w:after="30" w:line="259" w:lineRule="auto"/>'
                   '<w:ind w:left="461" w:hanging="461"/></w:pPr>%s%s</w:p>') % (
            runs("%d.  " % n, 21, DARK, b=True), runs(stem, 21, INK)))
        for k, g in enumerate(groups):
            self.emit(para(g, sz=20, left=461, after=20, keep=(self.T or k < len(groups) - 1)))
        if self.T:
            self.emit(self.ans_para("Answer: %s%s" % ("ABCD"[right], (" — " + why) if why else ""), 19))


FLOW = lib.FLOW
PB = ('<w:p><w:pPr><w:pageBreakBefore/><w:spacing w:before="0" w:after="0" w:line="20" '
      'w:lineRule="exact"/></w:pPr></w:p>')
SPEC = {"B": "B   Before (mol)", "R": "mol rxn\n(mol ÷ coefficient)", "C": "C   Change (mol)", "A": "A   After (mol)"}


def worked(P, text, h=0.6):
    P.emit(tbl([10080], [tr([tc(10080, para("WORKED EXAMPLE", sz=17, b=True, color=DARK, after=40) +
                                para(text, sz=21, after=60), fill="F4F4F4", borders=left_bar(DARK),
                                mar=(50, 170, 50, 140))])]))
    FLOW.add(h)
    P.emit(spacer())


def prob_table(P, title, items, heights):
    rows = [[n, [t] + [Ans(a) for a in ans]] for n, t, ans in items]
    P.table([504, 9576], ["", title], rows, heights, first_bold=True)


def bca(P, rx, show, h=0.38, rows="BRCA"):
    """Draw a BCA table. show = {'B': [column numbers printed for students], ...}.  Everything else is blank in the
    student copy and gray (the answer) in the teacher edition.  Product cells of the mol rxn row are always '—'."""
    n = len(rx.sp)
    lw = 1750
    cw = (10080 - lw) // n
    grid = [lw] + [cw] * n
    grid[-1] += 10080 - sum(grid)
    hdr = [tc(lw, para("", sz=18, after=0, keep=True), fill="D9D9D9")]
    for i, s in enumerate(rx.sp):
        lead = "" if i == 0 else ("→  " if s["role"] == "P" and rx.sp[i - 1]["role"] == "R" else "+  ")
        hdr.append(tc(grid[i + 1], para(lead + s["pf"], sz=22, b=True, color="000000", after=0, jc="center", keep=True) +
                      para("coefficient %d" % s["coef"], sz=16, color="505050", after=0, jc="center", keep=True), fill="D9D9D9"))
    out = [tr(hdr, header=True)]
    for r in rows:
        cells = [tc(lw, para(SPEC[r], sz=18, b=True, color="000000", after=0, keep=True), fill="EDEDED", valign="center")]
        for i, s in enumerate(rx.sp):
            if r == "B":
                v = fm(s["before"])
            elif r == "R":
                v = fm(s["rxn"]) if s["role"] == "R" else "—"
            elif r == "C":
                v = ("−" if s["role"] == "R" else "+") + fm(abs(s["change"]))
            else:
                v = fm(s["after"])
            printed = (r == "R" and s["role"] == "P") or (i in show.get(r, []))
            if printed:
                c = tc(grid[i + 1], para(v, sz=22, after=0, jc="center", keep=True), valign="center")
            elif P.T:
                c = tc(grid[i + 1], para(v, sz=22, after=0, jc="center", keep=True), fill="D9D9D9", valign="center")
            else:
                c = tc(grid[i + 1], para("", sz=22, after=0, keep=True), valign="center")
            cells.append(c)
        out.append(tr(cells, h=h))
    FLOW.add(0.34 + h * len(rows) + 0.05)
    P.emit(tbl(grid, out))
    P.emit(spacer())


def blank_bca(P, species, h=0.38):
    """A BCA table with only the species names and coefficients filled in (the student does everything else)."""
    bca(P, species, {}, h)


def data_table(P, header, rows, widths, shaded_rows=()):
    out = [tr([tc(w, para(t, sz=19, b=True, after=0), fill="D9D9D9") for w, t in zip(widths, header)], header=True)]
    for i, r in enumerate(rows):
        cells = []
        for j, (w, t) in enumerate(zip(widths, r)):
            if isinstance(t, Ans):
                cells.append(tc(w, para(str(t), sz=20, after=0) if P.T else "", fill="D9D9D9" if P.T else None))
            else:
                cells.append(tc(w, para(t, sz=20, after=0)))
        out.append(tr(cells, h=0.32))
    FLOW.add(0.3 + 0.32 * len(rows) + 0.05)
    P.emit(tbl(widths, out))
    P.emit(spacer())


def banner(P, kind, title, sub):
    b = ('<w:top w:val="single" w:sz="24" w:space="0" w:color="000000"/><w:left w:val="nil"/>'
         '<w:bottom w:val="single" w:sz="24" w:space="0" w:color="000000"/><w:right w:val="nil"/>')
    FLOW.add(1.0)
    P.emit(tbl([10080], [tr([tc(10080, para(kind, sz=17, b=True, color=DARK, after=0) +
                                para(title, sz=34, b=True, color="000000", after=0) +
                                para(sub, sz=21, after=0), fill="EDEDED", borders=b, mar=(100, 200, 100, 200))])]))
    P.emit(spacer())


def mol(v):
    return sf(v, 3)


# ============================================================================ the packet
def build(T):
    FLOW.__init__()
    P = StoichPacket(T)
    A = Ans
    P.title("6", "Stoichiometry",
            "Use balanced equations and BCA tables to predict how much product forms and what is left over.")
    if not T:
        P.box("HOW TO USE THIS PACKET", [
            "Write in pencil. Show the **given with its unit, every conversion factor as a fraction, and the answer with "
            "units and the right number of significant figures.** Use molar masses to 0.01 g/mol and 22.4 L/mol for a "
            "gas at STP. The BCA tables get less and less help as you go: by the end of 6.3 you build one on your own. "
            "The warm-up questions and the lab free-response problems are at the back."])
    else:
        P.box("TEACHER EDITION", [
            "Everything in a light-gray box, cell or line is an answer. TEACHER NOTE boxes hold misconceptions and "
            "corrections. Pages follow the student packet closely, but the answer boxes are larger, so the page count "
            "of this edition is higher."], kind="teacher")
        P.box("TEACHER OVERVIEW", [
            "**The method.** Convert every starting amount to moles (Before). Divide each reactant’s moles by its "
            "coefficient to get its **mol rxn** (the number of times the recipe could be run). The smaller mol rxn is "
            "the limiting reactant; call that value x. The Change row is the coefficient times x (minus for reactants, "
            "plus for products). The After row is Before + Change: the limiting reactant ends at 0, the other reactant "
            "is the excess left over, and the products are the amounts made. This is the same “reaction coordinate” "
            "idea as an ICE table, with x counted in recipe-units instead of moles.",
            "**Answers are computed.** Every number was calculated by code from the problem data (atomic masses to 0.01 "
            "g/mol, 22.4 L/mol at STP). Values carry unrounded through each calculation and only the final answer is "
            "rounded. The code also checks that every equation is balanced by confirming that mass is conserved, and "
            "that no two reactants tie. Tables show 3 sig figs; if you use other atomic masses the last digit can move.",
            "**Homework alignment** (Unit 5 Stoichiometry Topic HW, whose topics are labeled 6.1–6.3 and 5.4–5.5): "
            "6.1 uses HW 6.1 #1–5; 6.2 uses #1b, 3, 4 from HW 6.2 and 6.3 #1b, 4; 6.3 uses HW 5.4 #1–4 as the "
            "scaffolded ladder; 6.4 uses HW 5.5 #1–2 plus a new worked example. The three free-response lab "
            "problems and the 20 warm-ups are new.",
            "**Homework corrections.** (1) HW 6.1 #5 calls hydrazine “N₂H₂”; it is N₂H₄, so the packet uses "
            "N₂H₄ + 2H₂O₂ → N₂ + 4H₂O. (2) HW 6.3 #3 calls NaN₃ “sodium nitride”; it is sodium azide. (3) HW 6.3 #4 says "
            "“chloride gas”; it is chlorine gas. (4) HW 5.5 #3 is not usable as written: 15.0 g AlCl₃ + 20.0 g NaOH can "
            "make at most %s g Al(OH)₃, so 11.3 g would be a %s%% yield. Either change the actual yield (for example "
            "to 6.90 g, 78.6%%) or use it as a discussion question on impossible results." % (
                sf(grams(Rxn([(1, "AlCl3", "R"), (3, "NaOH", "R"), (1, "Al(OH)3", "P"), (3, "NaCl", "P")],
                            {"AlCl3": 15.0 / mm_exact("AlCl3"), "NaOH": 20.0 / mm_exact("NaOH")}).get("Al(OH)3")["after"],
                           "Al(OH)3"), 3), sf(HW_BAD, 3)),
            "**Misconceptions to watch:** limiting means the smaller mass or the smaller starting moles (it is the "
            "smaller mol rxn); skipping the division by the coefficient; putting grams in the Before row; subtracting the "
            "wrong reactant’s change; using 22.4 L/mol for a liquid or solid or away from STP; calling a percent yield "
            "above 100% “great” instead of asking what went wrong.",
            "**Pacing idea:** 6.1–6.2 on day 1; 6.3 levels 1–3 on day 2 and levels 4–5 on day 3; 6.4 on day 4; warm-ups "
            "as starters and the lab problems as the assessment practice."], kind="teacher")

    P.sub("What we will learn")
    P.table([1000, 9080], ["", "Topic"], [
        ["6.1", "Mole ratios and mole-to-mole conversions"],
        ["6.2", "Mass-to-mass and gas-volume stoichiometry (the mole map)"],
        ["6.3", "BCA tables and limiting reactants (using mol rxn)"],
        ["6.4", "Theoretical yield and percent yield"],
        ["—", "20 multiple-choice warm-ups and lab-based free-response practice"]], 0.28)
    P.sub("By the end of this unit I can…")
    for t in [
        "Write a mole ratio from a balanced equation and use it to convert between moles of two substances.",
        "Solve mass-to-mass and liters-of-gas problems by going grams → moles → mole ratio → moles → grams or liters.",
        "Build a BCA table, find the limiting reactant with mol rxn, and read off product made and excess left.",
        "Calculate theoretical yield and percent yield from lab data, and explain a low or impossible result."]:
        FLOW.add(0.2)
        P.emit(para("•  " + t, sz=21, after=40, left=360, hanging=300))
    P.emit(spacer())

    # ================================================================ 6.1
    P.topic("6.1", "Mole Ratios", "Coefficients are the recipe • moles to moles")
    P.box("BIG IDEA", [
        "The **coefficients** in a balanced equation tell you how many moles of each substance react or form. Using them "
        "as a fraction, a **mole ratio**, converts moles of one substance into moles of another."])
    P.table([2400, 4800, 2880], ["Term", "Definition (your words)", "Example"], [
        ["Mole ratio", [Hint("Where does it come from, and how do you write it?"),
                        A("A fraction made from two coefficients of a balanced equation: moles wanted over moles given.")],
         A("N₂ + 3H₂ → 2NH₃:  (2 mol NH₃)/(3 mol H₂)")]], [0.9], term_col=True)
    worked(P, "N₂ + 3H₂ → 2NH₃.  How many moles of NH₃ form from 6.0 mol H₂?   "
              "6.0 mol H₂ × (2 mol NH₃ / 3 mol H₂) = **4.0 mol NH₃**.   The substance you are given goes on the bottom so "
              "that its unit cancels.", 0.85)
    items = [
        ("1.", "For 8H₂ + S₈ → 8H₂S, write the mole ratios: (a) H₂/H₂S   (b) H₂/S₈   (c) H₂S/S₈",
         ["(a) 8/8 = 1/1     (b) 8/1     (c) 8/1"]),
        ("2.", "Hydrogen gas reacts with oxygen gas to make water. (a) Write the balanced equation. (b) Give the mole "
               "ratios H₂/O₂, H₂/H₂O and O₂/H₂O. (c) How many moles of water form from 10 mol of hydrogen?",
         ["(a) 2H₂ + O₂ → 2H₂O    (b) 2/1, 2/2 (= 1/1), 1/2    (c) 10 mol H₂ × (2/2) = **%d mol H₂O**" % r61_water]),
        ("3.", "Use N₂ + 3H₂ → 2NH₃. (a) How many moles of N₂ are needed to make 10 mol NH₃?  (b) How many moles of NH₃ "
               "form from 3.00 mol H₂?  (c) How many moles of H₂ are needed to make 0.600 mol NH₃?",
         ["(a) 10 × (1/2) = **5 mol N₂**    (b) 3.00 × (2/3) = **%s mol NH₃**    (c) 0.600 × (3/2) = **%s mol H₂**" % (
             sf(r61_nh3, 3), sf(r61_h2, 3))]),
        ("4.", "Rocket fuel: N₂H₄ + 2H₂O₂ → N₂ + 4H₂O. (a) How many moles of N₂ form from 37 mol N₂H₄?  (b) How many "
               "moles of H₂O₂ are used when 23 mol H₂O form?",
         ["(a) 37 × (1/1) = **37 mol N₂**    (b) 23 × (2/4) = 11.5 → **12 mol H₂O₂** (2 sig figs)"])]
    prob_table(P, "Mole ratios and mole-to-mole practice", items, [0.55, 0.95, 0.95, 0.8])
    P.box("TEACHER NOTE", ["HW 6.1 #5 writes hydrazine as N₂H₂; the packet uses the real formula N₂H₄ (see the overview). "
                           "Ask students to explain why “2/2” in 2(b) simplifies to 1 but 2(c) cannot."], kind="teacher")

    # ================================================================ 6.2
    P.topic("6.2", "Mass and Gas-Volume Stoichiometry", "Grams → moles → mole ratio → moles → grams or liters")
    P.box("BIG IDEA", [
        "You can never go straight from grams of one substance to grams of another. The **mole ratio** is the only "
        "bridge, so every problem goes through moles."])
    P.box("THE MOLE MAP", [
        "Given (g, L or particles)  →  **÷ molar mass** (or ÷ 22.4 L/mol)  →  moles given  →  **× mole ratio**  →  moles wanted  "
        "→  **× molar mass** (or × 22.4 L/mol)  →  wanted (g or L).",
        "Use 22.4 L/mol only for gases at STP. Solids and liquids always use molar mass."])
    worked(P, "8Fe + S₈ → 8FeS.  How many moles of FeS form from 2.4 g S₈?   "
              "2.4 g S₈ × (1 mol / %s g) × (8 mol FeS / 1 mol S₈) = **%s mol FeS**   (S₈: 8 × 32.06 = %s g/mol)" % (
                  sf(mm_exact("S8"), 5), sf(w62_fes, 2), sf(mm_exact("S8"), 5)), 0.85)
    items = [
        ("1.", "2Fe₂O₃ + 3C → 4Fe + 3CO₂.  How many grams of iron form from 39.64 g of carbon?",
         ["39.64 g C × (1 mol / 12.01 g) × (4 mol Fe / 3 mol C) × (55.85 g / 1 mol) = **%s g Fe**" % sf(a62[0], 4)]),
        ("2.", "CO + 2H₂ → CH₃OH.  How many grams of hydrogen react with 5.7 g of carbon monoxide?",
         ["5.7 g CO × (1 mol / 28.01 g) × (2 mol H₂ / 1 mol CO) × (2.02 g / 1 mol) = **%s g H₂**" % sf(a62[1], 2)]),
        ("3.", "2H₂ + O₂ → 2H₂O.  How many grams of water form from 30.2 L of hydrogen gas at STP?",
         ["30.2 L × (1 mol / 22.4 L) × (2 mol H₂O / 2 mol H₂) × (18.02 g / 1 mol) = **%s g H₂O**" % sf(a62[2], 3)]),
        ("4.", "2Na + Cl₂ → 2NaCl.  How many grams of sodium chloride form from 15.0 L of chlorine gas at STP?",
         ["15.0 L × (1 mol / 22.4 L) × (2 mol NaCl / 1 mol Cl₂) × (58.44 g / 1 mol) = **%s g NaCl**" % sf(a62[3], 3)])]
    prob_table(P, "Mass and volume practice (show the whole chain)", items, [1.0, 0.95, 0.95, 0.95])

    # ================================================================ 6.3
    P.topic("6.3", "BCA Tables and Limiting Reactants", "Before • Change • After, with mol rxn to find what runs out")
    P.box("BIG IDEA", [
        "The reactant that runs out first is the **limiting reactant**: it decides how much product can form. To find it "
        "fairly, compare the **mol rxn** of each reactant: **moles ÷ coefficient**. The smaller mol rxn is limiting. A BCA "
        "table does the bookkeeping, just like an ICE table, with x = the smallest mol rxn."])
    P.table([2400, 4800, 2880], ["Term", "Definition (your words)", "Example"], [
        ["Limiting reactant", [Hint("What does it do to the reaction?"),
                               A("The reactant that is used up first; it limits how much product forms.")],
         A("Smallest mol rxn; After = 0")],
        ["Excess reactant", [Hint("What is left at the end?"),
                             A("The reactant that is not used up; some remains after the reaction.")],
         A("After row > 0")],
        ["mol rxn", [Hint("How do you calculate it, and what does the smaller one tell you?"),
                     A("Moles of a reactant ÷ its coefficient; the smaller value is the limiting reactant.")],
         A("x = smallest mol rxn")]], [0.8, 0.8, 0.8], term_col=True)
    P.box("HOW TO BUILD A BCA TABLE", [
        "1.  Balance the equation. Write each substance across the top with its coefficient.",
        "2.  **Before:** moles of each reactant (grams ÷ molar mass, or liters ÷ 22.4). Products start at 0.",
        "3.  **mol rxn:** moles ÷ coefficient for each reactant. The **smaller** one is limiting; that number is x.",
        "4.  **Change:** reactants lose (coefficient × x), products gain (coefficient × x).",
        "5.  **After:** Before + Change. The limiting reactant is 0. Convert to grams or liters only at the end."])

    P.sub("Level 1 — Watch it done")
    worked(P, "N₂ + 3H₂ → 2NH₃ with 2.00 mol N₂ and 4.50 mol H₂.   "
              "mol rxn: N₂ = 2.00 ÷ 1 = 2.00;  H₂ = 4.50 ÷ 3 = 1.50.  H₂ is smaller, so **H₂ is limiting** and x = 1.50.   "
              "Change: N₂ −1(1.50), H₂ −3(1.50), NH₃ +2(1.50).", 0.95)
    bca(P, L1, {"B": [0, 1, 2], "R": [0, 1], "C": [0, 1, 2], "A": [0, 1, 2]}, 0.34)
    P.note("Result: **%s mol NH₃** form and **%s mol N₂** are left over. (The H₂ is gone.)" % (
        mol(L1.get("NH3")["after"]), mol(L1.get("N2")["after"])), 21)

    P.sub("Level 2 — Finish the table (the Before and mol rxn rows are done)")
    P.note("**1.**  1.5 mol CH₄ react with 2.5 mol Cl₂.   CH₄ + 2Cl₂ → CH₂Cl₂ + 2HCl", 21)
    bca(P, L2, {"B": [0, 1, 2, 3], "R": [0, 1]}, 0.34)
    P.ansbox(0.75, "Limiting reactant, moles of each product, moles of excess left:", [
        "Cl₂ is limiting (mol rxn %s < %s), x = %s.   CH₂Cl₂: **%s mol**,  HCl: **%s mol**,  excess CH₄ left: **%s mol**" % (
            mol(L2.get("Cl2")["rxn"]), mol(L2.get("CH4")["rxn"]), mol(L2.x), mol(L2.get("CH2Cl2")["after"]),
            mol(L2.get("HCl")["after"]), mol(L2.get("CH4")["after"]))])

    P.sub("Level 3 — Start from grams (you fill in every row; the setup is given)")
    P.note("**2.**  15.0 g N₂ react with 4.50 g H₂:   N₂ + 3H₂ → 2NH₃.   Find the mass of NH₃ made and the mass of the "
           "excess reactant left.", 21)
    P.ansbox(0.5, "Before row (convert grams to moles first):", [
        "15.0 g N₂ ÷ 28.02 = %s mol N₂     4.50 g H₂ ÷ 2.02 = %s mol H₂" % (
            mol(L3.get("N2")["before"]), mol(L3.get("H2")["before"]))])
    bca(P, L3, {"B": [2]}, 0.34)
    n3 = L3.get("NH3")["after"]
    P.ansbox(0.7, "Mass of NH₃ made and mass of excess reactant left:", [
        "N₂ is limiting. NH₃: %s mol × 17.04 g/mol = **%s g**.   H₂ left: %s mol × 2.02 g/mol = **%s g**" % (
            mol(n3), sf(grams(n3, "NH3"), 3), mol(L3.get("H2")["after"]), sf(grams(L3.get("H2")["after"], "H2"), 3))])

    P.sub("Level 4 — Labels only (a table with the species and coefficients, nothing else)")
    P.note("**3.**  7.50 g of solid sodium react with 18.5 L of chlorine gas at STP:   2Na + Cl₂ → 2NaCl.   Find the "
           "mass of NaCl made and the mass of the excess reactant left.", 21)
    bca(P, L4, {}, 0.36)
    P.ansbox(0.9, "Convert to moles, then write your conclusions:", [
        "7.50 g Na ÷ 22.99 = %s mol Na;   18.5 L ÷ 22.4 = %s mol Cl₂.   mol rxn: Na %s, Cl₂ %s → **Na is limiting**." % (
            mol(L4.get("Na")["before"]), mol(L4.get("Cl2")["before"]), mol(L4.get("Na")["rxn"]), mol(L4.get("Cl2")["rxn"])),
        "NaCl: %s mol × 58.44 = **%s g**.   Cl₂ left: %s mol × 70.90 = **%s g**" % (
            mol(L4.get("NaCl")["after"]), sf(grams(L4.get("NaCl")["after"], "NaCl"), 3), mol(L4.get("Cl2")["after"]),
            sf(grams(L4.get("Cl2")["after"], "Cl2"), 3))])

    P.sub("Level 5 — You build the table")
    P.note("**4.**  17.5 L of NH₃ gas react with 12.5 L of O₂ gas at STP:   ___NH₃ + ___O₂ → ___NO + ___H₂O.   "
           "(a) Balance the equation. (b) Draw and complete a BCA table (label the four rows, include a mol rxn row). "
           "(c) Find the mass of each product made and the liters of excess reactant left.", 21)
    P.ansbox(2.6, "Your BCA table:", [
        "4NH₃ + 5O₂ → 4NO + 6H₂O.   Before: NH₃ %s, O₂ %s.   mol rxn: NH₃ %s, O₂ %s → **O₂ is limiting**, x = %s." % (
            mol(L5.get("NH3")["before"]), mol(L5.get("O2")["before"]), mol(L5.get("NH3")["rxn"]), mol(L5.get("O2")["rxn"]),
            mol(L5.x)),
        "Change: NH₃ −%s, O₂ −%s, NO +%s, H₂O +%s.   After: NH₃ %s, O₂ 0, NO %s, H₂O %s (mol)." % (
            mol(abs(L5.get("NH3")["change"])), mol(abs(L5.get("O2")["change"])), mol(L5.get("NO")["change"]),
            mol(L5.get("H2O")["change"]), mol(L5.get("NH3")["after"]), mol(L5.get("NO")["after"]),
            mol(L5.get("H2O")["after"])),
        "NO: %s g.   H₂O: %s g.   Excess NH₃ left: %s mol × 22.4 = **%s L**." % (
            sf(grams(L5.get("NO")["after"], "NO"), 3), sf(grams(L5.get("H2O")["after"], "H2O"), 3),
            mol(L5.get("NH3")["after"]), sf(L5.get("NH3")["after"] * VM, 3))])
    P.box("TEACHER NOTE", [
        "Level 4 is the hinge: students must convert both amounts to moles unaided, so watch for grams in the Before row. "
        "In Level 5 the liters are already in a 4 : 5 ratio at STP, so a quick check is that NH₃ (17.5 L ÷ 4 = 4.38) and "
        "O₂ (12.5 L ÷ 5 = 2.50) can be compared in liters; the mol rxn comparison gives the same answer. "
        "Consider letting students check each other’s tables before you reveal the key."], kind="teacher")

    # ================================================================ 6.4
    P.topic("6.4", "Theoretical Yield and Percent Yield", "How much should form, how much actually did")
    P.box("BIG IDEA", [
        "The **theoretical yield** is the most product the limiting reactant can make (the After row of the BCA table, "
        "converted to grams). The **actual yield** is what you really collect in the lab. "
        "**Percent yield = (actual yield ÷ theoretical yield) × 100.** It is almost always below 100%."])
    P.table([2400, 4800, 2880], ["Term", "Definition (your words)", "Example"], [
        ["Theoretical yield", [Hint("Where does it come from?"),
                               A("The maximum mass of product predicted from the limiting reactant.")],
         A("After row, in grams")],
        ["Actual yield", [Hint("Where does it come from?"),
                          A("The mass of product you actually measure in the lab.")],
         A("from the balance")]], [0.65, 0.65], term_col=True)
    worked(P, "LAB: 1.00 g Al reacts with 5.00 g CuCl₂ in water: 2Al + 3CuCl₂ → 2AlCl₃ + 3Cu. The copper is filtered, dried "
              "and weighed: **2.05 g**. Find the percent yield.", 0.8)
    bca(P, W4, {"B": [0, 1, 2, 3], "R": [0, 1], "C": [0, 1, 2, 3], "A": [0, 1, 2, 3]}, 0.32)
    P.note("CuCl₂ is limiting (mol rxn %s < %s). Theoretical yield of Cu = %s mol × 63.55 g/mol = **%s g**.   "
           "Percent yield = 2.05 ÷ %s × 100 = **%s%%**." % (
               mol(W4.get("CuCl2")["rxn"]), mol(W4.get("Al")["rxn"]), mol(W4.get("Cu")["after"]), sf(W4_theo, 3),
               sf(W4_theo, 3), sf(W4_pct, 3)), 21)
    items = [
        ("1.", "CH₄ + 2O₂ → CO₂ + 2H₂O.  A student burns excess CH₄ with 10.0 g of O₂ and collects 6.50 g of CO₂. "
               "(a) Calculate the theoretical yield of CO₂. (b) Calculate the percent yield.",
         ["(a) 10.0 g O₂ ÷ 32.00 = %s mol O₂ → × (1/2) = %s mol CO₂ × 44.01 = **%s g CO₂**" % (
             mol(P41.get("O2")["before"]), mol(P41.get("CO2")["after"]), sf(P41_theo, 3)),
          "(b) 6.50 ÷ %s × 100 = **%s%%**" % (sf(P41_theo, 3), sf(P41_pct, 3))]),
        ("2.", "CaCl₂ + 2AgNO₃ → Ca(NO₃)₂ + 2AgCl.  15.0 g CaCl₂ and 10.0 g AgNO₃ react in water and 4.50 g of AgCl "
               "(solid) are collected. Build a BCA table, find the theoretical yield of AgCl and the percent yield.",
         ["Before: CaCl₂ %s mol, AgNO₃ %s mol.  mol rxn: CaCl₂ %s, AgNO₃ %s → **AgNO₃ limiting**, x = %s." % (
             mol(P42.get("CaCl2")["before"]), mol(P42.get("AgNO3")["before"]), mol(P42.get("CaCl2")["rxn"]),
             mol(P42.get("AgNO3")["rxn"]), mol(P42.x)),
          "AgCl: %s mol × 143.32 = **%s g** (theoretical).   Percent yield = 4.50 ÷ %s × 100 = **%s%%**" % (
              mol(P42.get("AgCl")["after"]), sf(P42_theo, 3), sf(P42_theo, 3), sf(P42_pct, 3))])]
    prob_table(P, "Percent yield practice", items, [1.1, 2.0])
    P.box("TEACHER NOTE", [
        "HW 5.5 #3 (AlCl₃ and NaOH, 11.3 g actual) gives a percent yield above 100% as written; see the overview for "
        "a fix. In #1 the homework says “excess CH₄” without an amount; the key assumes O₂ is the only limit."],
        kind="teacher")

    # ================================================================ warm-ups
    P.emit(PB)
    FLOW.hard_break()
    FLOW.mark("Warm-ups")
    banner(P, "WARM-UPS", "20 Multiple-Choice Warm-Ups", "Circle one answer. Use scratch paper for the math; use 22.4 L/mol for gases at STP.")
    rnd = random.Random(61)
    sched = list("ABCD" * 5)
    while True:
        rnd.shuffle(sched)
        if all(not (sched[i] == sched[i + 1] == sched[i + 2]) for i in range(18)):
            break
    qs = []

    def add(stem, correct, wrong, why=""):
        qs.append((stem, correct, wrong, why))

    add("For N₂ + 3H₂ → 2NH₃, the mole ratio of H₂ to NH₃ is…",
        "3 mol H₂ : 2 mol NH₃", ["1 mol H₂ : 2 mol NH₃", "2 mol H₂ : 3 mol NH₃", "3 mol H₂ : 1 mol NH₃"],
        "The coefficients are 3 and 2.")
    add("For 2H₂ + O₂ → 2H₂O, how many moles of H₂O form from 3.0 mol O₂?",
        "%s mol" % sf(3.0 * 2, 2), ["3.0 mol", "1.5 mol", "12 mol"], "3.0 mol O₂ × (2 H₂O / 1 O₂) = 6.0 mol.")
    add("For C₃H₈ + 5O₂ → 3CO₂ + 4H₂O, how many moles of CO₂ form from 2.0 mol C₃H₈?",
        "%s mol" % sf(2.0 * 3, 2), ["2.0 mol", "10 mol", "8.0 mol"], "2.0 × (3/1) = 6.0 mol.")
    add("Why must an equation be balanced before you write a mole ratio?",
        "The coefficients of the balanced equation give the mole ratios",
        ["Mole ratios come from the subscripts in each formula", "A balanced equation has a coefficient of 1 for every substance",
         "Only the products have to be balanced"], "Unbalanced coefficients give the wrong ratio.")
    q5 = 4.04 / mm_exact("H2") * mm_exact("H2O")
    add("For 2H₂ + O₂ → 2H₂O, how many grams of water form from 4.04 g of H₂?",
        "%s g" % sf(q5, 3), ["%s g" % sf(4.04 / mm_exact("H2") / 2 * mm_exact("H2O"), 3), "%s g" % sf(2 * q5, 3), "4.04 g"],
        "4.04 g ÷ 2.02 = 2.00 mol H₂ → 2.00 mol H₂O × 18.02 = 36.0 g.")
    add("For Mg + 2HCl → MgCl₂ + H₂, how many grams of HCl react with 2.43 g of Mg?",
        "%s g" % sf(mc_q6, 3), ["%s g" % sf(mc_q6 / 2, 3), "%s g" % sf(mc_q6 * 2, 3), "0.200 g"],
        "2.43 ÷ 24.31 = 0.100 mol Mg → 0.200 mol HCl × 36.46 = 7.29 g.")
    q7 = 0.500 * 3 / 2 * VM
    add("For 2KClO₃ → 2KCl + 3O₂, how many liters of O₂ at STP form from 0.500 mol KClO₃?",
        "%s L" % sf(q7, 3), ["%s L" % sf(0.500 * VM, 3), "%s L" % sf(0.500 * 2 / 3 * VM, 3), "%s L" % sf(0.500 * 3 * VM, 3)],
        "0.500 × (3/2) = 0.750 mol × 22.4 L/mol = 16.8 L.")
    add("For 2NaN₃ → 2Na + 3N₂, how many grams of NaN₃ are needed to make 33.6 L of N₂ at STP?",
        "%s g" % sf(mc_q8, 3), ["%s g" % sf(33.6 / VM * mm_exact("NaN3"), 3), "%s g" % sf(33.6 / VM * 3 / 2 * mm_exact("NaN3"), 3),
                                "%s g" % sf(mc_q8 / 2, 3)],
        "33.6 ÷ 22.4 = 1.50 mol N₂ → × (2/3) = 1.00 mol NaN₃ × 65.02 = 65.0 g.")
    add("The limiting reactant in a reaction is the one that…",
        "is used up first and limits the amount of product",
        ["has the smallest mass at the start", "has the smallest coefficient", "is present in the greatest amount"],
        "It runs out first.")
    add("In a BCA table, the “mol rxn” of a reactant is found by…",
        "dividing its moles by its coefficient",
        ["multiplying its moles by its coefficient", "dividing its mass by its molar mass", "subtracting one reactant’s moles from the other’s"],
        "mol rxn = moles ÷ coefficient; the smaller value is limiting.")
    add("In the After row of a BCA table, the limiting reactant always has…",
        "0 mol", ["the smallest starting mass", "the largest mol rxn", "the same moles as the product"],
        "It is completely used up.")
    add("For 2H₂ + O₂ → 2H₂O, 4.0 mol H₂ and 3.0 mol O₂ are mixed. Which statement is correct?",
        "H₂ is limiting (mol rxn 2.0 < 3.0)",
        ["O₂ is limiting (mol rxn 3.0 < 4.0)", "H₂ is limiting because 4.0 > 3.0", "Neither is limiting"],
        "H₂: 4.0 ÷ 2 = 2.0.  O₂: 3.0 ÷ 1 = 3.0.")
    add("N₂ + 3H₂ → 2NH₃. How many moles of NH₃ form from 2.0 mol N₂ and 3.0 mol H₂?",
        "2.0 mol", ["4.0 mol", "3.0 mol", "1.0 mol"], "mol rxn: N₂ 2.0, H₂ 1.0 → H₂ limiting, x = 1.0 → NH₃ = 2(1.0) = 2.0.")
    add("In the mixture from the question above, how many moles of which reactant are left over?",
        "1.0 mol N₂", ["1.0 mol H₂", "2.0 mol N₂", "0 mol of both"], "N₂ left = 2.0 − 1(1.0) = 1.0 mol.")
    q15 = grams(mc_q15.get("H2O")["after"], "H2O")
    q15_wrong = mc_q15.get("H2")["before"] * mm_exact("H2O")
    add("2H₂ + O₂ → 2H₂O. 6.00 g H₂ and 32.0 g O₂ react. What mass of water forms?",
        "%s g" % sf(q15, 3), ["%s g" % sf(q15_wrong, 3), "%s g" % sf(mm_exact("H2O"), 3), "%s g" % sf(6.00 * mm_exact("H2O"), 3)],
        "O₂ is limiting (1.00 mol vs 1.485 mol rxn for H₂): 2.00 mol H₂O × 18.02 = 36.0 g.")
    q16 = grams(mc_q15.get("H2")["after"], "H2")
    add("In the reaction above, what mass of the excess reactant is left?",
        "%s g" % sf(q16, 3), ["%s g" % sf(grams(2.0, "H2"), 3), "%s g" % sf(mc_q15.get("H2")["after"], 3), "%s g" % sf(6.00 - 2.02, 3)],
        "H₂ left = 2.97 − 2.00 = 0.970 mol × 2.02 = 1.96 g.")
    add("A student says the reactant with less mass is always the limiting reactant. The best response is…",
        "Incorrect: compare moles ÷ coefficient, not grams",
        ["Correct: less mass runs out first", "Incorrect: the one with the larger coefficient is limiting",
         "Correct, but only for gases"], "Grams must be converted to moles and divided by coefficients.")
    add("The percent yield of a reaction is calculated as…",
        "(actual yield ÷ theoretical yield) × 100", ["(theoretical yield ÷ actual yield) × 100",
                                                      "(actual yield − theoretical yield) × 100", "actual yield × theoretical yield"],
        "Actual over theoretical.")
    add("A reaction should make 5.60 g of product but only 4.20 g is collected. What is the percent yield?",
        "%s%%" % sf(100 * 4.20 / 5.60, 3), ["%s%%" % sf(100 * 5.60 / 4.20, 3), "%s%%" % sf(100 - 100 * 4.20 / 5.60, 3), "0.750%"],
        "4.20 ÷ 5.60 × 100 = 75.0%.")
    q20 = 8.45 * 0.820
    add("The theoretical yield is 8.45 g and the percent yield is 82.0%. What is the actual yield?",
        "%s g" % sf(q20, 3), ["%s g" % sf(8.45 / 0.820, 3), "8.45 g", "%s g" % sf(8.45 * 0.18, 3)],
        "8.45 × 0.820 = 6.93 g.")
    assert len(qs) == 20 and len(sched) == 20
    for k, (stem, correct, wrong, why) in enumerate(qs):
        pos = "ABCD".index(sched[k])
        opts = list(wrong)
        opts.insert(pos, correct)
        P.mcq(k + 1, stem, opts, pos, why)

    # ================================================================ free response
    P.emit(PB)
    FLOW.hard_break()
    FLOW.mark("Free response")
    banner(P, "PRACTICE", "Free-Response Practice: Percent Yield in the Lab",
           "Show all work with units. Use atomic masses to 0.01 g/mol. Draw your own BCA table whenever there are two reactants.")

    # ---- FRQ 1
    P.sub("1.  Lead(II) iodide precipitation")
    P.note("A student mixes a solution containing 2.00 g of Pb(NO₃)₂ with a solution containing 3.00 g of KI:   "
           "Pb(NO₃)₂ (aq) + 2KI (aq) → PbI₂ (s) + 2KNO₃ (aq).   The yellow PbI₂ is filtered, washed and dried. "
           "Data: mass of filter paper = %.2f g;  mass of filter paper + dry PbI₂ = %.2f g." % (F1_paper, F1_both), 21)
    P.note("(a) Complete a BCA table. (b) Identify the limiting reactant and show how you know. (c) Calculate the "
           "theoretical yield of PbI₂. (d) Calculate the actual yield and the percent yield. (e) Calculate the mass of the "
           "excess reactant left over.", 21)
    bca(P, F1, {}, 0.34)
    P.ansbox(1.7, "Work for (b)–(e):", [
        "(b) Pb(NO₃)₂: %s mol ÷ 1 = %s;  KI: %s mol ÷ 2 = %s.  **Pb(NO₃)₂ is limiting** (smaller mol rxn)." % (
            mol(F1.get("Pb(NO3)2")["before"]), mol(F1.get("Pb(NO3)2")["rxn"]), mol(F1.get("KI")["before"]),
            mol(F1.get("KI")["rxn"])),
        "(c) %s mol PbI₂ × 461.0 g/mol = **%s g**" % (mol(F1.get("PbI2")["after"]), sf(F1_theo, 3)),
        "(d) Actual = %.2f − %.2f = **%s g**;  percent yield = %s ÷ %s × 100 = **%s%%**" % (
            F1_both, F1_paper, sf(F1_act, 3), sf(F1_act, 3), sf(F1_theo, 3), sf(F1_pct, 3)),
        "(e) KI left = %s mol × 166.00 g/mol = **%s g**" % (mol(F1.get("KI")["after"]), sf(F1_ex_g, 3))])

    # ---- FRQ 2
    P.sub("2.  Heating baking soda")
    P.note("A student heats sodium hydrogen carbonate (baking soda) in a crucible until the mass stops changing:   "
           "2NaHCO₃ (s) → Na₂CO₃ (s) + H₂O (g) + CO₂ (g).", 21)
    data_table(P, ["Measurement", "Mass (g)"], [
        ["Empty crucible", "%.2f" % F2_cru], ["Crucible + NaHCO₃ before heating", "%.2f" % F2_with],
        ["Crucible + solid after heating to constant mass", "%.2f" % F2_after]], [6800, 3280])
    P.note("(a) Calculate the theoretical yield of Na₂CO₃. (b) Calculate the actual yield and the percent yield. "
           "(c) A lab partner reports a percent yield of 104%. Give one specific lab error that could cause a yield above "
           "100%, and explain how it changes the measured mass.", 21)
    P.ansbox(1.7, "Work:", [
        "(a) %.2f g NaHCO₃ ÷ 84.01 = %s mol × (1 mol Na₂CO₃ / 2 mol NaHCO₃) × 105.99 g/mol = **%s g**" % (
            F2_m, mol(F2_m / mm_exact("NaHCO3")), sf(F2_theo, 3)),
        "(b) Actual = %.2f − %.2f = **%s g**;  percent yield = %s ÷ %s × 100 = **%s%%**" % (
            F2_after, F2_cru, sf(F2_act, 3), sf(F2_act, 3), sf(F2_theo, 3), sf(F2_pct, 3)),
        "(c) Any one: the solid was not heated long enough, so water or unreacted NaHCO₃ stayed in the crucible and "
        "made the final mass too large; the crucible took in moisture from the air before weighing; or the product was "
        "contaminated. Extra mass in the actual yield makes the percent yield too high."])

    # ---- FRQ 3
    P.sub("3.  Zinc and copper(II) sulfate")
    P.note("A student adds 1.50 g of zinc powder to a solution containing 3.00 g of CuSO₄:   "
           "Zn (s) + CuSO₄ (aq) → ZnSO₄ (aq) + Cu (s).   The copper is filtered, dried and weighed: **%.2f g**." % F3_act, 21)
    P.note("(a) Complete a BCA table. (b) Calculate the theoretical yield of copper. (c) Calculate the percent yield. "
           "(d) What mass of zinc is left over? (e) The student says the percent yield is low because the reaction “only "
           "partly happened.” Give a different reason that fits the lab.", 21)
    bca(P, F3, {}, 0.34)
    P.ansbox(1.5, "Work for (b)–(e):", [
        "(b) CuSO₄ is limiting (mol rxn %s < %s).  Cu: %s mol × 63.55 = **%s g**" % (
            mol(F3.get("CuSO4")["rxn"]), mol(F3.get("Zn")["rxn"]), mol(F3.get("Cu")["after"]), sf(F3_theo, 3)),
        "(c) 1.05 ÷ %s × 100 = **%s%%**" % (sf(F3_theo, 3), sf(F3_pct, 3)),
        "(d) Zn left = %s mol × 65.38 = **%s g**" % (mol(F3.get("Zn")["after"]), sf(F3_zn_left, 3)),
        "(e) Copper was lost when filtering or transferring, some copper was not dried or washed off the paper, or the "
        "copper reacted/oxidized. (Loss of product lowers the actual yield.)"])
    P.box("TEACHER NOTE", [
        "FRQ 1: %.2f g of PbI₂ collected vs %s g predicted gives %s%%. FRQ 2 needs no BCA table because there is one reactant; "
        "its constant-mass heating is the usual lab procedure. FRQ 3 uses a 1 : 1 reaction so that students focus on the table. "
        "All three give percent yields below 100%% except the hypothetical in 2(c)." % (
            F1_act, sf(F1_theo, 3), sf(F1_pct, 3))], kind="teacher")

    out = os.path.join(OUTDIR, "Unit 6 - Stoichiometry BCA Packet - %s.docx" % ("TEACHER EDITION" if T else "STUDENT NOTES"))
    P.save(out, "Unit 6: Stoichiometry (BCA tables)")
    return out, FLOW


if __name__ == "__main__":
    for T in (False, True):
        out, fl = build(T)
        print(out)
        print("  est. pages:", fl.page, "last page fill:", round(fl.cur, 1), "in")
        for m in fl.marks:
            print("   ", m)
    print("L1", fm(L1.x), "L3 NH3 g", sf(grams(L3.get("NH3")["after"], "NH3"), 3), "L4 NaCl g",
          sf(grams(L4.get("NaCl")["after"], "NaCl"), 3), "L5 O2 lim x", fm(L5.x))
    print("W4 theo/pct", sf(W4_theo, 3), sf(W4_pct, 3), "P41", sf(P41_theo, 3), sf(P41_pct, 3), "P42", sf(P42_theo, 3),
          sf(P42_pct, 3), "F1", sf(F1_theo, 3), sf(F1_pct, 3), "F2", sf(F2_theo, 3), sf(F2_pct, 3), "F3", sf(F3_theo, 3),
          sf(F3_pct, 3), "HWbad", sf(HW_BAD, 3))
