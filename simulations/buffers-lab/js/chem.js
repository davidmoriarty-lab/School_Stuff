/* chem.js: the chemistry behind the Buffers Lab. No drawing, no page: just numbers.
 *
 * A "mix" is whatever is in a container:
 *   { vol   mL of solution
 *     ac    moles of acetate in ANY form (HC2H3O2 + C2H3O2-)
 *     na    moles of Na+   (from NaOH or dissolved sodium acetate)
 *     cl    moles of Cl-   (from HCl, used in the "stress test")
 *     solid grams of sodium acetate that have not dissolved yet }
 *
 * The pH comes from one rule: the solution must be electrically neutral.
 *   [H+] + [Na+] = [OH-] + [C2H3O2-] + [Cl-]
 * with [C2H3O2-] = C_total * Ka / (Ka + [H+])  and  [OH-] = Kw / [H+].
 * We search for the [H+] that makes both sides equal. This works for the plain acid,
 * for a buffer, for too much NaOH, for anything the student manages to make.
 */
(function (root) {
  'use strict';
  const KA = 1.76e-5, KW = 1.0e-14, PKA = -Math.log10(KA);
  const M_NAAC = 82.03;          // g/mol, anhydrous NaC2H3O2
  const C_ACID = 0.83, C_NAOH = 0.50, C_HCL = 1.0;   // mol/L of the stock solutions
  const TARGET = 4.75;

  const empty = () => ({ vol: 0, ac: 0, na: 0, cl: 0, solid: 0, vA: 0, vB: 0, vH: 0, vW: 0, gSolid: 0 });   // vA.. = mL of each stock that went in (for the answer check)
  /* what one mL of each stock liquid carries */
  const LIQ = {
    acid: { ac: C_ACID / 1000, na: 0, cl: 0, v: 'vA', name: '0.83 M HC₂H₃O₂' },
    naoh: { ac: 0, na: C_NAOH / 1000, cl: 0, v: 'vB', name: '0.50 M NaOH' },
    hcl: { ac: 0, na: 0, cl: C_HCL / 1000, v: 'vH', name: '1.0 M HCl' },
    water: { ac: 0, na: 0, cl: 0, v: 'vW', name: 'distilled water' }
  };
  function addLiquid(mix, kind, mL) { const q = LIQ[kind]; mix.vol += mL; mix.ac += q.ac * mL; mix.na += q.na * mL; mix.cl += q.cl * mL; mix[q.v] += mL; return mix; }
  /* move mL of solution from one mix to another (the solid stays behind) */
  function transfer(from, to, mL) {
    mL = Math.min(mL, from.vol); if (mL <= 0) return 0; const f = mL / from.vol;
    for (const k of ['ac', 'na', 'cl', 'vA', 'vB', 'vH', 'vW']) { const m = from[k] * f; from[k] -= m; to[k] += m; }
    from.vol -= mL; to.vol += mL; if (from.vol < 1e-9) { from.vol = 0; from.ac = from.na = from.cl = from.vA = from.vB = from.vH = from.vW = 0; }
    return mL;
  }
  /* dissolve g grams of the solid that is sitting in the mix */
  function dissolve(mix, g) { g = Math.min(g, mix.solid); if (g <= 0 || mix.vol <= 0) return 0; mix.solid -= g; const n = g / M_NAAC; mix.ac += n; mix.na += n; if (mix.solid < 1e-6) mix.solid = 0; return g; }

  /* pH of the dissolved part of a mix */
  function pH(mix) {
    if (!(mix.vol > 0)) return NaN;
    const L = mix.vol / 1000, C = mix.ac / L, Na = mix.na / L, Cl = mix.cl / L;
    const f = (h) => h + Na - Cl - KW / h - C * KA / (KA + h);   // > 0 means h is too big
    let lo = -15, hi = 1;                                         // log10 [H+]
    for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (f(Math.pow(10, mid)) > 0) hi = mid; else lo = mid; }
    return -(lo + hi) / 2;
  }
  /* how the acetate is split, for the report */
  function species(mix) { const h = Math.pow(10, -pH(mix)), fA = KA / (KA + h); return { HA: mix.ac * (1 - fA), A: mix.ac * fA }; }

  /* the pre-lab answers, worked from the lab's own numbers */
  const ratio = Math.pow(10, TARGET - PKA);                 // [A-]/[HA] needed
  const nAcid = 0.0500 * C_ACID;                            // mol HA in 50.0 mL
  const prelab = {
    q1: 0.0500 * 1.0 * 214.11,                              // g NaH2C6H5O7 (pH = pKa, so mol salt = mol acid)
    q4: nAcid * ratio * M_NAAC,                             // g sodium acetate
    q5: nAcid * ratio / (1 + ratio) / C_NAOH * 1000,        // mL NaOH
    q4simple: nAcid * M_NAAC, q5simple: nAcid / 2 / C_NAOH * 1000   // taking pH = pKa exactly
  };
  const pctError = (actual, target) => Math.abs(actual - (target === undefined ? TARGET : target)) / (target === undefined ? TARGET : target) * 100;

  const api = { KA, KW, PKA, M_NAAC, C_ACID, C_NAOH, C_HCL, TARGET, LIQ, empty, addLiquid, transfer, dissolve, pH, species, prelab, pctError };
  root.BufChem = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
