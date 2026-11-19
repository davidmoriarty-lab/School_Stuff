"""Honors Chemistry Unit 6 Stoichiometry: click-by-click slide deck that walks through the BCA-table notes packet.

    python3 deck.py [out.pptx]          (DECK_FINAL=1 draws every slide as it looks after its last click, for visual QA)

Every number comes from make_stoich.py (the same code that builds the notes packet), so the slides and the packet agree.
The animation engine (anim.py) writes real PowerPoint <p:timing> XML; kit.py draws the shapes.
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "_packet_builder"))
import kit
from kit import *
from kit import _runs_width
from anim import Timeline
import make_stoich as M
from make_stoich import sf, fm, grams, mm_exact, VM

# ------------------------------------------------------------------ this deck's sections (kit's colour tables are edited in place)
kit.SECTION_COLORS.update({1: ICE, 2: GOLD, 3: GREEN, 4: VIOLET, 5: EMBER})
kit.SECTION_SHORT.update({1: "Mole Ratios", 2: "The Mole Map", 3: "BCA Tables", 4: "Percent Yield", 5: "Lab Practice"})
kit.SECTION_NAMES.update({1: "Mole Ratios", 2: "The Mole Map", 3: "BCA Tables", 4: "Percent Yield", 5: "Lab Practice"})

FINAL = os.environ.get("DECK_FINAL") == "1"
STATE = None
SLIDES = []


def finish(slide, tl, tip="", title=""):
    clicks = tl.click_list()
    body = tip.strip()
    if clicks:
        body += "\n\nCLICK BY CLICK:\n" + "\n".join("%d. %s" % (i + 1, c) for i, c in enumerate(clicks))
    notes(slide, body)
    if STATE is not None:
        tl.apply_state(STATE)
    elif FINAL:
        tl.apply_final_state()
    else:
        tl.build()
    SLIDES.append((slide, title))


def cap(s, text, col, y=6.0, h=1.05, size=19):
    """The explanation box at the bottom of a slide (it appears, then fades out when the next step comes)."""
    return card_text(s, 0.55, y, W - 1.1, h, text, size, SOFT[col], INK, "l", "m", line=col, pad=0.3, radius=0.16)


# ------------------------------------------------------------------ opening
def motif(slide, cx, cy, col, scale=1.0):
    pts = [(0, 0), (1.25, -0.5), (2.1, 0.55), (0.55, 1.15), (-0.95, 0.75), (-1.0, -0.9)]
    for i, j in [(0, 1), (1, 2), (0, 3), (0, 4), (0, 5)]:
        a, b = pts[i], pts[j]
        line(slide, cx + a[0] * scale, cy + a[1] * scale, cx + b[0] * scale, cy + b[1] * scale, "4C5C7A", 4)
    for (x, y), r, c in zip(pts, [0.52, 0.34, 0.42, 0.3, 0.38, 0.3], [col, "FFFFFF", "F2B84B", "FFFFFF", "7FB2F0", "FFFFFF"]):
        circle(slide, cx + x * scale, cy + y * scale, r * scale, c)


def title_slide(prs):
    s = new_slide(prs, "Stoichiometry with BCA Tables", dark=True, size=48)
    t = s.shapes.title
    t.left, t.top, t.width, t.height = E(0.8), E(2.1), E(8.3), E(1.9)
    sub = txt(s, 0.8, 4.15, 8.0, 0.9, "Honors Chemistry · Unit 6\nHow much product? What runs out? How much did we really get?", 20, "C9D4E8", spacing=1.1)
    chip(s, 0.8, 1.55, 3.0, 0.42, "Click to step through", EMBER, WHITE, 13)
    motif(s, 10.4, 3.7, EMBER, 1.25)
    tl = Timeline(s)
    tl.click("Three questions the whole unit answers")
    tl.fade(sub)
    finish(s, tl, "Follow along in the notes packet. Every click reveals one small idea; pause before each click and let students predict.", "Title")


def reveal_cards(prs, sec, title, items, cols=2, top=1.5, bottom=6.95, tip="", gap=0.28, size=21, head_size=21):
    s = new_slide(prs, title, sec)
    rows = -(-len(items) // cols)
    cw = (W - 1.1 - gap * (cols - 1)) / cols
    ch = (bottom - top - gap * (rows - 1)) / rows
    tl = Timeline(s)
    for k, (head, body, c) in enumerate(items):
        r, cc = divmod(k, cols)
        x, y = 0.55 + cc * (cw + gap), top + r * (ch + gap)
        col = c or SECTION_COLORS[sec]
        bg = card(s, x, y, cw, ch, CARD, 0.12)
        tag = badge(s, x + 0.42, y + 0.45, 0.26, str(k + 1), col, WHITE, 15)
        h = txt(s, x + 0.85, y + 0.2, cw - 1.1, 0.5, head, head_size, tcol(col), bold=True, anchor="m")
        b = txt(s, x + 0.3, y + 0.85, cw - 0.55, ch - 1.0, body, size, INK, spacing=1.05)
        tl.click(head)
        tl.fade(bg, tag, h, b)
    finish(s, tl, tip, title)


def solve_slide(prs, sec, title, problem, plan, steps, answer, tip="", left_w=4.45, size=22):
    """steps: [(label, eq_markup)].  Each click reveals the next step; the answer lands last."""
    col = SECTION_COLORS[sec]
    s = new_slide(prs, title, sec)
    tl = Timeline(s)
    ph = wrap_height(problem, 16, left_w - 0.4) + 0.62
    card(s, 0.55, 1.45, left_w, ph, CARD, 0.12)
    txt(s, 0.75, 1.55, left_w - 0.4, 0.3, "PROBLEM", 11, tcol(col), bold=True)
    txt(s, 0.75, 1.88, left_w - 0.4, ph - 0.5, problem, 16, INK, spacing=1.05)
    y_left = 1.45 + ph + 0.2
    if plan:
        plh = wrap_height(plan, 16, left_w - 0.4) + 0.62
        planc = card(s, 0.55, y_left, left_w, plh, SOFT[col], 0.12)
        p1 = txt(s, 0.75, y_left + 0.1, left_w - 0.4, 0.3, "PLAN", 11, tcol(col), bold=True)
        p2 = txt(s, 0.75, y_left + 0.42, left_w - 0.4, plh - 0.5, plan, 16, INK, spacing=1.05)
        tl.click("The plan: say the strategy out loud before touching numbers")
        tl.fade(planc, p1, p2)
    rx, rw = 0.55 + left_w + 0.4, W - 0.55 - (0.55 + left_w + 0.4)
    avail = 6.0 - 1.45
    while True:
        meas = [measure_row(m, size, rw - 0.5) for _, m in steps]
        if sum(0.36 + mm[1] + 0.14 for mm in meas) <= avail or size <= 14:
            break
        size -= 1
    y = 1.45
    for k, ((label, markup), mm) in enumerate(zip(steps, meas)):
        b = step_badge(s, rx + 0.22, y + 0.2, k + 1, col)
        lab = txt(s, rx + 0.6, y, rw - 0.6, 0.4, label, 15, tcol(col), bold=True, anchor="m")
        row, w, h = eqrow(s, rx + 0.6, y + 0.36, markup, mm[0], INK, max_w=rw - 0.6)
        tl.click("Step %d: %s" % (k + 1, label))
        tl.fade(b, lab, row)
        y += 0.36 + mm[1] + 0.14
    ans = card_text(s, rx, 6.08, rw, 0.82, answer, 22, SOFT[GOLD], INK, "l", "m", line=GOLD, pad=0.3, bold=True, radius=0.18)
    tl.click("The answer, with units and the right sig figs")
    tl.fade(ans)
    tl.then(); tl.pulse(ans, scale=1.04, dur=500)
    finish(s, tl, tip, title)


# ------------------------------------------------------------------ BCA table slide (the heart of the deck)
def rx_cells(rx):
    """The cell text of a computed Rxn: {(row, col): (text, colour, size)} with rows 0..3 = B, mol rxn, C, A."""
    cells = {}
    for c, sp in enumerate(rx.sp):
        R = sp["role"] == "R"
        cells[(0, c)] = (fm(sp["before"]), INK, 26)
        cells[(1, c)] = (("%s ÷ %d = %s" % (fm(sp["before"]), sp["coef"], fm(sp["rxn"]))) if R else "—", INK if R else MUTE, 20 if R else 26)
        cells[(2, c)] = (("−%d(%s) = −%s" % (sp["coef"], fm(rx.x), fm(abs(sp["change"])))) if R else
                         ("+%d(%s) = +%s" % (sp["coef"], fm(rx.x), fm(sp["change"]))), RED if R else "2B8A3E", 20)
        cells[(3, c)] = (fm(sp["after"]), "087F5B" if sp is not rx.lim else "B45309", 26)
    return cells


ROWS = ["B  Before\n(mol)", "mol rxn\n(÷ coefficient)", "C  Change\n(mol)", "A  After\n(mol)"]


def bca_slide(prs, sec, title, problem, rx, steps, tip="", headers=None, cells=None, n_cols=None):
    """Draw an empty BCA table, then build it one step at a time.
    steps: [(caption_markup, [(row, col), ...], flag)]  flag 'lim' also highlights the limiting column.
    Each click: the previous caption fades out, then the new caption and the new cells fade in."""
    col = SECTION_COLORS[sec]
    s = new_slide(prs, title, sec)
    tl = Timeline(s)
    n = len(rx.sp) if rx else n_cols
    cells = cells or rx_cells(rx)
    ph = wrap_height(problem, 17, W - 1.9) + 0.28
    card_text(s, 0.55, 1.3, W - 1.1, ph, problem, 17, CARD, INK, "l", "m", pad=0.3, radius=0.14)
    top = 1.3 + ph + 0.4                                  # room above the table for the LIMITING chip
    lw = 2.0
    cw = (W - 1.1 - lw) / n
    hh, rh = 0.78, 0.6
    X = lambda c: 0.55 + lw + c * cw
    Y = lambda r: top + hh + r * rh
    # skeleton (always visible): header cells and row labels
    card_text(s, 0.55, top, lw, hh, "", 14, "E9ECEF", INK, "c", "m", pad=0.05, radius=0.06)
    heads = headers or [(("→  " if (sp["role"] == "P" and (i == 0 or rx.sp[i - 1]["role"] == "R")) else ("+  " if i else "")) + sp["pf"], "coefficient %d" % sp["coef"])
                        for i, sp in enumerate(rx.sp)]
    for c, (h1, h2) in enumerate(heads):
        card_text(s, X(c), top, cw, hh, "**%s**\n[#52606D|%s]" % (h1, h2) if False else "**%s**" % h1, 24, SOFT[col], INK, "c", "t", pad=0.05, radius=0.06)
        txt(s, X(c), top + 0.46, cw, 0.28, h2, 13, MUTE, align="c")
    for r, lab in enumerate(ROWS):
        card_text(s, 0.55, Y(r), lw, rh, lab, 14, "E9ECEF", INK, "l", "m", pad=0.12, radius=0.06, bold=True)
        for c in range(n):
            card_text(s, X(c), Y(r), cw, rh, "", 14, WHITE, INK, "c", "m", line=LINE, pad=0.02, radius=0.04)
    hl = tag = None
    if rx is not None and any(f == "lim" for _, _, f in steps):
        L = [i for i, sp in enumerate(rx.sp) if sp is rx.lim][0]
        hl = card(s, X(L) - 0.04, top - 0.04, cw + 0.08, hh + 4 * rh + 0.08, SOFT[GOLD], 0.08, line=GOLD)
        set_alpha(hl, 25)
        tag = chip(s, X(L) + cw / 2 - 0.9, top - 0.38, 1.8, 0.32, "LIMITING REACTANT", GOLD, WHITE, 12)
    prev = None
    for k, (text, cs, flag) in enumerate(steps):
        c_card = cap(s, text, col, y=Y(3) + rh + 0.2, h=min(1.2, 7.35 - (Y(3) + rh + 0.2)))
        shapes = [c_card]
        for (r, c) in cs:
            t, colr, sz = cells[(r, c)]
            while sz > 12 and max(text_width_pt(x, sz, bold=(r in (0, 3))) for x in t.split("\n")) > (cw - 0.14) * 72:
                sz -= 1
            shapes.append(txt(s, X(c), Y(r), cw, rh, t, sz, colr, bold=(r == 3 or r == 0), align="c", anchor="m"))
        if flag == "lim":
            shapes += [hl, tag]
        tl.click(text.split("\n")[0][:90])
        if prev:
            tl.out(prev, dur=300)
            tl.then()
        tl.fade(*shapes, dur=500)
        prev = c_card
    finish(s, tl, tip, title)


def std_steps(rx, first_extra="", last=""):
    """The usual five steps for a computed Rxn."""
    R = [i for i, sp in enumerate(rx.sp) if sp["role"] == "R"]
    P = [i for i, sp in enumerate(rx.sp) if sp["role"] == "P"]
    lim = rx.lim
    others = [sp for sp in rx.sp if sp["role"] == "R" and sp is not lim]
    rxs = "  vs  ".join("%s: **%s**" % (sp["pf"], fm(sp["rxn"])) for sp in rx.sp if sp["role"] == "R")
    return [
        ("**Step 1: Before.** " + (first_extra or "Write the starting moles of each reactant. The products start at 0, because nothing has formed yet."),
         [(0, c) for c in range(len(rx.sp))], None),
        ("**Step 2: mol rxn.** Divide each reactant’s moles by its coefficient. Products get a dash: they are not being used up.",
         [(1, c) for c in range(len(rx.sp))], None),
        ("**Step 3: Who is limiting?** Compare the mol rxn values:  %s.   The **smaller** one runs out first, so **%s is limiting** and x = **%s**." % (
            rxs, lim["pf"], fm(rx.x)), [], "lim"),
        ("**Step 4: Change.** Reactants lose (coefficient × x). Products gain (coefficient × x). Every column uses the same x = %s." % fm(rx.x),
         [(2, c) for c in range(len(rx.sp))], None),
        ("**Step 5: After.** Before + Change. %s ends at **0**, so it is gone. %s%s" % (
            lim["pf"], (("%s is left over: **%s mol** (the excess). " % (others[0]["pf"], fm(others[0]["after"]))) if others else ""), last),
         [(3, c) for c in range(len(rx.sp))], None)]


# ------------------------------------------------------------------ the slides
def roadmap(prs):
    reveal_cards(prs, 1, "Where we are going", [
        ("1  Mole ratios", "Coefficients in a balanced equation tell us how many moles react and form.", ICE),
        ("2  The mole map", "Grams → moles → moles → grams. The mole ratio is the bridge in the middle.", GOLD),
        ("3  BCA tables", "Before, Change, After. Find what runs out first and what is left over.", GREEN),
        ("4  Percent yield", "How much we should get, how much we really got in the lab.", VIOLET)],
        tip="Four ideas, one at a time. Each builds on the one before it.")


def smores(prs):
    s = new_slide(prs, "A recipe: coefficients are the ingredient counts", 1)
    tl = Timeline(s)
    card(s, 0.55, 1.45, 7.4, 1.75, CARD, 0.12)
    t1 = txt(s, 0.85, 1.55, 6.8, 0.4, "THE RECIPE: ONE s’more needs", 13, tcol(ICE), bold=True)
    items = []
    for i in range(2):
        items.append(card(s, 0.95 + i * 1.2, 2.2, 1.0, 0.32, "E9C98B", 0.08))
    items.append(card(s, 3.45, 2.2, 1.0, 0.32, "6F4E37", 0.08))
    items.append(circle(s, 5.0, 2.36, 0.2, WHITE, "ADB5BD"))
    lab = txt(s, 0.85, 2.65, 6.9, 0.45, "2 crackers   +   1 chocolate   +   1 marshmallow", 18, INK, bold=True)
    q = card_text(s, 8.2, 1.45, 4.6, 1.75, "You have **6 chocolates** and plenty of everything else. How many s’mores can you make?", 18,
                  SOFT[ICE], INK, "l", "m", line=ICE, pad=0.25, radius=0.14)
    choc, crack, mall = [], [], []
    for i in range(6):
        x = 0.9 + i * 2.0
        crack.append(card(s, x, 3.8, 1.2, 0.3, "E9C98B", 0.08))
        choc.append(card(s, x, 4.17, 1.2, 0.3, "6F4E37", 0.08))
        mall.append(circle(s, x + 0.6, 4.78, 0.17, WHITE, "ADB5BD"))
        crack.append(card(s, x, 5.0, 1.2, 0.3, "E9C98B", 0.08))
    a1 = card_text(s, 0.55, 5.6, 5.9, 1.3, "**6 s’mores.**  Each s’more uses 1 chocolate, so 6 chocolates make 6 s’mores.", 19, SOFT[GREEN], INK, "l", "m", line=GREEN, pad=0.25, radius=0.14)
    a2 = card_text(s, 6.9, 5.6, 5.9, 1.3, "**12 crackers needed.**  6 chocolates × {2 crackers / 1 chocolate}. This is a **mole ratio**: a fraction made from the recipe.".replace("{2 crackers / 1 chocolate}", "(2 crackers ÷ 1 chocolate)"),
                   19, SOFT[GOLD], INK, "l", "m", line=GOLD, pad=0.25, radius=0.14)
    tl.click("The recipe: 2 crackers, 1 chocolate, 1 marshmallow")
    tl.fade(*([t1] + items + [lab]))
    tl.click("The question")
    tl.fade(q)
    tl.click("Six chocolates, one for each s’more")
    tl.fade(*choc)
    tl.click("Add the rest of each recipe: 2 crackers and 1 marshmallow per s’more")
    tl.fade(*(crack + mall))
    tl.click("How many s’mores, and how many crackers")
    tl.fade(a1)
    tl.then(); tl.fade(a2)
    finish(s, tl, "Chemistry works like a recipe. Let students answer before each click.", "Recipe idea")


def place_row(s, pieces, y, size, color_for=None, gap=0.17, cx=W / 2):
    """Lay pieces of markup side by side, centered; returns [(group, x, w)]."""
    ws = [_runs_width(parse_rs(m), size) / 72.0 + 0.04 for m in pieces]
    total = sum(ws) + gap * (len(pieces) - 1)
    x = cx - total / 2
    out = []
    for m, w in zip(pieces, ws):
        g, ww, hh = eqrow(s, x, y, m, size, INK, True)
        out.append((g, x, w))
        x += w + gap
    return out


def ratio_slide(prs):
    s = new_slide(prs, "Mole ratios come from the coefficients", 1)
    tl = Timeline(s)
    size = 44
    pcs = ["[#1864AB|1]", "N_{2}", "+", "[#1864AB|3]", "H_{2}", "→", "[#1864AB|2]", "NH_{3}"]
    row = place_row(s, pcs, 1.5, size)
    tl.click("The balanced equation")
    tl.fade(*[g for g, _, _ in row])
    calls = [(0, 1, "1 mole of N₂"), (3, 4, "3 moles of H₂"), (6, 7, "2 moles of NH₃")]
    cards_ = []
    prev = None
    for k, (ci, fi, text) in enumerate(calls):
        x0 = row[ci][1]
        x1 = row[fi][1] + row[fi][2]
        w = max(2.6, x1 - x0)
        cx = (x0 + x1) / 2
        c = card_text(s, cx - w / 2, 3.0, w, 0.95, text, 20, SOFT[ICE], INK, "c", "m", line=ICE, pad=0.1, bold=True, radius=0.14)
        ar = arrow(s, cx, 3.0, cx, 2.55, ICE, 2.5)
        cards_.append((c, ar))
        tl.click("The coefficient in front of each formula is the number of moles: " + text)
        tl.fade(c, ar)
        tl.then(); tl.pulse(row[ci][0], row[fi][0], scale=1.12, dur=500)
    gone = []
    for c, ar in cards_:
        gone += [c, ar]
    ratios = [("{3 mol H_{2}|2 mol NH_{3}}", "H₂ to NH₃"), ("{1 mol N_{2}|3 mol H_{2}}", "N₂ to H₂"), ("{2 mol NH_{3}|1 mol N_{2}}", "NH₃ to N₂")]
    tl.click("Fade the callouts: now build mole ratios, fractions made from two coefficients")
    tl.out(*gone, dur=300)
    tl.then()
    intro = card_text(s, 0.55, 2.85, W - 1.1, 0.75, "A **mole ratio** is a fraction made from two coefficients. Put the thing you **want** on top and the thing you **have** on the bottom.",
                      18, SOFT[ICE], INK, "l", "m", line=ICE, pad=0.25, radius=0.14)
    tl.fade(intro)
    cw = (W - 1.1 - 0.5) / 3
    rc = []
    for k, (m, name) in enumerate(ratios):
        x = 0.55 + k * (cw + 0.25)
        bg = card(s, x, 3.95, cw, 2.2, CARD, 0.14)
        g, w, h = eqrow(s, x + (cw - 2.3) / 2 + 0.1, 4.2, m, 24, INK, True)
        lb = txt(s, x, 5.6, cw, 0.4, "ratio of " + name, 15, MUTE, align="c")
        rc.append((bg, g, lb))
    for k, (bg, g, lb) in enumerate(rc):
        tl.click("Mole ratio %d: %s" % (k + 1, ratios[k][1]))
        tl.fade(bg, g, lb)
    note = card_text(s, 0.55, 6.35, W - 1.1, 0.7, "The equation must be **balanced** first. Only then do the coefficients give the true ratio.", 17, SOFT[GOLD], INK, "c", "m", line=GOLD, pad=0.2, radius=0.14)
    tl.click("Why balance first")
    tl.fade(note)
    finish(s, tl, "Point at each coefficient. A coefficient of 1 is not written, but it is there.", "Mole ratios")


def mole_map(prs):
    s = new_slide(prs, "The mole map: every problem goes through moles", 2)
    tl = Timeline(s)
    col = GOLD
    bw, bh, y = 2.3, 1.2, 2.0
    xs = [0.6, 3.9, 7.2, 10.5]
    labels = ["Given\n(grams, L or particles)", "Moles of\nthe given", "Moles of\nthe wanted", "Wanted\n(grams or L)"]
    fills = [CARD, SOFT[GOLD], SOFT[GOLD], CARD]
    boxes = [card_text(s, x, y, bw, bh, "**%s**" % t, 17, f, INK, "c", "m", line=(GOLD if i in (1, 2) else LINE), pad=0.1, radius=0.16)
             for i, (x, t, f) in enumerate(zip(xs, labels, fills))]
    arrows = []
    labs = ["÷ molar mass\n(or ÷ 22.4 L/mol)", "× mole ratio\nfrom the coefficients", "× molar mass\n(or × 22.4 L/mol)"]
    for i in range(3):
        a = arrow(s, xs[i] + bw + 0.05, y + bh / 2, xs[i + 1] - 0.05, y + bh / 2, GOLD if i == 1 else MUTE, 3.5)
        t = txt(s, xs[i] - 0.1 + bw * 0.6, y + bh + 0.1, 2.5, 0.8, labs[i], 15, INK if i != 1 else "B45309", bold=(i == 1), align="c")
        arrows.append((a, t))
    tl.click("The four stops on the map")
    tl.fade(*boxes[:1])
    tl.then(); tl.fade(boxes[1])
    tl.then(); tl.fade(boxes[2])
    tl.then(); tl.fade(boxes[3])
    msgs = ["**Step 1:** change what you are given into **moles** by dividing by the molar mass. (For a gas at STP, divide by 22.4 L/mol.)",
            "**Step 2:** the **mole ratio** is the ONLY step that uses the coefficients. It is the bridge from one substance to the other.",
            "**Step 3:** change moles of the wanted substance into grams (× molar mass) or liters (× 22.4 L/mol)."]
    prev = None
    for i in range(3):
        c = cap(s, msgs[i], GOLD, y=4.4, h=1.2)
        tl.click("Arrow %d" % (i + 1))
        if prev:
            tl.out(prev, dur=300); tl.then()
        tl.fade(arrows[i][0], arrows[i][1], c)
        prev = c
    warn = card_text(s, 0.55, 5.95, W - 1.1, 0.95, "You can **never** go straight from grams of one substance to grams of another. Always stop at moles.", 19, SOFT[RED], INK, "c", "m", line=RED, pad=0.25, bold=False, radius=0.14)
    tl.click("The big rule")
    tl.out(prev, dur=300); tl.then(); tl.fade(warn)
    finish(s, tl, "Use 22.4 L/mol only for gases at STP.", "Mole map")


def sandwich(prs):
    s = new_slide(prs, "Who runs out first? Count the recipe runs", 3)
    tl = Timeline(s)
    col = GREEN
    rec = card_text(s, 0.55, 1.4, 6.0, 1.05, "**Recipe:**  1 sandwich = 2 bread + 1 cheese", 22, CARD, INK, "c", "m", pad=0.2, radius=0.14)
    stock = card_text(s, 6.8, 1.4, 6.0, 1.05, "**You have:**  10 bread  and  3 cheese", 22, CARD, INK, "c", "m", pad=0.2, radius=0.14)
    bread = [card(s, 0.9 + (i % 10) * 0.6, 2.75, 0.5, 0.3, "E9C98B", 0.06) for i in range(10)]
    cheese = [card(s, 0.9 + i * 0.6, 3.15, 0.5, 0.3, "F2C94C", 0.06) for i in range(3)]
    b = card_text(s, 0.55, 3.75, 5.9, 1.0, "**Bread:**  10 ÷ 2 = **5** sandwiches", 22, SOFT[ICE], INK, "c", "m", line=ICE, pad=0.2, radius=0.14)
    c = card_text(s, 6.9, 3.75, 5.9, 1.0, "**Cheese:**  3 ÷ 1 = **3** sandwiches", 22, SOFT[ICE], INK, "c", "m", line=ICE, pad=0.2, radius=0.14)
    lim = card_text(s, 0.55, 4.95, W - 1.1, 0.8, "The **smaller** number wins: **cheese is the limiting reactant**. Only 3 sandwiches.", 21, SOFT[GOLD], INK, "c", "m", line=GOLD, pad=0.2, radius=0.14)
    left = card_text(s, 0.55, 5.9, 6.0, 1.0, "Bread used: 3 × 2 = 6.   **Bread left: 10 − 6 = 4** (the excess).", 19, SOFT[GREEN], INK, "c", "m", line=GREEN, pad=0.2, radius=0.14)
    link = card_text(s, 6.8, 5.9, 6.0, 1.0, "In chemistry that number is the **mol rxn**:  moles ÷ coefficient.", 19, SOFT[VIOLET], INK, "c", "m", line=VIOLET, pad=0.2, radius=0.14)
    tl.click("The recipe and what we have")
    tl.fade(rec); tl.then(); tl.fade(stock, *bread, *cheese)
    tl.click("Bread: how many sandwiches?")
    tl.fade(b)
    tl.click("Cheese: how many sandwiches?")
    tl.fade(c)
    tl.click("The smaller number limits")
    tl.fade(lim); tl.then(); tl.pulse(lim, scale=1.04, dur=500)
    tl.click("What is left over")
    tl.fade(left)
    tl.click("Chemistry name for this number: mol rxn")
    tl.fade(link)
    finish(s, tl, "Have students predict the answer before the cheese card appears. The same idea is the BCA table.", "Limiting idea")


def bca_intro(prs):
    cells = {}
    texts = [["start amount", "start amount", "0"], ["÷ coefficient", "÷ coefficient", "—"],
             ["−coef × x", "−coef × x", "+coef × x"], ["B + C", "B + C", "B + C"]]
    for r in range(4):
        for c in range(3):
            cells[(r, c)] = (texts[r][c], MUTE if texts[r][c] == "—" else INK, 18)
    steps = [
        ("A **BCA table** keeps track of a reaction in three rows: **B**efore, **C**hange, **A**fter. It works just like the ICE tables you may meet in equilibrium (I → B, C → C, E → A).", [], None),
        ("**Before:** how many moles you start with. Products start at 0.", [(0, 0), (0, 1), (0, 2)], None),
        ("**mol rxn:** my extra row. Divide each reactant’s moles by its coefficient. The **smaller** answer is the limiting reactant.", [(1, 0), (1, 1), (1, 2)], None),
        ("**Change:** reactants go **down** (−), products go **up** (+). The change is always (coefficient × x), where x is the smaller mol rxn.", [(2, 0), (2, 1), (2, 2)], None),
        ("**After:** Before + Change. This is what you have at the end: the limiting reactant is 0, the excess is what is left, the product is what you made.", [(3, 0), (3, 1), (3, 2)], None)]
    hdr = [("Reactant A", "coefficient a"), ("+  Reactant B", "coefficient b"), ("→  Product", "coefficient c")]
    bca_slide(prs, 3, "What is a BCA table?", "A generic reaction:  a A + b B → c C.   Here is what goes in each row.",
              None, steps, "Same layout every time: build it the same way every problem.", headers=hdr, cells=cells, n_cols=3)


def five_steps(prs):
    reveal_cards(prs, 3, "The five steps, every time", [
        ("1  Balance, then Before", "Balance the equation. Convert each starting amount to **moles**.", ICE),
        ("2  mol rxn", "Moles ÷ coefficient for each reactant.", GOLD),
        ("3  Pick the limiting reactant", "The **smaller** mol rxn. Call that value **x**.", EMBER),
        ("4  Change", "Reactants: −(coefficient × x).  Products: +(coefficient × x).", RED),
        ("5  After", "Before + Change. Convert to grams or liters only at the very end.", GREEN),
        ("Your answer", "Product made = After of the product. Excess left = After of the other reactant.", VIOLET)],
        cols=3, tip="Put this on the board and leave it up for the rest of the lesson.")


def level1(prs):
    rx = M.L1
    bca_slide(prs, 3, "Level 1: watch it done", "N₂ + 3H₂ → 2NH₃.  We start with 2.00 mol N₂ and 4.50 mol H₂.  How much NH₃ forms, and what is left?",
              rx, std_steps(rx, last="**%s mol NH₃** formed." % fm(rx.get("NH3")["after"])), "Walk through slowly. Students copy this into their packet.")


def level2(prs):
    rx = M.L2
    st = std_steps(rx, last="**%s mol** of each product formed." % fm(rx.get("HCl")["after"]))
    st.insert(0, ("**Your turn first.**  CH₄ + 2Cl₂ → CH₂Cl₂ + 2HCl.  Before you click: what is the mol rxn of each reactant? Which is limiting?", [], None))
    bca_slide(prs, 3, "Level 2: try it, then check", "CH₄ + 2Cl₂ → CH₂Cl₂ + 2HCl.  1.5 mol CH₄ react with 2.5 mol Cl₂.  Find the moles of each product and the excess left.",
              rx, st, "Pause 30 seconds at the first click. Students fill their own table before the reveal.")


def conv_slide(prs, title, problem, plan, steps, answer, tip=""):
    solve_slide(prs, 3, title, problem, plan, steps, answer, tip)


def level3(prs):
    rx = M.L3
    n, h = rx.get("N2")["before"], rx.get("H2")["before"]
    conv_slide(prs, "Level 3a: grams to moles first",
               "N₂ + 3H₂ → 2NH₃.  15.0 g N₂ react with 4.50 g H₂.  Find the mass of NH₃ made and the mass of excess reactant left.",
               "The Before row must be in moles, so convert both grams first.",
               [("Grams of N₂ to moles", "15.0 g N_{2} × {1 mol N_{2}|28.02 g N_{2}} = %s mol N_{2}" % fm(n)),
                ("Grams of H₂ to moles", "4.50 g H_{2} × {1 mol H_{2}|2.02 g H_{2}} = %s mol H_{2}" % fm(h))],
               "Before row: %s mol N₂, %s mol H₂" % (fm(n), fm(h)), "The BCA table never starts with grams.")
    bca_slide(prs, 3, "Level 3b: build the table", "15.0 g N₂ + 4.50 g H₂ → NH₃.  Use the moles we just found.",
              rx, std_steps(rx, first_extra="Use the moles from the last slide: %s mol N₂ and %s mol H₂." % (fm(n), fm(h)),
                            last="**%s mol NH₃** made." % fm(rx.get("NH3")["after"])),
              "Same five steps, but the Before numbers came from grams.")
    nh3, hl = rx.get("NH3")["after"], rx.get("H2")["after"]
    conv_slide(prs, "Level 3c: back to grams",
               "Now convert the After row to grams. NH₃ made and H₂ left over.", "Moles × molar mass.",
               [("Grams of NH₃ made", "%s mol NH_{3} × {17.04 g NH_{3}|1 mol NH_{3}} = %s g NH_{3}" % (fm(nh3), sf(grams(nh3, "NH3"), 3))),
                ("Grams of excess H₂", "%s mol H_{2} × {2.02 g H_{2}|1 mol H_{2}} = %s g H_{2}" % (fm(hl), sf(grams(hl, "H2"), 3)))],
               "%s g NH₃ made;  %s g H₂ left over" % (sf(grams(nh3, "NH3"), 3), sf(grams(hl, "H2"), 3)))


def level4(prs):
    rx = M.L4
    na, cl = rx.get("Na")["before"], rx.get("Cl2")["before"]
    conv_slide(prs, "Level 4a: grams and liters to moles",
               "2Na + Cl₂ → 2NaCl.  7.50 g of solid Na react with 18.5 L of Cl₂ gas at STP.  Find the mass of NaCl made and the mass of excess reactant left.",
               "Grams use molar mass. A gas at STP uses 22.4 L/mol.",
               [("Grams of Na to moles", "7.50 g Na × {1 mol Na|22.99 g Na} = %s mol Na" % fm(na)),
                ("Liters of Cl₂ to moles", "18.5 L Cl_{2} × {1 mol Cl_{2}|22.4 L Cl_{2}} = %s mol Cl_{2}" % fm(cl))],
               "Before row: %s mol Na, %s mol Cl₂" % (fm(na), fm(cl)), "Two different conversion factors for two different states of matter.")
    bca_slide(prs, 3, "Level 4b: your turn to build it", "2Na + Cl₂ → 2NaCl.  Before: %s mol Na and %s mol Cl₂." % (fm(na), fm(cl)),
              rx, [("**Your turn.** Build the whole table on your own: mol rxn, limiting reactant, Change, After. Then click to check each row.", [], None)] +
              std_steps(rx, last="**%s mol NaCl** made." % fm(rx.get("NaCl")["after"])),
              "Pause here. Let students build the table with no help, then reveal row by row.")
    nacl, cx = rx.get("NaCl")["after"], rx.get("Cl2")["after"]
    conv_slide(prs, "Level 4c: back to grams",
               "Convert the After row to grams.", "Moles × molar mass.",
               [("Grams of NaCl made", "%s mol NaCl × {58.44 g NaCl|1 mol NaCl} = %s g NaCl" % (fm(nacl), sf(grams(nacl, "NaCl"), 3))),
                ("Grams of excess Cl₂", "%s mol Cl_{2} × {70.90 g Cl_{2}|1 mol Cl_{2}} = %s g Cl_{2}" % (fm(cx), sf(grams(cx, "Cl2"), 3)))],
               "%s g NaCl made;  %s g Cl₂ left over" % (sf(grams(nacl, "NaCl"), 3), sf(grams(cx, "Cl2"), 3)))


def level5(prs):
    rx = M.L5
    nh, o2 = rx.get("NH3")["before"], rx.get("O2")["before"]
    conv_slide(prs, "Level 5a: balance, then convert",
               "___NH₃ + ___O₂ → ___NO + ___H₂O.  17.5 L NH₃ react with 12.5 L O₂ at STP.  Find the mass of each product and the liters of excess reactant left.",
               "Balance first. Then convert liters to moles.",
               [("Balance (count each atom)", "4NH_{3} + 5O_{2} → 4NO + 6H_{2}O"),
                ("Liters of NH₃ to moles", "17.5 L NH_{3} × {1 mol|22.4 L} = %s mol NH_{3}" % fm(nh)),
                ("Liters of O₂ to moles", "12.5 L O_{2} × {1 mol|22.4 L} = %s mol O_{2}" % fm(o2))],
               "Before row: %s mol NH₃, %s mol O₂" % (fm(nh), fm(o2)))
    bca_slide(prs, 3, "Level 5b: no help", "4NH₃ + 5O₂ → 4NO + 6H₂O.  Before: %s mol NH₃ and %s mol O₂." % (fm(nh), fm(o2)),
              rx, [("**Your turn.** Draw the table and fill every row yourself. This is exactly what you will do on a quiz.", [], None)] +
              std_steps(rx, last="**%s mol NO** and **%s mol H₂O** formed." % (fm(rx.get("NO")["after"]), fm(rx.get("H2O")["after"]))),
              "No scaffolding left. Let students struggle productively before revealing.")
    no, h2o, ex = rx.get("NO")["after"], rx.get("H2O")["after"], rx.get("NH3")["after"]
    conv_slide(prs, "Level 5c: answer what was asked",
               "Find the mass of each product and the liters of the excess reactant.", "Products: × molar mass.  Gas left: × 22.4 L/mol.",
               [("Grams of NO", "%s mol NO × {30.01 g NO|1 mol NO} = %s g NO" % (fm(no), sf(grams(no, "NO"), 3))),
                ("Grams of H₂O", "%s mol H_{2}O × {18.02 g H_{2}O|1 mol H_{2}O} = %s g H_{2}O" % (fm(h2o), sf(grams(h2o, "H2O"), 3))),
                ("Liters of excess NH₃", "%s mol NH_{3} × {22.4 L|1 mol NH_{3}} = %s L NH_{3}" % (fm(ex), sf(ex * VM, 3)))],
               "%s g NO, %s g H₂O, %s L NH₃ left" % (sf(grams(no, "NO"), 3), sf(grams(h2o, "H2O"), 3), sf(ex * VM, 3)))


# ------------------------------------------------------------------ percent yield
def yield_idea(prs):
    s = new_slide(prs, "Theoretical vs. actual: the free-throw idea", 4)
    tl = Timeline(s)
    col = VIOLET
    shots = [circle(s, 1.4 + i * 1.0, 2.2, 0.34, "CED4DA") for i in range(10)]
    t1 = card_text(s, 0.55, 3.0, 6.0, 1.0, "A player takes **10 shots**. The most they could make is 10. That is the **theoretical yield**.", 17, SOFT[VIOLET], INK, "l", "m", line=VIOLET, pad=0.22, radius=0.14)
    made = [circle(s, 1.4 + i * 1.0, 2.2, 0.34, "2F9E44") for i in range(7)]
    t2 = card_text(s, 6.8, 3.0, 6.0, 1.0, "They actually make **7**. That is the **actual yield**.", 17, SOFT[GREEN], INK, "l", "m", line=GREEN, pad=0.22, radius=0.14)
    f1 = card_text(s, 0.55, 4.3, W - 1.1, 1.0, "**Percent yield**  =  actual ÷ theoretical × 100  =  7 ÷ 10 × 100  =  **70%**", 24, SOFT[GOLD], INK, "c", "m", line=GOLD, pad=0.25, radius=0.16)
    t3 = card_text(s, 0.55, 5.6, 6.0, 1.3, "In chemistry the **theoretical yield** is the After row of the product (in grams). It comes from the **limiting reactant**.", 17, CARD, INK, "l", "m", pad=0.25, radius=0.14)
    t4 = card_text(s, 6.8, 5.6, 6.0, 1.3, "The **actual yield** is what you weigh in the lab. It cannot be predicted: you measure it.", 17, CARD, INK, "l", "m", pad=0.25, radius=0.14)
    tl.click("Ten shots: the most you could make")
    tl.fade(*shots); tl.then(); tl.fade(t1)
    tl.click("Seven actually go in")
    tl.fade(*made); tl.then(); tl.fade(t2)
    tl.click("Percent yield formula")
    tl.fade(f1)
    tl.click("Theoretical yield in chemistry")
    tl.fade(t3)
    tl.click("Actual yield in chemistry")
    tl.fade(t4)
    finish(s, tl, "The sports analogy sticks. Ask: can a player have a shooting percentage above 100%?", "Yield idea")


def yield_lab1(prs):
    rx = M.W4
    bca_slide(prs, 4, "Lab example: copper from aluminum, part 1", "2Al + 3CuCl₂ → 2AlCl₃ + 3Cu.  1.00 g Al reacts with 5.00 g CuCl₂.  Build the table to find the theoretical yield of Cu.",
              rx, std_steps(rx, first_extra="1.00 g Al ÷ 26.98 = %s mol.   5.00 g CuCl₂ ÷ 134.45 = %s mol.   Products start at 0." % (fm(rx.get("Al")["before"]), fm(rx.get("CuCl2")["before"])),
                            last="That is **%s mol Cu** that could form." % fm(rx.get("Cu")["after"])), "The table gives the theoretical amount, in moles.")
    cu = rx.get("Cu")["after"]
    solve_slide(prs, 4, "Lab example: copper from aluminum, part 2",
                "The copper is filtered, dried and weighed in the lab: **2.05 g**.  Find the percent yield.",
                "theoretical (grams) → compare with actual",
                [("Theoretical yield of Cu", "%s mol Cu × {63.55 g Cu|1 mol Cu} = %s g Cu" % (fm(cu), sf(M.W4_theo, 3))),
                 ("Actual yield (from the balance)", "2.05 g Cu"),
                 ("Percent yield", "{2.05 g|%s g} × 100 = %s%%" % (sf(M.W4_theo, 3), sf(M.W4_pct, 3)))],
                "Percent yield = %s%%" % sf(M.W4_pct, 3), "Theoretical is from the table; actual is from the balance.")


def frq1(prs):
    rx = M.F1
    bca_slide(prs, 5, "Lab practice: lead(II) iodide, part 1",
              "Pb(NO₃)₂ + 2KI → PbI₂ + 2KNO₃.  A student mixes 2.00 g Pb(NO₃)₂ with 3.00 g KI. The yellow PbI₂ is filtered and dried.  Find the theoretical yield.",
              rx, std_steps(rx, first_extra="2.00 g Pb(NO₃)₂ ÷ 331.22 = %s mol.   3.00 g KI ÷ 166.00 = %s mol." % (fm(rx.get("Pb(NO3)2")["before"]), fm(rx.get("KI")["before"])),
                            last="**%s mol PbI₂** could form." % fm(rx.get("PbI2")["after"])),
              "Lab-style problem: they will need the actual yield from filter-paper data on the next slide.")
    pb = rx.get("PbI2")["after"]
    solve_slide(prs, 5, "Lab practice: lead(II) iodide, part 2",
                "Data: filter paper = 0.92 g.  Filter paper + dry PbI₂ = 3.20 g.  Find the theoretical yield, the actual yield and the percent yield.",
                "theoretical → actual from the data → percent yield",
                [("Theoretical yield of PbI₂", "%s mol PbI_{2} × {461.0 g|1 mol} = %s g PbI_{2}" % (fm(pb), sf(M.F1_theo, 3))),
                 ("Actual yield = (paper + solid) − paper", "3.20 g − 0.92 g = %s g PbI_{2}" % sf(M.F1_act, 3)),
                 ("Percent yield", "{%s g|%s g} × 100 = %s%%" % (sf(M.F1_act, 3), sf(M.F1_theo, 3), sf(M.F1_pct, 3)))],
                "Percent yield = %s%%" % sf(M.F1_pct, 3), "The actual yield is never calculated from the equation: it is subtracted from the lab data.")


def why_not_100(prs):
    reveal_cards(prs, 4, "Why is the yield not 100%?", [
        ("Product lost", "Some solid stays on the glassware or filter paper when you transfer it.", None),
        ("Reaction not complete", "Side reactions or not enough time mean not all of the limiting reactant turned into product.", None),
        ("Above 100%: wet product", "If the solid is not fully dry, the extra water adds mass and the yield looks too high.", RED),
        ("Above 100%: impure product", "Leftover reactant or other substances stuck to the product add mass. A yield over 100% means a mistake.", RED)],
        tip="A percent yield above 100% always signals an error somewhere, never a great result.")


def summary(prs):
    reveal_cards(prs, 5, "Putting it all together", [
        ("1  Balance and convert", "Balance the equation. Change every starting amount into **moles**.", ICE),
        ("2  BCA with mol rxn", "Moles ÷ coefficient. The **smaller** one is limiting. Fill Change, then After.", GREEN),
        ("3  Read the After row", "Product made = its After value. Excess left = the other reactant’s After value.", GOLD),
        ("4  Percent yield", "Convert the product to grams: **theoretical**. Divide **actual ÷ theoretical × 100**.", VIOLET)],
        tip="Next: the 20 warm-ups and the three lab free-response problems in the packet.")


def plan(prs):
    P = []
    add = lambda f: P.append(lambda: f(prs))
    for f in (title_slide, roadmap, smores, ratio_slide):
        add(f)
    # mole-to-mole and mass examples
    P.append(lambda: solve_slide(prs, 1, "Example: moles to moles",
             "N₂ + 3H₂ → 2NH₃.  How many moles of NH₃ form from 6.0 mol H₂?", "mol H₂ → mol NH₃ with one mole ratio",
             [("Start with what you are given", "6.0 mol H_{2}"),
              ("Multiply by the mole ratio: wanted on top, given on bottom", "6.0 mol H_{2} × {2 mol NH_{3}|3 mol H_{2}}"),
              ("The units cancel: calculate", "= 4.0 mol NH_{3}")],
             "4.0 mol NH₃", "Make students say why the H₂ goes on the bottom: so the unit cancels."))
    add(mole_map)
    a = M.a62[0]
    P.append(lambda: solve_slide(prs, 2, "Example: grams to grams",
             "2Fe₂O₃ + 3C → 4Fe + 3CO₂.  How many grams of Fe form from 39.64 g of C?", "g C → mol C → mol Fe → g Fe",
             [("Grams of C to moles of C", "39.64 g C × {1 mol C|12.01 g C} = %s mol C" % sf(39.64 / 12.01, 4)),
              ("Moles of C to moles of Fe (mole ratio)", "%s mol C × {4 mol Fe|3 mol C} = %s mol Fe" % (sf(39.64 / 12.01, 4), sf(39.64 / 12.01 * 4 / 3, 4))),
              ("Moles of Fe to grams of Fe", "%s mol Fe × {55.85 g Fe|1 mol Fe} = %s g Fe" % (sf(39.64 / 12.01 * 4 / 3, 4), sf(a, 4)))],
             "%s g Fe" % sf(a, 4), "Three conversions, one per arrow of the mole map."))
    b = M.a62[2]
    P.append(lambda: solve_slide(prs, 2, "Example: liters of gas to grams",
             "2H₂ + O₂ → 2H₂O.  How many grams of water form from 30.2 L of H₂ gas at STP?", "L H₂ → mol H₂ → mol H₂O → g H₂O",
             [("Liters of H₂ to moles (22.4 L/mol)", "30.2 L H_{2} × {1 mol H_{2}|22.4 L H_{2}} = %s mol H_{2}" % sf(30.2 / VM, 3)),
              ("Moles of H₂ to moles of H₂O (mole ratio)", "%s mol H_{2} × {2 mol H_{2}O|2 mol H_{2}} = %s mol H_{2}O" % (sf(30.2 / VM, 3), sf(30.2 / VM, 3))),
              ("Moles of H₂O to grams", "%s mol H_{2}O × {18.02 g H_{2}O|1 mol H_{2}O} = %s g H_{2}O" % (sf(30.2 / VM, 3), sf(b, 3)))],
             "%s g H₂O" % sf(b, 3), "Same map, but the first step uses 22.4 L/mol instead of a molar mass."))
    for f in (sandwich, bca_intro, five_steps, level1, level2, level3, level4, level5, yield_idea, yield_lab1, frq1, why_not_100, summary):
        add(f)
    return P


def build(prs):
    for f in plan(prs):
        f()


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "Student Notes Packets", "Unit 6 - Stoichiometry BCA Packet - SLIDES.pptx")
    prs = new_prs()
    build(prs)
    prs.save(out)
    print("saved", out, len(prs.slides), "slides")
