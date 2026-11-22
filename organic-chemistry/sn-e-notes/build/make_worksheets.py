"""Builds the five Substitution and Elimination worksheets (student copy and answer key for each).

    python3 make_worksheets.py

Focus: predicting products and choosing reagents, with mechanisms for the students to draw.  Every picture comes from
ws_figs.py and is checked by verify_structures.py (RDKit).  Output: ../worksheets/Worksheet N - <title> - STUDENT.docx and
... - ANSWER KEY.docx.
"""
import os, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "chemistry_notes", "Honors Chemistry", "_packet_builder"))
import lib
from lib import *
from make_notes import OrgPacket
import ws_figs

OUT = os.path.join(HERE, "..", "worksheets")
os.makedirs(OUT, exist_ok=True)
IMG = ws_figs.WS_IMG
FLOW = lib.FLOW


class WS(OrgPacket):
    def __init__(self, teacher, n, short):
        super().__init__(teacher)
        self.n, self.short = n, short

    # pictures are placed at their drawn size (pixels / 200 dpi), capped at the page width
    def size_of(self, name, maxw=6.6, scale=1.0):
        im = Image.open(os.path.join(IMG, name + ".png"))
        return min(im.width / 200.0 * scale, maxw)

    def wimg(self, name, maxw=6.6, scale=1.0, jc="left", keep=False):
        p, h = self.pic_par(os.path.join(IMG, name + ".png"), self.size_of(name, maxw, scale), jc, 40)
        FLOW.add(h + 0.1)
        self.emit(p.replace("<w:pPr>", "<w:pPr><w:keepNext/>", 1) if keep else p)

    def wimg2(self, n1, n2, w):
        r1, h = self.pic(os.path.join(IMG, n1 + ".png"), w)
        r2, _ = self.pic(os.path.join(IMG, n2 + ".png"), w)
        FLOW.add(h + 0.1)
        self.emit('<w:p><w:pPr><w:spacing w:before="0" w:after="40"/></w:pPr>%s<w:r><w:t xml:space="preserve">      </w:t></w:r>%s</w:p>' % (r1, r2))

    def ansimg(self, name, w_in, label="Answer:"):
        """Teacher edition only: a gray answer box holding a picture from img/ws."""
        if not self.T:
            return
        r, h = self.pic(os.path.join(IMG, name + ".png"), w_in)
        content = para(label, sz=19, b=True, color=GRAY_T, after=20) + \
            '<w:p><w:pPr><w:spacing w:before="0" w:after="20"/></w:pPr>%s</w:p>' % r
        FLOW.add(h + 0.35)
        self.emit(tbl([10080], [tr([tc(10080, content, fill="D9D9D9", mar=(70, 90, 50, 80))])]))
        self.emit(spacer())

    def wans(self, name, label="Answer:", maxw=6.6, scale=1.0, extra=None):
        """Teacher edition: a gray box holding the answer picture, then optional gray explanation lines."""
        if not self.T:
            return
        self.ansimg(name, self.size_of(name, maxw, scale), label)
        if extra:
            self.ansbox(0.3, ans=extra if isinstance(extra, list) else [extra])

    def banner(self, n, title, sub):
        tag = "WORKSHEET %d%s" % (n, "  •  ANSWER KEY" if self.T else "")
        b = ('<w:top w:val="single" w:sz="30" w:space="0" w:color="000000"/><w:left w:val="nil"/>'
             '<w:bottom w:val="single" w:sz="30" w:space="0" w:color="000000"/><w:right w:val="nil"/>')
        c = para("ORGANIC CHEMISTRY  •  CHAPTER 7  •  " + tag, sz=17, b=True, color=DARK, after=0) + \
            para(title, sz=34, b=True, color="000000", before=30, after=0) + para(sub, sz=19, color=INK, before=30, after=0)
        FLOW.add(0.95)
        self.emit(tbl([10080], [tr([tc(10080, c, fill="EDEDED", borders=b, mar=(60, 200, 60, 180))])]))
        self.emit(spacer(0.03))

    def space(self, h):
        """Blank room to draw (no border)."""
        FLOW.add(h)
        self.emit('<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="%d" w:lineRule="exact"/></w:pPr></w:p>' % int(h * 1440))

    def hint(self, text):
        FLOW.add(0.2)
        self.emit(para(text, sz=18, i=True, color="505050", before=20, after=0, keep=True))

    def why(self, text):
        if self.T and text:
            FLOW.add(0.3)
            self.emit(self.ans_para(text, 18))

    def instructions(self, text):
        self.note(text, 21)

    def save(self, path, title):
        sec = self.doc.sections[0]
        for r in sec.footer.paragraphs[0].runs:
            if r.text.startswith("Honors"):
                r.text = "Organic "
            elif "Unit 4" in r.text:
                r.text = "  Worksheet %d: " % self.n
            elif r.text.startswith("Reactions"):
                r.text = self.short + "  •"
        if self.T:
            for r in sec.footer.paragraphs[0].runs:
                if r.text.strip() == "page":
                    r.text = "  ANSWER KEY  •  page "
        for p in sec.header.paragraphs:
            for r in p.runs:
                if "Period" in r.text:
                    r.text = r.text.replace("   Period: ______", "")
        self.doc.core_properties.title = title
        self.doc.save(path)




