"""Builds the AP Chemistry Unit 6 (Thermochemistry and Free Energy) condensed notes and the teacher key.

Student notes: complete statements (no fill-in-the-blank sentences), worked-example problems with work space,
and 20 warm-up multiple-choice questions at the back.  Teacher key: every example solved, plus the MC answers and reasons.
Every number comes from data.py, which checks it with asserts.   Run:  python3 make_notes.py
"""
import os, sys, re
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from docx import Document
from docx.enum.section import WD_SECTION
from docx.shared import Pt, Inches, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import data as D
import figs
from omml import add_math
from data import sig, sci

OUT = os.path.join(HERE, "..")
FONT = "Calibri"
WIDTH = 7.1
DARK = "222222"
IMG = figs.all_figs()
U = lambda s: s.replace("-", "−")     # proper minus sign


# ------------------------------------------------------------------ low-level helpers
def run(p, text, size=10, bold=False, italic=False, color=None, sub=False):
    text = re.sub(r"(?<![A-Za-z0-9])-(?=\d)", "\u2212", text)
    r = p.add_run(text)
    r.font.name = FONT
    r._element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    r.font.size = Pt(size)
    r.bold, r.italic = bold, italic
    r.font.subscript = sub
    if color:
        r.font.color.rgb = RGBColor.from_string(color)
    return r


def rich(p, text, size=10, color=None, italic=False):
    """**bold** and {{subscript}} markup."""
    for i, seg in enumerate(text.split("**")):
        for part in re.split(r"(\{\{.*?\}\}|(?<=[A-Za-z°)])_[A-Za-z]+)", seg):
            if not part:
                continue
            if part.startswith("{{"):
                run(p, part[2:-2], size, bold=(i % 2 == 1), color=color, italic=italic, sub=True)
            elif part.startswith("_"):
                run(p, part[1:], size, bold=(i % 2 == 1), color=color, italic=italic, sub=True)
            else:
                run(p, part, size, bold=(i % 2 == 1), color=color, italic=italic)


def pfmt(p, before=0, after=2, left=None, hang=None, keep=False, line=None):
    pf = p.paragraph_format
    pf.space_before, pf.space_after = Pt(before), Pt(after)
    if left is not None:
        pf.left_indent = Inches(left)
    if hang is not None:
        pf.first_line_indent = Inches(-hang)
    pf.keep_with_next = keep
    if line:
        pf.line_spacing = line
    return p


def shade_cell(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), fill)
    tcPr.append(sh)


def set_borders(table, sz=6, color="444444", inside=True):
    tblPr = table._tbl.tblPr
    b = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right") + (("insideH", "insideV") if inside else ()):
        e = OxmlElement("w:" + edge)
        e.set(qn("w:val"), "single"); e.set(qn("w:sz"), str(sz)); e.set(qn("w:space"), "0"); e.set(qn("w:color"), color)
        b.append(e)
    tblPr.append(b)


def cell_margins(table, top=40, bottom=40, left=80, right=80):
    tblPr = table._tbl.tblPr
    m = OxmlElement("w:tblCellMar")
    for k, v in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        e = OxmlElement("w:" + k); e.set(qn("w:w"), str(v)); e.set(qn("w:type"), "dxa"); m.append(e)
    tblPr.append(m)


def row_height(row, inches, exact=False):
    trPr = row._tr.get_or_add_trPr()
    h = OxmlElement("w:trHeight")
    h.set(qn("w:val"), str(int(inches * 1440))); h.set(qn("w:hRule"), "exact" if exact else "atLeast")
    trPr.append(h)
    cs = OxmlElement("w:cantSplit"); trPr.append(cs)


def fill_cell(cell, items, size=9.5, first=True, bullet_indent=0.14):
    """items: a string, or a list of strings / ("m", markup) / ("b", bullet text)."""
    if isinstance(items, (str, tuple)):
        items = [items]
    for k, it in enumerate(items):
        p = cell.paragraphs[0] if (first and k == 0) else cell.add_paragraph()
        if isinstance(it, tuple) and it[0] == "m":
            pfmt(p, 0, 1)
            add_math(p, it[1], size + 0.5)
        elif isinstance(it, tuple) and it[0] == "b":
            pfmt(p, 0, 1.5, left=bullet_indent, hang=bullet_indent)
            run(p, "•  ", size)
            rich(p, it[1], size)
        elif isinstance(it, tuple) and it[0] == "n":     # numbered step
            pfmt(p, 0, 1.5, left=0.2, hang=0.2)
            rich(p, it[1], size)
        else:
            pfmt(p, 0, 1.5)
            rich(p, it, size)


def doc_new():
    d = Document()
    st = d.styles["Normal"]
    st.font.name = FONT
    st.element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    st.font.size = Pt(10)
    s = d.sections[0]
    s.page_width, s.page_height = Inches(8.5), Inches(11)
    s.left_margin = s.right_margin = Inches(0.7)
    s.top_margin, s.bottom_margin = Inches(0.55), Inches(0.55)
    return d


def footer(d, text):
    p = d.sections[0].footer.paragraphs[0]
    run(p, text + "  •  page ", 8, color="666666")
    for kind, txt in (("begin", None), (None, "PAGE"), ("end", None)):
        r = p.add_run(); r.font.size = Pt(8)
        if kind:
            fc = OxmlElement("w:fldChar"); fc.set(qn("w:fldCharType"), kind); r._r.append(fc)
        else:
            it = OxmlElement("w:instrText"); it.set(qn("xml:space"), "preserve"); it.text = txt; r._r.append(it)


def gap(d, pts=3):
    p = d.add_paragraph(); pfmt(p, 0, 0)
    p.paragraph_format.line_spacing = Pt(pts)
    run(p, " ", 2)


def box(d, title, items, fill="F2F2F2", size=9.5, border="444444", keep=True):
    t = d.add_table(rows=1, cols=1)
    t.autofit = False
    set_borders(t, 8, border); cell_margins(t, 50, 50, 100, 100)
    c = t.cell(0, 0); c.width = Inches(WIDTH); shade_cell(c, fill)
    if title:
        p = c.paragraphs[0]; pfmt(p, 0, 2); run(p, title, size + 0.5, bold=True)
        fill_cell(c, items, size, first=False)
    else:
        fill_cell(c, items, size)
    row_height(t.rows[0], 0.1)
    gap(d, 4)
    return t


def shade_par(p, fill):
    ppr = p._p.get_or_add_pPr()
    sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), fill)
    ppr.append(sh)


def shade_run(r, fill):
    sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), fill)
    r._element.get_or_add_rPr().append(sh)


