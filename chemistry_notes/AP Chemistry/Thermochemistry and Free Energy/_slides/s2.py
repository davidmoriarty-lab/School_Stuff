"""Sections 4-6."""
from scenes import *


# ================================================================== section 4
def _mol_row(s, y, counts, scale, x0=0.95):
    """A reaction drawn with molecules: counts = [(name, n), ...] reactants, then products (after the arrow)."""
    shapes, x = [], x0
    widths = {"H2": 0.75, "O2": 0.95, "H2O": 1.05}

    def place(name, n):
        nonlocal x
        for _ in range(n):
            w = widths[name] * scale / 0.55
            m = mol(s, name, x + w / 2, y, scale)
            shapes.extend(m.bonds + m.atoms)
            x += w + 0.08

    def sym(ch):
        nonlocal x
        t = txt(s, x, y - 0.25, 0.4, 0.5, ch, 24, MUTE, bold=True, align="c", anchor="m")
        shapes.append(t); x += 0.5

    react, prod = counts
    for k, (name, n) in enumerate(react):
        if k:
            sym("+")
        place(name, n)
    sym("→")
    for k, (name, n) in enumerate(prod):
        if k:
            sym("+")
        place(name, n)
    return shapes


def s4_one_mole(prs):
    col = SECTION_COLORS[4]
    s = new_slide(prs, "One mole of reaction means the equation exactly as written", 4, size=30)
    tl = Timeline(s)
    card(s, 0.55, 1.45, W - 1.1, 1.85, CARD, 0.1)
    chip1 = chip(s, 0.8, 1.6, 1.7, 0.42, "1 mol_{rxn}", col, WHITE, 15)
    row1 = _mol_row(s, 2.62, ([("H2", 2), ("O2", 1)], [("H2O", 2)]), 0.55)
    lab1 = txt(s, 7.4, 1.6, 5.2, 1.6, "2 mol H₂ + 1 mol O₂ → 2 mol H₂O\n**ΔH = −58.0 kJ**", 20, INK, anchor="m")
    card(s, 0.55, 3.5, W - 1.1, 2.3, CARD, 0.1)
    chip2 = chip(s, 0.8, 3.65, 1.7, 0.42, "2 mol_{rxn}", col, WHITE, 15)
    row2 = _mol_row(s, 4.85, ([("H2", 4), ("O2", 2)], [("H2O", 4)]), 0.5)
    lab2 = txt(s, 0.95, 5.2, 11.5, 0.5, "double the equation, double the energy:  **ΔH = 2(−58.0) = −116 kJ**", 18, INK)
    rev = card_text(s, 0.55, 6.0, 6.0, 0.85, "**Reverse** the equation: flip the sign, +58.0 kJ", 17, SOFT[col], INK, "c", "m", pad=0.1, radius=0.14)
    half = card_text(s, 6.8, 6.0, 5.98, 0.85, "**Half** the equation: half the energy, −29.0 kJ", 17, SOFT[col], INK, "c", "m", pad=0.1, radius=0.14)
    tl.click("One mole of reaction: 2 H₂ + 1 O₂ → 2 H₂O releases 58.0 kJ")
    tl.fade(chip1, lab1, *row1, dur=700)
    tl.click("Two moles of reaction: double the molecules, double the energy")
    tl.fade(chip2, *row2, lab2, dur=700)
    tl.click("Reversing and halving")
    tl.fade(rev, half)
    finish(s, tl, "The unit kJ/mol_rxn means 'per equation as written'. This is why we divide by the coefficient when we convert moles of one substance into moles of reaction.", "One mole of reaction")


