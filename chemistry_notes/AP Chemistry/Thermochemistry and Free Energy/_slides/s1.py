"""Front matter and Sections 1-3."""
import math
from scenes import *


# ================================================================== front matter
def roadmap(prs):
    s = new_slide(prs, "The plan: nine sections, one story")
    tl = Timeline(s)
    cw, ch, gap = 3.9, 1.55, 0.25
    for n in range(1, 10):
        r, c = divmod(n - 1, 3)
        x, y = 0.55 + c * (cw + gap), 1.5 + r * (ch + gap)
        col = SECTION_COLORS[n]
        bg = card(s, x, y, cw, ch, CARD, 0.12)
        b = badge(s, x + 0.55, y + ch / 2, 0.33, str(n), col, WHITE, 22)
        t = txt(s, x + 1.1, y + 0.15, cw - 1.25, ch - 0.3, "**%s**" % SECTION_NAMES[n], 16, INK, anchor="m")
        tl.click("Section %d: %s" % (n, SECTION_NAMES[n]))
        tl.fade(bg, b, t)
    finish(s, tl, "Sections 1 to 6 are about the energy of a change (enthalpy). Sections 7 to 9 add disorder (entropy) and combine both into free energy.", "Roadmap")


def equation_sheet(prs):
    s = new_slide(prs, "Your equation toolkit")
    tl = Timeline(s)
    eqs = [("Heat", "q = mcΔT", EMBER), ("Reaction enthalpy (formation)", "ΔH°_{rxn} = ΣnΔH°_{f}(products) − ΣnΔH°_{f}(reactants)", GREEN),
           ("Reaction enthalpy (bonds)", "ΔH_{rxn} = Σ(bonds broken) − Σ(bonds formed)", GREEN),
           ("Entropy change", "ΔS°_{rxn} = ΣnS°(products) − ΣnS°(reactants)", VIOLET),
           ("Gibbs free energy", "ΔG° = ΔH° − TΔS°", PINK), ("Free energy and K", "ΔG° = −RT ln K        R = 8.314 J/mol·K", SECTION_COLORS[9])]
    y = 1.5
    for k, (name, eq, col) in enumerate(eqs):
        bg = card(s, 0.55, y, W - 1.1, 0.8, CARD, 0.12)
        tag = chip(s, 0.75, y + 0.2, 3.3, 0.4, name, col, WHITE, 14)
        row, w, h = eqrow(s, 4.3, y + 0.8 / 2 - 0.2, eq, 22, INK, max_w=8.3)
        tl.click(name)
        tl.fade(bg, tag, row)
        y += 0.93
    finish(s, tl, "Preview only. Each equation gets its own section. Remind students that temperature is always in kelvin in the free energy equations.", "Equations")


# ================================================================== section 1
def s1_energy_flow(prs):
    s = new_slide(prs, "Energy flows between the system and the surroundings", 1)
    tl = Timeline(s)
    for kind in ("exo", "endo"):
        exo = kind == "exo"
        x0 = 0.55 if exo else 6.9
        col = EMBER if exo else ICE
        card(s, x0, 1.45, 5.9, 5.2, CARD, 0.12)
        txt(s, x0 + 0.3, 1.55, 5.3, 0.5, "Exothermic" if exo else "Endothermic", 24, tcol(col), bold=True)
        sysb = card(s, x0 + 0.4, 2.3, 2.6, 2.8, SOFT[col], 0.15, line=col)
        txt(s, x0 + 0.4, 2.35, 2.6, 0.35, "SYSTEM", 12, tcol(col), bold=True, align="c")
        for (px, py) in scatter(7, x0 + 0.7, 2.9, x0 + 2.7, 4.8, 0.5, 3 if exo else 8):
            circle(s, px, py, 0.17, "F2B84B" if exo else "7FB2F0", "495057", 1.0)
        arrows = []
        for yy in (3.1, 3.7, 4.3):
            if exo:
                arrows.append(arrow(s, x0 + 3.1, yy, x0 + 4.35, yy, EMBER, 4))
            else:
                arrows.append(arrow(s, x0 + 4.35, yy, x0 + 3.1, yy, ICE, 4))
        th = Thermometer(s, x0 + 4.85, 2.35, 2.2, 0.35 if exo else 0.8, 0.8 if exo else 0.35, RED if exo else ICE)
        txt(s, x0 + 3.25, 5.0, 2.5, 0.3, "SURROUNDINGS", 12, MUTE, bold=True, align="c")
        verdict = card_text(s, x0 + 0.4, 5.6, 5.1, 0.8,
                            "energy **released** · surroundings **warmer** · ΔH < 0" if exo else "energy **absorbed** · surroundings **colder** · ΔH > 0",
                            17, SOFT[col], INK, "c", "m", pad=0.1, radius=0.12)
        tl.click("%s: watch the energy and the thermometer" % ("Exothermic" if exo else "Endothermic"))
        tl.wipe(*arrows, direction="left" if exo else "right", dur=1100)
        if exo:
            tl.wipe(th.rise, direction="bottom", dur=1500)
        else:
            tl.wipe(th.cover, direction="top", dur=1500)
        tl.then(); tl.fade(verdict)
    finish(s, tl, "Anchor the vocabulary: the system is the reaction, the surroundings are the water, the air, the beaker, and your hand. "
                  "In an exothermic process your hand feels warm; in an endothermic one it feels cold.", "Energy flow")