def banner(d, num, title, ced, subtitle):
    """Section heading as two shaded paragraphs (they stay with the content that follows)."""
    p = d.add_paragraph(); pfmt(p, 8, 0, keep=True)
    shade_par(p, "D9D9D9")
    r = run(p, " %s " % num, 15, bold=True, color="FFFFFF"); shade_run(r, DARK)
    run(p, "  " + title, 13, bold=True); run(p, "     CED " + ced, 9, color="444444")
    q = d.add_paragraph(); pfmt(q, 0, 4, keep=True)
    shade_par(q, "D9D9D9")
    run(q, " " + subtitle, 9, italic=True, color="333333")


def table(d, rows, widths, header=True, size=9.5, fills=None, first_col_bold=False):
    t = d.add_table(rows=len(rows), cols=len(rows[0]))
    t.autofit = False
    set_borders(t, 6, "555555"); cell_margins(t, 30, 30, 70, 70)
    for i, row in enumerate(rows):
        for j, val in enumerate(row):
            c = t.cell(i, j); c.width = Inches(widths[j])
            if header and i == 0:
                shade_cell(c, "D9D9D9")
                p = c.paragraphs[0]; pfmt(p, 0, 0); run(p, str(val), size, bold=True)
            else:
                fill_cell(c, val, size)
                if first_col_bold and j == 0:
                    for r in c.paragraphs[0].runs:
                        r.bold = True
        row_height(t.rows[i], 0.1)
    for col, w in zip(t.columns, widths):
        col.width = Inches(w)
    for r in t.rows[:-1]:                      # keep a small table on one page
        for c in r.cells:
            for pp in c.paragraphs:
                pp.paragraph_format.keep_with_next = True
    gap(d, 4)
    return t


def figure(d, path, width, caption=None):
    p = d.add_paragraph(); pfmt(p, 0, 1, keep=bool(caption)); p.alignment = 1
    p.add_run().add_picture(path, width=Inches(width))
    if caption:
        p = d.add_paragraph(); pfmt(p, 0, 3); p.alignment = 1
        run(p, caption, 8.5, italic=True, color="444444")


def example(d, ex, solved=False):
    """A numbered example: problem text, then work space (student) or the solution (teacher key)."""
    p = d.add_paragraph(); pfmt(p, 2, 1, left=0.0, keep=True)
    run(p, "Example %s  " % ex["id"], 10, bold=True)
    rich(p, ex["text"], 10)
    if ex.get("parts"):
        for lab, txt in ex["parts"]:
            q = d.add_paragraph(); pfmt(q, 0, 1, left=0.45, hang=0.25, keep=True)
            run(q, lab + "\t", 10, bold=True); rich(q, txt, 10)
    if ex.get("fig"):
        figure(d, IMG[ex["fig"]], 2.4)
    if solved:
        t = d.add_table(rows=1, cols=1); t.autofit = False
        set_borders(t, 4, "AAAAAA"); cell_margins(t, 40, 40, 100, 100)
        c = t.cell(0, 0); c.width = Inches(WIDTH); shade_cell(c, "F2F2F2")
        fill_cell(c, ex["sol"], 9.5)
        row_height(t.rows[0], 0.1)
        gap(d, 4)
    else:
        t = d.add_table(rows=1, cols=1); t.autofit = False
        set_borders(t, 6, "888888"); cell_margins(t, 30, 30, 80, 80)
        c = t.cell(0, 0); c.width = Inches(WIDTH)
        pp = c.paragraphs[0]; pfmt(pp, 0, 0); run(pp, " ", 4)
        row_height(t.rows[0], ex["space"])
        gap(d, 4)


# ------------------------------------------------------------------ worked examples (problem text, work space, solution)
def A(x, n=1):          # numbers for solution lines
    return x


m_ch = D.E2_3["m"]
EX = {}

EX["1.1"] = dict(id="1.1", space=1.55, fig="axes",
    text="2Al + Fe₂O₃ → 2Fe + Al₂O₃     ΔH = −852 kJ/mol{{rxn}}.  Classify the reaction as endothermic or exothermic and sketch its reaction profile on the axes (label reactants, products, Ea and ΔH).",
    sol=["**Exothermic**: ΔH < 0, so the products are lower in energy than the reactants and energy is released to the surroundings.",
         "Sketch: reactants high on the left, a peak (the activation-energy barrier, Ea) above the reactants, and the products on the right 852 kJ lower than the reactants. ΔH is the vertical drop from reactants to products."])

EX["2.1"] = dict(id="2.1", space=0.8,
    text="Equal masses of aluminum (c = 0.900 J/g·°C) and copper (c = 0.385 J/g·°C) are held in the same flame for the same time. Which metal ends at the higher temperature? Explain.",
    sol=["**Copper.** The two metals absorb the same energy q and have the same mass, so ΔT = q ÷ (mc) is larger for the metal with the smaller c.",
         ("m", "{ΔT_{Cu}|ΔT_{Al}} = {c_{Al}|c_{Cu}} = {0.900|0.385} = 2.34")])

EX["2.2"] = dict(id="2.2", space=1.0,
    text="How many joules are needed to heat 25.0 mL of water from 25.0 °C to 30.0 °C? (d = 1.00 g/mL; c = 4.184 J/g·°C)",
    sol=["m = 25.0 mL × 1.00 g/mL = 25.0 g",
         ("m", "q = mcΔT = (25.0 g)({4.184 J|g·°C})(30.0 °C − 25.0 °C) = " + "**5.2 × 10^{2} J**")])

EX["2.3"] = dict(id="2.3", space=1.15,
    text="A 1.50 mol sample of dichloromethane, CH₂Cl₂ (c = 1.188 J/g·°C), at 25.0 °C absorbs 750.0 J. Calculate the final temperature.",
    sol=["Molar mass of CH₂Cl₂ = 84.93 g/mol, so m = 1.50 mol × 84.93 g/mol = %s g" % sig(m_ch, 4),
         ("m", "ΔT = {q|mc} = {750.0 J|(%s g)({1.188 J|g·°C})} = %s °C" % (sig(m_ch, 4), sig(D.E2_3["dT"], 3))),
         "T_f = 25.0 °C + %s °C = **%s °C**" % (sig(D.E2_3["dT"], 3), sig(D.E2_3["Tf"], 3))])

