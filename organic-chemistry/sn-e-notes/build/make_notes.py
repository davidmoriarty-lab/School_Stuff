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

    def blanks(self, items, start=1):
        """Numbered fill-in sentences.  items: (sentence with ______ blanks, answer).  The answer shows only in the teacher edition."""
        for k, (text, ans) in enumerate(items, start):
            FLOW.add(txt_h(text, 10.5, 6.6) + 0.12 + (txt_h(ans, 9.5, 6.6) + 0.1 if self.T else 0))
            self.emit(('<w:p><w:pPr>%s<w:spacing w:before="70" w:after="40" w:line="288" w:lineRule="auto"/>'
                       '<w:ind w:left="461" w:hanging="461"/></w:pPr>%s%s</w:p>') % (
                "<w:keepNext/>" if self.T else "", runs("%d.  " % k, 21, DARK, b=True), runs(text, 21, INK)))
            if self.T:
                self.emit(self.ans_para(ans, 19))

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
            "between them. Fill in the blanks as we go. Draw every structure and curved arrow yourself. After each reaction the "
            "**FROM YOUR TEXTBOOK** box lists the chapter problems to do next. Twenty ACS-style multiple-choice questions are at the back."])
    else:
        P.box("TEACHER EDITION", [
            "Gray boxes and lines are answers. TEACHER NOTE boxes hold timing ideas and choices I made. The answer boxes are larger "
            "than the student blanks, so this edition runs longer."], kind="teacher")
        P.box("TEACHER OVERVIEW", [
            "**Organization.** Each reaction type has its own section: SN2, E2, SN1, E1. Part 1 pairs the bimolecular reactions, "
            "Part 2 pairs the unimolecular reactions, and Part 3 puts them together (the textbook’s Section 7.9 method, solvents, "
            "alcohols and synthesis). There are no summary tables; the content is in short paragraphs and fill-in sentences.",
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
    P.blanks([
        ("A ______________ is an electron-rich species that attacks an electrophilic carbon. A ______________ removes a proton (H⁺).",
         "nucleophile; base"),
        ("The carbon bonded to the halogen is the ______ carbon. The carbons attached to it are the ______ carbons.", "α (alpha); β (beta)"),
        ("A primary (1°) alkyl halide has ______ carbon bonded to the α carbon, a secondary (2°) has ______ and a tertiary (3°) has ______.",
         "one; two; three"),
        ("A good leaving group is a ______ base: it is the conjugate base of a ______ acid. In order from best to worst: "
         "I⁻, ______, ______, F⁻.", "weak; strong; I⁻ > Br⁻ > Cl⁻ > F⁻ (HI, HBr and HCl are strong acids; HF is much weaker)"),
        ("Hydroxide (HO⁻) is a very ______ leaving group, because its conjugate acid, water (pKa ≈ 16), is so weak. "
         "To use an alcohol as a substrate we first turn the OH into a better leaving group (see Section 8).",
         "poor (a strong base, so it does not leave)")])
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
    P.img("sn2_mech", 6.4, "center")
    P.blanks([
        ("rate = ______________________. Doubling the alkyl halide ______________; doubling both makes the reaction ______ times faster.",
         "k[RX][Nu⁻]; doubles the rate; four"),
        ("There is no ______________ in SN2. Bond making and bond breaking happen at the same time, through one ______________ state.",
         "intermediate; transition"),
        ("The nucleophile must attack from the ______________ of the carbon, opposite the leaving group, so a stereocenter shows "
         "______________ of configuration.", "back side; inversion"),
        ("Alkyl groups on the α carbon block the back side (steric hindrance). The order of SN2 reactivity is  ______ > ______ > ______ >> ______ "
         "(methyl, 1°, 2°, 3°). A ______ halide does not react by SN2.", "methyl > 1° > 2° >> 3°; tertiary"),
        ("Neopentyl bromide, (CH₃)₃CCH₂Br, is a primary halide but is very slow in SN2, because the ______ methyl groups on the "
         "β carbon block the path of the nucleophile.", "three")])
    P.sub("Nucleophile strength (Section 7.4)")
    P.blanks([
        ("A negatively charged nucleophile is ______________ than a neutral one of the same atom: HO⁻ reacts over a million times "
         "faster than H₂O with CH₃I.", "stronger"),
        ("Going down a column, nucleophilicity ______________ because larger atoms are more polarizable: HS⁻ is stronger than ______, and in a "
         "protic solvent I⁻ is stronger than ______ .", "increases; HO⁻; Cl⁻ (or Br⁻)"),
        ("Strong nucleophiles to know: ____________________________.  Weak nucleophiles: ______________.",
         "HS⁻, RS⁻, I⁻, Br⁻, Cl⁻, HO⁻, RO⁻ (CN⁻ is good too);  H₂O and ROH (neutral molecules)")])
    P.img("energy_one", 3.1, "center")
    P.q("P1", "(Energy diagram) Why does a 2° substrate react more slowly than a methyl substrate in SN2? Use the words "
           "“transition state” and “Ea”.")
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
    P.img("e2_mech", 6.3, "center")
    P.blanks([
        ("rate = ______________________. E2 needs a ______________ base, and it is a ______ step reaction.",
         "k[RX][base]; strong; one"),
        ("In the arrow-pushing, the base removes a β ______________, the C–H electrons become the ______ bond, and the ______ bond to the "
         "leaving group breaks.", "hydrogen (proton); π; C–X (C–Br)"),
        ("The more substituted (more stable) alkene is the ______________ product. A small base such as NaOEt gives mostly the ______________ product.",
         "Zaitsev; Zaitsev"),
        ("A bulky base such as t-BuOK removes the more accessible hydrogen and gives mostly the less substituted alkene, called the ______________ product.",
         "Hofmann"),
        ("Alkene stability: tetrasubstituted > ______________ > ______________ > monosubstituted. A trans alkene is ______ stable than the cis isomer "
         "because it has less steric strain.", "trisubstituted > disubstituted; more")])
    P.sub("Anti-periplanar geometry and stereochemistry")
    P.img("newman", 1.9, "center")
    P.note("In this Newman projection (looking down the C2–C3 bond of 2-bromobutane) the H at the top of the back carbon is directly "
           "opposite the Br on the front carbon. Only a hydrogen in this position can be removed in E2.", 20)
    P.blanks([
        ("If the β carbon has **two** hydrogens, both the cis and trans alkenes can form and the trans alkene is favored. This E2 is "
         "______________.  If the β carbon has only **one** hydrogen, only the ______ H can leave, so the product geometry is fixed by the "
         "substrate. This E2 is ______________.", "stereoselective; anti; stereospecific"),
        ("In a cyclohexane chair, E2 needs the leaving group and the β hydrogen to be both ______________ (180° apart).", "axial")])
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
    P.img("sn1_mech", 5.9, "center")
    P.blanks([
        ("rate = ______________. The nucleophile is not in the rate law, because the ______________ step is the slow one.", "k[RX]; first (ionization)"),
        ("A carbocation has ______ bonds, an empty p orbital and a ______ charge. It is ______ (flat) around the carbon.",
         "three; positive; planar (trigonal planar)"),
        ("Carbocation stability: ______ > ______ > ______ > methyl. Allylic and benzylic carbocations are also stable because of ______________.",
         "3° > 2° > 1°; resonance"),
        ("Because SN1 needs a stable carbocation, it works for ______ (and allylic and benzylic) halides, in a ______________ solvent "
         "(for example water or ethanol).", "tertiary; polar protic")])
    P.img("energy_two", 3.5, "center")
    P.sub("Stereochemistry")
    P.blanks([
        ("The nucleophile can attack either face of the planar carbocation, so an SN1 reaction at a stereocenter gives a nearly ______________ "
         "mixture. (In practice there is a slight excess of inversion, because of ion pairs.)", "racemic")])
    P.sub("Rearrangements")
    P.note("A carbocation can become more stable by moving a neighboring hydrogen (a **hydride shift**) or methyl group "
           "(**methyl shift**) with its electron pair. The new carbocation is more substituted.", 21)
    P.img("hydride_shift", 5.4, "center")
    P.blanks([
        ("A rearrangement is expected when ionization gives a ______________ carbocation next to a carbon that can donate an H or CH₃ and "
         "make a ______________ carbocation. Rearrangements happen in SN1 and E1 but never in SN2 or E2, because ______________.",
         "secondary; tertiary; those reactions have no carbocation intermediate")])
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
    P.img("e1_mech", 6.2, "center")
    P.blanks([
        ("rate = ______________. The first step is the same as in ______, so SN1 and E1 products form from the ______ carbocation.",
         "k[RX]; SN1; same"),
        ("The base is weak (for example ______ or ______), unlike E2, which needs a ______________ base.", "H₂O or EtOH (a solvent); strong"),
        ("The alkene formed is usually the more substituted one, the ______________ product, because it is more stable.", "Zaitsev"),
        ("When a tertiary alcohol is heated with conc. H₂SO₄ it loses water by an ______ process. The OH is first ______________, "
         "water leaves to give a carbocation, and a β proton is removed.", "E1; protonated")])
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
    P.sub("Step 1: the reagent")
    P.blanks([
        ("DBU, DBN and t-BuOK are strong ______ but poor ______________, so they give ______________.", "bases; nucleophiles; elimination (E2)"),
        ("HO⁻, MeO⁻ and EtO⁻ are strong bases **and** strong nucleophiles, so ______ and ______ compete.", "SN2; E2"),
        ("I⁻, Br⁻, Cl⁻, HS⁻ and RS⁻ are strong nucleophiles but ______ bases, so they give ______________ (not elimination).", "weak; substitution"),
        ("H₂O, MeOH and EtOH are weak bases and weak nucleophiles. They react only by the ______________ reactions, so the substrate "
         "must be ______________.", "unimolecular (SN1 and E1); tertiary"),
        ("If NaOEt is dissolved in EtOH, the reagent is ______ and the EtOH is only the ______________.", "NaOEt; solvent")])
    P.sub("Step 2: the substrate")
    P.blanks([
        ("With a strong base and a ______ or ______ substrate, E2 is the main reaction. A hindered base (t-BuOK) gives E2 even with a ______ substrate.",
         "2° or 3°; 1°"),
        ("A ______ substrate never reacts by SN2. With a strong nucleophile that is a weak base, a 3° substrate reacts by ______.", "tertiary; SN1"),
        ("A 1° or 2° substrate with a weak base and weak nucleophile (for example EtOH) gives ______________, because the carbocation is "
         "too unstable.", "no reaction"),
        ("A 1° substrate with a strong, unhindered nucleophile gives mostly ______; a 2° substrate with the same reagent gives mostly ______ "
         "if the reagent is a strong base (and SN2 if it is a weak base).", "SN2; E2")])
    P.sub("Step 3: apply it. Name the mechanism(s) and the major product.")
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
    P.blanks([
        ("A ______ solvent has an H bonded to O or N (H₂O, MeOH, EtOH, CH₃COOH). A polar ______ solvent has no O–H or N–H bond "
         "(DMSO, DMF, acetone, acetonitrile).", "protic; aprotic"),
        ("A protic solvent hydrogen-bonds to anions and ______ them, which makes a nucleophile ______ reactive. It also stabilizes "
         "carbocations and leaving groups, so it favors ______ and ______.", "cages (solvates); less; SN1; E1"),
        ("A polar aprotic solvent solvates the ______ but leaves the anion “naked” and much more reactive, so it ______ the rate of SN2 "
         "by many orders of magnitude.", "cation; speeds up (increases)")])
    P.sub("Data from Table 7.5: SN2 of CH₃I with a halide ion (relative rates, Br⁻ in MeOH = 1)")
    P.note("I⁻:  43 in MeOH, 6,500 in DMF   (×150)          Br⁻:  1 in MeOH, 21,000 in DMF   (×21,000)\n"
           "Cl⁻:  0.04 in MeOH, 41,000 in DMF   (×1,030,000)          F⁻:  0.0006 in MeOH, 49,000 in DMF   (×82,000,000)", 20)
    P.q("P1", "Which halide is the best nucleophile in methanol? In DMF? Explain the reversal using hydrogen bonding.")
    P.ansbox(0.85, ans=["Methanol: I⁻ (best) to F⁻ (worst). DMF: F⁻ (best) to I⁻. In methanol the small F⁻ is strongly hydrogen-bonded "
                        "(caged), so it is a poor nucleophile; I⁻ is large and polarizable and only weakly solvated. In DMF there are no "
                        "hydrogen bonds to the anions, so the most basic, least stabilized anion (F⁻) is the most reactive."])
    textbook(P, ["Section 7.12 conceptual checkpoints: Problems 7.42–7.46."])

    # ================================================================ 8  alcohols and synthesis
    P.topic("8", "Alcohols and Synthesis", "Textbook 7.10–7.11  •  make OH leave, then plan a synthesis")
    P.blanks([
        ("HBr converts an alcohol into an alkyl bromide. It first ______________ the OH to give H₂O⁺, a good leaving group. A 1° or 2° alcohol then "
         "reacts by ______ (inversion); a 3° alcohol reacts by ______.", "protonates; SN2; SN1"),
        ("TsCl and pyridine turn OH into an ______________ (OTs), an excellent leaving group. The C–O bond is not broken, so the "
         "configuration at carbon is ______________.", "alkyl tosylate; retained"),
        ("Conc. H₂SO₄ and heat dehydrate an alcohol: a 3° alcohol reacts by ______ (see Section 5); a 1° alcohol by ______.", "E1; E2")])
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