def s1_examples(prs):
    s = new_slide(prs, "Physical changes and reactions can both be endo or exo", 1)
    tl = Timeline(s)
    rows = [("Vaporizing water", False, "Attractions between molecules are overcome, so energy is absorbed."),
            ("Freezing water", True, "Attractions form between molecules, so energy is released."),
            ("Combustion of methane", True, "The bonds formed in CO₂ and H₂O are stronger than the bonds broken in CH₄ and O₂."),
            ("Dissolving ammonium nitrate", False, "The solution gets cold: separating the ions takes more energy than hydrating them returns.")]
    for k, (name, exo, why) in enumerate(rows):
        y = 1.5 + k * 1.4
        bg = card(s, 0.55, y, W - 1.1, 1.2, CARD, 0.12)
        n = txt(s, 0.85, y, 4.0, 1.2, "**%s**" % name, 22, INK, anchor="m")
        c = chip(s, 4.95, y + 0.33, 2.0, 0.54, "exothermic" if exo else "endothermic", EMBER if exo else ICE, WHITE, 16)
        w = txt(s, 7.25, y, 5.3, 1.2, why, 16, INK, anchor="m")
        tl.click(name)
        tl.fade(bg, n, c, w)
    finish(s, tl, "Ask first: endothermic or exothermic? Then click to confirm and read the particle-level reason.", "Examples")


def s1_bonds(prs):
    s = new_slide(prs, "Why? Breaking bonds costs energy, forming bonds pays it back", 1, size=30)
    tl = Timeline(s)
    combustion_scene(s, tl, quant=False)
    finish(s, tl, "CH₄ + 2O₂ → CO₂ + 2H₂O. We will put numbers on this exact reaction in Section 5.", "Bonds qualitative")


def s1_profiles(prs):
    s = new_slide(prs, "Reaction profiles: the energy hill", 1)
    tl = Timeline(s)
    for kind in ("exo", "endo"):
        exo = kind == "exo"
        px = 0.75 if exo else 6.98
        col = EMBER if exo else ICE
        card(s, px - 0.2, 1.4, 6.0, 5.0, CARD, 0.1)
        txt(s, px + 0.15, 1.5, 5.0, 0.45, "Exothermic: ΔH < 0" if exo else "Endothermic: ΔH > 0", 22, tcol(col), bold=True)
        e_r, e_p, e_pk = (6.2, 2.4, 9.0) if exo else (2.4, 6.2, 9.0)
        pts, Y = profile_points(px + 0.2, 2.3, 5.0, 3.6, e_r, e_p, e_pk)
        axes(s, px + 0.2, 2.3, 5.3, 3.6, "reaction progress", "energy")
        poly(s, pts, "343A40", 4)
        bx, by = pts[0]
        b = ball(s, bx + 0.1, by - 0.18, 0.17, col)
        off = path_offsets([(x + 0.1, y - 0.18) for x, y in pts], 40)
        # labels
        txt(s, px + 0.8, Y(e_r) - 0.45, 1.5, 0.3, "reactants", 13, MUTE, bold=True)
        txt(s, px + 3.5, Y(e_p) + (0.1 if e_p < e_r else -0.45), 1.6, 0.3, "products", 13, MUTE, bold=True, align="r")
        mid_x = px + 0.2 + 5.0 * 0.5
        ea = line(s, mid_x, Y(e_r), mid_x, Y(e_pk), INK, 2.5, head=True, tail=True)
        eal = txt(s, mid_x + 0.12, (Y(e_r) + Y(e_pk)) / 2 - 0.2, 1.4, 0.4, "**E**_{a}", 18, INK)
        dx = px + 0.2 + 5.0 * 0.97
        dh = line(s, dx, Y(e_r), dx, Y(e_p), col, 3, head=True, tail=True)
        dhl = txt(s, dx - 0.75, (Y(e_r) + Y(e_p)) / 2 - 0.2, 0.62, 0.4, "**ΔH**", 18, tcol(col), align="r")
        dl = line(s, px + 0.2 + 5.0 * 0.04, Y(e_r), dx, Y(e_r), "ADB5BD", 1.5, dash=True)
        tl.click("%s: roll the ball over the barrier" % ("Exothermic" if exo else "Endothermic"))
        tl.move(b, off, 3200)
        tl.then(); tl.fade(ea, eal, dl)
        tl.then(); tl.fade(dh, dhl)
    finish(s, tl, "Ea is the barrier going forward (top minus reactants). ΔH is the net change (products minus reactants). "
                  "Ask: where is the barrier for the reverse reaction? (Ea reverse = Ea forward − ΔH.)", "Profiles")


