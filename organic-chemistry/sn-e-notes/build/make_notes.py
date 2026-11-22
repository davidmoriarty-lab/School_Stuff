"""Builds the Substitution and Elimination guided notes (Klein, Organic Chemistry, Chapter 7): student packet and teacher edition.

    python3 make_notes.py

Needs python-docx, Pillow, matplotlib.  Reuses the Packet class and XML helpers from the Honors Chemistry packet builder.
All structures are drawn by skel.py / figs.py (matplotlib, no RDKit); run sne_figs.py first (this script runs it).
The practice problems are original; they mirror the textbook's SkillBuilders and ACS-style problems, which are cited by number.
"""
import os, sys, random
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
A, H = Ans, Hint


class OrgPacket(Packet):
    def title2(self, tag, name, sub):
        c = para(tag, sz=22, b=True, color="000000", after=0)
        c += para(name, sz=64, b=True, color="000000", before=120, after=0, line=228)
        c += para(sub, sz=26, color=INK, before=160, after=0)
        b = ('<w:top w:val="single" w:sz="36" w:space="0" w:color="000000"/><w:left w:val="nil"/>'
             '<w:bottom w:val="single" w:sz="36" w:space="0" w:color="000000"/><w:right w:val="nil"/>')
        FLOW.add(1.55)
        self.emit(tbl([10080], [tr([tc(10080, c, fill="EDEDED", borders=b, mar=(200, 280, 200, 200), valign="center")], h=1.5)]))
        self.emit(spacer())

    def table(self, *a, keep=True, **k):
        """As Packet.table, but the rows are kept together on one page (keepNext on every row except the last)."""
        super().table(*a, **k)
        if not keep:
            return
        tbl_el = self.sect.getprevious().getprevious()
        W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
        rows_ = tbl_el.findall(W + "tr")
        for tr_ in rows_[:-1]:
            for p_ in tr_.iter(W + "p"):
                ppr = p_.find(W + "pPr")
                if ppr is None:
                    ppr = parse_xml('<w:pPr %s/>' % NS)
                    p_.insert(0, ppr)
                if ppr.find(W + "keepNext") is None:
                    ppr.insert(0, parse_xml('<w:keepNext %s/>' % NS))

    def topic(self, *a, **k):
        super().topic(*a, **k)
        W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
        sp = self.sect.getprevious()                      # the spacer under the banner: keep it with the next block
        ppr = sp.find(W + "pPr")
        if ppr is not None and ppr.find(W + "keepNext") is None:
            ppr.insert(0, parse_xml('<w:keepNext %s/>' % NS))

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
    """A short 'from your textbook' box that cites problems by number (the problems themselves are in the chapter)."""
    P.box("FROM YOUR TEXTBOOK  (Klein, Chapter 7)", items)


