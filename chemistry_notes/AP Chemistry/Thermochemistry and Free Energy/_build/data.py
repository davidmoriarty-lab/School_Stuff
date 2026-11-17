"""Every number in the Thermochemistry and Free Energy notes, computed here and checked with asserts.

Atomic masses to 0.01 g/mol; c(water) = 4.184 J/g·°C; R = 8.314 J/mol·K; T = 298 K unless stated.
"""
import math

CW = 4.184
R = 8.314
T0 = 298.0

SUP = str.maketrans("0123456789-+", "⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺")


def sig(x, n):
    """x to n significant figures, as plain text (no trailing-zero tricks)."""
    if x == 0:
        return "0"
    d = n - int(math.floor(math.log10(abs(x)))) - 1
    v = round(x, d)
    return ("%." + str(max(d, 0)) + "f") % v


def sci(x, n):
    """x in scientific notation with n sig figs, using unicode superscripts."""
    e = int(math.floor(math.log10(abs(x))))
    m = x / 10 ** e
    if round(m, n - 1) >= 10:
        m /= 10; e += 1
    return "%.*f × 10%s" % (n - 1, m, str(e).translate(SUP))


# ------------------------------------------------------------------ Section 2: heat capacity
E2_2 = dict(m=25.0, dT=5.0)
E2_2["q"] = E2_2["m"] * CW * E2_2["dT"]                       # 523 J
mm_CH2Cl2 = 12.01 + 2 * 1.01 + 2 * 35.45
E2_3 = dict(n=1.50, q=750.0, c=1.188, Ti=25.0)
E2_3["m"] = E2_3["n"] * mm_CH2Cl2
E2_3["dT"] = E2_3["q"] / (E2_3["m"] * E2_3["c"])
E2_3["Tf"] = E2_3["Ti"] + E2_3["dT"]
E2_4 = dict(m_metal=50.0, T_metal=95.0, m_w=100.0, T_w=21.0, Tf=25.0)
E2_4["q_w"] = E2_4["m_w"] * CW * (E2_4["Tf"] - E2_4["T_w"])
E2_4["c"] = E2_4["q_w"] / (E2_4["m_metal"] * (E2_4["T_metal"] - E2_4["Tf"]))
assert round(E2_2["q"]) == 523 and round(E2_3["Tf"], 1) == 30.0 and round(E2_4["c"], 3) == 0.478

# ------------------------------------------------------------------ Section 3: heating curve
MM_H2O = 18.02
E3 = dict(m=50.0, c_l=CW, c_g=1.90, dHvap=40.7)
E3["q1"] = E3["m"] * E3["c_l"] * (100.0 - 25.0)                # J
E3["q2"] = E3["m"] / MM_H2O * E3["dHvap"] * 1000               # J
E3["q3"] = E3["m"] * E3["c_g"] * (115.0 - 100.0)               # J
E3["tot"] = E3["q1"] + E3["q2"] + E3["q3"]
assert round(E3["tot"] / 1000) == 130

# ------------------------------------------------------------------ Section 4: enthalpy of reaction
MM_H2 = 2.02
E4_1 = dict(g=15.0, dH=-58.0)
E4_1["n"] = E4_1["g"] / MM_H2
E4_1["nrxn"] = E4_1["n"] / 2
E4_1["q"] = E4_1["nrxn"] * E4_1["dH"]
MM_NO = 14.01 + 16.00
E4_2 = dict(g=15.0, q=45.0)
E4_2["n"] = E4_2["g"] / MM_NO
E4_2["nrxn"] = E4_2["n"] / 2
E4_2["dH"] = E4_2["q"] / E4_2["nrxn"]
E4_3 = dict(g_al=1.750, M=0.250, V=0.1000, q=-10.0)
E4_3["n_al"] = E4_3["g_al"] / 26.98
E4_3["n_cu"] = E4_3["M"] * E4_3["V"]
E4_3["rxn_al"] = E4_3["n_al"] / 2
E4_3["rxn_cu"] = E4_3["n_cu"] / 3
E4_3["nrxn"] = min(E4_3["rxn_al"], E4_3["rxn_cu"])
E4_3["dH"] = E4_3["q"] / E4_3["nrxn"]
mm_NH4Cl = 14.01 + 4 * 1.01 + 35.45
E4_4 = dict(g=5.9, m_w=50.0, Ti=35.0, Tf=30.0)
E4_4["n"] = E4_4["g"] / mm_NH4Cl
E4_4["q_soln"] = E4_4["m_w"] * CW * (E4_4["Tf"] - E4_4["Ti"])
E4_4["q_rxn"] = -E4_4["q_soln"]
E4_4["dH"] = E4_4["q_rxn"] / 1000 / E4_4["n"]
mm_NaOH = 22.99 + 16.00 + 1.01
E4_5 = dict(g=2.50, m_w=50.0, Ti=25.0, dH=-45.0)
E4_5["n"] = E4_5["g"] / mm_NaOH
E4_5["q"] = -E4_5["n"] * E4_5["dH"] * 1000               # J released
E4_5["dT"] = E4_5["q"] / (E4_5["m_w"] * CW)
E4_5["Tf"] = E4_5["Ti"] + E4_5["dT"]
E4_6 = dict(V_hcl=50.0, V_naoh=100.0, M=1.0, dT=4.6)
E4_6["n_hcl"] = E4_6["V_hcl"] / 1000 * E4_6["M"]
E4_6["n_naoh"] = E4_6["V_naoh"] / 1000 * E4_6["M"]
E4_6["m"] = E4_6["V_hcl"] + E4_6["V_naoh"]
E4_6["q"] = E4_6["m"] * CW * E4_6["dT"]
E4_6["dH"] = -E4_6["q"] / 1000 / min(E4_6["n_hcl"], E4_6["n_naoh"])
assert round(E4_1["q"]) == -215 and round(E4_2["dH"]) == 180 and round(E4_3["dH"], -1) == -1200
assert round(E4_4["dH"], 1) == 9.5 and round(E4_5["Tf"], 1) == 38.4 and round(E4_6["dH"]) == -58

