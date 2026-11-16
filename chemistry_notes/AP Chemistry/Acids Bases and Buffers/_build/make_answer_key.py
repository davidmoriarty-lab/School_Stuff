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
        "**Evidence:** Acid X: [H⁺] = 10⁻²·³ = 5.0 × 10⁻³ M, which equals the starting concentration (0.005 M). It is 100% ionized, so X is a strong acid. For Acids Y and Z, [H⁺] = 10⁻²·⁸ = 1.6 × 10⁻³ M, so:",
        ("m", "K_{a} = {[H^{+}]^{2}|[HA]}"),
        ("m", "K_{a}(Y) = {(1.6 × 10^{−3})^{2}|2.0} ≈ 1.3 × 10^{−6}          (0.079% ionized)"),
        ("m", "K_{a}(Z) = {(1.6 × 10^{−3})^{2}|3.0} ≈ 8 × 10^{−7}          (0.053% ionized)"),
        "**Reasoning:** Y and Z give the same pH, but Z needs a higher concentration to do it, so a smaller fraction of Z ionizes. Smaller Ka means weaker acid. A common mistake is to rank by pH alone and call Y and Z equal; concentration must be taken into account."],
     "Ranking by pH alone (or by concentration alone) ignores that acid strength is measured by the fraction ionized, or Ka."),
    (3, "D", [
        "**Setup:** HNO₂ ⇌ H⁺ + NO₂⁻, so",
        ("m", "K_{a} = {x^{2}|1.0 − x} ≈ {x^{2}|1.0} = 4.5 × 10^{−4}"),
        "**Solve:**",
        ("m", "x = sqrt{4.5 × 10^{−4}} = 2.1 × 10^{−2} M = [H^{+}]"),
        ("m", "percent ionization = {2.1 × 10^{−2} M|1.0 M} × 100 = **2.1%**"),
        "The assumption that x is small compared with 1.0 holds (2.1% is under 5%)."],
     "B (0.021) is the fraction, not the percent. A and C come from using Ka itself (4.5 × 10⁻⁴) as the percent or as [H⁺], skipping the square root."),
    (4, "D", [
        "**Moles:**",
        ("m", "mol OH^{−} = 0.1500 L × {0.10 mol|1 L} = 1.5 × 10^{−2} mol          (15 mmol, from the KOH)"),
        ("m", "mol H^{+} = 0.0500 L × {0.20 mol|1 L} = 1.0 × 10^{−2} mol          (10 mmol, from the HBr)"),
        "**Neutralization:** both are strong, so H⁺ + OH⁻ → H₂O goes to completion. Excess OH⁻ = 5.0 mmol, in a total volume of 200.0 mL:",
        ("m", "[OH^{−}] = {0.0050 mol|0.2000 L} = 0.025 M"),
        "**pH:** pOH = −log(0.025) = 1.60, so pH = 14.00 − 1.60 = 12.4, closest to **12**."],
     "7 would be an exact neutralization. 2 and 4 are acidic, but the base is in excess."),
    (5, "B", [
        "**Target:** pH 11.0 means pOH = 3.0. A weak base and its conjugate acid make the best buffer when pOH ≈ pKb (about equal amounts of each, within ±1 unit). So pKb should be near 3, Kb near 1 × 10⁻³.",
        "**Compare:** pKb = −log Kb: (A) 10.96, **(B) 2.92**, (C) 0.64, (D) 0.30. Only B is within one unit of 3."],
     "A is far too weak a base (pKb ≈ 11 would buffer near pOH 11, pH 3). C and D are essentially strong bases (Kb > 0.1) and make no useful buffer."),
    (6, "A", [
        "**Key idea:** at the half-equivalence point exactly half of the weak acid has been converted to its conjugate base, so [HA] = [A⁻]. In the Henderson–Hasselbalch equation:",
        ("m", "pH = pK_{a} + log({[A^{−}]|[HA]}) = pK_{a} + log(1) = **pK_{a}**"),
        "**Volume:** equivalence is at 22.50 mL, so half-equivalence is:",
        ("m", "{22.50 mL|2} = **11.25 mL**")],
     "22.50 mL is the equivalence point (pH > 7 for a weak acid). 25.00 mL and 45.00 mL are past equivalence (excess strong base)."),
    (7, "B", [
        "**What is present at equivalence:** both titrations are 20 mL of 0.10 M acid plus 20 mL of 0.10 M NaOH, so each has only the conjugate base (and spectator Na⁺) at 0.050 M.",
        "**Solution 1:** CH₃CO₂⁻ is the conjugate base of a weak acid: CH₃CO₂⁻ + H₂O ⇌ CH₃CO₂H + OH⁻.",
        ("m", "K_{b} = {1.0 × 10^{−14}|1.75 × 10^{−5}} = 5.7 × 10^{−10}"),
        ("m", "[OH^{−}] ≈ sqrt{(5.7 × 10^{−10})(0.050)} ≈ 5 × 10^{−6} M          pH ≈ 8.7"),
        "**Solution 2:** CF₃CO₂H is a strong acid (Ka ≈ 1), so CF₃CO₂⁻ is a negligible base and the solution is about pH 7.",
        "**Conclusion:** Solution 1 has the higher pH because CH₃CO₂H is the **weaker** acid, so it has the **stronger conjugate base**."],
     "A and C say CH₃CO₂H is the stronger acid; it is the weaker one (Ka = 1.75 × 10⁻⁵ versus about 1). D has the pH direction wrong."),
    (8, "C", [
        "**What the solution is:** HNO₂ (weak acid) plus KNO₂ (its conjugate base, NO₂⁻) is a buffer. The question does not give the KNO₂ concentration; the explanation does not depend on it.",
        "**Why pH barely changes:** added H⁺ is removed by the conjugate base: **H⁺ + NO₂⁻ → HNO₂**. The ratio [NO₂⁻]/[HNO₂] changes only slightly, so pH changes only slightly."],
     "A is a spectator reaction (K⁺ and Cl⁻ do not react). B is the ionization of HNO₂ (and has ClO₂⁻ typed by mistake); it adds H⁺ rather than removing it. D would need OH⁻, which is nearly absent in an acidic buffer."),
    (9, "A", [
        "**Moles:**",
        ("m", "mol NH₃ = 0.0250 L × {0.2 mol|1 L} = 5.0 × 10^{−3} mol          (5.0 mmol)"),
        ("m", "mol HCl = 0.0150 L × {0.2 mol|1 L} = 3.0 × 10^{−3} mol          (3.0 mmol)"),
        "**Reaction:** NH₃ + H⁺ → NH₄⁺. After it: NH₃ = 2.0 mmol left and NH₄⁺ = 3.0 mmol formed. A weak base and its conjugate acid are both present in comparable amounts, so this is a **buffer**.",
        "**pH:**",
        ("m", "pK_{a}(NH₄⁺) = 14.00 − 4.74 = 9.26"),
        ("m", "pH = 9.26 + log({2.0 mmol|3.0 mmol}) = 9.26 − 0.18 = **9.08**"),
        "This is greater than 7. (The acid form is in excess of the base form, so the pH is a little below the pKa, but the pKa itself is above 7.)"],
     "B has the pH direction wrong. C and D say it is not a buffer, but both members of the conjugate pair remain."),
    (10, "A", [
        "**This is an EXCEPT question:** find the statement that is **false**.",
        "**A is false.** Adding a little water dilutes the acid and the salt by the same factor, so the ratio [A⁻]/[HA] does not change:",
        ("m", "pH = pK_{a} + log({[A^{−}]|[HA]})"),
        "so the pH stays essentially the same (the buffer capacity gets smaller, but not the pH).",
        "**B is true:** adding equal amounts of acid and salt keeps the ratio at 1 (same pH) and adds more of each (greater capacity). **C is true:** OH⁻ + HA → A⁻ + H₂O, so HA decreases and A⁻ increases. **D is true:** adding some NaOH to acetic acid makes acetate, giving the same acid/conjugate base pair."],
     "B, C and D are all true statements, so they cannot be the 'except'."),
    (11, "A", [
        "**Henderson–Hasselbalch:**",
        ("m", "pH = pK_{a} + log({[A^{−}]|[HA]})"),
        ("m", "4.6 = 3.2 + log({[A^{−}]|[HA]})"),
        "**Solve:**",
        ("m", "log({[A^{−}]|[HA]}) = 1.4          {[A^{−}]|[HA]} = 10^{1.4} ≈ 25"),
        "Therefore **[HA] < [A⁻] because pH > pKa**. Whenever the pH is above the pKa, the conjugate base form predominates."],
     "B and D put the acid in excess, which only happens when pH < pKa. C has the right inequality but the wrong reason."),
    (12, "D", [
        "**Key idea:** at equivalence, moles OH⁻ added = moles H⁺ present. NaOH gives 1 OH⁻ per formula unit, so 0.10 M NaOH is 0.10 M OH⁻. Ca(OH)₂ gives **2 OH⁻** per formula unit, so 0.10 M Ca(OH)₂ is 0.20 M OH⁻.",
        "**Volumes:**",
        ("m", "V_{NaOH} × 0.10 M = V_{acid} × 0.10 M          →          V_{NaOH} = V_{acid}"),
        ("m", "V_{Ca(OH)₂} × 0.20 M = V_{acid} × 0.10 M          →          V_{Ca(OH)₂} = {1|2} V_{acid}"),
        "NaOH needs **twice** the volume of Ca(OH)₂."],
     "B ignores the two hydroxides in Ca(OH)₂. A and C reverse the relationship."),
    (13, "B", [
        "**Rule:** choose the conjugate acid/base pair whose **pKa is closest to the target pH** (best within ±1).",
        "**pKa values:** H₃AsO₄ = 2.3; H₂AsO₄⁻ = 6.10; HAsO₄²⁻ = 9.22. The pair HAsO₄²⁻ (acid) and AsO₄³⁻ (its conjugate base) uses the 9.22 value, the closest to 11.",
        "**Caution:** 9.22 is still 1.8 units from 11, so",
        ("m", "{[AsO₄³⁻]|[HAsO₄²⁻]} = 10^{1.78} ≈ 60"),
        "This buffer would have a limited capacity against added acid, but it is the best of the choices."],
     "A (pKa 2.3) and C (pKa 6.10) are far from 11. D is not a conjugate pair (H₂AsO₄⁻ and AsO₄³⁻ differ by two protons)."),
    (14, "B", [
        "**Setup:** HNO₂ ⇌ H⁺ + NO₂⁻",
        ("m", "K_{a} = 4.0 × 10^{−4} = {x^{2}|0.01 − x}"),
        "**Estimate:**",
        ("m", "x ≈ sqrt{(4.0 × 10^{−4})(0.01)} = 2.0 × 10^{−3} M          pH = 2.7"),
        "Here the ionization is about 20%, so the 5% shortcut is not valid; solving the quadratic gives x = 1.8 × 10⁻³ M and pH = 2.74. Both fall between **2 and 3**."],
     "A (pH 1 to 2) would need more H⁺ than even a strong acid gives at 0.01 M (pH 2.0). C and D are too close to neutral for an acid at this concentration."),
    (15, "A", [
        "pH = 3 means [H⁺] = 1 × 10⁻³ M.",
        ("m", "[OH^{−}] = {K_{w}|[H^{+}]} = {1.0 × 10^{−14}|1 × 10^{−3}} = **1 × 10^{−11} M**"),
        "(Equivalently, pOH = 14 − 3 = 11.)"],
     "B is the [H⁺], not the [OH⁻]. C is the pH, not a concentration. D is wrong because A is correct."),
    (16, "B", [
        "**Setup:** HA ⇌ H⁺ + A⁻",
        ("m", "K_{a} = {x^{2}|0.40 − x} ≈ {x^{2}|0.40} = 2.5 × 10^{−6}"),
        "**Solve:**",
        ("m", "x^{2} = (2.5 × 10^{−6})(0.40) = 1.0 × 10^{−6}          x = [H^{+}] = 1.0 × 10^{−3} M          pH = **3.00**"),
        "The shortcut is fine because x is tiny compared with 0.40."],
     "A would be a strong acid. C and D would need a much weaker acid or a base."),
    (17, "D", [
        "**Key idea:** this is a weak base (Kb = 4.38 × 10⁻⁴), so only a small fraction reacts. Almost all of it stays as CH₃NH₂: [CH₃NH₂] is much larger than the other two.",
        "Every CH₃NH₂ that reacts makes exactly one OH⁻ and one CH₃NH₃⁺, so **[OH⁻] = [CH₃NH₃⁺]** (the OH⁻ from water is negligible). The order is [CH₃NH₂] > [OH⁻] = [CH₃NH₃⁺]."],
     "A, B and C all make the product ions more concentrated than the base, or unequal, which contradicts the 1:1 stoichiometry and the small Kb."),
    (18, "D", [
        "For a conjugate acid/base pair, Ka × Kb = Kw.",
        ("m", "K_{b} = {K_{w}|K_{a}} = {1.0 × 10^{−14}|2.0 × 10^{−5}} = **5.0 × 10^{−10}**")],
     "The other values do not equal Kw ÷ Ka. B is off by a factor of 10 (10⁻⁹ instead of 10⁻¹⁰); A and C have no connection to Kw ÷ Ka."),
    (19, "D", [
        "**pH:**",
        ("m", "K_{a} = 2 × 10^{−4} = {x^{2}|0.5}"),
        ("m", "x^{2} = 1 × 10^{−4}          [H₃O^{+}] = x = 0.01 M          pH = **2**"),
        "**Species present:** the percent of the acid that ionizes is",
        ("m", "{0.01 M|0.5 M} × 100 = 2%"),
        "so [HCHO₂] ≈ 0.49 M, far greater than [H₃O⁺] = [CHO₂⁻] = 0.01 M. The highest concentration (excluding water) is **HCHO₂**. Answer: pH 2, HCHO₂."],
     "A and B give pH 1, which would need [H⁺] = 0.1 M. A and C name H₃O⁺ as the most concentrated species, which is only true for a strong acid."),
    (20, "C", [
        "**Read the graph:** the equivalence point is near 97 mL (the steep rise), so the half-equivalence point is near 48 mL, which is point B. At point B the pH is about 5.5, so **pKa ≈ 5.5**. You do not need a Ka value given to you; it is read from the curve.",
        "**Point A:** it lies at about 18 mL, well before half-equivalence, and its pH (about 5.0) is **below the pKa**. When pH < pKa, [HA] > [A⁻], so **HA predominates**. (Only about 19% of the acid has been neutralized.)"],
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

# ------------------------------------------------------------------ equations (real Word fractions)
# Calculation lines are written in a small markup and become native Word equations:
#   {top|bottom}  stacked fraction        sqrt{...}  square root      ^{...}  superscript     _{...}  subscript
#   **text**      bold                    ( ) and [ ] become real brackets that size with the fractions
import re
from lxml import etree

M_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math"
W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
XML_NS = "http://www.w3.org/XML/1998/namespace"
_CLOSE = {"(": ")", "[": "]"}


def _m(tag, **attrs):
    e = etree.Element("{%s}%s" % (M_NS, tag), nsmap={"m": M_NS})
    for k, v in attrs.items():
        e.set("{%s}%s" % (M_NS, k), v)
    return e


def _w(tag, **attrs):
    e = etree.Element("{%s}%s" % (W_NS, tag))
    for k, v in attrs.items():
        e.set("{%s}%s" % (W_NS, k), v)
    return e


def _mrun(text, bold, size):
    r = _m("r")
    rpr = _m("rPr"); rpr.append(_m("nor")); r.append(rpr)
    wr = _w("rPr")
    wr.append(_w("rFonts", ascii="Cambria Math", hAnsi="Cambria Math", cs="Cambria Math"))
    if bold:
        wr.append(_w("b"))
    wr.append(_w("sz", val=str(int(size * 2))))
    r.append(wr)
    t = _m("t"); t.text = text; t.set("{%s}space" % XML_NS, "preserve"); r.append(t)
    return r


def _match(s, i, o, c):
    depth = 0
    for j in range(i, len(s)):
        if s[j] == o:
            depth += 1
        elif s[j] == c:
            depth -= 1
            if depth == 0:
                return j
    raise ValueError("unbalanced %r in %r" % (o, s))


def _split_top(s):
    depth = 0
    for j, ch in enumerate(s):
        if ch in "{([":
            depth += 1
        elif ch in "})]":
            depth -= 1
        elif ch == "|" and depth == 0:
            return s[:j], s[j + 1:]
    raise ValueError("fraction needs a | in %r" % s)


def _parse(s, size, fd=False):   # fd: inside a square root, always use real bracket groups
    items, buf, bold = [], "", False

    def flush():
        nonlocal buf
        if buf:
            items.append(_mrun(buf, bold, size))
            buf = ""

    i = 0
    while i < len(s):
        c = s[i]
        if s.startswith("**", i):
            flush(); bold = not bold; i += 2
        elif c == "{":
            j = _match(s, i, "{", "}")
            a, b = _split_top(s[i + 1:j]); flush()
            f = _m("f"); n = _m("num"); n.extend(_parse(a, size, fd)); dn = _m("den"); dn.extend(_parse(b, size, fd))
            f.append(n); f.append(dn); items.append(f); i = j + 1
        elif s.startswith("sqrt{", i):
            j = _match(s, i + 4, "{", "}"); flush()
            rad = _m("rad"); pr = _m("radPr"); pr.append(_m("degHide", val="1")); rad.append(pr); rad.append(_m("deg"))
            e = _m("e"); e.extend(_parse(s[i + 5:j], size, True)); rad.append(e); items.append(rad); i = j + 1
        elif c in _CLOSE:
            cl = _CLOSE[c]; j = _match(s, i, c, cl); flush()
            inner = _parse(s[i + 1:j], size, fd)
            takes_script = s[j + 1:j + 2] in ("^", "_") and s[j + 2:j + 3] == "{"
            tall = any(el.tag in ("{%s}f" % M_NS, "{%s}rad" % M_NS) for el in inner)
            if takes_script or tall or fd or c == "(":      # a real bracket group: sized to its contents, can carry an exponent
                dl = _m("d"); pr = _m("dPr"); pr.append(_m("begChr", val=c)); pr.append(_m("endChr", val=cl)); dl.append(pr)
                e = _m("e"); e.extend(inner); dl.append(e); items.append(dl)
            else:                         # plain brackets, e.g. [H+] or (15 mmol)
                items.append(_mrun(c, bold, size)); items.extend(inner); items.append(_mrun(cl, bold, size))
            i = j + 1
        elif c in "^_" and s[i + 1:i + 2] == "{":
            j = _match(s, i + 1, "{", "}")
            arg = _parse(s[i + 2:j], size, fd)
            m = re.search(r"[A-Za-z0-9.₀-₉]+$", buf)
            if m:
                base, buf = buf[m.start():], buf[:m.start()]
                flush(); base_el = _mrun(base, bold, size)
            elif not buf and items:
                base_el = items.pop()
            else:
                raise ValueError("nothing to attach %s to in %r" % (c, s))
            up = c == "^"
            sc = _m("sSup" if up else "sSub"); e = _m("e"); e.append(base_el); sc.append(e)
            sp = _m("sup" if up else "sub"); sp.extend(arg); sc.append(sp); items.append(sc); i = j + 1
        else:
            buf += c; i += 1
    flush()
    return items


def math_para(d, markup, size=10.5, before=0, after=2, left=0.25, shade="F2F2F2", keep=True):
    p = para(d, "", before=before, after=after, left=left, shade=shade, keep=keep)
    omp = _m("oMathPara"); pr = _m("oMathParaPr"); pr.append(_m("jc", val="left")); omp.append(pr)
    om = _m("oMath"); om.extend(_parse(markup, size)); omp.append(om)
    p._p.append(omp)
    return p


def emit(d, item, left=0.25, keep=True, after=2):
    """A plain string is prose; a ("m", markup) tuple is a calculation shown as fractions."""
    if isinstance(item, tuple):
        return math_para(d, item[1], left=left, keep=keep, after=after)
    return para(d, item, 10, after=after, left=left, shade="F2F2F2", keep=keep)


def mcq_block(d, n, letter, paras, wrong):
    p = para(d, before=6, after=2, keep=True)
    run(p, "%d.  Answer: %s" % (n, letter), 11, bold=True)
    for t in paras:
        emit(d, t)
    para(d, "**Why not the others:** " + wrong, 9, after=2, left=0.25, color="444444")


def frq_part(d, label, resp_lines, points, common=None, fig=None):
    p = para(d, before=5, after=1, keep=True)
    run(p, label, 10.5, bold=True)
    run(p, "    [%s]" % points, 9, color="666666")
    for line in resp_lines:
        emit(d, line, keep=bool(fig), after=1)
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
    frq_part(d, "(b)(i)", [("m", "[H^{+}] = 10^{−pH} = 10^{−4.37} = **4.3 × 10^{−5} M**")], "1 pt")
    frq_part(d, "(b)(ii)", [("m", "mol NaOH = M × V = {0.150 mol|1 L} × 0.0150 L = **2.25 × 10^{−3} mol**")], "1 pt")
    frq_part(d, "(b)(iii)", [
        "NaOH reacts completely: C₆H₅COOH + OH⁻ → C₆H₅COO⁻ + H₂O, so the benzoate formed = 2.25 × 10⁻³ mol.",
        "The equilibrium expression gives the ratio of acid to benzoate:",
        ("m", "K_{a} = {[H^{+}][C₆H₅COO^{−}]|[C₆H₅COOH]}"),
        ("m", "{[C₆H₅COOH]|[C₆H₅COO^{−}]} = {[H^{+}]|K_{a}} = {4.27 × 10^{−5}|6.46 × 10^{−5}} = 0.661"),
        "Both are in the same solution, so the mole ratio is the same as the concentration ratio:",
        ("m", "mol C₆H₅COOH = 0.661 × 2.25 × 10^{−3} mol = **1.49 × 10^{−3} mol**"),
        "(Check: the acid originally present was 1.49 × 10⁻³ + 2.25 × 10⁻³ = 3.74 × 10⁻³ mol, which is 0.150 M in 25.0 mL. An equivalent route uses Henderson–Hasselbalch:)",
        ("m", "4.37 = 4.19 + log({mol A^{−}|mol HA})")],
        "2 pts: 1 for using Ka (or Henderson–Hasselbalch) with the benzoate amount, 1 for the final moles.",
        "Using all 2.25 × 10⁻³ mol as the acid left, or forgetting that the NaOH makes benzoate.")
    frq_part(d, "(c)", [
        "Molar mass of C₆H₅COOH = 122.13 g/mol.",
        ("m", "mol C₆H₅COOH = 0.549 g × {1 mol|122.13 g} = 4.50 × 10^{−3} mol"),
        "At equivalence, mol OH⁻ = mol acid (1:1).",
        ("m", "V = 4.50 × 10^{−3} mol × {1 L|0.150 mol} = 0.0300 L = **30.0 mL**")],
        "2 pts: 1 for the moles of acid, 1 for the volume.")
    frq_part(d, "(d)(i)", [
        "Circle **Na⁺** and **C₆H₅COO⁻**.",
        "At equivalence all of the acid has been converted to benzoate, and Na⁺ comes from the NaOH. Each is 4.50 × 10⁻³ mol in 55.0 mL (25.0 + 30.0):",
        ("m", "[C₆H₅COO^{−}] = [Na^{+}] = {4.50 × 10^{−3} mol|0.0550 L} = 0.082 M"),
        "C₆H₅COOH, OH⁻ and H₃O⁺ are only about 10⁻⁶ M or less (the pH is about 8.5)."],
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
        "HCl is a **strong acid**, so it ionizes completely and [H⁺] = 0.20 M. HClO is a **weak acid** (Ka = 3.0 × 10⁻⁸), so only a tiny fraction ionizes:",
        ("m", "[H^{+}] ≈ sqrt{(3.0 × 10^{−8})(0.20)} = 7.7 × 10^{−5} M"),
        ("m", "{0.20 M|7.7 × 10^{−5} M} ≈ 2,600"),
        "So HCl has about 2,600 times the [H⁺] of HClO.",
        "The rate law is rate = k[H⁺], so the rate is proportional to [H⁺]. With a much larger [H⁺], the H₂ is produced much faster with HCl (more H⁺ ions colliding with the magnesium each second)."],
        "1 pt: a strong acid gives a higher [H⁺] (or weak acid ionizes only slightly). 1 pt: ties the higher [H⁺] to a faster rate through the rate law.")
    frq_part(d, "(a)(iii)  similarities", [
        "Both solutions contain the same amount of monoprotic acid, and Mg is in excess:",
        ("m", "mol acid = 0.0150 L × {0.20 mol|1 L} = 3.00 × 10^{−3} mol"),
        "As Mg uses up H⁺, the HClO keeps ionizing (the loss of H⁺ shifts HClO ⇌ H⁺ + ClO⁻ to the right) until all of it has reacted. Both therefore supply 3.00 × 10⁻³ mol H⁺, and 2 H⁺ make 1 H₂:",
        ("m", "mol H₂ = 3.00 × 10^{−3} mol H^{+} × {1 mol H₂|2 mol H^{+}} = 1.50 × 10^{−3} mol H₂"),
        "so the **final pressure is the same** (same volume and temperature)."],
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
        "Sum: HNO₂ + OH⁻ → H₂O + NO₂⁻, so",
        ("m", "K_{2} = K_{a} × {1|K_{w}} = {4.5 × 10^{−4}|1.0 × 10^{−14}} = **4.5 × 10^{10}**"),
        "(K₂ is very large, so the neutralization goes essentially to completion.)"],
        "2 pts: 1 for combining the equilibria correctly (Ka over Kw, or K₂ = Ka ÷ Kw), 1 for the value.",
        "Multiplying Ka by Kw instead of dividing.")
    frq_part(d, "(c)", [
        "Molar mass of KNO₂ = 39.10 + 14.01 + 2(16.00) = 85.11 g/mol.",
        ("m", "mol KNO₂ = 4.40 g × {1 mol|85.11 g} = 0.0517 mol"),
        ("m", "[NO₂^{−}] = {0.0517 mol|0.200 L} = **0.258 M**"),
        "(KNO₂ is a soluble salt that dissociates completely, one NO₂⁻ per formula unit.)"],
        "2 pts: 1 for the moles, 1 for the concentration.")
    frq_part(d, "(d)", [
        "NO₂⁻ is the conjugate base of a weak acid, so it reacts with water: NO₂⁻ + H₂O ⇌ HNO₂ + OH⁻.",
        ("m", "K_{b} = {K_{w}|K_{a}} = {1.0 × 10^{−14}|4.5 × 10^{−4}} = 2.2 × 10^{−11}"),
        ("m", "K_{b} = {x^{2}|0.258 − x} ≈ {x^{2}|0.258}"),
        ("m", "x = [OH^{−}] = sqrt{(2.2 × 10^{−11})(0.258)} = 2.4 × 10^{−6} M"),
        ("m", "pOH = 5.62          pH = 14.00 − 5.62 = **8.38**")],
        "3 pts: 1 for the reaction of NO₂⁻ with water, 1 for Kb, 1 for [OH⁻] and the pH.",
        "Treating KNO₂ as a neutral salt (pH 7), or using Ka in place of Kb.")

    # Q24
    heading(d, "Question 24  (four acids)   suggested total: 7 points", 11, before=10)
    rows = [["", "Acid 1", "Acid 2", "Acid 3", "Acid 4"],
            ["Identity", "propanoic", "hydrochloric", "lactic", "chlorous"],
            ["Ka from the 0.10 M row", "1.3 × 10⁻⁵", "strong (fully ionized)", "1.5 × 10⁻⁴", "1.1 × 10⁻²"]]
    table(d, rows, [1.6, 1.2, 1.5, 1.2, 1.2])
    math_para(d, "K_{a} = {[H^{+}]^{2}|[HA] − [H^{+}]}", before=4)
    para(d, "Each Ka comes from the expression above, using the pH at 0.10 M (for acid 1, [H⁺] = 10⁻²·⁹⁴ = 1.15 × 10⁻³ M). Matching the Ka values to the acids' known Ka values (propanoic 1.3 × 10⁻⁵, lactic 1.4 × 10⁻⁴, chlorous 1.1 × 10⁻²) gives the identities above.", 9, before=2, after=2, color="444444")
    frq_part(d, "(a)", [
        "**Acid 1** has the smallest Ka. At every concentration it has the **highest pH**, so the lowest [H⁺]; the fraction of its molecules that ionize is the smallest. For example, at 0.10 M, [H⁺] = 10⁻²·⁹⁴ = 1.15 × 10⁻³ M, so",
        ("m", "K_{a} ≈ {(1.15 × 10^{−3})^{2}|0.10} = 1.3 × 10^{−5}"),
        "which is much smaller than the Ka of the other three."],
        "1 pt for Acid 1, 1 pt for the justification (highest pH at the same concentration, or a calculated Ka).")
    frq_part(d, "(b)", [
        "**Acid 2** is hydrochloric acid. HCl is a strong acid and ionizes completely, so [H⁺] equals the acid concentration and pH = −log C at every concentration: 0.010 M gives 2.00, 0.10 M gives 1.00, 1.00 M gives 0.00. Acid 2 matches this exactly at all five concentrations; the other three have pH values higher than −log C, so they are weak acids."],
        "1 pt for Acid 2, 1 pt for the justification (pH = −log C, or the pH values of a strong acid).")
    frq_part(d, "(c)", [
        "**There will be no difference.** All four acids are monoprotic, and equal volumes of 0.50 M solutions contain equal moles of acid. At the equivalence point mol OH⁻ = mol acid, so every acid needs the same volume of KOH. Acid strength affects the pH at the equivalence point, not the volume needed."],
        "1 pt for 'no difference', 1 pt for the justification (equal moles of acid, 1:1 reaction).",
        "Choosing the strongest or the weakest acid. The weak acids are neutralized fully because the reaction with OH⁻ goes essentially to completion (K = Ka/Kw is large).")
    frq_part(d, "(d)", [
        "**Acid 1** (the undissociated weak acid, HA). It is a weak acid, so very little ionizes: at 1.0 M the pH is 2.44, so [H₃O⁺] = [A⁻] = 3.6 × 10⁻³ M, while [HA] ≈ 1.0 M and",
        ("m", "[OH^{−}] = {K_{w}|[H₃O^{+}]} = {1.0 × 10^{−14}|3.6 × 10^{−3}} = 2.8 × 10^{−12} M")],
        "1 pt")

    # Q25
    heading(d, "Question 25  (buffer design)   suggested total: 5 points", 11, before=10)
    frq_part(d, "(a)", [
        "**HF and NaF.** A buffer has its best capacity when pH ≈ pKa (the weak acid and the conjugate base are present in about equal amounts). pKa = −log Ka: HCN 9.21, HOCl 7.46, CH₃COOH 4.74, **HF = −log(6.8 × 10⁻⁴) = 3.17**.",
        "The target pH of 3.17 equals the pKa of HF exactly, so:",
        ("m", "pH = pK_{a} + log({[F^{−}]|[HF]})"),
        ("m", "3.17 = 3.17 + log({[F^{−}]|[HF]})          →          {[F^{−}]|[HF]} = 1"),
        "The other three acids have pKa values at least 1.5 units away."],
        "1 pt: HF/NaF. 1 pt: justification using pKa ≈ pH (or Henderson–Hasselbalch).")
    frq_part(d, "(b)", [
        "Molar mass of NaF = 22.99 + 19.00 = 41.99 g/mol.",
        ("m", "mol F^{−} = 7.77 g × {1 mol|41.99 g} = 0.185 mol"),
        "Because pH = pKa, mol HF = mol F⁻ = 0.185 mol:",
        ("m", "3.17 = 3.17 + log({0.185 mol|mol HF})          →          mol HF = 0.185 mol"),
        ("m", "V = 0.185 mol × {1 L|0.100 mol} = **1.85 L**          (1,850 mL of the 0.100 M HF)")],
        "3 pts: 1 for the moles of NaF, 1 for mol HF = mol F⁻ (from pH = pKa), 1 for the volume.",
        "Using the mass of NaF in place of the moles, or using HF's molar mass.")
    return d


if __name__ == "__main__":
    figs.titration(); figs.pressure()
    d = build()
    p = os.path.join(OUT, "Acid Base Buffer Sample Test - Answer Key with Explanations.docx")
    d.save(p)
    print(p)
