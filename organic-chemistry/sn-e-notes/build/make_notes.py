"""Builds the Substitution and Elimination guided notes (Klein, Organic Chemistry, Chapter 7): student packet and teacher edition.

    python3 make_notes.py

Order of the notes: the set-up, then SN2 and E2 (bimolecular), then SN1 and E1 (unimolecular), then choosing the mechanism,
solvents, alcohols and synthesis, then 20 multiple-choice questions.  Each reaction type has its own section.  The notes use
short paragraphs and fill-in sentences instead of tables.

Needs python-docx, Pillow, matplotlib.  Reuses the Packet class and XML helpers from the Honors Chemistry packet builder.
All structures are drawn by skel.py / mech.py / sne_figs.py (matplotlib) and checked by verify_structures.py (RDKit).
The practice problems are original; they mirror the textbook's SkillBuilders and ACS-style problems, which are cited by number.
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "chemistry_notes", "Honors Chemistry", "_packet_builder"))
import lib
from lib import *
from build_gases import Packet
import sne_figs as figs
import questions

OUT = os.path.join(HERE, "..")
IMG = figs.IMG
FLOW = lib.FLOW
PB = ('<w:p><w:pPr><w:pageBreakBefore/><w:spacing w:before="0" w:after="0" w:line="20" '
      'w:lineRule="exact"/></w:pPr></w:p>')
A = Ans
W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


class OrgPacket(Packet):
    # ------------------------------------------------------------ layout helpers
    def title2(self, tag, name, sub):
        c = para(tag, sz=22, b=True, color="000000", after=0)
        c += para(name, sz=64, b=True, color="000000", before=120, after=0, line=228)
        c += para(sub, sz=26, color=INK, before=160, after=0)
        b = ('<w:top w:val="single" w:sz="36" w:space="0" w:color="000000"/><w:left w:val="nil"/>'
             '<w:bottom w:val="single" w:sz="36" w:space="0" w:color="000000"/><w:right w:val="nil"/>')
        FLOW.add(1.55)
        self.emit(tbl([10080], [tr([tc(10080, c, fill="EDEDED", borders=b, mar=(200, 280, 200, 200), valign="center")], h=1.5)]))
        self.emit(spacer())

    def part(self, label, title, sub):
        """A heavy banner that starts a new part of the notes (on a new page)."""
        self.emit(PB)
        FLOW.hard_break()
        b = ('<w:top w:val="single" w:sz="36" w:space="0" w:color="000000"/><w:left w:val="nil"/>'
             '<w:bottom w:val="single" w:sz="36" w:space="0" w:color="000000"/><w:right w:val="nil"/>')
        c = para(label, sz=20, b=True, color=DARK, after=0) + para(title, sz=44, b=True, color="000000", after=0) + \
            para(sub, sz=22, color=INK, before=60, after=0)
        FLOW.add(1.3)
        self.emit(tbl([10080], [tr([tc(10080, c, fill="D9D9D9", borders=b, mar=(140, 240, 140, 200))])]))
        self.emit(spacer())

    def topic(self, *a, **k):
        super().topic(*a, **k)
        sp = self.sect.getprevious()                      # keep the banner with the block under it
        ppr = sp.find(W_NS + "pPr")
        if ppr is not None and ppr.find(W_NS + "keepNext") is None:
            ppr.insert(0, parse_xml('<w:keepNext %s/>' % NS))

    def table(self, *a, keep=True, **k):
        super().table(*a, **k)
        if not keep:
            return
        tbl_el = self.sect.getprevious().getprevious()
        for tr_ in tbl_el.findall(W_NS + "tr")[:-1]:
            for p_ in tr_.iter(W_NS + "p"):
                ppr = p_.find(W_NS + "pPr")
                if ppr is None:
                    ppr = parse_xml('<w:pPr %s/>' % NS)
                    p_.insert(0, ppr)
                if ppr.find(W_NS + "keepNext") is None:
                    ppr.insert(0, parse_xml('<w:keepNext %s/>' % NS))

    def drawbox(self, label, h, img=None, w_in=5.5, caption=None):
        """Blank room for students to draw; the teacher edition shows the drawn answer (a picture) in gray."""
        if self.T and img:
            self.ansimg(img, w_in, label)
            if caption:
                self.ansbox(0.3, ans=[caption])
        else:
            self.ansbox(h, label)

    def notebox(self, label, h, points):
        """Open note-taking space with a heading only; the teacher edition lists the key points in gray."""
        self.ansbox(h, label, ans=points)

    def img(self, name, w_in, jc="left", after=40):
        p, h = self.pic_par(os.path.join(IMG, name + ".png"), w_in, jc, after)
        FLOW.add(h + 0.1)
        self.emit(p)

    def ansimg(self, name, w_in, label="Answer:"):
        """Teacher edition only: a gray answer box holding a drawn structure."""
        if not self.T:
            return
        r, h = self.pic(os.path.join(IMG, name + ".png"), w_in)
        content = para(label, sz=19, b=True, color=GRAY_T, after=20) + \
            '<w:p><w:pPr><w:spacing w:before="0" w:after="20"/></w:pPr>%s</w:p>' % r
        FLOW.add(h + 0.35)
        self.emit(tbl([10080], [tr([tc(10080, content, fill="D9D9D9", mar=(70, 90, 50, 80))])]))
        self.emit(spacer())

    def mcq(self, n, stem, opts, right, why=""):
        assert len(set(opts)) == 4, (n, opts)
        longest = max(len(o) for o in opts)
        lines = ["ABCD"[i] + ")  " + o for i, o in enumerate(opts)]
        if longest <= 14:
            groups = ["        ".join(lines)]
        elif longest <= 38:
            groups = ["        ".join(lines[:2]), "        ".join(lines[2:])]
        else:
            groups = lines
        FLOW.add(0.3 + 0.2 * len(groups) + 0.2 * (len(stem) // 95) + (0.22 if self.T else 0))
        self.emit(('<w:p><w:pPr><w:keepNext/><w:spacing w:before="70" w:after="30" w:line="259" w:lineRule="auto"/>'
                   '<w:ind w:left="461" w:hanging="461"/></w:pPr>%s%s</w:p>') % (
            runs("%d.  " % n, 21, DARK, b=True), runs(stem, 21, INK)))
        for k, g in enumerate(groups):
            self.emit(para(g, sz=20, left=461, after=20, keep=(self.T or k < len(groups) - 1)))
        if self.T:
            self.emit(self.ans_para("Answer: %s%s" % ("ABCD"[right], (" — " + why) if why else ""), 19))

    def save(self, path, title):
        sec = self.doc.sections[0]
        for r in sec.footer.paragraphs[0].runs:
            if r.text.startswith("Honors"):
                r.text = "Organic "
            elif "Unit 4" in r.text:
                r.text = "  Chapter 7: "
            elif r.text.startswith("Reactions"):
                r.text = "Substitution and Elimination  •"
        if self.T:
            for r in sec.footer.paragraphs[0].runs:
                if r.text.strip() == "page":
                    r.text = "  TEACHER EDITION  •  page "
        for p in sec.header.paragraphs:
            for r in p.runs:
                if "Period" in r.text:
                    r.text = r.text.replace("   Period: ______", "")
        self.doc.core_properties.title = title
        self.doc.save(path)


def textbook(P, items):
    P.box("FROM YOUR TEXTBOOK  (Klein, Chapter 7)", items)


def build(T):
    FLOW.__init__()
    P = OrgPacket(T)

    # ================================================================ page 1
    P.title2("ORGANIC CHEMISTRY  •  CHAPTER 7", "Substitution and Elimination",
             "SN2, E2, SN1 and E1, one at a time, and then how to decide which one happens.")
    if not T:
        P.box("HOW TO USE THIS PACKET", [
            "These notes follow Klein, **Organic Chemistry**, Chapter 7. We take the reactions one at a time: first the two "
            "**bimolecular** reactions (SN2 and E2), then the two **unimolecular** reactions (SN1 and E1), and last how to choose "
            "between them. Every mechanism and energy diagram has a blank box: draw it yourself with the class, curved arrows included. After each reaction the "
            "**FROM YOUR TEXTBOOK** box lists the chapter problems to do next. Twenty ACS-style multiple-choice questions are at the back."])
    else:
        P.box("TEACHER EDITION", [
            "Gray boxes and lines are answers. TEACHER NOTE boxes hold timing ideas and choices I made. The answer boxes are larger "
            "than the student blanks, so this edition runs longer."], kind="teacher")
        P.box("TEACHER OVERVIEW", [
            "**Organization.** Each reaction type has its own section: SN2, E2, SN1, E1. Part 1 pairs the bimolecular reactions, "
            "Part 2 pairs the unimolecular reactions, and Part 3 puts them together (the textbook’s Section 7.9 method, solvents, "
            "alcohols and synthesis). There are no tables and no fill-in-the-blank sentences. Students draw every mechanism and energy diagram in blank boxes, and take notes in open note boxes that have a topic heading only; the gray text in those boxes is a key-points list for you.",
            "**The practice problems are original.** They mirror the book’s SkillBuilders and ACS-style problems, which are cited "
            "by number after each section, so you can assign the book’s own problems as homework. Tell me if you want specific book "
            "problems redrawn and keyed here.",
            "**Drawings.** Every structure and every mechanism picture is built from real molecules and checked with RDKit "
            "(build/verify_structures.py): valid valences and charges (a carbocation has three bonds), atoms and charge balanced across "
            "each arrow, and the R/S and E/Z labels of every stereo structure. The curved arrows themselves are placed by hand.",
            "**Conventions.** Reagent categories and which mechanisms operate follow the book’s Figures 7.17 and 7.18. Where two "
            "mechanisms compete the key lists the major one first. Idealized textbook conditions are used; real reactions give "
            "mixtures. Leaving-group pKa values are typical textbook values, not from the chapter.",
            "**Timing idea.** Day 1: set-up and SN2. Day 2: E2. Day 3: SN1. Day 4: E1 and choosing the mechanism. Day 5: solvents, "
            "alcohols, synthesis and the multiple-choice set."], kind="teacher")
    P.sub("How these notes are organized")
    for t in ["**Part 1: Bimolecular reactions.** SN2 (substitution) and E2 (elimination). One step each, and the rate depends on "
              "both the alkyl halide and the reagent.",
              "**Part 2: Unimolecular reactions.** SN1 and E1. Two steps each. A carbocation forms first, and only the alkyl halide "
              "is in the rate law.",
              "**Part 3: Choosing.** Reagent, substrate and solvent: which reaction wins? Then alcohols and a short look at synthesis."]:
        FLOW.add(0.45)
        P.emit(para("•  " + t, sz=21, after=50, left=360, hanging=300))
    P.sub("By the end of this chapter I can…")
    for t in [
        "Classify a substrate as 1°, 2° or 3°, and rank leaving groups, nucleophiles and bases.",
        "Draw each of the four mechanisms with curved arrows, and sketch its energy diagram.",
        "Predict products, including major and minor products, Zaitsev or Hofmann, inversion or racemization.",
        "Use the substrate, the reagent and the solvent to decide which mechanism(s) will operate.",
        "Plan a one-step synthesis of an ether or an alkene from a retrosynthetic analysis."]:
        FLOW.add(0.2)
        P.emit(para("•  " + t, sz=21, after=40, left=360, hanging=300))

    # ================================================================ 1  the set-up
    P.topic("1", "Alkyl Halides: The Set-Up", "Textbook 7.1–7.2  •  substrate, leaving group, nucleophile, base")
    P.box("BIG IDEA", [
        "In an alkyl halide the C–X bond is polar, so the **α carbon is δ+ (electrophilic)** and the halide can leave. "
        "A **nucleophile** can attack that carbon (**substitution**), or a **base** can remove a proton from a β carbon "
        "(**elimination**, which makes a C=C). The reagent’s job, nucleophile or base, tells you which."])
    P.notebox("Notes:  nucleophile and base  •  α and β carbons  •  1°, 2°, 3°  •  leaving groups and the pKa of the conjugate acid", 2.3, [
        "Nucleophile: electron-rich, attacks an electrophilic carbon. Base: removes a proton (H⁺).",
        "α carbon: bonded to the halogen. β carbons: attached to the α carbon.",
        "1° / 2° / 3°: one / two / three carbons on the α carbon.",
        "Good leaving group = weak base = conjugate base of a strong acid. Best to worst: I⁻ > Br⁻ > Cl⁻ > F⁻ (HI, HBr, HCl strong; HF much weaker). "
        "HO⁻ (conjugate acid H₂O, pKa about 16) is a poor leaving group, so an alcohol must be activated first (Section 8)."])
    P.q("P1", "Classify each substrate as 1°, 2° or 3°, and say how many β carbons it has:   (a) CH₃CH₂CH₂Br   (b) (CH₃)₂CHBr   (c) (CH₃)₃CBr")
    P.ansbox(0.7, ans=["(a) 1°; one β carbon (CH₂).   (b) 2°; two β carbons (both CH₃).   (c) 3°; three β carbons (three CH₃)."])
    textbook(P, ["Name and classify alkyl halides: Problem 7.1. Judging leaving groups with the pKa of the conjugate acid: Section 7.1."])

    # ================================================================ PART 1
    P.part("PART 1", "Bimolecular Reactions", "SN2 and E2: one step, and the rate depends on two species")

    # ================================================================ 2  SN2
    P.topic("2", "SN2", "Textbook 7.3–7.4  •  one step, backside attack, inversion")
    P.box("BIG IDEA", [
        "**SN2 = substitution, nucleophilic, bimolecular.** The nucleophile attacks the carbon from the **back side** while the "
        "leaving group leaves, all in one step. A stereocenter is turned inside out, like an umbrella in the wind: "
        "**inversion of configuration**."])
    P.drawbox("Mechanism: hydroxide with bromomethane. Draw the curved arrows and the products.", 2.3, "sn2_mech", 6.3)
    P.notebox("Notes:  rate law  •  backside attack and inversion  •  substrate effects  •  nucleophile strength", 2.8, [
        "rate = k[RX][Nu⁻]: bimolecular. Doubling one reactant doubles the rate; doubling both makes it four times faster.",
        "One step, no intermediate: bond making and bond breaking at the same time through one transition state.",
        "The nucleophile attacks from the back side, so a stereocenter is inverted.",
        "Steric hindrance on the α carbon: methyl > 1° > 2° >> 3°. Tertiary halides do not react by SN2. Neopentyl bromide (1°) is very slow "
        "because three methyl groups on the β carbon block the back side.",
        "Nucleophile strength: an anion is stronger than its neutral relative (HO⁻ is over a million times faster than H₂O with CH₃I). "
        "Larger atoms are more polarizable (HS⁻ > HO⁻; in a protic solvent I⁻ > Br⁻ > Cl⁻). Strong: HS⁻, RS⁻, I⁻, Br⁻, Cl⁻, HO⁻, RO⁻ (CN⁻ good). Weak: H₂O, ROH."])
    P.drawbox("Energy diagram for an SN2 reaction (label Ea and the transition state):", 2.0, "energy_one", 3.1)
    P.q("P1", "Why does a 2° substrate react more slowly than a methyl substrate in SN2? Use the words “transition state” and “Ea”.")
    P.ansbox(0.65, ans=["Three groups crowd the carbon in the 2° transition state, raising its energy and increasing Ea, so the rate is lower."])
    P.q("P2", "(Skill 7.1) Draw the product, showing the stereochemistry. Name it. ((S)-2-bromobutane is drawn.)")
    P.img("q_sn2_stereo", 4.6)
    P.ansbox(0.9, "Product:")
    P.ansimg("a_sn2_stereo", 4.8)
    if T:
        P.ansbox(0.3, ans=["(R)-2-methylbutanenitrile: inversion at the stereocenter. The wedge Br becomes a dashed CN. "
                           "(Checked with RDKit: Br and CN both rank first, so inversion changes S to R.)"])
    P.q("P3", "(Skill 7.2) Draw the transition state of the reaction of NaSH with chloromethane (CH₃Cl). Show the partial "
              "bonds, the δ– symbols and the ‡ symbol.")
    P.ansbox(1.2, "Transition state:")
    P.ansimg("sn2_ts", 3.0)
    P.q("P4", "Rank by SN2 rate with NaCN in DMSO (fastest first):  CH₃CH₂Br,  (CH₃)₃CBr,  CH₃Br,  (CH₃)₂CHBr")
    P.ansbox(0.45, ans=["CH₃Br > CH₃CH₂Br > (CH₃)₂CHBr > (CH₃)₃CBr (the tertiary halide does not react by SN2)"])
    textbook(P, ["SkillBuilder 7.1 (the product of an SN2 reaction): Problems 7.3, 7.4, 7.53, 7.54.   "
                 "SkillBuilder 7.2 (the transition state): Problems 7.5, 7.6, 7.50.",
                 "Kinetics and mechanism: 7.2, 7.8, 7.77.   ACS-style: 7.79, 7.82, 7.88."])

    # ================================================================ 3  E2
    P.topic("3", "E2", "Textbook 7.5–7.7  •  one step, strong base, anti-periplanar")
    P.box("BIG IDEA", [
        "**E2 = elimination, bimolecular.** A strong base removes a β hydrogen while the leaving group leaves from the α carbon, "
        "all in one step, and a **C=C** forms. The H and the leaving group must be **anti-periplanar** (180° apart)."])
    P.drawbox("Mechanism: hydroxide with 2-bromopropane. Draw the curved arrows and the products.", 2.4, "e2_mech", 6.3)
    P.notebox("Notes:  rate law  •  Zaitsev and Hofmann  •  alkene stability  •  stereoselective and stereospecific  •  cyclohexanes", 2.8, [
        "rate = k[RX][base]: bimolecular, one step. A strong base is required.",
        "The base removes a β hydrogen; the C–H electrons become the π bond; the C–X bond breaks.",
        "Zaitsev product: the more substituted (more stable) alkene, major with a small base such as NaOEt. "
        "Hofmann product: the less substituted alkene, major with a bulky base such as t-BuOK.",
        "Alkene stability: tetra > tri > di > mono; trans is more stable than cis (less steric strain).",
        "Two β hydrogens: cis and trans can both form, trans favored (stereoselective). One β hydrogen: only the anti H can leave, so the geometry "
        "is fixed by the substrate (stereospecific).",
        "In a cyclohexane chair the leaving group and the β hydrogen must both be axial (180° apart)."])
    P.drawbox("Newman projection (down the C2–C3 bond of 2-bromobutane) showing an anti-periplanar H and Br:", 2.2, "newman", 1.9)
    P.q("P1", "(Skill 7.3) Draw the Zaitsev and the Hofmann product of the reaction. Which is major with (a) NaOEt, (b) t-BuOK?")
    P.img("q_e2_a", 4.0)
    P.ansbox(0.9, "Products and major/minor:")
    P.ansimg("a_e2_a", 5.5, "(a) NaOEt, EtOH: Zaitsev major")
    P.ansimg("a_e2_b", 5.5, "(b) t-BuOK, t-BuOH: Hofmann major")
    P.q("P2", "(Skill 7.5) Draw all the E2 products from 2-bromopentane with NaOEt and label the major product. Why do the two "
              "2-pentene stereoisomers form in different amounts?")
    P.img("q_e2_c", 4.0)
    P.ansbox(0.9, "Products:")
    P.ansimg("a_e2_c", 6.4, "trans-2-pentene (major), cis-2-pentene, 1-pentene (minor)")
    if T:
        P.ansbox(0.3, ans=["C3 has two hydrogens, so both stereoisomers can form; the trans alkene is more stable (less crowded) "
                           "and is favored (stereoselective). 1-Pentene is the Hofmann product, minor with a small base."])
    P.q("P3", "A cyclohexyl chloride reacts by E2 only when the Cl and a β hydrogen are both axial. Explain, using the anti-periplanar "
              "requirement, why one chair conformer can react much faster than the other.")
    P.ansbox(0.7, ans=["Axial–axial positions on adjacent carbons are 180° apart (anti-periplanar). A conformer with Cl axial can "
                       "eliminate quickly; a conformer with Cl equatorial has no anti H and reacts very slowly. A large t-butyl group locks the "
                       "ring, so an isomer that must put Cl equatorial barely reacts (textbook Problem 7.74)."])
    textbook(P, ["SkillBuilder 7.3 (regiochemistry): Problems 7.12–7.14, 7.58, 7.59a,d, 7.62, 7.63b, 7.66, 7.86.   "
                 "SkillBuilder 7.4 (stereochemistry): Problems 7.15, 7.16, 7.60, 7.61, 7.73.   "
                 "SkillBuilder 7.5 (the products of E2): Problems 7.19, 7.20, 7.57–7.59, 7.62, 7.63.",
                 "ACS-style: 7.80, 7.86.   Alkene stability: 7.10 and the heats-of-combustion discussion in Section 7.6."])

    # ================================================================ PART 2
    P.part("PART 2", "Unimolecular Reactions", "SN1 and E1: two steps, a carbocation in between, and only the alkyl halide in the rate law")

    # ================================================================ 4  SN1
    P.topic("4", "SN1", "Textbook 7.8  •  ionization, carbocation, nucleophilic attack")
    P.box("BIG IDEA", [
        "**SN1 = substitution, nucleophilic, unimolecular.** In the slow step the alkyl halide ionizes: the leaving group takes both "
        "bonding electrons and leaves, which leaves a **carbocation** with only three bonds. Then a weak nucleophile (usually the "
        "solvent) attacks the carbocation. When the solvent is the nucleophile the reaction is called **solvolysis**."])
    P.drawbox("Mechanism: tert-butyl bromide in ethanol. Draw all three steps with the curved arrows.", 4.2, "sn1_mech", 5.9)
    P.notebox("Notes:  rate law  •  the carbocation  •  stereochemistry  •  rearrangements", 2.6, [
        "rate = k[RX]: unimolecular. The slow step is ionization, so the nucleophile is not in the rate law.",
        "A carbocation has three bonds, an empty p orbital and a + charge, and is planar. Stability: 3° > 2° > 1° > methyl; allylic and benzylic are "
        "also stable (resonance). So SN1 works for tertiary (allylic, benzylic) halides in polar protic solvents.",
        "The nucleophile can attack either face of the planar carbocation, so a stereocenter gives a nearly racemic mixture (slight excess of inversion from ion pairs).",
        "A hydride shift or methyl shift moves a neighboring H or CH₃ with its electron pair to give a more stable carbocation (secondary → tertiary). "
        "No rearrangement occurs in SN2 or E2 because there is no carbocation."])
    P.drawbox("Energy diagram for an SN1 reaction (label the intermediate and the slow step):", 2.0, "energy_two", 3.5)
    P.drawbox("A rearrangement: draw a 1,2-hydride shift in a secondary carbocation (curved arrow):", 1.6, "hydride_shift", 5.4)
    P.q("P1", "(Skill 7.6, solvolysis) Draw the SN1 product when tert-butyl bromide is heated in ethanol, and the carbocation intermediate.")
    P.img("q_sn1_a", 3.6)
    P.ansbox(0.8, "Carbocation and product:")
    P.ansimg("a_sn1_a", 4.4, "tert-butyl ethyl ether (the carbocation is (CH₃)₃C⁺, with three bonds)")
    P.q("P2", "(Stereochemistry) Predict the substitution product(s) from the drawn enantiomer in water. Explain the outcome.")
    P.img("q_sn1_c", 4.6)
    P.ansbox(0.7, "Product(s) and explanation:")
    P.ansimg("a_sn1_c", 4.8, "a nearly racemic mixture of the two alcohols (3-methylhexan-3-ol)")
    P.q("P3", "(Rearrangement) This secondary bromide ionizes in ethanol. Draw the carbocation it first forms, show with a curved arrow how it "
              "rearranges, and draw the new carbocation.")
    P.img("q_sn1_b", 3.8)
    P.ansbox(1.1, "Carbocation, curved arrow, new carbocation:")
    P.ansimg("methyl_shift", 5.4, "1,2-methyl shift: secondary → tertiary carbocation")
    textbook(P, ["SkillBuilder 7.6 (the carbocation intermediate): Problems 7.21, 7.22, 7.87, 7.94, 7.96, 7.102.",
                 "Solvolysis products: 7.26, 7.27.   Kinetics and energy diagram: 7.78.   ACS-style: 7.83, 7.84, 7.87."])

    # ================================================================ 5  E1
    P.topic("5", "E1", "Textbook 7.8  •  the same carbocation, but a base removes a β proton")
    P.box("BIG IDEA", [
        "**E1 = elimination, unimolecular.** E1 starts exactly like SN1: the leaving group leaves and a carbocation forms (slow step). "
        "Then a **weak base** (usually the solvent) removes a β proton, and the C–H electrons become the C=C π bond. "
        "SN1 and E1 almost always happen together."])
    P.drawbox("Mechanism: 2-bromo-2-methylbutane in ethanol. Draw both steps with the curved arrows.", 3.4, "e1_mech", 6.2)
    P.notebox("Notes:  rate law  •  how E1 relates to SN1  •  regiochemistry  •  dehydration of alcohols", 2.2, [
        "rate = k[RX]: unimolecular. The first step is the same as in SN1, so SN1 and E1 products form from the same carbocation.",
        "The base is weak (the solvent: H₂O or EtOH), unlike E2, which needs a strong base.",
        "The alkene is usually the more substituted one, the Zaitsev product.",
        "A tertiary alcohol heated with conc. H₂SO₄ loses water by E1: the OH is protonated, water leaves to give a carbocation, and a β proton is removed."])
    P.q("P1", "Draw all the products when 2-bromo-2-methylbutane is heated in ethanol. Label each SN1 or E1 and circle the major product.")
    P.img("q_e1_a", 4.0)
    P.ansbox(1.0, "Products:")
    P.ansimg("a_e1_a", 6.5, "SN1: 2-ethoxy-2-methylbutane.  E1: 2-methyl-2-butene (Zaitsev, major) and 2-methyl-1-butene (minor)")
    P.q("P2", "Draw the major product when this tertiary alcohol is heated with conc. H₂SO₄.")
    P.img("q_e1_b", 3.9)
    P.ansbox(0.8, "Major product:")
    P.ansimg("a_e1_b", 5.2, "2-methyl-2-butene (Zaitsev, major) and 2-methyl-1-butene (minor)")
    P.q("P3", "Draw all the products formed when the carbocation from the rearrangement problem in Section 4 is trapped by ethanol (SN1) "
              "or loses a β proton (E1). Which is major?")
    P.img("q_sn1_b", 3.8)
    P.ansbox(1.1, "Products:")
    P.ansimg("a_sn1_b", 6.5, "2-ethoxy-2,3-dimethylbutane (SN1), 2,3-dimethyl-2-butene (E1, major, tetrasubstituted) and 2,3-dimethyl-1-butene (E1, minor)")
    P.q("P4", "How can you tell E1 from E2 when you see an alkyl halide, a base and a solvent?")
    P.ansbox(0.6, ans=["E2: a strong base is the reagent (NaOEt, t-BuOK, …), one step, rate depends on the base. E1: a weak base or just the solvent "
                       "(EtOH, H₂O), a tertiary (or allylic or benzylic) substrate, a carbocation, and SN1 competes."])
    textbook(P, ["Solvolysis and the elimination products from a tertiary halide: Problems 7.26, 7.27.   "
                 "Dehydration of alcohols with conc. H₂SO₄: Section 7.10, Problems 7.32–7.34.   ACS-style: 7.83, 7.85."])

    # ================================================================ PART 3
    P.part("PART 3", "Putting It Together", "Choosing the mechanism, solvents, alcohols and a little synthesis")

    # ================================================================ 6  choosing
    P.topic("6", "Choosing the Mechanism", "Textbook 7.9  •  reagent, substrate, then the details")
    P.box("THE THREE-STEP METHOD", [
        "1.  **What does the reagent do?** Is it a strong or weak base, a strong or weak nucleophile?",
        "2.  **What is the substrate?** 1°, 2° or 3°? Which mechanism(s) can operate?",
        "3.  **Details:** Zaitsev or Hofmann? Inversion or racemization? Anti-periplanar?"])
    P.notebox("Notes:  the four reagent types (strong or weak base, strong or weak nucleophile)  •  what each substrate type does", 3.0, [
        "Strong base, weak nucleophile (DBU, DBN, t-BuOK): E2.",
        "Strong base, strong nucleophile (HO⁻, MeO⁻, EtO⁻): SN2 and E2 compete. Weak base, strong nucleophile (I⁻, Br⁻, Cl⁻, HS⁻, RS⁻, RSH): substitution only. "
        "Weak base, weak nucleophile (H₂O, MeOH, EtOH): unimolecular reactions only (SN1 and E1), so the substrate must be tertiary.",
        "If NaOEt is dissolved in EtOH, NaOEt is the reagent and EtOH is only the solvent.",
        "1°: SN2 with an unhindered nucleophile; E2 with a bulky base. 2°: E2 with a strong base, SN2 with a weak base and strong nucleophile. "
        "3°: never SN2; E2 with a strong base; SN1 with a weak base and strong nucleophile; SN1 and E1 with a weak base and weak nucleophile.",
        "1° or 2° with a weak base and weak nucleophile: no reaction (the carbocation is too unstable)."])
    P.sub("Apply it: name the mechanism(s) and the major product.")
    rx = [
        ("1-bromobutane + NaCN, DMSO", "SN2 → pentanenitrile"),
        ("2-bromobutane + NaOEt, EtOH", "E2 (SN2 minor) → trans-2-butene major; 1-butene and cis-2-butene minor"),
        ("2-bromo-2-methylbutane + t-BuOK", "E2 → 2-methyl-1-butene (Hofmann, hindered base)"),
        ("tert-butyl chloride + H₂O, heat", "SN1 and E1 → tert-butyl alcohol (major) and 2-methylpropene"),
        ("1-bromobutane + t-BuOK", "E2 → 1-butene"),
        ("2-bromopropane + NaSH", "SN2 → 2-propanethiol (propane-2-thiol)"),
        ("tert-butyl bromide + NaOH", "E2 → 2-methylpropene"),
        ("1-bromopropane + EtOH, heat", "no reaction (1° with a weak base and weak nucleophile)")]
    for k, (q_, a_) in enumerate(rx, 1):
        P.q("P%d" % k, q_)
        P.ansbox(0.38, ans=[a_])
    textbook(P, ["SkillBuilder 7.7 (predicting the products): Problems 7.28–7.31, 7.75, 7.76.   Other substrates: 7.32–7.34, 7.63.",
                 "ACS-style: 7.80, 7.85, 7.86, 7.91."])

    # ================================================================ 7  solvents
    P.topic("7", "Solvent Effects", "Textbook 7.12  •  protic and polar aprotic solvents")
    P.notebox("Notes:  protic and polar aprotic solvents (definitions and examples)  •  effect on nucleophiles  •  which mechanisms each favors", 2.3, [
        "Protic: an H bonded to O or N (H₂O, MeOH, EtOH, CH₃COOH). Polar aprotic: no O–H or N–H (DMSO, DMF, acetone, acetonitrile).",
        "A protic solvent hydrogen-bonds to anions and cages them, making a nucleophile less reactive; it stabilizes carbocations and leaving groups, "
        "so it favors SN1 and E1.",
        "A polar aprotic solvent solvates the cation but leaves the anion “naked” and much more reactive, so it speeds up SN2 by many orders of magnitude."])
    P.sub("Data from Table 7.5: SN2 of CH₃I with a halide ion (relative rates, Br⁻ in MeOH = 1)")
    P.note("I⁻:  43 in MeOH, 6,500 in DMF   (×150)          Br⁻:  1 in MeOH, 21,000 in DMF   (×21,000)\n"
           "Cl⁻:  0.04 in MeOH, 41,000 in DMF   (×1,030,000)          F⁻:  0.0006 in MeOH, 49,000 in DMF   (×82,000,000)", 20)
    P.q("P1", "Which halide is the best nucleophile in methanol? In DMF? Explain the reversal using hydrogen bonding.")
    P.ansbox(0.85, ans=["Methanol: I⁻ (best) to F⁻ (worst). DMF: F⁻ (best) to I⁻. In methanol the small F⁻ is strongly hydrogen-bonded "
                        "(caged), so it is a poor nucleophile; I⁻ is large and polarizable and only weakly solvated. In DMF there are no "
                        "hydrogen bonds to the anions, so the most basic, least stabilized anion (F⁻) is the most reactive."])
    textbook(P, ["Section 7.12 conceptual checkpoints: Problems 7.42–7.46."])

    # ================================================================ 8  alcohols and synthesis
    P.emit(PB)
    FLOW.hard_break()
    P.topic("8", "Alcohols and Synthesis", "Textbook 7.10–7.11  •  make OH leave, then plan a synthesis")
    P.notebox("Notes:  HBr  •  TsCl and pyridine  •  conc. H₂SO₄ and heat", 1.8, [
        "HBr: protonates the OH to give H₂O⁺, a good leaving group. 1° and 2° alcohols then react by SN2 (inversion); 3° alcohols by SN1.",
        "TsCl, pyridine: converts OH into an alkyl tosylate (OTs), an excellent leaving group. The C–O bond is not broken, so the configuration at carbon is retained.",
        "Conc. H₂SO₄, heat: dehydration. 3° alcohols by E1 (Section 5); 1° alcohols by E2."])
    P.box("RETROSYNTHESIS", [
        "A **retrosynthesis** starts at the target molecule and works backward: **disconnect** a bond that a known reaction can "
        "form, then choose the nucleophile and electrophile. Check the forward reaction with the mechanism rules: SN2 needs "
        "a methyl or 1° electrophile."])
    P.q("P1", "Show two possible SN2 disconnections for methyl tert-butyl ether, (CH₃)₃C–O–CH₃, and say which route will work. Why does the other fail?")
    P.img("t_mtbe", 2.1)
    P.ansbox(1.0, "Routes and verdict:", [
        "Route 1: CH₃O⁻ (nucleophile) + (CH₃)₃C–Br (3° electrophile): fails. The strong base gives E2, producing 2-methylpropene, not the ether.",
        "Route 2: (CH₃)₃C–O⁻ (nucleophile) + CH₃–I (methyl electrophile): works by SN2. **Route 2 is the correct synthesis.**"])
    textbook(P, ["SkillBuilder 7.8 (retrosynthesis and synthesis): Problems 7.35–7.37, 7.55, 7.89, 7.97–7.99.   "
                 "SkillBuilder 7.9 (an alkene target by elimination): Problems 7.38–7.41, 7.64, 7.90."])

    # ================================================================ multiple choice
    P.emit(PB)
    FLOW.hard_break()
    FLOW.mark("Multiple choice")
    b = ('<w:top w:val="single" w:sz="24" w:space="0" w:color="000000"/><w:left w:val="nil"/>'
         '<w:bottom w:val="single" w:sz="24" w:space="0" w:color="000000"/><w:right w:val="nil"/>')
    P.emit(tbl([10080], [tr([tc(10080, para("PRACTICE", sz=17, b=True, color=DARK, after=0) +
                                para("20 ACS-Style Multiple-Choice Questions", sz=34, b=True, color="000000", after=0) +
                                para("One correct answer and three distractors, in the style of textbook Problems 7.79–7.90 "
                                     "(those twelve problems make good extra practice).", sz=21, after=0),
                                fill="EDEDED", borders=b, mar=(100, 200, 100, 200))])]))
    P.emit(spacer())
    for k, (stem, opts, pos, why) in enumerate(questions.arranged()):
        P.mcq(k + 1, stem, opts, pos, why)
    if T:
        P.box("TEACHER NOTE", [
            "Stereochemistry checks (confirmed with RDKit): in #14 and #20 the substituent (CN, Br, OTs, OH) outranks the ethyl group in "
            "both reactant and product, so a spatial inversion changes the descriptor (S↔R). In #15 no descriptor of the product "
            "is required. Items 1, 2, 5, 9 and 19 echo the style of ACS-style problems 7.79, 7.82, 7.83, 7.87 and 7.89–7.90."],
            kind="teacher")

    out = os.path.join(OUT, "Substitution and Elimination - %s.docx" % ("TEACHER EDITION" if T else "STUDENT NOTES"))
    P.save(out, "Substitution and Elimination (Klein Ch. 7)")
    return out, FLOW


if __name__ == "__main__":
    figs.build_all()
    for T in (False, True):
        out, fl = build(T)
        print(out)
        print("  est. pages:", fl.page, "last page fill:", round(fl.cur, 1), "in")
        for m in fl.marks:
            print("   ", m)