# ------------------------------------------------------------------ Section 5: formation and bond enthalpies
HF = {"C3H8": -103.8, "CO2": -393.5, "H2O(l)": -286.0, "O2": 0.0}
E5_1 = 3 * HF["CO2"] + 4 * HF["H2O(l)"] - (HF["C3H8"] + 5 * HF["O2"])
BE = {"C–H": 413, "O=O": 498, "C=O": 799, "O–H": 463}
E5_2_broken = 4 * BE["C–H"] + 2 * BE["O=O"]
E5_2_formed = 2 * BE["C=O"] + 4 * BE["O–H"]
E5_2 = E5_2_broken - E5_2_formed
assert round(E5_1) == -2221 and E5_2 == -802

# ------------------------------------------------------------------ Section 6: Hess's law
E6_1 = -(-335) + (-17) + (-242)                                 # reverse (1), keep (2), keep (3)
E6_2 = 177.4 - (-191.2) + 2 * (-241.8) + 2 * (-43.8)
assert E6_1 == 76 and round(E6_2, 1) == -202.6

# ------------------------------------------------------------------ Section 7: entropy
S = {"NO": 211.0, "O2": 205.0, "NO2": 240.0}
E7_dS = 2 * S["NO2"] - (2 * S["NO"] + S["O2"])
assert E7_dS == -147.0

# ------------------------------------------------------------------ Section 8: Gibbs
E8_2 = dict(dH=192.0, dS=373.0)
E8_2["dG"] = E8_2["dH"] - T0 * E8_2["dS"] / 1000
E8_2["T"] = E8_2["dH"] / (E8_2["dS"] / 1000)
assert round(E8_2["dG"], 1) == 80.8 and round(E8_2["T"]) == 515

# ------------------------------------------------------------------ Section 9: free energy and equilibrium
E9_1 = dict(dH=17.0, dS=291.0)
E9_1["dG"] = E9_1["dH"] - T0 * E9_1["dS"] / 1000
E9_1["lnK"] = -E9_1["dG"] * 1000 / (R * T0)
E9_1["K"] = math.exp(E9_1["lnK"])
E9_1["dG315"] = E9_1["dH"] - 315.0 * E9_1["dS"] / 1000
E9_2 = dict(G_p4=24.4, G_cl2=0.0, G_pcl3=-270.0)
E9_2["dG"] = 4 * E9_2["G_pcl3"] - (E9_2["G_p4"] + 6 * E9_2["G_cl2"])
E9_3 = dict(dH=-112.0, dS=E7_dS)
E9_3["dG"] = E9_3["dH"] - T0 * E9_3["dS"] / 1000
E9_3["lnK"] = -E9_3["dG"] * 1000 / (R * T0)
E9_3["K"] = math.exp(E9_3["lnK"])
E9_4 = dict(g1=13.8, g2=-30.5)
E9_4["net"] = E9_4["g1"] + E9_4["g2"]
assert round(E9_1["dG"], 1) == -69.7 and E9_1["dG315"] < E9_1["dG"] < 0
assert round(E9_2["dG"], 1) == -1104.4
assert round(E9_3["dG"], 1) == -68.2 and 8e11 < E9_3["K"] < 1e12
assert round(E9_4["net"], 1) == -16.7