def build(T):
    FLOW.__init__()
    P = OrgPacket(T)

    # ================================================================ page 1
    P.title2("ORGANIC CHEMISTRY  •  CHAPTER 7", "Substitution and Elimination",
             "SN2, E2, SN1 and E1: what each one looks like, and how to decide which one happens.")
    if not T:
        P.box("HOW TO USE THIS PACKET", [
            "These notes follow Klein, **Organic Chemistry**, Chapter 7 (Alkyl Halides: Nucleophilic Substitution and "
            "Elimination Reactions). Fill in the blanks and tables as we go and draw every structure and curved arrow "
            "yourself. The practice problems here are warm-ups; the **FROM YOUR TEXTBOOK** boxes tell you which chapter "
            "problems to do next. Twenty ACS-style multiple-choice questions are at the back."])
    else:
        P.box("TEACHER EDITION", [
            "Gray boxes, cells and lines are answers. TEACHER NOTE boxes hold timing ideas, common mistakes and choices I made. "
            "The answer boxes are larger than the student's blanks, so this edition runs longer."], kind="teacher")
        P.box("TEACHER OVERVIEW", [
            "**Alignment.** The sections and skills follow the chapter's own order: 7.1–7.2 alkyl halides and leaving groups; "
            "7.3–7.4 SN2 and nucleophiles; 7.5–7.7 E2; 7.8 SN1 and E1; 7.9–7.10 predicting products with Figures 7.17 and 7.18; "
            "7.11 synthesis; 7.12 solvents. Each topic ends with the SkillBuilder problem numbers to assign.",
            "**The practice problems are original.** I did not copy the book's problems. Each item mirrors a book problem type, "
            "so it is safe to assign the cited chapter problems as homework and use these in class. Tell me if you want specific "
            "book problems (for example 7.57–7.63) redrawn and keyed here.",
            "**Conventions.** The classification of reagents and the 3 x 4 mechanism grid are the book’s Figures 7.17 and 7.18. "
            "Where the figure shows two mechanisms (for example a 1° substrate with a strong base and strong nucleophile) the key "
            "lists the major one first. Idealized textbook conditions are used; real reactions can give mixtures. Leaving-group "
            "pKa values in 7.1 are typical textbook values, not taken from the chapter.",
            "**Drawing.** Structures were drawn with matplotlib from coordinates, with wedges and dashes for stereochemistry. Every drawn "
            "structure was checked with RDKit (build/verify_structures.py): connectivity, R/S and E/Z labels, and names all match the key.",
            "**Timing idea.** Day 1: 7.1–7.2. Day 2: 7.3 and the E2 stereochemistry. Day 3: 7.4. Day 4: 7.5–7.6 with the grid and "
            "the eight-reaction table. Day 5: synthesis and the multiple-choice set."], kind="teacher")

    P.sub("What we will learn")
    P.table([1000, 5000, 4080], ["", "Topic", "Textbook section"], [
        ["7.1", "Alkyl halides and leaving groups", "7.1, 7.2"],
        ["7.2", "SN2: mechanism, kinetics, stereochemistry, nucleophiles", "7.3, 7.4"],
        ["7.3", "E2: mechanism, Zaitsev and Hofmann, stereochemistry", "7.5, 7.6, 7.7"],
        ["7.4", "SN1 and E1: carbocations, rearrangements, racemization", "7.8"],
        ["7.5", "Predicting products: the three-step method and the grid", "7.9, 7.10"],
        ["7.6", "Solvent effects", "7.12"],
        ["7.7", "Synthesis strategies (retrosynthesis)", "7.11"]], 0.27)
    P.sub("By the end of this chapter I can…")
    for t in [
        "Classify a substrate as 1°, 2° or 3°, and rank leaving groups, nucleophiles and bases.",
        "Draw the SN2, E2, SN1 and E1 mechanisms with curved arrows, the transition states and the energy diagrams.",
        "Predict the products of a reaction, including major and minor, regiochemistry (Zaitsev or Hofmann) and stereochemistry.",
        "Use the substrate, the reagent and the solvent to decide which mechanism(s) will operate.",
        "Plan a one-step synthesis of an ether or an alkene from a retrosynthetic analysis."]:
        FLOW.add(0.2)
        P.emit(para("•  " + t, sz=21, after=40, left=360, hanging=300))

    # ================================================================ 7.1
    P.topic("7.1", "Alkyl Halides and Leaving Groups", "Textbook 7.1–7.2  •  substitution or elimination?")
    P.box("BIG IDEA", [
        "In an alkyl halide the C–X bond is polar, so the **α carbon is δ+ (electrophilic)** and the halide can leave. "
        "A **nucleophile** can attack that carbon (**substitution**), or a **base** can remove a proton from a β carbon "
        "(**elimination**, which makes a C=C). The reagent’s job, nucleophile or base, tells you which."])
    P.table([2300, 4500, 3280], ["Term", "Definition (your words)", "Example"], [
        ["Nucleophile", [H("What does it attack, and what does it form?"),
                         A("An electron-rich species that attacks an electrophilic carbon and forms a new bond to it.")],
         A("HO⁻, HS⁻, CN⁻, I⁻, H₂O")],
        ["Base", [H("What does it remove?"), A("A species that removes a proton (H⁺).")], A("t-BuOK, NaOEt, DBU")],
        ["Leaving group", [H("What kind of anion leaves easily?"),
                           A("The group that departs with the electron pair; good ones are weak bases (conjugate bases of strong acids).")],
         A("I⁻, Br⁻, Cl⁻, TsO⁻")],
        ["α and β positions", [H("Which carbon is which?"),
                               A("α is the carbon bonded to the halogen; β carbons are the ones attached to the α carbon.")],
         A("In CH₃CH₂Br: CH₂ is α, CH₃ is β")]], [0.85, 0.7, 0.85, 0.85], term_col=True)
    P.sub("Leaving groups: the better the leaving group, the weaker the base")
    P.table([1800, 3000, 2600, 2680], ["Leaving group", "Conjugate acid (typical pKa)", "Strong or weak base?", "Quality"], [
        ["I⁻", ["HI,  about −10", A("")], [A("very weak base")], [A("excellent")]],
        ["Br⁻", ["HBr,  about −9", A("")], [A("very weak base")], [A("excellent")]],
        ["Cl⁻", ["HCl,  about −7", A("")], [A("very weak base")], [A("good")]],
        ["TsO⁻ (tosylate)", ["TsOH,  about −3", A("")], [A("very weak base")], [A("excellent")]],
        ["F⁻", ["HF,  about 3", A("")], [A("fairly strong base")], [A("poor")]],
        ["HO⁻", ["H₂O,  about 16", A("")], [A("strong base")], [A("terrible; must be turned into H₂O first")]]],
        [0.3] * 6, first_bold=True)
    P.q(1, "Classify each substrate as primary (1°), secondary (2°) or tertiary (3°) and name the α carbon’s neighbors "
           "(β positions) that carry hydrogens:  (a) CH₃CH₂CH₂Br   (b) (CH₃)₂CHBr   (c) (CH₃)₃CBr")
    P.ansbox(0.75, ans=["(a) 1°: α carbon has 1 carbon attached; one β carbon (CH₂) with 2 H.   "
                        "(b) 2°: two carbons attached; two β carbons (both CH₃, 3 H each).   "
                        "(c) 3°: three carbons attached; three β carbons (3 CH₃, 9 H in all)."])
    P.sub("Summary table: complete one column at a time as we study each mechanism")
    P.table([1500, 2145, 2145, 2145, 2145], ["", "SN2", "E2", "SN1", "E1"], [
        ["Number of steps", [A("1 (concerted)")], [A("1 (concerted)")], [A("2 (carbocation intermediate)")], [A("2 (carbocation intermediate)")]],
        ["Rate law", [A("k[RX][Nu⁻]")], [A("k[RX][base]")], [A("k[RX]")], [A("k[RX]")]],
        ["Substrate", [A("methyl > 1° > 2°; never 3°")], [A("3° > 2° > 1° (all can)")], [A("3° (also allylic, benzylic)")], [A("3° (also allylic, benzylic)")]],
        ["Reagent", [A("strong nucleophile")], [A("strong base")], [A("weak nucleophile (solvent)")], [A("weak base (solvent)")]],
        ["Solvent", [A("polar aprotic best")], [A("any; often the conjugate acid of the base")], [A("polar protic")], [A("polar protic")]],
        ["Stereochemistry", [A("inversion at α carbon")], [A("anti-periplanar; Zaitsev / Hofmann")], [A("racemization at α carbon")], [A("Zaitsev product")]]],
        [0.55, 0.55, 0.65, 0.55, 0.55, 0.55], first_bold=True, sz=18)
    textbook(P, ["Name and classify alkyl halides: Problem 7.1. Predict whether a halide is a good leaving group using the pKa of "
                 "its conjugate acid (Section 7.1)."])

    # ================================================================ 7.2
    P.topic("7.2", "SN2", "Textbook 7.3–7.4  •  one step, backside attack, inversion")
    P.box("BIG IDEA", [
        "**SN2 = substitution, nucleophilic, bimolecular.** The nucleophile attacks the carbon from the **back side** while the "
        "leaving group leaves, all in one step. The carbon is turned inside out, like an umbrella in the wind: "
        "**inversion of configuration**."])
    P.img("sn2_mech", 6.3, "center")
    P.sub("Complete the statements")
    P.table([504, 9576], ["", "Statement"], [
        ["1.", ["The rate law is rate = ______________________, so doubling either the substrate or the nucleophile ______________.",
                A("k[RX][Nu⁻]; doubles the rate (doubling both makes it four times faster)")]],
        ["2.", ["Nucleophilic attack must come from the ____________ of the carbon, opposite the leaving group, so a "
                "stereocenter shows ______________ of configuration.",
                A("back side; inversion")]],
        ["3.", ["Steric hindrance slows the reaction, so the order of SN2 reactivity is  ______ > ______ > ______ >> ______ "
                "(methyl, 1°, 2°, 3°).", A("methyl > 1° > 2° >> 3° (3° does not react by SN2)")]],
        ["4.", ["A primary halide with three substituents on the β carbon (neopentyl bromide) is very ______ in SN2 because ______.",
                A("slow; the three β substituents block the back side and raise the energy of the transition state")]]],
        [0.8, 0.8, 0.8, 0.8], first_bold=True)
    P.sub("Nucleophile strength (Section 7.4): what makes a nucleophile strong?")
    P.table([2500, 7580], ["Factor", "Trend and an example (your words)"], [
        ["Charge", [H("Compare HO⁻ and H₂O."), A("An anion is a stronger nucleophile than its neutral relative: HO⁻ is over a million times more reactive than H₂O toward CH₃I.")]],
        ["Polarizability", [H("Compare S and O, and I⁻ and Cl⁻ in a protic solvent."),
                            A("Larger atoms with electrons far from the nucleus are more polarizable and more nucleophilic: HS⁻ > HO⁻ and I⁻ > Br⁻ > Cl⁻ (protic solvent).")]],
        ["Strong nucleophiles", [H("List five."), A("HS⁻, RS⁻, I⁻, Br⁻, Cl⁻, HO⁻, RO⁻ (CN⁻ is also good)")]],
        ["Weak nucleophiles", [H("List two."), A("H₂O, ROH (neutral molecules)")]]], [0.75, 0.75, 0.55, 0.45], term_col=True)
    P.img("energy_one", 3.0, "center")
    P.q(1, "(Energy diagram) Why does a 2° substrate react more slowly than a methyl substrate in SN2? Use the words "
           "“transition state” and “Ea”.")
    P.ansbox(0.7, ans=["Three bulky groups crowd the carbon in the 2° transition state, raising its energy and increasing Ea, so the rate is lower."])
    P.q(2, "(Skill 7.1) Draw the product, showing the stereochemistry, for the reaction below. Then name the product "
           "((S)-2-bromobutane is drawn).")
    P.img("q_sn2_stereo", 4.6)
    P.ansbox(0.9, "Product:")
    P.ansimg("a_sn2_stereo", 4.8)
    if T:
        P.ansbox(0.3, ans=["(R)-2-methylbutanenitrile: inversion at the stereocenter. The wedge Br becomes a dashed CN. "
                           "(Checked by hand: Br and CN both rank first, so inversion changes S to R.)"])
    P.q(3, "(Skill 7.2) Draw the transition state of the reaction of NaSH with chloromethane (CH₃Cl). Show the partial "
           "bonds, the δ– symbols and the ‡ symbol.")
    P.ansbox(1.2, "Transition state:")
    P.ansimg("sn2_ts", 3.0)
    P.q(4, "Rank by SN2 rate with NaCN in DMSO (fastest first):  CH₃CH₂Br,  (CH₃)₃CBr,  CH₃Br,  (CH₃)₂CHBr")
    P.ansbox(0.45, ans=["CH₃Br > CH₃CH₂Br > (CH₃)₂CHBr > (CH₃)₃CBr (the tertiary halide does not react by SN2)"])
    textbook(P, ["SkillBuilder 7.1 (drawing the product of SN2): Problems 7.3, 7.4, 7.53, 7.54.   "
                 "SkillBuilder 7.2 (transition state): Problems 7.5, 7.6, 7.50.",
                 "Kinetics and mechanism: 7.2, 7.8, 7.77 (SN2 with cyanide: mechanism, rate law, energy diagram).   "
                 "ACS-style: 7.79, 7.82, 7.88."])

    # ================================================================ 7.3
    P.topic("7.3", "E2", "Textbook 7.5–7.7  •  one step, strong base, anti-periplanar")
    P.box("BIG IDEA", [
        "**E2 = elimination, bimolecular.** A strong base removes a β hydrogen while the leaving group leaves from the α carbon, "
        "all in one step, and a **C=C** forms. The H and the leaving group must be **anti-periplanar** (180° apart)."])
    P.img("e2_mech", 6.2, "center")
    P.table([2500, 7580], ["Idea", "What to know (your words)"], [
        ["Rate law", [H("Which species are in the rate law?"), A("rate = k[RX][base]: second order, bimolecular.")]],
        ["Zaitsev product", [H("Which alkene is major with a small base such as NaOEt?"),
                             A("The more substituted (more stable) alkene.")]],
        ["Hofmann product", [H("When does the less substituted alkene win?"),
                             A("With a sterically hindered base (t-BuOK, DBU) the base takes the more accessible H, giving the less substituted alkene as the major product.")]],
        ["Alkene stability", [H("Rank mono-, di-, tri-, tetrasubstituted, and cis vs trans."),
                              A("tetra > tri > di > mono; trans is more stable than cis (less steric strain).")]],
        ["Stereoselective", [H("When there are two β hydrogens."), A("Both trans and cis can form; the trans alkene is favored.")]],
        ["Stereospecific", [H("When there is only one β hydrogen."),
                            A("Only the anti H can leave, so the alkene geometry is determined by the substrate’s configuration.")]]],
        [0.55, 0.65, 0.75, 0.65, 0.55, 0.65], term_col=True)
    P.img("newman", 1.9, "center")
    P.q(1, "(Skill 7.3) Draw the Zaitsev and the Hofmann product of the reaction. Which one is major with (a) NaOEt, (b) t-BuOK?")
    P.img("q_e2_a", 4.0)
    P.ansbox(0.9, "Products and major/minor:")
    P.ansimg("a_e2_a", 5.5, "(a) NaOEt, EtOH: Zaitsev major")
    P.ansimg("a_e2_b", 5.5, "(b) t-BuOK, t-BuOH: Hofmann major")
    P.q(2, "(Skill 7.5) Draw all the E2 products from 2-bromopentane with NaOEt and label the major product. Explain why "
           "the two 2-pentene stereoisomers form in different amounts.")
    P.img("q_e2_c", 4.0)
    P.ansbox(0.9, "Products:")
    P.ansimg("a_e2_c", 6.4, "trans-2-pentene (major), cis-2-pentene, 1-pentene (minor)")
    if T:
        P.ansbox(0.3, ans=["The β carbon C3 has two hydrogens, so both stereoisomers can form; the trans alkene is more stable "
                           "(less crowded), so it is favored (stereoselective). 1-Pentene is the Hofmann product (minor with NaOEt)."])
    P.q(3, "A cyclohexyl chloride reacts by E2 only when the Cl and a β hydrogen are both axial. Explain, using the "
           "anti-periplanar requirement, why one chair conformer of a substituted chlorocyclohexane can react much faster than the other.")
    P.ansbox(0.75, ans=["Axial–axial positions on adjacent carbons are 180° apart (anti-periplanar). A conformer that places Cl axial "
                        "can eliminate quickly; a conformer with Cl equatorial has no anti H, so it reacts very slowly. A large "
                        "t-butyl group locks the ring so that one isomer cannot place Cl axial (textbook Problem 7.74)."])
    textbook(P, ["SkillBuilder 7.3 (regiochemistry): Problems 7.12–7.14, 7.58, 7.59a,d, 7.62, 7.63b, 7.66, 7.86.   "
                 "SkillBuilder 7.4 (stereochemistry): Problems 7.15, 7.16, 7.60, 7.61, 7.73.   "
                 "SkillBuilder 7.5 (E2 products): Problems 7.19, 7.20, 7.57–7.59, 7.62, 7.63.",
                 "ACS-style: 7.80, 7.86.   Alkene stability: 7.10 and the heats-of-combustion discussion in 7.6."])

    # ================================================================ 7.4
    P.topic("7.4", "SN1 and E1", "Textbook 7.8  •  two steps, carbocation intermediate")
    P.box("BIG IDEA", [
        "**SN1 and E1 start the same way:** a tertiary (or allylic or benzylic) alkyl halide ionizes to a **carbocation** "
        "in the slow step. Then a weak nucleophile attacks it (SN1) or a weak base removes a β proton (E1). "
        "When the solvent is the nucleophile the process is called **solvolysis**."])
    P.img("sn1_mech", 5.9, "center")
    P.img("energy_two", 3.4, "center")
    P.table([2500, 7580], ["Idea", "What to know (your words)"], [
        ["Rate law", [H("Is the nucleophile in it?"), A("rate = k[RX]: first order. The slow step is ionization, so the nucleophile does not appear.")]],
        ["Carbocation stability", [H("Order 3°, 2°, 1°, methyl, and name two more stable types."),
                                   A("3° > 2° > 1° > methyl; allylic and benzylic carbocations are also stabilized (resonance).")]],
        ["Rearrangement", [H("What can a carbocation do to become more stable?"),
                           A("A neighboring H (hydride shift) or CH₃ (methyl shift) moves with its electron pair to give a more stable carbocation.")]],
        ["Stereochemistry", [H("What happens at a stereocenter?"),
                             A("The carbocation is planar, so the nucleophile attacks either face: a nearly racemic mixture (slight excess of inversion because of ion pairs).")]],
        ["Competing E1", [H("Which alkene is major?"), A("Both SN1 and E1 products form; the E1 alkene is the Zaitsev (more substituted) product.")]]],
        [0.6, 0.75, 0.8, 0.8, 0.55], term_col=True)
    P.q(1, "(Skill 7.6, solvolysis) Draw all the products when tert-butyl bromide is heated in ethanol, and label each as "
           "SN1 or E1.")
    P.img("q_sn1_a", 3.6)
    P.ansbox(0.7, "Products:")
    P.ansimg("a_sn1_a", 5.2, "tert-butyl ethyl ether (SN1) and 2-methylpropene (E1)")
    P.q(2, "(Rearrangement) Draw the carbocation formed when this secondary bromide ionizes, show how it rearranges, and draw "
           "the three products (one SN1, two E1) with the major one labeled.")
    P.img("q_sn1_b", 3.8)
    P.ansbox(1.1, "Carbocation, rearrangement, products:")
    P.ansimg("a_sn1_b", 6.5, "2-ethoxy-2,3-dimethylbutane (SN1), 2,3-dimethyl-2-butene (E1, major), 2,3-dimethyl-1-butene (E1, minor)")
    if T:
        P.ansbox(0.3, ans=["Loss of Br⁻ gives a secondary carbocation next to a quaternary carbon. A 1,2-methyl shift gives a "
                           "tertiary carbocation, which is trapped by EtOH (ether) or loses a β proton (alkenes). The tetrasubstituted alkene is the Zaitsev product."])
    P.q(3, "(Stereochemistry) Predict the substitution product(s) from the drawn enantiomer in water. Explain the outcome.")
    P.img("q_sn1_c", 4.6)
    P.ansbox(0.7, "Product(s) and explanation:")
    P.ansimg("a_sn1_c", 4.8, "a nearly racemic mixture of the two alcohols (3-methylhexan-3-ol)")
    textbook(P, ["SkillBuilder 7.6 (carbocation intermediate): Problems 7.21, 7.22, 7.87, 7.94, 7.96, 7.102.",
                 "Solvolysis products: 7.26, 7.27, 7.78 (rate law, energy diagram, transition state).   ACS-style: 7.83, 7.84, 7.87."])

    # ================================================================ 7.5
    P.topic("7.5", "Predicting Products", "Textbook 7.9–7.10  •  three steps and the 3 × 4 grid")
    P.box("THE THREE-STEP METHOD", [
        "1.  **Function of the reagent:** is it a strong or weak base, a strong or weak nucleophile?",
        "2.  **Substrate and mechanism(s):** 1°, 2° or 3°? Use the grid below.",
        "3.  **Regiochemistry and stereochemistry:** Zaitsev or Hofmann? Inversion, racemization, anti-periplanar?"])
    P.sub("Step 1: classify each reagent into one of the four categories (strong/weak base and nucleophile)")
    P.table([2000, 2020, 2020, 2020, 2020], ["Strong base,\nweak nucleophile", "Strong base,\nstrong nucleophile",
                                              "Weak base,\nstrong nucleophile", "Weak base,\nweak nucleophile", ""],
            [[[A("DBU, DBN, t-BuOK")], [A("HO⁻, MeO⁻, EtO⁻")], [A("I⁻, Br⁻, Cl⁻, HS⁻, RS⁻, RSH, H₂S")], [A("H₂O, MeOH, EtOH")], ""]],
            [0.85], first_bold=False, sz=18)
    P.sub("Step 2: complete the grid (write E2, SN2, SN1, E1, or “no reaction”; list the major one first)")
    P.table([800, 2320, 2320, 2320, 2320], ["", "Strong base,\nweak Nu", "Strong base,\nstrong Nu", "Weak base,\nstrong Nu", "Weak base,\nweak Nu"], [
        ["1°", [A("E2")], [A("SN2 (E2 minor)")], [A("SN2")], [A("no reaction")]],
        ["2°", [A("E2")], [A("E2 (SN2 minor)")], [A("SN2")], [A("no reaction")]],
        ["3°", [A("E2")], [A("E2")], [A("SN1")], [A("SN1 and E1")]]], [0.5, 0.5, 0.5], first_bold=True)
    P.sub("Step 3: apply it (name the mechanism(s) and the major product)")
    rows = [
        ["1.", "1-bromobutane + NaCN, DMSO", [A("SN2")], [A("pentanenitrile")]],
        ["2.", "2-bromobutane + NaOEt, EtOH", [A("E2 (SN2 minor)")], [A("trans-2-butene (major); 1-butene and cis-2-butene minor")]],
        ["3.", "2-bromo-2-methylbutane + t-BuOK", [A("E2")], [A("2-methyl-1-butene (Hofmann)")]],
        ["4.", "tert-butyl chloride + H₂O, heat", [A("SN1 and E1")], [A("tert-butyl alcohol (major); 2-methylpropene")]],
        ["5.", "1-bromobutane + t-BuOK", [A("E2")], [A("1-butene")]],
        ["6.", "2-bromopropane + NaSH", [A("SN2")], [A("2-propanethiol (propane-2-thiol)")]],
        ["7.", "tert-butyl bromide + NaOH", [A("E2")], [A("2-methylpropene")]],
        ["8.", "1-bromopropane + EtOH, heat", [A("no reaction (1° with a weak base and weak nucleophile)")], [A("none")]]]
    P.table([450, 3700, 2300, 3630], ["", "Substrate and reagent", "Mechanism(s)", "Major product"], rows, [0.5] * 8, first_bold=True)
    P.sub("Alcohols (Section 7.10): turning OH into a leaving group")
    P.table([2200, 3300, 4580], ["Reagent", "What it does to the alcohol", "Mechanism and result"], [
        ["HBr", [A("protonates OH to give H₂O⁺, a good leaving group")], [A("1°/2°: SN2 (inversion) → alkyl bromide;  3°: SN1 → alkyl bromide")]],
        ["TsCl, pyridine", [A("converts OH into OTs, a very good leaving group")], [A("the C–O bond is not broken, so configuration is retained at carbon; then SN2 (inversion) or E2 with a base")]],
        ["conc. H₂SO₄, heat", [A("protonates OH; water leaves")], [A("3°: E1 → alkene (Zaitsev);  1°: E2 → alkene")]]],
        [0.65, 0.65, 0.65], first_bold=True)
    textbook(P, ["SkillBuilder 7.7 (predicting products): Problems 7.28–7.31, 7.75, 7.76.   Reactions with other substrates: 7.32–7.34, 7.63.",
                 "ACS-style: 7.80, 7.85, 7.86, 7.91."])

    # ================================================================ 7.6
    P.topic("7.6", "Solvent Effects", "Textbook 7.12  •  protic vs. polar aprotic")
    P.table([2500, 3900, 3680], ["", "Polar protic", "Polar aprotic"], [
        ["Definition", [H("What is the key structural feature?"), A("has an H bonded to O or N (can hydrogen bond to anions)")],
         [H("What is missing?"), A("polar, but no O–H or N–H bonds")]],
        ["Examples", [A("H₂O, CH₃OH, CH₃CH₂OH, CH₃COOH")], [A("DMSO, DMF, acetone, acetonitrile (CH₃CN), HMPA")]],
        ["Effect on the nucleophile", [A("solvates anions with hydrogen bonds, weakening them")],
         [A("solvates the cation but leaves the anion “naked” and much more reactive")]],
        ["Favors", [A("SN1 and E1 (stabilizes the carbocation and the leaving group)")], [A("SN2")]]],
        [0.85, 0.7, 0.9, 0.6], term_col=True)
    P.sub("Relative SN2 rates for CH₃I + Nu⁻ at 25 °C (all rates relative to Br⁻ in MeOH = 1; textbook Table 7.5)")
    P.table([1600, 2400, 2400, 3680], ["Nucleophile", "In MeOH (protic)", "In DMF (aprotic)", "Increase in rate (DMF ÷ MeOH)"], [
        ["I⁻", "43", "6,500", [A("× 150")]],
        ["Br⁻", "1", "21,000", [A("× 21,000")]],
        ["Cl⁻", "0.04", "41,000", [A("× 1,030,000")]],
        ["F⁻", "0.0006", "49,000", [A("× 82,000,000")]]], [0.3] * 4, first_bold=True)
    P.q(1, "Which halide is the best nucleophile in methanol? In DMF? Explain the reversal using hydrogen bonding.")
    P.ansbox(0.8, ans=["Methanol: I⁻ (best) to F⁻ (worst). DMF: F⁻ (best) to I⁻. In methanol the small F⁻ is strongly hydrogen-bonded "
                       "(caged), so it is a poor nucleophile; I⁻ is large and polarizable and is only weakly solvated. In DMF there are no "
                       "hydrogen bonds to the anions, so the most basic, least stabilized anion (F⁻) is the most reactive."])
    textbook(P, ["Section 7.12 conceptual checkpoints: Problems 7.42–7.46."])

    # ================================================================ 7.7
    P.topic("7.7", "Synthesis Strategies", "Textbook 7.11  •  retrosynthesis")
    P.box("BIG IDEA", [
        "A **retrosynthesis** starts at the target molecule and works backward: **disconnect** a bond that a known reaction can "
        "form, then choose the nucleophile and electrophile. Check the forward reaction with the mechanism rules: SN2 needs "
        "a 1° (or methyl) electrophile."])
    P.q(1, "Show two possible SN2 disconnections for methyl tert-butyl ether, (CH₃)₃C–O–CH₃, and say which route will work. Why does the other fail?")
    P.img("t_mtbe", 2.1)
    P.ansbox(1.0, "Routes and verdict:", [
        "Route 1: CH₃O⁻ (nucleophile) + (CH₃)₃C–Br (3° electrophile): fails. The strong base gives E2, producing 2-methylpropene, not the ether.",
        "Route 2: (CH₃)₃C–O⁻ (nucleophile) + CH₃–I (methyl electrophile): works by SN2. **Route 2 is the correct synthesis.**"])
    textbook(P, ["SkillBuilder 7.8 (retrosynthesis and synthesis): Problems 7.35–7.37, 7.55, 7.89, 7.97–7.99.   "
                 "SkillBuilder 7.9 (alkene target by elimination): Problems 7.38–7.41, 7.64, 7.90."])

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
