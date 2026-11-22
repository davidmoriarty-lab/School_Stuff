"""The 20 ACS-style multiple-choice questions (shared by the notes packet and the slide deck)."""
import random


def arranged(seed=7):
    """Returns [(stem, options, index_of_correct, why)] with the correct letter spread over A-D."""
    rnd = random.Random(seed)
    sched = list("ABCD" * 5)
    while True:
        rnd.shuffle(sched)
        if all(not (sched[i] == sched[i + 1] == sched[i + 2]) for i in range(18)):
            break
    Q = []

    def q(stem, correct, wrong, why):
        Q.append((stem, correct, wrong, why))

    q("For the reaction of 1-chloropentane with NaCN in DMSO, which statement is FALSE?",
      "The reaction proceeds through a carbocation intermediate",
      ["The process is bimolecular", "Doubling the concentration of cyanide doubles the rate", "DMSO increases the rate compared with methanol"],
      "A primary halide with a strong nucleophile reacts by SN2: one concerted step, no carbocation.")
    q("Which of the following is NOT favorable for an SN2 reaction?",
      "A tertiary alkyl halide", ["A good leaving group on a primary carbon", "A polar aprotic solvent", "A strong, unhindered nucleophile"],
      "Three alkyl groups on the α carbon block backside attack.")
    q("The rate law for an SN2 reaction is rate = k[RBr][CN⁻]. If both concentrations are doubled, the rate…",
      "increases by a factor of four", ["is unchanged", "doubles", "increases by a factor of eight"], "2 × 2 = 4.")
    q("Which rate law is expected for the solvolysis of 2-bromo-2-methylpropane in ethanol?",
      "rate = k[RBr]", ["rate = k[RBr][EtOH]", "rate = k[RBr][Br⁻]", "rate = k[RBr]²"],
      "The slow step is ionization of the alkyl halide alone (SN1/E1).")
    q("Which two mechanisms involve a carbocation intermediate?  I. SN1   II. SN2   III. E1   IV. E2",
      "I and III", ["I and II", "II and IV", "III and IV"], "SN1 and E1 share the carbocation; SN2 and E2 are concerted.")
    q("Which of the following is a polar aprotic solvent?",
      "Dimethyl sulfoxide (DMSO)", ["Ethanol", "Water", "Acetic acid"], "DMSO is polar but has no O–H or N–H bond.")
    q("Potassium tert-butoxide (t-BuOK) reacting with a secondary alkyl bromide mainly promotes which mechanism?",
      "E2", ["SN1", "SN2", "E1"], "A bulky strong base is a poor nucleophile: it acts as a base.")
    q("Which compound reacts fastest with NaN₃ in acetone?",
      "CH₃Br", ["CH₃CH₂Br", "(CH₃)₂CHBr", "(CH₃)₃CBr"], "Methyl > 1° > 2° >> 3° for SN2.")
    q("Which substrate undergoes the fastest solvolysis in ethanol?",
      "tert-butyl iodide", ["tert-butyl chloride", "isopropyl iodide", "ethyl iodide"],
      "A 3° substrate (stable carbocation) with the best leaving group, iodide.")
    q("In methanol (a protic solvent), which halide ion is the best nucleophile toward CH₃I?",
      "I⁻", ["Br⁻", "Cl⁻", "F⁻"], "Large, polarizable, and weakly solvated: I⁻ (Table 7.5: 43, 1, 0.04, 0.0006).")
    q("Changing the solvent from methanol to DMF increases the SN2 rate the most for which nucleophile?",
      "F⁻", ["I⁻", "Br⁻", "Cl⁻"], "F⁻ is strongly caged by H-bonds in MeOH; its rate rises about 82-million-fold in DMF.")
    q("What is the major product of 2-bromo-2-methylbutane with NaOEt in EtOH?",
      "2-methyl-2-butene", ["2-methyl-1-butene", "2-ethoxy-2-methylbutane", "3-methyl-1-butene"],
      "A 3° halide with a strong base gives E2; the small base gives the Zaitsev alkene.")
    q("What is the major product of 2-bromo-2-methylbutane with t-BuOK in t-BuOH?",
      "2-methyl-1-butene", ["2-methyl-2-butene", "2-tert-butoxy-2-methylbutane", "2-methyl-2-butanol"],
      "The hindered base removes the more accessible H: the Hofmann product.")
    q("(S)-2-Bromobutane reacts with NaCN in DMSO. The major product is…",
      "(R)-2-methylbutanenitrile", ["(S)-2-methylbutanenitrile", "racemic 2-methylbutanenitrile", "1-butene"],
      "SN2 gives inversion, and CN and Br both have top priority, so S becomes R.")
    q("(S)-3-Bromo-3-methylhexane is warmed in water. The substitution product is…",
      "a nearly racemic mixture of 3-methylhexan-3-ol", ["only (R)-3-methylhexan-3-ol", "only (S)-3-methylhexan-3-ol",
                                                          "3-methylhexan-3-ol with complete inversion"],
      "The planar carbocation is attacked from either face (SN1).")
    q("What is the major product of 1-bromobutane with NaOEt in ethanol?",
      "1-ethoxybutane", ["1-butene", "2-ethoxybutane", "1-butanol"], "A primary halide with a strong, unhindered nucleophile: SN2.")
    q("Which substrate is most likely to give a rearranged product when it ionizes in ethanol?",
      "2-bromo-3,3-dimethylbutane", ["2-bromo-2-methylpropane", "2-bromo-2-methylbutane", "bromoethane"],
      "The secondary carbocation is next to a quaternary carbon, so a methyl shift gives a more stable 3° carbocation.")
    q("Which reagent converts 2-methyl-2-butanol into an alkene?",
      "conc. H₂SO₄, heat", ["NaOH", "HBr", "NaCl"], "Acid protonates OH; water leaves (E1) and a β proton is removed.")
    q("Which is the best synthesis of methyl tert-butyl ether, (CH₃)₃COCH₃?",
      "(CH₃)₃CONa + CH₃I", ["CH₃ONa + (CH₃)₃CBr", "CH₃ONa + (CH₃)₃COH", "(CH₃)₃CBr + NaOH, then CH₃OH"],
      "SN2 needs the methyl electrophile; a tertiary halide with a strong base gives E2.")
    q("(R)-2-Butanol is treated with 1) TsCl, pyridine and 2) NaBr. The product is…",
      "(S)-2-bromobutane", ["(R)-2-bromobutane", "racemic 2-bromobutane", "2-butene"],
      "Tosylation retains configuration (the C–O bond is not broken); SN2 by bromide then inverts it: R to S.")
    assert len(Q) == 20
    out = []
    for k, (stem, correct, wrong, why) in enumerate(Q):
        pos = "ABCD".index(sched[k])
        opts = list(wrong)
        opts.insert(pos, correct)
        out.append((stem, opts, pos, why))
    return out