# ------------------------------------------------------------------ 20 warm-up multiple-choice questions
# (section, question, correct, [3 wrong], explanation);  the correct choice goes in slot POS[i] (0 = A ... 3 = D)
POS = [2, 0, 3, 1, 1, 3, 0, 2, 0, 2, 1, 3, 3, 1, 2, 0, 2, 0, 3, 1]

q4 = 40.0 * CW * 15.0
c5 = (100.0 * CW * 2.5) / (25.0 * (98.0 - 24.5))
q7 = 36.0 / MM_H2O * 6.01
n8 = 22.0 / 44.11
q8 = n8 * 2220
dH9 = -(100.0 * CW * 3.00 / 1000) / 0.0200
dH10 = 2 * 33.2 - 2 * 90.3
dH11 = (436 + 243) - 2 * 431
dS15 = 2 * 192.5 - (191.6 + 3 * 130.7)
T16 = 50.0 * 1000 / 120.0
dG17 = -92.0 - T0 * (-199.0) / 1000
K19 = math.exp(20000 / (R * T0))
assert round(q4) == 2510 and round(c5, 3) == 0.569 and round(q7, 1) == 12.0 and round(q8) == 1107
assert round(dH9, 1) == -62.8 and round(dH10, 1) == -114.2 and dH11 == -183 and round(dS15, 1) == -198.7
assert round(T16) == 417 and round(dG17, 1) == -32.7 and 3.1e3 < K19 < 3.3e3