def s4_map(prs):
    col = SECTION_COLORS[4]
    s = new_slide(prs, "The conversion map: grams to energy", 4)
    tl = Timeline(s)
    names = [("grams", "of the substance", GREEN), ("moles", "of the substance", ICE), ("moles of reaction", "mol_{rxn}", EMBER), ("energy", "kJ", PINK)]
    factors = ["÷ molar mass", "÷ coefficient", "× ΔH"]
    bw, gap = 2.2, 1.15
    xs = [0.55 + k * (bw + gap) for k in range(4)]
    boxes = []
    for (n, sub, c), x in zip(names, xs):
        b = card_text(s, x, 2.0, bw, 1.45, "**%s**\n%s" % (n, sub), 18, SOFT[c], INK, "c", "m", pad=0.1, line=c, radius=0.16)
        boxes.append(b)
    arrows = [arrow(s, xs[k] + bw + 0.08, 2.72, xs[k + 1] - 0.08, 2.72, MUTE, 3.5) for k in range(3)]
    fch = [chip(s, xs[k] + bw + gap / 2 - 0.95, 3.62, 1.9, 0.46, factors[k], MUTE, WHITE, 14) for k in range(3)]
    back = card_text(s, 0.55, 4.4, W - 1.1, 0.8, "Working backwards to find ΔH: **ΔH = energy ÷ moles of reaction**", 18, SOFT[GOLD], INK, "c", "m", line=GOLD, pad=0.1, radius=0.14)
    ex = txt(s, 0.55, 5.4, W - 1.1, 0.4, "Example 4.1, for instance:", 15, MUTE)
    ex_boxes = [card_text(s, x, 5.85, bw, 0.9, t, 17, WHITE, INK, "c", "m", pad=0.06, line=LINE, radius=0.14)
                for x, t in zip(xs, ["15.0 g H₂", "7.43 mol H₂", "3.71 mol_{rxn}", "−215 kJ"])]
    ex_arrows = [arrow(s, xs[k] + bw + 0.08, 6.3, xs[k + 1] - 0.08, 6.3, MUTE, 2.5) for k in range(3)]
    tl.click("Start with grams")
    tl.fade(boxes[0])
    for k in range(3):
        tl.click("%s → %s using %s" % (names[k][0], names[k + 1][0], factors[k]))
        tl.wipe(arrows[k], direction="left", dur=500); tl.fade(fch[k], boxes[k + 1])
    tl.click("To find ΔH, run the map in reverse")
    tl.fade(back)
    tl.click("Example 4.1 follows the map")
    tl.fade(ex, *ex_boxes, *ex_arrows)
    finish(s, tl, "Every Section 4 problem is some part of this chain. Have students mark where each example starts and stops on the map.", "Conversion map")


def s4_ex41(prs):
    solve_slide(prs, 4, "Example 4.1: energy from a mass of reactant",
                "2H₂ + O₂ → 2H₂O     ΔH = −58.0 kJ/mol_{rxn}\nHow much energy is released when 15.0 g of H₂ reacts with excess O₂?",
                "grams → moles → mol_{rxn} → energy",
                [("Grams to moles of H₂", "15.0 g H_{2} × {1 mol H_{2}|2.02 g H_{2}} = 7.43 mol H_{2}"),
                 ("Moles to moles of reaction", "7.43 mol H_{2} × {1 mol_{rxn}|2 mol H_{2}} = 3.71 mol_{rxn}"),
                 ("Multiply by ΔH", "q = 3.71 mol_{rxn} × {−58.0 kJ|1 mol_{rxn}} = −215 kJ")],
                "−215 kJ: 215 kJ released", "The negative sign means energy leaves the system.")


def s4_ex42(prs):
    solve_slide(prs, 4, "Example 4.2: find ΔH from the energy absorbed",
                "N₂ + O₂ → 2NO     ΔH = ?\nThe reaction makes 15.0 g of NO and absorbs 45.0 kJ from the surroundings. Calculate ΔH in kJ/mol_{rxn}.",
                "mol NO → mol_{rxn}, then ΔH = q ÷ mol_{rxn}",
                [("Grams of NO to moles", "15.0 g NO × {1 mol NO|30.01 g NO} = %s mol NO" % sig(D.E4_2["n"], 4)),
                 ("Moles to moles of reaction", "%s mol NO × {1 mol_{rxn}|2 mol NO} = %s mol_{rxn}" % (sig(D.E4_2["n"], 4), sig(D.E4_2["nrxn"], 4))),
                 ("Absorbed energy is positive", "q = +45.0 kJ   (endothermic)"),
                 ("Divide by mol_{rxn}", "ΔH = {+45.0 kJ|%s mol_{rxn}} = +180. kJ/mol_{rxn}" % sig(D.E4_2["nrxn"], 4))],
                "ΔH = +180. kJ/mol_{rxn}")


