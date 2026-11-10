/* chem-data.js: elements, bond (Morse) parameters and the reaction presets.
 *
 * Every reaction here is an "atom transfer":   A + B–C  →  A–B + C
 * A, B and C are atoms or small groups treated as one particle (e.g. CH3).
 * Bond energies D are textbook bond enthalpies (kJ/mol), re is the bond length (Å),
 * beta sets how narrow the Morse well is (1/Å).
 */
(function (root) {
  'use strict';

  // color = ball color; cloud = electron cloud tint; rcov / rvdw in Å; en = Pauling electronegativity
  const ELEMENTS = {
    H:  { name: 'hydrogen', mass: 1.008,  color: '#e8ecf1', cloud: [150, 190, 235], rcov: 0.31, rvdw: 1.20, en: 2.20 },
    C:  { name: 'carbon',   mass: 12.011, color: '#5b6470', cloud: [140, 150, 165], rcov: 0.76, rvdw: 1.70, en: 2.55 },
    N:  { name: 'nitrogen', mass: 14.007, color: '#4f74e3', cloud: [90, 125, 235],  rcov: 0.71, rvdw: 1.55, en: 3.04 },
    O:  { name: 'oxygen',   mass: 15.999, color: '#e2493f', cloud: [235, 95, 85],   rcov: 0.66, rvdw: 1.52, en: 3.44 },
    F:  { name: 'fluorine', mass: 18.998, color: '#9bd94a', cloud: [150, 215, 80],  rcov: 0.57, rvdw: 1.47, en: 3.98 },
    Cl: { name: 'chlorine', mass: 35.45,  color: '#35b86b', cloud: [60, 190, 115],  rcov: 1.02, rvdw: 1.75, en: 3.16 },
    Br: { name: 'bromine',  mass: 79.904, color: '#b0553a', cloud: [190, 100, 70],  rcov: 1.20, rvdw: 1.85, en: 2.96 },
    X:  { name: 'atom A',   mass: 20,     color: '#f2a93b', cloud: [240, 175, 70],  rcov: 0.70, rvdw: 1.50, en: 3.0 },
    Y:  { name: 'atom B',   mass: 12,     color: '#59b5e8', cloud: [95, 180, 235],  rcov: 0.60, rvdw: 1.40, en: 2.6 },
    Z:  { name: 'atom C',   mass: 20,     color: '#c583e6', cloud: [195, 135, 230], rcov: 0.70, rvdw: 1.50, en: 2.8 }
  };

  // Morse parameters for each pair: D (kJ/mol), re (Å), beta (1/Å)
  const M = (D, re, beta) => ({ D, re, beta });

  /* A particle = { el, label, deco } where deco lists extra atoms drawn attached to it.
   * deco entries: { el, d (bond length Å), ang (degrees, in the particle's own frame) }.
   * The particle frame's +x axis points away from the atom it is (or will be) bonded to;
   * 'umbrella' marks CH3-type hydrogens that flatten or flip as the reaction goes.
   */
  const CH3 = (mode) => ({ el: 'C', label: 'C', group: 'CH₃', mass: 15.035, umbrella: mode,
    deco: [{ el: 'H', d: 1.09, ang: 0, slot: 0 }, { el: 'H', d: 1.09, ang: 0, slot: 1 }, { el: 'H', d: 1.09, ang: 0, slot: 2 }] });

  const REACTIONS = [
    {
      id: 'F_H2', level: 'core',
      name: 'F + H₂ → HF + H', short: 'Fluorine atom + hydrogen',
      blurb: 'Strongly exothermic with a tiny barrier. The transition state comes early and looks like the reactants.',
      A: { el: 'F', label: 'F' }, B: { el: 'H', label: 'H' }, C: { el: 'H', label: 'H' },
      mech: 'radical',
      AB: M(567, 0.917, 2.22), BC: M(436, 0.741, 1.94), AC: M(567, 0.917, 2.22),
      EaTarget: 6, formulas: { A: 'F', BC: 'H₂', AB: 'HF', C: 'H' }
    },
    {
      id: 'H_H2', level: 'core',
      name: 'H + H₂ → H₂ + H', short: 'Hydrogen exchange',
      blurb: 'The simplest reaction there is. Reactants and products are the same, so ΔH = 0, but there is still a hill to climb.',
      A: { el: 'H', label: 'H_a' }, B: { el: 'H', label: 'H_b' }, C: { el: 'H', label: 'H_c' },
      mech: 'radical',
      AB: M(436, 0.741, 1.94), BC: M(436, 0.741, 1.94), AC: M(436, 0.741, 1.94),
      EaTarget: 40, formulas: { A: 'H', BC: 'H₂', AB: 'H₂', C: 'H' }
    },
    {
      id: 'Cl_H2', level: 'core',
      name: 'Cl + H₂ → HCl + H', short: 'Chlorine atom + hydrogen',
      blurb: 'Almost thermoneutral (slightly endothermic) with a modest barrier.',
      A: { el: 'Cl', label: 'Cl' }, B: { el: 'H', label: 'H' }, C: { el: 'H', label: 'H' },
      mech: 'radical',
      AB: M(431, 1.275, 1.87), BC: M(436, 0.741, 1.94), AC: M(431, 1.275, 1.87),
      EaTarget: 23, formulas: { A: 'Cl', BC: 'H₂', AB: 'HCl', C: 'H' }
    },
    {
      id: 'Br_H2', level: 'core',
      name: 'Br + H₂ → HBr + H', short: 'Bromine atom + hydrogen',
      blurb: 'Endothermic: the H–Br bond made is weaker than the H–H bond broken. The transition state comes late and looks like the products.',
      A: { el: 'Br', label: 'Br' }, B: { el: 'H', label: 'H' }, C: { el: 'H', label: 'H' },
      mech: 'radical',
      AB: M(366, 1.414, 1.81), BC: M(436, 0.741, 1.94), AC: M(366, 1.414, 1.81),
      EaTarget: 76, formulas: { A: 'Br', BC: 'H₂', AB: 'HBr', C: 'H' }
    },
    {
      id: 'H_Cl2', level: 'core',
      name: 'H + Cl₂ → HCl + Cl', short: 'Hydrogen atom + chlorine',
      blurb: 'Very exothermic: a weak Cl–Cl bond is traded for a strong H–Cl bond.',
      A: { el: 'H', label: 'H' }, B: { el: 'Cl', label: 'Cl' }, C: { el: 'Cl', label: 'Cl' },
      mech: 'radical',
      AB: M(431, 1.275, 1.87), BC: M(243, 1.988, 2.00), AC: M(431, 1.275, 1.87),
      EaTarget: 8, formulas: { A: 'H', BC: 'Cl₂', AB: 'HCl', C: 'Cl' }
    },
    {
      id: 'CO_NO2', level: 'ap',
      name: 'CO + NO₂ → CO₂ + NO', short: 'Carbon monoxide + nitrogen dioxide',
      blurb: 'The classic textbook example for orientation: the carbon of CO must hit an oxygen of NO₂.',
      A: { el: 'C', label: 'C', group: 'CO', mass: 28.01, deco: [{ el: 'O', d: 1.13, ang: 0 }] },
      B: { el: 'O', label: 'O' },
      C: { el: 'N', label: 'N', group: 'NO', mass: 30.006, deco: [{ el: 'O', d: 1.20, ang: 46 }] },
      mech: 'pair',
      AB: M(532, 1.16, 2.30), BC: M(306, 1.20, 2.40), AC: M(60, 2.2, 1.6),
      EaTarget: 134, formulas: { A: 'CO', BC: 'NO₂', AB: 'CO₂', C: 'NO' }
    },
    {
      id: 'Cl_CH4', level: 'organic',
      name: 'Cl• + CH₄ → HCl + •CH₃', short: 'Radical chlorination (H abstraction)',
      blurb: 'The first propagation step of free-radical chlorination. Low barrier, early transition state, so chlorine is not very selective.',
      A: { el: 'Cl', label: 'Cl' }, B: { el: 'H', label: 'H' }, C: CH3('flatten'),
      mech: 'radical',
      AB: M(431, 1.275, 1.87), BC: M(439, 1.09, 1.86), AC: M(350, 1.78, 1.75),
      EaTarget: 16, formulas: { A: 'Cl•', BC: 'CH₄', AB: 'HCl', C: '•CH₃' }
    },
    {
      id: 'Br_CH4', level: 'organic',
      name: 'Br• + CH₄ → HBr + •CH₃', short: 'Radical bromination (H abstraction)',
      blurb: 'Endothermic with a high barrier and a late, product-like transition state (Hammond postulate). This is why bromine is selective.',
      A: { el: 'Br', label: 'Br' }, B: { el: 'H', label: 'H' }, C: CH3('flatten'),
      mech: 'radical',
      AB: M(366, 1.414, 1.81), BC: M(439, 1.09, 1.86), AC: M(293, 1.93, 1.70),
      EaTarget: 78, formulas: { A: 'Br•', BC: 'CH₄', AB: 'HBr', C: '•CH₃' }
    },
    {
      id: 'SN2', level: 'organic',
      name: 'HO⁻ + CH₃Br → CH₃OH + Br⁻', short: 'SN2 substitution (backside attack)',
      blurb: 'One step: the nucleophile attacks carbon from the side opposite the leaving group and the CH₃ hydrogens flip like an umbrella. Values are approximate, for the reaction in water.',
      A: { el: 'O', label: 'O', group: 'HO', mass: 17.007, charge0: -1, deco: [{ el: 'H', d: 0.96, ang: 70 }] },
      B: CH3('flip'),
      C: { el: 'Br', label: 'Br', charge1: -1 },
      mech: 'pair',
      AB: M(370, 1.43, 1.95), BC: M(293, 1.93, 1.70), AC: M(200, 1.85, 1.9),
      EaTarget: 95, approx: true, formulas: { A: 'HO⁻', BC: 'CH₃Br', AB: 'CH₃OH', C: 'Br⁻' }
    },
    {
      id: 'custom', level: 'core',
      name: 'A + B–C → A–B + C', short: 'Design your own reaction',
      blurb: 'Set the activation energy and ΔH yourself and see how the collision and the graphs change.',
      A: { el: 'X', label: 'A' }, B: { el: 'Y', label: 'B' }, C: { el: 'Z', label: 'C' },
      mech: 'radical', custom: true,
      AB: M(400, 1.20, 1.90), BC: M(400, 1.20, 1.90), AC: M(300, 1.50, 1.90),
      EaTarget: 40, formulas: { A: 'A', BC: 'BC', AB: 'AB', C: 'C' }
    }
  ];

  const api = { ELEMENTS, REACTIONS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ChemData = api;
})(typeof self !== 'undefined' ? self : this);
