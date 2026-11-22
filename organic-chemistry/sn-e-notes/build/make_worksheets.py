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

    def wimg(self, name, maxw=6.6, scale=1.0, jc="left"):
        p, h = self.pic_par(os.path.join(IMG, name + ".png"), self.size_of(name, maxw, scale), jc, 40)
        FLOW.add(h + 0.1)
        self.emit(p.replace("<w:pPr>", "<w:pPr><w:keepNext/>", 1))

    def wimg2(self, n1, n2, w):
        r1, h = self.pic(os.path.join(IMG, n1 + ".png"), w)
        r2, _ = self.pic(os.path.join(IMG, n2 + ".png"), w)
        FLOW.add(h + 0.1)
        self.emit('<w:p><w:pPr><w:keepNext/><w:spacing w:before="0" w:after="40"/></w:pPr>%s<w:r><w:t xml:space="preserve">      </w:t></w:r>%s</w:p>' % (r1, r2))

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
        c = para("ORGANIC CHEMISTRY  •  CHAPTER 7  •  " + tag, sz=19, b=True, color=DARK, after=0) + \
            para(title, sz=40, b=True, color="000000", before=60, after=0) + para(sub, sz=21, color=INK, before=60, after=0)
        FLOW.add(1.2)
        self.emit(tbl([10080], [tr([tc(10080, c, fill="EDEDED", borders=b, mar=(100, 220, 100, 200))])]))
        self.emit(spacer())

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


class Counter:
    def __init__(self):
        self.k = 0

    def __call__(self):
        self.k += 1
        return self.k


def predict(P, num, text, key, why, h=0.9, w_ans=None):
    """A predict-the-products problem: the question picture, a box for the answer, and the key."""
    P.q(num, text)
    P.wimg("q_" + key)
    if not P.T:
        P.ansbox(h, "Product(s):")
    P.wans("a_" + key, "Answer:", extra=why)


def reagent(P, num, text, key, why, h=0.55):
    P.q(num, text)
    P.wimg("q_" + key)
    if not P.T:
        P.ansbox(h, "Reagent(s) and solvent:")
    P.wans("a_" + key, "Answer:", extra=why)


def mechanism(P, num, text, key, h, note=None):
    P.q(num, text)
    P.wimg("p_" + key)
    if not P.T:
        P.ansbox(h, "Draw the mechanism with curved arrows:")
    if P.T:
        P.ansimg("m_" + key, P.size_of("m_" + key, 6.8), "Mechanism:")
        if note:
            P.ansbox(0.3, ans=[note])


def finish(P, kind, n, title):
    name = "Worksheet %d - %s - %s.docx" % (n, title, "ANSWER KEY" if P.T else "STUDENT")
    out = os.path.join(OUT, name)
    P.save(out, "Worksheet %d: %s" % (n, title))
    return out, FLOW