def s1_ex11(prs):
    s = new_slide(prs, "Example 1.1: classify the reaction and sketch its profile", 1, size=28)
    tl = Timeline(s)
    pc = card(s, 0.55, 1.45, 4.45, 2.2, CARD, 0.12)
    txt(s, 0.75, 1.55, 4.0, 0.3, "PROBLEM", 11, EMBER, bold=True)
    txt(s, 0.75, 1.88, 4.1, 1.7, "2Al + Fe₂O₃ → 2Fe + Al₂O₃\nΔH = −852 kJ/mol_{rxn}\n\nClassify the reaction and sketch its reaction profile.", 16, INK, spacing=1.05)
    verdict = card_text(s, 0.55, 3.9, 4.45, 1.3, "ΔH < 0, so the reaction is **exothermic**: the products sit **lower** in energy than the reactants.", 17, SOFT[EMBER], INK, "l", "m", pad=0.22)
    legend = card_text(s, 0.55, 5.4, 4.45, 1.3, "Label **reactants**, **products**, **Ea** and **ΔH = −852 kJ**.", 16, CARD, INK, "l", "m", pad=0.22)
    # drawing area
    area = card(s, 5.35, 1.45, 7.4, 5.3, WHITE, 0.1, line=LINE)
    ax = axes(s, 5.9, 1.9, 6.4, 4.2, "reaction progress", "energy")
    e_r, e_p, e_pk = 7.0, 2.4, 9.3
    pts, Y = profile_points(6.1, 2.0, 6.0, 4.0, e_r, e_p, e_pk)
    lvl_r = line(s, 6.1, Y(e_r), 7.45, Y(e_r), "343A40", 4)
    r_lab = txt(s, 6.1, Y(e_r) - 0.45, 3.0, 0.4, "2Al + Fe₂O₃", 17, INK, bold=True)
    curve = poly(s, pts, "343A40", 4)
    lvl_p = line(s, 10.9, Y(e_p), 12.1, Y(e_p), "343A40", 4)
    p_lab = txt(s, 9.6, Y(e_p) + 0.05, 2.6, 0.4, "2Fe + Al₂O₃", 17, INK, bold=True, align="r")
    ea = line(s, 8.75, Y(e_r), 8.75, Y(e_pk), INK, 2.5, head=True, tail=True)
    eal = txt(s, 8.9, (Y(e_r) + Y(e_pk)) / 2 - 0.2, 1.5, 0.4, "**E**_{a}", 18, INK)
    dl = line(s, 6.4, Y(e_r), 12.4, Y(e_r), "ADB5BD", 1.5, dash=True)
    dh = line(s, 12.4, Y(e_r), 12.4, Y(e_p), EMBER, 3, head=True, tail=True)
    dhl = txt(s, 10.4, Y(e_r) - 0.5, 2.1, 0.4, "**ΔH = −852 kJ**", 17, tcol(EMBER), align="r")
    tl.click("Step 1: read the sign of ΔH")
    tl.fade(verdict)
    tl.click("Step 2: draw the reactants (high) on the left")
    tl.wipe(lvl_r, direction="left", dur=600); tl.fade(r_lab)
    tl.click("Step 3: draw the hill and then down to the products")
    tl.wipe(curve, direction="left", dur=2200)
    tl.then(); tl.wipe(lvl_p, direction="left", dur=500); tl.fade(p_lab)
    tl.click("Step 4: label Ea (the barrier) and ΔH (the net drop)")
    tl.fade(dl, ea, eal)
    tl.then(); tl.fade(dh, dhl)
    tl.click("Reminder of what to label")
    tl.fade(legend)
    finish(s, tl, "Have students sketch on their own paper while you build the drawing. Check that the products are lower and that Ea starts at the reactants.", "Example 1.1")