def prob(P, key, hint=None, why=None):
    """A predict-the-products or choose-the-reagent problem.  Student: the reaction with room to answer on the same line.
    Answer key: the completed reaction and a one-line reason."""
    if hint:
        P.hint(hint)
    P.wimg(("a_" if P.T else "q_") + key)
    P.why(why)
    if not P.T:
        P.space(0.04)


def mech(P, key, h, hint=None, note=None):
    if hint:
        P.hint(hint)
    P.wimg("p_" + key, keep=not P.T)          # the prompt stays on the same page as the room to draw
    if P.T:
        P.ansimg("m_" + key, P.size_of("m_" + key, 6.8), "Mechanism:")
        P.why(note)
    else:
        P.space(h)


def text_q(P, num, text, answer, h=0.5, img=None, img_scale=1.0):
    P.q(num, text)
    if img:
        P.wimg(img, scale=img_scale)
    if P.T:
        P.emit(P.ans_para(answer, 18))
    else:
        P.space(h)


def finish(P, n, title):
    name = "Worksheet %d - %s - %s.docx" % (n, title, "ANSWER KEY" if P.T else "STUDENT")
    out = os.path.join(OUT, name)
    P.save(out, "Worksheet %d: %s" % (n, title))
    return out, FLOW


# ================================================================== worksheet 1: SN2
def ws1(T):
    FLOW.__init__()
    P = WS(T, 1, "SN2")
    P.banner(1, "SN2: Products, Reagents and Mechanisms", "Predict, choose, and draw.")
    c = ws_figs.COUNT["w1"]
    P.sub("Part A.  Predict the major product. Draw it to the right of the arrow, with stereochemistry where it matters.")
    prob(P, "w1a1", why="SN2: primary halide, strong nucleophile, polar aprotic solvent. Pentanenitrile.")
    prob(P, "w1a2", why="SN2: 1-methoxypropane. Methoxide is also a strong base, so a little E2 (propene) can form, but SN2 is major for a primary halide.")
    prob(P, "w1a3", "Show the stereochemistry.", "SN2 with inversion: the wedge Br becomes a dashed SH ((S)-2-bromopentane gives (R)-pentane-2-thiol; checked with RDKit).")
    prob(P, "w1a4", why="SN2 (Finkelstein reaction): iodide is an excellent nucleophile in acetone. 1-Iodobutane.")
    prob(P, "w1a5", why="SN2: thiolates are strong nucleophiles and weak bases. Ethyl methyl sulfide.")
    P.sub("Part B.  Write the reagent(s) and solvent on the arrow.")
    prob(P, "w1b1", why="NaSH in ethanol (or DMSO): HS⁻ is a strong nucleophile and a weak base, so a primary halide gives substitution only.")
    prob(P, "w1b2", "Methyl iodide is the electrophile. Give the nucleophile.",
         "(CH₃)₃CONa (or t-BuOK) in t-BuOH. SN2 needs the methyl electrophile; the other disconnection (CH₃O⁻ + t-BuBr) would give E2.")
    prob(P, "w1b3", why="NaI in acetone. SN2 with inversion: the wedge Cl becomes a dashed I.")
    prob(P, "w1b4", why="NaOCH₂CH₃ (sodium ethoxide) in ethanol: SN2 at a primary carbon (Williamson ether synthesis).")
    P.sub("Part C.  Draw the mechanism with curved arrows (show the back-side attack).")
    mech(P, "w1m1", 1.5)
    mech(P, "w1m2", 1.5, note="A secondary halide with a strong nucleophile that is a weak base (HS⁻): SN2, with inversion if the carbon were a stereocenter.")
    P.sub("Part D.  Short answer")
    text_q(P, c + 1, "Neopentyl bromide is a primary halide. What happens with NaCN in DMSO? Explain.",
           "Essentially no SN2 reaction: the three methyl groups on the β carbon block the back side, so the transition state is too high in energy.",
           0.5, img="w1d")
    text_q(P, c + 2, "Rank 1-bromobutane, 2-bromobutane and 2-bromo-2-methylpropane from fastest to slowest in SN2 with NaI in acetone. Explain.",
           "1-bromobutane (1°) > 2-bromobutane (2°) >> 2-bromo-2-methylpropane (3°, no SN2). Steric hindrance at the α carbon slows the back-side attack.", 0.5)
    return finish(P, 1, "SN2")


