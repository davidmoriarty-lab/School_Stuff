/* chem.js: the chemistry of the Titration Lab. No drawing happens here.
 *
 * The pH is never looked up or approximated: for every mixture the charge-balance equation
 *     [H3O+] + (spectator cations) = [OH-] + (spectator anions) + (charge on the weak acid/base forms)
 * is solved exactly, with Kw = 1.0e-14 (25 °C). This one method covers strong and weak
 * acids and bases, buffers, equivalence points and polyprotic acids.
 * Concentrations are mol/L, volumes mL, amounts mmol.
 */
(function (root) {
  'use strict';
  const KW = 1.0e-14;
  const DROP_ML = 0.05;                 // one drop from a buret
  const BURET_ML = 50;

  /* Every substance that can go in the flask or the buret.
   * strong acid/base: fully ionised, leaves a spectator ion.
   * weak: 'forms' lists the species from most to least protonated, Ka between neighbours,
   *       q0 is the charge of the first form, 'as' is the form the bottle contains. */
  const REAGENTS = {
    HCl:  { name: 'hydrochloric acid', formula: 'HCl', type: 'acid', strong: true, spectator: { label: 'Cl⁻', charge: -1, n: 1 } },
    NaOH: { name: 'sodium hydroxide', formula: 'NaOH', type: 'base', strong: true, spectator: { label: 'Na⁺', charge: 1, n: 1 } },
    HAc:  { name: 'acetic acid', formula: 'CH₃COOH', type: 'acid', forms: ['CH₃COOH', 'CH₃COO⁻'], Ka: [1.8e-5], q0: 0, as: 0, short: ['HAc', 'Ac⁻'] },
    HCOOH:{ name: 'formic acid', formula: 'HCOOH', type: 'acid', forms: ['HCOOH', 'HCOO⁻'], Ka: [1.8e-4], q0: 0, as: 0, short: ['HA', 'A⁻'] },
    HF:   { name: 'hydrofluoric acid', formula: 'HF', type: 'acid', forms: ['HF', 'F⁻'], Ka: [6.8e-4], q0: 0, as: 0, short: ['HA', 'A⁻'] },
    HClO: { name: 'hypochlorous acid', formula: 'HClO', type: 'acid', forms: ['HClO', 'ClO⁻'], Ka: [3.0e-8], q0: 0, as: 0, short: ['HA', 'A⁻'] },
    H3PO4:{ name: 'phosphoric acid', formula: 'H₃PO₄', type: 'acid', forms: ['H₃PO₄', 'H₂PO₄⁻', 'HPO₄²⁻', 'PO₄³⁻'], Ka: [7.5e-3, 6.2e-8, 4.2e-13], q0: 0, as: 0, short: ['H₃A', 'H₂A⁻', 'HA²⁻', 'A³⁻'] },
    NH3:  { name: 'ammonia', formula: 'NH₃', type: 'base', forms: ['NH₄⁺', 'NH₃'], Ka: [KW / 1.8e-5], q0: 1, as: 1, short: ['BH⁺', 'B'] },
    MeNH2:{ name: 'methylamine', formula: 'CH₃NH₂', type: 'base', forms: ['CH₃NH₃⁺', 'CH₃NH₂'], Ka: [KW / 4.4e-4], q0: 1, as: 1, short: ['MeNH₃⁺', 'MeNH₂'] },
    Na2CO3:{ name: 'sodium carbonate', formula: 'Na₂CO₃', type: 'base', forms: ['H₂CO₃', 'HCO₃⁻', 'CO₃²⁻'], Ka: [4.3e-7, 5.6e-11], q0: 0, as: 2, short: ['H₂A', 'HA⁻', 'A²⁻'],
             spectator: { label: 'Na⁺', charge: 1, n: 2 } }
  };
  for (const k in REAGENTS) REAGENTS[k].id = k;

  /* What can be titrated, grouped for the menu. The titrant is NaOH for acids and HCl for bases. */
  const ANALYTES = [
    { id: 'HCl', group: 'Strong acid', level: 'honors', indicator: 'phth', note: 'Strong acid with strong base: the equivalence point is at pH 7.' },
    { id: 'HAc', group: 'Weak acids', level: 'honors', indicator: 'phth', note: 'Weak acid with strong base: starts higher, has a buffer region, and the equivalence point is above pH 7.' },
    { id: 'HCOOH', group: 'Weak acids', level: 'ap', indicator: 'phth', note: 'A stronger weak acid than acetic (larger Ka), so the curve starts lower.' },
    { id: 'HF', group: 'Weak acids', level: 'ap', indicator: 'phth', note: 'The strongest of these weak acids: its curve sits closest to the strong-acid curve.' },
    { id: 'HClO', group: 'Weak acids', level: 'ap', indicator: 'phth', note: 'A very weak acid: the buffer region sits near pH 7.5 and the jump at equivalence is short.' },
    { id: 'H3PO4', group: 'Polyprotic acid', level: 'ap', indicator: 'none', note: 'Three acidic protons, removed one at a time. Two equivalence points show clearly; the third proton is too weakly acidic to give a jump.' },
    { id: 'NaOH', group: 'Strong base', level: 'honors', indicator: 'btb', note: 'Strong base with strong acid: the curve runs downhill and the equivalence point is at pH 7.' },
    { id: 'NH3', group: 'Weak bases', level: 'ap', indicator: 'mred', note: 'Weak base with strong acid: the equivalence point is below pH 7 because NH₄⁺ is a weak acid.' },
    { id: 'MeNH2', group: 'Weak bases', level: 'ap', indicator: 'mred', note: 'A stronger weak base than ammonia (larger Kb).' },
    { id: 'Na2CO3', group: 'Weak bases', level: 'ap', indicator: 'none', note: 'Carbonate accepts two protons, one at a time, so there are two equivalence points.' }
  ];

  /* Indicators: pH range of the colour change and the two colours [r, g, b, opacity]. */
  const INDICATORS = [
    { id: 'none', name: 'No indicator' },
    { id: 'phth', name: 'Phenolphthalein', lo: 8.2, hi: 10.0, acid: [255, 255, 255, 0], base: [226, 38, 150, 0.62], acidName: 'colorless', baseName: 'pink' },
    { id: 'btb', name: 'Bromothymol blue', lo: 6.0, hi: 7.6, acid: [238, 204, 46, 0.6], mid: [78, 168, 92, 0.6], base: [36, 96, 200, 0.62], acidName: 'yellow', baseName: 'blue' },
    { id: 'mred', name: 'Methyl red', lo: 4.4, hi: 6.2, acid: [222, 44, 66, 0.6], base: [240, 208, 52, 0.6], acidName: 'red', baseName: 'yellow' },
    { id: 'mor', name: 'Methyl orange', lo: 3.1, hi: 4.4, acid: [228, 58, 40, 0.6], base: [246, 198, 48, 0.6], acidName: 'red', baseName: 'yellow' },
    { id: 'bcg', name: 'Bromocresol green', lo: 3.8, hi: 5.4, acid: [238, 204, 46, 0.6], mid: [70, 170, 120, 0.6], base: [30, 100, 200, 0.62], acidName: 'yellow', baseName: 'blue' },
    { id: 'univ', name: 'Universal indicator', universal: true, lo: 0, hi: 14, acidName: 'red', baseName: 'violet' }
  ];
  const UNIVERSAL = [[0, [214, 40, 40]], [3, [236, 110, 40]], [5, [240, 200, 50]], [7, [80, 170, 80]], [9, [40, 120, 200]], [11, [70, 70, 180]], [14, [120, 50, 150]]];

  const lerp = (a, b, f) => a + (b - a) * f;
  const mix4 = (a, b, f) => [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f), lerp(a[3], b[3], f)];

  /* Colour of the solution [r, g, b, opacity] with this indicator at this pH. */
  function indicatorColor(ind, pH) {
    if (!ind || ind.id === 'none') return [255, 255, 255, 0];
    if (ind.universal) {
      for (let i = 1; i < UNIVERSAL.length; i++) if (pH <= UNIVERSAL[i][0]) {
        const f = Math.max(0, (pH - UNIVERSAL[i - 1][0]) / (UNIVERSAL[i][0] - UNIVERSAL[i - 1][0]));
        return mix4(UNIVERSAL[i - 1][1].concat(0.6), UNIVERSAL[i][1].concat(0.6), f);
      }
      return UNIVERSAL[UNIVERSAL.length - 1][1].concat(0.6);
    }
    // fraction of the indicator in its basic form (Henderson–Hasselbalch with pK at mid-range)
    const pK = (ind.lo + ind.hi) / 2, f = 1 / (1 + Math.pow(10, (pK - pH) * 2 / (ind.hi - ind.lo) * 0.95));
    if (ind.mid) return f < 0.5 ? mix4(ind.acid, ind.mid, f * 2) : mix4(ind.mid, ind.base, (f - 0.5) * 2);
    return mix4(ind.acid, ind.base, f);
  }

  /* Fractions of a weak acid in each form at a given [H3O+]. */
  function alphas(Ka, H) {
    const n = Ka.length, terms = [Math.pow(H, n)];
    let prod = 1;
    for (let j = 1; j <= n; j++) { prod *= Ka[j - 1]; terms.push(Math.pow(H, n - j) * prod); }
    const sum = terms.reduce((a, b) => a + b, 0);
    return terms.map(t => t / sum);
  }

  /* The mixture after vT mL of titrant has been added to the flask.
   * exp = { analyte, titrant (reagent ids), Ca, Va, Ct }.  Returns pH and every species. */
  function mixture(exp, vT) {
    const A = REAGENTS[exp.analyte], T = REAGENTS[exp.titrant];
    const V = exp.Va + vT;                                  // mL
    const nA = exp.Ca * exp.Va, nT = exp.Ct * vT;           // mmol
    let cat = 0, an = 0;                                    // spectator charge, mol/L
    const spect = {};
    for (const [R, n] of [[A, nA], [T, nT]]) if (R.spectator) {
      const c = n * R.spectator.n / V;
      if (R.spectator.charge > 0) cat += c; else an += c;
      spect[R.spectator.label] = (spect[R.spectator.label] || 0) + c;
    }
    const W = A.forms ? A : null, Cw = W ? nA / V : 0;
    const f = (H) => {
      let q = H - KW / H + cat - an;
      if (W) { const al = alphas(W.Ka, H); for (let i = 0; i < al.length; i++) q += Cw * al[i] * (W.q0 - i); }
      return q;
    };
    let lo = -2, hi = 16;                                   // bisection on pH; f falls as pH rises
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (f(Math.pow(10, -mid)) > 0) lo = mid; else hi = mid; }
    const pH = (lo + hi) / 2, H = Math.pow(10, -pH);
    const species = [{ label: 'H₃O⁺', kind: 'H3O', conc: H }, { label: 'OH⁻', kind: 'OH', conc: KW / H }];
    if (W) alphas(W.Ka, H).forEach((a, i) => species.push({ label: W.forms[i], kind: 'weak', protons: W.forms.length - 1 - i, charge: W.q0 - i, conc: Cw * a }));
    for (const k in spect) species.push({ label: k, kind: k === 'Na⁺' ? 'Na' : 'Cl', conc: spect[k] });
    for (const s of species) s.mmol = s.conc * V;
    return { pH, H, V, nA, nT, species, exp, vT };
  }

  /* Volumes of titrant at each equivalence point (mL). */
  function equivalencePoints(exp) {
    const A = REAGENTS[exp.analyte];
    const steps = A.forms ? (A.type === 'acid' ? A.forms.length - 1 - A.as : A.as) : 1;
    const out = [];
    for (let k = 1; k <= steps; k++) out.push(k * exp.Ca * exp.Va / exp.Ct);
    return out;
  }
  /* pKa values that govern each buffer region, in the order they are met during the titration. */
  function pKaSequence(exp) {
    const A = REAGENTS[exp.analyte];
    if (!A.forms) return [];
    const pk = A.Ka.map(k => -Math.log10(k));
    return A.type === 'acid' ? pk.slice(A.as) : pk.slice(0, A.as).reverse();
  }
  /* Is the k-th equivalence point (0-based) a clear jump on the curve? */
  function jumpSize(exp, k) {
    const v = equivalencePoints(exp)[k], d = Math.max(0.02, v * 0.004);
    return Math.abs(mixture(exp, v + d).pH - mixture(exp, v - d).pH);
  }

  /* The whole curve: [{v, pH}], finely sampled near the equivalence points. */
  function curve(exp, vMax, n) {
    const eq = equivalencePoints(exp), pts = [];
    n = n || 400;
    for (let i = 0; i <= n; i++) pts.push(vMax * i / n);
    for (const e of eq) for (let j = -40; j <= 40; j++) { const v = e + Math.sign(j) * Math.pow(Math.abs(j) / 40, 2.5) * 1.2; if (v >= 0 && v <= vMax) pts.push(v); }
    pts.sort((a, b) => a - b);
    return pts.filter((v, i) => i === 0 || v - pts[i - 1] > 1e-7).map(v => ({ v, pH: mixture(exp, v).pH }));
  }

  /* Which part of the titration are we in?  Returns { region, k } where k counts equivalence points passed. */
  function region(exp, vT) {
    const eq = equivalencePoints(exp), tol = DROP_ML * 0.6;
    if (vT < 1e-9) return { region: 'start', k: 0 };
    for (let k = 0; k < eq.length; k++) {
      if (Math.abs(vT - eq[k]) <= tol) return { region: 'equivalence', k };
      if (vT < eq[k]) {
        const half = (k ? eq[k - 1] : 0) + (eq[k] - (k ? eq[k - 1] : 0)) / 2;
        return { region: Math.abs(vT - half) <= tol ? 'half' : 'before', k };
      }
    }
    return { region: 'after', k: eq.length };
  }

  const api = { KW, DROP_ML, BURET_ML, REAGENTS, ANALYTES, INDICATORS, indicatorColor, alphas, mixture, equivalencePoints, pKaSequence, jumpSize, curve, region };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Chem = api;
})(typeof self !== 'undefined' ? self : this);