# ================================================================== worksheet 1: SN2
def ws1(T):
    FLOW.__init__()
    P = WS(T, 1, "SN2")
    P.banner(1, "SN2: Products, Reagents and Mechanisms", "Predict the product, choose the reagents, and draw the curved arrows.")
    n = Counter()
    P.sub("Part A.  Predict the major product (show stereochemistry where it matters)")
    predict(P, n(), "Draw the product.", "w1a1", "SN2: a primary halide with a strong nucleophile in a polar aprotic solvent gives pentanenitrile.")
    predict(P, n(), "Draw the product. Is there a minor product?", "w1a2",
            "SN2: 1-methoxypropane. Methoxide is also a strong base, so a little E2 (propene) can form, but SN2 is major for a primary halide.")
    predict(P, n(), "Draw the product with its stereochemistry.", "w1a3",
            "SN2 with inversion: the wedge Br becomes a dashed SH ((S)-2-bromopentane gives (R)-pentane-2-thiol; checked with RDKit).")
    predict(P, n(), "Draw the product.", "w1a4", "SN2 (a Finkelstein reaction): iodide is an excellent nucleophile in acetone. 1-Iodobutane.", h=0.7)
    predict(P, n(), "Draw the product.", "w1a5", "SN2: thiolates are strong nucleophiles and weak bases. Ethyl methyl sulfide.", h=0.7)
    P.sub("Part B.  Choose the reagent and solvent for an SN2 reaction")
    reagent(P, n(), "Give the reagent and a suitable solvent.", "w1b1", "NaSH in ethanol (or DMSO): HS⁻ is a strong nucleophile and a weak base, so a primary halide gives substitution only.")
    reagent(P, n(), "Methyl iodide is the electrophile. Give the nucleophile (and solvent) that makes this ether.", "w1b2",
            "(CH₃)₃CONa (or t-BuOK) in t-BuOH. SN2 needs the methyl electrophile; the other disconnection (CH₃O⁻ + t-BuBr) would give E2.")
    reagent(P, n(), "Give the reagent and solvent. What happens to the stereocenter?", "w1b3",
            "NaI in acetone. SN2 with inversion at the stereocenter: the wedge Cl becomes a dashed I.")
    reagent(P, n(), "Give the reagent and solvent.", "w1b4", "NaOCH₂CH₃ (sodium ethoxide) in ethanol: SN2 at a primary carbon (Williamson ether synthesis).")
    P.sub("Part C.  Draw the mechanism")
    mechanism(P, n(), "Draw the SN2 mechanism for this reaction. Show the nucleophile attacking from the back side.", "w1m1", 1.9)
    mechanism(P, n(), "Draw the SN2 mechanism for this reaction.", "w1m2", 1.9,
              "A secondary halide with a strong nucleophile that is a weak base (HS⁻): SN2, with inversion if the carbon were a stereocenter.")
    P.sub("Part D.  Think about it")
    P.q(n(), "Neopentyl bromide is a primary alkyl halide. Predict what happens with NaCN in DMSO and explain your answer.")
    P.wimg("w1d")
    P.ansbox(0.9, "Prediction and explanation:", ans=["Essentially no SN2 reaction. The three methyl groups on the β carbon block the back side, "
                                                    "so the SN2 transition state is too high in energy."])
    P.q(n(), "Rank 1-bromobutane, 2-bromobutane and 2-bromo-2-methylpropane from fastest to slowest in an SN2 reaction with NaI in acetone. Explain.")
    P.ansbox(0.9, "Ranking and explanation:", ans=["1-bromobutane (1°) > 2-bromobutane (2°) >> 2-bromo-2-methylpropane (3°, no SN2). "
                                                  "Steric hindrance at the α carbon slows the back-side attack."])
    return finish(P, "", 1, "SN2")