# ================================================================== worksheet 2: E2
def ws2(T):
    FLOW.__init__()
    P = WS(T, 2, "E2")
    P.banner(2, "E2: Products, Reagents and Mechanisms", "Zaitsev or Hofmann? Predict, choose the base, and draw.")
    c = ws_figs.COUNT["w2"]
    P.sub("Part A.  Draw all the E2 alkenes to the right of the arrow and circle the major one.")
    prob(P, "w2a1", "A small, strong base.", "Zaitsev (2-methyl-2-butene, trisubstituted) is major with a small base; the Hofmann alkene (3-methyl-1-butene) is minor.")
    prob(P, "w2a2", "Same substrate, now a bulky base.", "A bulky base removes the more accessible hydrogen (from the CH₃), so the Hofmann alkene, 3-methyl-1-butene, is major.")
    prob(P, "w2a3", why="E2: 2-methyl-2-pentene (Zaitsev, major) and 2-methyl-1-pentene (Hofmann, minor).")
    prob(P, "w2a4", why="E2: 1-methylcyclohexene (Zaitsev, major, trisubstituted) and methylenecyclohexane (Hofmann, minor).")
    P.sub("Part B.  Write the base and solvent on the arrow.")
    prob(P, "w2b1", "The less substituted alkene is the major product.", "t-BuOK in t-BuOH: a bulky base gives the Hofmann alkene.")
    prob(P, "w2b2", "The more substituted alkene is the major product.", "NaOEt in EtOH with heat: a small strong base gives the Zaitsev alkene.")
    prob(P, "w2b3", "Elimination, not substitution, from a primary halide.", "t-BuOK in t-BuOH: a strong, bulky base is a poor nucleophile, so E2 beats SN2.")
    prob(P, "w2b4", why="NaOEt in EtOH with heat (or another strong base such as NaOH, or DBU).")
    P.sub("Part C.  Draw the mechanism with curved arrows (the H and Br must be anti-periplanar).")
    mech(P, "w2m1", 1.1, "Zaitsev product.")
    mech(P, "w2m2", 1.1, "Hofmann product.", "The bulky t-BuO⁻ removes a hydrogen from the less hindered CH₃ group.")
    P.sub("Part D.  Geometry")
    P.q(c + 1, "2-Bromobutane + NaOEt. Draw the Newman projection (down C2–C3; C2 front: Br, CH₃, H; C3 back: CH₃, H, H) of the conformer that "
               "gives (a) trans-2-butene (left) and (b) cis-2-butene (right).")
    if T:
        P.wimg2("newman_trans", "newman_cis", 1.25)
        P.emit(P.ans_para("(a) The CH₃ groups are anti (180°), so they end up trans. (b) The CH₃ groups are gauche (60°), so they end up cis. In both, the H "
                          "on C3 that is anti to Br is removed; trans is favored because it is more stable.", 18))
    else:
        P.wimg2("newman_blank", "newman_blank", 1.25)
    text_q(P, c + 2, "Neopentyl bromide with NaOEt in EtOH: what happens? Explain.",
           "No E2: the β carbon is quaternary and has no hydrogen, and SN2 is too slow because of the three β methyl groups.", 0.3, img="w2d", img_scale=0.8)
    return finish(P, 2, "E2")