MC = [
    ("1", "Which of the following processes is endothermic?",
     "Sublimation of dry ice, CO₂(s) → CO₂(g)",
     ["Condensation of steam on a cold window", "Freezing of liquid water into ice", "Combustion of methane in a burner"],
     "Sublimation requires energy to overcome the attractions between molecules, so it is endothermic. The other three release energy."),
    ("1", "A reaction profile shows the reactants at 50 kJ, the top of the barrier at 130 kJ and the products at 20 kJ. What are ΔH and the forward activation energy?",
     "ΔH = −30 kJ and Ea = 80 kJ",
     ["ΔH = +30 kJ and Ea = 80 kJ", "ΔH = −30 kJ and Ea = 110 kJ", "ΔH = +30 kJ and Ea = 110 kJ"],
     "ΔH = E(products) − E(reactants) = 20 − 50 = −30 kJ. Ea(forward) = top − reactants = 130 − 50 = 80 kJ. (110 kJ is the reverse barrier.)"),
    ("2", "A hot piece of metal is dropped into cool water in an insulated cup. Which statement is true once thermal equilibrium is reached?",
     "The metal and water are at the same temperature, and the energy lost by the metal equals the energy gained by the water.",
     ["The metal and water have the same total thermal energy.", "The temperature of the water rises by the same number of degrees that the metal's falls.",
      "Energy continues to flow from the metal to the water at a slower rate."],
     "Heat flows until the temperatures match, and energy is conserved (q_metal = −q_water). The temperature changes differ unless the masses and specific heats are equal, and no net heat flows at equilibrium."),
    ("2", "How much energy is needed to raise the temperature of 40.0 g of water from 20.0 °C to 35.0 °C? (c = 4.184 J/g·°C)",
     sig(q4 / 1000, 3) + " kJ", [sig(40.0 * CW / 1000, 3) + " kJ", sig(40.0 * CW * 55.0 / 1000, 3) + " kJ", sig(CW * 15.0 / 1000, 3) + " kJ"],
     "q = mcΔT = (40.0 g)(4.184 J/g·°C)(15.0 °C) = 2510 J = 2.51 kJ. ΔT is a difference (35.0 − 20.0), not a sum."),
    ("2", "A 25.0 g sample of a metal at 98.0 °C is placed in 100.0 g of water at 22.0 °C in an insulated cup. The final temperature is 24.5 °C. What is the specific heat of the metal?",
     sig(c5, 3) + " J/g·°C", [sig(100.0 * CW * 2.5 / (100.0 * 73.5), 3) + " J/g·°C", sig(100.0 * CW * 2.5 / (25.0 * 98.0), 3) + " J/g·°C", sig(100.0 * CW * 2.5 / (25.0 * 2.5), 3) + " J/g·°C"],
     "q_water = (100.0)(4.184)(2.5) = 1046 J gained, so the metal lost 1046 J. c = 1046 ÷ [(25.0)(98.0 − 24.5)] = 0.569 J/g·°C. The metal's ΔT is 73.5 °C, not 2.5 °C."),
    ("3", "During the melting of a pure solid at its melting point, the temperature stays constant even though energy is being added. Which statement explains this?",
     "The added energy increases the potential energy of the particles as attractions are overcome, so the average kinetic energy does not change.",
     ["The substance stops absorbing energy while it melts.", "The added energy is lost to the surroundings as fast as it is added.",
      "The average kinetic energy of the particles increases, but a thermometer cannot detect it."],
     "Temperature measures average kinetic energy. During a phase change the energy goes into potential energy (separating the particles), so the temperature stays constant."),
    ("3", "How much energy is required to melt 36.0 g of ice at 0 °C? (ΔH_fus = 6.01 kJ/mol; molar mass of H₂O = 18.02 g/mol)",
     sig(q7, 3) + " kJ", [sig(36.0 * 6.01, 3) + " kJ", sig(6.01 / (36.0 / MM_H2O), 3) + " kJ", sig(36.0 / 6.01, 3) + " kJ"],
     "36.0 g × (1 mol ÷ 18.02 g) = 2.00 mol; 2.00 mol × 6.01 kJ/mol = 12.0 kJ. ΔH_fus is per mole, so convert grams to moles first."),
    ("4", "C₃H₈ + 5 O₂ → 3 CO₂ + 4 H₂O ΔH = −2220 kJ/mol_rxn. How much energy is released when 22.0 g of C₃H₈ (44.11 g/mol) burns completely?",
     sci(q8, 3) + " kJ released", [sci(q8, 3) + " kJ absorbed", sci(22.0 * 2220, 3) + " kJ released", sci(2220, 3) + " kJ released"],
     "22.0 g ÷ 44.11 g/mol = 0.499 mol C₃H₈, which is 0.499 mol of reaction (coefficient 1). 0.499 × 2220 kJ = 1.11 × 10³ kJ, released because ΔH is negative."),
    ("4", "When 0.0200 mol of a solid dissolves in 100.0 g of water in a coffee-cup calorimeter, the temperature rises by 3.00 °C. What is ΔH for the dissolving? (c = 4.184 J/g·°C)",
     sig(dH9, 3) + " kJ/mol", ["+" + sig(-dH9, 3) + " kJ/mol", sig(dH9 * 0.0200, 3) + " kJ/mol", sci(dH9 * 1000, 3) + " kJ/mol"],
     "q_solution = (100.0)(4.184)(3.00) = 1255 J = 1.255 kJ gained by the water, so the dissolving released it: q_rxn = −1.255 kJ. ΔH = −1.255 kJ ÷ 0.0200 mol = −62.8 kJ/mol."),
    ("5", "2 NO(g) + O₂(g) → 2 NO₂(g). ΔH°f: NO = +90.3 kJ/mol, NO₂ = +33.2 kJ/mol. What is ΔH°rxn?",
     sig(dH10, 4) + " kJ/mol_rxn", ["+" + sig(-dH10, 4) + " kJ/mol_rxn", sig(33.2 - 90.3, 3) + " kJ/mol_rxn", "+" + sig(2 * 33.2 + 2 * 90.3, 4) + " kJ/mol_rxn"],
     "ΔH°rxn = ΣnΔH°f(products) − ΣnΔH°f(reactants) = 2(33.2) − [2(90.3) + 0] = −114.2 kJ. O₂ is an element in its standard state, so its ΔH°f is 0. Remember the coefficients."),
    ("5", "H₂(g) + Cl₂(g) → 2 HCl(g). Bond enthalpies: H–H = 436, Cl–Cl = 243, H–Cl = 431 kJ/mol. What is ΔH for the reaction?",
     sig(dH11, 3) + " kJ/mol_rxn", ["+183 kJ/mol_rxn", "−862 kJ/mol_rxn", "−431 kJ/mol_rxn"],
     "ΔH = (bonds broken) − (bonds formed) = (436 + 243) − 2(431) = 679 − 862 = −183 kJ. Energy is released because the bonds formed are stronger than the bonds broken."),
    ("6", "A → B ΔH = +40 kJ and B → C ΔH = −90 kJ. What is ΔH for 2 C → 2 A?",
     "+100 kJ", ["−100 kJ", "+50 kJ", "−50 kJ"],
     "A → C is +40 + (−90) = −50 kJ. Reversing gives C → A = +50 kJ, and doubling gives 2 C → 2 A = +100 kJ."),
    ("6", "N₂(g) + O₂(g) → 2 NO(g) ΔH = +180 kJ and 2 NO(g) + O₂(g) → 2 NO₂(g) ΔH = −114 kJ. What is ΔH for N₂(g) + 2 O₂(g) → 2 NO₂(g)?",
     "+66 kJ", ["−66 kJ", "+294 kJ", "−294 kJ"],
     "Add the two steps; 2 NO cancels. ΔH = (+180) + (−114) = +66 kJ."),
    ("7", "Which change has a negative ΔS?",
     "2 H₂(g) + O₂(g) → 2 H₂O(l)", ["NH₄NO₃(s) dissolving in water", "CaCO₃(s) → CaO(s) + CO₂(g)", "Liquid water boiling to steam"],
     "Three moles of gas become a liquid, a large loss of microstates. The other three all increase the freedom of the particles (dissolving, forming a gas, liquid to gas)."),
    ("7", "N₂(g) + 3 H₂(g) → 2 NH₃(g). S°: N₂ = 191.6, H₂ = 130.7, NH₃ = 192.5 J/mol·K. What is ΔS°rxn?",
     sig(dS15, 4) + " J/mol·K", ["+" + sig(-dS15, 4) + " J/mol·K", "+" + sig(2 * 192.5 - (191.6 + 130.7), 3) + " J/mol·K", sig(-(191.6 + 3 * 130.7), 4) + " J/mol·K"],
     "ΔS° = ΣnS°(products) − ΣnS°(reactants) = 2(192.5) − [191.6 + 3(130.7)] = 385.0 − 583.7 = −198.7 J/mol·K. Four moles of gas become two, so a decrease is expected."),
    ("8", "A reaction has ΔH = +50.0 kJ/mol_rxn and ΔS = +120 J/mol·K. Under what conditions is it thermodynamically favorable?",
     "T > 417 K", ["T < 417 K", "At all temperatures", "At no temperature"],
     "Both ΔH and ΔS are positive, so ΔG = ΔH − TΔS is negative only at high temperature. ΔG = 0 at T = ΔH ÷ ΔS = 50,000 J ÷ 120 J/K = 417 K."),
    ("8", "A reaction has ΔH = −92 kJ and ΔS = −199 J/mol·K. What is ΔG at 298 K?",
     sig(dG17, 3) + " kJ", ["−151 kJ", "+" + sig(-dG17, 3) + " kJ", "+" + sci(92.0 * -1 + T0 * 199.0, 3) + " kJ"],
     "ΔG = ΔH − TΔS = −92 kJ − (298 K)(−0.199 kJ/mol·K) = −92 + 59.3 = −32.7 kJ. Convert ΔS to kJ before combining it with ΔH."),
    ("8", "A reaction has ΔG° < 0, yet no change is observed when the reactants are mixed at room temperature. Which is the best explanation?",
     "The reaction is thermodynamically favorable but has a high activation energy, so it is extremely slow.",
     ["ΔG° < 0 means the reaction is actually not favorable.", "A negative ΔG° means a catalyst must be present.", "The reaction is endothermic, so energy must be added."],
     "ΔG° tells whether a reaction is favorable (thermodynamics), not how fast it goes (kinetics). A high activation energy can make a favorable reaction too slow to observe."),
    ("9", "A reaction has ΔG° = −20.0 kJ/mol at 298 K. Which is closest to its equilibrium constant? (R = 8.314 J/mol·K)",
     sci(K19, 2), [sci(1 / K19, 2), sig(20000 / (R * T0), 3), "1.0"],
     "ΔG° = −RT ln K, so ln K = 20,000 ÷ (8.314 × 298) = 8.07 and K = e^8.07 = 3.2 × 10³. A negative ΔG° means K > 1."),
    ("9", "At a certain moment a reaction mixture has Q = 1.0 × 10⁻³ and the equilibrium constant is K = 5.0 × 10². Which statement is correct?",
     "ΔG < 0 and the reaction proceeds toward products.", ["ΔG > 0 and the reaction proceeds toward products.", "ΔG < 0 and the reaction proceeds toward reactants.", "ΔG = 0 and the system is at equilibrium."],
     "Q < K, so there are too many reactants and too few products. ΔG = ΔG° + RT ln Q is negative and the reaction runs forward until Q = K."),
]
assert len(MC) == 20 and len(POS) == 20 and all(POS.count(k) == 5 for k in range(4))
for _t, _q, _right, _wrong, _why in MC:
    assert len(_wrong) == 3 and _right not in _wrong and len(set(_wrong)) == 3, _q


# proper minus signs at the start of numeric answer choices
def _neg(t):
    return "−" + t[1:] if t[:1] == "-" else t
MC = [(a, b, _neg(c), [_neg(w) for w in ws], e) for (a, b, c, ws, e) in MC]