EX["2.4"] = dict(id="2.4", space=1.35,
    text="A 50.0 g sample of metal at 95.0 °C is dropped into 100.0 g of water at 21.0 °C in an insulated cup. The final temperature of both is 25.0 °C. Calculate the specific heat of the metal.",
    sol=[("m", "q_{water} = (100.0 g)({4.184 J|g·°C})(25.0 − 21.0 °C) = %s J" % sig(D.E2_4["q_w"], 4)),
         "The metal lost the same amount of energy: q_metal = −%s J." % sig(D.E2_4["q_w"], 4),
         ("m", "c_{metal} = {q|m ΔT} = {%s J|(50.0 g)(95.0 − 25.0 °C)} = **%s J/g·°C**" % (sig(D.E2_4["q_w"], 4), sig(D.E2_4["c"], 3)))])

EX["3.1"] = dict(id="3.1", space=1.6,
    text="Calculate the energy required to heat 50.0 g of water from 25.0 °C to 115.0 °C at 1 atm. c(l) = 4.184 J/g·°C, c(g) = 1.90 J/g·°C, ΔH_vap = 40.7 kJ/mol.",
    sol=["Three steps: heat the liquid to 100.0 °C, boil it, then heat the gas to 115.0 °C.",
         ("m", "q_{1} = (50.0 g)({4.184 J|g·°C})(100.0 − 25.0 °C) = %s kJ" % sig(D.E3["q1"] / 1000, 4)),
         ("m", "q_{2} = (50.0 g)({1 mol|18.02 g})({40.7 kJ|1 mol}) = %s kJ" % sig(D.E3["q2"] / 1000, 4)),
         ("m", "q_{3} = (50.0 g)({1.90 J|g·°C})(115.0 − 100.0 °C) = %s kJ" % sig(D.E3["q3"] / 1000, 3)),
         ("m", "q_{total} = %s + %s + %s = **1.30 × 10^{2} kJ**" % (sig(D.E3["q1"] / 1000, 4), sig(D.E3["q2"] / 1000, 4), sig(D.E3["q3"] / 1000, 3)))])

EX["4.1"] = dict(id="4.1", space=1.2,
    text="2H₂ + O₂ → 2H₂O     ΔH = −58.0 kJ/mol{{rxn}}.  How much energy is released when 15.0 g of H₂ reacts with excess O₂?",
    sol=[("m", "15.0 g H₂ × {1 mol H₂|2.02 g H₂} × {1 mol{{rxn}}|2 mol H₂} = %s mol{{rxn}}".replace("{{rxn}}", "_{rxn}") % sig(D.E4_1["nrxn"], 4)),
         ("m", "q = (%s mol_{rxn})({−58.0 kJ|1 mol_{rxn}}) = **−215 kJ**   (215 kJ released)" % sig(D.E4_1["nrxn"], 4))])

EX["4.2"] = dict(id="4.2", space=1.2,
    text="N₂ + O₂ → 2NO     ΔH = ? kJ/mol{{rxn}}.  The reaction makes 15.0 g of NO and absorbs 45.0 kJ from the surroundings. Calculate ΔH in kJ/mol{{rxn}}.",
    sol=[("m", "15.0 g NO × {1 mol NO|30.01 g NO} × {1 mol_{rxn}|2 mol NO} = %s mol_{rxn}" % sig(D.E4_2["nrxn"], 4)),
         "The reaction absorbs energy, so q = +45.0 kJ.",
         ("m", "ΔH = {+45.0 kJ|%s mol_{rxn}} = **+180. kJ/mol_{rxn}**" % sig(D.E4_2["nrxn"], 4))])

EX["4.3"] = dict(id="4.3", space=1.6,
    text="2Al + 3CuSO₄ → Al₂(SO₄)₃ + 3Cu.  1.750 g of Al is mixed with 100.0 mL of 0.250 M CuSO₄ and the reaction releases 10.0 kJ. Calculate ΔH in kJ/mol{{rxn}}.",
    sol=[("m", "1.750 g Al × {1 mol|26.98 g} = %s mol Al      →      {%s|2} = %s mol_{rxn}" % (sig(D.E4_3["n_al"], 4), sig(D.E4_3["n_al"], 4), sig(D.E4_3["rxn_al"], 3))),
         ("m", "0.1000 L × {0.250 mol|1 L} = 0.0250 mol CuSO₄      →      {0.0250|3} = %s mol_{rxn}" % sig(D.E4_3["rxn_cu"], 3)),
         "CuSO₄ gives the smaller amount of reaction, so it is the limiting reactant.",
         ("m", "ΔH = {−10.0 kJ|%s mol_{rxn}} = **−1.20 × 10^{3} kJ/mol_{rxn}**" % sig(D.E4_3["nrxn"], 3))])

EX["4.4"] = dict(id="4.4", space=1.45,
    text="NH₄Cl(s) → NH₄⁺(aq) + Cl⁻(aq).  5.9 g of NH₄Cl dissolves in 50.0 g of water, and the temperature falls from 35.0 °C to 30.0 °C. Calculate ΔH for the dissolving in kJ/mol.",
    sol=[("m", "q_{soln} = (50.0 g)({4.184 J|g·°C})(30.0 − 35.0 °C) = %s J" % sig(D.E4_4["q_soln"], 4)),
         "q_rxn = −q_soln = +1046 J = +1.046 kJ (the dissolving absorbed energy from the water).",
         ("m", "n = 5.9 g × {1 mol|53.49 g} = %s mol      ΔH = {+1.046 kJ|%s mol} = **+9.5 kJ/mol**" % (sig(D.E4_4["n"], 3), sig(D.E4_4["n"], 3)))])

EX["4.5"] = dict(id="4.5", space=1.35,
    text="NaOH(s) → Na⁺(aq) + OH⁻(aq)     ΔH = −45 kJ/mol.  2.50 g of NaOH dissolves in 50.0 g of water at 25.0 °C. Calculate the final temperature of the water.",
    sol=[("m", "n = 2.50 g × {1 mol|40.00 g} = 0.0625 mol      q = 0.0625 mol × {45 kJ|1 mol} = 2.81 kJ released into the water"),
         ("m", "ΔT = {q|mc} = {2812 J|(50.0 g)({4.184 J|g·°C})} = %s °C" % sig(D.E4_5["dT"], 3)),
         "T_f = 25.0 + %s = **%s °C**" % (sig(D.E4_5["dT"], 3), sig(D.E4_5["Tf"], 3))])