# ================================================================== worksheet 3: SN1 and E1
def ws3(T):
    FLOW.__init__()
    P = WS(T, 3, "SN1 and E1")
    P.banner(3, "SN1 and E1: Products, Conditions and Mechanisms", "Carbocations: predict every product, choose conditions, and draw.")
    c = ws_figs.COUNT["w3"]
    P.sub("Part A.  Draw all the products to the right of the arrow. Label each SN1 or E1 and circle the major product.")
    prob(P, "w3a1", why="SN1: 2-methoxy-2-methylpentane. E1: 2-methyl-2-pentene (Zaitsev, major) and 2-methyl-1-pentene (minor).")
    prob(P, "w3a2", "Include the ring.", "SN1: 1-ethoxy-1-methylcyclohexane. E1: 1-methylcyclohexene (Zaitsev, major) and methylenecyclohexane (minor).")
    prob(P, "w3a3", "Watch for a rearrangement.",
         "Ionization gives a secondary carbocation, which rearranges by a hydride shift to a tertiary carbocation. Products: 2-ethoxy-2-methylbutane (SN1), "
         "2-methyl-2-butene (E1, major) and 2-methyl-1-butene (E1, minor).")
    prob(P, "w3a4", "A single enantiomer: show the stereochemistry.",
         "SN1: the planar carbocation is attacked from either face, so the ether forms as a nearly racemic mixture of the two enantiomers.")
    P.sub("Part B.  Write the reagent or conditions on the arrow.")
    prob(P, "w3b1", "An SN1 pathway.", "CH₃OH (the solvent) with heat: solvolysis.")
    prob(P, "w3b2", why="Conc. H₂SO₄ with heat (E1; the Zaitsev alkene is major).")
    prob(P, "w3b3", "Only the alkene.", "NaOEt (a strong base) in EtOH: E2 is the only pathway for a tertiary halide with a strong base.")
    prob(P, "w3b4", why="HBr: protonation, loss of water to give the carbocation, then bromide attacks (SN1).")
    P.sub("Part C.  Draw the mechanism. Show every curved arrow and every charge.")
    mech(P, "w3m1", 2.1, "All three steps of the SN1 reaction.")
    mech(P, "w3m2", 2.1, "Include the rearrangement.",
         "The first carbocation is secondary; a 1,2-hydride shift gives the more stable tertiary carbocation; the solvent then removes a β proton (E1).")
    P.sub("Part D.  Short answer")
    text_q(P, c + 1, "Is the ionization step of an SN1 reaction faster in water or in acetone? Explain.",
           "Water (a polar protic solvent): it stabilizes the carbocation and the leaving group through hydrogen bonding and solvation, which lowers the energy of the slow step.", 0.5)
    return finish(P, 3, "SN1 and E1")


# ================================================================== worksheet 4: reagents
def ws4(T):
    FLOW.__init__()
    P = WS(T, 4, "Choosing Reagents")
    P.banner(4, "Choosing Reagents", "Write the reagent(s) and solvent on each arrow, and name the mechanism under it.")
    c = ws_figs.COUNT["w4"]
    P.sub("Part A.  Alkyl halides")
    prob(P, "w4t1", why="t-BuOK in t-BuOH (E2): a bulky strong base on a primary halide gives the alkene, not the substitution product.")
    prob(P, "w4t2", why="NaOCH₃ in CH₃OH (SN2): a strong nucleophile and a primary halide.")
    prob(P, "w4t3", why="NaOEt in EtOH with heat (E2, Zaitsev): a tertiary halide with a strong base.")
    prob(P, "w4t4", why="CH₃OH with heat (SN1, with some E1 alkene): a tertiary halide with a weak nucleophile and weak base.")
    P.sub("Part B.  Alcohols")
    prob(P, "w4t5", why="HBr (SN2): the primary alcohol is protonated, then bromide attacks from the back side.")
    prob(P, "w4t6", why="Conc. H₂SO₄ with heat (E1): dehydration of a tertiary alcohol; the Zaitsev alkene is major.")
    prob(P, "w4t7", why="HBr (SN1): protonation, loss of water to give the tertiary carbocation, then bromide attack.")
    prob(P, "w4t8", "Two steps. What happens to the stereochemistry?",
         "1) TsCl, pyridine converts OH to OTs with retention (the C–O bond is not broken); 2) NaBr is an SN2 reaction with inversion. Net result: inversion (wedge OH to dashed Br).")
    P.sub("Part C.  Draw the mechanism with curved arrows.")
    mech(P, "w4m1", 1.6, "Show the role of the acid.")
    mech(P, "w4m2", 2.3, "Why is this one SN1 while the one above is SN2?",
         "The tertiary substrate can form a stable carbocation (SN1); the primary alcohol cannot, so bromide attacks the carbon directly (SN2).")
    P.sub("Part D.  Short answer")
    text_q(P, c + 1, "Hydroxide is a poor leaving group. Name two ways to convert an alcohol’s OH into a group that can leave.",
           "Protonate it with a strong acid (HBr, H₂SO₄), so water leaves; or convert it into a tosylate with TsCl and pyridine, so TsO⁻ leaves.", 0.45)
    return finish(P, 4, "Choosing Reagents")