# ================================================================== section 2
def s2_hot_cold(prs):
    s = new_slide(prs, "Heat flows from hot to cold until the temperatures match", 2, size=30)
    tl = Timeline(s)
    # hot metal block, cold water, arrows
    card(s, 0.55, 1.45, 8.4, 4.0, CARD, 0.1)
    metal_hot = card(s, 1.0, 2.3, 2.3, 2.1, "FF6B35", 0.1, line="C2410C")
    metal_mid = card(s, 1.0, 2.3, 2.3, 2.1, "FFB27A", 0.1, line="C2410C")
    txt(s, 1.0, 1.7, 2.3, 0.4, "**Hot metal**", 18, INK, align="c")
    metal_lab_a = txt(s, 1.0, 4.45, 2.3, 0.4, "**95 °C**", 20, "C2410C", align="c")
    metal_lab_b = txt(s, 1.0, 4.45, 2.3, 0.4, "**25 °C**", 20, "C2410C", align="c")
    water_cold = card(s, 5.4, 2.3, 3.0, 2.1, "74C0FC", 0.1, line="1864AB")
    water_mid = card(s, 5.4, 2.3, 3.0, 2.1, "A5D8FF", 0.1, line="1864AB")
    txt(s, 5.4, 1.7, 3.0, 0.4, "**Water**", 18, INK, align="c")
    water_lab_a = txt(s, 5.4, 4.45, 3.0, 0.4, "**21 °C**", 20, "1864AB", align="c")
    water_lab_b = txt(s, 5.4, 4.45, 3.0, 0.4, "**25 °C**", 20, "1864AB", align="c")
    arrows = [arrow(s, 3.5, y, 5.2, y, EMBER, 4) for y in (2.9, 3.35, 3.8)]
    heatq = txt(s, 3.45, 2.3, 1.8, 0.4, "heat q", 15, tcol(EMBER), bold=True, align="c")
    lvl = lambda T: 0.08 + 0.84 * T / 100.0            # one temperature scale for both tubes: equal temperatures give equal heights
    th_m = Thermometer(s, 9.35, 1.95, 2.5, lvl(95), lvl(25), RED)
    th_w = Thermometer(s, 10.75, 1.95, 2.5, lvl(21), lvl(25), ICE)
    txt(s, 9.0, 4.75, 1.0, 0.3, "metal", 13, MUTE, align="c")
    txt(s, 10.4, 4.75, 1.0, 0.3, "water", 13, MUTE, align="c")
    eq = card_text(s, 0.55, 5.75, 8.4, 1.0, "Energy is conserved:  **q**_{lost by metal} = −**q**_{gained by water}", 20, SOFT[GOLD], INK, "c", "m", line=GOLD, pad=0.15)
    eqd = card_text(s, 9.15, 5.4, 3.65, 1.35, "Same final temperature = **thermal equilibrium**", 17, SOFT[GREEN], INK, "c", "m", line=GREEN, pad=0.15)
    tl.click("Heat flows from the hotter object to the colder one")
    tl.wipe(*arrows, direction="left", dur=1200)
    tl.fade(heatq, dur=600)
    tl.fade(metal_mid, dur=2400); tl.fade(water_mid, dur=2400)
    tl.wipe(th_m.cover, direction="top", dur=2400); tl.wipe(th_w.rise, direction="bottom", dur=2400)
    tl.then(); tl.swap([metal_lab_a, water_lab_a], [metal_lab_b, water_lab_b])
    tl.click("At equilibrium both are at the same temperature")
    tl.fade(eqd)
    tl.click("Energy is conserved")
    tl.fade(eq)
    finish(s, tl, "The final temperature is between the two starting temperatures. Ask: which object changes temperature more, the one with the bigger mass or the smaller specific heat?", "Hot to cold")


def s2_heat_capacity(prs):
    s = new_slide(prs, "Specific heat: the same energy, a different temperature change", 2, size=30)
    tl = Timeline(s)
    card(s, 0.55, 1.45, W - 1.1, 4.45, CARD, 0.1)
    subs = [("Water", "4.184", ICE, 0.05), ("Aluminum", "0.900", "868E96", 0.23), ("Copper", "0.385", "C2410C", 0.55)]
    ths = []
    for k, (name, c, col, rise) in enumerate(subs):
        cx = 2.3 + k * 3.7
        card_text(s, cx - 1.2, 1.7, 2.4, 0.85, "**%s**\nc = %s J/g·°C" % (name, c), 15, WHITE, INK, "c", "m", pad=0.08, line=LINE)
        th = Thermometer(s, cx - 0.17, 2.85, 2.1, 0.2, 0.2 + rise, col if col != "868E96" else RED)
        if k == 1:
            pass
        ths.append(th)
        txt(s, cx - 1.2, 5.3, 2.4, 0.4, "100 g", 14, MUTE, align="c")
    flame = [arrow(s, 2.3 + k * 3.7, 2.62, 2.3 + k * 3.7, 2.78, EMBER, 3) for k in range(3)]
    note = card_text(s, 0.55, 6.1, W - 1.1, 0.8, "Each sample gets the **same energy** (q) and has the **same mass**. The smaller the specific heat, the bigger the temperature change.", 17, SOFT[GOLD], INK, "c", "m", line=GOLD, pad=0.15)
    tl.click("Add the same amount of energy to each 100 g sample")
    tl.fade(*flame, dur=400)
    for th in ths:
        tl.wipe(th.rise, direction="bottom", dur=2000)
    tl.click("Smaller c means a larger temperature change")
    tl.fade(note)
    finish(s, tl, "Water has a very large c: it takes a lot of energy to change its temperature. That is why oceans moderate climate and why metal pans heat quickly.", "Specific heat")


