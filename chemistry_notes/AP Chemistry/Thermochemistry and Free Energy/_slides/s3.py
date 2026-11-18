"""Sections 7-9, the summary and the warm-up appendix."""
import math
from scenes import *


# ================================================================== section 7
def s7_microstates(prs):
    s = new_slide(prs, "Entropy counts the ways to arrange particles", 7)
    tl = Timeline(s)
    col = SECTION_COLORS[7]
    counts = [1, 4, 6, 4, 1]
    colw = 2.35
    x0 = 0.9
    minis, bars, nums, labs = [], [], [], []
    base_y, unit = 5.55, 0.36
    for k, c in enumerate(counts):
        left_n = 4 - k
        cx = x0 + k * colw + colw / 2
        bx = cx - 0.85
        box = card(s, bx, 1.55, 1.7, 0.95, WHITE, 0.06, line="868E96")
        mid = line(s, cx, 1.55, cx, 2.5, "ADB5BD", 1.5, dash=True)
        pts_l = [(bx + 0.28 + (i % 2) * 0.38, 1.8 + (i // 2) * 0.4) for i in range(left_n)]
        pts_r = [(cx + 0.28 + (i % 2) * 0.38, 1.8 + (i // 2) * 0.4) for i in range(4 - left_n)]
        dd = [circle(s, x, y, 0.13, "7FB2F0", "495057", 1.0) for x, y in pts_l + pts_r]
        minis.append([box, mid] + dd)
        labs.append(txt(s, cx - 0.9, 2.6, 1.8, 0.3, "%d left · %d right" % (left_n, 4 - left_n), 12, MUTE, align="c"))
        bh = c * unit
        bars.append(card(s, cx - 0.55, base_y - bh, 1.1, bh, col if c != 6 else EMBER, 0.04))
        nums.append(txt(s, cx - 0.6, base_y - bh - 0.45, 1.2, 0.4, "**%d**" % c, 20, tcol(col) if c != 6 else tcol(EMBER), align="c"))
    baseline = line(s, 0.7, base_y, W - 0.7, base_y, INK, 2.5)
    axl = txt(s, 0.7, 3.1, 1.2, 0.5, "ways to arrange (microstates)", 12, MUTE)
    insight = card_text(s, 0.55, 5.75, W - 1.1, 1.1, "The **most probable** arrangement has the most microstates. With 10²³ particles an even spread is overwhelmingly likely, "
                        "so gases expand to fill their container and never spontaneously un-mix.", 16, SOFT[GOLD], INK, "l", "m", line=GOLD, pad=0.3, radius=0.14)
    tl.click("Four particles can sit in either half of a box")
    for m in minis:
        tl.fade(*m, dur=500)
    tl.fade(*labs)
    tl.click("Count the ways to get each arrangement")
    tl.fade(baseline)
    for b, n in zip(bars, nums):
        tl.wipe(b, direction="bottom", dur=500); tl.fade(n, dur=500)
    tl.click("The even split has the most microstates (6 of 16)")
    tl.pulse(bars[2], scale=1.08, dur=500)
    tl.fade(insight)
    finish(s, tl, "Out of 16 possible arrangements, 'all four on the left' happens only 1 time in 16. For a mole of gas, that probability is astronomically small.", "Microstates")


def s7_states(prs):
    s = new_slide(prs, "Solid, liquid, gas: more freedom, more entropy", 7)
    tl = Timeline(s)
    col = SECTION_COLORS[7]
    bx0, by0, bw, bh = 3.4, 1.55, 6.4, 4.1
    card(s, bx0, by0, bw, bh, "F8FAFC", 0.06, line="868E96")
    n = 24
    solid = [(bx0 + 1.1 + (i % 8) * 0.6, by0 + bh - 0.5 - (i // 8) * 0.5) for i in range(n)]
    liquid = scatter(n, bx0 + 0.3, by0 + bh - 1.6, bx0 + bw - 0.3, by0 + bh - 0.3, 0.4, 5)
    gas = scatter(n, bx0 + 0.3, by0 + 0.3, bx0 + bw - 0.3, by0 + bh - 0.3, 0.62, 9)
    r = 0.17
    A = dots(s, solid, r, "7FB2F0")
    B = dots(s, liquid, r, "74C0FC")
    C = dots(s, gas, r, "F59F00")
    lbl = [chip(s, bx0 + bw / 2 - 0.7, by0 + bh + 0.18, 1.4, 0.46, name, c, WHITE, 16) for name, c in (("solid", "5C7CFA"), ("liquid", "1C7ED6"), ("gas", EMBER))]
    ent = txt(s, 0.55, 1.6, 2.6, 2.2, "**ΔS > 0**\n\nsolid → liquid → gas", 20, tcol(col), anchor="t")
    ent2 = txt(s, 10.1, 1.6, 2.7, 2.6, "**ΔS < 0**\n\ngas → liquid → solid\n(condensing, freezing)", 18, tcol(ICE), anchor="t")
    tl.click("Start with the solid: particles locked in place")
    tl.fade(lbl[0])
    tl.click("Melt it: the particles gain freedom")
    tl.out(lbl[0], dur=300)
    for a, (x, y) in zip(A, liquid):
        tl.move(a, [(0, 0), (E(x - (a.left / 914400 + r)), E(y - (a.top / 914400 + r)))], 2400)
    tl.then(); tl.appear(*B); tl.vanish(*A)
    tl.fade(lbl[1]); tl.fade(ent)
    tl.click("Boil it: the particles spread through the whole container")
    tl.out(lbl[1], dur=300)
    for b, (x, y) in zip(B, gas):
        tl.move(b, [(0, 0), (E(x - (b.left / 914400 + r)), E(y - (b.top / 914400 + r)))], 2600)
    tl.then(); tl.appear(*C); tl.vanish(*B)
    tl.fade(lbl[2])
    tl.click("Going the other way, entropy decreases")
    tl.fade(ent2)
    finish(s, tl, "More freedom of motion and more possible positions means more microstates. Entropy increases with phase changes toward the gas phase.", "States of matter")


def s7_expansion(prs):
    s = new_slide(prs, "A gas expands to fill the space: more positions, more entropy", 7, size=30)
    tl = Timeline(s)
    bx0, by0, bw, bh = 0.9, 1.7, 7.4, 3.9
    card(s, bx0, by0, bw, bh, "F8FAFC", 0.04, line="868E96")
    left = scatter(9, bx0 + 0.3, by0 + 0.3, bx0 + bw / 2 - 0.3, by0 + bh - 0.3, 0.7, 4)
    spread = scatter(9, bx0 + 0.3, by0 + 0.3, bx0 + bw - 0.3, by0 + bh - 0.3, 0.8, 7)
    # make the final spread use the whole box, assigning right-half spots to some particles
    r = 0.17
    dd = dots(s, left, r, EMBER)
    part = line(s, bx0 + bw / 2, by0 + 0.02, bx0 + bw / 2, by0 + bh - 0.02, "343A40", 6)
    vac = txt(s, bx0 + bw / 2 + 0.3, by0 + bh / 2 - 0.3, bw / 2 - 0.6, 0.6, "vacuum", 18, MUTE, align="c", anchor="m")
    c1 = card_text(s, 8.7, 1.7, 4.1, 1.7, "**Volume increases**\nmore places for each particle to be", 17, SOFT[VIOLET], INK, "l", "m", pad=0.25, radius=0.14)
    c2 = card_text(s, 8.7, 3.6, 4.1, 1.0, "**ΔS > 0**", 22, SOFT[GREEN], INK, "c", "m", line=GREEN, pad=0.1, radius=0.14)
    c3 = card_text(s, 8.7, 4.8, 4.1, 1.3, "Chance that all 9 return to one half: **1 in 256**. For 10²³ particles: effectively never.", 15, SOFT[GOLD], INK, "l", "m", pad=0.22, radius=0.14)
    note = txt(s, 0.9, 5.85, 7.4, 0.7, "Same idea in chemistry: a larger volume or lower pressure raises entropy.", 16, MUTE)
    tl.click("Remove the partition")
    tl.vanish(part)
    tl.out(vac, dur=400)
    tl.fade(c1)
    for d, (x, y) in zip(dd, spread):
        tl.move(d, [(0, 0), (E(x - (d.left / 914400 + r)), E(y - (d.top / 914400 + r)))], 2800)
    tl.click("More positions available, so entropy increases")
    tl.fade(c2)
    tl.click("Why it never goes back")
    tl.fade(c3, note)
    finish(s, tl, "Ask: why doesn't the gas spontaneously return to one side? Probability, not a force.", "Gas expansion")


def s7_rules(prs):
    reveal_cards(prs, 7, "Predicting the sign of ΔS",
                 [("Phase", "solid < liquid < gas.\nMoving **toward gas**: ΔS > 0.\nMoving toward solid: ΔS < 0.", None),
                  ("Moles of gas", "Count the gas moles first.\n**More** moles of gas in the products: ΔS > 0.\nFewer: ΔS < 0.", None),
                  ("Dissolving", "Dissolving a solid in a liquid **generally** increases entropy: ΔS > 0.", None),
                  ("Volume and pressure", "Bigger volume or lower pressure of a gas: ΔS > 0.\nCompressing a gas: ΔS < 0.", None),
                  ("Temperature", "Heating raises entropy (ΔS > 0).\nCooling lowers it (ΔS < 0).", None),
                  ("More, smaller pieces", "Breaking one molecule into several particles: ΔS > 0.\nCombining particles: ΔS < 0.", None)],
                 cols=3, top=1.5, bottom=6.9, size=16, head_size=17,
                 tip="Rule of thumb for reactions: count moles of gas. If it is a tie, look at solids and liquids turning into aqueous ions.")


def s7_ex71(prs):
    col = SECTION_COLORS[7]
    s = new_slide(prs, "Example 7.1: predict the sign of ΔS", 7)
    tl = Timeline(s)
    rows = [("A substance condenses into a liquid", "−", "gas → liquid: fewer microstates"),
            ("The air in a tire cools down in the winter", "−", "lower temperature: less energy dispersal"),
            ("Salt crystals precipitate out of solution", "−", "ions in solution → ordered solid"),
            ("Production of ammonia from nitrogen and hydrogen gas", "−", "4 mol of gas → 2 mol of gas"),
            ("Decomposition of solid sodium azide into sodium metal and nitrogen gas", "+", "a solid makes a gas: more microstates"),
            ("Compressing 25 liters of oxygen gas", "−", "smaller volume: fewer positions")]
    for k, (st, sign, why) in enumerate(rows):
        y = 1.45 + k * 0.9
        card(s, 0.55, y, W - 1.1, 0.78, CARD, 0.12)
        badge(s, 0.95, y + 0.39, 0.24, str(k + 1), col, WHITE, 15)
        txt(s, 1.4, y, 6.4, 0.78, st, 16, INK, anchor="m")
        c = chip(s, 8.0, y + 0.14, 0.75, 0.5, sign.replace("-", "−") if sign == "−" else sign, GREEN if sign == "+" else RED, WHITE, 22)
        w = txt(s, 8.95, y, 3.7, 0.78, why, 14, MUTE, anchor="m")
        tl.click("%d: ΔS is %s" % (k + 1, "positive" if sign == "+" else "negative"))
        tl.fade(c, w)
    finish(s, tl, "Have students vote with thumbs up/down before each click.", "Example 7.1")


def s7_ex72(prs):
    solve_slide(prs, 7, "Example 7.2: calculate ΔS° from a table",
                "2NO(g) + O₂(g) → 2NO₂(g)\nS°: NO = 211, O₂ = 205, NO₂ = 240 J/mol·K.",
                "ΔS° = ΣnS°(products) − ΣnS°(reactants)",
                [("Add the products", "2(240) = 480 J/K"),
                 ("Add the reactants", "2(211) + 1(205) = 627 J/K"),
                 ("Products minus reactants", "ΔS° = 480 − 627 = −147 J/mol·K"),
                 ("Check the sign", "3 mol of gas → 2 mol of gas, so ΔS < 0 ✓")],
                "ΔS° = −147 J/mol·K", "We reuse this value in Example 9.3.")


# ================================================================== section 8
def s8_tug(prs):
    s = new_slide(prs, "ΔG = ΔH − TΔS: a tug of war between energy and disorder", 8, size=30)
    tl = Timeline(s)
    col = SECTION_COLORS[8]
    card(s, 0.55, 1.45, 7.4, 5.3, CARD, 0.1)
    y0, k = 4.75, 0.03
    base = line(s, 0.9, y0, 7.6, y0, INK, 2.5)
    xs = [1.4, 3.6, 5.8]
    names = ["ΔH", "TΔS", "ΔG = ΔH − TΔS"]
    for x, nme in zip(xs, names):
        txt(s, x + 0.55 - 1.2, 6.1, 2.4, 0.4, "**%s**" % nme, 15, MUTE, align="c")
    dh = 50.0
    bar_dh = card(s, xs[0], y0 - dh * k, 1.1, dh * k, ICE, 0.03)
    lab_dh = txt(s, xs[0] - 0.2, y0 - dh * k - 0.4, 1.5, 0.35, "**+50 kJ**", 16, tcol(ICE), align="c")
    scen = []
    for T, tds, dg in ((200, 24.0, 26.0), (417, 50.0, 0.0), (600, 72.0, -22.0)):
        shapes = []
        tb = card(s, xs[1], y0 - tds * k, 1.1, tds * k, EMBER, 0.03)
        tbl = txt(s, xs[1] - 0.2, y0 - tds * k - 0.4, 1.5, 0.35, "**%d kJ**" % tds, 16, tcol(EMBER), align="c")
        shapes += [tb, tbl]
        if dg > 0:
            gb = card(s, xs[2], y0 - dg * k, 1.1, dg * k, RED, 0.03)
            gl = txt(s, xs[2] - 0.2, y0 - dg * k - 0.4, 1.5, 0.35, "**+%d kJ**" % dg, 16, tcol(RED), align="c")
            shapes += [gb, gl]
            stat = ("ΔG > 0: not favorable", RED)
        elif dg == 0:
            gl = txt(s, xs[2] - 0.2, y0 - 0.42, 1.5, 0.35, "**0 kJ**", 16, MUTE, align="c")
            shapes += [gl]
            stat = ("ΔG = 0: at equilibrium", "868E96")
        else:
            gb = card(s, xs[2], y0, 1.1, -dg * k, GREEN, 0.03)
            gl = txt(s, xs[2] - 0.2, y0 + (-dg) * k + 0.05, 1.5, 0.35, "**−%d kJ**" % (-dg), 16, tcol(GREEN), align="c")
            shapes += [gb, gl]
            stat = ("ΔG < 0: favorable", GREEN)
        head = txt(s, 0.8, 1.55, 3.0, 0.5, "**T = %d K**" % T, 26, INK)
        chp = chip(s, 4.9, 1.6, 2.8, 0.5, stat[0], stat[1], WHITE, 16)
        shapes += [head, chp]
        scen.append(shapes)
    eq = card_text(s, 8.25, 1.45, 4.55, 1.2, "**ΔH = +50 kJ**    **ΔS = +120 J/mol·K**\nboth positive", 17, SOFT[col], INK, "l", "m", pad=0.25, radius=0.14)
    why = card_text(s, 8.25, 2.85, 4.55, 1.7, "**Low T:** the −TΔS term is small, so ΔH wins and ΔG > 0.\n**High T:** the −TΔS term wins and ΔG < 0.", 16, CARD, INK, "l", "m", pad=0.25, radius=0.14)
    cross, w, h = eqrow(s, 8.45, 5.0, "T = {ΔH|ΔS} = {50,000 J|120 J/K} = 417 K", 20, INK, max_w=4.1)
    crossc = card(s, 8.25, 4.75, 4.55, 1.2, WHITE, 0.14, line=GOLD)
    sp = crossc._element.getparent(); sp.remove(crossc._element); sp.insert(list(sp).index(cross._element), crossc._element)
    tl.click("Setup: an endothermic reaction that increases entropy")
    tl.wipe(base, direction="left", dur=500); tl.fade(bar_dh, lab_dh, eq)
    prev = None
    for i, (T, shapes) in enumerate(zip((200, 417, 600), scen)):
        tl.click("T = %d K" % T)
        if prev:
            tl.out(*prev, dur=400)
        tl.fade(*shapes, dur=600)
        if i == 0:
            tl.fade(why)
        if i == 1:
            tl.fade(crossc, cross)
        prev = shapes
    finish(s, tl, "Increase T and the entropy term grows until it overcomes the energy term. The crossover temperature is ΔH ÷ ΔS (with ΔS in kJ/K or ΔH in J).", "Tug of war")


def _mini_graph(s, x, y, w, h, kind, col):
    """ΔG vs T mini graph for one ΔH/ΔS sign combination.  Returns the shapes."""
    shapes = []
    shapes += axes(s, x, y, w, h, "", "")
    zy = y + h * 0.5
    shapes.append(line(s, x, zy, x + w, zy, "868E96", 1.5, dash=True))
    shapes.append(txt(s, x + w - 0.5, y + h - 0.32, 0.5, 0.3, "T", 12, MUTE, align="r"))
    shapes.append(txt(s, x + 0.08, y - 0.02, 1.0, 0.3, "ΔG", 12, MUTE))
    cfg = {"-+": (-0.25, -0.95), "+-": (0.25, 0.95), "--": (-0.85, 0.85), "++": (0.85, -0.85)}[kind]
    a, b = cfg
    p1 = (x + 0.12, zy - a * h * 0.45)
    p2 = (x + w - 0.1, zy - b * h * 0.45)
    shapes.append(line(s, *p1, *p2, col, 5))
    if a * b < 0:
        t = a / (a - b)
        cx, cy = p1[0] + (p2[0] - p1[0]) * t, zy
        shapes.append(circle(s, cx, cy, 0.09, col, WHITE, 1.5))
    return shapes


def s8_cases(prs):
    s = new_slide(prs, "Four cases: when is a reaction favorable?", 8)
    tl = Timeline(s)
    cases = [("−+", "ΔH < 0 and ΔS > 0", "Favorable at **all** temperatures", GREEN),
             ("+-", "ΔH > 0 and ΔS < 0", "Favorable at **no** temperature", RED),
             ("--", "ΔH < 0 and ΔS < 0", "Favorable at **low** temperature only", ICE),
             ("++", "ΔH > 0 and ΔS > 0", "Favorable at **high** temperature only", EMBER)]
    cw, ch, gapx, gapy = 6.0, 2.55, 0.25, 0.22
    for k, (kind, head, verdict, c) in enumerate(cases):
        r, cc = divmod(k, 2)
        x, y = 0.55 + cc * (cw + gapx), 1.45 + r * (ch + gapy)
        bg = card(s, x, y, cw, ch, CARD, 0.12)
        g = _mini_graph(s, x + 0.55, y + 0.3, 2.6, 1.95, kind.replace("−", "-"), c)
        t1 = txt(s, x + 3.45, y + 0.35, 2.4, 0.9, "**%s**" % head, 17, INK, anchor="t")
        t2 = txt(s, x + 3.45, y + 1.25, 2.4, 1.1, verdict, 16, tcol(c), anchor="t")
        tl.click(head)
        tl.fade(bg, t1, t2, *g)
    finish(s, tl, "The line is ΔG = ΔH − TΔS: the intercept is ΔH and the slope is −ΔS. Where it crosses zero is T = ΔH ÷ ΔS.", "Four cases")


def s8_kinetics(prs):
    s = new_slide(prs, "Favorable does not mean fast: thermodynamics vs kinetics", 8, size=30)
    tl = Timeline(s)
    col = SECTION_COLORS[8]
    card(s, 0.55, 1.45, 7.9, 5.3, CARD, 0.1)
    px, py, pw, ph = 1.1, 1.9, 6.9, 4.0
    axes(s, px, py, pw + 0.3, ph, "reaction progress", "energy")
    hi, Y = profile_points(px + 0.3, py + 0.1, pw - 0.6, ph - 0.3, 6.5, 2.2, 9.6)
    lo, _ = profile_points(px + 0.3, py + 0.1, pw - 0.6, ph - 0.3, 6.5, 2.2, 7.7)
    curve_hi = poly(s, hi, "343A40", 4)
    curve_lo = poly(s, lo, TEAL, 4, None)
    curve_lo.line.dash_style = MSO_LINE.DASH
    bx, by = hi[0]
    b = ball(s, bx + 0.1, by - 0.18, 0.18, EMBER)
    up = path_offsets([(x + 0.1, y - 0.18) for x, y in hi[: len(hi) // 3]], 14)
    trip = up + up[::-1][1:]
    full = path_offsets([(x + 0.1, y - 0.18) for x, y in lo], 40)
    txt(s, px + 0.4, Y(6.5) - 0.5, 2.0, 0.3, "reactants", 13, MUTE, bold=True)
    txt(s, px + pw - 2.2, Y(2.2) + 0.1, 2.0, 0.3, "products", 13, MUTE, bold=True, align="r")
    c1 = card_text(s, 8.75, 1.45, 4.05, 1.9, "**ΔG° < 0**: the products are lower, so the reaction is **favorable**.", 17, SOFT[GREEN], INK, "l", "m", pad=0.25, radius=0.14)
    c2 = card_text(s, 8.75, 3.55, 4.05, 1.65, "A tall barrier (large **Ea**) means the reactants rarely get over it: the reaction is **slow**.", 17, SOFT[RED], INK, "l", "m", pad=0.25, radius=0.14)
    c3 = card_text(s, 8.75, 5.4, 4.05, 1.35, "A **catalyst** lowers Ea. ΔG° does not change.", 17, SOFT[TEAL], INK, "l", "m", pad=0.25, radius=0.14)
    tl.click("The products are lower in energy: favorable")
    tl.fade(c1)
    tl.click("But the barrier is tall: the reactants can't climb it")
    tl.move(b, trip, 2400)
    tl.then(); tl.fade(c2)
    tl.click("Add a catalyst: a lower path with the same start and finish")
    tl.fade(curve_lo, c3)
    tl.then(); tl.move(b, full, 3000)
    finish(s, tl, "Diamond turning into graphite has ΔG° < 0 but is immeasurably slow at room temperature. ΔG predicts whether; Ea controls how fast.", "Kinetics")


def s8_ex81(prs):
    col = SECTION_COLORS[8]
    s = new_slide(prs, "Example 8.1: making ammonia", 8)
    tl = Timeline(s)
    card(s, 0.55, 1.45, 4.5, 3.0, CARD, 0.12)
    txt(s, 0.75, 1.55, 4.1, 0.3, "PROBLEM", 11, tcol(col), bold=True)
    txt(s, 0.75, 1.9, 4.1, 2.5, "N₂(g) + 3H₂(g) → 2NH₃(g)\nΔH° = −64 kJ/mol_{rxn}\n\n**a.** Favorable at low T, high T, or all T?\n**b.** What happens at high T?", 16, INK, spacing=1.05)
    s1 = card_text(s, 0.55, 4.65, 4.5, 0.95, "**ΔH < 0**   (exothermic)", 18, SOFT[ICE], INK, "l", "m", pad=0.25, radius=0.14)
    s2 = card_text(s, 0.55, 5.75, 4.5, 1.0, "**ΔS < 0**   4 mol gas → 2 mol gas", 18, SOFT[VIOLET], INK, "l", "m", pad=0.25, radius=0.14)
    # graph
    card(s, 5.35, 1.45, 7.45, 4.4, WHITE, 0.1, line=LINE)
    gx, gy, gw, gh = 6.2, 1.75, 6.1, 3.55
    axes(s, gx, gy, gw, gh, "temperature T", "ΔG")
    zy = gy + gh * 0.5
    zero = line(s, gx, zy, gx + gw, zy, "868E96", 1.75, dash=True)
    p1, p2 = (gx + 0.15, zy + 1.0), (gx + gw - 0.2, zy - 1.2)
    ln_ = line(s, *p1, *p2, PINK, 6)
    t = (p1[1] - zy) / (p1[1] - p2[1])
    cx = p1[0] + (p2[0] - p1[0]) * t
    dot = circle(s, cx, zy, 0.12, PINK, WHITE, 2)
    low = card_text(s, gx + 0.3, zy - 1.55, 2.3, 0.85, "ΔG < 0\nfavorable at **low T**", 15, SOFT[GREEN], INK, "c", "m", pad=0.08, radius=0.12)
    high = card_text(s, gx + gw - 2.8, zy + 0.5, 2.5, 0.85, "ΔG > 0\nreactants favored at **high T**", 15, SOFT[RED], INK, "c", "m", pad=0.08, radius=0.12)
    concl = card_text(s, 5.35, 6.0, 7.45, 0.75, "At high T the equilibrium shifts toward the reactants: **K decreases**, less NH₃.", 15, SOFT[GOLD], INK, "c", "m", line=GOLD, pad=0.1, radius=0.14)
    tl.click("Step 1: the sign of ΔH")
    tl.fade(s1)
    tl.click("Step 2: the sign of ΔS")
    tl.fade(s2)
    tl.click("Step 3: ΔG = ΔH − TΔS rises with T because ΔS < 0")
    tl.fade(zero); tl.wipe(ln_, direction="left", dur=1500); tl.then(); tl.fade(dot)
    tl.click("Low temperature: favorable")
    tl.fade(low)
    tl.click("High temperature: ΔG > 0 and the equilibrium shifts to reactants")
    tl.fade(high); tl.then(); tl.fade(concl)
    finish(s, tl, "Haber process tie-in: industry uses a compromise temperature, a high pressure and a catalyst to get usable rates and yield.", "Example 8.1")


def s8_ex82(prs):
    solve_slide(prs, 8, "Example 8.2: calcium carbonate decomposition",
                "CaCO₃(s) → CaO(s) + CO₂(g)\nΔH° = +192 kJ/mol_{rxn}, ΔS° = +373 J/mol·K\n**a.** ΔG° at 298 K?  **b.** At what T is it favorable?  **c.** Why might a student see no reaction there?",
                "Convert ΔS to kJ, then use ΔG° = ΔH° − TΔS°",
                [("Convert ΔS to kJ", "ΔS° = 373 J/mol·K × {1 kJ|1000 J} = 0.373 kJ/mol·K"),
                 ("(a) ΔG° at 298 K", "ΔG° = 192 − (298)(0.373) = +%s kJ" % sig(D.E8_2["dG"], 3)),
                 ("(b) Where ΔG° = 0", "T = {ΔH°|ΔS°} = {192 kJ|0.373 kJ/K} = %s K" % sig(D.E8_2["T"], 3)),
                 ("(c) Favorable does not mean fast", "ΔG° < 0 above 515 K, but a large Ea can make it too slow")],
                "(a) +80.8 kJ   (b) 515 K   (c) kinetics",
                "Part (c) links back to the kinetics animation: a catalyst or higher T would help.")


# ================================================================== section 9
def s9_valley(prs):
    s = new_slide(prs, "Free energy valley: reactions roll toward the bottom", 9, size=30)
    tl = Timeline(s)
    col = SECTION_COLORS[9]
    card(s, 0.55, 1.45, 7.7, 5.3, CARD, 0.1)
    gx, gy, gw, gh = 1.0, 1.9, 6.9, 4.0
    axes(s, gx, gy, gw + 0.2, gh, "extent of reaction", "free energy G")
    xm = 0.55
    bot, top = gy + gh - 0.35, gy + 0.35
    pts = [(gx + 0.15 + u * (gw - 0.3), top + (bot - top) * (1 - min(1.0, 3.2 * (u - xm) ** 2))) for u in [i / 70 for i in range(71)]]
    pts = [(x, max(top, min(bot, y))) for x, y in pts]
    curve = poly(s, pts, "343A40", 4)
    txt(s, gx + 0.1, gy + gh + 0.35, 2.0, 0.3, "reactants", 13, MUTE, bold=True)
    txt(s, gx + gw - 2.0, gy + gh + 0.35, 2.0, 0.3, "products", 13, MUTE, bold=True, align="r")
    bi = int(xm * 70)
    a_start, b_start = pts[2], pts[-3]
    ba = ball(s, a_start[0], a_start[1] - 0.2, 0.17, EMBER)
    bb = ball(s, b_start[0], b_start[1] - 0.2, 0.17, ICE)
    pa = path_offsets([(x, y - 0.2) for x, y in pts[2: bi + 1]], 26)
    pb = path_offsets([(x, y - 0.2) for x, y in pts[-3: bi - 1: -1]], 26)
    bottom = pts[bi]
    mark = txt(s, bottom[0] - 1.2, bottom[1] - 1.15, 2.4, 0.6, "**equilibrium**\nslope = 0", 14, tcol(col), align="c")
    c1 = card_text(s, 8.55, 1.45, 4.25, 1.55, "**Q < K**\nΔG < 0 → proceeds forward", 17, SOFT[EMBER], INK, "l", "m", pad=0.25, radius=0.14)
    c2 = card_text(s, 8.55, 3.2, 4.25, 1.55, "**Q > K**\nΔG > 0 → proceeds in reverse", 17, SOFT[ICE], INK, "l", "m", pad=0.25, radius=0.14)
    c3 = card_text(s, 8.55, 4.95, 4.25, 1.8, "**Q = K**\nΔG = 0 → equilibrium: the bottom of the valley", 17, SOFT[col], INK, "l", "m", line=col, pad=0.25, radius=0.14)
    tl.click("Too many reactants: Q < K")
    tl.move(ba, pa, 2600); tl.fade(c1)
    tl.click("Too many products: Q > K")
    tl.move(bb, pb, 2600); tl.fade(c2)
    tl.click("Both end at the same place")
    tl.fade(mark, c3)
    finish(s, tl, "ΔG is the slope of the free-energy curve at the current mixture: downhill (negative) means forward. Equilibrium is the minimum, where the slope is zero.", "Valley")


def s9_k_valleys(prs):
    s = new_slide(prs, "The sign of ΔG° tells you where the valley bottom is", 9, size=30)
    tl = Timeline(s)
    items = [("ΔG° < 0", "K > 1", "products favored", 0.75, GREEN, 0.88), ("ΔG° = 0", "K = 1", "balanced", 0.5, "868E96", 0.5), ("ΔG° > 0", "K < 1", "reactants favored", 0.25, ICE, 0.12)]
    cw, gap = 3.95, 0.22
    for k, (a, b, c, xm, col, frac_p) in enumerate(items):
        x = 0.55 + k * (cw + gap)
        bg = card(s, x, 1.5, cw, 3.7, CARD, 0.12)
        gx, gy, gw, gh = x + 0.45, 1.85, cw - 0.9, 2.0
        ax = axes(s, gx, gy, gw, gh, "", "")
        bot, top = gy + gh - 0.2, gy + 0.3
        pts = [(gx + 0.1 + u * (gw - 0.2), top + (bot - top) * (1 - min(1.0, 3.4 * (u - xm) ** 2))) for u in [i / 50 for i in range(51)]]
        cur = poly(s, pts, "343A40", 3.5)
        bi = int(xm * 50)
        dot = circle(s, pts[bi][0], pts[bi][1] - 0.02, 0.1, col, WHITE, 1.5)
        # composition bar
        bx, by, bw = x + 0.45, 4.15, cw - 0.9
        rb = card(s, bx, by, bw, 0.42, "ADB5BD", 0.06)
        pb_ = card(s, bx + bw * (1 - frac_p), by, bw * frac_p, 0.42, GREEN, 0.06)
        txt(s, bx, by + 0.45, bw / 2, 0.3, "reactants", 11, MUTE, align="l")
        txt(s, bx + bw / 2, by + 0.45, bw / 2, 0.3, "products", 11, MUTE, align="r")
        head = txt(s, x + 0.3, 4.75, cw - 0.6, 0.4, "**%s  ·  %s**" % (a, b), 17, tcol(col) if col != "868E96" else INK, align="c")
        words = txt(s, x + 0.3, 5.05, cw - 0.6, 0.35, c, 14, MUTE, align="c")
        tl.click("%s: %s" % (a, c))
        tl.fade(bg, *ax, cur, dot, rb, pb_, head, words)
    row, w, h = eqrow(s, 2.3, 5.9, "ΔG° = −RT ln K        ΔG° = −20.0 kJ/mol  →  K = 3.2 × 10^{3}  (at 298 K)", 20, INK, max_w=8.6)
    eqc = card(s, 0.55, 5.6, W - 1.1, 1.0, WHITE, 0.14, line=LINE)
    sp = eqc._element.getparent(); sp.remove(eqc._element); sp.insert(list(sp).index(row._element), eqc._element)
    tl.click("The link between ΔG° and K")
    tl.fade(eqc, row)
    finish(s, tl, "A negative ΔG° does not mean the reaction goes to completion; it means K > 1. Use the composition bar: green is the share of products at equilibrium.", "K valleys")


def s9_cheat(prs):
    reveal_cards(prs, 9, "ΔG, Q and K: reading the situation",
                 [("ΔG < 0, so Q < K", "The mixture has too many reactants. The reaction **runs forward** (toward products).", EMBER),
                  ("ΔG > 0, so Q > K", "The mixture has too many products. The reaction **runs in reverse** (toward reactants).", ICE),
                  ("ΔG = 0, so Q = K", "The mixture is **at equilibrium**: no net change.", "087F5B"),
                  ("Temperature changes K", "Because ΔG° = ΔH° − TΔS°:\n**Endothermic:** K increases as T rises.\n**Exothermic:** K decreases as T rises.\n(Same result as Le Châtelier.)", PINK)],
                 cols=2, top=1.5, bottom=6.9, size=17, tip="Connect to the equilibrium unit: Q and K are the same quantities. ΔG = ΔG° + RT ln Q tells the direction of the shift.")


def s9_ex91(prs):
    solve_slide(prs, 9, "Example 9.1: ΔG° and K for COCl₂",
                "COCl₂(g) ⇌ CO(g) + Cl₂(g)\nΔH° = +17 kJ/mol_{rxn}, ΔS° = +291 J/mol·K\n**a.** Calculate K at 298 K.  **b.** What happens to K at 315 K?",
                "ΔG° = ΔH° − TΔS°, then ΔG° = −RT ln K",
                [("ΔG° (ΔS in kJ)", "ΔG° = 17 − (298)(0.291) = %s kJ" % sig(D.E9_1["dG"], 3)),
                 ("Solve for ln K", "ln K = {−ΔG°|RT} = {+%s J/mol|(8.314 J/mol·K)(298 K)} = %s" % (sig(-D.E9_1["dG"] * 1000, 3), sig(D.E9_1["lnK"], 3))),
                 ("Take e to the power", "K = e^{%s} = %s" % (sig(D.E9_1["lnK"], 3), sci(D.E9_1["K"], 2))),
                 ("(b) Endothermic: heat favors products", "ΔG° at 315 K = %s kJ: K increases" % sig(D.E9_1["dG315"], 3))],
                "(a) K = %s   (b) K increases" % sci(D.E9_1["K"], 2), "R is in J, so ΔG° must be in J (×1000) before using −RT ln K.")


def s9_ex92(prs):
    solve_slide(prs, 9, "Example 9.2: ΔG° and the sign of ΔH°",
                "P₄(s) + 6Cl₂(g) → 4PCl₃(l)\nΔG°f: P₄ = 24.4, Cl₂ = 0, PCl₃ = −270 kJ/mol\n**a.** Sign of ΔS°?  **b.** ΔG°?  **c.** Sign of ΔH°?",
                "ΔS from moles of gas, ΔG° from products − reactants, then ΔH° = ΔG° + TΔS°",
                [("(a) Moles of gas", "6 mol gas → 0 mol gas, so ΔS° < 0"),
                 ("(b) Products minus reactants", "ΔG° = 4(−270) − [24.4 + 6(0)] = %s kJ" % sig(D.E9_2["dG"], 4)),
                 ("(c) Rearrange ΔG° = ΔH° − TΔS°", "ΔH° = ΔG° + TΔS°"),
                 ("Combine the signs", "(−) + T(−) = negative, so ΔH° < 0")],
                "ΔS° < 0     ΔG° = −1104 kJ     ΔH° < 0", "Both pieces are negative, so ΔH° is even more negative than ΔG°.")


def s9_ex93(prs):
    solve_slide(prs, 9, "Example 9.3: making NO₂ and increasing the yield",
                "2NO(g) + O₂(g) → 2NO₂(g)     ΔH° = −112 kJ/mol_{rxn}\n**a.** Calculate K at 298 K (use ΔS° from Example 7.2).\n**b.** Two ways to increase the yield of NO₂?",
                "ΔS° = −147 J/mol·K → ΔG° → K",
                [("ΔG° at 298 K", "ΔG° = −112 − (298)(−0.147) = %s kJ" % sig(D.E9_3["dG"], 3)),
                 ("ln K", "ln K = {+%s J/mol|(8.314)(298)} = %s" % (sig(-D.E9_3["dG"] * 1000, 3), sig(D.E9_3["lnK"], 3))),
                 ("K", "K = e^{%s} = %s" % (sig(D.E9_3["lnK"], 3), sci(D.E9_3["K"], 2))),
                 ("(b) Shift the equilibrium", "Lower T (exothermic) · raise P (3 mol gas → 2 mol)")],
                "K = %s     lower T, raise P" % sci(D.E9_3["K"], 2), "Also acceptable: add excess O₂ or NO, or remove NO₂ as it forms.")


def s9_coupled(prs):
    col = SECTION_COLORS[9]
    s = new_slide(prs, "Example 9.4: coupled reactions drive the unfavorable step", 9, size=30)
    tl = Timeline(s)
    card(s, 0.55, 1.45, 4.5, 3.4, CARD, 0.12)
    txt(s, 0.75, 1.55, 4.1, 0.3, "PROBLEM", 11, tcol(col), bold=True)
    txt(s, 0.75, 1.9, 4.1, 2.9, "Glucose + Pᵢ → glucose-6-phosphate + H₂O     ΔG° = +13.8 kJ/mol\n\nATP + H₂O → ADP + Pᵢ     ΔG° = −30.5 kJ/mol\n\nCouple them and find the net ΔG°.", 15, INK, spacing=1.05)
    share = card_text(s, 0.55, 5.05, 4.5, 1.7, "The two reactions **share phosphate** (Pᵢ). Energy from the favorable reaction pushes the unfavorable one forward.", 15, SOFT[col], INK, "l", "m", pad=0.25, radius=0.14)
    card(s, 5.35, 1.45, 7.45, 5.3, WHITE, 0.1, line=LINE)
    y0, k = 3.55, 0.075
    base = line(s, 5.7, y0, 12.5, y0, INK, 2.5)
    bars = [(6.1, 13.8, RED, "+13.8", "unfavorable alone"), (8.35, -30.5, GREEN, "−30.5", "ATP → ADP + Pᵢ"), (10.6, -16.7, GOLD, "−16.7", "coupled: favorable")]
    sh = []
    for x, v, c, lab, sub in bars:
        h = abs(v) * k
        top = y0 - h if v > 0 else y0
        b = card(s, x, top, 1.35, h, c, 0.03)
        t1 = txt(s, x - 0.3, (top - 0.45) if v > 0 else (y0 + h + 0.05), 1.95, 0.4, "**%s kJ**" % lab, 18, tcol(c) if c != GOLD else "B45309", align="c")
        t2 = txt(s, x - 0.35, 6.3, 2.05, 0.4, sub, 14, MUTE, align="c")
        sh.append((b, t1, t2, v))
    row, w, h = eqrow(s, 7.85, 1.7, "ΔG°_{net} = (+13.8) + (−30.5) = −16.7 kJ/mol", 17, INK, max_w=4.8)
    tl.click("The glucose step on its own is uphill")
    tl.wipe(base, direction="left", dur=500)
    tl.wipe(sh[0][0], direction="bottom", dur=900); tl.fade(sh[0][1], sh[0][2])
    tl.click("ATP hydrolysis is strongly downhill")
    tl.wipe(sh[1][0], direction="top", dur=1000); tl.fade(sh[1][1], sh[1][2])
    tl.click("Add the free energies: the pair is favorable")
    tl.fade(row)
    tl.wipe(sh[2][0], direction="top", dur=900); tl.fade(sh[2][1], sh[2][2])
    tl.click("Why it works")
    tl.fade(share)
    finish(s, tl, "Coupling is how cells run unfavorable reactions: ATP hydrolysis (ΔG° ≈ −30.5 kJ/mol) is paired with them through a common intermediate.", "Coupled reactions")


# ================================================================== wrap-up
def summary(prs):
    s = new_slide(prs, "Which tool answers which question?")
    tl = Timeline(s)
    items = [("How much energy to change the temperature?", "q = mcΔT", 2), ("How much energy for a phase change?", "q = nΔH_{fus or vap}", 3),
             ("Reaction energy from a calorimeter?", "q_{rxn} = −mcΔT, then ΔH = q ÷ mol_{rxn}", 4), ("ΔH from formation data?", "ΣnΔH°_{f}(products) − ΣnΔH°_{f}(reactants)", 5),
             ("ΔH from bond data?", "Σ(bonds broken) − Σ(bonds formed)", 5), ("ΔH from other reactions?", "Hess's law: reverse, multiply, add", 6),
             ("Will it happen?", "ΔG = ΔH − TΔS", 8), ("Where does it end up?", "ΔG° = −RT ln K", 9)]
    cw, ch, gx, gy = 2.95, 2.55, 0.2, 0.25
    for k, (q, tool, sec) in enumerate(items):
        r, c = divmod(k, 4)
        x, y = 0.55 + c * (cw + gx), 1.5 + r * (ch + gy)
        col = SECTION_COLORS[sec]
        bg = card(s, x, y, cw, ch, CARD, 0.12)
        tag = chip(s, x + 0.2, y + 0.2, 0.8, 0.36, "§%d" % sec, col, WHITE, 13)
        qt = txt(s, x + 0.2, y + 0.65, cw - 0.4, 0.95, "**%s**" % q, 16, INK)
        tt = card_text(s, x + 0.15, y + 1.6, cw - 0.3, 0.8, tool, 14, WHITE, INK, "c", "m", pad=0.06, line=col, radius=0.1)
        tl.click(q)
        tl.fade(bg, tag, qt, tt)
    finish(s, tl, "Use this as a closing review: read each question and have students name the section and the equation before you click.", "Summary")


def appendix_divider(prs):
    s = new_slide(prs, "Warm-up questions", dark=True, size=44)
    t = s.shapes.title
    t.left, t.top, t.width, t.height = E(0.8), E(2.3), E(9.0), E(1.4)
    txt(s, 0.8, 3.7, 9.5, 1.2, "20 multiple-choice questions for the start of class.\nVote first, then click to reveal the answer and the reasoning.", 20, "C9D4E8")
    motif(s, 11.0, 3.5, EMBER, 1.0)
    tl = Timeline(s)
    finish(s, tl, "One warm-up per class period works well. These match the 20 questions at the back of the student notes.", "Warm-up divider")


def warmups(prs):
    for n, (topic, q, right, wrong, why) in enumerate(D.MC, 1):
        lst = list(wrong); lst.insert(D.POS[n - 1], right)
        mc_slide(prs, n, topic, q, lst, D.POS[n - 1], why)