EX["4.6"] = dict(id="4.6", space=1.55,
    text="NaOH + HCl → NaCl + H₂O.  50.0 mL of 1.0 M HCl and 100.0 mL of 1.0 M NaOH are mixed and the temperature of the solution rises by 4.6 °C. Calculate ΔH in kJ/mol{{rxn}}. (Density of the solution = 1.0 g/mL; c = 4.184 J/g·°C.)",
    sol=[("m", "q = mcΔT = (150.0 g)({4.184 J|g·°C})(4.6 °C) = %s J = %s kJ released" % (sig(D.E4_6["q"], 4), sig(D.E4_6["q"] / 1000, 3))),
         "HCl is limiting: 0.0500 mol HCl = 0.0500 mol_rxn (NaOH is in excess, 0.100 mol).",
         ("m", "ΔH = {−%s kJ|0.0500 mol_{rxn}} = **−58 kJ/mol_{rxn}**" % sig(D.E4_6["q"] / 1000, 3))])

EX["5.1"] = dict(id="5.1", space=1.5,
    text="Balance the combustion of propane, then calculate ΔH°{{rxn}} using the table:  C₃H₈(g) + O₂(g) → CO₂(g) + H₂O(l).",
    sol=["Balanced: C₃H₈ + 5O₂ → 3CO₂ + 4H₂O(l)",
         ("m", "ΔH°_{rxn} = [3(−393.5) + 4(−286)] − [(−103.8) + 5(0)]"),
         ("m", "= −2324.5 − (−103.8) = **−2221 kJ/mol_{rxn}**")])

EX["5.2"] = dict(id="5.2", space=1.3,
    text="Use the bond enthalpies to estimate ΔH for CH₄(g) + 2O₂(g) → CO₂(g) + 2H₂O(g).",
    sol=[("m", "bonds broken: 4(C–H) + 2(O=O) = 4(413) + 2(498) = %d kJ" % D.E5_2_broken),
         ("m", "bonds formed: 2(C=O) + 4(O–H) = 2(799) + 4(463) = %d kJ" % D.E5_2_formed),
         ("m", "ΔH = %d − %d = **−802 kJ/mol_{rxn}**" % (D.E5_2_broken, D.E5_2_formed))])

EX["6.1"] = dict(id="6.1", space=1.55,
    text="Use the steps below to find ΔH for the production of 2-methylpropene:  C₄H₁₀O(l) → C₄H₈(g) + H₂O(g).",
    parts=[("(1)", "4C(s) + 5H₂(g) + ½O₂(g) → C₄H₁₀O(l)     ΔH = −335 kJ"), ("(2)", "4C(s) + 4H₂(g) → C₄H₈(g)     ΔH = −17 kJ"),
           ("(3)", "H₂(g) + ½O₂(g) → H₂O(g)     ΔH = −242 kJ")],
    sol=["Reverse (1) so C₄H₁₀O is a reactant: ΔH = +335 kJ. Keep (2) and (3) as written. Add: C, H₂ and O₂ all cancel.",
         ("m", "ΔH = +335 + (−17) + (−242) = **+76 kJ/mol_{rxn}**")])

EX["6.2"] = dict(id="6.2", space=1.8,
    text="Find ΔH for the formation of quinone:  C₆H₄(OH)₂(aq) + H₂O₂(aq) → C₆H₄O₂(aq) + 2H₂O(l).",
    parts=[("(1)", "C₆H₄(OH)₂(aq) → C₆H₄O₂(aq) + H₂(g)     ΔH = +177.4 kJ"), ("(2)", "H₂(g) + O₂(g) → H₂O₂(aq)     ΔH = −191.2 kJ"),
           ("(3)", "H₂(g) + ½O₂(g) → H₂O(g)     ΔH = −241.8 kJ"), ("(4)", "H₂O(g) → H₂O(l)     ΔH = −43.8 kJ")],
    sol=["Keep (1). Reverse (2) so H₂O₂ is a reactant (+191.2). Multiply (3) by 2 (−483.6) and (4) by 2 (−87.6) to make 2H₂O(l). H₂, O₂ and H₂O(g) cancel.",
         ("m", "ΔH = +177.4 + 191.2 + 2(−241.8) + 2(−43.8) = **−202.6 kJ/mol_{rxn}**")])

EX["7.1"] = dict(id="7.1", space=0.1, text="", sol=[])     # placeholder (table is drawn in the section)
EX["7.2"] = dict(id="7.2", space=1.1,
    text="Calculate ΔS° for 2NO(g) + O₂(g) → 2NO₂(g) using S°: NO = 211, O₂ = 205, NO₂ = 240 J/mol·K.",
    sol=[("m", "ΔS° = 2(240) − [2(211) + 205] = 480 − 627 = **−147 J/mol·K**"),
         "The sign matches the prediction: three moles of gas become two."])

EX["8.1"] = dict(id="8.1", space=1.3,
    text="N₂(g) + 3H₂(g) → 2NH₃(g)     ΔH° = −64 kJ/mol{{rxn}}.",
    parts=[("a.", "Is the reaction favorable at low temperature, high temperature, or all temperatures? Justify."),
           ("b.", "If the reaction is run at high temperature, what happens in terms of equilibrium?")],
    sol=["a. ΔH < 0, and ΔS < 0 (4 mol of gas → 2 mol of gas). ΔG = ΔH − TΔS: the −TΔS term is positive, so ΔG is negative only when T is low. **Favorable at low temperature only.**",
         "b. At high temperature ΔG becomes positive, so K gets smaller and the equilibrium shifts toward the reactants (N₂ and H₂); the yield of NH₃ falls."])

EX["8.2"] = dict(id="8.2", space=1.8,
    text="CaCO₃(s) → CaO(s) + CO₂(g)     ΔH° = +192 kJ/mol{{rxn}},  ΔS° = +373 J/mol·K.",
    parts=[("a.", "Calculate ΔG° at 298 K."), ("b.", "At what temperature does the reaction become favorable?"),
           ("c.", "A student heats the solid to a temperature above your answer to (b) but sees no reaction. Explain.")],
    sol=[("m", "a. ΔG° = ΔH° − TΔS° = 192 kJ − (298 K)({0.373 kJ|K}) = **+%s kJ/mol_{rxn}** (not favorable at 298 K)" % sig(D.E8_2["dG"], 3)),
         ("m", "b. ΔG° = 0 at T = {ΔH°|ΔS°} = {192 kJ|0.373 kJ/K} = **%s K**; favorable above this temperature (ΔH > 0 and ΔS > 0)." % sig(D.E8_2["T"], 3)),
         "c. ΔG° < 0 only shows the reaction is thermodynamically favorable. It says nothing about the rate: a large activation energy can make the reaction too slow to observe (kinetic control). The reaction can also stop at equilibrium if CO₂ cannot escape (Q reaches K)."])

