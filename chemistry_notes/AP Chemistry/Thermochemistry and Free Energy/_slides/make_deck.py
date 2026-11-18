"""Builds the AP Chem Unit 6 slide deck.  Run:  python3 make_deck.py [out.pptx]
Set DECK_FINAL=1 to draw every slide as it looks after its last click (used for visual QA)."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from core import *
import s1, s2, s3

SECTION_INFO = {
    1: ("When a reaction happens, where does the energy go?", "Endothermic and exothermic changes  •  reaction profiles  •  activation energy", "6.1, 6.2"),
    2: ("Why does a metal spoon get hot so much faster than a pot of water?", "Thermal equilibrium  •  specific heat  •  q = mcΔT", "6.3, 6.4"),
    3: ("Why does the temperature stop rising while ice is melting?", "Heating curves  •  q = mcΔT vs q = nΔH", "6.5"),
    4: ("How do we measure the energy of a reaction we cannot see?", "ΔH per mole of reaction  •  limiting reactants  •  calorimetry", "6.6, 6.4"),
    5: ("Can we predict a reaction's energy without running it?", "Enthalpy of formation  •  bond enthalpies", "6.7, 6.8"),
    6: ("Does the path matter, or only the start and the finish?", "Hess's law: reverse, multiply, add", "6.9"),
    7: ("Why does a drop of dye spread out and never un-spread?", "Microstates  •  predicting the sign of ΔS  •  ΔS° from tables", "9.1, 9.2"),
    8: ("What decides whether a reaction will happen at all?", "ΔG = ΔH − TΔS  •  temperature  •  thermodynamics vs kinetics", "9.3, 9.4"),
    9: ("How does free energy tell us where a reaction ends up?", "ΔG° and K  •  ΔG, Q and K  •  coupled reactions", "9.5, 9.6"),
}


def div(prs, n):
    q, topics, ced = SECTION_INFO[n]
    divider(prs, n, q, topics, ced)


def build(prs):
    title_slide(prs)
    s1.roadmap(prs)
    s1.equation_sheet(prs)
    # Section 1
    div(prs, 1); s1.s1_energy_flow(prs); s1.s1_examples(prs); s1.s1_bonds(prs); s1.s1_profiles(prs); s1.s1_ex11(prs)
    # Section 2
    div(prs, 2); s1.s2_hot_cold(prs); s1.s2_heat_capacity(prs); s1.s2_equation(prs); s1.s2_ex21(prs); s1.s2_ex22(prs); s1.s2_ex23(prs); s1.s2_ex24(prs)
    # Section 3
    div(prs, 3); s1.s3_curve(prs); s1.s3_two_kinds(prs); s1.s3_ex31(prs)
    # Section 4
    div(prs, 4); s2.s4_one_mole(prs); s2.s4_map(prs); s2.s4_ex41(prs); s2.s4_ex42(prs); s2.s4_ex43(prs)
    s2.s4_calorimeter(prs); s2.s4_ex44(prs); s2.s4_ex45(prs); s2.s4_ex46(prs)
    # Section 5
    div(prs, 5); s2.s5_formation(prs); s2.s5_ex51(prs); s2.s5_bonds(prs)
    # Section 6
    div(prs, 6); s2.s6_path(prs); s2.s6_rules(prs); s2.s6_ex61(prs); s2.s6_ex62(prs)
    # Section 7
    div(prs, 7); s3.s7_microstates(prs); s3.s7_states(prs); s3.s7_expansion(prs); s3.s7_rules(prs); s3.s7_ex71(prs); s3.s7_ex72(prs)
    # Section 8
    div(prs, 8); s3.s8_tug(prs); s3.s8_cases(prs); s3.s8_kinetics(prs); s3.s8_ex81(prs); s3.s8_ex82(prs)
    # Section 9
    div(prs, 9); s3.s9_valley(prs); s3.s9_k_valleys(prs); s3.s9_cheat(prs); s3.s9_ex91(prs); s3.s9_ex92(prs); s3.s9_ex93(prs); s3.s9_coupled(prs)
    # wrap-up and warm-ups
    s3.summary(prs)
    s3.appendix_divider(prs); s3.warmups(prs)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "AP Chem Unit 6 - Thermochemistry and Free Energy - SLIDES.pptx")
    prs = new_prs()
    build(prs)
    prs.save(out)
    print("saved", out, len(prs.slides), "slides")
