"""Click-by-click slide deck for the Substitution and Elimination notes (Klein, Chapter 7).

    python3 deck.py [out.pptx]        (DECK_FINAL=1 draws every slide as it looks after its last click, for visual QA)

Mechanism pictures come from build/sne_figs.py (matplotlib); the 20 warm-up questions come from build/questions.py, the
same file that feeds the notes packet.  The animation engine is anim.py (real PowerPoint <p:timing> XML).
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "..", "build")
sys.path.insert(0, HERE)
sys.path.insert(0, BUILD)
import kit
from kit import *
from anim import Timeline
from PIL import Image
import questions

IMG = os.path.join(HERE, "..", "img")
kit.SECTION_COLORS.update({1: ICE, 2: EMBER, 3: VIOLET, 4: GREEN, 5: GOLD})
kit.SECTION_SHORT.update({1: "SN2", 2: "E2", 3: "SN1 and E1", 4: "Predicting", 5: "Practice"})
kit.SECTION_NAMES.update({1: "SN2", 2: "E2", 3: "SN1 and E1", 4: "Predicting", 5: "Practice"})

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


def cap(s, text, col, y=5.75, h=1.2, size=19, x=0.55, w=None):
    return card_text(s, x, y, w or (W - 1.1), h, text, size, SOFT[col], INK, "l", "m", line=col, pad=0.3, radius=0.16)


def pic(s, name, x, y, w=None, h=None):
    """Add a picture from img/ scaled to a width (or height); returns the shape."""
    path = os.path.join(IMG, name + ".png")
    im = Image.open(path)
    if w is None:
        w = h * im.width / im.height
    return s.shapes.add_picture(path, E(x), E(y), width=E(w))


def pic_h(name, w):
    im = Image.open(os.path.join(IMG, name + ".png"))
    return w * im.height / im.width


def reveal_cards(prs, sec, title, items, cols=2, top=1.5, bottom=6.95, tip="", gap=0.28, size=20, head_size=21):
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


# ------------------------------------------------------------------ a picture that is built up in stages, with a caption per click
def staged(prs, sec, title, frames, captions, tip="", pic_y=1.45, pic_w=11.0, cap_y=5.45, cap_h=1.5):
    """frames: picture names shown one after another (each replaces the one before at the same place).
    captions: one caption per click (len == len(frames)); frame k and caption k appear on click k."""
    s = new_slide(prs, title, sec)
    tl = Timeline(s)
    col = SECTION_COLORS[sec]
    h = pic_h(frames[0], pic_w)
    x = (W - pic_w) / 2
    shapes, caps = [], []
    for name, text in zip(frames, captions):
        shapes.append(pic(s, name, x, pic_y, w=pic_w))
        caps.append(cap(s, text, col, y=cap_y, h=cap_h))
    prev_p = prev_c = None
    for k in range(len(frames)):
        tl.click(captions[k].replace("**", "")[:90])
        if prev_c is not None:
            tl.out(prev_c, dur=300)
            tl.then()
        # frame k replaces frame k-1 without showing both: the previous frame stays under the new one (same picture + extras)
        tl.fade(shapes[k], caps[k], dur=450)
        prev_p, prev_c = shapes[k], caps[k]
    finish(s, tl, tip, title)
    return s


def title_slide(prs):
    s = new_slide(prs, "Substitution and Elimination", dark=True, size=48)
    t = s.shapes.title
    t.left, t.top, t.width, t.height = E(0.8), E(2.1), E(8.3), E(1.9)
    sub = txt(s, 0.8, 4.15, 8.2, 0.9, "Organic Chemistry · Chapter 7\nSN2, E2, SN1, E1 and how to choose", 20, "C9D4E8", spacing=1.1)
    chip(s, 0.8, 1.55, 3.0, 0.42, "Click to step through", EMBER, WHITE, 13)
    # a small molecule motif
    pts = [(0, 0), (1.25, -0.5), (2.1, 0.55), (0.55, 1.15), (-0.95, 0.75), (-1.0, -0.9)]
    cx, cy, sc = 10.4, 3.7, 1.25
    for i, j in [(0, 1), (1, 2), (0, 3), (0, 4), (0, 5)]:
        a, b = pts[i], pts[j]
        line(s, cx + a[0] * sc, cy + a[1] * sc, cx + b[0] * sc, cy + b[1] * sc, "4C5C7A", 4)
    for (x, y), r, c in zip(pts, [0.52, 0.34, 0.42, 0.3, 0.38, 0.3], [EMBER, "FFFFFF", "F2B84B", "FFFFFF", "7FB2F0", "FFFFFF"]):
        circle(s, cx + x * sc, cy + y * sc, r * sc, c)
    tl = Timeline(s)
    tl.click("The question for the whole chapter")
    tl.fade(sub)
    finish(s, tl, "Follow along with the notes packet. Pause before each click and let students predict.", "Title")


def roadmap(prs):
    reveal_cards(prs, 1, "Four mechanisms, one decision", [
        ("SN2", "One step. A strong nucleophile attacks from the back side.", ICE),
        ("E2", "One step. A strong base removes a β hydrogen.", EMBER),
        ("SN1", "Two steps. A carbocation forms, then a weak nucleophile attacks.", VIOLET),
        ("E1", "Two steps. A carbocation forms, then a weak base removes a β hydrogen.", GREEN)],
        tip="Ask students what they think decides which one wins: substrate, reagent, solvent.")


def vocab(prs):
    reveal_cards(prs, 1, "The cast of characters", [
        ("Nucleophile", "Electron-rich. Attacks the δ+ carbon.  HO⁻, HS⁻, CN⁻, I⁻, H₂O", ICE),
        ("Base", "Removes a proton (H⁺) from a β carbon.  t-BuOK, NaOEt, DBU", EMBER),
        ("Leaving group", "Leaves with the electron pair.  I⁻, Br⁻, Cl⁻, TsO⁻", VIOLET),
        ("α and β carbons", "α is bonded to the halogen. β carbons are the neighbors of α.", GREEN)],
        tip="Substitution: the reagent acts as a nucleophile. Elimination: it acts as a base.")


def leaving_groups(prs):
    s = new_slide(prs, "Good leaving groups are weak bases", 1)
    tl = Timeline(s)
    rows = [("I⁻", "HI  (pKa ≈ −10)", "excellent", GREEN), ("Br⁻", "HBr  (pKa ≈ −9)", "excellent", GREEN),
            ("Cl⁻", "HCl  (pKa ≈ −7)", "good", GREEN), ("TsO⁻", "TsOH  (pKa ≈ −3)", "excellent", GREEN),
            ("F⁻", "HF  (pKa ≈ 3)", "poor", GOLD), ("HO⁻", "H₂O  (pKa ≈ 16)", "terrible", RED)]
    y0 = 1.6
    hdr = [card_text(s, 0.55, y0, 2.4, 0.5, "**Leaving group**", 16, "E9ECEF", INK, "c", "m", pad=0.05, radius=0.06),
           card_text(s, 3.0, y0, 4.6, 0.5, "**Conjugate acid (typical pKa)**", 16, "E9ECEF", INK, "c", "m", pad=0.05, radius=0.06),
           card_text(s, 7.65, y0, 5.1, 0.5, "**Quality**", 16, "E9ECEF", INK, "c", "m", pad=0.05, radius=0.06)]
    tl.click("The table")
    tl.fade(*hdr)
    for k, (lg, acid, q, col) in enumerate(rows):
        y = y0 + 0.6 + k * 0.62
        a = card_text(s, 0.55, y, 2.4, 0.54, "**%s**" % lg, 22, WHITE, INK, "c", "m", line=LINE, pad=0.05, radius=0.06)
        b = card_text(s, 3.0, y, 4.6, 0.54, acid, 18, WHITE, INK, "c", "m", line=LINE, pad=0.05, radius=0.06)
        c = card_text(s, 7.65, y, 5.1, 0.54, "**%s**" % q, 18, SOFT[col], INK, "c", "m", line=col, pad=0.05, radius=0.06)
        tl.click("%s: %s" % (lg, q))
        tl.fade(a, b, c)
    note = cap(s, "The **stronger** the conjugate acid, the **weaker** the base, and the **better** the leaving group. "
                  "HO⁻ must be turned into H₂O first (protonate it) before it can leave.", ICE, y=5.95, h=1.0)
    tl.click("The rule")
    tl.fade(note)
    finish(s, tl, "Connect to acidity from Chapter 3: strong acid → stable, weak conjugate base.", "Leaving groups")


def sn2_mech(prs):
    staged(prs, 1, "SN2: one step, backside attack",
           ["sn2_mech_s0", "sn2_mech_s1", "sn2_mech"],
           ["**The players.** A nucleophile (HO⁻) and an alkyl halide. The carbon bonded to Br is δ+.",
            "**The arrows.** The nucleophile’s electron pair attacks the carbon **from the back side**, opposite Br. At the same time the C–Br bond breaks and Br leaves.",
            "**One step, no intermediate.** HO⁻ replaces Br⁻. The reaction is **bimolecular**: both reactants are in the rate-determining step."],
           "Click one at a time. The red arrows show electron movement.")


def sn2_kinetics(prs):
    s = new_slide(prs, "SN2 kinetics: the rate depends on both", 1)
    tl = Timeline(s)
    big = card_text(s, 2.2, 1.5, 8.9, 1.2, "rate  =  k [RX] [Nu⁻]", 38, SOFT[ICE], INK, "c", "m", line=ICE, pad=0.2, bold=True, radius=0.2)
    c1 = card_text(s, 0.55, 3.1, 3.9, 2.4, "**Double [RX]**\nrate × 2", 24, CARD, INK, "c", "m", pad=0.2, radius=0.16)
    c2 = card_text(s, 4.7, 3.1, 3.9, 2.4, "**Double [Nu⁻]**\nrate × 2", 24, CARD, INK, "c", "m", pad=0.2, radius=0.16)
    c3 = card_text(s, 8.85, 3.1, 3.9, 2.4, "**Double both**\nrate × 4", 24, SOFT[GOLD], INK, "c", "m", line=GOLD, pad=0.2, radius=0.16)
    n = cap(s, "**Second order overall** (first order in each reactant) → **bimolecular**. A strong nucleophile makes SN2 fast.", ICE, y=5.85, h=1.0)
    tl.click("The rate law"); tl.fade(big)
    tl.click("Double the substrate"); tl.fade(c1)
    tl.click("Double the nucleophile"); tl.fade(c2)
    tl.click("Double both"); tl.fade(c3)
    tl.click("Why bimolecular"); tl.fade(n)
    finish(s, tl, "Have students predict each result before the click.", "SN2 kinetics")


def sn2_sterics(prs):
    s = new_slide(prs, "SN2 and sterics: methyl > 1° > 2° >> 3°", 1)
    tl = Timeline(s)
    items = [("CH₃–X", "methyl", 7.8, GREEN, "fastest"), ("R–CH₂–X", "primary (1°)", 6.0, GREEN, "fast"),
             ("R₂CH–X", "secondary (2°)", 3.0, GOLD, "slow"), ("R₃C–X", "tertiary (3°)", 0.25, RED, "no SN2")]
    for k, (f, name, bar, col, lab) in enumerate(items):
        y = 1.6 + k * 1.05
        a = card_text(s, 0.55, y, 3.1, 0.85, "**%s**\n%s" % (f, name), 16, CARD, INK, "c", "m", pad=0.08, radius=0.12)
        b = card(s, 3.85, y + 0.12, bar, 0.62, col, 0.1)
        t = txt(s, 3.85 + bar + 0.15, y + 0.12, 2.6, 0.62, lab, 18, INK, bold=True, anchor="m")
        tl.click(name)
        tl.fade(a); tl.then(); tl.wipe(b, direction="left", dur=700); tl.then(); tl.fade(t)
    n = cap(s, "More groups on the α carbon → more crowding in the transition state → higher Ea → slower. "
               "A 1° halide with three groups on the **β** carbon (neopentyl) is also too slow.", ICE, y=5.95, h=1.0, size=18)
    tl.click("Why")
    tl.fade(n)
    finish(s, tl, "Use the bar lengths as relative rates (not to scale).", "SN2 sterics")


def sn2_stereo(prs):
    s = new_slide(prs, "SN2 inverts a stereocenter", 1)
    tl = Timeline(s)
    w = 10.6
    q = pic(s, "q_sn2_stereo", (W - w) / 2, 1.5, w=w)
    a = pic(s, "a_sn2_stereo", (W - w) / 2, 1.5, w=w)
    c1 = cap(s, "**Question:** (S)-2-bromobutane reacts with NaCN in DMSO. Draw the product with its stereochemistry.", ICE, y=5.3, h=1.0)
    c2 = cap(s, "**Inversion.** CN attacks from the back side, so the wedge Br becomes a **dashed** CN. Both CN and Br rank first in priority, so (S) becomes **(R)-2-methylbutanenitrile**.", ICE, y=5.3, h=1.3)
    tl.click("Question"); tl.fade(q, c1)
    tl.click("Answer"); tl.out(q, c1, dur=300); tl.then(); tl.fade(a, c2)
    finish(s, tl, "Have students draw their own product before the answer.", "SN2 stereochemistry")


def nuc_strength(prs):
    reveal_cards(prs, 1, "What makes a nucleophile strong?", [
        ("Charge", "An anion beats its neutral partner: HO⁻ is over a million times faster than H₂O.", ICE),
        ("Polarizability", "Big atoms with distant electrons are better: HS⁻ > HO⁻, and I⁻ > Br⁻ > Cl⁻ in protic solvents.", EMBER),
        ("Strong", "HS⁻, RS⁻, I⁻, Br⁻, Cl⁻, HO⁻, RO⁻ (CN⁻ is good too).", GREEN),
        ("Weak", "H₂O and ROH: neutral molecules. They need SN1 or E1 conditions.", RED)],
        tip="Fluoride depends on the solvent: weak in protic, strong in polar aprotic (see Solvent Effects).")


def e2_mech(prs):
    staged(prs, 2, "E2: one step, strong base",
           ["e2_mech_s0", "e2_mech_s1", "e2_mech"],
           ["**The players.** A strong base (HO⁻) and an alkyl halide that has a β hydrogen.",
            "**Three arrows at once.** The base takes the β H, the C–H bond becomes the C=C π bond, and the C–Br bond breaks. The H and Br must be **anti-periplanar**.",
            "**Result:** an alkene, water and Br⁻, in a single step. rate = k[RX][base]: **bimolecular**."],
           "One concerted step: all three arrows happen together.")


def anti_periplanar(prs):
    s = new_slide(prs, "Anti-periplanar: H and Br 180° apart", 2)
    tl = Timeline(s)
    n = pic(s, "newman", 0.9, 1.45, h=4.1)
    c1 = cap(s, "A **Newman projection** looking down the C2–C3 bond. The front carbon has Br, CH₃ and H; the back carbon has H, H and CH₃.", EMBER, y=5.75, h=1.15, size=18, x=0.55, w=W - 1.1)
    ar = arrow(s, 3.15, 1.6, 3.15, 5.1, RED, 3.5)
    c2 = card_text(s, 6.4, 2.3, 6.2, 1.7, "The **H at the top** (back carbon) is exactly **opposite** the Br (front carbon): they are **anti-periplanar**. E2 can happen.", 20, SOFT[EMBER], INK, "l", "m", line=EMBER, pad=0.25, radius=0.16)
    c3 = card_text(s, 6.4, 4.2, 6.2, 1.3, "If the leaving group has **no** anti hydrogen, E2 is very slow. In a chair, both must be **axial**.", 19, SOFT[GOLD], INK, "l", "m", line=GOLD, pad=0.25, radius=0.16)
    tl.click("The Newman projection"); tl.fade(n, c1)
    tl.click("The anti H"); tl.fade(ar, c2)
    tl.click("Why it matters"); tl.fade(c3)
    finish(s, tl, "Rotate the back carbon in your hands: only the H directly opposite Br can leave.", "Anti-periplanar")


def zaitsev(prs):
    s = new_slide(prs, "Zaitsev or Hofmann? Check the base", 2)
    tl = Timeline(s)
    w = 10.4
    x = (W - w) / 2
    q = pic(s, "q_e2_a", x, 1.45, w=w * 0.6)
    a1 = pic(s, "a_e2_a", x, 1.45, w=w)
    a2 = pic(s, "a_e2_b", x, 1.45, w=w)
    c0 = cap(s, "**Question:** 2-bromo-2-methylbutane reacts with a base. Which alkene is major? It depends on the base.", EMBER, y=5.3, h=1.0)
    c1 = cap(s, "**NaOEt (small base):** removes the more hindered β H from the CH₂ and gives the **more substituted** (more stable) alkene: **Zaitsev** is major.", EMBER, y=5.3, h=1.3, size=18)
    c2 = cap(s, "**t-BuOK (bulky base):** cannot reach the crowded H, so it removes an H from the CH₃: the **Hofmann** (less substituted) alkene is major.", EMBER, y=5.3, h=1.3, size=18)
    tl.click("Question"); tl.fade(q, c0)
    tl.click("NaOEt"); tl.out(q, c0, dur=300); tl.then(); tl.fade(a1, c1)
    tl.click("t-BuOK"); tl.out(a1, c1, dur=300); tl.then(); tl.fade(a2, c2)
    finish(s, tl, "Stability: tetra > tri > di > mono. A hindered base prefers the most accessible H.", "Zaitsev vs Hofmann")


def e2_stereo(prs):
    s = new_slide(prs, "Stereoselective E2: trans beats cis", 2)
    tl = Timeline(s)
    w = 11.0
    x = (W - w) / 2
    q = pic(s, "q_e2_c", x, 1.6, w=w * 0.55)
    a = pic(s, "a_e2_c", 0.55, 1.6, w=12.2)
    c0 = cap(s, "**Question:** draw all the E2 products of 2-bromopentane with NaOEt.", EMBER, y=5.1, h=0.9)
    c1 = cap(s, "**trans-2-pentene is major.** C3 has two H’s, so both stereoisomers can form, but trans has less steric strain. "
                "1-Pentene (Hofmann) is minor with a small base.", EMBER, y=5.1, h=1.5, size=18)
    tl.click("Question"); tl.fade(q, c0)
    tl.click("The products"); tl.out(q, c0, dur=300); tl.then(); tl.fade(a, c1)
    finish(s, tl, "If a β carbon has only one H, the reaction is stereospecific: the anti H decides the alkene geometry.", "E2 stereochemistry")


def sn1_mech(prs):
    s = new_slide(prs, "SN1 and E1: two steps and a carbocation", 3)
    tl = Timeline(s)
    col = VIOLET
    w = 10.4
    x = (W - w) / 2
    ps = [pic(s, "sn1_step%d" % k, x, 1.4, w=w) for k in (1, 2, 3)]
    cs = [cap(s, "**Step 1 (slow):** the C–Br bond breaks and Br⁻ leaves with both electrons. This forms a **carbocation**. Only the alkyl halide is in this step: rate = k[RX].", col, y=5.7, h=1.25, size=18),
          cap(s, "**Step 2:** the solvent (ethanol, a weak nucleophile) attacks the empty orbital of the carbocation. This makes an oxonium ion.", col, y=5.7, h=1.25, size=18),
          cap(s, "**Step 3:** another solvent molecule removes a proton. From the O–H we get the ether (**SN1**). From a β C–H we get an alkene (**E1**).", col, y=5.7, h=1.25, size=18)]
    for k in range(3):
        tl.click("Step %d" % (k + 1))
        if k:
            tl.out(ps[k - 1], cs[k - 1], dur=300)
            tl.then()
        tl.fade(ps[k], cs[k])
    finish(s, tl, "Each step replaces the last. Go back one click to compare steps.", "SN1 mechanism")


def energy(prs):
    s = new_slide(prs, "One hump or two?", 3)
    tl = Timeline(s)
    a = pic(s, "energy_one", 0.7, 1.5, w=5.6)
    b = pic(s, "energy_two", 6.9, 1.5, w=6.0)
    ca = card_text(s, 0.7, 5.0, 5.6, 1.9, "**SN2 / E2**\nOne step, one transition state. Rate depends on [RX] and the nucleophile or base.", 18, SOFT[ICE], INK, "l", "m", line=ICE, pad=0.25, radius=0.14)
    cb = card_text(s, 6.9, 5.0, 6.0, 1.9, "**SN1 / E1**\nTwo steps with a **carbocation intermediate** in the valley. The slow first step sets the rate: rate = k[RX].", 18, SOFT[VIOLET], INK, "l", "m", line=VIOLET, pad=0.25, radius=0.14)
    tl.click("SN2 / E2"); tl.fade(a, ca)
    tl.click("SN1 / E1"); tl.fade(b, cb)
    finish(s, tl, "Ask: which step of SN1 has the higher barrier? (the first)", "Energy diagrams")


def carbocation(prs):
    reveal_cards(prs, 3, "Carbocations: stability and rearrangement", [
        ("Stability", "3° > 2° > 1° > methyl. Allylic and benzylic cations are also stabilized (resonance).", VIOLET),
        ("Rearrangement", "A neighboring H or CH₃ can shift with its electron pair to give a more stable carbocation.", EMBER),
        ("Stereochemistry", "The cation is planar. The nucleophile can attack either face: nearly racemic product.", ICE),
        ("E1 competes", "SN1 and E1 products form together. The E1 alkene is the Zaitsev product.", GREEN)],
        tip="Ask: why would a secondary carbocation rearrange to a tertiary one?")


def rearrangement(prs):
    s = new_slide(prs, "Watch out for rearrangements", 3)
    tl = Timeline(s)
    w = 10.0
    x = (W - w) / 2
    q = pic(s, "q_sn1_b", x, 1.5, w=w * 0.6)
    a = pic(s, "a_sn1_b", x, 1.5, w=w)
    c0 = cap(s, "**Question:** this secondary bromide is heated in ethanol. What products form?", VIOLET, y=5.3, h=1.0)
    c1 = cap(s, "**Step 1:** Br⁻ leaves, giving a **secondary** carbocation next to a quaternary carbon.", VIOLET, y=5.3, h=1.0)
    c2 = cap(s, "**Step 2:** a **methyl shift** moves a CH₃ with its electrons to the cation carbon. The new cation is **tertiary** (more stable).", VIOLET, y=5.3, h=1.3, size=18)
    c3 = cap(s, "**Products:** the ether (SN1), the tetrasubstituted alkene (E1, **major**, Zaitsev) and the less substituted alkene (E1, minor). No product keeps the original skeleton.", VIOLET, y=5.3, h=1.3, size=17)
    tl.click("Question"); tl.fade(q, c0)
    tl.click("Ionization"); tl.out(c0, dur=300); tl.then(); tl.fade(c1)
    tl.click("Methyl shift"); tl.out(c1, dur=300); tl.then(); tl.fade(c2)
    tl.click("The products"); tl.out(q, c2, dur=300); tl.then(); tl.fade(a, c3)
    finish(s, tl, "Rearrangement happens in SN1/E1, never in SN2/E2 (no carbocation).", "Rearrangement")


def racemization(prs):
    s = new_slide(prs, "SN1 at a stereocenter: racemization", 3)
    tl = Timeline(s)
    w = 8.6
    x = (W - w) / 2
    q = pic(s, "q_sn1_c", x, 1.5, w=w * 0.62)
    a = pic(s, "a_sn1_c", x, 1.5, w=w)
    c0 = cap(s, "**Question:** the drawn enantiomer reacts in water. What substitution product(s) form?", VIOLET, y=5.0, h=1.0)
    c1 = cap(s, "The carbocation is **planar**, so water attacks from **either** face with nearly equal probability: a **nearly racemic** mixture of the two alcohols (a slight excess of inversion, because of ion pairs).", VIOLET, y=5.0, h=1.5, size=18)
    tl.click("Question"); tl.fade(q, c0)
    tl.click("The answer"); tl.out(q, c0, dur=300); tl.then(); tl.fade(a, c1)
    finish(s, tl, "Contrast with SN2: a single inverted enantiomer.", "Racemization")


def reagent_classes(prs):
    reveal_cards(prs, 4, "Step 1: what does the reagent do?", [
        ("Strong base, weak nucleophile", "DBU, DBN, t-BuOK. Almost always elimination (E2).", EMBER),
        ("Strong base, strong nucleophile", "HO⁻, MeO⁻, EtO⁻. SN2 and E2 compete.", ICE),
        ("Weak base, strong nucleophile", "I⁻, Br⁻, Cl⁻, HS⁻, RS⁻, RSH. Substitution only.", GREEN),
        ("Weak base, weak nucleophile", "H₂O, MeOH, EtOH. Unimolecular: SN1 and E1.", VIOLET)],
        tip="If NaOEt is dissolved in EtOH, NaOEt is the reagent and EtOH is just the solvent.")


def grid(prs):
    s = new_slide(prs, "Step 2: the substrate decides (the grid)", 4)
    tl = Timeline(s)
    heads = ["Strong base\nweak Nu", "Strong base\nstrong Nu", "Weak base\nstrong Nu", "Weak base\nweak Nu"]
    cx0, cw, y0 = 2.0, 2.65, 1.5
    hs = [card_text(s, cx0 + i * (cw + 0.08), y0, cw, 0.85, "**%s**" % h, 15, "E9ECEF", INK, "c", "m", pad=0.05, radius=0.06) for i, h in enumerate(heads)]
    tl.click("The four reagent types"); tl.fade(*hs)
    E2c, SN2c, SN1c, E1c, NR = ("E2", EMBER), ("SN2", ICE), ("SN1", VIOLET), ("SN1 + E1", GREEN), ("no reaction", "868E96")
    data = [("1°", [("E2", EMBER), ("SN2 (E2 minor)", ICE), ("SN2", ICE), NR]),
            ("2°", [("E2", EMBER), ("E2 (SN2 minor)", EMBER), ("SN2", ICE), NR]),
            ("3°", [("E2", EMBER), ("E2", EMBER), ("SN1", VIOLET), ("SN1 + E1", VIOLET)])]
    for r, (lab, row) in enumerate(data):
        y = y0 + 0.95 + r * 1.05
        l = card_text(s, 0.55, y, 1.35, 0.95, "**%s**" % lab, 28, "E9ECEF", INK, "c", "m", pad=0.05, radius=0.06)
        cells = [card_text(s, cx0 + i * (cw + 0.08), y, cw, 0.95, "**%s**" % t, 19, SOFT[c], INK, "c", "m", line=c, pad=0.05, radius=0.08)
                 for i, (t, c) in enumerate(row)]
        tl.click("%s substrate" % lab)
        tl.fade(l, *cells)
    n = cap(s, "Don’t memorize the grid: rebuild it. Strong bases → E2. A 3° carbon cannot do SN2. Weak/weak needs a carbocation, so only 3° reacts.", GREEN, y=5.85, h=1.0, size=18)
    tl.click("How to use it"); tl.fade(n)
    finish(s, tl, "This is the book’s Figure 7.18 redrawn. Students should be able to explain each cell.", "The grid")


def worked(prs):
    s = new_slide(prs, "Worked example: the three-step method", 4)
    tl = Timeline(s)
    col = GREEN
    w = 5.3
    q = pic(s, "q_e2_a", 0.55, 1.4, w=w)
    q2 = pic(s, "q_e2_b", 0.55, 3.0, w=w)
    steps = [("1  The reagent", "NaOEt = strong base **and** strong nucleophile. t-BuOK = strong base, bulky, poor nucleophile."),
             ("2  The substrate", "3° alkyl halide. Strong base → **E2** (3° cannot do SN2)."),
             ("3  Regiochemistry", "NaOEt: small base → **Zaitsev** (2-methyl-2-butene). t-BuOK: bulky → **Hofmann** (2-methyl-1-butene).")]
    tl.click("The two reactions"); tl.fade(q, q2)
    y = 1.4
    for k, (h, b) in enumerate(steps):
        c = card_text(s, 6.2, y, 6.6, 1.5, "**%s**\n%s" % (h, b), 18, SOFT[col], INK, "l", "m", line=col, pad=0.25, radius=0.14)
        tl.click(h)
        tl.fade(c)
        y += 1.65
    n = cap(s, "Same substrate, two bases, two different major products. The **reagent** controls regiochemistry.", GREEN, y=6.3, h=0.85, size=18)
    tl.click("Takeaway"); tl.fade(n)
    finish(s, tl, "Same pictures as the packet’s 7.3 practice problem.", "Worked example")


def solvents(prs):
    s = new_slide(prs, "Solvent effects: protic vs. polar aprotic", 4)
    tl = Timeline(s)
    c1 = card_text(s, 0.55, 1.45, 6.0, 2.0, "**Polar protic**\nHas an O–H or N–H: H₂O, MeOH, EtOH, CH₃COOH.\nH-bonds to anions (cages them). Stabilizes carbocations. Favors **SN1 / E1**.", 17, SOFT[VIOLET], INK, "l", "m", line=VIOLET, pad=0.25, radius=0.14)
    c2 = card_text(s, 6.8, 1.45, 6.0, 2.0, "**Polar aprotic**\nNo O–H or N–H: DMSO, DMF, acetone, CH₃CN.\nSolvates the cation, leaves the anion “naked”. Favors **SN2**.", 17, SOFT[ICE], INK, "l", "m", line=ICE, pad=0.25, radius=0.14)
    tl.click("Protic"); tl.fade(c1)
    tl.click("Aprotic"); tl.fade(c2)
    data = [("Nu⁻", "In MeOH", "In DMF", "Increase"), ("I⁻", "43", "6,500", "×150"), ("Br⁻", "1", "21,000", "×21,000"),
            ("Cl⁻", "0.04", "41,000", "×1,030,000"), ("F⁻", "0.0006", "49,000", "×82,000,000")]
    xs, ws = [0.55, 2.55, 5.55, 8.55], [1.9, 2.9, 2.9, 4.2]
    for r, row in enumerate(data):
        y = 3.65 + r * 0.55
        cells = [card_text(s, xs[c], y, ws[c], 0.5, ("**%s**" % t) if r == 0 else t, 16, "E9ECEF" if r == 0 else WHITE, INK, "c", "m", line=LINE, pad=0.04, radius=0.05) for c, t in enumerate(row)]
        tl.click("Table 7.5: " + row[0])
        tl.fade(*cells)
    n = cap(s, "In MeOH the order is I⁻ > Br⁻ > Cl⁻ > F⁻. In DMF it **reverses**: F⁻ is the most reactive, because nothing cages it.", ICE, y=6.5, h=0.8, size=15)
    tl.click("The reversal"); tl.fade(n)
    finish(s, tl, "Relative rates are from the textbook’s Table 7.5 (Br⁻ in MeOH = 1).", "Solvent effects")


def retro(prs):
    s = new_slide(prs, "Retrosynthesis: make methyl tert-butyl ether", 4)
    tl = Timeline(s)
    m = pic(s, "t_mtbe", 0.8, 1.7, h=3.0)
    q = card_text(s, 4.3, 1.5, 8.5, 0.9, "**Target:** (CH₃)₃C–O–CH₃.  Disconnect the C–O bond. Two ways to put it back together:", 17, CARD, INK, "l", "m", pad=0.2, radius=0.12)
    r1 = card_text(s, 4.3, 2.6, 8.5, 1.4, "**Route 1:** CH₃O⁻ + (CH₃)₃C–Br\nA strong base with a **3° halide**: gives **E2** (2-methylpropene). ✗ Fails.", 17, SOFT[RED], INK, "l", "m", line=RED, pad=0.25, radius=0.14)
    r2 = card_text(s, 4.3, 4.15, 8.5, 1.4, "**Route 2:** (CH₃)₃C–O⁻ + CH₃–I\nSN2 needs a methyl or 1° electrophile. ✓ **Works.**", 17, SOFT[GREEN], INK, "l", "m", line=GREEN, pad=0.25, radius=0.14)
    n = cap(s, "Put the **bulky** group on the **nucleophile** and the **unhindered** carbon on the electrophile.", GREEN, y=5.9, h=1.0)
    tl.click("The target"); tl.fade(m, q)
    tl.click("Route 1"); tl.fade(r1)
    tl.click("Route 2"); tl.fade(r2)
    tl.click("The rule"); tl.fade(n)
    finish(s, tl, "A retrosynthesis ends with a reaction that the mechanism rules allow.", "Retrosynthesis")


def summary(prs):
    reveal_cards(prs, 4, "Putting it together", [
        ("1  What is the reagent?", "Strong base → E2.  Strong nucleophile, weak base → SN2 (or SN1 for 3°).  Weak/weak → SN1 / E1.", GREEN),
        ("2  What is the substrate?", "1° and methyl: SN2.  2°: both E2 and SN2.  3°: E2, SN1 or E1, never SN2.", ICE),
        ("3  Details matter", "Bulky base → Hofmann. Rearrangements in SN1/E1. Inversion in SN2, racemization in SN1.", EMBER),
        ("4  Solvent helps", "Polar aprotic speeds SN2. Polar protic favors SN1 and E1.", VIOLET)],
        tip="Next: 20 warm-up questions, one per slide.")


# ------------------------------------------------------------------ multiple choice
def mc_slide(prs, n, stem, opts, right, why):
    col = SECTION_COLORS[5]
    s = new_slide(prs, "Warm-up %d of 20" % n, 5, size=30)
    qh = wrap_height(stem, 22, W - 1.5) + 0.5
    card(s, 0.55, 1.4, W - 1.1, qh, CARD, 0.14)
    txt(s, 0.85, 1.4 + 0.22, W - 1.7, qh - 0.3, stem, 22, INK, bold=True, spacing=1.05)
    y = 1.4 + qh + 0.25
    ch = min(0.8, (5.8 - y) / 4 - 0.1)
    tl = Timeline(s)
    hits = []
    letter = check = None
    for k, c in enumerate(opts):
        yy = y + k * (ch + 0.1)
        card(s, 0.55, yy, W - 1.1, ch, WHITE, 0.12, line=LINE)
        if k == right:
            hits = [card(s, 0.55, yy, W - 1.1, ch, SOFT[GREEN], 0.12, line=GREEN)]
        lb = badge(s, 1.05, yy + ch / 2, 0.24, "ABCD"[k], "868E96", WHITE, 16)
        txt(s, 1.5, yy, W - 2.7, ch, c, 18, INK, anchor="m")
        if k == right:
            check = badge(s, 1.05, yy + ch / 2, 0.24, "✓", GREEN, WHITE, 18)
            letter = lb
    wc = card(s, 0.55, 5.95, W - 1.1, 1.0, SOFT[col], 0.12)
    wt = txt(s, 0.85, 5.98, W - 1.7, 0.94, why, 15, INK, anchor="m")
    tl.click("Reveal the answer: " + "ABCD"[right])
    tl.fade(*hits)
    tl.out(letter, dur=250)
    tl.then(); tl.fade(check, dur=300)
    tl.click("Explain why")
    tl.fade(wc, wt)
    finish(s, tl, "Warm-up question. Let students vote before you reveal the answer.", "Warm-up %d" % n)


def divider(prs):
    s = new_slide(prs, "Warm-up questions", dark=True, size=40)
    t = s.shapes.title
    t.left, t.top, t.width, t.height = E(1.0), E(2.6), E(9.5), E(1.3)
    sub = txt(s, 1.0, 4.0, 10.0, 1.0, "20 ACS-style multiple-choice questions.\nVote first, then click to reveal the answer and the reason.", 20, "C9D4E8", spacing=1.1)
    tl = Timeline(s)
    tl.click("Start the set")
    tl.fade(sub)
    finish(s, tl, "Same 20 questions as the back of the notes packet.", "Warm-ups")


def plan(prs):
    P = []
    add = lambda f, *a: P.append(lambda: f(prs, *a))
    for f in (title_slide, roadmap, vocab, leaving_groups, sn2_mech, sn2_kinetics, sn2_sterics, sn2_stereo, nuc_strength,
              e2_mech, anti_periplanar, zaitsev, e2_stereo, sn1_mech, energy, carbocation, rearrangement, racemization,
              reagent_classes, grid, worked, solvents, retro, summary, divider):
        add(f)
    for k, (stem, opts, right, why) in enumerate(questions.arranged()):
        add(mc_slide, k + 1, stem, opts, right, why)
    return P


def build(prs):
    for f in plan(prs):
        f()


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "Substitution and Elimination - SLIDES.pptx")
    prs = new_prs()
    build(prs)
    prs.save(out)
    print("saved", out, len(prs.slides), "slides")