def s4_ex43(prs):
    solve_slide(prs, 4, "Example 4.3: which reactant limits the reaction?",
                "2Al + 3CuSO₄ → Al₂(SO₄)₃ + 3Cu\n1.750 g of Al is mixed with 100.0 mL of 0.250 M CuSO₄ and the reaction releases 10.0 kJ. Calculate ΔH in kJ/mol_{rxn}.",
                "Find mol_{rxn} for each reactant. The smaller one limits.",
                [("Aluminum", "1.750 g Al × {1 mol Al|26.98 g Al} × {1 mol_{rxn}|2 mol Al} = %s mol_{rxn}" % sig(D.E4_3["rxn_al"], 3)),
                 ("Copper(II) sulfate", "0.1000 L × {0.250 mol|1 L} × {1 mol_{rxn}|3 mol CuSO_{4}} = %s mol_{rxn}" % sig(D.E4_3["rxn_cu"], 3)),
                 ("The smaller amount limits", "CuSO_{4} is limiting: 0.00833 mol_{rxn}"),
                 ("Released, so q is negative", "ΔH = {−10.0 kJ|%s mol_{rxn}} = −1.20 × 10^{3} kJ/mol_{rxn}" % sig(D.E4_3["nrxn"], 3))],
                "ΔH = −1.20 × 10³ kJ/mol_{rxn}", "Highlight that the limiting reactant, not the excess, sets the energy.")


def s4_calorimeter(prs):
    s = new_slide(prs, "Calorimetry: the water tells us what the reaction did", 4, size=30)
    tl = Timeline(s)
    card(s, 0.55, 1.45, 7.2, 5.3, CARD, 0.1)
    cx, cy = 1.0, 2.35
    cup = poly(s, [(cx, cy), (cx + 3.6, cy), (cx + 3.15, cy + 3.5), (cx + 0.45, cy + 3.5)], "868E96", 4, "FFFFFF", closed=True)
    water = poly(s, [(cx + 0.1, cy + 0.95), (cx + 3.5, cy + 0.95), (cx + 3.15 - 0.03, cy + 3.44), (cx + 0.48, cy + 3.44)], "A5D8FF", 1, "A5D8FF", closed=True)
    txt(s, cx, cy - 0.5, 3.6, 0.4, "**Coffee-cup calorimeter**", 15, MUTE, align="c")
    pellet = circle(s, cx + 1.8, cy - 0.15, 0.2, "F8F9FA", "495057", 2)
    glow = [arrow(s, cx + 1.8, cy + 2.0, cx + 1.8 + dx, cy + 2.0 + dy, EMBER, 4) for dx, dy in ((-1.0, -0.4), (1.0, -0.4), (-0.9, 0.7), (0.9, 0.7))]
    th = Thermometer(s, cx + 4.45, 2.3, 2.5, 0.35, 0.8, RED)
    t_a = txt(s, cx + 3.95, 5.25, 1.35, 0.35, "**25.0 °C**", 16, MUTE, align="c")
    t_b = txt(s, cx + 3.95, 5.25, 1.35, 0.35, "**38.4 °C**", 16, tcol(EMBER), align="c")
    cards = [card_text(s, 8.1, 1.45 + k * 1.5, 4.7, 1.3, t, 17, SOFT[c], INK, "l", "m", pad=0.25, radius=0.14)
             for k, (t, c) in enumerate([("**The water gains energy**\nq_{soln} = mcΔT", ICE), ("**Opposite signs**\nq_{rxn} = −q_{soln}", EMBER), ("**Then per mole of reaction**\nΔH = q_{rxn} ÷ mol_{rxn}", GREEN)])]
    verdict = card_text(s, 8.1, 6.0, 4.7, 0.75, "Temperature **rises** → exothermic (ΔH < 0)", 16, SOFT[GOLD], INK, "c", "m", line=GOLD, pad=0.1, radius=0.14)
    tl.click("Drop the solid into the water")
    tl.move(pellet, [(0, 0), (E(0), E(1.9))], 1300)
    tl.then(); tl.out(pellet, dur=500)
    tl.click("The reaction releases energy into the water")
    tl.wipe(*glow, direction="left", dur=600)
    tl.wipe(th.rise, direction="bottom", dur=1800)
    tl.fade(t_b, dur=1800); tl.out(t_a, dur=1800)
    tl.click("Measure the water: q = mcΔT")
    tl.fade(cards[0])
    tl.click("The reaction's energy is the opposite of the water's")
    tl.fade(cards[1])
    tl.click("Divide by moles of reaction to get ΔH")
    tl.fade(cards[2])
    tl.click("A rise in temperature means exothermic")
    tl.fade(verdict)
    finish(s, tl, "Assumptions to state out loud: no heat lost to the cup or air, solution specific heat 4.184 J/g·°C, and the mass of the solution is used for m. Numbers shown match Example 4.5.", "Calorimeter")


