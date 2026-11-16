"""Builds 'Acid Base Buffer Sample Test: Answer Key with Explanations' (Word).

Every number quoted in an explanation was computed in code (see the checks in the top section) from the data printed on
the test. Run:  python3 make_answer_key.py     (needs python-docx, matplotlib, scipy)
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import figs

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..")
L = math.log10

# ------------------------------------------------------------------ numbers behind the explanations (asserted)
ka_hno2 = 4.5e-4
assert round(100 * math.sqrt(ka_hno2), 1) == 2.1                                   # Q3
assert round(14 + L((0.1500 * 0.10 - 0.0500 * 0.20) / 0.2000), 1) == 12.4         # Q4
assert [round(-L(k), 2) for k in (1.1e-11, 1.2e-3, 2.3e-1, 5.0e-1)] == [10.96, 2.92, 0.64, 0.30]   # Q5
assert round(14 + L(math.sqrt(1e-14 / 1.75e-5 * 0.050)), 1) == 8.7                  # Q7
assert round(14 - 4.74 + L(2 / 3), 2) == 9.08                                      # Q9
assert round(10 ** 1.4) == 25                                                      # Q11
assert [round(-L(k), 2) for k in (5e-3, 8e-7, 6e-10)] == [2.3, 6.1, 9.22]          # Q13
assert round(-L((-4e-4 + math.sqrt(16e-8 + 16e-6)) / 2), 2) == 2.74                # Q14
assert round(-L(math.sqrt(2.5e-6 * .4)), 2) == 3.0 and round(-L(math.sqrt(2e-4 * .5)), 2) == 2.0   # Q16, Q19
h21 = 10 ** -4.37
nA21 = 0.150 * 0.0150
nHA21 = nA21 * h21 / 6.46e-5
assert round(h21 * 1e5, 1) == 4.3 and round(nHA21 * 1e3, 2) == 1.49
n21 = 0.549 / 122.13
assert round(n21 * 1e3, 2) == 4.50 and round(n21 / 0.150 * 1000, 1) == 30.0
assert round(14 + L(math.sqrt(1e-14 / 6.46e-5 * n21 / 0.055)), 2) == 8.55
assert round(math.sqrt(3.0e-8 * 0.20) * 1e5, 1) == 7.7
assert abs(4.5e-4 / 1e-14 - 4.5e10) < 1e5
assert round(4.40 / 85.11 / 0.200, 3) == 0.258 and round(14 + L(math.sqrt(1e-14 / 4.5e-4 * 0.2585)), 2) == 8.38
assert round(-L(6.8e-4), 2) == 3.17 and round(7.77 / 41.99 / 0.100, 2) == 1.85

# ------------------------------------------------------------------ the content
KEY = "D D D D B A B C A A  A D B B A B D D D C".split()
assert len(KEY) == 20

# (number, letter, [paragraphs], "why the others fail")   text may use **bold**
MCQ = [
    (1, "D", [
        "**Claim:** the acid HClO₂ is stronger than HCOOH, and the base HCOO⁻ is stronger than ClO₂⁻.",
        "**Reasoning:** K < 1 means the equilibrium lies to the left, so the reactant side is favored. A proton-transfer equilibrium always favors the side with the **weaker acid and the weaker base**. The acid on the left (HCOOH) is therefore weaker than the acid on the right (HClO₂), so HClO₂ > HCOOH. The base on the left (ClO₂⁻) is weaker than the base on the right (HCOO⁻), so ClO₂⁻ < HCOO⁻. This agrees with the rule that a stronger acid has a weaker conjugate base (HClO₂ is the stronger acid, so ClO₂⁻ is the weaker base)."],
     "A and B make HClO₂ the weaker acid, which would put the equilibrium on the right (K > 1). C pairs the stronger acid with the stronger conjugate base, which cannot happen."),
    (2, "D", [
        "**Claim:** Z < Y < X (weakest to strongest). Choices A and B are identical in the test file; neither is correct.",
        "**Evidence:** Acid X: [H⁺] = 10⁻²·³ = 5.0 × 10⁻³ M, which equals the starting concentration (0.005 M). It is 100% ionized, so X is a strong acid. Acid Y: [H⁺] = 10⁻²·⁸ = 1.6 × 10⁻³ M, so Ka = (1.6 × 10⁻³)² ÷ 2.0 ≈ 1.3 × 10⁻⁶ (0.079% ionized). Acid Z: the same [H⁺], so Ka = (1.6 × 10⁻³)² ÷ 3.0 ≈ 8 × 10⁻⁷ (0.053% ionized).",
        "**Reasoning:** Y and Z give the same pH, but Z needs a higher concentration to do it, so a smaller fraction of Z ionizes. Smaller Ka means weaker acid. A common mistake is to rank by pH alone and call Y and Z equal; concentration must be taken into account."],
     "Ranking by pH alone (or by concentration alone) ignores that acid strength is measured by the fraction ionized, or Ka."),
    (3, "D", [
        "**Setup:** HNO₂ ⇌ H⁺ + NO₂⁻, so Ka = x² ÷ (1.0 − x) ≈ x² ÷ 1.0 = 4.5 × 10⁻⁴.",
        "**Solve:** x = √(4.5 × 10⁻⁴) = 2.1 × 10⁻² M = [H⁺]. Percent ionization = (2.1 × 10⁻² ÷ 1.0) × 100 = **2.1%**. The assumption that x is small compared with 1.0 holds (2.1% is under 5%)."],
     "B (0.021) is the fraction, not the percent. A and C come from using Ka itself (4.5 × 10⁻⁴) as the percent or as [H⁺], skipping the square root."),
    (4, "D", [
        "**Moles:** OH⁻ from KOH = 0.1500 L × 0.10 mol/L = 1.5 × 10⁻² mol (15 mmol). H⁺ from HBr = 0.0500 L × 0.20 mol/L = 1.0 × 10⁻² mol (10 mmol).",
        "**Neutralization:** both are strong, so H⁺ + OH⁻ → H₂O goes to completion. Excess OH⁻ = 5.0 mmol, in a total volume of 200.0 mL: [OH⁻] = 0.0050 mol ÷ 0.2000 L = 0.025 M.",
        "**pH:** pOH = −log(0.025) = 1.60, so pH = 14.00 − 1.60 = 12.4, closest to **12**."],
     "7 would be an exact neutralization. 2 and 4 are acidic, but the base is in excess."),
    (5, "B", [
        "**Target:** pH 11.0 means pOH = 3.0. A weak base and its conjugate acid make the best buffer when pOH ≈ pKb (about equal amounts of each, within ±1 unit). So pKb should be near 3, Kb near 1 × 10⁻³.",
        "**Compare:** pKb = −log Kb: (A) 10.96, **(B) 2.92**, (C) 0.64, (D) 0.30. Only B is within one unit of 3."],
     "A is far too weak a base (pKb ≈ 11 would buffer near pOH 11, pH 3). C and D are essentially strong bases (Kb > 0.1) and make no useful buffer."),
    (6, "A", [
        "**Key idea:** at the half-equivalence point exactly half of the weak acid has been converted to its conjugate base, so [HA] = [A⁻]. In the Henderson–Hasselbalch equation, pH = pKa + log([A⁻]/[HA]) = pKa + log(1) = **pKa**.",
        "**Volume:** equivalence is at 22.50 mL, so half-equivalence is 22.50 ÷ 2 = **11.25 mL**."],
     "22.50 mL is the equivalence point (pH > 7 for a weak acid). 25.00 mL and 45.00 mL are past equivalence (excess strong base)."),
    (7, "B", [
        "**What is present at equivalence:** both titrations are 20 mL of 0.10 M acid plus 20 mL of 0.10 M NaOH, so each has only the conjugate base (and spectator Na⁺) at 0.050 M.",
        "**Solution 1:** CH₃CO₂⁻ is the conjugate base of a weak acid: CH₃CO₂⁻ + H₂O ⇌ CH₃CO₂H + OH⁻. Kb = 1.0 × 10⁻¹⁴ ÷ 1.75 × 10⁻⁵ = 5.7 × 10⁻¹⁰, giving [OH⁻] ≈ 5 × 10⁻⁶ M and pH ≈ 8.7.",
        "**Solution 2:** CF₃CO₂H is a strong acid (Ka ≈ 1), so CF₃CO₂⁻ is a negligible base and the solution is about pH 7.",
        "**Conclusion:** Solution 1 has the higher pH because CH₃CO₂H is the **weaker** acid, so it has the **stronger conjugate base**."],
     "A and C say CH₃CO₂H is the stronger acid; it is the weaker one (Ka = 1.75 × 10⁻⁵ versus about 1). D has the pH direction wrong."),
    (8, "C", [
        "**What the solution is:** HNO₂ (weak acid) plus KNO₂ (its conjugate base, NO₂⁻) is a buffer. The question does not give the KNO₂ concentration; the explanation does not depend on it.",
        "**Why pH barely changes:** added H⁺ is removed by the conjugate base: **H⁺ + NO₂⁻ → HNO₂**. The ratio [NO₂⁻]/[HNO₂] changes only slightly, so pH changes only slightly."],
     "A is a spectator reaction (K⁺ and Cl⁻ do not react). B is the ionization of HNO₂ (and has ClO₂⁻ typed by mistake); it adds H⁺ rather than removing it. D would need OH⁻, which is nearly absent in an acidic buffer."),
    (9, "A", [
        "**Moles:** NH₃ = 0.0250 L × 0.2 M = 5.0 mmol. HCl = 0.0150 L × 0.2 M = 3.0 mmol.",
        "**Reaction:** NH₃ + H⁺ → NH₄⁺. After it: NH₃ = 2.0 mmol left and NH₄⁺ = 3.0 mmol formed. A weak base and its conjugate acid are both present in comparable amounts, so this is a **buffer**.",
        "**pH:** pKa of NH₄⁺ = 14.00 − 4.74 = 9.26. pH = 9.26 + log(2.0/3.0) = 9.26 − 0.18 = **9.08**, which is greater than 7. (The acid form is in excess of the base form, so pH is a little below the pKa, but the pKa itself is above 7.)"],
     "B has the pH direction wrong. C and D say it is not a buffer, but both members of the conjugate pair remain."),
    (10, "A", [
        "**This is an EXCEPT question:** find the statement that is **false**.",
        "**A is false.** Adding a little water dilutes the acid and the salt by the same factor, so the ratio [A⁻]/[HA] does not change. pH = pKa + log([A⁻]/[HA]), so the pH stays essentially the same (the buffer capacity gets smaller, but not the pH).",
        "**B is true:** adding equal amounts of acid and salt keeps the ratio at 1 (same pH) and adds more of each (greater capacity). **C is true:** OH⁻ + HA → A⁻ + H₂O, so HA decreases and A⁻ increases. **D is true:** adding some NaOH to acetic acid makes acetate, giving the same acid/conjugate base pair."],
     "B, C and D are all true statements, so they cannot be the 'except'."),
    (11, "A", [
        "**Henderson–Hasselbalch:** pH = pKa + log([A⁻]/[HA]), so 4.6 = 3.2 + log([A⁻]/[HA]).",
        "**Solve:** log([A⁻]/[HA]) = 1.4, so [A⁻]/[HA] = 10¹·⁴ ≈ 25. Therefore **[HA] < [A⁻] because pH > pKa**. Whenever the pH is above the pKa, the conjugate base form predominates."],
     "B and D put the acid in excess, which only happens when pH < pKa. C has the right inequality but the wrong reason."),
    (12, "D", [
        "**Key idea:** at equivalence, moles OH⁻ added = moles H⁺ present. NaOH gives 1 OH⁻ per formula unit, so 0.10 M NaOH is 0.10 M OH⁻. Ca(OH)₂ gives **2 OH⁻** per formula unit, so 0.10 M Ca(OH)₂ is 0.20 M OH⁻.",
        "**Volumes:** V(NaOH) × 0.10 = V(acid) × 0.10, so V(NaOH) = V(acid). V(Ca(OH)₂) × 0.20 = V(acid) × 0.10, so V(Ca(OH)₂) = ½ V(acid). NaOH needs **twice** the volume of Ca(OH)₂."],
     "B ignores the two hydroxides in Ca(OH)₂. A and C reverse the relationship."),
    (13, "B", [
        "**Rule:** choose the conjugate acid/base pair whose **pKa is closest to the target pH** (best within ±1).",
        "**pKa values:** H₃AsO₄ = 2.3; H₂AsO₄⁻ = 6.10; HAsO₄²⁻ = 9.22. The pair HAsO₄²⁻ (acid) and AsO₄³⁻ (its conjugate base) uses the 9.22 value, the closest to 11.",
        "**Caution:** 9.22 is still 1.8 units from 11, so [AsO₄³⁻]/[HAsO₄²⁻] = 10¹·⁷⁸ ≈ 60. This buffer would have a limited capacity against added acid, but it is the best of the choices."],
     "A (pKa 2.3) and C (pKa 6.10) are far from 11. D is not a conjugate pair (H₂AsO₄⁻ and AsO₄³⁻ differ by two protons)."),
    (14, "B", [
        "**Setup:** HNO₂ ⇌ H⁺ + NO₂⁻, Ka = 4.0 × 10⁻⁴ = x² ÷ (0.01 − x).",
        "**Estimate:** x ≈ √(4.0 × 10⁻⁴ × 0.01) = 2.0 × 10⁻³ M, pH = 2.7. Here the ionization is about 20%, so the 5% shortcut is not valid; solving the quadratic gives x = 1.8 × 10⁻³ M and pH = 2.74. Both fall between **2 and 3**."],
     "A (pH 1 to 2) would need more H⁺ than even a strong acid gives at 0.01 M (pH 2.0). C and D are too close to neutral for an acid at this concentration."),
    (15, "A", [
        "pH = 3 means [H⁺] = 1 × 10⁻³ M. [OH⁻] = Kw ÷ [H⁺] = 1.0 × 10⁻¹⁴ ÷ 1 × 10⁻³ = **1 × 10⁻¹¹ M**. (Equivalently, pOH = 14 − 3 = 11.)"],
     "B is the [H⁺], not the [OH⁻]. C is the pH, not a concentration. D is wrong because A is correct."),
    (16, "B", [
        "**Setup:** HA ⇌ H⁺ + A⁻, Ka = x² ÷ (0.40 − x) ≈ x² ÷ 0.40 = 2.5 × 10⁻⁶.",
        "**Solve:** x² = 1.0 × 10⁻⁶, so x = [H⁺] = 1.0 × 10⁻³ M and pH = **3.00**. The shortcut is fine because x is tiny compared with 0.40."],
     "A would be a strong acid. C and D would need a much weaker acid or a base."),
    (17, "D", [
        "**Key idea:** this is a weak base (Kb = 4.38 × 10⁻⁴), so only a small fraction reacts. Almost all of it stays as CH₃NH₂: [CH₃NH₂] is much larger than the other two.",
        "Every CH₃NH₂ that reacts makes exactly one OH⁻ and one CH₃NH₃⁺, so **[OH⁻] = [CH₃NH₃⁺]** (the OH⁻ from water is negligible). The order is [CH₃NH₂] > [OH⁻] = [CH₃NH₃⁺]."],
     "A, B and C all make the product ions more concentrated than the base, or unequal, which contradicts the 1:1 stoichiometry and the small Kb."),
    (18, "D", [
        "For a conjugate acid/base pair, Ka × Kb = Kw. Kb = 1.0 × 10⁻¹⁴ ÷ 2.0 × 10⁻⁵ = **5.0 × 10⁻¹⁰**."],
     "The other values do not equal Kw ÷ Ka. B is off by a factor of 10 (10⁻⁹ instead of 10⁻¹⁰); A and C have no connection to Kw ÷ Ka."),
    (19, "D", [
        "**pH:** Ka = 2 × 10⁻⁴ = x² ÷ 0.5, so x² = 1 × 10⁻⁴ and [H₃O⁺] = x = 0.01 M. pH = **2**.",
        "**Species present:** only 0.01/0.5 = 2% of the acid ionizes, so [HCHO₂] ≈ 0.49 M, far greater than [H₃O⁺] = [CHO₂⁻] = 0.01 M. The highest concentration (excluding water) is **HCHO₂**. Answer: pH 2, HCHO₂."],
     "A and B give pH 1, which would need [H⁺] = 0.1 M. A and C name H₃O⁺ as the most concentrated species, which is only true for a strong acid."),
    (20, "C", [
        "**Read the graph:** the equivalence point is near 97 mL (the steep rise), so the half-equivalence point is near 48 mL, which is point B. At point B the pH is about 5.5, so **pKa ≈ 5.5**. You do not need a Ka value given to you; it is read from the curve.",
        "**Point A:** it lies at about 18 mL, well before half-equivalence, and its pH (about 5.0) is **below the pKa**. When pH < pKa, [HA] > [A⁻], so **HA predominates**. (Only about 18/97, or 19%, of the acid has been neutralized.)"],
     "A is wrong because pKa can be read from the graph. B describes point B, where pH = pKa. D would apply well past the half-equivalence point (for example points C, D or E)."),
]
assert [m[1] for m in MCQ] == KEY

NOTES = [
    "Question 2: choices A and B are the same (both read “X < Y < Z”). Change one of them.",
    "Question 8: the concentration of the KNO₂ is missing, and choice B has ClO₂⁻ where NO₂⁻ is meant.",
    "Question 20: the question does not say what the graph is. It reads best as “the titration curve shown (weak acid with 0.1000 M KOH)”.",
    "Question 21: the equation shows C₆H₅COOH as (s); it should be (aq). The volume of the second benzoic acid sample in parts (c) to (e) is not given; this key uses the same 25.0 mL as in part (b). In (d)(i) the list of substances runs together on one line.",
    "Question 23(b): in the table, the product of the neutralization is printed NO₂ and should be NO₂⁻.",
    "Question 24: the data table is a picture; if it is re-typed, copy the pH columns exactly. The key identifies Acid 1 as propanoic, 2 as hydrochloric, 3 as lactic and 4 as chlorous.",
    "The test does not give point values for the free-response questions. The points in this key are a suggestion in the style of a College Board scoring guideline (one point for each distinct skill).",
]

# ------------------------------------------------------------------ docx helpers
FONT = "Calibri"


def run(p, text, size=10, bold=False, italic=False, color=None):
    r = p.add_run(text)
    r.font.name = FONT
    r._element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    r.font.size = Pt(size)
    r.bold, r.italic = bold, italic
    if color:
        r.font.color.rgb = RGBColor.from_string(color)
    return r


def rich(p, text, size=10, color=None, italic=False):
    for i, seg in enumerate(text.split("**")):
        if seg:
            run(p, seg, size, bold=(i % 2 == 1), color=color, italic=italic)


def para(d, text="", size=10, before=0, after=3, left=None, hang=None, keep=False, shade=None, color=None, bold=False, italic=False):
    p = d.add_paragraph()
    pf = p.paragraph_format
    pf.space_before, pf.space_after = Pt(before), Pt(after)
    if left is not None:
        pf.left_indent = Inches(left)
    if hang is not None:
        pf.first_line_indent = Inches(-hang)
    pf.keep_with_next = keep
    if shade:
        ppr = p._p.get_or_add_pPr()
        sh = OxmlElement("w:shd")
        sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), shade)
        ppr.append(sh)
    if text:
        if bold:
            run(p, text, size, bold=True, color=color, italic=italic)
        else:
            rich(p, text, size, color=color, italic=italic)
    return p


def heading(d, text, size=13, before=10):
    p = para(d, before=before, after=3, keep=True)
    run(p, text, size, bold=True)
    ppr = p._p.get_or_add_pPr()
    b = OxmlElement("w:pBdr"); bt = OxmlElement("w:bottom")
    for k, v in (("val", "single"), ("sz", "6"), ("space", "1"), ("color", "444444")):
        bt.set(qn("w:" + k), v)
    b.append(bt); ppr.append(b)
    return p


def cell_shade(c, fill):
    tcPr = c._tc.get_or_add_tcPr(); sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), fill); tcPr.append(sh)


def table(d, rows, widths, header=True, size=9):
    t = d.add_table(rows=len(rows), cols=len(rows[0]))
    t.style = "Table Grid"
    t.autofit = False
    for i, row in enumerate(rows):
        for j, val in enumerate(row):
            c = t.cell(i, j)
            c.width = Inches(widths[j])
            c.text = ""
            run(c.paragraphs[0], str(val), size, bold=(header and i == 0))
            if header and i == 0:
                cell_shade(c, "D9D9D9")
    for col, w in zip(t.columns, widths):
        col.width = Inches(w)
    return t


def new_doc():
    d = Document()
    st = d.styles["Normal"]
    st.font.name = FONT
    st.element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    st.font.size = Pt(10)
    s = d.sections[0]
    s.page_width, s.page_height = Inches(8.5), Inches(11)
    s.left_margin = s.right_margin = Inches(0.8)
    s.top_margin = s.bottom_margin = Inches(0.7)
    p = s.footer.paragraphs[0]
    run(p, "Acid–Base and Buffer Sample Test: Answer Key with Explanations  •  page ", 8, color="666666")
    for kind, txt in (("begin", None), (None, "PAGE"), ("end", None)):
        r = p.add_run(); r.font.size = Pt(8)
        if kind:
            fc = OxmlElement("w:fldChar"); fc.set(qn("w:fldCharType"), kind); r._r.append(fc)
        else:
            it = OxmlElement("w:instrText"); it.set(qn("xml:space"), "preserve"); it.text = txt; r._r.append(it)
    return d


def mcq_block(d, n, letter, paras, wrong):
    p = para(d, before=6, after=2, keep=True)
    run(p, "%d.  Answer: %s" % (n, letter), 11, bold=True)
    for k, t in enumerate(paras):
        para(d, t, 10, after=2, left=0.25, shade="F2F2F2", keep=(k < len(paras) - 1 or True))
    para(d, "**Why not the others:** " + wrong, 9, after=2, left=0.25, color="444444")


def frq_part(d, label, resp_lines, points, common=None, fig=None):
    p = para(d, before=5, after=1, keep=True)
    run(p, label, 10.5, bold=True)
    run(p, "    [%s]" % points, 9, color="666666")
    for line in resp_lines:
        para(d, line, 10, after=1, left=0.25, shade="F2F2F2", keep=bool(fig) or False)
    if fig:
        pp = d.add_paragraph(); pp.paragraph_format.left_indent = Inches(0.25)
        pp.add_run().add_picture(fig[0], width=Inches(fig[1]))
        para(d, fig[2], 8.5, after=2, left=0.25, color="555555", italic=True)
    if common:
        para(d, "**Common errors:** " + common, 9, after=2, left=0.25, color="444444")


def build():
    d = new_doc()
    para(d, "Acid–Base and Buffer Sample Test", 18, after=0, bold=True)
    para(d, "Answer Key with Explanations (AP Chemistry style)", 13, after=3, bold=True, color="444444")
    para(d, "Each answer is explained the way the College Board scoring guidelines expect: state the answer (the claim), "
            "support it with evidence (a setup with units, an equilibrium expression, or a particle-level reason), and connect the two. "
            "All numbers were recalculated in code from the data on the test. Free-response responses are written as a full-credit "
            "student answer, with suggested points.", 9.5, after=4, color="333333")

    heading(d, "Answer key: multiple choice", 12, before=4)
    rows = [["#"] + [str(i) for i in range(1, 11)], ["Ans"] + KEY[:10], ["#"] + [str(i) for i in range(11, 21)], ["Ans"] + KEY[10:]]
    t = table(d, rows, [0.5] + [0.62] * 10, header=False, size=10)
    for i in (0, 2):
        for c in t.rows[i].cells:
            cell_shade(c, "D9D9D9")
    for i in (1, 3):
        for c in t.rows[i].cells[1:]:
            for r in c.paragraphs[0].runs:
                r.bold = True

    heading(d, "Typos and gaps I found in the test", 11, before=8)
    for n in NOTES:
        para(d, "•  " + n, 9, after=1, left=0.2, hang=0.15)

    # ---------------- Part I
    heading(d, "Part I: Multiple Choice Explanations", 13, before=12)
    for n, letter, paras, wrong in MCQ:
        mcq_block(d, n, letter, paras, wrong)

    # ---------------- Part II
    heading(d, "Part II: Free Response", 13, before=14)

    # Q21
    heading(d, "Question 21  (benzoic acid titration)   suggested total: 12 points", 11, before=6)
    frq_part(d, "(a)", [
        "**Neither.** At equilibrium the rate of the forward reaction (C₆H₅COOH dissociating into C₆H₅COO⁻ and H⁺) is **equal** to the rate of the reverse reaction (C₆H₅COO⁻ and H⁺ recombining). The concentrations stay constant because the two rates are equal, but both reactions are still going on (a dynamic equilibrium)."],
        "1 pt: the rates are equal, with the reason.",
        "Saying the reverse reaction is faster because Ka is small. K compares concentrations, not rates, and at equilibrium the rates are equal.")
    frq_part(d, "(b)(i)", ["[H⁺] = 10⁻ᵖᴴ = 10⁻⁴·³⁷ = **4.3 × 10⁻⁵ M**"], "1 pt")
    frq_part(d, "(b)(ii)", ["mol NaOH = M × V = (0.150 mol/L)(0.0150 L) = **2.25 × 10⁻³ mol**"], "1 pt")
    frq_part(d, "(b)(iii)", [
        "NaOH reacts completely: C₆H₅COOH + OH⁻ → C₆H₅COO⁻ + H₂O, so the benzoate formed = 2.25 × 10⁻³ mol.",
        "Ka = [H⁺][C₆H₅COO⁻] ÷ [C₆H₅COOH], so [C₆H₅COOH]/[C₆H₅COO⁻] = [H⁺] ÷ Ka = (4.27 × 10⁻⁵) ÷ (6.46 × 10⁻⁵) = 0.661.",
        "Both are in the same solution, so the mole ratio is the same as the concentration ratio: mol C₆H₅COOH = 0.661 × 2.25 × 10⁻³ mol = **1.49 × 10⁻³ mol**.",
        "(Check: the acid originally present was 1.49 × 10⁻³ + 2.25 × 10⁻³ = 3.74 × 10⁻³ mol, which is 0.150 M in 25.0 mL. Equivalent route: 4.37 = 4.19 + log(mol A⁻ ÷ mol HA).)"],
        "2 pts: 1 for using Ka (or Henderson–Hasselbalch) with the benzoate amount, 1 for the final moles.",
        "Using all 2.25 × 10⁻³ mol as the acid left, or forgetting that the NaOH makes benzoate.")
    frq_part(d, "(c)", [
        "Molar mass of C₆H₅COOH = 122.13 g/mol. mol = 0.549 g × (1 mol ÷ 122.13 g) = 4.50 × 10⁻³ mol.",
        "At equivalence, mol OH⁻ = mol acid (1:1). V = 4.50 × 10⁻³ mol ÷ 0.150 mol/L = 0.0300 L = **30.0 mL**."],
        "2 pts: 1 for the moles of acid, 1 for the volume.")
    frq_part(d, "(d)(i)", [
        "Circle **Na⁺** and **C₆H₅COO⁻**.",
        "At equivalence all of the acid has been converted to benzoate, and Na⁺ comes from the NaOH. Each is 4.50 × 10⁻³ mol in 55.0 mL (25.0 + 30.0), about 0.082 M. C₆H₅COOH, OH⁻ and H₃O⁺ are only about 10⁻⁶ M or less (the pH is about 8.5)."],
        "1 pt: both ions circled and nothing else.",
        "Circling C₆H₅COOH. After a complete neutralization only a tiny amount of acid is formed by hydrolysis.")
    frq_part(d, "(d)(ii)", [
        "**C₆H₅COO⁻(aq) + H₂O(l) ⇌ C₆H₅COOH(aq) + OH⁻(aq)**",
        "The benzoate ion (the conjugate base of a weak acid) accepts a proton from water and produces OH⁻. Then [OH⁻] > [H₃O⁺], so pH > 7. Na⁺ does not react with water."],
        "1 pt: the equation, balanced for atoms and charge, with OH⁻ as a product.")
    frq_part(d, "(e)", [
        "Required features of the curve: (1) it starts at an acidic pH (about 2.5, above 1 because the acid is weak) and rises gradually through a buffer region, passing through **pH = pKa = 4.19 at 15.0 mL** (half-equivalence); (2) it rises almost vertically at **30.0 mL**, crossing **pH 8 to 9 at the equivalence point**; (3) after equivalence it levels off at a high pH, about 12 to 12.5 at 45 mL.",
        ],
        "3 pts: 1 for the start and the buffer region, 1 for the vertical rise at 30.0 mL through pH 8 to 9, 1 for the leveling off above pH 11.",
        "Starting at pH 7 or at pH 1; putting the equivalence point at pH 7; putting the vertical rise at 15 mL instead of 30.0 mL.",
        fig=(os.path.join(figs.OUT, "q21e.png"), 4.6, "Model sketch (calculated for 0.549 g of benzoic acid in 25.0 mL, titrated with 0.150 M NaOH)."))

    # Q22
    heading(d, "Question 22  (Mg with HClO and HCl)   suggested total: 5 points", 11, before=10)
    frq_part(d, "(a)(i)", [
        "The new curve (dashed line below) rises **much more steeply** than the HClO curve and reaches the **same final pressure** (about 1.0 atm) much sooner."],
        "1 pt",
        None,
        fig=(os.path.join(figs.OUT, "q22a.png"), 4.3, "Model sketch. The time scale for HCl is qualitative; any curve that is steeper at the start and levels off at the same pressure earns the credit."))
    frq_part(d, "(a)(ii)  differences", [
        "HCl is a **strong acid**, so it ionizes completely and [H⁺] = 0.20 M. HClO is a **weak acid** (Ka = 3.0 × 10⁻⁸), so only a tiny fraction ionizes: [H⁺] ≈ √(3.0 × 10⁻⁸ × 0.20) = 7.7 × 10⁻⁵ M, about 2,600 times smaller.",
        "The rate law is rate = k[H⁺], so the rate is proportional to [H⁺]. With a much larger [H⁺], the H₂ is produced much faster with HCl (more H⁺ ions colliding with the magnesium each second)."],
        "1 pt: a strong acid gives a higher [H⁺] (or weak acid ionizes only slightly). 1 pt: ties the higher [H⁺] to a faster rate through the rate law.")
    frq_part(d, "(a)(iii)  similarities", [
        "Both solutions contain the same amount of acid: 0.0150 L × 0.20 mol/L = 3.00 × 10⁻³ mol of a monoprotic acid, and Mg is in excess. As Mg uses up H⁺, the HClO keeps ionizing (the loss of H⁺ shifts HClO ⇌ H⁺ + ClO⁻ to the right) until all of it has reacted.",
        "Both therefore supply 3.00 × 10⁻³ mol H⁺, which makes 1.50 × 10⁻³ mol H₂ (2 H⁺ per H₂), so the **final pressure is the same** (same volume and temperature)."],
        "1 pt: same moles of acid (or H⁺ available) lead to the same amount of H₂ and the same final pressure.",
        "Saying the final pressure for HClO is lower because it is a weak acid. Acid strength changes the rate, not the total amount of H⁺ that can react.")
    frq_part(d, "(b)", [
        "The pH will **increase**. The reaction 2H⁺ + Mg → Mg²⁺ + H₂ consumes H⁺, so [H⁺] decreases as the reaction proceeds, and pH = −log[H⁺] goes up. For HClO the same is true: as HClO is used up, [HClO] falls, so [H⁺] (about √(Ka[HClO])) falls and the pH rises from about 4.1."],
        "1 pt: the claim and the justification together (H⁺ is consumed).")

    # Q23
    heading(d, "Question 23  (nitrous acid)   suggested total: 8 points", 11, before=10)
    frq_part(d, "(a)", [
        "**HNO₂ is the acid** and **NO₂⁻ is its conjugate base**. (Also acceptable: H₂O is the base and H₃O⁺ is its conjugate acid.) The acid has one more proton than the base."],
        "1 pt: a correct pair, with the acid and the base labeled.")
    frq_part(d, "(b)", [
        "Add the first equation to the reverse of the water equation:",
        "HNO₂ + H₂O ⇌ H₃O⁺ + NO₂⁻        K = Ka",
        "H₃O⁺ + OH⁻ ⇌ H₂O + H₂O          K = 1/Kw",
        "Sum: HNO₂ + OH⁻ → H₂O + NO₂⁻  and  K₂ = Ka × (1/Kw) = (4.5 × 10⁻⁴) ÷ (1.0 × 10⁻¹⁴) = **4.5 × 10¹⁰**",
        "(K₂ is very large, so the neutralization goes essentially to completion.)"],
        "2 pts: 1 for combining the equilibria correctly (Ka over Kw, or K₂ = Ka ÷ Kw), 1 for the value.",
        "Multiplying Ka by Kw instead of dividing.")
    frq_part(d, "(c)", [
        "Molar mass of KNO₂ = 39.10 + 14.01 + 2(16.00) = 85.11 g/mol. mol = 4.40 g ÷ 85.11 g/mol = 0.0517 mol.",
        "[NO₂⁻] = 0.0517 mol ÷ 0.200 L = **0.258 M** (KNO₂ is a soluble salt that dissociates completely, one NO₂⁻ per formula unit)."],
        "2 pts: 1 for the moles, 1 for the concentration.")
    frq_part(d, "(d)", [
        "NO₂⁻ is the conjugate base of a weak acid, so it reacts with water: NO₂⁻ + H₂O ⇌ HNO₂ + OH⁻.",
        "Kb = Kw ÷ Ka = (1.0 × 10⁻¹⁴) ÷ (4.5 × 10⁻⁴) = 2.2 × 10⁻¹¹ = x² ÷ (0.258 − x) ≈ x² ÷ 0.258",
        "x = [OH⁻] = √(2.2 × 10⁻¹¹ × 0.258) = 2.4 × 10⁻⁶ M. pOH = 5.62, **pH = 14.00 − 5.62 = 8.38**."],
        "3 pts: 1 for the reaction of NO₂⁻ with water, 1 for Kb, 1 for [OH⁻] and the pH.",
        "Treating KNO₂ as a neutral salt (pH 7), or using Ka in place of Kb.")

    # Q24
    heading(d, "Question 24  (four acids)   suggested total: 7 points", 11, before=10)
    rows = [["", "Acid 1", "Acid 2", "Acid 3", "Acid 4"],
            ["Identity", "propanoic", "hydrochloric", "lactic", "chlorous"],
            ["Ka from the 0.10 M row", "1.3 × 10⁻⁵", "strong (fully ionized)", "1.5 × 10⁻⁴", "1.1 × 10⁻²"]]
    table(d, rows, [1.6, 1.2, 1.5, 1.2, 1.2])
    para(d, "Each Ka comes from Ka = [H⁺]² ÷ ([HA] − [H⁺]) using the pH at 0.10 M (acid 1: [H⁺] = 10⁻²·⁹⁴ = 1.15 × 10⁻³ M). Matching the Ka values to the acids' known Ka values (propanoic 1.3 × 10⁻⁵, lactic 1.4 × 10⁻⁴, chlorous 1.1 × 10⁻²) gives the identities above.", 9, before=2, after=2, color="444444")
    frq_part(d, "(a)", [
        "**Acid 1** has the smallest Ka. At every concentration it has the **highest pH**, so the lowest [H⁺]; the fraction of its molecules that ionize is the smallest. For example, at 0.10 M, [H⁺] = 10⁻²·⁹⁴ = 1.15 × 10⁻³ M, so Ka ≈ (1.15 × 10⁻³)² ÷ 0.10 = 1.3 × 10⁻⁵, much smaller than that of the other three."],
        "1 pt for Acid 1, 1 pt for the justification (highest pH at the same concentration, or a calculated Ka).")
    frq_part(d, "(b)", [
        "**Acid 2** is hydrochloric acid. HCl is a strong acid and ionizes completely, so [H⁺] equals the acid concentration and pH = −log C at every concentration: 0.010 M gives 2.00, 0.10 M gives 1.00, 1.00 M gives 0.00. Acid 2 matches this exactly at all five concentrations; the other three have pH values higher than −log C, so they are weak acids."],
        "1 pt for Acid 2, 1 pt for the justification (pH = −log C, or the pH values of a strong acid).")
    frq_part(d, "(c)", [
        "**There will be no difference.** All four acids are monoprotic, and equal volumes of 0.50 M solutions contain equal moles of acid. At the equivalence point mol OH⁻ = mol acid, so every acid needs the same volume of KOH. Acid strength affects the pH at the equivalence point, not the volume needed."],
        "1 pt for 'no difference', 1 pt for the justification (equal moles of acid, 1:1 reaction).",
        "Choosing the strongest or the weakest acid. The weak acids are neutralized fully because the reaction with OH⁻ goes essentially to completion (K = Ka/Kw is large).")
    frq_part(d, "(d)", [
        "**Acid 1** (the undissociated weak acid, HA). It is a weak acid, so very little ionizes: at 1.0 M the pH is 2.44, so [H₃O⁺] = [A⁻] = 3.6 × 10⁻³ M, while [HA] ≈ 1.0 M and [OH⁻] = Kw ÷ [H₃O⁺] = 2.8 × 10⁻¹² M."],
        "1 pt")

    # Q25
    heading(d, "Question 25  (buffer design)   suggested total: 5 points", 11, before=10)
    frq_part(d, "(a)", [
        "**HF and NaF.** A buffer has its best capacity when pH ≈ pKa (the weak acid and the conjugate base are present in about equal amounts). pKa = −log Ka: HCN 9.21, HOCl 7.46, CH₃COOH 4.74, **HF = −log(6.8 × 10⁻⁴) = 3.17**.",
        "The target pH of 3.17 equals the pKa of HF exactly, so pH = pKa + log([F⁻]/[HF]) gives [F⁻]/[HF] = 1. The other three acids have pKa values at least 1.5 units away."],
        "1 pt: HF/NaF. 1 pt: justification using pKa ≈ pH (or Henderson–Hasselbalch).")
    frq_part(d, "(b)", [
        "Molar mass of NaF = 22.99 + 19.00 = 41.99 g/mol. mol F⁻ = 7.77 g ÷ 41.99 g/mol = 0.185 mol.",
        "Because pH = pKa, mol HF = mol F⁻ = 0.185 mol. (3.17 = 3.17 + log(0.185 ÷ mol HF) gives mol HF = 0.185 mol.)",
        "V = mol ÷ M = 0.185 mol ÷ 0.100 mol/L = **1.85 L** (1,850 mL) of the 0.100 M HF."],
        "3 pts: 1 for the moles of NaF, 1 for mol HF = mol F⁻ (from pH = pKa), 1 for the volume.",
        "Using the mass of NaF in place of the moles, or using HF's molar mass.")
    return d


if __name__ == "__main__":
    figs.titration(); figs.pressure()
    d = build()
    p = os.path.join(OUT, "Acid Base Buffer Sample Test - Answer Key with Explanations.docx")
    d.save(p)
    print(p)
