"""Builds the Unit 5 (Moles) one-page FREE RESPONSE test in three versions (A, B, C) plus one teacher key.

Question 1: lab data for a transition metal heated in oxygen gas -> empirical formula of the oxide
            (a) masses, (b) grams -> atoms of the metal, (c) empirical formula, (d) balanced equation.
Question 2: lab data for a hydrate heated to constant mass
            (a) mass of water and percent water by mass, (b) moles, (c) x / formula / name, (d) error analysis.
Each version uses a different metal (oxide ratio 2:3, 2:5, 3:4) and a different hydrate (x = 2, 7, 6).

Every answer is computed here from the data. The asserts fail if the data do not give a clean formula, so a bad
set of numbers can never reach a student.   Run:  python3 make_fr_tests.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from docx.shared import Pt, Inches
from make_unit5_test import (new_doc, footer, fmt, run, rich, rule, shade, OxmlElement, qn,
                             NA, MASS, mm, sci, sf)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Free Response Tests")
MASS = dict(MASS, Cr=52.00, V=50.94, Mn=54.94)        # transition metals (not in the packet table)
M_O = MASS["O"]
M_H2O = mm("H2O")

# ------------------------------------------------------------------ the three versions
VERSIONS = [
    dict(ver="A",
         metal="chromium", sym="Cr", oxide="Cr₂O₃", sub=(2, 3), crucible=21.35, m_metal=1.50,
         eq="4 Cr + 3 O₂ → 2 Cr₂O₃",
         salt="barium chloride", salt_f="BaCl₂", salt_mm=mm("BaCl2"), x=2, hyd_name="barium chloride dihydrate",
         hyd_f="BaCl₂ · xH₂O", hyd_c=23.88, m_hyd=3.00,
         err="The student stopped heating before the mass was constant, so some water was still in the solid.",
         err_dir="low",
         err_why="Less water was driven off, so the measured mass of water lost is too small and the mass left (counted as BaCl₂) is too large. Moles of water ÷ moles of BaCl₂ then comes out too small, so x is too low."),
    dict(ver="B",
         metal="vanadium", sym="V", oxide="V₂O₅", sub=(2, 5), crucible=19.87, m_metal=1.20,
         eq="4 V + 5 O₂ → 2 V₂O₅",
         salt="magnesium sulfate", salt_f="MgSO₄", salt_mm=mm("MgSO4"), x=7, hyd_name="magnesium sulfate heptahydrate",
         hyd_f="MgSO₄ · xH₂O", hyd_c=22.46, m_hyd=3.00,
         err="After heating, the anhydrous solid sat uncovered while it cooled and absorbed water vapor from the air before its final mass was measured.",
         err_dir="low",
         err_why="The final mass is too large, so the calculated mass of water lost is too small and the calculated mass of MgSO₄ is too large. Moles of water ÷ moles of MgSO₄ then comes out too small, so x is too low."),
    dict(ver="C",
         metal="manganese", sym="Mn", oxide="Mn₃O₄", sub=(3, 4), crucible=20.64, m_metal=1.50, metal_given=True,
         eq="3 Mn + 2 O₂ → Mn₃O₄",
         salt="cobalt(II) chloride", salt_f="CoCl₂", salt_mm=mm("CoCl2"), x=6, hyd_name="cobalt(II) chloride hexahydrate",
         hyd_f="CoCl₂ · xH₂O", hyd_c=24.11, m_hyd=3.00,
         err="While the hydrate was heated, a few small pieces of solid spattered out of the crucible.",
         err_dir="high",
         err_why="Lost solid makes the final mass too small, so the calculated mass of water lost is too large and the calculated mass of CoCl₂ is too small. Moles of water ÷ moles of CoCl₂ then comes out too large, so x is too high."),
]

FORMULA_SUB = {2: "₂", 3: "₃", 4: "₄", 5: "₅"}


def compute(v):
    """Derive the lab data (to 0.01 g) from the target formula, then every quantity the key needs from that data."""
    a, b = v["sub"]                                    # M_a O_b
    mM = MASS[v["sym"]]
    n_metal_true = v["m_metal"] / mM
    # oxide mass = metal mass + oxygen mass (oxygen from the exact formula), measured to 0.01 g
    o_true = n_metal_true * (b / a) * M_O
    v["c_metal"] = round(v["crucible"] + v["m_metal"], 2)
    v["c_oxide"] = round(v["crucible"] + v["m_metal"] + o_true, 2)
    v["g_metal"] = round(v["c_metal"] - v["crucible"], 2)
    v["g_oxide"] = round(v["c_oxide"] - v["crucible"], 2)
    v["g_O"] = round(v["c_oxide"] - v["c_metal"], 2)
    v["n_metal"] = v["g_metal"] / mM
    v["n_O"] = v["g_O"] / M_O
    v["ratio"] = v["n_O"] / v["n_metal"]               # O per metal atom, e.g. 1.5, 2.5, 1.33
    v["atoms"] = v["n_metal"] * NA
    v["scale"] = a
    assert abs(v["ratio"] - b / a) < 0.04 * (b / a), (v["ver"], v["ratio"], b / a)
    assert abs(v["g_O"] / v["g_oxide"] - (b * M_O) / (a * mM + b * M_O)) < 0.012      # data are consistent with the formula

    # hydrate
    mS = v["salt_mm"]
    v["hyd_after_target"] = v["hyd_c"] + v["m_hyd"] * mS / (mS + v["x"] * M_H2O)
    v["h_with"] = round(v["hyd_c"] + v["m_hyd"], 2)
    v["h_after"] = round(v["hyd_after_target"], 2)
    v["g_hyd"] = round(v["h_with"] - v["hyd_c"], 2)
    v["g_salt"] = round(v["h_after"] - v["hyd_c"], 2)
    v["g_water"] = round(v["h_with"] - v["h_after"], 2)
    v["pct_water"] = 100 * v["g_water"] / v["g_hyd"]
    v["n_water"] = v["g_water"] / M_H2O
    v["n_salt"] = v["g_salt"] / mS
    v["x_calc"] = v["n_water"] / v["n_salt"]
    theory_pct = 100 * v["x"] * M_H2O / (mS + v["x"] * M_H2O)
    assert abs(v["x_calc"] - v["x"]) < 0.08, (v["ver"], v["x_calc"])
    assert abs(v["pct_water"] - theory_pct) < 1.0, (v["ver"], v["pct_water"], theory_pct)
    assert round(v["x_calc"]) == v["x"]
    return v


for _v in VERSIONS:
    compute(_v)
assert len({v["sub"] for v in VERSIONS}) == 3 and len({v["x"] for v in VERSIONS}) == 3
assert len({(v["c_metal"], v["c_oxide"], v["h_with"], v["h_after"]) for v in VERSIONS}) == 3


# ------------------------------------------------------------------ docx
def space(d, inches):
    p = fmt(d.add_paragraph(), after=0)
    p.paragraph_format.line_spacing = Pt(max(inches * 72 - 12, 1))
    run(p, " ", 4)


def data_table(d, rows, col_w=(4.0, 1.1)):
    t = d.add_table(rows=len(rows), cols=2)
    t.style = "Table Grid"
    t.autofit = False
    for i, (a, b) in enumerate(rows):
        for j, txt in enumerate((a, b)):
            c = t.cell(i, j)
            c.width = Inches(col_w[j])
            c.text = ""
            pp = c.paragraphs[0]
            pp.paragraph_format.space_before = pp.paragraph_format.space_after = Pt(0)
            run(pp, txt, 9.5, bold=(j == 1))
            if j == 1:
                pp.alignment = 2
    for col, w in zip(t.columns, col_w):
        col.width = Inches(w)
    return t


def part(d, label, text, pts, h, size=10):
    p = fmt(d.add_paragraph(), before=(7 if label == "a." else 3), after=0, left=0.3, hang=0.3, keep=True)
    run(p, label + "\t", size, bold=True)
    rich(p, text, size)
    run(p, "  (%d pt%s)" % (pts, "" if pts == 1 else "s"), 9, italic=True, color="555555")
    space(d, h)


def build_student(v):
    d = new_doc()
    footer(d, "Honors Chemistry  •  Unit 5 Free Response Test  •  Version %s" % v["ver"])
    p = fmt(d.add_paragraph(), after=1)
    run(p, "Moles and Molar Quantities: Free Response Test", 15, bold=True)
    run(p, "          Version %s" % v["ver"], 12, bold=True, color="444444")
    p = fmt(d.add_paragraph(), after=2); run(p, "Name: ______________________________      Pd: ______", 10.5)
    p = fmt(d.add_paragraph(), after=2)
    run(p, "Show your setup with units for every calculation and report answers to the correct number of significant figures. "
           "Use your calculator and periodic table.  Total: 20 points.", 8.5, color="555555")
    rule(p)

    # ---------------- Question 1
    p = fmt(d.add_paragraph(), before=3, after=1, keep=True)
    run(p, "1)  Formula of a metal oxide (10 pts)", 11, bold=True)
    p = fmt(d.add_paragraph(), after=2, keep=True)
    rich(p, "A student heats a sample of %s metal, %s, in a crucible with a lid in the presence of excess oxygen gas, O₂(g), until it has "
            "completely reacted to form a solid oxide. The student measures the masses below, heating the oxide until its mass is constant."
         % (v["metal"], v["sym"]), 10)
    if v.get("metal_given"):        # the metal's mass is measured and given; students only find the oxygen
        data_table(d, [
            ("Mass of %s sample" % v["metal"], "%.2f g" % v["g_metal"]),
            ("Mass of empty crucible and lid", "%.2f g" % v["crucible"]),
            ("Mass of crucible, lid and %s oxide (after heating to constant mass)" % v["metal"], "%.2f g" % v["c_oxide"]),
        ])
        part(d, "a.", "Calculate the mass of oxygen that reacted.", 2, 0.42)
        part(d, "b.", "How many atoms of %s were in the sample?" % v["metal"], 2, 0.50)
    else:
        data_table(d, [
            ("Mass of empty crucible and lid", "%.2f g" % v["crucible"]),
            ("Mass of crucible, lid and %s" % v["metal"], "%.2f g" % v["c_metal"]),
            ("Mass of crucible, lid and %s oxide (after heating to constant mass)" % v["metal"], "%.2f g" % v["c_oxide"]),
        ])
        part(d, "a.", "Calculate the mass of %s and the mass of oxygen that reacted." % v["metal"], 2, 0.42)
        part(d, "b.", "How many atoms of %s were in the sample? (Use your answer from part a.)" % v["metal"], 2, 0.50)
    part(d, "c.", "Determine the empirical formula of the oxide. Show your work.", 4, 1.10)
    part(d, "d.", "Write the balanced equation for the reaction of %s with O₂(g), using the empirical formula from part c and the "
                  "smallest whole-number coefficients." % v["metal"], 2, 0.38)

    p = fmt(d.add_paragraph(), before=1, after=1); rule(p)

    # ---------------- Question 2
    p = fmt(d.add_paragraph(), before=3, after=1, keep=True)
    run(p, "2)  Hydrate lab (10 pts)", 11, bold=True)
    p = fmt(d.add_paragraph(), after=2, keep=True)
    rich(p, "A student heats a sample of hydrated %s, %s, in a crucible until the mass stops changing, which drives off all of the "
            "water, leaving the anhydrous salt, %s." % (v["salt"], v["hyd_f"], v["salt_f"]), 10)
    data_table(d, [
        ("Mass of empty crucible", "%.2f g" % v["hyd_c"]),
        ("Mass of crucible and hydrate (before heating)", "%.2f g" % v["h_with"]),
        ("Mass of crucible and solid (after heating to constant mass)", "%.2f g" % v["h_after"]),
    ])
    part(d, "a.", "Calculate the mass of water lost and the percent by mass of water in the hydrate.", 2, 0.55)
    part(d, "b.", "Calculate the moles of water lost and the moles of anhydrous %s, %s, remaining." % (v["salt"], v["salt_f"]), 3, 0.85)
    part(d, "c.", "Determine the value of x. Then write the formula of the hydrate and name it.", 3, 0.62)
    part(d, "d.", v["err"] + " Will the calculated value of x be too high, too low, or unchanged? Justify your answer.", 2, 0.55)
    return d


def build_key():
    d = new_doc()
    footer(d, "Honors Chemistry  •  Unit 5 Free Response Test  •  TEACHER KEY (Versions A, B, C)")
    p = fmt(d.add_paragraph(), after=2); run(p, "Unit 5 Free Response Test: TEACHER KEY (all three versions)", 15, bold=True)
    p = fmt(d.add_paragraph(), after=3)
    run(p, "Every value is computed in code from the printed data (atomic masses to 0.01 g/mol, N", 9, color="555555")
    run(p, "A", 9, color="555555")
    run(p, " = 6.022 × 10²³). Accept an answer within one rounding digit if the work is correct. Q1 is 10 points and Q2 is 10 points.", 9, color="555555")
    rule(p)
    for n, v in enumerate(VERSIONS):
        a, b = v["sub"]
        mM = MASS[v["sym"]]
        first = n == 0
        p = fmt(d.add_paragraph(), before=(2 if first else 0), after=2, keep=True)
        if not first:
            p.paragraph_format.page_break_before = True
        run(p, "Version %s:  %s oxide (%s)  and  %s" % (v["ver"], v["metal"], v["oxide"], v["hyd_name"]), 12, bold=True)

        def block(title, parts):
            p = fmt(d.add_paragraph(), before=5, after=1, keep=True); run(p, title, 10, bold=True)
            for lab, text, ans in parts:
                p = fmt(d.add_paragraph(), before=2, after=0, left=0.3, hang=0.3, keep=True)
                run(p, lab + "\t" + text, 9)
                for line in ans.split("\n"):
                    p = fmt(d.add_paragraph(), left=0.3, after=0)
                    shade(p, "F2F2F2")
                    rich(p, line, 9)

        ratio = v["ratio"]
        block("Question 1: oxide of %s (10 pts)" % v["metal"], [
            (("a.", "Mass of oxygen (the mass of %s, %.2f g, is given). (2 pts)" % (v["sym"], v["g_metal"]),
              "Mass of oxide = %.2f − %.2f = %.2f g (1 pt)\nOxygen: %.2f − %.2f = **%.2f g O** (1 pt)"
              % (v["c_oxide"], v["crucible"], v["g_oxide"], v["g_oxide"], v["g_metal"], v["g_O"]))
             if v.get("metal_given") else
             ("a.", "Masses of metal and oxygen. (2 pts)",
              "Metal: %.2f − %.2f = **%.2f g %s** (1 pt)\nOxygen: %.2f − %.2f = **%.2f g O** (1 pt)"
              % (v["c_metal"], v["crucible"], v["g_metal"], v["sym"], v["c_oxide"], v["c_metal"], v["g_O"]))),
            ("b.", "Atoms of metal. (2 pts)",
             "%.2f g %s × (1 mol / %.2f g) × (6.022 × 10²³ atoms / 1 mol) = **%s atoms of %s**\n(1 pt for grams → moles, 1 pt for moles → atoms)"
             % (v["g_metal"], v["sym"], mM, sci(v["atoms"], 3), v["sym"])),
            ("c.", "Empirical formula. (4 pts)",
             "Moles %s: %.2f g ÷ %.2f g/mol = %s mol (1 pt)\nMoles O: %.2f g ÷ 16.00 g/mol = %s mol (1 pt)\n"
             "Ratio, dividing by the smaller (%s mol): %s : O = 1 : %s (1 pt)\nThe ratio is not whole-number, so multiply by %d: %s : O = %d : %d → **%s** (1 pt)"
             % (v["sym"], v["g_metal"], mM, sf(v["n_metal"], 4), v["g_O"], sf(v["n_O"], 4), sf(v["n_metal"], 4),
                v["sym"], sf(ratio, 3), a, v["sym"], a, b, v["oxide"])),
            ("d.", "Balanced equation. (2 pts)",
             "**%s**   (1 pt for the correct formula as the product, 1 pt for balanced with whole-number coefficients)" % v["eq"]),
        ])
        pw = v["pct_water"]
        block("Question 2: %s hydrate (10 pts)" % v["salt"], [
            ("a.", "Mass of water lost and percent water. (2 pts)",
             "Mass of hydrate = %.2f − %.2f = %.2f g;  mass of water lost = %.2f − %.2f = **%.2f g** (1 pt)\n"
             "Percent water = %.2f g ÷ %.2f g × 100 = **%s%%** (1 pt)"
             % (v["h_with"], v["hyd_c"], v["g_hyd"], v["h_with"], v["h_after"], v["g_water"], v["g_water"], v["g_hyd"], sf(pw, 3))),
            ("b.", "Moles of water and of anhydrous salt. (3 pts)",
             "Mass of anhydrous %s = %.2f − %.2f = %.2f g (1 pt)\nMoles H₂O = %.2f g ÷ 18.02 g/mol = **%s mol** (1 pt)\n"
             "Moles %s = %.2f g ÷ %.2f g/mol = **%s mol** (1 pt)"
             % (v["salt_f"], v["h_after"], v["hyd_c"], v["g_salt"], v["g_water"], sf(v["n_water"], 3), v["salt_f"], v["g_salt"], v["salt_mm"], sf(v["n_salt"], 3))),
            ("c.", "x, formula and name. (3 pts)",
             "x = %s ÷ %s = %s, which rounds to %d (1 pt)\nFormula: **%s** (1 pt)\nName: **%s** (1 pt)"
             % (sf(v["n_water"], 3), sf(v["n_salt"], 3), sf(v["x_calc"], 3), v["x"], v["hyd_f"].replace("xH", "%dH" % v["x"]), v["hyd_name"])),
            ("d.", "Error analysis. (2 pts)",
             "**Too %s.** (1 pt)\n%s (1 pt)" % (v["err_dir"], v["err_why"])),
        ])
    return d


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for v in VERSIONS:
        f = os.path.join(OUT, "Unit 5 - Moles - Free Response Test - VERSION %s.docx" % v["ver"])
        build_student(v).save(f); print(f)
    k = os.path.join(OUT, "Unit 5 - Moles - Free Response Test - TEACHER KEY (all versions).docx")
    build_key().save(k); print(k)
    for v in VERSIONS:
        print(v["ver"], v["oxide"], "ratio O/M = %.3f" % v["ratio"], "| x = %.2f" % v["x_calc"], "| %% water = %.1f" % v["pct_water"])