def s2_equation(prs):
    s = new_slide(prs, "q = mcΔT: what each piece means", 2)
    tl = Timeline(s)
    parts = [("q", "heat energy", "joules (J)\n+ absorbed, − released", EMBER), ("m", "mass", "grams (g)", ICE),
             ("c", "specific heat capacity", "J/g·°C\nenergy to warm 1 g by 1 °C", GREEN), ("ΔT", "temperature change", "°C or K\nT_{final} − T_{initial}", VIOLET)]
    cwid, gp = 2.85, 0.27
    xs = [0.55 + k * (cwid + gp) for k in range(4)]
    glyphs = []
    for (sym, name, unit, col), x in zip(parts, xs):
        g = txt(s, x, 1.55, cwid, 1.4, "**%s**" % sym, 90, col, align="c", anchor="m")
        glyphs.append(g)
    glyphs.append(txt(s, xs[0] + cwid - 0.35, 1.55, 0.7 + gp, 1.4, "=", 70, MUTE, align="c", anchor="m"))
    tl.click("The equation")
    tl.fade(*glyphs)
    cards = []
    for (sym, name, unit, col), x in zip(parts, xs):
        c = card_text(s, x, 3.35, cwid, 2.35, "**%s**\n\n%s" % (name, unit), 17, SOFT[col], INK, "c", "m", pad=0.15, line=col)
        cards.append(c)
    for (sym, name, unit, col), c in zip(parts, cards):
        tl.click("q, m, c or ΔT: %s" % name)
        tl.fade(c)
    sign = card_text(s, 0.55, 6.0, W - 1.1, 0.85, "**Sign check:** ΔT > 0 means the object absorbed energy (q > 0). ΔT < 0 means it released energy (q < 0).", 17, CARD, INK, "c", "m", pad=0.15)
    tl.click("Sign check")
    tl.fade(sign)
    finish(s, tl, "Have students say each piece's unit out loud. The units cancel to give joules: g × J/g·°C × °C = J.", "q = mcΔT")


def s2_ex21(prs):
    solve_slide(prs, 2, "Example 2.1: which metal ends hotter?",
                "Equal masses of aluminum (c = 0.900 J/g·°C) and copper (c = 0.385 J/g·°C) are held in the same flame for the same time. Which ends at the higher temperature?",
                "Same q and same m, so compare ΔT = q ÷ mc.",
                [("Same energy, same mass", "q_{Al} = q_{Cu}        m_{Al} = m_{Cu}"),
                 ("Solve q = mcΔT for ΔT", "ΔT = {q|mc}   so   ΔT ∝ {1|c}"),
                 ("Compare the two metals", "{ΔT_{Cu}|ΔT_{Al}} = {c_{Al}|c_{Cu}} = {0.900|0.385} = 2.34")],
                "Copper ends hotter: 2.34 × the temperature change",
                "Connect to the thermometer animation: copper's mercury rose the most.")


def s2_ex22(prs):
    solve_slide(prs, 2, "Example 2.2: energy to warm water",
                "How many joules are needed to heat 25.0 mL of water from 25.0 °C to 30.0 °C? (d = 1.00 g/mL, c = 4.184 J/g·°C)",
                "Volume → mass, then q = mcΔT",
                [("Convert volume to mass", "25.0 mL × {1.00 g|1 mL} = 25.0 g"),
                 ("Find the temperature change", "ΔT = T_{f} − T_{i} = 30.0 − 25.0 = 5.0 °C"),
                 ("Substitute into q = mcΔT", "q = (25.0 g)({4.184 J|g·°C})(5.0 °C)"),
                 ("Calculate", "q = 523 J")],
                "q = 5.2 × 10² J   (ΔT has 2 sig figs)")