# ================================================================== worksheet 5: mixed
def ws5(T):
    FLOW.__init__()
    P = WS(T, 5, "Mixed Practice")
    P.banner(5, "Mixed Practice: Substitution or Elimination?", "Decide the mechanism(s), draw the products, choose reagents, and draw mechanisms.")
    c = ws_figs.COUNT["w5"]
    P.sub("Part A.  Write the mechanism(s) under the arrow and draw the major product(s) to the right.")
    prob(P, "w5a1", why="E2 is major (a secondary halide with a strong base and strong nucleophile); SN2 gives a little ether.")
    prob(P, "w5a2", why="SN2: primary halide, strong nucleophile that is a weak base, polar aprotic solvent.")
    prob(P, "w5a3", why="E2 (tertiary halide, strong base): the tetrasubstituted Zaitsev alkene is major, the Hofmann alkene is minor.")
    prob(P, "w5a4", why="SN1 and E1 (tertiary halide, weak base and weak nucleophile): the alcohol is major; the alkenes are E1 products, Zaitsev over Hofmann.")
    prob(P, "w5a5", why="E2: a secondary halide with a strong base gives the alkene.")
    prob(P, "w5a6", why="No reaction: a secondary halide with a weak base and weak nucleophile (water) cannot form a stable enough carbocation, and water is too weak for SN2.")
    prob(P, "w5a7", why="E2: t-BuOK is a strong, bulky base and a poor nucleophile, so the primary halide eliminates to propene.")
    P.sub("Part B.  Draw the mechanism with curved arrows.")
    mech(P, "w5m1", 1.5, "Your answer to problem 3.")
    mech(P, "w5m2", 1.2, "Your answer to problem 2.")
    P.sub("Part C.  Synthesis: write the reagents on the arrow.")
    prob(P, "w5c1", "Two steps (the OH is a poor leaving group).",
         "1) TsCl, pyridine (makes propyl tosylate); 2) NaOCH₂CH₃ in EtOH (SN2 on the primary tosylate). Alternatively PBr₃ or HBr, then NaOEt.")
    prob(P, "w5c2", "Two steps, to the Hofmann alkene.", "1) HBr (SN1) gives 2-bromo-2-methylbutane; 2) t-BuOK in t-BuOH (E2, bulky base) gives the less substituted alkene.")
    text_q(P, c + 1, "Isopropyl methyl ether can be made from CH₃O⁻ and 2-bromopropane, or from (CH₃)₂CHO⁻ and CH₃I. Which is better, and why does the other give a poor yield?",
           "Use (CH₃)₂CHO⁻ + CH₃I: SN2 works at a methyl electrophile. CH₃O⁻ with the secondary 2-bromopropane gives mostly E2 (propene), because methoxide is a strong base and the substrate is secondary.",
           0.45, img="w5c3")
    return finish(P, 5, "Mixed Practice")


if __name__ == "__main__":
    ws_figs.build_all()
    for f in (ws1, ws2, ws3, ws4, ws5):
        for T in (False, True):
            out, fl = f(T)
            print(os.path.basename(out), "est. pages:", fl.page)
