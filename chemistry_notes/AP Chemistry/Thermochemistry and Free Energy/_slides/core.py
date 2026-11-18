"""Slide templates shared by the whole deck: dividers, step-by-step solutions, reveal cards, multiple choice."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "_build"))
from kit import *
from anim import Timeline
import data as D
from data import sig, sci

FINAL = os.environ.get("DECK_FINAL") == "1"        # QA mode: draw each slide as it looks after its last click
SLIDES = []                                        # (slide, title) in order, for QA


def finish(slide, tl, tip="", title=""):
    clicks = tl.click_list()
    body = tip.strip()
    if clicks:
        body += "\n\nCLICK BY CLICK:\n" + "\n".join("%d. %s" % (i + 1, c) for i, c in enumerate(clicks))
    notes(slide, body)
    if FINAL:
        tl.apply_final_state()
    else:
        tl.build()
    SLIDES.append((slide, title))


# ------------------------------------------------------------------ title and dividers
def motif(slide, cx, cy, col, scale=1.0, dark=True):
    """A small decorative molecule cluster (the deck's visual motif)."""
    pts = [(0, 0), (1.25, -0.5), (2.1, 0.55), (0.55, 1.15), (-0.95, 0.75), (-1.0, -0.9)]
    bonds = [(0, 1), (1, 2), (0, 3), (0, 4), (0, 5)]
    shapes = []
    for i, j in bonds:
        a, b = pts[i], pts[j]
        shapes.append(line(slide, cx + a[0] * scale, cy + a[1] * scale, cx + b[0] * scale, cy + b[1] * scale, "4C5C7A" if dark else LINE, 4))
    rs = [0.52, 0.34, 0.42, 0.3, 0.38, 0.3]
    cols = [col, "FFFFFF", "F2B84B", "FFFFFF", "7FB2F0", "FFFFFF"]
    for (x, y), r, c in zip(pts, rs, cols):
        shapes.append(circle(slide, cx + x * scale, cy + y * scale, r * scale, c))
    return shapes


def title_slide(prs):
    s = new_slide(prs, "Thermochemistry and Free Energy", dark=True, size=48)
    t = s.shapes.title
    t.left, t.top, t.width, t.height = E(0.8), E(2.1), E(8.3), E(1.9)
    sub = txt(s, 0.8, 4.15, 8.0, 0.9, "AP Chemistry · Unit 6 and the first part of Unit 9\nEnergy, entropy and Gibbs free energy", 20, "C9D4E8", spacing=1.1)
    chip(s, 0.8, 1.55, 3.6, 0.42, "CED 6.1 – 6.9  ·  9.1 – 9.6", EMBER, WHITE, 13)
    motif(s, 10.4, 3.7, EMBER, 1.25)
    tl = Timeline(s)
    tl.click("Nine sections, one story: energy in, energy out, then which way the reaction goes")
    tl.fade(sub)
    finish(s, tl, "Open with the question that ties the unit together: why do some changes happen on their own and others need a push?", "Title")
    return s


def divider(prs, n, big_q, topics, ced):
    col = SECTION_COLORS[n]
    s = new_slide(prs, SECTION_NAMES[n], dark=True, size=40)
    t = s.shapes.title
    t.left, t.top, t.width, t.height = E(3.1), E(2.0), E(9.5), E(1.5)
    big = txt(s, 0.7, 1.35, 2.3, 2.6, str(n), 130, col, bold=True, align="c", anchor="m")
    txt(s, 3.1, 3.55, 9.4, 0.4, "CED " + ced, 14, "9AA5B1")
    txt(s, 3.1, 4.0, 9.2, 0.7, topics, 18, "C9D4E8")
    q = card_text(s, 3.1, 5.15, 9.3, 1.1, big_q, 24, col, WHITE, "l", "m", pad=0.3, bold=True, radius=0.2)
    motif(s, 11.4, 1.5, col, 0.55)
    tl = Timeline(s)
    tl.click("Ask the big question and let students guess before moving on")
    tl.fade(q)
    finish(s, tl, "Give students 20–30 seconds to answer the question out loud. We come back to it at the end of the section.", "Section %d divider" % n)
    return s


# ------------------------------------------------------------------ reveal-card slides
def reveal_cards(prs, sec, title, items, cols=2, top=1.5, bottom=6.95, tip="", gap=0.28, size=17, head_size=18, extra=None):
    """items: [(heading, body_markup, color_or_None)] -> cards that appear one click at a time."""
    s = new_slide(prs, title, sec)
    n = len(items)
    rows = -(-n // cols)
    cw = (W - 1.1 - gap * (cols - 1)) / cols
    ch = (bottom - top - gap * (rows - 1)) / rows
    tl = Timeline(s)
    for k, (head, body, c) in enumerate(items):
        r, cc = divmod(k, cols)
        x, y = 0.55 + cc * (cw + gap), top + r * (ch + gap)
        col = c or SECTION_COLORS[sec]
        bg = card(s, x, y, cw, ch, CARD, 0.12, shadow=False)
        tag = badge(s, x + 0.42, y + 0.45, 0.26, str(k + 1), col, WHITE, 15)
        h = txt(s, x + 0.85, y + 0.2, cw - 1.1, 0.5, head, head_size, tcol(col), bold=True, anchor="m")
        b = txt(s, x + 0.3, y + 0.85, cw - 0.55, ch - 1.0, body, size, INK, spacing=1.05)
        tl.click(head)
        tl.fade(bg, tag, h, b)
    if extra:
        extra(s, tl)
    finish(s, tl, tip, title)
    return s


# ------------------------------------------------------------------ step-by-step solution slides
def solve_slide(prs, sec, title, problem, plan, steps, answer, tip="", visual=None, left_w=4.45, size=22):
    """steps: [(label, eq_markup)].  Each click reveals the next step; the answer lands last."""
    col = SECTION_COLORS[sec]
    s = new_slide(prs, title, sec)
    tl = Timeline(s)
    # ---- left: problem card, then the plan, then an optional picture
    ph = wrap_height(problem, 15, left_w - 0.4) + 0.62
    pc = card(s, 0.55, 1.45, left_w, ph, CARD, 0.12)
    txt(s, 0.75, 1.55, left_w - 0.4, 0.3, "PROBLEM", 11, tcol(col), bold=True)
    txt(s, 0.75, 1.88, left_w - 0.4, ph - 0.5, problem, 15, INK, spacing=1.05)
    y_left = 1.45 + ph + 0.2
    planc = None
    if plan:
        plh = wrap_height(plan, 15, left_w - 0.4) + 0.62
        planc = card(s, 0.55, y_left, left_w, plh, SOFT[col], 0.12)
        p1 = txt(s, 0.75, y_left + 0.1, left_w - 0.4, 0.3, "PLAN", 11, tcol(col), bold=True)
        p2 = txt(s, 0.75, y_left + 0.42, left_w - 0.4, plh - 0.5, plan, 15, INK, spacing=1.05)
        y_left += plh + 0.2
        tl.click("The plan: say the strategy out loud before touching numbers")
        tl.fade(planc, p1, p2)
    extras = [[] for _ in steps]
    if visual:
        extras = visual(s, 0.55, y_left, left_w, 6.95 - y_left) or extras
    # ---- right: measure every step first so the stack always fits
    rx, rw = 0.55 + left_w + 0.4, W - 0.55 - (0.55 + left_w + 0.4)
    avail = 6.0 - 1.45
    while True:
        meas = [measure_row(m, size, rw - 0.5) for _, m in steps]
        total = sum(0.36 + mm[1] + 0.14 for mm in meas)
        if total <= avail or size <= 14:
            break
        size -= 1
    y = 1.45
    for k, ((label, markup), mm, ex) in enumerate(zip(steps, meas, extras)):
        b = step_badge(s, rx + 0.22, y + 0.2, k + 1, col)
        lab = txt(s, rx + 0.6, y, rw - 0.6, 0.4, label, 15, tcol(col), bold=True, anchor="m")
        row, w, h = eqrow(s, rx + 0.6, y + 0.36, markup, mm[0], INK, max_w=rw - 0.6)
        tl.click("Step %d: %s" % (k + 1, label))
        tl.fade(b, lab, row)
        if ex:
            tl.fade(*ex)
        y += 0.36 + mm[1] + 0.14
    ans = card_text(s, rx, 6.08, rw, 0.82, answer, 22, SOFT[GOLD], INK, "l", "m", line=GOLD, pad=0.3, bold=True, radius=0.18)
    tl.click("The answer, with units and the correct sig figs")
    tl.fade(ans)
    tl.then(); tl.pulse(ans, scale=1.04, dur=500)
    finish(s, tl, tip, title)
    return s


# ------------------------------------------------------------------ multiple choice
def mc_slide(prs, n, topic, q, choices, right, why):
    sec = int(topic)
    col = SECTION_COLORS[sec]
    s = new_slide(prs, "Warm-up %d of 20" % n, sec, size=30)
    qh = wrap_height(q, 22, W - 1.5) + 0.5
    qc = card(s, 0.55, 1.4, W - 1.1, qh, CARD, 0.14)
    txt(s, 0.85, 1.4 + 0.22, W - 1.7, qh - 0.3, q, 22, INK, bold=True, spacing=1.05)
    y = 1.4 + qh + 0.25
    ch = min(0.8, (5.8 - y) / 4 - 0.1)
    tl = Timeline(s)
    hits = []
    for k, c in enumerate(choices):
        yy = y + k * (ch + 0.1)
        card(s, 0.55, yy, W - 1.1, ch, WHITE, 0.12, line=LINE)
        badge(s, 1.05, yy + ch / 2, 0.24, "ABCD"[k], "868E96", WHITE, 16)
        txt(s, 1.5, yy, W - 2.7, ch, c, 18, INK, anchor="m")
        if k == right:
            hit = card(s, 0.55, yy, W - 1.1, ch, SOFT[GREEN], 0.12, line=GREEN)
            hb = badge(s, 1.05, yy + ch / 2, 0.24, "✓", GREEN, WHITE, 18)
            ht = txt(s, 1.5, yy, W - 2.7, ch, c, 18, INK, bold=True, anchor="m")
            hits = [hit, hb, ht]
    wc = card(s, 0.55, 5.95, W - 1.1, 1.0, SOFT[col], 0.12)
    wt = txt(s, 0.85, 5.98, W - 1.7, 0.94, why, 14, INK, anchor="m")
    tl.click("Reveal the answer: " + "ABCD"[right])
    tl.fade(*hits)
    tl.click("Explain why")
    tl.fade(wc, wt)
    finish(s, tl, "Warm-up question. Let students vote before you reveal the answer.", "Warm-up %d" % n)
    return s