# ================================================================== worksheet 2: E2
def ws2(T):
    FLOW.__init__()
    P = WS(T, 2, "E2")
    P.banner(2, "E2: Products, Reagents and Mechanisms", "Zaitsev or Hofmann? Choose the base, predict the alkene, and draw the curved arrows.")
    n = Counter()
    P.sub("Part A.  Predict the alkene(s): draw all E2 products and circle the major one")
    predict(P, n(), "A small, strong base.", "w2a1",
            "Zaitsev (2-methyl-2-butene, trisubstituted) is major with a small base; the Hofmann alkene (3-methyl-1-butene) is minor.")
    predict(P, n(), "Same substrate, now with a bulky base. How does the major product change?", "w2a2",
            "A bulky base removes the more accessible hydrogen (from the CH₃), so the Hofmann alkene 3-methyl-1-butene is major.")
    predict(P, n(), "A tertiary halide with a strong base.", "w2a3",
            "E2: 2-methyl-2-pentene (Zaitsev, major) and 2-methyl-1-pentene (Hofmann, minor).")
    predict(P, n(), "Draw both possible alkenes and say which is major.", "w2a4",
            "E2: 1-methylcyclohexene (Zaitsev, major, trisubstituted) and methylenecyclohexane (Hofmann, minor).")
    P.sub("Part B.  Choose the base and solvent")
    reagent(P, n(), "Choose a reagent to make the less substituted alkene as the major product.", "w2b1",
            "t-BuOK in t-BuOH: a bulky base gives the Hofmann alkene.")
    reagent(P, n(), "Choose a reagent to make the more substituted alkene as the major product.", "w2b2",
            "NaOEt in EtOH with heat: a small strong base gives the Zaitsev alkene.")
    reagent(P, n(), "Choose a reagent that gives elimination, not substitution, from this primary halide.", "w2b3",
            "t-BuOK in t-BuOH: a strong, bulky base is a poor nucleophile, so E2 beats SN2.")
    reagent(P, n(), "Give a reagent for this elimination.", "w2b4", "NaOEt in EtOH with heat (or another strong base such as NaOH, or DBU).")
    P.sub("Part C.  Draw the mechanism")
    mechanism(P, n(), "Draw the E2 mechanism for the Zaitsev product. Remember that the H and Br must be anti-periplanar.", "w2m1", 2.3)
    mechanism(P, n(), "Draw the E2 mechanism for the Hofmann product.", "w2m2", 2.4,
              "The bulky t-BuO⁻ removes a hydrogen from the less hindered CH₃ group.")
    P.sub("Part D.  Stereochemistry and geometry")
    P.q(n(), "2-Bromobutane reacts with NaOEt. Draw a Newman projection (looking down C2–C3) of the conformer in which an anti-periplanar "
             "H and Br allow E2 to give (a) trans-2-butene and (b) cis-2-butene. Front carbon: C2 (Br, CH₃, H). Back carbon: C3 (CH₃, H, H).")
    P.wimg2("newman_blank", "newman_blank", 1.9)
    P.ansbox(0.3, "(a) trans-2-butene                                                                  (b) cis-2-butene")
    if T:
        P.wimg2("newman_trans", "newman_cis", 1.9)
        P.ansbox(0.3, ans=["(a) The CH₃ groups are anti to each other (180°), so they end up trans. (b) The CH₃ groups are gauche (60°), so they "
                           "end up cis. In both, the H on C3 that is anti to Br is the one removed; trans is favored because it is more stable."])
    P.q(n(), "Predict what happens when neopentyl bromide reacts with NaOEt in EtOH, and explain.")
    P.wimg("w2d")
    P.ansbox(0.8, "Prediction and explanation:", ans=["No E2: the β carbon is quaternary and has no hydrogen, and SN2 is too slow because of the three β methyl groups."])
    return finish(P, "", 2, "E2")


# ================================================================== worksheet 3: SN1 and E1
def ws3(T):
    FLOW.__init__()
    P = WS(T, 3, "SN1 and E1")
    P.banner(3, "SN1 and E1: Products, Conditions and Mechanisms",
             "Carbocations: predict every product, choose the conditions, and draw the curved arrows.")
    n = Counter()
    P.sub("Part A.  Predict all the products. Label each SN1 or E1 and circle the major product.")
    predict(P, n(), "A tertiary halide in a solvent that is a weak nucleophile and weak base.", "w3a1",
            "SN1: 2-methoxy-2-methylpentane. E1: 2-methyl-2-pentene (Zaitsev, major) and 2-methyl-1-pentene (minor).", h=1.0)
    predict(P, n(), "Do not forget the ring.", "w3a2",
            "SN1: 1-ethoxy-1-methylcyclohexane. E1: 1-methylcyclohexene (Zaitsev, major) and methylenecyclohexane (minor).", h=1.0)
    predict(P, n(), "Watch for a rearrangement.", "w3a3",
            "Ionization gives a secondary carbocation, which rearranges by a hydride shift to a tertiary carbocation. Products: 2-ethoxy-2-methylbutane (SN1), "
            "2-methyl-2-butene (E1, major) and 2-methyl-1-butene (E1, minor). Little product keeps the original skeleton.", h=1.0)
    predict(P, n(), "The substrate is a single enantiomer. Draw the substitution product(s) and explain the stereochemistry.", "w3a4",
            "SN1: the planar carbocation is attacked from either face, so the ether forms as a nearly racemic mixture of the two enantiomers.", h=1.0)
    P.sub("Part B.  Choose the reagent or conditions")
    reagent(P, n(), "Give the reagent (and conditions) that makes this ether by an SN1 pathway.", "w3b1", "CH₃OH (the solvent) with heat: solvolysis.")
    reagent(P, n(), "Give a reagent for this elimination of a tertiary alcohol.", "w3b2", "Conc. H₂SO₄ with heat (E1; the Zaitsev alkene is major).")
    reagent(P, n(), "Give a reagent that gives only the alkene from this tertiary halide.", "w3b3",
            "NaOEt (a strong base) in EtOH: E2 is the only pathway for a tertiary halide with a strong base.")
    reagent(P, n(), "Give a reagent that converts this tertiary alcohol into the alkyl bromide.", "w3b4", "HBr: protonation, loss of water to give the carbocation, then bromide attacks (SN1).")
    P.sub("Part C.  Draw the mechanism")
    mechanism(P, n(), "Draw all three steps of this SN1 reaction. Show every curved arrow and every charge.", "w3m1", 4.0)
    mechanism(P, n(), "Draw the mechanism for the formation of 2-methyl-2-butene from this secondary halide. Include the rearrangement.", "w3m2", 4.0,
              "The first carbocation is secondary; a 1,2-hydride shift gives the more stable tertiary carbocation; the solvent then removes a β proton (E1).")
    P.sub("Part D.  Think about it")
    P.q(n(), "Would the ionization step of an SN1 reaction be faster in water or in acetone? Explain.")
    P.ansbox(0.8, "Answer:", ans=["Water (a polar protic solvent): it stabilizes the carbocation and the leaving group through hydrogen bonding and "
                                 "solvation, which lowers the energy of the slow step."])
    return finish(P, "", 3, "SN1 and E1")