EX["9.1"] = dict(id="9.1", space=1.7,
    text="COCl₂(g) ⇌ CO(g) + Cl₂(g)     ΔH° = +17 kJ/mol{{rxn}},  ΔS° = +291 J/mol·K.",
    parts=[("a.", "Calculate K at 298 K."), ("b.", "The reaction is repeated at 315 K. Does K increase, decrease or stay the same? Justify.")],
    sol=[("m", "a. ΔG° = 17 kJ − (298 K)({0.291 kJ|K}) = %s kJ/mol_{rxn}" % sig(D.E9_1["dG"], 3)),
         ("m", "ln K = {−ΔG°|RT} = {+%s J/mol|(8.314 J/mol·K)(298 K)} = %s      K = **%s**" % (sig(-D.E9_1["dG"] * 1000, 3), sig(D.E9_1["lnK"], 4), sci(D.E9_1["K"], 2))),
         "b. **K increases.** The reaction is endothermic (ΔH > 0), so a higher temperature favors the products; also −TΔS grows more negative, so ΔG° = %s kJ at 315 K is more negative than at 298 K." % sig(D.E9_1["dG315"], 3)])

EX["9.2"] = dict(id="9.2", space=1.8,
    text="P₄(s) + 6Cl₂(g) → 4PCl₃(l).  ΔG°f: P₄ = 24.4, Cl₂ = 0, PCl₃ = −270 kJ/mol.",
    parts=[("a.", "Predict the sign of ΔS° and justify."), ("b.", "Calculate ΔG°."), ("c.", "Predict the sign of ΔH° from your answers to (a) and (b). Explain.")],
    sol=["a. **Negative.** Six moles of gas become a liquid, so the number of microstates drops sharply.",
         ("m", "b. ΔG° = 4(−270) − [24.4 + 6(0)] = **%s kJ/mol_{rxn}**" % sig(D.E9_2["dG"], 4)),
         "c. **Negative.** ΔH° = ΔG° + TΔS°. ΔG° is very negative and TΔS° is also negative (ΔS° < 0), so ΔH° is even more negative than ΔG°. The reaction is exothermic."])

EX["9.3"] = dict(id="9.3", space=1.9,
    text="2NO(g) + O₂(g) → 2NO₂(g)     ΔH° = −112 kJ/mol{{rxn}}.",
    parts=[("a.", "Using ΔS° from Example 7.2, calculate K at 298 K."), ("b.", "Describe two ways to increase the yield of NO₂.")],
    sol=[("m", "a. ΔG° = −112 kJ − (298 K)({−0.147 kJ|K}) = %s kJ/mol_{rxn}" % sig(D.E9_3["dG"], 3)),
         ("m", "ln K = {+%s J/mol|(8.314 J/mol·K)(298 K)} = %s      K = **%s**" % (sig(-D.E9_3["dG"] * 1000, 3), sig(D.E9_3["lnK"], 4), sci(D.E9_3["K"], 2))),
         "b. (1) **Lower the temperature:** the reaction is exothermic, so K increases. (2) **Increase the pressure** (decrease the volume): 3 mol of gas become 2, so the equilibrium shifts toward NO₂. (Also acceptable: add excess O₂ or NO, or remove NO₂ as it forms.)"])

EX["9.4"] = dict(id="9.4", space=1.4,
    text="Glucose + Pᵢ → glucose-6-phosphate + H₂O  ΔG° = +13.8 kJ/mol.   ATP + H₂O → ADP + Pᵢ  ΔG° = −30.5 kJ/mol.  Explain how a cell makes the first reaction happen and calculate the ΔG° for the coupled process.",
    sol=["The two reactions share the phosphate (Pᵢ) as a common intermediate: the energy released by the favorable ATP hydrolysis drives the unfavorable phosphorylation.",
         ("m", "ΔG°_{net} = (+13.8) + (−30.5) = **−16.7 kJ/mol**   (net favorable)")])


def sign_table_rows():
    return [("A substance condenses into a liquid", "−", "gas → liquid: fewer microstates"),
            ("The air in a tire cools down in the winter", "−", "lower temperature: less energy dispersal"),
            ("Salt crystals precipitate out of solution", "−", "ions in solution → ordered solid"),
            ("The production of ammonia gas from nitrogen and hydrogen gas", "−", "4 mol of gas → 2 mol of gas"),
            ("The decomposition of solid sodium azide into sodium metal and nitrogen gas", "+", "a solid makes a gas: more microstates"),
            ("Compressing 25 liters of oxygen gas", "−", "smaller volume: fewer positions available")]


