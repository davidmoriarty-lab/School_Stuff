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


def plan(prs):
    """The deck as a list of zero-argument slide builders (so the audit can rebuild any slide in any click state)."""
    P = []
    add = lambda f, *a: P.append(lambda: f(prs, *a))
    add(title_slide); add(s1.roadmap); add(s1.equation_sheet)
    add(div, 1); [add(f) for f in (s1.s1_energy_flow, s1.s1_examples, s1.s1_bonds, s1.s1_profiles, s1.s1_ex11)]
    add(div, 2); [add(f) for f in (s1.s2_hot_cold, s1.s2_heat_capacity, s1.s2_equation, s1.s2_ex21, s1.s2_ex22, s1.s2_ex23, s1.s2_ex24)]
    add(div, 3); [add(f) for f in (s1.s3_curve, s1.s3_cooling, s1.s3_two_kinds, s1.s3_ex31)]
    add(div, 4); [add(f) for f in (s2.s4_one_mole, s2.s4_map, s2.s4_ex41, s2.s4_ex42, s2.s4_ex43, s2.s4_calorimeter, s2.s4_ex44, s2.s4_ex45, s2.s4_ex46)]
    add(div, 5); [add(f) for f in (s2.s5_formation, s2.s5_ex51, s2.s5_bonds)]
    add(div, 6); [add(f) for f in (s2.s6_path, s2.s6_rules, s2.s6_ex61, s2.s6_ex62)]
    add(div, 7); [add(f) for f in (s3.s7_microstates, s3.s7_states, s3.s7_expansion, s3.s7_rules, s3.s7_ex71, s3.s7_ex72)]
    add(div, 8); [add(f) for f in (s3.s8_tug, s3.s8_cases, s3.s8_kinetics, s3.s8_ex81, s3.s8_ex82)]
    add(div, 9); [add(f) for f in (s3.s9_valley, s3.s9_k_valleys, s3.s9_cheat, s3.s9_ex91, s3.s9_ex92, s3.s9_ex93, s3.s9_coupled)]
    add(s3.summary); add(s3.appendix_divider)
    for n in range(1, 21):
        add(s3.warmup, n)
    return P


def build(prs):
    for f in plan(prs):
        f()


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "AP Chem Unit 6 - Thermochemistry and Free Energy - SLIDES.pptx")
    prs = new_prs()
    build(prs)
    prs.save(out)
    print("saved", out, len(prs.slides), "slides")