def s4_ex44(prs):
    solve_slide(prs, 4, "Example 4.4: ΔH of dissolving NH₄Cl",
                "NH₄Cl(s) → NH₄⁺(aq) + Cl⁻(aq)\n5.9 g of NH₄Cl dissolves in 50.0 g of water and the temperature falls from 35.0 °C to 30.0 °C. Calculate ΔH in kJ/mol.",
                "q_{soln} = mcΔT, then flip the sign and divide by moles",
                [("Energy change of the water", "q_{soln} = (50.0 g)({4.184 J|g·°C})(30.0 − 35.0 °C) = −1046 J"),
                 ("Reaction energy is the opposite", "q_{rxn} = −q_{soln} = +1046 J = +1.046 kJ"),
                 ("Grams to moles of NH₄Cl", "5.9 g × {1 mol|53.49 g} = 0.110 mol"),
                 ("Divide: energy per mole", "ΔH = {+1.046 kJ|0.110 mol} = +9.5 kJ/mol")],
                "ΔH = +9.5 kJ/mol (endothermic)", "The water got colder, so the dissolving absorbed energy: ΔH is positive.")


def s4_ex45(prs):
    solve_slide(prs, 4, "Example 4.5: predict the final temperature",
                "NaOH(s) → Na⁺(aq) + OH⁻(aq)     ΔH = −45 kJ/mol\n2.50 g of NaOH dissolves in 50.0 g of water at 25.0 °C. Calculate the final temperature.",
                "mol NaOH → energy released → ΔT → T_{f}",
                [("Grams to moles of NaOH", "2.50 g × {1 mol|40.00 g} = 0.0625 mol"),
                 ("Energy released into the water", "q = 0.0625 mol × {45 kJ|1 mol} = 2.81 kJ = 2812 J"),
                 ("Solve q = mcΔT for ΔT", "ΔT = {q|mc} = {2812 J|(50.0 g)(4.184 J/g·°C)} = %s °C" % sig(D.E4_5["dT"], 3)),
                 ("Add to the starting temperature", "T_{f} = 25.0 + %s = %s °C" % (sig(D.E4_5["dT"], 3), sig(D.E4_5["Tf"], 3)))],
                "T_{f} = %s °C" % sig(D.E4_5["Tf"], 3), "This is the calorimeter animation run forward.")


def s4_ex46(prs):
    solve_slide(prs, 4, "Example 4.6: neutralization",
                "NaOH + HCl → NaCl + H₂O\n50.0 mL of 1.0 M HCl and 100.0 mL of 1.0 M NaOH are mixed; the temperature rises by 4.6 °C. Find ΔH in kJ/mol_{rxn}. (d = 1.0 g/mL, c = 4.184 J/g·°C)",
                "Mass of solution → q, then divide by the limiting reactant",
                [("Mass of the whole solution", "(50.0 + 100.0) mL × {1.0 g|1 mL} = 150.0 g"),
                 ("Energy gained by the solution", "q = (150.0 g)({4.184 J|g·°C})(4.6 °C) = %s kJ released" % sig(D.E4_6["q"] / 1000, 3)),
                 ("Limiting reactant", "HCl: 0.0500 L × 1.0 M = 0.0500 mol = 0.0500 mol_{rxn}"),
                 ("Energy per mole of reaction", "ΔH = {−%s kJ|0.0500 mol_{rxn}} = −58 kJ/mol_{rxn}" % sig(D.E4_6["q"] / 1000, 3))],
                "ΔH = −58 kJ/mol_{rxn}", "Both volumes add: the 150.0 g includes the NaOH solution as well as the HCl.")


