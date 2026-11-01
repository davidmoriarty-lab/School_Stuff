import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import lib
from lib import *
import build_gases as B
from build_gases import Packet, sf, OUTDIR
import figs

F_CONT = figs.kmt_container()
F_KA = figs.kmt_answers()
for _t in (False, True):
    figs.molar_mass_fig(_t); figs.apparatus(_t); figs.blank_graph(_t)


PB = ('<w:p><w:pPr><w:pageBreakBefore/><w:spacing w:before="0" w:after="0" w:line="20" '
      'w:lineRule="exact"/></w:pPr></w:p>')


def build(T):
    lib.FLOW.__init__()
    P = Packet(T)
    A = Ans
    R = "0.0821"

    # ============================================================ page 1
    P.title("7", "Gases", "Explain gas behavior with moving particles, then predict how pressure, volume, "
                         "temperature and moles change together.")
    if not T:
        P.box("HOW TO USE THIS PACKET", [
            "Write in pencil. For every calculation show the **givens with units, the equation, your substitution "
            "and the answer with units**. Always change temperature to **kelvin** before you use a gas law. "
            "LAB CORNER boxes are things you would see at a lab bench. Extra practice is at the back."])
    else:
        P.box("TEACHER EDITION", [
            "Everything in a light-gray box, cell or line is an answer or model response. Teacher notes "
            "(misconceptions, interpretation choices, corrections) appear in the heavy-bordered boxes labeled "
            "TEACHER NOTE. The pages follow the student packet, so they line up closely."], kind="teacher")
        P.box("TEACHER OVERVIEW", [
            "**Numbering:** the homework folder calls this “Unit 8 – Gases” (Worksheets #1–#4). This "
            "packet is Unit 7 in the notes sequence; topics 7.1–7.5 follow the worksheets in order "
            "(7.1–7.2 = WS #1, 7.3 = WS #2, 7.4 = WS #3, 7.5 = WS #4).",
            "**Answers are computed.** Every numerical answer in the key was calculated by code using "
            "R = 0.0821 L·atm/(mol·K), K = °C + 273 and molar masses to 0.01 g/mol, then rounded to "
            "the sig figs of the data and proofread.",
            "**Homework quirks handled in the packet:** the degree sign was lost in the PDF text of WS #2 "
            "(“450C”, “13 0C”, “67 0C”); these are read as 45 °C, 13 °C, 67 °C and "
            "so on. The WS #3 #4 particle picture must not be used for any calculation. WS #4 #1(d) gives "
            "ΔH per “mol rxn” – see the note in 7.5. Three extra conversions were added to 7.2 "
            "(d–f), each topic has a worked example and 1–2 multiple-choice items, and an Extra Practice page of "
            "new problems was written. Dalton’s law, density and STP are not in the homework and are not "
            "included.",
            "**Common misconceptions:** using °C in a gas law; mixing pressure units with R; reading "
            "“inverse” as “negative”; believing pressure comes from the weight of the gas or from "
            "particles hitting each other; thinking collisions slow the particles down; forgetting the mole "
            "ratio in gas stoichiometry."], kind="teacher")

    P.sub("What we will learn")
    P.table([1000, 9080], ["", "Topic"], [
        ["7.1", "Kinetic molecular theory & gas behavior"],
        ["7.2", "Gas relationships & unit conversions"],
        ["7.3", "The combined gas law"],
        ["7.4", "The ideal gas law"],
        ["7.5", "Gas stoichiometry"]], 0.3)
    P.sub("By the end of this unit I can…")
    for t in [
        "Use kinetic molecular theory to explain gas pressure, compressibility and elastic collisions.",
        "Sketch particle diagrams for a change in temperature, volume or number of particles.",
        "Decide whether two gas variables have a direct or an inverse relationship and explain why.",
        "Convert between pressure units (atm, torr, mmHg, kPa, psi) and between °C and kelvin.",
        "Solve combined gas law problems for any unknown, using kelvin temperatures.",
        "Use PV = nRT to find pressure, volume, moles, temperature or molar mass.",
        "Combine the ideal gas law with mole ratios to solve gas stoichiometry problems."]:
        lib.FLOW.add(0.2)
        P.emit(para("•  " + t, sz=21, after=40, left=360, hanging=300))
    lib.FLOW.hard_break()
    P.emit(PB)

    # ============================================================ 7.1 KMT
    P.topic("7.1", "Kinetic Molecular Theory & Gas Behavior",
            "Moving particles • elastic collisions • pressure • particle diagrams")
    P.box("BIG IDEA", [
        "A gas is a huge number of tiny particles flying around in mostly empty space. Everything we measure about "
        "a gas (pressure, volume, temperature) comes from how those particles move and hit things."])
    P.box("KINETIC MOLECULAR THEORY (KMT) — THE POSTULATES", [
        "1.  Gas particles are tiny compared with the empty space between them.",
        "2.  Particles move constantly, in random, straight-line paths.",
        "3.  Particles do not attract or repel each other.",
        "4.  Collisions with each other and with the walls are **perfectly elastic**: no kinetic energy is lost.",
        "5.  The average kinetic energy of the particles is proportional to the **Kelvin** temperature."])
    P.sub("Key vocabulary — write each definition in your own words")
    P.table([2088, 4824, 3168], ["Term", "Definition (your words)", "Example / sketch"], [
        ["Elastic collision", [Hint("What happens to the total kinetic energy when two particles collide?"),
                               A("Total kinetic energy is the same before and after: no energy is lost as heat or "
                                 "sound, so the particles keep moving.")],
         A("Two particles bounce apart; their speeds change but the total energy does not.")],
        ["Gas pressure", [Hint("What causes it, and what does it act on?"),
                          A("Force of particle collisions with the walls of the container, divided by wall area.")],
         A("Many hits per second on a wall.")],
        ["Kelvin temperature", [Hint("What is it proportional to? Why must we use it in gas laws?"),
                                A("Proportional to the average kinetic energy; 0 K is zero motion, so ratios and "
                                  "proportions work.")],
         A("K = °C + 273")]], [0.8, 0.8, 0.8], term_col=True)

    P.q(1, "One of the postulates of KMT states that collisions are perfectly elastic. In your own words, describe "
           "what this means about the collision.")
    P.ansbox(0.75, ans=["Particles bounce off each other and the walls without losing any kinetic energy; the "
                        "energy is only passed between particles, so the gas never “run down.”"])
    P.q(2, "Gases are easily compressible whereas solids and liquids are not. Explain why.")
    P.ansbox(0.75, ans=["Gas particles are very far apart (mostly empty space), so they can be pushed closer together. "
                        "In solids and liquids the particles are already touching."])
    P.q(3, "How does a gas create pressure on the surroundings?")
    P.ansbox(0.75, ans=["Gas particles move constantly and collide with the walls of the container. Each collision "
                        "exerts a tiny force; billions of collisions per second over the wall area give pressure."])

    P.q(4, "A sample of gas is held in a sealed container, shown below.")
    fig, fh = P.pic_par(F_CONT, 1.9, jc="left", after=0)
    left = fig
    right = para("**a.**  What do the arrows indicate in the diagram?", sz=21, after=60, before=40)
    if T:
        right += P.ans_para("Direction and speed of each particle’s motion.", 20)
    right += para("", after=240 if not T else 30)
    right += para("**b.**  Why are some arrows longer than others?", sz=21, after=60, before=40)
    if T:
        right += P.ans_para("Longer arrow = faster particle (more kinetic energy). Particles in a gas move at a "
                            "range of speeds; temperature measures the average.", 20)
    right += para("", after=120)
    lib.FLOW.add(1.7)
    P.emit(tbl([3000, 7080], [tr([tc(3000, left, borders=NOBORD, mar=(40, 40, 40, 40)),
                                  tc(7080, right, borders=NOBORD, mar=(40, 120, 40, 40))])]))
    P.emit(spacer())
    P.emit(para("**c.**  Four boxes are provided below. Each box is a set of conditions changed from the original "
                "diagram. In each box, draw how the particles will look (use arrows to show speed).", sz=21,
                after=60, left=461, hanging=0, keep=True))
    lib.FLOW.add(0.4)
    ws = [2300, 2300, 2300, 3180]
    cells = []
    for k in range(4):
        content = ""
        if T:
            content, _ = P.pic_par(F_KA[k], [1.6, 1.6, 1.5, 2.1][k], jc="center", after=0)
        cells.append(tc(ws[k], content, mar=(30, 30, 30, 30), valign="center"))
    capt = [["Same volume", "Higher temperature", "Same # of particles"],
            ["Same volume", "Same temperature", "½ the # of particles"],
            ["Decrease volume", "Same temperature", "Same # of particles"],
            ["Increase volume", "Same temperature", "Same # of particles"]]
    lib.FLOW.add(1.65 + 0.5)
    P.emit(tbl(ws, [tr(cells, h=1.55),
                    tr([tc(ws[k], "".join(para(t, sz=18, after=0) for t in capt[k]), mar=(30, 60, 30, 30))
                        for k in range(4)])]))
    P.emit(spacer())
    P.box("TEACHER NOTE", [
        "Sketches will vary. Look for: (1) same number of particles in the same box with **longer arrows**; "
        "(2) half as many particles, same arrow length, same box; (3) the same particles in a **smaller** box "
        "(closer together, more collisions per second); (4) the same particles in a **larger** box. Arrow "
        "length is speed, not force. Pressure is from collisions with the walls, not from the weight of the gas "
        "and not from particles hitting each other."], kind="teacher")
    P.mc(5, "According to KMT, which statement is true for an ideal gas?",
         ["particles attract strongly", "collisions are perfectly elastic", "particles stop at 25 °C",
          "particles are touching"], "B", "KMT postulate 4.")

    # ============================================================ 7.2
    P.topic("7.2", "Gas Relationships & Unit Conversions",
            "Pressure • volume • temperature • moles • direct vs inverse • kelvin")
    P.box("BIG IDEA", [
        "Four variables describe a gas: **pressure (P), volume (V), temperature (T) and moles (n)**. Change one and "
        "the others respond. If two variables go up together the relationship is **direct**; if one goes up as the "
        "other goes down it is **inverse**."])
    P.sub("Direct or inverse?")
    P.table([2100, 2300, 1500, 4180], ["Variables", "What stays the same?", "Direct or inverse?",
                                       "Explain with particles"], [
        ["a.  Pressure vs Volume", A("T and n"), A("Inverse"),
         A("Smaller volume: particles hit the walls more often → higher pressure.")],
        ["b.  Pressure vs Temperature", A("V and n"), A("Direct"),
         A("Hotter: particles move faster, hit harder and more often → higher pressure.")],
        ["c.  Temperature vs Volume", A("P and n"), A("Direct"),
         A("Hotter gas must spread out (larger V) to keep the same pressure.")],
        ["d.  # Moles vs Pressure", A("V and T"), A("Direct"),
         A("More particles → more wall collisions → higher pressure.")]], [0.7] * 4, first_bold=False)

    P.box("CONVERSION FACTORS", [
        "**1 atm = 760 torr = 760 mmHg = 101.3 kPa = 14.7 psi**          **K = °C + 273**",
        "Set up each conversion as a fraction so the unit you start with cancels. Gas-law temperatures must be in "
        "kelvin, never °C."])
    P.sub("Perform the conversion (show the fraction setup)")
    P.table([504, 3000, 6576], ["", "Convert", "Work and answer (with units)"], [
        ["a.", "35.0 °C to kelvin", A("35.0 + 273 = 308 K")],
        ["b.", "1.25 atm to kPa", A("1.25 atm × (101.3 kPa / 1 atm) = %s kPa" % sf(B.c_b, 3))],
        ["c.", "38.0 psi to atm", A("38.0 psi × (1 atm / 14.7 psi) = %s atm" % sf(B.c_c, 3))],
        ["d.", "745 mmHg to atm", A("745 mmHg × (1 atm / 760 mmHg) = %s atm" % sf(B.c_d, 3))],
        ["e.", "202.6 kPa to psi", A("202.6 kPa × (14.7 psi / 101.3 kPa) = %s psi" % sf(B.c_e, 3))],
        ["f.", "−25 °C to kelvin", A("−25 + 273 = %d K" % B.c_f)]], [0.5] * 6)

    lib.FLOW.add(0.25)
    P.emit(tbl([10080], [tr([tc(10080, para("LAB CORNER  •  Sealed syringe", sz=17, b=True, color=DARK, after=0),
                                fill="D9D9D9", borders=left_bar(DARK), mar=(50, 170, 50, 140))])]))
    P.emit(spacer(0.04))
    P.note("A syringe is sealed with 40 mL of air at 100 kPa. The plunger is pushed in slowly until the scale reads "
           "20 mL. No air escapes and the temperature does not change.", 21)
    P.q(1, "(a) Predict the new pressure. (b) Use particles to explain why the pressure changed.")
    P.ansbox(0.8, "Answer:", ["(a) About 200 kPa: half the volume, double the pressure (inverse; P₁V₁ = P₂V₂).",
                              "(b) Same number of particles in half the space, so they hit the walls twice as often."])
    P.box("TEACHER NOTE", [
        "K = °C + 273 is used as on the homework (college courses use 273.15; answers differ in the 4th sig fig). "
        "“Direct” means both increase together (for P–T the graph is a straight line through the origin "
        "when T is in kelvin); “inverse” means the product stays constant. Do not let students call "
        "an inverse relationship “negative.”"], kind="teacher")
    P.mc(1, "As the temperature of a gas in a rigid, sealed container increases, the pressure…",
         ["decreases", "increases", "stays the same", "cannot be predicted"], "B")
    P.mc(2, "2.00 atm is equal to how many mmHg?", ["380", "760", "1520", "2000"], "C",
         "2.00 × 760 = 1520")

    # ============================================================ 7.3 combined gas law
    P.topic("7.3", "The Combined Gas Law", "P₁V₁/T₁ = P₂V₂/T₂ • always use kelvin")
    P.box("BIG IDEA", [
        "For a fixed amount of gas, **PV/T stays constant**. So when conditions change from state 1 to state 2:  "
        "**P₁V₁ / T₁ = P₂V₂ / T₂**. Boyle’s, Charles’s and Gay-Lussac’s laws are this "
        "equation with the variable that does not change crossed out."])
    P.box("STEPS", [
        "1. List the givens in a table: P₁, V₁, T₁ and P₂, V₂, T₂ (one is the unknown).",
        "2. Change every temperature to kelvin (°C + 273).",
        "3. Write the equation, solve for the unknown, then substitute with units.",
        "4. Check: does the answer make sense? (Higher T or lower P should make V larger.)"])
    P.emit(tbl([10080], [tr([tc(10080, para("WORKED EXAMPLE", sz=17, b=True, color=DARK, after=40) +
                                para("A sealed balloon holds 2.0 L at 1.0 atm and 27 °C. It is carried up a mountain "
                                     "where the pressure is 0.80 atm and the temperature is −3 °C. What is the new "
                                     "volume?", sz=21, after=60),
                                fill="F4F4F4", borders=left_bar(DARK), mar=(50, 170, 50, 140))])]))
    lib.FLOW.add(0.8)
    P.emit(spacer())
    P.ansbox(1.05, "Work it out here:", [
        "T₁ = 27 + 273 = 300 K;   T₂ = −3 + 273 = 270 K",
        "V₂ = P₁V₁T₂ / (T₁P₂) = (1.0 atm)(2.0 L)(270 K) / [(300 K)(0.80 atm)] = %s L" % sf(B.gw, 2),
        "Check: pressure drops (V up) and temperature drops (V down); net is a slightly larger balloon."])

    P.sub("Solve each problem. Show givens, equation, substitution and answer with units.")
    prob = [
        ("1.", "If I initially have a gas at a pressure of 11 atm, a volume of 23 liters and a temperature of 200 K, "
               "and then I raise the pressure to 13 atm and increase the temperature to 300 K, what is the new "
               "volume of the gas?",
         ["V₂ = P₁V₁T₂ / (T₁P₂) = (11)(23)(300) / [(200)(13)] = **%s L**" % sf(B.g1, 2)]),
        ("2.", "A gas takes up a volume of 18 liters, has a pressure of 2.3 atm and a temperature of 299 K. If I raise "
               "the temperature to 355 K and lower the pressure to 1.5 atm, what is the new volume of the gas?",
         ["V₂ = (2.3)(18)(355) / [(299)(1.5)] = **%s L**" % sf(B.g2, 2)]),
        ("3.", "A gas that has a volume of 31 liters, a temperature of 45 °C and an unknown pressure has its volume "
               "increased to 36 liters and its temperature decreased to 35 °C. If I measure the pressure after the "
               "change to be 2.0 atm, what was the original pressure of the gas?",
         ["T₁ = 318 K, T₂ = 308 K.  P₁ = P₂V₂T₁ / (V₁T₂) = (2.0)(36)(318) / [(31)(308)] = "
          "**%s atm**" % sf(B.g3, 2)]),
        ("4.", "A gas has a temperature of 13 °C and a volume of 4.1 liters. Calculate the new temperature if the "
               "volume of the gas is reduced to 2.5 liters, assuming the pressure stays constant.",
         ["T₁ = 286 K.  T₂ = T₁V₂ / V₁ = (286)(2.5) / 4.1 = **%s K**  (= −%d °C)" % (
             sf(B.g4, 3), round(273 - B.g4))]),
        ("5.", "If I have 18 liters of gas at a temperature of 67 °C and a pressure of 78.89 atm, what will be the "
               "pressure of the gas if I raise the temperature to 94 °C and decrease the volume to 12 liters?",
         ["T₁ = 340 K, T₂ = 367 K.  P₂ = P₁V₁T₂ / (V₂T₁) = (78.89)(18)(367) / [(12)(340)] "
          "= %s atm ≈ **%s atm**" % (sf(B.g5, 4), "1.3 × 10²")])]
    rows = []
    for n, text, ans in prob:
        rows.append([n, [text] + [A(a) for a in ans]])
    P.table([504, 9576], ["", "Combined gas law problems"], rows, [1.55, 1.45, 1.55, 1.35, 1.45], first_bold=True)
    P.box("TEACHER NOTE — CORRECTIONS", [
        "In the PDF text of WS #2 the degree signs were lost (“450C,” “13 0C,” “67 0C”); the packet "
        "reads them as 45 °C, 13 °C, 67 °C and prints °C explicitly. #4 holds pressure constant, so "
        "it is Charles’s law; accept 174 K or −99 °C if the unit is given. #5 is limited to 2 sig figs by "
        "18 L and 12 L, so 1.3 × 10² atm (128 atm) are both fine. Typical error: leaving a temperature in °C."],
        kind="teacher")
    P.mc(1, "A gas at constant temperature is compressed from 4.0 L to 2.0 L. The pressure…",
         ["is halved", "doubles", "stays the same", "quadruples"], "B", "P₁V₁ = P₂V₂")
    P.mc(2, "Which temperature scale must be used in every gas law calculation?",
         ["°C", "kelvin", "°F", "any, as long as it is consistent"], "B")

    # ============================================================ 7.4 ideal gas law
    P.topic("7.4", "The Ideal Gas Law", "PV = nRT • choose R to match your units • molar mass")
    P.box("BIG IDEA", [
        "The combined gas law compares two states of a gas. The **ideal gas law** describes one state and adds "
        "the amount of gas: **PV = nRT**, where R is a constant. With it you can find any one of P, V, n or T."])
    P.table([3000, 3000, 4080], ["Value of R", "Use when P is in…", "V in… / T in…"], [
        ["0.0821 L·atm / (mol·K)", "atm", "L / K"],
        ["62.4 L·mmHg / (mol·K)", "mmHg", "L / K"],
        ["8.31 L·kPa / (mol·K)", "kPa", "L / K"]], 0.26, first_bold=False, sz=19)
    P.box("STEPS", [
        "1. Convert T to kelvin, V to liters, and P to the unit that matches your R.",
        "2. Solve PV = nRT for the unknown (n = PV/RT, V = nRT/P …).",
        "3. For grams: **n = mass ÷ molar mass**, so mass = n × M. For molar mass: M = mass ÷ n.",
        "4. Answer with units and the right number of sig figs."])
    P.emit(tbl([10080], [tr([tc(10080, para("WORKED EXAMPLE", sz=17, b=True, color=DARK, after=40) +
                                para("A 5.00 L tank holds nitrogen gas at 2.50 atm and 25 °C. (a) How many moles of "
                                     "N₂ are in the tank? (b) How many grams?", sz=21, after=60),
                                fill="F4F4F4", borders=left_bar(DARK), mar=(50, 170, 50, 140))])]))
    lib.FLOW.add(0.7)
    P.emit(spacer())
    P.ansbox(0.95, "Work it out here:", [
        "(a) n = PV / RT = (2.50 atm)(5.00 L) / [(0.0821)(298 K)] = %s mol" % sf(B.iw_n, 3),
        "(b) mass = n × M = (%s mol)(28.02 g/mol) = %s g" % (sf(B.iw_n, 3), sf(B.iw_m, 3))])
    P.sub("Solve each problem")
    probs = [
        ("1.", "A typical human lung has a capacity of 3.90 liters. Assuming the lung has a pressure of 1.00 atm and a "
               "temperature of 40.0 °C, calculate the number of moles of gas present in a fully inflated lung.",
         ["n = PV / RT = (1.00)(3.90) / [(0.0821)(313)] = **%s mol**" % sf(B.i1, 3)], 1.25),
        ("2.", "A sample of nitrogen gas contains 0.921 moles at a pressure of 1.38 atm and a temperature of 316 K. "
               "What volume does this gas sample occupy?",
         ["V = nRT / P = (0.921)(0.0821)(316) / 1.38 = **%s L**" % sf(B.i2, 3)], 1.2),
        ("3.", "A sample of chlorine gas occupies a volume of 35.5 L at a pressure of 790 mmHg and a temperature of "
               "100.0 °C. Calculate the number of grams of chlorine present in that sample.",
         ["P = 790 / 760 = 1.04 atm;  T = 373 K.   n = PV / RT = (1.04)(35.5) / [(0.0821)(373)] = %s mol" % sf(B.n3, 3),
          "mass = (%s mol)(70.90 g/mol) = **%s g Cl₂**" % (sf(B.n3, 3), sf(B.i3, 3))], 1.45)]
    P.table([504, 9576], ["", "Ideal gas law problems"], [[n, [t] + [A(a) for a in an]] for n, t, an, _ in probs],
            [h for *_, h in probs])
    P.q(4, "A student obtains an unknown liquid, Substance A, that readily evaporates into a gas. The goal is to "
           "find the molar mass of the gas. The diagram shows the setup. (The particles only show that A has turned "
           "into a gas; do not count them in any calculation.)")
    P.emit(P.pic_par(os.path.join(os.path.dirname(__file__), "img", "molar_mass_%s.png" % ("t" if T else "s")), 4.3)[0])
    lib.FLOW.add(1.45)
    sub = [
        ("a.", "The liquid evaporates into the container. If all of it is now gas, how many grams of gas are present? "
               "Write your answer under the box that contains the gas.",
         "5 grams (conservation of mass; the mass does not change when a liquid evaporates).", 0.45),
        ("b.", "What are the units of molar mass?", "grams per mole (g/mol)", 0.3),
        ("c.", "The container has a volume of 5.00 liters and a temperature of 25.0 °C. The pressure produced by the "
               "gas is 1.25 atm. Calculate the number of moles of gas present.",
         "n = PV / RT = (1.25)(5.00) / [(0.0821)(298)] = **%s mol**" % sf(B.i4n, 3), 0.9),
        ("d.", "Using the given information and your answer to part c, determine the molar mass of Substance A.",
         "M = mass / n = 5.00 g / %s mol = **%s g/mol**" % (sf(B.i4n, 3), sf(B.i4M, 3)), 0.8),
        ("e.", "The student repeats the experiment with 10.0 grams of Substance A. Do you expect the calculated molar "
               "mass to be higher, lower or the same as in part d? Explain.",
         "The same. Twice the mass gives twice the moles (and twice the pressure at the same V and T), so mass ÷ "
         "moles is unchanged: molar mass is a property of the substance.", 0.75)]
    P.table([504, 9576], ["", "Parts a–e"],
            [[l, [t, A(a)]] for l, t, a, _ in sub], [h for *_, h in sub], first_bold=True)
    P.box("TEACHER NOTE", [
        "Choose R to match units: mmHg problems may use 62.4 instead of converting. T = 25.0 °C is 298 K here. In "
        "4(e) students often say “higher” because the mass is larger; ask them what happens to n."],
        kind="teacher")
    P.mc(1, "Which value of R is used when pressure is in atm and volume is in liters?",
         ["62.4", "0.0821", "8.31", "22.4"], "B")

    # ============================================================ 7.5 gas stoichiometry
    P.topic("7.5", "Gas Stoichiometry", "Grams → moles → (mole ratio) → moles → liters")
    P.box("BIG IDEA", [
        "Moles are the bridge. The balanced equation gives the **mole ratio**, and PV = nRT converts moles of gas "
        "into a volume (or a volume, pressure and temperature into moles)."])
    P.box("ROAD MAP", [
        "grams of A  →  (÷ molar mass)  →  moles of A  →  (mole ratio from equation)  →  "
        "moles of B  →  (V = nRT / P)  →  liters of B",
        "Going the other way: V, P, T of a gas → n = PV / RT → mole ratio → moles → grams (× molar mass)."])
    P.emit(tbl([10080], [tr([tc(10080, para("WORKED EXAMPLE", sz=17, b=True, color=DARK, after=40) +
                                para("Zn + 2HCl → ZnCl₂ + H₂.  3.27 g of zinc reacts completely. What volume "
                                     "of H₂ forms at 1.00 atm and 25 °C?", sz=21, after=60),
                                fill="F4F4F4", borders=left_bar(DARK), mar=(50, 170, 50, 140))])]))
    lib.FLOW.add(0.6)
    P.emit(spacer())
    P.ansbox(0.9, "Work it out here:", [
        "3.27 g Zn × (1 mol / 65.38 g) = %s mol Zn;  1:1 ratio → %s mol H₂" % (sf(B.zn_mol, 3), sf(B.zn_mol, 3)),
        "V = nRT / P = (%s)(0.0821)(298) / 1.00 = %s L H₂" % (sf(B.zn_mol, 3), sf(B.zn_L, 3))])
    P.q(1, "Gasoline is mostly octane (C₈H₁₈), which burns in oxygen to give carbon dioxide and water.")
    P.table([504, 9576], ["", "Octane combustion"], [
        ["a.", ["Write the balanced chemical equation for the combustion of octane.",
                A("2C₈H₁₈ + 25O₂ → 16CO₂ + 18H₂O  (or C₈H₁₈ + 12.5O₂ → "
                  "8CO₂ + 9H₂O)")]],
        ["b.", ["A gallon of gasoline has a mass of roughly 4000.0 grams. How many liters of CO₂ will be produced at "
                "21.0 °C and 1.00 atm if 1 gallon of gasoline is combusted?",
                A("4000.0 g ÷ 114.23 g/mol = %s mol C₈H₁₈ → × 8 = %s mol CO₂" % (
                    sf(B.oct_mol, 5), sf(B.oct_mol * 8, 5))),
                A("V = nRT / P = (%s)(0.0821)(294) / 1.00 = **%s L CO₂** (≈ %s × 10³ L)" % (
                    sf(B.oct_mol * 8, 5), sf(B.co2_L, 4), sf(B.co2_L / 1000, 3)))]],
        ["c.", ["Assuming the same temperature and pressure as part b, how many liters of oxygen gas are consumed?",
                A("mol O₂ = %s × 12.5 = %s mol;  V = (%s)(0.0821)(294) / 1.00 = **%s L O₂** "
                  "(≈ %s × 10⁴ L)" % (sf(B.oct_mol, 5), sf(B.oct_mol * 12.5, 5), sf(B.oct_mol * 12.5, 5),
                                                       sf(B.o2_L, 3), sf(B.o2_L / 1e4, 3)))]],
        ["d.", ["The enthalpy of combustion (ΔH) of octane is −5,460 kJ/mol rxn. Calculate the energy released "
                "in the combustion of 1 gallon of octane.",
                A("For the equation in (a) as written (2 octane = 1 mol rxn): %s mol octane ÷ 2 = %s mol rxn;  "
                  "%s × 5,460 kJ = **%s kJ released**" % (sf(B.oct_mol, 5), sf(B.oct_mol / 2, 5),
                                                              sf(B.oct_mol / 2, 5), "9.56 × 10⁴"))]]],
            [1.0, 1.9, 1.5, 1.6], first_bold=True)
    P.q(2, "A student performs the experiment below to collect the gas produced by the decomposition of sodium azide.")
    P.emit(tbl([10080], [tr([tc(10080, para("Reaction:  ___ NaN₃(s) → ___ Na(s) + ___ N₂(g)" +
                                            ("      **2, 2, 3**" if T else ""), sz=21, after=0, jc="center"),
                                borders=NOBORD)])]))
    lib.FLOW.add(0.3)
    P.emit(P.pic_par(os.path.join(os.path.dirname(__file__), "img", "apparatus_%s.png" % ("t" if T else "s")), 4.4)[0])
    lib.FLOW.add(2.4)
    P.table([504, 9576], ["", "Sodium azide"], [
        ["a.", ["Label on the diagram where the reaction occurs and where the gas is collected (in the boxes).",
                A("See the labeled diagram above.")]],
        ["b.", ["Sodium azide is a solid at room temperature. Using your knowledge of types of compounds, explain why.",
                A("NaN₃ is ionic (a metal and a non-metal); strong electrostatic attractions between Na⁺ and "
                  "N₃⁻ ions in a crystal lattice need a lot of energy to overcome, so it is a solid.")]],
        ["c.", ["10.0 g of solid NaN₃ is decomposed and the gas collected. The pressure is 0.98 atm and the "
                "temperature is 32.0 °C. Calculate the volume, in mL, of N₂ produced.",
                A("10.0 g ÷ 65.01 g/mol = %s mol NaN₃ → × 3/2 = %s mol N₂" % (
                    sf(B.az_mol, 3), sf(B.az_mol * 1.5, 3))),
                A("V = nRT / P = (%s)(0.0821)(305) / 0.98 = %s L = **%s mL**" % (
                    sf(B.az_mol * 1.5, 3), sf(B.n2_mL / 1000, 3), "5.9 × 10³"))]],
        ["d.", ["An airbag needs about 75.0 L of N₂ at 1.0 atm and 350 K. How many grams of NaN₃ must be "
                "decomposed?",
                A("n(N₂) = PV / RT = (1.0)(75.0) / [(0.0821)(350)] = %s mol;  × 2/3 = %s mol NaN₃" % (
                    sf(B.az_n2, 3), sf(B.az_n2 * 2 / 3, 3))),
                A("mass = (%s mol)(65.01 g/mol) = **%s g NaN₃** (≈ 1.1 × 10² g)" % (
                    sf(B.az_n2 * 2 / 3, 3), sf(B.az_g, 3)))]]],
            [0.7, 0.8, 1.45, 1.5], first_bold=True)
    P.box("TEACHER NOTE", [
        "**1(d):** “kJ/mol rxn” means per mole of the reaction as written. With 2C₈H₁₈ + 25O₂ → "
        "… one mole of reaction burns 2 mol octane, so 35.0 mol octane = 17.5 mol rxn → 9.56 × 10⁴ kJ. If a "
        "student balances with 1 octane (12.5 O₂) the number of moles of reaction doubles and the answer is "
        "1.91 × 10⁵ kJ; discuss why the stated unit depends on how the equation is written. The "
        "water-vapor pressure of the collected gas is ignored in 2(c). Real airbags add KNO₃ so that the sodium "
        "metal is consumed."], kind="teacher")
    P.mc(1, "The mole ratio used in a gas stoichiometry problem comes from…",
         ["the molar masses", "the coefficients of the balanced equation", "the ideal gas constant",
          "the subscripts in the formulas"], "B")

    # ============================================================ extra practice
    lib.FLOW.hard_break()
    P.emit(PB)
    lib.FLOW.mark("Extra practice")
    b = ('<w:top w:val="single" w:sz="24" w:space="0" w:color="000000"/><w:left w:val="nil"/>'
         '<w:bottom w:val="single" w:sz="24" w:space="0" w:color="000000"/><w:right w:val="nil"/>')
    P.emit(tbl([10080], [tr([tc(10080, para("PRACTICE", sz=17, b=True, color=DARK, after=0) +
                                para("Extra Practice — Unit 7", sz=36, b=True, color="000000", after=0) +
                                para("Show your work. Kelvin always.", sz=21, after=0),
                                fill="EDEDED", borders=b, mar=(120, 200, 120, 200))])]))
    lib.FLOW.add(0.9)
    P.emit(spacer())
    P.sub("A.  Which relationship? (name the law or equation you would use)")
    P.table([504, 5400, 4176], ["", "Situation", "Law / equation"], [
        ["a.", "A sealed syringe is pushed in; the temperature does not change.",
         A("Boyle: P₁V₁ = P₂V₂")],
        ["b.", "A balloon is placed in a freezer; the pressure stays the same.",
         A("Charles: V₁/T₁ = V₂/T₂")],
        ["c.", "A sealed aerosol can is heated.", A("Gay-Lussac: P₁/T₁ = P₂/T₂")],
        ["d.", "Gas is pumped into a rigid tank; find the moles added.", A("Ideal gas law: PV = nRT")]],
            [0.5] * 4)
    P.sub("B.  Calculate")
    cr = [
        ("a.", "A 6.50 L sample of gas at 1.20 atm and 25 °C is compressed to 2.00 L while heated to 60 °C. What is "
               "the new pressure?",
         "P₂ = (1.20)(6.50)(333) / [(298)(2.00)] = **%s atm**" % sf(B.e_c1, 3)),
        ("b.", "How many grams of CO₂ are in a 2.50 L tank at 3.00 atm and 27 °C?",
         "n = (3.00)(2.50) / [(0.0821)(300)] = %s mol;  × 44.01 g/mol = **%s g**" % (sf(B.e_c2n, 3), sf(B.e_c2, 3))),
        ("c.", "CaCO₃ → CaO + CO₂.  What volume of CO₂ forms at 1.00 atm and 25 °C when 5.00 g of "
               "CaCO₃ decomposes?",
         "5.00 g ÷ 100.09 = %s mol → V = (%s)(0.0821)(298) / 1.00 = **%s L**" % (
             sf(B.e_c3n, 3), sf(B.e_c3n, 3), sf(B.e_c3, 3)))]
    P.table([504, 9576], ["", "Problems"], [[l, [t, A(a)]] for l, t, a in cr], [1.35, 1.2, 1.35], first_bold=True)
    P.sub("C.  Gas data")
    P.note("A student traps air in a syringe at constant temperature and records the pressure as the volume changes. "
           "Complete the table, then plot V (y-axis) against P (x-axis).", 21)
    left = para("", after=0)
    tab = []
    for p_, v_ in [(1.0, 12.0), (2.0, 6.0), (4.0, 3.0), (5.0, 2.4)]:
        tab.append((p_, v_))
    rows = [tr([tc(1100, para("P (atm)", sz=19, b=True, after=0), fill="D9D9D9"),
                tc(1100, para("V (L)", sz=19, b=True, after=0), fill="D9D9D9"),
                tc(1300, para("P × V", sz=19, b=True, after=0), fill="D9D9D9")], header=True)]
    for p_, v_ in tab:
        rows.append(tr([tc(1100, para("%.1f" % p_, sz=20, after=0)), tc(1100, para("%.1f" % v_, sz=20, after=0)),
                        tc(1300, para("%.0f" % (p_ * v_), sz=20, after=0) if T else "",
                           fill="D9D9D9" if T else None)], h=0.36))
    inner = tbl([1100, 1100, 1300], rows)
    gpath = os.path.join(os.path.dirname(__file__), "img", "graph_%s.png" % ("t" if T else "s"))
    gpar, gh = P.pic_par(gpath, 3.2, jc="left", after=0)
    cell_l = inner + "<w:p/>" + para("**1.**  What is the relationship between P and V?", sz=20, after=40, before=60) + \
        (P.ans_para("Inverse: P × V is constant (12 atm·L).", 19) if T else
         para("", after=0) + para("", after=0))
    lib.FLOW.add(2.45)
    P.emit(tbl([4500, 5580], [tr([tc(4500, cell_l, borders=NOBORD, mar=(40, 40, 40, 80)),
                                  tc(5580, gpar, borders=NOBORD, mar=(40, 40, 40, 40))])]))
    P.emit(spacer())
    P.sub("D.  Think")
    P.q(1, "Explain with particles why a sealed can of spray paint says “do not store near heat.”")
    P.ansbox(0.7, ans=["Heating raises the average kinetic energy: particles move faster and hit the walls harder and "
                       "more often. The volume cannot change, so pressure rises and the can may burst."])
    P.q(2, "Which gas sample has more particles: 2.0 L at 1.0 atm and 300 K, or 2.0 L at 1.0 atm and 600 K? Explain.")
    P.ansbox(0.7, ans=["The 300 K sample. At the same P and V, n = PV/RT, so doubling T halves n: the hotter gas has "
                       "half as many particles."])
    P.mc(3, "At constant pressure, a gas at 300 K is heated to 600 K. Its volume…",
         ["doubles", "is halved", "stays the same", "increases by 300 L"], "A", "V/T is constant, and T doubled (K).")
    P.mc(4, "A gas has a volume of 22.4 L at 1.00 atm and 273 K. How many moles are present (R = 0.0821)?",
         ["0.5 mol", "1.00 mol", "2.00 mol", "22.4 mol"], "B", "n = PV/RT = (1.00)(22.4)/[(0.0821)(273)] = 1.00")

    out = os.path.join(OUTDIR, "Unit 7 - Gases - %s.docx" % ("TEACHER EDITION" if T else "STUDENT NOTES"))
    P.save(out, "7", "Unit 7: Gases")
    return out, lib.FLOW


if __name__ == "__main__":
    for T in (False, True):
        out, fl = build(T)
        print(out)
        print("  est. pages:", fl.page, "last page fill:", round(fl.cur, 1), "in")
        for m in fl.marks:
            print("   ", m)