def s2_ex23(prs):
    solve_slide(prs, 2, "Example 2.3: find the final temperature",
                "A 1.50 mol sample of dichloromethane, CH₂Cl₂ (c = 1.188 J/g·°C), at 25.0 °C absorbs 750.0 J. Calculate the final temperature.",
                "mol → g, solve for ΔT, then add to T_{i}",
                [("Moles to grams (84.93 g/mol)", "1.50 mol × {84.93 g|1 mol} = %s g" % sig(D.E2_3["m"], 4)),
                 ("Solve q = mcΔT for ΔT", "ΔT = {q|mc}"),
                 ("Substitute", "ΔT = {750.0 J|(%s g)(1.188 J/g·°C)} = %s °C" % (sig(D.E2_3["m"], 4), sig(D.E2_3["dT"], 3))),
                 ("Final temperature", "T_{f} = T_{i} + ΔT = 25.0 + %s = %s °C" % (sig(D.E2_3["dT"], 3), sig(D.E2_3["Tf"], 3)))],
                "T_{f} = %s °C" % sig(D.E2_3["Tf"], 3))


def s2_ex24(prs):
    solve_slide(prs, 2, "Example 2.4: find the specific heat of a metal",
                "A 50.0 g sample of metal at 95.0 °C is dropped into 100.0 g of water at 21.0 °C in an insulated cup. Both end at 25.0 °C. Calculate the specific heat of the metal.",
                "Energy lost by metal = energy gained by water",
                [("Energy gained by the water", "q_{water} = (100.0 g)({4.184 J|g·°C})(25.0 − 21.0 °C) = %s J" % sig(D.E2_4["q_w"], 4)),
                 ("The metal lost the same amount", "q_{metal} = −q_{water} = −%s J" % sig(D.E2_4["q_w"], 4)),
                 ("Solve q = mcΔT for c", "c = {q|mΔT} = {−%s J|(50.0 g)(25.0 − 95.0 °C)}" % sig(D.E2_4["q_w"], 4))],
                "c = %s J/g·°C" % sig(D.E2_4["c"], 3),
                "Point out that both ΔT values are measured from each object's own starting temperature.")


# ================================================================== section 3
PHASE_COL = {"s": "7FB2F0", "l": "4DABF7", "g": "F59F00"}
PHASE_AMP = {"s": 0.10, "l": 0.24, "g": 0.42}                      # inches: how far a particle wanders from its spot (large enough to see)
PHASE_DUR = {"s": (900, 1400), "l": (3200, 4600), "g": (2600, 3800)}   # ms for one closed loop (it then repeats forever)
PHASE_PTS = {"s": 7, "l": 6, "g": 6}


def _wander(rnd, phase):
    """A closed wandering loop: start at (0, 0), visit random nearby points, come back to (0, 0)."""
    amp = PHASE_AMP[phase]
    pts = [(0, 0)]
    for _ in range(PHASE_PTS[phase]):
        r, a = amp * math.sqrt(rnd.uniform(0.25, 1.0)), rnd.uniform(0, 2 * math.pi)
        pts.append((E(r * math.cos(a)), E(r * math.sin(a))))
    pts.append((0, 0))
    return pts