# ================================================================== section 5
def s5_formation(prs):
    s = new_slide(prs, "Enthalpy of formation: energy measured from the elements", 5, size=30)
    tl = Timeline(s)
    card(s, 0.55, 1.45, 7.6, 5.3, CARD, 0.1)
    y0, k = 2.95, 0.0078                # kJ -> inches
    zero = line(s, 1.3, y0, 7.9, y0, INK, 3)
    ax = arrow(s, 1.3, 6.4, 1.3, 1.85, MUTE, 2)
    txt(s, 0.7, 1.55, 2.0, 0.3, "ΔH°_{f}  (kJ/mol)", 12, MUTE)
    zl = txt(s, 4.2, y0 - 0.62, 3.7, 0.55, "**Elements in their standard state: 0**\nH₂(g), O₂(g), C(graphite)", 13, tcol(GREEN), align="r")
    levels = [("C₂H₄", 52.4, VIOLET), ("CH₄", -74.6, ICE), ("H₂O(l)", -286.0, TEAL), ("CO₂", -393.5, EMBER)]
    bars, labels = [], []
    for j, (name, v, c) in enumerate(levels):
        bx = 2.0 + j * 1.5
        top, bot = (y0 - v * k, y0) if v > 0 else (y0, y0 - v * k)
        b = card(s, bx, top, 0.95, bot - top, c, 0.03)
        lab = txt(s, bx - 0.25, (bot + 0.06) if v < 0 else (top - 0.62), 1.45, 0.6, "**%s**\n%s" % (name, ("+" if v > 0 else "−") + "%s" % sig(abs(v), 3 if abs(v) < 100 else 4)), 13, tcol(c) if c != TEAL else "0B7285", align="c")
        bars.append((b, v)); labels.append(lab)
    defn = card_text(s, 8.45, 1.45, 4.35, 2.45, "**Formation reaction:** 1 mol of a compound forms from its elements.\n\nC(s) + O₂(g) → CO₂(g)\n**ΔH°_{f} = −393.5 kJ/mol**", 16, SOFT[GREEN], INK, "l", "m", pad=0.25, radius=0.14)
    row, rw, rh = eqrow(s, 8.6, 4.55, "ΔH°_{rxn} = ΣnΔH°_{f}(products) − ΣnΔH°_{f}(reactants)", 18, INK, max_w=4.1)
    eqc = card(s, 8.45, 4.1, 4.35, 1.55, WHITE, 0.14, line=LINE)
    # put the card behind the equation
    sp = eqc._element.getparent(); sp.remove(eqc._element); sp.insert(list(sp).index(row._element), eqc._element)
    note = card_text(s, 8.45, 5.85, 4.35, 0.9, "Products minus reactants, each × its coefficient", 15, SOFT[GOLD], INK, "c", "m", line=GOLD, pad=0.1, radius=0.14)
    tl.click("Zero point: elements in their standard states")
    tl.wipe(zero, direction="left", dur=600); tl.fade(zl)
    tl.click("Definition: a formation reaction")
    tl.fade(defn)
    for (b, v), lab, (name, _, _) in zip(bars, labels, levels):
        tl.click("%s sits %s the elements" % (name, "above" if v > 0 else "below"))
        tl.wipe(b, direction="bottom" if v > 0 else "top", dur=900); tl.fade(lab)
    tl.click("Use the table values to find any reaction's ΔH")
    tl.fade(eqc, row); tl.fade(note)
    finish(s, tl, "Bars below the line are compounds that are more stable than their elements (exothermic formation). C₂H₄ is above the line: it is formed by an endothermic reaction.", "Formation")


def s5_ex51(prs):
    def visual(s, x, y, w, h):
        rows = [("C₃H₈(g)", "−103.8"), ("O₂(g)", "0"), ("CO₂(g)", "−393.5"), ("H₂O(l)", "−286")]
        card(s, x, y, w, min(h, 2.75), WHITE, 0.1, line=LINE)
        txt(s, x + 0.2, y + 0.1, w - 0.4, 0.3, "ΔH°_{f} (kJ/mol)", 12, MUTE, bold=True)
        hl_prod, hl_react = [], []
        for k, (n, v) in enumerate(rows):
            yy = y + 0.5 + k * 0.5
            hl = card(s, x + 0.12, yy, w - 0.24, 0.44, SOFT[GREEN], 0.08)
            (hl_react if k < 2 else hl_prod).append(hl)
            txt(s, x + 0.3, yy, 2.2, 0.44, n, 16, INK, anchor="m")
            txt(s, x + 2.4, yy, w - 2.7, 0.44, v, 16, INK, bold=True, align="r", anchor="m")
        return [[], hl_prod, hl_react, []]
    solve_slide(prs, 5, "Example 5.1: ΔH from enthalpies of formation",
                "Balance the combustion of propane and calculate ΔH°_{rxn}:\nC₃H₈(g) + O₂(g) → CO₂(g) + H₂O(l)",
                "ΔH° = Σ(products) − Σ(reactants)",
                [("Balance the equation", "C₃H₈ + 5O₂ → 3CO₂ + 4H₂O(l)"),
                 ("Add the products × coefficients", "3(−393.5) + 4(−286) = −2324.5 kJ"),
                 ("Add the reactants (O₂ = 0)", "(−103.8) + 5(0) = −103.8 kJ"),
                 ("Products minus reactants", "ΔH° = −2324.5 − (−103.8) = −2221 kJ/mol_{rxn}")],
                "ΔH° = −2221 kJ/mol_{rxn}", "Common slip: forgetting the coefficients, or forgetting that elements like O₂ have ΔH°f = 0.", visual=visual)