# ================================================================== worksheet 4: reagents
def ws4(T):
    FLOW.__init__()
    P = WS(T, 4, "Choosing Reagents")
    P.banner(4, "Choosing Reagents", "For each transformation, give the reagent(s) and solvent, and name the mechanism.")
    n = Counter()
    P.instructions("The starting material and the product are drawn. Write the reagent(s) and solvent that carry out the change, and "
                   "name the mechanism (SN2, E2, SN1 or E1).")
    P.sub("Part A.  Alkyl halides")
    reagent(P, n(), "Reagent(s), solvent and mechanism.", "w4t1", "t-BuOK in t-BuOH (E2): a bulky strong base on a primary halide gives the alkene, not the substitution product.", h=0.6)
    reagent(P, n(), "Reagent(s), solvent and mechanism.", "w4t2", "NaOCH₃ in CH₃OH (SN2): a strong nucleophile and primary halide.", h=0.6)
    reagent(P, n(), "Reagent(s), solvent and mechanism.", "w4t3", "NaOEt in EtOH with heat (E2, Zaitsev): a tertiary halide with a strong base.", h=0.6)
    reagent(P, n(), "Reagent(s), solvent and mechanism.", "w4t4", "CH₃OH with heat (SN1, with some E1 alkene): a tertiary halide with a weak nucleophile and weak base.", h=0.6)
    P.sub("Part B.  Alcohols")
    reagent(P, n(), "Reagent(s), solvent and mechanism.", "w4t5", "HBr (SN2): the primary alcohol is protonated, then bromide attacks from the back side.", h=0.6)
    reagent(P, n(), "Reagent(s), solvent and mechanism.", "w4t6", "Conc. H₂SO₄ with heat (E1): dehydration of a tertiary alcohol; the Zaitsev alkene is major.", h=0.6)
    reagent(P, n(), "Reagent(s), solvent and mechanism.", "w4t7", "HBr (SN1): protonation, loss of water to give the tertiary carbocation, then bromide attack.", h=0.6)
    reagent(P, n(), "The configuration changes. Give a two-step reagent sequence and explain the stereochemistry.", "w4t8",
            "1) TsCl, pyridine converts OH to OTs with retention (the C–O bond is not broken); 2) NaBr is an SN2 reaction with inversion. "
            "Net result: inversion (wedge OH to dashed Br).", h=0.7)
    P.sub("Part C.  Draw the mechanism")
    mechanism(P, n(), "Draw the mechanism for this conversion. Show the role of the acid.", "w4m1", 3.8)
    mechanism(P, n(), "Draw the mechanism for this conversion. Why is this one SN1 and the previous one SN2?", "w4m2", 4.6,
              "The tertiary substrate can form a stable carbocation (SN1); the primary alcohol cannot, so bromide attacks the carbon directly (SN2).")
    P.sub("Part D.  Think about it")
    P.q(n(), "Hydroxide is a poor leaving group. Name two different ways to convert an alcohol’s OH into a group that can leave, and say "
             "what happens to the leaving group in each.")
    P.ansbox(0.9, "Answer:", ans=["Protonate it with a strong acid (HBr, H₂SO₄), so water leaves; or convert it into a tosylate with TsCl and pyridine, so TsO⁻ leaves."])
    return finish(P, "", 4, "Choosing Reagents")


