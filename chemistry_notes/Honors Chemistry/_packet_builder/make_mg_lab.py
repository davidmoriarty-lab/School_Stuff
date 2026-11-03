"""Builds the Mg + O2 empirical formula lab (pre-lab, 47-minute lab write-up, extension questions) in a student and a
teacher edition.  Every number in the teacher key is computed here (Mg 24.31, O 16.00 g/mol).  Run: python3 make_mg_lab.py

Design (from the teacher): one 47-minute period, about 3 minutes of cooling, crucible-and-lid and Mg ribbon pre-massed by
the teacher (masses on a label), water added to the cooled ash to convert any Mg3N2 to Mg(OH)2, one final mass on a balance
that reads to 0.0001 g (the last digit may drift on a warm crucible).
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from docx.shared import Pt, Inches
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from make_unit5_test import new_doc, footer, run, rich, fmt, shade, rule, F
from build_moles import sf

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "Labs")
MG, O = 24.31, 16.00
MGO = MG + O

# ---------------------------------------------------------------- computed sample data (teacher key)
S_CRUC, S_MG, S_FINAL = 25.1234, 0.2015, 25.4552
s_oxide = S_FINAL - S_CRUC
s_oxy = s_oxide - S_MG
s_nmg, s_no = S_MG / MG, s_oxy / O
s_ratio = s_no / s_nmg
s_theory = S_MG * MGO / MG
s_yield = 100 * s_oxide / s_theory
s_err = abs(s_ratio - 1) * 100
s_pmg = 100 * S_MG / s_oxide
t_pmg = 100 * MG / MGO
s_o2_l = s_no / 2 * 22.4

CLASS = [(1, 0.1983, 0.3280), (2, 0.2041, 0.3385), (3, 0.2015, 0.3318), (4, 0.1962, 0.3202), (5, 0.2076, 0.3441), (6, 0.2008, 0.3366)]
class_rows = []
for g, m, ox in CLASS:
    o = ox - m
    class_rows.append((g, m, ox, o, (o / O) / (m / MG)))
class_avg = sum(r[4] for r in class_rows) / len(class_rows)

# pre-lab practice
P_MG = 0.1500
P_OX = round(P_MG * MGO / MG, 4)
P_O = P_OX - P_MG
p_nmg, p_no = P_MG / MG, P_O / O
# extension
nitride_per_mg = 14.01 * 2 / 3
nitride_ratio = (nitride_per_mg / O)             # "mol O" a student would calculate if all Mg became Mg3N2
al_m = 0.2698
al_ox = round(al_m * (2 * 26.98 + 3 * O) / (2 * 26.98), 4)
al_o = al_ox - al_m
al_nal, al_no = al_m / 26.98, al_o / O

assert abs(s_ratio - 1) < 0.05 and 0.95 < class_avg < 1.05
assert abs(p_no / p_nmg - 1) < 0.002
assert abs(al_no / al_nal - 1.5) < 0.01


def f4(x): return "%.4f" % x


# ---------------------------------------------------------------- layout helpers
def cell_shade(c, fill):
    pr = c._tc.get_or_add_tcPr(); sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), fill); pr.append(sh)


def table(d, rows, widths, header=True, size=9.5, height=None, bold_first_col=False, fills=None):
    t = d.add_table(rows=len(rows), cols=len(widths))
    t.style = "Table Grid"
    t.autofit = False
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for col, w in zip(t.columns, widths):
        col.width = Inches(w)
    for i, r in enumerate(rows):
        for j, txt in enumerate(r):
            c = t.cell(i, j)
            c.width = Inches(widths[j])
            c.text = ""
            p = c.paragraphs[0]
            fmt(p, before=1, after=1, keep=(i < len(rows) - 1))
            rich(p, txt, size, bold_all=(header and i == 0) or (bold_first_col and j == 0))
            if header and i == 0:
                cell_shade(c, "D9D9D9")
            elif fills and fills.get((i, j)):
                cell_shade(c, fills[(i, j)])
        if height and (i > 0 or not header):
            t.rows[i].height = Inches(height)
    fmt(d.add_paragraph(), after=2)
    return t


def h(d, text, size=12, before=6, brk=False):
    p = fmt(d.add_paragraph(), before=before, after=2, keep=True)
    if brk:
        p.paragraph_format.page_break_before = True
    run(p, text, size, bold=True)
    return p


def para(d, text, size=10, before=0, after=3, left=None, hang=None, italic=False, color=None):
    p = fmt(d.add_paragraph(), before=before, after=after, left=left, hang=hang)
    rich(p, text, size, color=color)
    return p


def box(d, label, lines, fill="EDEDED"):
    t = d.add_table(rows=1, cols=1)
    t.style = "Table Grid"
    c = t.cell(0, 0)
    c.width = Inches(7.3)
    cell_shade(c, fill)
    c.text = ""
    p = c.paragraphs[0]
    fmt(p, before=1, after=1)
    run(p, label, 9, bold=True)
    for ln in lines:
        p = c.add_paragraph()
        fmt(p, before=0, after=1, left=0.2, hang=0.2)
        rich(p, ln, 9.5)
    fmt(d.add_paragraph(), after=2)


def ans(d, text, size=9.5):
    for ln in text.split("\n"):
        p = fmt(d.add_paragraph(), left=0.3, after=0)
        shade(p, "E6E6E6")
        rich(p, ln, size)


def question(d, T, n, text, space, key=None, size=10):
    p = fmt(d.add_paragraph(), before=4, after=1, left=0.3, hang=0.3, keep=True)
    run(p, "%s." % n, size, bold=True); rich(p, "\t" + text, size)
    if T and key:
        ans(d, key)
    elif not T:
        sp = fmt(d.add_paragraph(), after=0)
        sp.paragraph_format.line_spacing = Pt(max(space * 72 * 0.8 - 12, 6))
        run(sp, " ", 4)


def header_block(d, title, sub):
    p = fmt(d.add_paragraph(), after=2); run(p, title, 16, bold=True)
    p = fmt(d.add_paragraph(), after=3)
    run(p, "Name: ______________________________   Date: ____________   Period: ______   Partner: ______________________", 10)
    p = fmt(d.add_paragraph(), after=3); run(p, sub, 9, color="555555"); rule(p)


# ---------------------------------------------------------------- content
def build(T):
    d = new_doc()
    footer(d, "Honors Chemistry  •  Unit 5 Lab: Empirical Formula of Magnesium Oxide" + ("  •  TEACHER EDITION" if T else ""))

    if T:
        header_block(d, "TEACHER EDITION: Empirical Formula of Magnesium Oxide",
                     "Prep sheet, 47-minute pacing, answer keys with computed sample data, troubleshooting and rubric. Student pages follow.")
        h(d, "Before the lab (about 30 minutes of prep)", 11, before=2)
        for ln in [
            "**Crucibles:** fire each crucible and lid for about 5 minutes, cool, and mass the pair to 0.0001 g. Number each pair and write its mass on a card or tray label (tape burns off).",
            "**Magnesium:** sand the ribbon bright, cut about 0.15 to 0.25 g per group, and mass it to 0.0001 g. Put each piece in a numbered bag that matches a crucible number, and write the mass on the bag. Students record both masses and do not weigh them.",
            "**Each group needs:** goggles, ring stand with ring and clay triangle, Bunsen burner, tongs, ceramic pad, dropper bottle of distilled water, a numbered crucible, lid and bag. Hair tied back, no loose sleeves.",
            "**Balances:** one 0.0001 g balance for every 2 to 3 groups. Stagger the final masses (students sign up at minute 28). Wipe the pan and shut the doors.",
            "**Why one period works:** pre-massed crucibles and ribbon remove two weighings and the 5-minute crucible firing, and the cooling is cut to about 3 minutes. A warm crucible makes the last digit drift, so accept a mass within ±0.0020 g and tell students to record the first reading that holds for 3 seconds. The constant-mass check is a pre-lab question; if a group finishes early they can reheat 3 minutes and mass again.",
            "**Water step safety:** after the 3-minute cool the crucible should be dull, not glowing. Students add the drops slowly with the dropper at arm's length, goggles on. If a crucible still glows, wait another minute. Ammonia smell means the nitride was there.",
        ]:
            para(d, "•\t" + ln, 9.5, left=0.25, hang=0.25, after=2)
        h(d, "47-minute pacing", 11)
        table(d, [["Minutes", "Students", "Teacher"],
                  ["0–4", "Goggles on, set up stand and triangle, collect crucible and Mg, record both masses. Quick pre-lab check.", "Hand out numbered sets. Check pre-lab questions 1–3 orally."],
                  ["4–6", "Coil the Mg inside the crucible, set the lid slightly ajar on the triangle.", "Check lids and hair."],
                  ["6–16", "Light the burner. Heat gently 2 minutes, then strongly until the ribbon has burned and stopped glowing (about 8 minutes).", "Remind: do not look at the flame. Watch for lids sealed or fully off."],
                  ["16–19", "Cool 3 minutes on the ceramic pad. Start the calculation setup.", "Walk the room."],
                  ["19–21", "Add about 10 drops of water slowly, waft, record the smell and colour.", "Confirm crucibles are not glowing."],
                  ["21–28", "Heat gently 2 minutes to drive off water, then strongly 4 to 5 minutes, lid ajar.", ""],
                  ["28–31", "Cool 3 minutes. Sign up for a balance.", ""],
                  ["31–36", "Mass the crucible, lid and product (4 decimals). Record. Tongs only.", "Staggered at balances."],
                  ["36–43", "Calculations in the data sheet. Add the class table row.", "Collect results on the board."],
                  ["43–47", "Cleanup: cool equipment, return crucibles and tongs, wash hands. Product may go in the trash.", ""]],
              [0.8, 4.0, 2.5], size=9)

    # ============================== PRE-LAB
    h(d, "Pre-Lab: Empirical Formula of Magnesium Oxide", 15, before=0, brk=T)
    if not T:
        p = fmt(d.add_paragraph(), after=2)
        run(p, "Name: ______________________________   Date: ____________   Period: ______", 10)
        p = fmt(d.add_paragraph(), after=3)
        run(p, "Complete before lab day. In lab you burn a piece of magnesium ribbon and use the masses to find the mole ratio of Mg to O. Show your work and use units.", 9, color="555555"); rule(p)
    h(d, "Part A: Background", 11, before=2)
    qs = [
        ("1", "What is an empirical formula? Why can't we find it by just looking at the compound?", 0.6,
         "The simplest whole-number ratio of atoms (or moles of atoms) in a compound. We cannot see the atoms, so we measure masses and convert them to moles."),
        ("2", "Mg forms Mg²⁺ and O forms O²⁻. Predict the formula of magnesium oxide and the mole ratio of Mg to O.", 0.5,
         "MgO; 1 mol Mg : 1 mol O (the charges cancel one to one)."),
        ("3", "Balance: ____ Mg + ____ O₂ → ____ MgO", 0.3, "2 Mg + 1 O₂ → 2 MgO"),
        ("4", "Magnesium is so reactive that it also reacts with the nitrogen in air, making magnesium nitride. Write the formula of magnesium nitride (Mg²⁺ and N³⁻) and balance: ____ Mg + ____ N₂ → ____ Mg₃N₂", 0.5,
         "Mg₃N₂ (3 × 2+ = 2 × 3−).  3 Mg + 1 N₂ → 1 Mg₃N₂"),
        ("5", "After the first heating you add water. Balance the reaction of the nitride with water, and the reaction when Mg(OH)₂ is heated. Then explain how the water step helps the experiment.\n____ Mg₃N₂ + ____ H₂O → ____ Mg(OH)₂ + ____ NH₃        ____ Mg(OH)₂ → ____ MgO + ____ H₂O", 0.8,
         "1 Mg₃N₂ + 6 H₂O → 3 Mg(OH)₂ + 2 NH₃;   1 Mg(OH)₂ → 1 MgO + 1 H₂O.\nThe water turns the nitride into hydroxide (ammonia escapes) and heating turns the hydroxide back into MgO and steam, so everything ends up as MgO and the mass is correct."),
        ("6", "Why is the lid left slightly ajar during heating, instead of fully off or fully on?", 0.5,
         "Air (O₂) must get in so the Mg burns, but the lid keeps the white MgO smoke from escaping, which would lose product mass. A fully closed lid starves the Mg of O₂; fully off loses product."),
        ("7", "You cannot weigh the oxygen that reacts. Explain how you will find the mass of oxygen from three masses.", 0.55,
         "Mass of O = mass of MgO product − mass of Mg (conservation of mass: the extra mass is the oxygen that combined)."),
    ]
    for n, t, sp, k in qs:
        question(d, T, n, t, sp, k)
    h(d, "Part B: Practice calculation and precision", 11)
    question(d, T, "8", "In a trial, 0.1500 g of Mg burns to give %s g of product. Find the mass of oxygen, the moles of each element, and the empirical formula. Show every step." % f4(P_OX), 1.3,
             "Mass O = %s − 0.1500 = %s g\nMoles Mg = 0.1500 g ÷ 24.31 g/mol = %s mol;  moles O = %s g ÷ 16.00 g/mol = %s mol\nRatio O : Mg = %s ÷ %s = %s ≈ 1 : 1  →  **MgO**" % (
                 f4(P_OX), f4(P_O), sf(p_nmg, 4), f4(P_O), sf(p_no, 4), sf(p_no, 4), sf(p_nmg, 4), sf(p_no / p_nmg, 3)))
    question(d, T, "9", "The balance reads 25.4310 g. How many decimal places is that? When you subtract two such masses, how many decimal places belong in the answer? Why is the last digit allowed to drift on a warm crucible?", 0.7,
             "4 decimal places; the difference also has 4 decimal places (0.0001 g).\nA warm crucible heats the air around it, which rises and pushes on the pan, so the last digit changes. Record the first steady reading.")
    question(d, T, "10", "List three safety precautions for this lab and the hazard each prevents.", 0.8,
             "Any three: goggles and not looking at the burning Mg (very bright light harms eyes); tongs and the ceramic pad for hot crucibles (burns); no water on a glowing crucible (it can crack and spatter); hair tied back and loose items away (fire); waft ammonia, do not sniff (irritant); wash hands.")
    question(d, T, "11", "Predict. How would you prove that all the water is gone and the mass is final? (Hint: the idea of constant mass.)", 0.6,
             "Reheat and mass again; if the two masses agree within the balance's limit, no more water or gas is leaving. Repeat until masses stop changing.")

    # ============================== LAB
    h(d, "Lab: Empirical Formula of Magnesium Oxide (47 minutes)", 15, before=0, brk=True)
    if not T:
        p = fmt(d.add_paragraph(), after=2)
        run(p, "Name: ______________________________   Date: ____________   Period: ______   Partner: ______________________", 10)
    para(d, "**Purpose:** Find the empirical formula of magnesium oxide by burning a weighed piece of Mg, finding the mass of oxygen that combined by difference, and comparing the mole ratio with the formula you predicted in the pre-lab.", 10, before=2)
    box(d, "SAFETY", [
        "•\tGoggles on all period. Hair tied back. Do not look directly at burning magnesium.",
        "•\tTongs only for the crucible and lid. Set hot items on the ceramic pad, never on the bench.",
        "•\tAdd water slowly to the cooled ash, never to a glowing crucible. Waft the ammonia smell, do not sniff.",
    ])
    para(d, "**Materials:** numbered crucible and lid (mass on label), pre-massed Mg ribbon (mass on bag), ring stand with ring and clay triangle, Bunsen burner, tongs, ceramic pad, dropper bottle of distilled water, 0.0001 g balance (shared).", 10)
    h(d, "Procedure (minutes are a guide)", 11)
    steps = [
        "**(0–4)** Goggles on. Set the clay triangle on the ring so the crucible sits in it. Record the **crucible + lid mass** and the **Mg mass** from the labels. Do not weigh them again.",
        "**(4–6)** Coil the Mg ribbon in the crucible. Set the lid on **slightly ajar** (a small gap, not off). Set the crucible in the triangle.",
        "**(6–16)** Light the burner. Heat gently for 2 minutes, then strongly. When the Mg ignites, keep the lid ajar. **Do not stare at the flame.** Heat until the ribbon is fully burned and no longer glowing (about 8 minutes). Record what you see.",
        "**(16–19)** Turn the burner off. Use tongs to set the crucible on the ceramic pad. Cool 3 minutes. Start the calculation setup.",
        "**(19–21)** The crucible must no longer glow. Remove the lid with tongs and add about **10 drops of distilled water** slowly onto the ash. Waft any odour toward you. Record the odour and colour.",
        "**(21–28)** Replace the lid slightly ajar and heat gently for 2 minutes to drive off the water, then strongly for 4 to 5 minutes. Turn off the burner.",
        "**(28–31)** Cool 3 minutes on the pad. Sign up for a balance.",
        "**(31–36)** Mass the crucible, lid and product together on the balance (4 decimal places). The last digit may drift: record the first reading that holds for 3 seconds. Carry the crucible with tongs.",
        "**(36–47)** Finish the calculations, add your results to the class table, then clean up: let equipment cool, return crucible and tongs, wipe your area, wash hands. The product goes in the trash.",
    ]
    for i, s in enumerate(steps, 1):
        para(d, "%d.\t%s" % (i, s), 9.5, left=0.3, hang=0.3, after=2)

    h(d, "Data", 11)
    obs_key = "Ribbon burned with a very bright white light, leaving a white powder, sometimes with grey or pale yellow bits. Water: faint ammonia odour. Final: white powder."
    S = [["", "Mass (g)"],
         ["Mass of crucible + lid (from label)", f4(S_CRUC) if T else ""],
         ["Mass of Mg ribbon (from bag)", f4(S_MG) if T else ""],
         ["Mass of crucible + lid + product (after heating)", f4(S_FINAL) if T else ""],
         ["Mass of product, MgO (final − crucible + lid)", f4(s_oxide) if T else ""],
         ["Mass of oxygen (product − Mg)", f4(s_oxy) if T else ""]]
    table(d, S, [4.6, 2.2], height=0.3, size=9.5)
    para(d, "**Observations** (before heating, during burning, after adding water, final product):", 9.5, after=1)
    if T:
        ans(d, obs_key)
    else:
        sp = fmt(d.add_paragraph()); sp.paragraph_format.line_spacing = Pt(34); run(sp, " ", 4)

    h(d, "Calculations (show setup and units; your last digit is limited by the balance)", 11)
    C = [["", "Work", "Answer"],
         ["Moles of Mg (÷ 24.31 g/mol)", "%s g ÷ 24.31 g/mol" % f4(S_MG) if T else "", "%s mol" % sf(s_nmg, 4) if T else ""],
         ["Moles of O (÷ 16.00 g/mol)", "%s g ÷ 16.00 g/mol" % f4(s_oxy) if T else "", "%s mol" % sf(s_no, 4) if T else ""],
         ["Mole ratio O : Mg (divide both by the smaller)", "%s ÷ %s" % (sf(s_no, 4), sf(s_nmg, 4)) if T else "", "1 : %s" % sf(s_ratio, 3) if T else ""],
         ["Empirical formula (whole numbers)", "", "MgO" if T else ""],
         ["Percent error in the O : Mg ratio (accepted 1.00)", "|%s − 1.00| ÷ 1.00 × 100" % sf(s_ratio, 3) if T else "", "%s%%" % sf(s_err, 2) if T else ""]]
    table(d, C, [3.2, 2.5, 1.5], height=0.36, size=9.5)

    h(d, "Class data (record every group)", 11)
    if T:
        rows = [["Group", "Mg (g)", "MgO (g)", "O (g)", "O : Mg ratio"]] + [[str(g), f4(m), f4(ox), f4(o), sf(r, 3)] for g, m, ox, o, r in class_rows] + \
               [["Class average", "", "", "", sf(class_avg, 3)]]
    else:
        rows = [["Group", "Mg (g)", "MgO (g)", "O (g)", "O : Mg ratio"]] + [["", "", "", "", ""] for _ in range(5)] + [["Class average", "", "", "", ""]]
    table(d, rows, [1.2, 1.3, 1.3, 1.3, 1.5], height=0.26, size=9)

    h(d, "Analysis questions", 11)
    aq = [
        ("1", "State your experimental O : Mg mole ratio and empirical formula. Does it agree with your pre-lab prediction? Use the class average in your answer.", 0.8,
         "Sample: O : Mg = %s, so the empirical formula is MgO, which matches the Mg²⁺/O²⁻ prediction. The class average of %s is also close to 1.00." % (sf(s_ratio, 3), sf(class_avg, 3))),
        ("2", "Give two observations from the lab that support the formation of an oxide (or a nitride that was converted to an oxide).", 0.7,
         "Bright white flame and white powder (oxide); ammonia odour after adding water (nitride was present and converted); the mass increased."),
        ("3", "The ribbon gained mass. Where did the extra mass come from? Which law does this show?", 0.6,
         "From oxygen in the air combining with the Mg. Law of conservation of mass: the product mass equals Mg mass plus O mass."),
        ("4", "Name one source of error that could make your ratio too high and one that could make it too low. Explain each.", 0.9,
         "Too high: water or Mg(OH)₂ left in the product (extra mass counted as oxygen). Too low: MgO smoke escaped, or unburned Mg left (less oxygen in the product). A warm crucible reads slightly light, also lowering the ratio."),
        ("5", "How does the water step improve your result? What would the ratio look like without it?", 0.7,
         "It converts Mg₃N₂ to Mg(OH)₂ and then MgO. Without it, some Mg is in the product as the nitride, which weighs less than MgO for the same Mg, so the oxygen would look too low."),
    ]
    for n, t, sp, k in aq:
        question(d, T, n, t, sp, k)

    h(d, "Extension questions (honors)", 12, before=0, brk=True)
    eq = [
        ("E1", "Theoretical yield. Using your Mg mass, calculate the mass of MgO you should have made and your percent yield.", 0.7,
         "Theory = %s g Mg × (40.31 g MgO ÷ 24.31 g Mg) = %s g;  percent yield = %s ÷ %s × 100 = %s%%." % (f4(S_MG), f4(s_theory), f4(s_oxide), f4(s_theory), sf(s_yield, 4))),
        ("E2", "Percent composition. Find the percent Mg by mass in your product and compare it with the percent Mg in MgO.", 0.7,
         "Experimental: %s ÷ %s × 100 = %s%% Mg;  theoretical: 24.31 ÷ 40.31 × 100 = %s%% Mg." % (f4(S_MG), f4(s_oxide), sf(s_pmg, 4), sf(t_pmg, 4))),
        ("E3", "Gas volume. How many liters of O₂ gas at STP reacted with your Mg? (Hint: moles O₂ = moles O ÷ 2.)", 0.7,
         "%s mol O ÷ 2 = %s mol O₂;  × 22.4 L/mol = %s L (about %s mL)." % (sf(s_no, 4), sf(s_no / 2, 4), sf(s_o2_l, 3), sf(s_o2_l * 1000, 2))),
        ("E4", "Suppose all of the Mg had formed Mg₃N₂ and you did the calculation as if the extra mass were oxygen. What O : Mg mole ratio would you get? What does that tell you about the effect of leaving the nitride in the product?", 1.0,
         "Mg₃N₂ has 2 N for 3 Mg: 14.01 × 2 ÷ 3 = %s g N per mol Mg; treated as oxygen: %s ÷ 16.00 = %s mol, so the ratio would be about 1 : %s, far below 1 : 1. A little nitride lowers the oxygen found; that is why the water step is needed." % (
             sf(nitride_per_mg, 3), sf(nitride_per_mg, 3), sf(nitride_ratio, 2), sf(nitride_ratio, 2))),
        ("E5", "Question the evidence. Hot magnesium can also react with carbon dioxide: 2 Mg + CO₂ → 2 MgO + C. A student's product is grey-black. What does the colour suggest and how would the carbon change the O : Mg ratio?", 0.9,
         "The dark colour is carbon (or unburned Mg), not pure MgO. Carbon adds mass that is counted as oxygen, so the ratio would come out too high. Appearance is evidence: the formula is only trustworthy if the product is white."),
        ("E6", "A student burns %s g of aluminum and gets %s g of aluminum oxide. Find the empirical formula (Al = 26.98 g/mol). Hint: the ratio may not be 1 : 1." % (f4(al_m), f4(al_ox)), 1.3,
         "Mass O = %s − %s = %s g. Moles Al = %s mol; moles O = %s mol. Ratio O : Al = %s, which is 1.5 : 1. Multiply both by 2 for whole numbers: 2 Al : 3 O, so **Al₂O₃**." % (
             f4(al_ox), f4(al_m), f4(al_o), sf(al_nal, 4), sf(al_no, 4), sf(al_no / al_nal, 3))),
    ]
    for n, t, sp, k in eq:
        question(d, T, n, t, sp, k)

    if T:
        h(d, "Troubleshooting", 11, before=8)
        for ln in ["**Ribbon will not ignite:** the lid is too closed or the crucible is not hot enough. Open the lid slightly and heat more strongly.",
                   "**White smoke escaping:** the lid is too far open. Close the gap and keep heating.",
                   "**Grey or black bits after the first burn:** unburned Mg or carbon. Reheat with the lid ajar before adding water.",
                   "**Greenish-yellow powder:** Mg₃N₂ (the water step converts it).",
                   "**Crucible cracks or spits at the water step:** water was added to a glowing crucible. Wait longer and add drops slowly.",
                   "**Ratio far from 1:** check for smoke loss, wet product (reheat 3 minutes and mass again), or a warm-crucible reading. Use the class table to discuss which errors push the ratio up and down."]:
            para(d, "•\t" + ln, 9.5, left=0.25, hang=0.25, after=2)
        h(d, "Rubric (40 points)", 11)
        table(d, [["Category", "Points", "What earns full credit"],
                  ["Pre-lab", "10", "All 11 questions answered with work (about 1 point each), submitted before lab."],
                  ["Technique and safety", "5", "Goggles, lid ajar, water added only to a cooled crucible, tongs used, clean station."],
                  ["Data and calculations", "10", "Masses recorded to 4 decimals from the labels and balance, setup shown, units on every number, correct ratio and formula."],
                  ["Analysis", "8", "Five questions with reasoning that references the data (about 1.5 points each)."],
                  ["Extension", "7", "Any six answered correctly; E4 to E6 count double for reasoning."]],
              [1.6, 0.7, 5.0], size=9)

    return d


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for T, name in ((False, "STUDENT"), (True, "TEACHER EDITION")):
        p = os.path.join(OUT, "Unit 5 Lab - Empirical Formula of Magnesium Oxide - %s.docx" % name)
        build(T).save(p)
        print(p)
    print("sample: Mg %s g, MgO %s g, O %s g, ratio %s, error %s%%, yield %s%%" % (f4(S_MG), f4(s_oxide), f4(s_oxy), sf(s_ratio, 4), sf(s_err, 3), sf(s_yield, 4)))
    print("class avg ratio", sf(class_avg, 4), [sf(r[4], 3) for r in class_rows])