def s5_bonds(prs):
    s = new_slide(prs, "Example 5.2: ΔH from bond enthalpies, CH₄ + 2O₂ → CO₂ + 2H₂O", 5, size=28)
    tl = Timeline(s)
    combustion_scene(s, tl, quant=True)
    txt(s, 0.55, 1.35, 6.5, 0.3, "bond enthalpies (kJ/mol):  C–H 413   O=O 498   C=O 799   O–H 463", 13, MUTE)
    finish(s, tl, "ΔH = Σ(bonds broken) − Σ(bonds formed). Bond enthalpies are averages, so this is an estimate (the formation-enthalpy method for the same reaction gives −802 kJ too).", "Bond enthalpy")


# ================================================================== section 6
def s6_path(prs):
    s = new_slide(prs, "Hess's law: only the start and the finish matter", 6)
    tl = Timeline(s)
    card(s, 0.55, 1.45, 7.7, 5.3, CARD, 0.1)
    mount = poly(s, [(0.9, 6.5), (2.0, 4.1), (4.0, 2.25), (6.1, 1.7), (7.9, 2.9), (7.9, 6.5)], "ADB5BD", 2, "E9ECEF", closed=True)
    S0, F0 = (1.35, 6.0), (6.45, 2.0)
    base = txt(s, 0.85, 6.1, 2.2, 0.3, "**start (reactants)**", 13, MUTE)
    summit = txt(s, 6.3, 1.5, 1.8, 0.3, "**finish (products)**", 13, MUTE, align="c")
    r1 = [S0, (3.9, 3.2), F0]
    r2 = [S0, (2.7, 4.6), (3.7, 4.6), (4.9, 3.3), F0]
    l1 = poly(s, r1, EMBER, 4)
    l2 = poly(s, r2, ICE, 4)
    dh = line(s, 7.55, S0[1], 7.55, F0[1], INK, 2.5, head=True, tail=True)
    dhl = txt(s, 7.0, 3.7, 0.5, 0.3, "ΔH", 14, INK, bold=True, align="r")
    b1 = ball(s, S0[0], S0[1] - 0.05, 0.16, EMBER)
    b2 = ball(s, S0[0] + 0.05, S0[1] - 0.05, 0.16, ICE)
    p1 = [(E(x - S0[0]), E(y - S0[1])) for x, y in r1]
    p2 = [(E(x - S0[0]), E(y - S0[1])) for x, y in r2]
    c1 = card_text(s, 8.55, 1.45, 4.25, 1.4, "**Route 1** (one step)\nΔH = ΔH_{direct}", 17, SOFT[EMBER], INK, "l", "m", pad=0.25, radius=0.14)
    c2 = card_text(s, 8.55, 3.05, 4.25, 1.4, "**Route 2** (several steps)\nΔH = ΔH_{1} + ΔH_{2} + ΔH_{3}", 17, SOFT[ICE], INK, "l", "m", pad=0.25, radius=0.14)
    c3 = card_text(s, 8.55, 4.65, 4.25, 2.1, "**Same start, same finish, same ΔH.**\nEnthalpy is a **state function**: it does not remember the path.", 17, SOFT[GOLD], INK, "l", "m", line=GOLD, pad=0.25, radius=0.14)
    tl.click("Route 1: the direct climb")
    tl.move(b1, p1, 2600); tl.fade(c1)
    tl.click("Route 2: the long way around")
    tl.move(b2, p2, 3200); tl.fade(c2)
    tl.click("Both arrive at the same height")
    tl.fade(dh, dhl, c3)
    finish(s, tl, "Altitude is the classic analogy: the change in height depends on where you start and where you finish, not on which trail you hike.", "Hess path")