# ================================================================== worksheet 5: mixed
def ws5(T):
    FLOW.__init__()
    P = WS(T, 5, "Mixed Practice")
    P.banner(5, "Mixed Practice: Substitution or Elimination?",
             "Decide the mechanism(s), predict the products, choose reagents, and draw the mechanisms.")
    n = Counter()
    P.sub("Part A.  Name the mechanism(s) and draw the major product(s)")
    predict(P, n(), "Mechanism(s) and products:", "w5a1", "E2 is major (a secondary halide with a strong base and strong nucleophile); SN2 gives a little ether.")
    predict(P, n(), "Mechanism(s) and product:", "w5a2", "SN2: primary halide, strong nucleophile that is a weak base, polar aprotic solvent.", h=0.7)
    predict(P, n(), "Mechanism(s) and products:", "w5a3", "E2 (tertiary halide, strong base): the tetrasubstituted Zaitsev alkene is major, the Hofmann alkene is minor.")
    predict(P, n(), "Mechanism(s) and products:", "w5a4",
            "SN1 and E1 (tertiary halide, weak base and weak nucleophile): the alcohol is major; the alkenes are E1 products, Zaitsev over Hofmann.", h=1.0)
    predict(P, n(), "Mechanism(s) and product:", "w5a5", "E2: a secondary halide with a strong base gives the alkene.", h=0.7)
    P.q(n(), "Mechanism(s) and product:")
    P.wimg("q_w5a6")
    P.ansbox(0.8, "Product(s):")
    P.wans("a_w5a6", "Answer:", extra="No reaction: a secondary halide with a weak base and weak nucleophile (water) cannot form a stable enough carbocation, and water is too weak for SN2.")
    predict(P, n(), "Mechanism(s) and product:", "w5a7", "E2: t-BuOK is a strong, bulky base and a poor nucleophile, so the primary halide eliminates to propene.", h=0.7)
    P.sub("Part B.  Draw the mechanism")
    mechanism(P, n(), "Draw the mechanism for your answer to problem 3 (the major product).", "w5m1", 2.4)
    mechanism(P, n(), "Draw the mechanism for your answer to problem 2.", "w5m2", 2.0)
    P.sub("Part C.  Synthesis")
    reagent(P, n(), "Give a two-step sequence for this conversion. (The OH is a poor leaving group.)", "w5c1",
            "1) TsCl, pyridine (makes propyl tosylate); 2) NaOCH₂CH₃ in EtOH (SN2 on the primary tosylate). Alternatively, PBr₃ or HBr, then NaOEt.", h=0.8)
    reagent(P, n(), "Give a two-step sequence for this conversion to the Hofmann alkene.", "w5c2",
            "1) HBr (SN1) gives 2-bromo-2-methylbutane; 2) t-BuOK in t-BuOH (E2, bulky base) gives the less substituted alkene.", h=0.8)
    P.q(n(), "Isopropyl methyl ether can be made from either of two combinations: CH₃O⁻ with 2-bromopropane, or (CH₃)₂CHO⁻ with CH₃I. "
             "Which is better? Why does the other route give a poor yield?")
    P.wimg("w5c3")
    P.ansbox(1.0, "Answer:", ans=["Use (CH₃)₂CHO⁻ + CH₃I: SN2 works at a methyl electrophile. CH₃O⁻ with the secondary 2-bromopropane gives mostly E2 "
                                 "(propene), because methoxide is a strong base and the substrate is secondary."])
    return finish(P, "", 5, "Mixed Practice")


if __name__ == "__main__":
    ws_figs.build_all()
    for f in (ws1, ws2, ws3, ws4, ws5):
        for T in (False, True):
            out, fl = f(T)
            print(os.path.basename(out), "est. pages:", fl.page)