# ------------------------------------------------------------------ the student notes
def build_notes(solved=False):
    d = doc_new()
    footer(d, "AP Chemistry  •  Unit 6: Thermochemistry and Free Energy" + ("  •  TEACHER KEY" if solved else ""))

    def sec(num, title, ced, sub):
        banner(d, num, title, ced, sub)

    def ex(i):
        example(d, EX[i], solved=solved)

    # ---------- page 1: title, unit map, equations
    if not solved:
        p = d.add_paragraph(); pfmt(p, 0, 0); run(p, "AP Chemistry Unit 6", 11, bold=True, color="444444")
        p = d.add_paragraph(); pfmt(p, 0, 2); run(p, "Thermochemistry and Free Energy", 22, bold=True)
        p = d.add_paragraph(); pfmt(p, 0, 4); run(p, "Name: ______________________     Date: ______________     Period: ______", 10.5)
        box(d, "How to use these notes", [
            "Each section gives the key ideas in full. Examples are for us to work together: show the setup with units and finish with a labeled answer. "
            "The 20 warm-up multiple-choice questions at the back are for the start of class."], size=9.5)
    else:
        p = d.add_paragraph(); pfmt(p, 0, 0); run(p, "AP Chemistry Unit 6: Thermochemistry and Free Energy", 16, bold=True)
        p = d.add_paragraph(); pfmt(p, 0, 4); run(p, "TEACHER KEY: worked solutions to every example and the warm-up answers", 11, bold=True, color="444444")
    table(d, [["#", "Section", "CED topics"],
              ["1", "Endothermic and Exothermic Processes", "6.1 Endothermic and exothermic processes, 6.2 Energy diagrams"],
              ["2", "Heat Transfer and Heat Capacity", "6.3 Heat transfer and thermal equilibrium, 6.4 Heat capacity and calorimetry"],
              ["3", "Phase Changes and Heating Curves", "6.5 Energy of phase changes"],
              ["4", "Enthalpy of Reaction and Calorimetry", "6.6 Introduction to enthalpy of reaction, 6.4"],
              ["5", "Enthalpy of Formation and Bond Enthalpies", "6.7 Bond enthalpies, 6.8 Enthalpy of formation"],
              ["6", "Hess's Law", "6.9 Hess's law"],
              ["7", "Entropy", "9.1 Introduction to entropy, 9.2 Absolute entropy and entropy change"],
              ["8", "Gibbs Free Energy and Favorability", "9.3 Gibbs free energy and thermodynamic favorability, 9.4 Thermodynamic and kinetic control"],
              ["9", "Free Energy, Equilibrium and Coupled Reactions", "9.5 Free energy and equilibrium, 9.6 Coupled reactions"]],
          [0.35, 2.75, 4.0], size=9, first_col_bold=True)
    table(d, [["Equations used in this unit", ""],
              ["Heat", ("m", "q = mcΔT")],
              ["Enthalpy of reaction", ("m", "ΔH°_{rxn} = ΣnΔH°_{f}(products) − ΣnΔH°_{f}(reactants)")],
              ["Bond enthalpies", ("m", "ΔH_{rxn} = Σ(bonds broken) − Σ(bonds formed)")],
              ["Entropy change", ("m", "ΔS°_{rxn} = ΣnS°(products) − ΣnS°(reactants)")],
              ["Gibbs free energy", ("m", "ΔG° = ΔH° − TΔS°")],
              ["Free energy and K", ("m", "ΔG° = −RT ln K          R = 8.314 J/mol·K,  T in kelvin")]],
          [2.0, 5.1], size=9)

    # ---------- 1
    sec(1, "Endothermic and Exothermic Processes", "6.1, 6.2", "energy flow • sign of ΔH • reaction profiles and activation energy")
    box(d, "Key ideas", [
        ("b", "The **system** is the process being studied; the **surroundings** are everything else. Physical changes and chemical reactions can both be endothermic or exothermic."),
        ("b", "**Endothermic:** the system absorbs energy from the surroundings. The surroundings get colder, ΔH > 0, and the products are higher in energy than the reactants."),
        ("b", "**Exothermic:** the system releases energy to the surroundings. The surroundings get warmer, ΔH < 0, and the products are lower in energy than the reactants."),
        ("b", "Breaking bonds or attractions between particles requires energy. Forming bonds or attractions releases energy. The sign of ΔH comes from which one is larger."),
        ("b", "ΔH is the energy change of the process, in kJ per mole of reaction (kJ/mol{{rxn}}) for a balanced equation. **Activation energy (Ea)** is the barrier the reactants must climb to reach the transition state; Ea(reverse) = Ea(forward) − ΔH."),
    ])
    table(d, [["Process", "Type", "Why"],
              ["Vaporizing water", "endothermic", "attractions between molecules are overcome; energy is absorbed"],
              ["Freezing water", "exothermic", "attractions form between molecules; energy is released"],
              ["Combustion of methane", "exothermic", "the bonds formed in CO₂ and H₂O are stronger than the bonds broken in CH₄ and O₂"],
              ["Dissolving ammonium nitrate", "endothermic", "the solution gets cold: more energy is needed to separate the ions than is released when they are hydrated"]],
          [1.9, 1.0, 4.2], size=9)
    figure(d, IMG["profiles"], 5.2)
    ex("1.1")

    # ---------- 2
    sec(2, "Heat Transfer and Heat Capacity", "6.3, 6.4", "thermal equilibrium • specific heat • q = mcΔT")
    box(d, "Key ideas", [
        ("b", "Heat (q) is energy transferred because of a temperature difference. It flows from the hotter object to the colder one until both are at the same temperature (**thermal equilibrium**). Temperature is a measure of the average kinetic energy of the particles."),
        ("b", "Energy is conserved. In an insulated system, q(lost) = −q(gained), so the heats add to zero."),
        ("b", "**Specific heat capacity (c)** is the energy needed to raise the temperature of 1 g of a substance by 1 °C. A substance with a large c changes temperature slowly; water (4.184 J/g·°C) has a large c."),
        ("m", "q = mcΔT          ΔT = T_{final} − T_{initial}          q > 0 energy absorbed,   q < 0 energy released"),
    ])
    table(d, [["Substance", "Specific heat (J/g·°C)"], ["Water (l)", "4.184"], ["Aluminum", "0.900"], ["Copper", "0.385"]],
          [2.2, 2.2], size=9)
    ex("2.1"); ex("2.2"); ex("2.3"); ex("2.4")

    # ---------- 3
    sec(3, "Phase Changes and Heating Curves", "6.5", "temperature stays constant during a phase change • q = mcΔT vs q = nΔH")
    figure(d, IMG["heating"], 3.9)
    table(d, [["Segment", "What is happening", "Energy equation"],
              ["A → B", "the solid warms (average kinetic energy rises)", ("m", "q = mc_{solid}ΔT")],
              ["B → C", "the solid melts; temperature is constant because the energy goes into potential energy (attractions overcome), not kinetic energy", ("m", "q = nΔH_{fus}")],
              ["C → D", "the liquid warms", ("m", "q = mc_{liquid}ΔT")],
              ["D → E", "the liquid boils; temperature is constant while the particles are separated", ("m", "q = nΔH_{vap}")],
              ["E → F", "the gas warms", ("m", "q = mc_{gas}ΔT")]],
          [0.8, 4.3, 2.0], size=9)
    box(d, None, [("b", "ΔH_fus and ΔH_vap are in kJ per **mole**, so convert grams to moles first. Add the energy for every segment. Condensing and freezing release the same amounts of energy that vaporizing and melting absorb.")], size=9.5)
    ex("3.1")

    # ---------- 4
    sec(4, "Enthalpy of Reaction and Calorimetry", "6.6, 6.4", "ΔH per mole of reaction • limiting reactants • q(rxn) = −q(surroundings)")
    box(d, "Key ideas", [
        ("b", "ΔH is for the reaction **as written**. One mole of reaction (mol{{rxn}}) is the amount that matches the coefficients. Reversing a reaction changes the sign of ΔH; multiplying the equation multiplies ΔH."),
        ("n", "**Energy from a given amount:**  (1) convert the given substance to moles;  (2) divide by its coefficient to get mol{{rxn}};  (3) multiply by ΔH. With two reactants, the limiting reactant sets the mol{{rxn}}."),
        ("b", "**Calorimetry** finds q from the surroundings: q(solution) = mcΔT, and q(rxn) = −q(solution). Then ΔH = q(rxn) ÷ mol{{rxn}}. Assume a coffee-cup calorimeter (constant pressure), no heat lost, and c = 4.184 J/g·°C for the solution."),
        ("b", "A temperature **rise** means the reaction released energy (exothermic, ΔH < 0). A temperature **drop** means it absorbed energy (endothermic, ΔH > 0)."),
    ])
    ex("4.1"); ex("4.2"); ex("4.3"); ex("4.4"); ex("4.5"); ex("4.6")

    # ---------- 5
    sec(5, "Enthalpy of Formation and Bond Enthalpies", "6.7, 6.8", "ΔH°f • products minus reactants • bonds broken minus bonds formed")
    box(d, "Key ideas", [
        ("b", "The **enthalpy of formation (ΔH°f)** is the energy change when 1 mol of a compound forms from its elements in their standard states at 298 K and 1 atm. ΔH°f of an element in its standard state is 0 (H₂, O₂, C(graphite))."),
        ("m", "ΔH°_{rxn} = ΣnΔH°_{f}(products) − ΣnΔH°_{f}(reactants)          n = coefficient from the balanced equation"),
        ("b", "**Bond enthalpy** is the energy to break one mole of a bond in the gas phase (average values). Breaking bonds absorbs energy (+); forming bonds releases energy (−)."),
        ("m", "ΔH_{rxn} = Σ(bond enthalpies of bonds broken) − Σ(bond enthalpies of bonds formed)"),
    ])
    table(d, [["Compound", "ΔH°f (kJ/mol)", "", "Bond", "Enthalpy (kJ/mol)"],
              ["H₂(g), O₂(g)", "0", "", "C–H", "413"],
              ["CH₄(g)", "−74.6", "", "O–H", "463"],
              ["C₂H₆(g)", "−84.0", "", "O=O", "498"],
              ["C₂H₄(g)", "+52.4", "", "C=O (in CO₂)", "799"],
              ["C₃H₈(g)", "−103.8", "", "H–H", "436"],
              ["CO₂(g)", "−393.5", "", "Cl–Cl", "243"],
              ["H₂O(l)", "−286", "", "H–Cl", "431"],
              ["H₂O(g)", "−241.8", "", "", ""]],
          [1.6, 1.4, 0.3, 1.6, 1.6], size=9)
    ex("5.1"); ex("5.2")

    # ---------- 6
    sec(6, "Hess's Law", "6.9", "enthalpy is a state function • reverse, multiply, add")
    box(d, "Key ideas", [
        ("b", "ΔH depends only on the starting and ending states, not on the path. So the ΔH of a reaction equals the sum of the ΔH values of any series of steps that add up to it."),
        ("n", "**Reverse** a step → change the sign of ΔH."),
        ("n", "**Multiply** a step by a number → multiply ΔH by the same number."),
        ("n", "**Add** the steps. Species that appear on both sides cancel. The ΔH values add."),
        ("b", "Start with a substance that appears in only one step and match its side and coefficient to the target equation."),
    ])
    ex("6.1"); ex("6.2")

    # ---------- 7
    sec(7, "Entropy", "9.1, 9.2", "microstates • predicting the sign of ΔS • ΔS° from tables")
    box(d, "Key ideas", [
        ("b", "**Entropy (S)** measures the number of ways (microstates) the particles and their energy can be arranged. More ways means higher entropy. Units: J/mol·K."),
        ("b", "ΔS > 0 for: solid → liquid → gas; a reaction that makes more moles of gas; dissolving most solids in a liquid (generally); increasing the volume or decreasing the pressure of a gas; raising the temperature; breaking one molecule into several."),
        ("b", "ΔS < 0 for the opposites: condensing or freezing, fewer moles of gas, precipitating, compressing a gas, cooling. **Count the moles of gas first.**"),
        ("m", "ΔS°_{rxn} = ΣnS°(products) − ΣnS°(reactants)"),
    ])
    figure(d, IMG["entropy"], 3.8)
    p = d.add_paragraph(); pfmt(p, 2, 1, keep=True); run(p, "Example 7.1  ", 10, bold=True); run(p, "Predict the sign of ΔS for each change and give a reason.", 10)
    rows = [["Change", "Sign of ΔS", "Reason"]]
    for a, b, c in sign_table_rows():
        rows.append([a, b if solved else "", c if solved else ""])
    t = table(d, rows, [3.9, 0.9, 2.3], size=9)
    if not solved:
        for r in t.rows[1:]:
            row_height(r, 0.32)
    ex("7.2")

    # ---------- 8
    sec(8, "Gibbs Free Energy and Favorability", "9.3, 9.4", "ΔG = ΔH − TΔS • temperature and favorability • thermodynamics vs kinetics")
    box(d, "Key ideas", [
        ("m", "ΔG° = ΔH° − TΔS°          T in kelvin; convert ΔS from J to kJ (÷ 1000) before combining with ΔH"),
        ("b", "**ΔG < 0:** thermodynamically favorable (the forward reaction proceeds). **ΔG > 0:** not favorable as written (the reverse is favorable). **ΔG = 0:** at equilibrium."),
        ("b", "**Thermodynamic and kinetic control:** ΔG tells whether a reaction can happen; the activation energy tells how fast. A favorable reaction can be extremely slow (diamond → graphite)."),
    ])
    table(d, [["ΔH", "ΔS", "−TΔS", "Favorable (ΔG < 0)?"],
              ["−", "+", "−", "at all temperatures"],
              ["+", "−", "+", "at no temperature"],
              ["−", "−", "+", "only at low temperatures (when |ΔH| > |TΔS|)"],
              ["+", "+", "−", "only at high temperatures (when TΔS > ΔH)"]],
          [0.8, 0.8, 0.9, 4.6], size=9)
    box(d, None, [("m", "When ΔG = 0 the temperature is the crossover point:   T = {ΔH|ΔS}")], size=9.5)
    ex("8.1"); ex("8.2")

    # ---------- 9
    sec(9, "Free Energy, Equilibrium and Coupled Reactions", "9.5, 9.6", "ΔG° and K • ΔG, Q and K • coupling an unfavorable reaction")
    box(d, "Key ideas", [
        ("m", "ΔG° = −RT ln K          R = 8.314 J/mol·K,  T in kelvin,  ΔG° in joules"),
        ("m", "ΔG = ΔG° + RT ln Q"),
        ("b", "The ° symbol means standard conditions (1 atm for gases, 1 M for solutions)."),
    ])
    table(d, [["ΔG°", "K", "At equilibrium"], ["negative", "K > 1", "products are favored"], ["positive", "K < 1", "reactants are favored"], ["zero", "K = 1", "reactants and products are balanced"]],
          [1.2, 1.2, 4.7], size=9)
    table(d, [["ΔG (any conditions)", "Q compared with K", "What the mixture does"],
              ["negative", "Q < K", "proceeds forward, toward products"],
              ["positive", "Q > K", "proceeds in reverse, toward reactants"],
              ["zero", "Q = K", "is at equilibrium"]], [1.7, 1.7, 3.7], size=9)
    box(d, None, [
        ("b", "K changes with temperature: because ΔG° = ΔH° − TΔS°, K increases with T for an endothermic reaction and decreases with T for an exothermic reaction (the same result as Le Châtelier's principle)."),
        ("b", "**Coupled reactions:** an unfavorable reaction (ΔG > 0) can be driven by a favorable reaction (ΔG < 0) when the two share an intermediate. The ΔG values add, and the pair works if the sum is negative."),
    ], size=9.5)
    ex("9.1"); ex("9.2"); ex("9.3"); ex("9.4")

    # ---------- warm-up multiple choice
    if not solved:
        p = d.add_paragraph(); p.paragraph_format.page_break_before = True
        pfmt(p, 0, 2, keep=True); p.paragraph_format.page_break_before = True
        run(p, "Warm-up Multiple Choice", 15, bold=True)
        p = d.add_paragraph(); pfmt(p, 0, 3)
        run(p, "20 questions for the start of class. Use a calculator and periodic table; R = 8.314 J/mol·K and c(water) = 4.184 J/g·°C where needed.", 9, color="444444")
        sec_ = d.add_section(WD_SECTION.CONTINUOUS)
        cols = OxmlElement("w:cols"); cols.set(qn("w:num"), "2"); cols.set(qn("w:space"), "360")
        sec_._sectPr.append(cols)
        for n, (topic, q, right, wrong, why) in enumerate(D.MC, 1):
            lst = list(wrong); lst.insert(D.POS[n - 1], right)
            p = d.add_paragraph(); pfmt(p, 4, 1, left=0.28, hang=0.28, keep=True)
            run(p, "%d." % n, 9.5, bold=True); rich(p, "\t**" + q + "**", 9.5)
            for k, ch in enumerate(lst):
                p = d.add_paragraph(); pfmt(p, 0, 0.5, left=0.55, hang=0.25, keep=(k < 3))
                rich(p, "%s.\t%s" % ("ABCD"[k], ch), 9.5)
    else:
        sec_title = d.add_paragraph(); sec_title.paragraph_format.page_break_before = True
        pfmt(sec_title, 0, 3, keep=True)
        run(sec_title, "Warm-up Multiple Choice: Answers and Reasons", 14, bold=True)
        rows = [["#", "Sec.", "Ans", "Correct choice and why"]]
        for n, (topic, q, right, wrong, why) in enumerate(D.MC, 1):
            rows.append([str(n), topic, "ABCD"[D.POS[n - 1]], [("x", None)]])
        t = d.add_table(rows=len(rows), cols=4); t.autofit = False
        set_borders(t, 6, "555555"); cell_margins(t, 30, 30, 70, 70)
        widths = [0.35, 0.45, 0.45, 5.85]
        for i, row in enumerate(rows):
            for j in range(4):
                c = t.cell(i, j); c.width = Inches(widths[j])
                if i == 0:
                    shade_cell(c, "D9D9D9"); run(c.paragraphs[0], str(row[j]), 9, bold=True)
                elif j < 3:
                    pfmt(c.paragraphs[0], 0, 0); run(c.paragraphs[0], str(row[j]), 9, bold=(j == 2))
                else:
                    topic, q, right, wrong, why = D.MC[i - 1]
                    pp = c.paragraphs[0]; pfmt(pp, 0, 1); rich(pp, q, 8.5, color="444444", italic=True)
                    pp = c.add_paragraph(); pfmt(pp, 0, 0); rich(pp, "**" + right + ".**  ", 9); rich(pp, why, 9)
            row_height(t.rows[i], 0.1)
        for col, w in zip(t.columns, widths):
            col.width = Inches(w)
        gap(d, 4)
        pat = " ".join("%d%s" % (i, "ABCD"[p_]) for i, p_ in enumerate(D.POS, 1))
        p = d.add_paragraph(); pfmt(p, 4, 0); run(p, "Answer pattern: " + pat, 9, color="555555")
    return d