def s6_rules(prs):
    col = SECTION_COLORS[6]
    s = new_slide(prs, "Three rules for combining reactions", 6)
    tl = Timeline(s)
    rules = [("Reverse", "A → B    ΔH = +50 kJ", "B → A    ΔH = −50 kJ", "flip the sign of ΔH", ICE),
             ("Multiply", "A → B    ΔH = +50 kJ", "2A → 2B    ΔH = +100 kJ", "multiply ΔH by the same number", GREEN),
             ("Add", "A → B    +50 kJ\nB → C    −20 kJ", "A → C    +30 kJ", "add the ΔH values; B cancels", EMBER)]
    y = 1.5
    for k, (name, a, b, why, c) in enumerate(rules):
        h = 1.65
        bg = card(s, 0.55, y, W - 1.1, h, CARD, 0.12)
        tag = chip(s, 0.8, y + h / 2 - 0.25, 1.7, 0.5, "%d  %s" % (k + 1, name), c, WHITE, 17)
        ta = txt(s, 2.85, y, 3.4, h, a, 19, INK, anchor="m", spacing=1.1)
        arr = arrow(s, 6.35, y + h / 2, 7.0, y + h / 2, MUTE, 3)
        tb = txt(s, 7.25, y, 3.2, h, "**%s**" % b, 19, tcol(c), anchor="m")
        tw = txt(s, 10.4, y, 2.35, h, why, 15, MUTE, anchor="m")
        tl.click("Rule %d: %s" % (k + 1, name))
        tl.fade(bg, tag, ta)
        tl.then(); tl.wipe(arr, direction="left", dur=400); tl.fade(tb, tw)
        y += h + 0.2
    finish(s, tl, "Tell students: find a substance that appears in only one of the given equations first, match its side and coefficient to the target, then fix everything else.", "Rules")


def _terms_row(s, x, y, left, right, size, max_w):
    """Lay out a summed equation term by term so cancelled terms can be struck through.
    left/right: [(text, cancels?)].  Returns (group, strikes)."""
    toks = []
    for side_i, side in enumerate((left, right)):
        if side_i == 1:
            toks.append(("→", False, "arrow"))
        for k, (t, c) in enumerate(side):
            if k:
                toks.append(("+", False, "plus"))
            toks.append((t, c, "term"))
    while True:
        widths = [text_width_pt(t, size) / 72.0 + (0.28 if kind != "term" else 0.0) for t, c, kind in toks]
        if sum(widths) <= max_w or size <= 12:
            break
        size -= 0.5
    g = s.shapes.add_group_shape()
    strikes, cx = [], x
    h = size * 1.5 / 72.0
    for (t, c, kind), w in zip(toks, widths):
        tb = g.shapes.add_textbox(E(cx), E(y), E(w + 0.02), E(h))
        tf = tb.text_frame; tf.word_wrap = False
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        pp = tf.paragraphs[0]; pp.alignment = PP_ALIGN.CENTER if kind != "term" else PP_ALIGN.LEFT
        r = pp.add_run(); r.text = t; r.font.size = Pt(size); r.font.name = FONT; r.font.color.rgb = rgb(MUTE if kind != "term" else INK)
        if c:
            strikes.append((cx, w))
        cx += w
    lines = [line(s, sx - 0.03, y + h / 2, sx + sw + 0.03, y + h / 2, RED, 3.5) for sx, sw in strikes]
    return g, lines


def hess_slide(prs, title, target, rows, left_terms, right_terms, clean, total_markup, answer, tip):
    """rows: [(original_equation_text, modified_equation_text, how)]"""
    col = SECTION_COLORS[6]
    s = new_slide(prs, title, 6)
    tl = Timeline(s)
    tg = card_text(s, 0.55, 1.4, W - 1.1, 0.62, "**Target:**  %s" % target, 18, SOFT[col], INK, "l", "m", pad=0.25, radius=0.14)
    n = len(rows)
    rh = 0.66 if n > 3 else 0.74
    y0 = 2.2
    txt(s, 0.7, y0 - 0.02, 5.5, 0.3, "GIVEN", 11, tcol(col), bold=True)
    txt(s, 6.8, y0 - 0.02, 5.5, 0.3, "ADJUSTED TO MATCH THE TARGET", 11, tcol(col), bold=True)
    tl.click("The target reaction"); tl.fade(tg)
    for k, (orig, mod, how) in enumerate(rows):
        y = y0 + 0.3 + k * (rh + 0.08)
        card(s, 0.55, y, 6.05, rh, CARD, 0.1)
        txt(s, 0.7, y, 5.8, rh, "**(%d)**  %s" % (k + 1, orig), 14, INK, anchor="m")
        mc = card(s, 6.75, y, 6.05, rh, WHITE, 0.1, line=LINE)
        mt = txt(s, 6.9, y, 4.35, rh, mod, 14, INK, anchor="m")
        tg_chip = chip(s, 11.2, y + rh / 2 - 0.2, 1.5, 0.4, how, EMBER if how != "keep" else "868E96", WHITE, 12)
        tl.click("Equation (%d): %s" % (k + 1, how))
        tl.fade(mc, mt, tg_chip)
    ys = y0 + 0.3 + n * (rh + 0.08) + 0.12
    sl = txt(s, 0.7, ys, 1.1, 0.5, "**Add:**", 17, tcol(col), anchor="m")
    grp, strikes = _terms_row(s, 1.7, ys, left_terms, right_terms, 17, 11.0)
    tl.click("Add the adjusted equations")
    tl.fade(sl, grp)
    tl.click("Cancel what appears on both sides")
    tl.wipe(*strikes, direction="left", dur=900)
    cl = card_text(s, 0.55, ys + 0.62, 7.4, 0.62, clean, 17, SOFT[GREEN], INK, "l", "m", line=GREEN, pad=0.2, radius=0.14)
    tl.click("What is left is exactly the target")
    tl.fade(cl)
    row, w, h = eqrow(s, 8.2, ys + 0.62 + (0.62 - 0.4) / 2 - 0.12, total_markup, 20, INK, max_w=4.5)
    ans = card_text(s, 8.1, ys + 0.62 - 0.02, 4.7, 0.72, "", 20, SOFT[GOLD], INK, "c", "m", line=GOLD)
    # draw the answer card behind the equation row
    sp = ans._element.getparent(); sp.remove(ans._element); sp.insert(list(sp).index(row._element), ans._element)
    tl.click("Add the ΔH values: " + answer)
    tl.fade(ans, row)
    tl.then(); tl.pulse(ans, scale=1.04, dur=500)
    finish(s, tl, tip, title)
    return s


