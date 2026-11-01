"""Builds Unit 5, Moles and Molar Quantities (student notes and teacher edition).

    python3 make_moles.py

Needs python-docx, Pillow, NumPy and Matplotlib. The source is the Unit 5 homework in PDF Sources (topics 5.1 to 5.6 in the
homework are 5.1 to 5.7 here). Every answer in the key is computed in build_moles.py.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import lib
from lib import *
import build_moles as B
from build_moles import MolesPacket, sf, sci, pct, mm, mm_exact, pretty, work, parse, MASS, NA, OUTDIR
import figs_moles

F_MAP_S = figs_moles.mole_map(False)
F_MAP_T = figs_moles.mole_map(True)
F_HYD = figs_moles.hydrate_apparatus()

PB = ('<w:p><w:pPr><w:pageBreakBefore/><w:spacing w:before="0" w:after="0" w:line="20" '
      'w:lineRule="exact"/></w:pPr></w:p>')


def worked(P, text):
    P.emit(tbl([10080], [tr([tc(10080, para("WORKED EXAMPLE", sz=17, b=True, color=DARK, after=40) +
                                para(text, sz=21, after=60), fill="F4F4F4", borders=left_bar(DARK),
                                mar=(50, 170, 50, 140))])]))
    lib.FLOW.add(0.8)
    P.emit(spacer())


def lab(P, title, text):
    lib.FLOW.add(0.25)
    P.emit(tbl([10080], [tr([tc(10080, para("LAB CORNER  •  " + title, sz=17, b=True, color=DARK, after=0, keep=True),
                                fill="D9D9D9", borders=left_bar(DARK), mar=(50, 170, 50, 140))])]))
    P.emit(spacer(0.04).replace("<w:pPr>", "<w:pPr><w:keepNext/>", 1))
    P.note(text, 21)


def prob_table(P, title, items, heights, first="#"):
    """items: (label, question text, [answer lines])"""
    rows = [[n, [t] + [Ans(a) for a in ans]] for n, t, ans in items]
    P.table([504, 9576], ["", title], rows, heights, first_bold=True)


def build(T):
    lib.FLOW.__init__()
    P = MolesPacket(T)
    A = Ans
    MAP = F_MAP_T if T else F_MAP_S

    # ============================================================ page 1
    P.title("5", "Moles and Molar Quantities",
            "Count particles by the mole, then connect particles, grams and gas volume through molar mass.")
    if not T:
        P.box("HOW TO USE THIS PACKET", [
            "Write in pencil. For every calculation show the **given with its unit, each conversion factor as a fraction so "
            "the units cancel, and the answer with units and the right number of significant figures.** Use molar masses to "
            "0.01 g/mol, Avogadro’s number 6.022 × 10²³ and 22.4 L/mol for a gas at STP. Every conversion goes "
            "**through moles.** Extra practice is at the back."])
    else:
        P.box("TEACHER EDITION", [
            "Everything in a light-gray box, cell or line is an answer or model response. Teacher notes (misconceptions, "
            "interpretation choices, corrections) appear in the heavy-bordered boxes labeled TEACHER NOTE. The pages follow "
            "the student packet, so they line up closely."], kind="teacher")
        P.box("TEACHER OVERVIEW", [
            "**Numbering:** the homework folder calls this “Unit 5 Topic Homework” (Topics 5.1–5.6), the same unit number as "
            "this packet (between Chemical Reactions, Unit 4, and Stoichiometry, Unit 6). The packet has topics 5.1–5.7: homework "
            "5.1 is split into 5.1 (the mole) and 5.2 (molar mass); homework 5.2 = 5.3, 5.3 = 5.4, 5.4 = 5.5, 5.5 = 5.6, 5.6 = 5.7.",
            "**Answers are computed.** Every numerical answer in the key was calculated by code from the formulas, using "
            "atomic masses to 0.01 g/mol (H 1.01, C 12.01, N 14.01, O 16.00, Na 22.99, Mg 24.31, Al 26.98, P 30.97, S 32.06, "
            "Cl 35.45, K 39.10, Ca 40.08, Fe 55.85, Cu 63.55, Ag 107.87), N₍A₎ = 6.022 × 10²³ and 22.4 L/mol at STP. "
            "Unrounded values carry through; only the final answer is rounded to the sig figs of the data. If your class "
            "uses different masses the last digit may differ.",
            "**Homework quirks handled:** 5.1 #8 writes lead(II) carbonate as PbCO₄, which is not a real formula; "
            "the packet uses PbCO₃. 5.2 #6 uses Cu₂O₃ (copper(III) oxide), unusual but kept, because the copper count "
            "does not depend on the oxide. 5.4 #3 uses N₂S₂ (normally written S₂N₂); kept as given. Numbers such as "
            "“3.4x10²⁶” are written in scientific notation, and units, state of the gas (STP) and sig figs were added "
            "where the homework leaves them out. Each topic has a method box, a worked example and 1–2 new "
            "multiple-choice items, and an Extra Practice page of new problems was written.",
            "**Overlap with other units:** Unit 1 (topic 1.4) first introduces the mole, Avogadro’s number and molar "
            "mass; this unit goes deeper and adds STP volume, percent composition, formulas and hydrates. The "
            "Stoichiometry unit uses these conversions (including STP volume in 7.3) as tools.",
            "**Common misconceptions:** a mole is a mass (it is a number); 1 mol of every substance has the same mass; "
            "using the atomic number as the mass; forgetting the subscript outside parentheses; multiplying when you "
            "should divide (and the reverse); using 22.4 L/mol away from STP or for a liquid or solid; rounding a ratio "
            "such as 1.5 to 2 instead of doubling; reading the water of a hydrate as part of the salt’s molar mass.",
            "**Pacing idea:** 5.1–5.2 on day 1; 5.3 (mole map until students can draw it) on day 2; 5.4 on day 3; "
            "5.5–5.6 on days 4–5; 5.7 with the hydrate lab and Extra Practice on day 6."], kind="teacher")

    P.sub("What we will learn")
    P.table([1000, 9080], ["", "Topic"], [
        ["5.1", "The mole and Avogadro’s number"],
        ["5.2", "Molar mass"],
        ["5.3", "Mole conversions (particles, moles and grams)"],
        ["5.4", "Volume of a gas at STP"],
        ["5.5", "Percent composition"],
        ["5.6", "Empirical and molecular formulas"],
        ["5.7", "Hydrates"]], 0.3)
    P.sub("By the end of this unit I can…")
    for t in [
        "Explain what a mole is and use Avogadro’s number to convert between particles and moles.",
        "Find the molar mass of an element or compound, including formulas with parentheses.",
        "Convert between particles, moles and grams using the mole map, showing every unit.",
        "Use 22.4 L/mol to convert between moles, grams, particles and the volume of a gas at STP.",
        "Calculate the percent composition by mass of a compound.",
        "Find an empirical formula from masses or percentages, and a molecular formula from the molar mass.",
        "Use the mass lost on heating to find the formula and name of a hydrate."]:
        lib.FLOW.add(0.2)
        P.emit(para("•  " + t, sz=21, after=40, left=360, hanging=300))
    lib.FLOW.hard_break()
    P.emit(PB)

    # ============================================================ 5.1 the mole
    P.topic("5.1", "The Mole and Avogadro’s Number",
            "Counting by the mole • 6.022 × 10²³ • atoms, molecules and formula units")
    P.box("BIG IDEA", [
        "Atoms and molecules are far too small to count one at a time, so chemists count them in huge groups called "
        "**moles**. 1 mole = **6.022 × 10²³** particles, just as 1 dozen = 12. A mole is a number, not a mass."])
    P.sub("Key vocabulary — write each definition in your own words")
    P.table([2088, 4824, 3168], ["Term", "Definition (your words)", "Example / sketch"], [
        ["Mole", [Hint("What is it, and what does it measure?"),
                  A("The SI unit for amount of substance: 6.022 × 10²³ particles of anything.")],
         A("1 mol of eggs = 6.022 × 10²³ eggs")],
        ["Avogadro’s number", [Hint("Write the value in scientific notation. What does it count?"),
                               A("6.022 × 10²³ particles per mole, the number of particles in 1 mole.")],
         A("1 mol = 6.022 × 10²³ particles")],
        ["Particle", [Hint("Name the three kinds of particles and say which substances each goes with."),
                      A("Atoms (single elements), molecules (covalent compounds and diatomic elements) and "
                        "formula units (ionic compounds).")],
         A("Al → atoms;  H₂O → molecules;  NaCl → formula units")]], [0.8, 0.8, 0.8], term_col=True)
    P.box("HOW TO CONVERT BETWEEN PARTICLES AND MOLES", [
        "1.  Decide what the particles are: atoms, molecules or formula units.",
        "2.  Write **1 mol = 6.022 × 10²³ particles** as a fraction so the unit you start with cancels.",
        "3.  Moles to particles: **multiply** by 6.022 × 10²³.  Particles to moles: **divide** by 6.022 × 10²³.",
        "4.  Round to the sig figs of the data and write the unit."])
    worked(P, "How many atoms are in 2.50 mol of magnesium?")
    P.ansbox(0.8, "Work it out here:", [
        "2.50 mol Mg × (6.022 × 10²³ atoms / 1 mol) = **%s atoms Mg**" % sci(B.w_mg, 3)])
    P.q(1, "What is a “mole” in chemistry, and what is it used to measure?")
    P.ansbox(0.75, ans=["A mole is a counting unit, 6.022 × 10²³ particles. It measures the amount of a substance "
                        "(how many particles there are) the way a dozen counts eggs."])
    P.q(2, "What is the difference between an atom and a molecule?")
    P.ansbox(0.75, ans=["An atom is the smallest unit of an element. A molecule is two or more atoms bonded together "
                        "(H₂O has 3 atoms; O₂ has 2)."])
    P.sub("Convert (show the fraction setup)")
    items = [
        ("3.", "How many atoms are in 1.75 moles of aluminum?",
         ["1.75 mol × (6.022 × 10²³ / 1 mol) = **%s atoms Al**" % sci(B.a1, 3)]),
        ("4.", "How many molecules are in 3.25 moles of H₂O?",
         ["3.25 mol × (6.022 × 10²³ / 1 mol) = **%s molecules H₂O**" % sci(B.a2, 3)]),
        ("5.", "How many moles are in 3.4 × 10²⁶ molecules of CO₂?",
         ["3.4 × 10²⁶ molecules × (1 mol / 6.022 × 10²³) = **%s mol CO₂**" % sci(B.a3, 2, True)]),
        ("6.", "How many moles are there in 3.88 × 10²⁵ atoms of nickel?",
         ["3.88 × 10²⁵ atoms × (1 mol / 6.022 × 10²³) = **%s mol Ni**" % sci(B.a4, 3)])]
    prob_table(P, "Particles and moles", items, [0.85, 0.85, 0.85, 0.85])
    P.box("TEACHER NOTE", [
        "Students often treat the mole as a mass. Hold up “a dozen” and “a mole” of different objects: the number is "
        "the same, the mass is not. #3 and #6 count atoms (elements), #4 and #5 count molecules (covalent compounds). "
        "#5 is limited to 2 sig figs by 3.4 × 10²⁶, so 5.6 × 10² mol (565 is acceptable with the unit)."],
        kind="teacher")
    P.mc(1, "Which sample contains the most particles?",
         ["1 mol of iron", "1 mol of water", "1 mol of helium", "They all contain the same number"], "D",
         "1 mol of anything is 6.022 × 10²³ particles.")
    P.mc(2, "How many oxygen atoms are in 1 mol of O₂ molecules?",
         ["6.022 × 10²³", "1.204 × 10²⁴", "3.011 × 10²³", "32"], "B", "2 atoms per molecule × 6.022 × 10²³")

    # ============================================================ 5.2 molar mass
    P.topic("5.2", "Molar Mass", "Grams per mole • add the atomic masses • subscripts and parentheses")
    P.box("BIG IDEA", [
        "The **molar mass** of a substance is the mass of 1 mole of it, in **g/mol**. For a compound, add the atomic "
        "masses of every atom in the formula. Molar mass is the bridge between grams and moles."])
    P.box("HOW TO FIND A MOLAR MASS", [
        "1.  List each element in the formula and **count** its atoms. A subscript outside parentheses multiplies "
        "everything inside: in Mg(OH)₂ there are 2 O and 2 H.",
        "2.  Multiply each count by the atomic mass (to 0.01 g/mol).",
        "3.  Add the results. Round to 0.01 g/mol and write the unit **g/mol**."])
    worked(P, "Find the molar mass of aluminum sulfate, Al₂(SO₄)₃.")
    P.ansbox(0.95, "Work it out here:", [
        "Al: 2 × 26.98 = 53.96     S: 3 × 32.06 = 96.18     O: 12 × 16.00 = 192.00",
        "Molar mass = 53.96 + 96.18 + 192.00 = **%s g/mol**" % ("%.2f" % mm_exact("Al2(SO4)3"))])
    P.sub("Key vocabulary — write each definition in your own words")
    P.table([2088, 4824, 3168], ["Term", "Definition (your words)", "Example / sketch"], [
        ["Molar mass", [Hint("What does it measure, and what unit does it have?"),
                        A("The mass of one mole of a substance, in grams per mole (g/mol).")],
         A("H₂O: 18.02 g/mol")],
        ["Diatomic element", [Hint("Name the seven that exist as pairs of atoms."),
                              A("An element found as two bonded atoms: H₂, N₂, O₂, F₂, Cl₂, Br₂, I₂.")],
         A("O₂: 2 × 16.00 = 32.00 g/mol")]], [0.8, 0.8], term_col=True)
    P.q(1, "Define molar mass in your own words.")
    P.ansbox(0.6, ans=["The mass in grams of one mole (6.022 × 10²³ particles) of a substance; its unit is g/mol."])
    P.sub("Calculate the molar mass of each substance (show the sum)")
    rows = []
    for i, (disp, f) in enumerate(B.MOLAR_LIST, 1):
        if f in ("Be", "Mg", "Ag"):
            a = "%.2f g/mol" % mm(f)
        elif f in ("N2", "O2", "F2"):
            n = parse(f)[f[0]]
            a = "%d × %.2f = %.2f g/mol" % (2, MASS[f[0]], mm(f))
        else:
            a = "%s = %.2f g/mol" % (work(f), mm(f))
        rows.append(["%d." % i, disp, A("**%s**" % a)])
    P.table([504, 2300, 7276], ["", "Formula", "Work and molar mass (g/mol)"], rows, [0.48] * 12)
    P.box("TEACHER NOTE — CORRECTIONS", [
        "The homework lists #8 as PbCO₄. That formula does not exist (it would need Pb⁶⁺); lead(II) carbonate is PbCO₃, "
        "so the key uses PbCO₃ = 267.21 g/mol. Check that students count the atoms inside parentheses: Mg(OH)₂ is 24.31 + "
        "2(16.00) + 2(1.01) = 58.33, not 24.31 + 16.00 + 1.01. Diatomic elements (N₂, O₂, F₂) are the usual "
        "slip: 14.01 is the atomic mass of nitrogen, 28.02 is the molar mass of N₂."], kind="teacher")
    lab(P, "Weighing a mole",
        "A student weighs out exactly 1 mole of each of three substances: 18.02 g of water, 58.44 g of table salt (NaCl) "
        "and 55.85 g of iron.")
    P.q(1, "(a) Which sample contains the most particles? (b) Why are the three masses different?")
    P.ansbox(0.8, "Answer:", [
        "(a) None: each one is 1 mole, so each has 6.022 × 10²³ particles.",
        "(b) The particles have different masses. A mole of heavy particles has a greater mass than a mole of light ones."])
    P.mc(2, "What is the molar mass of Ca(OH)₂?", ["57.09 g/mol", "74.10 g/mol", "58.10 g/mol", "73.09 g/mol"], "B",
         "40.08 + 2(16.00) + 2(1.01) = 74.10")

    # ============================================================ 5.3 mole conversions
    P.topic("5.3", "Mole Conversions", "Particles • moles • grams • the mole map")
    P.box("BIG IDEA", [
        "You can never go straight from particles to grams. **Every conversion goes through moles.** The mole map "
        "shows which factor to use for each arrow: Avogadro’s number for particles, molar mass for grams."])
    P.figure(MAP, 5.2, "The mole map. Write the conversion factor on each arrow." if not T else
             "The mole map with every conversion factor filled in.")
    P.box("STEPS", [
        "1.  Write the given quantity with its unit.",
        "2.  Find the path on the mole map. Grams or particles go to **moles first**, then on to the answer.",
        "3.  Set up each factor as a fraction so the unit you want to remove cancels.",
        "4.  Calculate, round to the sig figs of the data, and label the answer with the unit and the substance."])
    worked(P, "How many molecules are in 9.00 g of water?")
    P.ansbox(0.95, "Work it out here:", [
        "molar mass of H₂O = 18.02 g/mol",
        "9.00 g × (1 mol / 18.02 g) × (6.022 × 10²³ molecules / 1 mol) = **%s molecules H₂O**" % sci(
            9.00 / mm_exact("H2O") * NA, 3)])
    P.sub("Solve each problem. Show givens, factors and the answer with units.")
    items = [
        ("1.", "Calculate the number of grams of CO₂ that will contain 2.5 × 10²⁴ molecules of CO₂.",
         ["2.5 × 10²⁴ molecules × (1 mol / 6.022 × 10²³) × (44.01 g / 1 mol) = **%s g CO₂**" % sci(B.c1, 2, True)]),
        ("2.", "How many moles of carbon tetrafluoride, CF₄, are in 176 grams of CF₄?",
         ["molar mass CF₄ = 12.01 + 4(19.00) = 88.01 g/mol;  176 g × (1 mol / 88.01 g) = **%s mol CF₄**" % sf(B.c2, 3)]),
        ("3.", "How many moles of water are in 360.0 grams of water?",
         ["360.0 g × (1 mol / 18.02 g) = **%s mol H₂O**" % sf(B.c3, 4)]),
        ("4.", "How many moles of iron(III) oxide, Fe₂O₃, are there in 79.85 grams of iron(III) oxide?",
         ["molar mass Fe₂O₃ = 159.70 g/mol;  79.85 g × (1 mol / 159.70 g) = **%s mol Fe₂O₃**" % sf(B.c4, 4)]),
        ("5.", "How many molecules of chlorine gas, Cl₂, are present in 52.5 grams of Cl₂?",
         ["52.5 g × (1 mol / 70.90 g) × (6.022 × 10²³ / 1 mol) = **%s molecules Cl₂**" % sci(B.c5, 3)]),
        ("6.", "How many copper atoms are present in 5.6 moles of Cu₂O₃?",
         ["5.6 mol Cu₂O₃ × (2 mol Cu / 1 mol Cu₂O₃) × (6.022 × 10²³ atoms / 1 mol) = **%s atoms Cu**" % sci(B.c6, 2, True)]),
        ("7.", "A student measures out 2.5 moles of glucose, C₆H₁₂O₆. How many grams of oxygen are contained in that "
               "amount of glucose?",
         ["2.5 mol C₆H₁₂O₆ × (6 mol O / 1 mol C₆H₁₂O₆) × (16.00 g O / 1 mol O) = **%s g O**" % sci(B.c7, 2, True)]),
        ("8.", "A student measures out 15.0 grams of CaCl₂. How many grams of chlorine are present?",
         ["15.0 g × (1 mol CaCl₂ / 110.98 g) × (2 mol Cl / 1 mol CaCl₂) × (35.45 g Cl / 1 mol Cl) = **%s g Cl**" % sf(B.c8, 3)])]
    prob_table(P, "Mole conversion problems", items, [1.05, 0.85, 0.75, 0.85, 1.05, 0.95, 1.1, 1.2])
    P.box("TEACHER NOTE", [
        "#6, #7 and #8 find the amount of **one element inside a compound**: the subscript is a mole ratio (2 mol Cu per "
        "mol Cu₂O₃, 6 mol O per mol glucose, 2 mol Cl per mol CaCl₂). #6 gives the same answer for Cu₂O, CuO or Cu₂O₃ "
        "because only the 2 Cu matters. #1 and #7 are limited to 2 sig figs. Common error: dividing by Avogadro’s "
        "number when going from moles to particles."], kind="teacher")
    P.mc(1, "To convert grams of CO₂ to molecules of CO₂, the first step is to…",
         ["multiply by 6.022 × 10²³", "divide by the molar mass", "multiply by 22.4", "divide by 6.022 × 10²³"], "B",
         "Grams go to moles first.")
    P.mc(2, "What is the mass of 0.50 mol of H₂O?", ["9.0 g", "18 g", "36 g", "0.50 g"], "A", "0.50 × 18.02 = 9.0 g")

    # ============================================================ 5.4 STP
    P.topic("5.4", "Volume of a Gas at STP", "22.4 L/mol • 0 °C and 1 atm • moles, grams and particles")
    P.box("BIG IDEA", [
        "At **STP** (standard temperature and pressure: **0 °C and 1 atm**), 1 mole of **any** gas takes up "
        "**22.4 L**. That adds one more arrow to the mole map: moles ↔ liters of gas."])
    P.sub("Key vocabulary — write each definition in your own words")
    P.table([2088, 4824, 3168], ["Term", "Definition (your words)", "Example / sketch"], [
        ["STP", [Hint("What do the letters stand for, and what are the two conditions?"),
                 A("Standard temperature and pressure: 0 °C (273 K) and 1 atm.")],
         A("A balloon at 0 °C and 1 atm")],
        ["Molar volume", [Hint("How much space does 1 mol of gas fill at STP? Does the kind of gas matter?"),
                          A("22.4 L per mole at STP, the same for every gas.")],
         A("1 mol He = 1 mol CO₂ = 22.4 L")]], [0.8, 0.8], term_col=True)
    P.box("STEPS", [
        "1.  Moles ↔ liters: use **1 mol = 22.4 L** (STP only, gases only).",
        "2.  If the given is grams or particles, go to **moles first** with the molar mass or Avogadro’s number.",
        "3.  Then use 22.4 L/mol, or go on to grams or particles for the answer."])
    worked(P, "What volume does 8.00 g of O₂ occupy at STP?")
    P.ansbox(0.8, "Work it out here:", [
        "8.00 g × (1 mol / 32.00 g) × (22.4 L / 1 mol) = **%s L O₂**" % sf(8.00 / 32.00 * 22.4, 3)])
    P.sub("What volume will each of the following occupy at STP?")
    items = [
        ("1.", "3.20 moles of O₂", ["3.20 mol × (22.4 L / 1 mol) = **%s L**" % sf(B.v1, 3)]),
        ("2.", "1.75 moles of NH₃", ["1.75 mol × 22.4 L/mol = **%s L**" % sf(B.v2, 3)]),
        ("3.", "37.8 moles of CO₂", ["37.8 mol × 22.4 L/mol = **%s L**" % sf(B.v3, 3)]),
        ("4.", "5.05 grams of helium", ["5.05 g × (1 mol / 4.00 g) × (22.4 L / 1 mol) = **%s L**" % sf(B.v4, 3)]),
        ("5.", "60.0 grams of xenon", ["60.0 g × (1 mol / 131.29 g) × (22.4 L / 1 mol) = **%s L**" % sf(B.v5, 3)])]
    prob_table(P, "Volume at STP", items, [0.55, 0.55, 0.55, 0.7, 0.7])
    P.sub("Solve each problem. All gases are at STP.")
    items = [
        ("6.", "A sample of NH₃ gas occupies 75.3 L at STP. How many molecules is this?",
         ["75.3 L × (1 mol / 22.4 L) × (6.022 × 10²³ / 1 mol) = **%s molecules NH₃**" % sci(B.v6, 3)]),
        ("7.", "What is the mass of 575 L of ammonia (NH₃) gas at STP?",
         ["575 L × (1 mol / 22.4 L) × (17.04 g / 1 mol) = **%s g NH₃**" % sf(B.v7, 3)]),
        ("8.", "A 5.00 gram sample of O₂ is in a container at STP. What is the volume of this sample?",
         ["5.00 g × (1 mol / 32.00 g) × (22.4 L / 1 mol) = **%s L O₂**" % sf(B.v8, 3)]),
        ("9.", "How many molecules are present in the container in the question above?",
         ["5.00 g × (1 mol / 32.00 g) × (6.022 × 10²³ / 1 mol) = **%s molecules O₂**" % sci(B.v9, 3)]),
        ("10.", "How many molecules are present in 0.12 L of carbon dioxide gas at STP? How many grams?",
         ["0.12 L × (1 mol / 22.4 L) = %s mol CO₂" % sf(B.v10n, 2),
          "molecules: × 6.022 × 10²³ = **%s molecules**     grams: × 44.01 g/mol = **%s g CO₂**" % (
              sci(B.v10m, 2, True), sf(B.v10g, 2))])]
    prob_table(P, "Gas problems at STP", items, [0.95, 0.8, 0.8, 0.8, 1.2])
    P.box("TEACHER NOTE", [
        "22.4 L/mol is exact enough for the class; the molar volume at STP is 22.414 L/mol. Remind students that 22.4 L/mol "
        "is for **gases at STP only**, not for liquids, solids or other temperatures: those use the ideal gas law "
        "in the Gases unit. #9 reuses the mole value from #8, so students should carry it forward rather than "
        "re-round. #10 asks for both molecules and grams from the same mole value."], kind="teacher")
    P.mc(1, "Which has the greatest volume at STP?",
         ["1.00 mol of N₂", "28.02 g of N₂", "6.022 × 10²³ molecules of N₂", "All three are the same"], "D",
         "Each is 1.00 mol of N₂ = 22.4 L.")
    P.mc(2, "Why can’t you use 22.4 L/mol for a gas at 25 °C?",
         ["22.4 L/mol applies only at 0 °C and 1 atm", "The gas has no molar mass at 25 °C",
          "Moles change with temperature", "22.4 L/mol is only for noble gases"], "A")

    # ============================================================ 5.5 percent composition
    P.topic("5.5", "Percent Composition", "Part ÷ whole × 100 • mass percent of each element")
    P.box("BIG IDEA", [
        "**Percent composition** tells you what part of a compound’s mass comes from each element. "
        "The percents of all the elements add up to **100 %**."])
    P.box("HOW TO FIND PERCENT COMPOSITION", [
        "1.  Find the molar mass of the compound (the **whole**).",
        "2.  For each element, find its mass in 1 mole of the compound (atomic mass × subscript): the **part**.",
        "3.  **% element = (mass of element in 1 mol ÷ molar mass of compound) × 100.**",
        "4.  Check that the percents add to 100 (within rounding)."])
    worked(P, "Find the percent composition of calcium carbonate, CaCO₃.")
    P.ansbox(0.95, "Work it out here:", [
        "molar mass = 40.08 + 12.01 + 3(16.00) = 100.09 g/mol",
        "Ca: 40.08 / 100.09 × 100 = %s    C: 12.01 / 100.09 × 100 = %s    O: 48.00 / 100.09 × 100 = %s" % (
            pct(40.08, 100.09), pct(12.01, 100.09), pct(48.00, 100.09)),
        "Check: %s + %s + %s = 100.00 %%" % (pct(40.08, 100.09)[:-1], pct(12.01, 100.09)[:-1], pct(48.00, 100.09)[:-1])])
    P.sub("Find the percent composition of every element in each compound")
    items = []
    for i, (disp, f) in enumerate(B.PCT, 1):
        M = mm_exact(f)
        lines = ["molar mass = %s = %.2f g/mol" % (work(f), mm(f))]
        lines.append("   ".join("**%s %s**" % (el, p) for el, p in B.pct_rows(f)))
        items.append(("%d." % i, "%s" % disp, lines))
    prob_table(P, "Percent composition", items, [1.0, 0.9, 0.9, 1.0, 1.15])
    P.box("TEACHER NOTE", [
        "Percents are rounded to 0.01 %, so a total can be 99.99 % or 100.01 % (NaOH: 57.48 + 40.00 + 2.53 = 100.01). "
        "That is a rounding effect, not a mistake. N₂S₂ is unusual (the real compound is written S₂N₂) but the "
        "calculation is the same. For (NH₄)₃PO₄, count 3 N, 12 H, 1 P and 4 O. Common error: using the mass of one "
        "atom instead of the mass of all the atoms of that element in the formula."], kind="teacher")
    P.mc(1, "A 50.0 g sample of a compound is 20.0 % hydrogen by mass. How many grams of hydrogen are in the sample?",
         ["2.5 g", "10.0 g", "20.0 g", "40.0 g"], "B", "0.200 × 50.0 g = 10.0 g")
    P.mc(2, "Which has the greater percent oxygen by mass?", ["H₂O", "H₂O₂", "They are the same", "Cannot be told"], "B",
         "H₂O₂: 32.00/34.02 = 94.06 %;  H₂O: 16.00/18.02 = 88.79 %")

    # ============================================================ 5.6 empirical and molecular formulas
    P.topic("5.6", "Empirical and Molecular Formulas", "Simplest whole-number ratio • percent → grams → moles → ratio")
    P.box("BIG IDEA", [
        "The **empirical formula** is the simplest whole-number ratio of atoms in a compound. The **molecular formula** "
        "is the actual number of each atom, and it is a whole-number multiple of the empirical formula: "
        "**molecular = n × empirical**, where **n = molar mass ÷ empirical formula mass**."])
    P.box("STEPS", [
        "1.  Change each percent to grams (assume a **100 g** sample), or use the grams given.",
        "2.  Change each mass to **moles** (÷ atomic mass).",
        "3.  Divide every mole value by the **smallest**. These are the subscripts.",
        "4.  If a result is near x.5, multiply **all** by 2 (near x.33 or x.67, by 3). Do not round 1.5 up to 2.",
        "5.  Molecular formula: n = molar mass ÷ empirical mass; multiply every subscript by n."])
    worked(P, "A compound is 40.0 % C, 6.7 % H and 53.3 % O and has a molar mass of 180 g/mol. Find its empirical and "
              "molecular formulas.")
    wr = B.w_emp
    P.ansbox(1.25, "Work it out here:", [
        "100 g → 40.0 g C, 6.7 g H, 53.3 g O.   moles: C 40.0/12.01 = %s,  H 6.7/1.01 = %s,  O 53.3/16.00 = %s" % (
            sf(wr[0], 3), sf(wr[1], 2), sf(wr[2], 3)),
        "÷ smallest (%s): C %s, H %s, O %s  →  empirical formula **CH₂O**" % (
            sf(wr[0], 3), sf(B.w_emp_r[0], 2), sf(B.w_emp_r[1], 2), sf(B.w_emp_r[2], 2)),
        "empirical mass = 12.01 + 2(1.01) + 16.00 = 30.03;  n = 180 / 30.03 = %s ≈ 6  →  molecular formula **C₆H₁₂O₆**" % (
            sf(B.w_emp_n, 2))])
    P.sub("Solve each problem")
    items = [
        ("1.", "Determine the empirical formula of the compound if it contains 87.3 g Na, 121.5 g S and 91.2 g O.",
         ["moles: Na %s, S %s, O %s.  ÷ %s: 1 : 1 : %s  → ×2 → 2 : 2 : 3" % (
             sf(B.e1_mol[0], 3), sf(B.e1_mol[1], 3), sf(B.e1_mol[2], 3), sf(min(B.e1_mol), 3), sf(B.e1_r[2], 2)),
          "empirical formula = **Na₂S₂O₃**"]),
        ("2.", "A compound contains 85.65 % Bi, 6.56 % O and 7.79 % F. What is the empirical formula of this compound?",
         ["moles: Bi %s, O %s, F %s  → ratio 1 : 1 : 1" % (sf(B.e2_mol[0], 4), sf(B.e2_mol[1], 3), sf(B.e2_mol[2], 3)),
          "empirical formula = **BiOF**"]),
        ("3.", "Propene has an empirical formula of CH₂. What is its molecular formula if it has a molar mass of "
               "42.09 g/mol?",
         ["empirical mass = 12.01 + 2(1.01) = 14.03;  n = 42.09 / 14.03 = %s ≈ 3" % sf(B.e3_n, 3),
          "molecular formula = **C₃H₆**"]),
        ("4.", "The percent composition of an unknown substance is 75.42 % carbon, 6.63 % hydrogen, 8.38 % nitrogen and "
               "9.57 % oxygen. If its molar mass is 334.0 g/mol, what is its empirical and molecular formula?",
         ["moles: C %s, H %s, N %s, O %s.  ÷ %s: %s : %s : 1 : 1  → ×2 → 21 : 22 : 2 : 2" % (
             sf(B.e4_mol[0], 4), sf(B.e4_mol[1], 3), sf(B.e4_mol[2], 3), sf(B.e4_mol[3], 3), sf(min(B.e4_mol), 3),
             sf(B.e4_r[0], 3), sf(B.e4_r[1], 3)),
          "empirical formula = **C₂₁H₂₂N₂O₂** (mass %.2f g/mol);  n = 334.0 / %.2f = %s ≈ 1" % (
              B.e4_emp, B.e4_emp, sf(B.e4_n, 3)),
          "molecular formula = **C₂₁H₂₂N₂O₂**"])]
    prob_table(P, "Empirical and molecular formula problems", items, [1.25, 1.15, 1.0, 1.7])
    P.box("TEACHER NOTE", [
        "#1: the ratio is 1 : 1 : 1.5, so double everything (Na₂S₂O₃, sodium thiosulfate). #4 is the hard one: the "
        "ratio is 10.5 : 10.97 : 1 : 1 (the hydrogen value is 11 within the rounding of the percents), so double to "
        "21 : 22 : 2 : 2. The empirical mass (334.45 g/mol) matches the given molar mass, so the molecular formula "
        "equals the empirical formula (n = 1). Common errors: rounding 1.5 to 2, dividing by the largest value, and "
        "skipping the step that changes percent to grams."], kind="teacher")
    P.mc(1, "What is the empirical formula of C₆H₁₂O₆?", ["CHO", "CH₂O", "C₂H₄O₂", "C₆H₁₂O₆"], "B",
         "Divide every subscript by 6.")
    P.mc(2, "A compound has the empirical formula CH and a molar mass of 78 g/mol. Its molecular formula is…",
         ["CH", "C₂H₂", "C₆H₆", "C₆H₁₂"], "C", "78 / 13.02 = 6")

    # ============================================================ 5.7 hydrates
    P.topic("5.7", "Hydrates", "Water in the crystal • heating • the formula and the name")
    P.box("BIG IDEA", [
        "A **hydrate** is an ionic compound with a fixed number of water molecules built into its crystal, such as "
        "CuSO₄ · 5H₂O. Heating drives the water off and leaves the **anhydrous** (“without water”) salt. The mass "
        "lost is the mass of water, so you can compare moles of water to moles of salt."])
    P.figure(F_HYD, 2.6, "Heating a hydrate in a crucible. Mass the crucible, the hydrate and the anhydrous salt.")
    P.table([1008] * 10, ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
            [["mono-", "di-", "tri-", "tetra-", "penta-", "hexa-", "hepta-", "octa-", "nona-", "deca-"]], [0.3],
            first_bold=False, sz=18)
    P.box("HOW TO FIND THE FORMULA OF A HYDRATE", [
        "1.  mass of water = mass of hydrate − mass of anhydrous salt.",
        "2.  Change both to **moles**: water ÷ 18.02 g/mol, salt ÷ its molar mass.",
        "3.  x = moles of H₂O ÷ moles of salt (divide by the smaller). Round to the **nearest whole number**.",
        "4.  Write the formula **salt · xH₂O** and the name **salt name + prefix + “hydrate”**."])
    worked(P, "A 7.36 g sample of a hydrate of calcium chloride is heated until no water remains. The CaCl₂ left has a "
              "mass of 5.55 g. Find the formula and name of the hydrate.")
    ex = B.hydrate(7.36, 5.55, "CaCl2")
    P.ansbox(1.1, "Work it out here:", [
        "water = 7.36 − 5.55 = %s g;   mol H₂O = %s / 18.02 = %s mol" % (sf(ex[0], 3), sf(ex[0], 3), sf(ex[1], 3)),
        "mol CaCl₂ = 5.55 / 110.98 = %s mol;   x = %s / %s = %s ≈ 2" % (sf(ex[2], 3), sf(ex[1], 3), sf(ex[2], 3), sf(ex[3], 3)),
        "formula **CaCl₂ · 2H₂O**; name **calcium chloride dihydrate**"])
    P.sub("Find the formula and the name of each hydrate")
    def hyd_ans(h, formula, name, salt_f, salt_name):
        return ["water = mass lost = %s g → %s mol H₂O;   %s: %s mol;   x = %s ≈ %d" % (
            sf(h[0], 3), sf(h[1], 3), salt_f, sf(h[2], 3), sf(h[3], 3), round(h[3])),
            "formula **%s**;   name **%s**" % (formula, name)]
    items = [
        ("1.", "A hydrate of magnesium sulfate has a mass of 13.52 g. This sample is heated until no water remains. The "
               "MgSO₄ anhydrate has a mass of 6.60 g. Find the formula and name of the hydrate.",
         hyd_ans(B.h1, "MgSO₄ · 7H₂O", "magnesium sulfate heptahydrate", "MgSO₄", "")),
        ("2.", "A sample of copper(II) sulfate hydrate has a mass of 3.97 g. After heating, the CuSO₄ that remains has a "
               "mass of 2.54 g. Determine the correct formula and name of the hydrate.",
         hyd_ans(B.h2, "CuSO₄ · 5H₂O", "copper(II) sulfate pentahydrate", "CuSO₄", "")),
        ("3.", "A sample of the hydrate of sodium carbonate has a mass of 8.85 g. It loses 1.28 g when heated. Find the "
               "formula and the name of the hydrate.",
         hyd_ans(B.h3, "Na₂CO₃ · H₂O", "sodium carbonate monohydrate", "Na₂CO₃", "")),
        ("4.", "A 16.4 g sample of hydrated calcium sulfate is heated until all the water is driven off. The calcium "
               "sulfate that remains has a mass of 13.0 g. Find the formula and the chemical name of the hydrate.",
         hyd_ans(B.h4, "CaSO₄ · 2H₂O", "calcium sulfate dihydrate", "CaSO₄", "")),
        ("5.", "A hydrate is determined to be 45.43 % water and 54.57 % CoCl₂. Find the chemical formula and name for "
               "this hydrate. (Hint: assume that there is 100 g total of hydrate compound.)",
         ["100 g → 45.43 g H₂O = %s mol;   54.57 g CoCl₂ ÷ 129.83 = %s mol;   x = %s ≈ 6" % (
             sf(B.h5_w, 4), sf(B.h5_s, 4), sf(B.h5_x, 3)),
          "formula **CoCl₂ · 6H₂O**;   name **cobalt(II) chloride hexahydrate**"])]
    prob_table(P, "Hydrate problems", items, [1.25, 1.25, 1.1, 1.25, 1.25])
    P.box("TEACHER NOTE", [
        "#3 gives x = 0.99, which rounds to 1 (a monohydrate; the prefix “mono-” is used). #4 is gypsum. Students should "
        "name the anhydrous salt first (use the nomenclature rules, including the Roman numeral for copper and cobalt) and "
        "then add the prefix. A hydrate lab fits here: heat blue CuSO₄ · 5H₂O gently until it turns white, with the lid "
        "slightly open and goggles on, and let the sample cool before it is massed. Common error: dividing the mass of "
        "water by the mass of the salt instead of comparing **moles**."], kind="teacher")
    P.mc(1, "After a hydrate is heated, its mass decreases. The mass lost is the mass of…",
         ["the salt", "the water", "the crucible", "air"], "B")
    P.mc(2, "Which is the correct name for CoCl₂ · 6H₂O?",
         ["cobalt chloride hexahydrate", "cobalt(II) chloride hexahydrate", "cobalt(II) chloride sixhydrate",
          "cobalt(II) chlorate hexahydrate"], "B")

    # ============================================================ extra practice
    lib.FLOW.hard_break()
    P.emit(PB)
    lib.FLOW.mark("Extra practice")
    b = ('<w:top w:val="single" w:sz="24" w:space="0" w:color="000000"/><w:left w:val="nil"/>'
         '<w:bottom w:val="single" w:sz="24" w:space="0" w:color="000000"/><w:right w:val="nil"/>')
    P.emit(tbl([10080], [tr([tc(10080, para("PRACTICE", sz=17, b=True, color=DARK, after=0) +
                                para("Extra Practice — Unit 5", sz=36, b=True, color="000000", after=0) +
                                para("Show your work. Every conversion goes through moles.", sz=21, after=0),
                                fill="EDEDED", borders=b, mar=(120, 200, 120, 200))])]))
    lib.FLOW.add(0.9)
    P.emit(spacer())
    P.sub("A.  Which conversion? (give the factor you would use)")
    P.table([504, 5400, 4176], ["", "Situation", "Factor"], [
        ["a.", "Grams of a compound to moles of the compound.", A("÷ molar mass (g/mol)")],
        ["b.", "Moles of molecules to the number of molecules.", A("× 6.022 × 10²³ molecules/mol")],
        ["c.", "Liters of a gas at STP to moles of the gas.", A("÷ 22.4 L/mol")],
        ["d.", "Percent composition to grams (to start an empirical formula).", A("assume 100 g: each % becomes grams")]],
            [0.5] * 4)
    P.sub("B.  Calculate")
    cr = [
        ("a.", "How many molecules are in 8.50 g of NH₃?",
         "8.50 g × (1 mol / 17.04 g) × (6.022 × 10²³ / 1 mol) = **%s molecules NH₃**" % sci(B.x_a, 3)),
        ("b.", "What is the percent by mass of carbon in glucose, C₆H₁₂O₆?",
         "6(12.01) / 180.18 × 100 = **%s**" % B.x_b),
        ("c.", "A compound is 52.14 % C, 13.13 % H and 34.73 % O and has a molar mass of 46.07 g/mol. Find its "
               "molecular formula.",
         "moles: C %s, H %s, O %s → ratio 2 : 6 : 1; empirical mass 46.07, n = 1 → **C₂H₆O**" % (
             sf(B.x_c_mol[0], 3), sf(B.x_c_mol[1], 3), sf(B.x_c_mol[2], 3))),
        ("d.", "What is the mass of 5.00 L of CO₂ at STP?",
         "5.00 L × (1 mol / 22.4 L) × (44.01 g / 1 mol) = **%s g CO₂**" % sf(B.x_d, 3))]
    P.table([504, 9576], ["", "Problems"], [[l, [t, A(a)]] for l, t, a in cr], [1.05, 0.8, 1.15, 0.9], first_bold=True)
    P.sub("C.  Lab data: a hydrate of barium chloride")
    P.note("A student heats a hydrate of barium chloride in a crucible. Complete the table, then find x in BaCl₂ · xH₂O "
           "(molar mass of BaCl₂ = 208.23 g/mol).", 21)
    data = [("Mass of empty crucible", "18.42 g", ""),
            ("Mass of crucible + hydrate", "21.67 g", ""),
            ("Mass of crucible + anhydrous BaCl₂ after heating", "21.19 g", ""),
            ("Mass of the hydrate", "", "%.2f g" % B.x_e_hyd),
            ("Mass of the anhydrous BaCl₂", "", "%.2f g" % B.x_e_anh),
            ("Mass of water lost", "", "%.2f g" % B.x_e_w)]
    rows = [tr([tc(5200, para("Measurement", sz=19, b=True, after=0), fill="D9D9D9"),
                tc(2000, para("Data", sz=19, b=True, after=0), fill="D9D9D9"),
                tc(2880, para("Your calculation", sz=19, b=True, after=0), fill="D9D9D9")], header=True)]
    for name, d, a in data:
        rows.append(tr([tc(5200, para(name, sz=20, after=0)), tc(2000, para(d, sz=20, after=0)),
                        tc(2880, para(a, sz=20, after=0) if (T and a) else "", fill="D9D9D9" if (T and a) else None)], h=0.34))
    lib.FLOW.add(2.4)
    P.emit(tbl([5200, 2000, 2880], rows))
    P.emit(spacer())
    P.q(1, "Find the moles of water, the moles of BaCl₂, the value of x, and write the formula and name.")
    P.ansbox(1.0, "Answer:", [
        "water: %.2f g / 18.02 = %s mol;   BaCl₂: %.2f g / 208.23 = %s mol;   x = %s ≈ 2" % (
            B.x_e_w, sf(B.x_e_w / B.H2O, 3), B.x_e_anh, sf(B.x_e_anh / mm_exact("BaCl2"), 3), sf(B.x_e_x, 3)),
        "formula **BaCl₂ · 2H₂O**;   name **barium chloride dihydrate**"])
    P.sub("D.  Think")
    P.q(1, "One mole of copper (63.55 g) and one mole of helium (4.00 g) have different masses. Explain why they "
           "still contain the same number of atoms.")
    P.ansbox(0.7, ans=["A mole is a number of particles (6.022 × 10²³), not a mass. Copper atoms have a much larger "
                       "mass than helium atoms, so a mole of copper has more mass."])
    P.q(2, "A student finds the formula of a hydrate to be CuSO₄ · 4.2H₂O. Give one possible reason the ratio is not a "
           "whole number, and say what the student should report.")
    P.ansbox(0.7, ans=["The sample may not have been heated long enough (some water left), or the masses were read "
                       "wrongly. The ratio should be a whole number, so the student reports CuSO₄ · 4H₂O only after "
                       "checking, and ideally reheats and reweighs."])
    P.mc(3, "Which of these is NOT 1 mole of the substance?",
         ["6.022 × 10²³ atoms of Na", "22.99 g of Na", "22.4 L of Na at STP", "58.44 g of NaCl"], "C",
         "Sodium is a solid; 22.4 L/mol is only for gases at STP.")
    P.mc(4, "A compound has the empirical formula CH₂O and a molar mass of 60.06 g/mol. Its molecular formula is…",
         ["CH₂O", "C₂H₄O₂", "C₃H₆O₃", "C₆H₁₂O₆"], "B", "60.06 / 30.03 = 2")

    out = os.path.join(OUTDIR, "Unit 5 - Moles and Molar Quantities - %s.docx" % ("TEACHER EDITION" if T else "STUDENT NOTES"))
    P.save(out, "5", "Unit 5: Moles and Molar Quantities")
    return out, lib.FLOW


if __name__ == "__main__":
    for T in (False, True):
        out, fl = build(T)
        print(out)
        print("  est. pages:", fl.page, "last page fill:", round(fl.cur, 1), "in")
        for m in fl.marks:
            print("   ", m)