def _state_positions(cx, cy, w, h, n=18):
    """Particle positions for the five states of a heating curve: solid, melting, liquid, boiling, gas (+ the phase of each particle)."""
    x0, y0 = cx - w / 2, cy - h / 2
    gx = x0 + (w - 5 * 0.44) / 2
    solid = [(gx + (i % 6) * 0.44, y0 + h - 0.3 - (i // 6) * 0.44) for i in range(n)]
    liquid = scatter(n, x0 + 0.4, y0 + h - 1.6, x0 + w - 0.4, y0 + h - 0.4, 0.36, 11)
    gas = scatter(n, x0 + 0.55, y0 + 0.55, x0 + w - 0.55, y0 + h - 0.55, 0.52, 12)
    assert len(liquid) == n and len(gas) == n, (len(liquid), len(gas))
    h2 = n // 2
    melt_l = scatter(n - h2, x0 + 0.4, y0 + h - 1.6, x0 + w - 0.4, y0 + h - 0.4, 0.36, 21, avoid=solid[:h2], avoid_d=0.36)
    boil_g = scatter(n - h2, x0 + 0.55, y0 + 0.55, x0 + w - 0.55, y0 + h - 0.55, 0.52, 22, avoid=liquid[:h2], avoid_d=0.5)
    assert len(melt_l) == n - h2 and len(boil_g) == n - h2, (len(melt_l), len(boil_g))
    return {"solid": (solid, ["s"] * n), "melt": (solid[:h2] + melt_l, ["s"] * h2 + ["l"] * (n - h2)),
            "liquid": (liquid, ["l"] * n), "boil": (liquid[:h2] + boil_g, ["l"] * h2 + ["g"] * (n - h2)), "gas": (gas, ["g"] * n)}


def _curve_slide(prs, cooling):
    import random
    rnd = random.Random(7 if not cooling else 8)
    title = "Cooling curve: the same curve with energy removed" if cooling else "Heating curve: temperature vs energy added"
    s = new_slide(prs, title, 3)
    tl = Timeline(s)
    card(s, 0.55, 1.45, 7.9, 5.3, WHITE, 0.1, line=LINE)
    axes(s, 1.2, 1.8, 6.9, 4.3, "energy removed (time)" if cooling else "energy added (time)", "temperature (°C)")
    if not cooling:
        P = {"A": (1.6, 5.4), "B": (2.9, 4.2), "C": (4.5, 4.2), "D": (6.2, 2.7), "E": (7.1, 2.7), "F": (7.9, 2.0)}
        segs = [("A", "B", EMBER, "solid warms", "q = mc_{solid}ΔT", "solid"), ("B", "C", TEAL, "melting: solid + liquid", "q = nΔH_{fus}", "melt"),
                ("C", "D", EMBER, "liquid warms", "q = mc_{liquid}ΔT", "liquid"), ("D", "E", TEAL, "boiling: liquid + gas", "q = nΔH_{vap}", "boil"),
                ("E", "F", EMBER, "gas warms", "q = mc_{gas}ΔT", "gas")]
    else:
        P = {"A": (1.6, 2.0), "B": (2.4, 2.7), "C": (3.3, 2.7), "D": (5.0, 4.2), "E": (6.6, 4.2), "F": (7.9, 5.4)}
        segs = [("A", "B", ICE, "gas cools", "q = mc_{gas}ΔT   (negative)", "gas"), ("B", "C", TEAL, "condensing: gas + liquid", "q = −nΔH_{vap}", "boil"),
                ("C", "D", ICE, "liquid cools", "q = mc_{liquid}ΔT   (negative)", "liquid"), ("D", "E", TEAL, "freezing: liquid + solid", "q = −nΔH_{fus}", "melt"),
                ("E", "F", ICE, "solid cools", "q = mc_{solid}ΔT   (negative)", "solid")]
    for a, b, *_ in segs:
        line(s, *P[a], *P[b], "CED4DA", 4)
    for k, v in P.items():
        up = k in "BDF" if not cooling else k in "ACE"
        txt(s, v[0] - 0.12, v[1] + (-0.42 if up else 0.12), 0.3, 0.3, "**%s**" % k, 14, MUTE, align="c")
    # particle box
    bx, by, bw, bh = 8.8, 1.45, 4.0, 3.3
    card(s, bx, by, bw, bh, "F8FAFC", 0.08, line=LINE)
    pos = _state_positions(bx + bw / 2, by + bh / 2, bw, bh)
    r = 0.14

    def dotset(key):
        ps, ph = pos[key]
        return [circle(s, x, y, r, PHASE_COL[p], "495057", 1.0) for (x, y), p in zip(ps, ph)]
    order = [sg[5] for sg in segs]
    rest = {k: dotset(k) for k in order}                      # resting dots: they jiggle
    movers = {}                                               # dots that travel between two states
    for a, b in zip(order, order[1:]):
        pa, pha = pos[a]
        movers[(a, b)] = [circle(s, x, y, r, PHASE_COL[p], "495057", 1.0) for (x, y), p in zip(pa, pha)]
    names, eqs = {}, {}
    for a, b, col, name, eq, key in segs:
        names[key] = txt(s, bx, 4.95, bw, 0.5, "**%s**" % name, 18, tcol(col), align="c", anchor="m")
        g, w_, h_ = eqrow(s, bx + bw / 2 - 1.5, 5.5, eq, 22, INK, max_w=3.8)
        eqs[key] = g
    note = card_text(s, bx, 6.15, bw, 0.6, "Temperature is **constant** during a phase change", 14, SOFT[TEAL], INK, "c", "m", pad=0.08, radius=0.12)
    prev, prev_dot, shown_note = None, None, False
    for k, (a, b, col, name, eq, key) in enumerate(segs):
        x1, y1 = P[a]; x2, y2 = P[b]
        seg = line(s, x1, y1, x2, y2, col, 6)
        dot = circle(s, x1, y1, 0.12, col, WHITE, 1.5)
        tl.click(name)
        tl.wipe(seg, direction="left", dur=1600)
        tl.appear(dot)
        tl.move(dot, [(0, 0), (E(x2 - x1), E(y2 - y1))], 1600)
        if prev_dot is not None:
            tl.vanish(prev_dot)
        if prev is None:
            tl.fade(*rest[key], dur=500)
        else:
            tl.out(names[prev], eqs[prev], dur=300)
            tl.vanish(*rest[prev])
            mv = movers[(prev, key)]
            tl.appear(*mv)
            (ps0, _), (ps1, _) = pos[prev], pos[key]
            for d, p0, p1 in zip(mv, ps0, ps1):
                if abs(p1[0] - p0[0]) + abs(p1[1] - p0[1]) > 0.02:
                    tl.move(d, [(0, 0), delta(p0, p1)], 1500)
        tl.then()
        if prev is not None:
            tl.vanish(*movers[(prev, key)])
            tl.appear(*rest[key])
        tl.fade(names[key], eqs[key], dur=400)
        if key in ("melt", "boil") and not shown_note:
            tl.fade(note, dur=400); shown_note = True
        for d, ph in zip(rest[key], pos[key][1]):
            lo, hi = PHASE_DUR[ph]
            tl.jiggle(d, _wander(rnd, ph), rnd.randint(lo, hi))
        prev, prev_dot = key, dot
    finish(s, tl, "Particles in every state keep jiggling (more violently as the temperature rises); at each plateau the particles are pulled apart or pushed together instead of speeding up. "
                  + ("Cooling is the heating curve run in reverse: energy leaves, so q is negative." if cooling else "Slopes raise the average kinetic energy; plateaus change the potential energy."),
           title)


def s3_curve(prs):
    _curve_slide(prs, False)


def s3_cooling(prs):
    _curve_slide(prs, True)


def s3_two_kinds(prs):
    reveal_cards(prs, 3, "Two different jobs for energy",
                 [("Temperature changing", "Added energy increases the **average kinetic energy** of the particles.\n\nUse   **q = mcΔT**   with m in grams.", EMBER),
                  ("A phase change", "Added energy goes into **potential energy**: it pulls the particles apart against their attractions. The temperature stays constant.\n\nUse   **q = nΔH**   with n in moles (ΔH_{fus} or ΔH_{vap}, in kJ/mol).", TEAL)],
                 cols=2, top=1.6, bottom=5.5, size=18,
                 tip="Common mistake: using mcΔT during a plateau, or using grams with ΔH_fus. Condensing and freezing release the same energy that vaporizing and melting absorb.")


def s3_ex31(prs):
    def visual(s, x, y, w, h):
        card(s, x, y, w, min(h, 3.0), WHITE, 0.1, line=LINE)
        px, py, pw, ph = x + 0.45, y + 0.2, w - 0.8, min(h, 3.0) - 0.7
        axes(s, px, py, pw, ph, "energy added", "T (°C)")
        A, B, C, Dd = (px + 0.1 * pw, py + 0.88 * ph), (px + 0.45 * pw, py + 0.42 * ph), (px + 0.8 * pw, py + 0.42 * ph), (px + 0.95 * pw, py + 0.1 * ph)
        line(s, *A, *B, "CED4DA", 4); line(s, *B, *C, "CED4DA", 4); line(s, *C, *Dd, "CED4DA", 4)
        l1 = line(s, *A, *B, EMBER, 6); l2 = line(s, *B, *C, TEAL, 6); l3 = line(s, *C, *Dd, EMBER, 6)
        t1 = txt(s, px + 0.15, py + 0.2 * ph, 1.5, 0.3, "25 → 100 °C", 12, tcol(EMBER), bold=True)
        t2 = txt(s, px + 0.35 * pw, py + 0.2 * ph, 2.0, 0.3, "boil at 100 °C", 12, tcol(TEAL), bold=True, align="c")
        t3 = txt(s, px + 0.55 * pw, py + 0.0, 1.5, 0.3, "100 → 115 °C", 12, tcol(EMBER), bold=True, align="r")
        return [[l1, t1], [l2, t2], [l3, t3], []]
    solve_slide(prs, 3, "Example 3.1: warm water from 25 °C to 115 °C",
                "Energy to heat 50.0 g of water from 25.0 °C to 115.0 °C at 1 atm. c(l) = 4.184, c(g) = 1.90 J/g·°C; ΔH_{vap} = 40.7 kJ/mol.",
                "Three segments: warm the liquid, boil it, warm the gas.",
                [("Heat the liquid to 100 °C", "q_{1} = (50.0 g)({4.184 J|g·°C})(75.0 °C) = %s kJ" % sig(D.E3["q1"] / 1000, 4)),
                 ("Boil it (grams → moles)", "q_{2} = 50.0 g × {1 mol|18.02 g} × {40.7 kJ|1 mol} = %s kJ" % sig(D.E3["q2"] / 1000, 4)),
                 ("Heat the gas to 115 °C", "q_{3} = (50.0 g)({1.90 J|g·°C})(15.0 °C) = %s kJ" % sig(D.E3["q3"] / 1000, 3)),
                 ("Add the segments", "q_{total} = %s + %s + %s = 130. kJ" % (sig(D.E3["q1"] / 1000, 4), sig(D.E3["q2"] / 1000, 4), sig(D.E3["q3"] / 1000, 3)))],
                "q_{total} = 1.30 × 10² kJ", "Notice that boiling is by far the biggest piece.", visual=visual)