def s6_ex61(prs):
    hess_slide(prs, "Example 6.1: ΔH for making 2-methylpropene",
               "C₄H₁₀O(l) → C₄H₈(g) + H₂O(g)",
               [("4C + 5H₂ + ½O₂ → C₄H₁₀O(l)     ΔH = −335 kJ", "C₄H₁₀O(l) → 4C + 5H₂ + ½O₂     ΔH = +335 kJ", "reverse"),
                ("4C + 4H₂ → C₄H₈(g)     ΔH = −17 kJ", "4C + 4H₂ → C₄H₈(g)     ΔH = −17 kJ", "keep"),
                ("H₂ + ½O₂ → H₂O(g)     ΔH = −242 kJ", "H₂ + ½O₂ → H₂O(g)     ΔH = −242 kJ", "keep")],
               [("C₄H₁₀O", False), ("4C", True), ("4H₂", True), ("H₂", True), ("½O₂", True)],
               [("4C", True), ("5H₂", True), ("½O₂", True), ("C₄H₈", False), ("H₂O", False)],
               "C₄H₁₀O → C₄H₈ + H₂O   ✓ matches the target",
               "ΔH = +335 + (−17) + (−242) = +76 kJ", "ΔH = +76 kJ/mol_{rxn}",
               "Students often forget to flip the sign when they reverse. Notice 4H₂ + H₂ on the left cancels the 5H₂ on the right.")


def s6_ex62(prs):
    hess_slide(prs, "Example 6.2: ΔH for forming quinone",
               "C₆H₄(OH)₂(aq) + H₂O₂(aq) → C₆H₄O₂(aq) + 2H₂O(l)",
               [("C₆H₄(OH)₂ → C₆H₄O₂ + H₂     ΔH = +177.4 kJ", "C₆H₄(OH)₂ → C₆H₄O₂ + H₂     ΔH = +177.4 kJ", "keep"),
                ("H₂ + O₂ → H₂O₂     ΔH = −191.2 kJ", "H₂O₂ → H₂ + O₂     ΔH = +191.2 kJ", "reverse"),
                ("H₂ + ½O₂ → H₂O(g)     ΔH = −241.8 kJ", "2H₂ + O₂ → 2H₂O(g)     ΔH = −483.6 kJ", "× 2"),
                ("H₂O(g) → H₂O(l)     ΔH = −43.8 kJ", "2H₂O(g) → 2H₂O(l)     ΔH = −87.6 kJ", "× 2")],
               [("C₆H₄(OH)₂", False), ("H₂O₂", False), ("2H₂", True), ("O₂", True), ("2H₂O(g)", True)],
               [("C₆H₄O₂", False), ("H₂", True), ("H₂", True), ("O₂", True), ("2H₂O(g)", True), ("2H₂O(l)", False)],
               "C₆H₄(OH)₂ + H₂O₂ → C₆H₄O₂ + 2H₂O(l)   ✓",
               "ΔH = 177.4 + 191.2 − 483.6 − 87.6 = −202.6 kJ", "ΔH = −202.6 kJ/mol_{rxn}",
               "This is the same method as 6.1 with a multiply step. The cancelled species are H₂, O₂ and H₂O(g).")