NOTES_FIX = [
    "**CED alignment.** I could not open the College Board CED from this environment (the site is blocked), so the topic numbers above (6.1 to 6.9 and 9.1 to 9.6) and their titles are from my knowledge of the CED. Please compare them with your copy.",
    "**Topics added beyond your notes** (they are in the CED): bond enthalpies (6.7), thermal equilibrium (6.3), energy diagrams/activation energy (6.2), thermodynamic vs kinetic control (9.4) and coupled reactions (9.6). Each is a short box or one example. Cut them if you do not teach them.",
    "**Numbers I changed so a problem can be solved:** Example 4.6 used 0.10 M solutions with a 4.6 °C rise (that gives −577 kJ/mol); I used 1.0 M, which gives the expected −58 kJ/mol. Example 5.1 needed ΔH°f for C₃H₈, which was missing from the table; I added −103.8 kJ/mol. Example 9.1 had no temperature; I used 298 K.",
    "**Numbers left as in your notes that are not realistic** (the problems still work): 2H₂ + O₂ → 2H₂O with ΔH = −58.0 (real value about −484 kJ/mol for water vapor); N₂ + 3H₂ → 2NH₃ with ΔH° = −64 (real −92 kJ/mol); CaCO₃ with ΔH° = +192 and ΔS° = +373 (real about +178 kJ and +161 J/mol·K); COCl₂ with ΔH° = +17 and ΔS° = +291 (real about +108 kJ and +131 J/mol·K). Tell me if you want them replaced.",
    "**Sig figs:** answers follow the data. For Example 2.2 the ΔT of 5.0 °C has two significant figures, so 523 J is reported as 5.2 × 10² J.",
    "**Calorimetry assumptions** stated in the notes: coffee-cup calorimeter, no heat lost, c = 4.184 J/g·°C, and the mass used is the mass of the solution (water) given in each problem.",
]


def build_key():
    d = build_notes(solved=True)
    # insert the planning notes right after the first table block by appending a page at the end of the key
    p = d.add_paragraph(); p.paragraph_format.page_break_before = True
    pfmt(p, 0, 3, keep=True); run(p, "Planning notes for the teacher", 14, bold=True)
    for t in NOTES_FIX:
        q = d.add_paragraph(); pfmt(q, 0, 4, left=0.2, hang=0.2); run(q, "•  ", 9.5); rich(q, t, 9.5)
    return d


if __name__ == "__main__":
    s = os.path.join(OUT, "AP Chem Unit 6 - Thermochemistry and Free Energy - NOTES.docx")
    k = os.path.join(OUT, "AP Chem Unit 6 - Thermochemistry and Free Energy - TEACHER KEY.docx")
    build_notes().save(s); print(s)
    build_key().save(k); print(k)
