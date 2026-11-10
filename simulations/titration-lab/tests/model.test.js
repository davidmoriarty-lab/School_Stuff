/* tests/model.test.js: checks the chemistry with no browser.
 *
 *   node simulations/titration-lab/tests/model.test.js
 *
 * It checks:
 *   - pH values against worked textbook answers (strong/strong, weak acid, weak base);
 *   - every mixture obeys charge balance, mass balance and Kw, for every substance and volume;
 *   - curves run the right way (up for acids, down for bases) with no kinks;
 *   - equivalence volumes, pH = pKa at half-equivalence, pH 7 only for strong/strong;
 *   - indicators change colour inside their stated pH range and nowhere else;
 *   - "The math" text exists for every stage, has no broken numbers, and its classroom
 *     estimate agrees with the exact answer wherever the usual approximations are valid.
 */
const path = require('path');
const C = require(path.join(__dirname, '..', 'js', 'chem.js')), E = require(path.join(__dirname, '..', 'js', 'explain.js'));
const problems = []; let checks = 0;
const expect = (c, m) => { checks++; if (!c) problems.push(m); };
const near = (a, b, tol, m) => expect(Math.abs(a - b) <= tol, m + ' (got ' + a.toFixed(3) + ', wanted ' + b + ' ± ' + tol + ')');
const exp = (a, Ca, Va, Ct) => ({ analyte: a, titrant: C.REAGENTS[a].type === 'acid' ? 'NaOH' : 'HCl', Ca: Ca || 0.1, Va: Va || 25, Ct: Ct || 0.1 });
const pH = (x, v) => C.mixture(x, v).pH;

// textbook answers: 25.00 mL of 0.100 M sample with 0.100 M titrant
const book = {
  HCl: [[0, 1.00], [10, 1.37], [12.5, 1.48], [24.9, 3.70], [25, 7.00], [25.1, 10.30], [30, 11.96], [50, 12.52]],
  HAc: [[0, 2.87], [5, 4.14], [10, 4.57], [12.5, 4.74], [20, 5.35], [24, 6.12], [25, 8.72], [26, 11.29], [30, 11.96]],
  NaOH: [[0, 13.00], [12.5, 12.52], [25, 7.00], [30, 2.04]],
  NH3: [[0, 11.13], [12.5, 9.26], [25, 5.28], [30, 2.04]],
  HF: [[0, 2.10], [12.5, 3.17], [25, 7.93]]
};
for (const id in book) for (const [v, want] of book[id]) near(pH(exp(id), v), want, 0.03, id + ' at ' + v + ' mL');

for (const a of C.ANALYTES) {
  const R = C.REAGENTS[a.id];
  for (const [Ca, Va, Ct] of [[0.1, 25, 0.1], [0.02, 50, 0.05], [0.5, 10, 0.25], [0.05, 25, 0.5]]) {
    const x = exp(a.id, Ca, Va, Ct), tag = a.id + ' ' + Ca + '/' + Va + '/' + Ct;
    const eq = C.equivalencePoints(x);
    near(eq[0], Ca * Va / Ct, 1e-9, tag + ': first equivalence volume');
    let prev = null, mono = true, worstQ = 0, worstM = 0, worstKw = 0;
    for (let v = 0; v <= 50; v += 0.25) {
      const m = C.mixture(x, v);
      // charge balance
      let q = 0, weak = 0;
      for (const s of m.species) { const z = s.kind === 'H3O' || s.kind === 'Na' ? 1 : s.kind === 'OH' || s.kind === 'Cl' ? -1 : s.charge; q += z * s.conc; if (s.kind === 'weak') weak += s.mmol; }
      const scale = m.species.reduce((t, s) => t + s.conc, 0);
      worstQ = Math.max(worstQ, Math.abs(q) / scale);
      if (R.forms) worstM = Math.max(worstM, Math.abs(weak - m.nA) / m.nA);
      worstKw = Math.max(worstKw, Math.abs(m.species[0].conc * m.species[1].conc / C.KW - 1));
      if (prev !== null && (R.type === 'acid' ? m.pH < prev - 1e-9 : m.pH > prev + 1e-9)) mono = false;
      prev = m.pH;
      expect(m.pH > -1 && m.pH < 15 && Number.isFinite(m.pH), tag + ': pH in range at ' + v);
    }
    expect(worstQ < 1e-9, tag + ': charge balance holds (worst ' + worstQ.toExponential(1) + ')');
    expect(worstM < 1e-9, tag + ': weak acid/base amount is conserved');
    expect(worstKw < 1e-9, tag + ': [H3O+][OH-] = Kw');
    expect(mono, tag + ': curve runs one way only');
    const pk = C.pKaSequence(x);
    expect(pk.length === (R.forms ? eq.length : 0), tag + ': one pKa per step');
  }
  // half-equivalence: pH = pKa when the acid is neither too strong nor too weak for the buffer picture
  const x = exp(a.id), eq = C.equivalencePoints(x), pk = C.pKaSequence(x);
  pk.forEach((p, k) => { if (p > 3.5 && p < 10.5) near(pH(x, (k ? eq[k - 1] : 0) + (eq[k] - (k ? eq[k - 1] : 0)) / 2), p, 0.03, a.id + ': pH = pKa at half-equivalence ' + (k + 1)); });
  const pe = pH(x, eq[0]);
  if (R.strong) near(pe, 7, 0.01, a.id + ': strong/strong equivalence at pH 7');
  else if (eq.length === 1) expect(R.type === 'acid' ? pe > 7.2 : pe < 6.8, a.id + ': weak ' + R.type + ' equivalence is ' + (R.type === 'acid' ? 'above' : 'below') + ' 7 (' + pe.toFixed(2) + ')');
  // regions
  expect(C.region(x, 0).region === 'start' && C.region(x, eq[0]).region === 'equivalence' && C.region(x, eq[0] / 2).region === 'half' && C.region(x, eq[eq.length - 1] + 3).region === 'after', a.id + ': stages are recognised');
  // the math text
  for (let v = 0; v <= 50; v += 0.05) {
    const vv = +v.toFixed(2), m = C.mixture(x, vv), e = E.explain(x, vv, m, false);
    if (!e.stage || !e.caption || !e.html || /NaN|undefined|Infinity|null/.test(e.html + e.caption + e.stage)) { expect(false, a.id + ': broken math text at ' + vv + ' mL'); break; }
  }
  checks++;
  { const y = exp(a.id, 0.137); expect(E.explain(y, 5, C.mixture(y, 5), true).html.indexOf('137') < 0, a.id + ': mystery mode does not print the concentration'); }
}
// classroom estimates agree with the exact pH where the approximations are good (monoprotic weak acid/base)
for (const id of ['HAc', 'HCOOH', 'NH3', 'MeNH2']) for (const v of [0, 5, 12.5, 20, 25, 30]) {
  const x = exp(id), m = C.mixture(x, v), html = E.explain(x, v, m, false).html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
  const nums = [...html.matchAll(/(−?\d+\.\d\d)(?![\d.])/g)].map(t => parseFloat(t[1].replace('−', '-')));   // the last number printed is the answer
  near(nums[nums.length - 1], m.pH, 0.05, id + ' at ' + v + ' mL: worked answer matches exact pH');
}
// indicators
for (const ind of C.INDICATORS) {
  if (ind.id === 'none') { expect(C.indicatorColor(ind, 7)[3] === 0, 'no indicator: no colour'); continue; }
  const d = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) + 255 * Math.abs(a[3] - b[3]);
  if (ind.universal) { expect(d(C.indicatorColor(ind, 1), C.indicatorColor(ind, 7)) > 100 && d(C.indicatorColor(ind, 7), C.indicatorColor(ind, 13)) > 100, 'universal indicator spans the scale'); continue; }
  const lo = C.indicatorColor(ind, ind.lo - 0.4), hi = C.indicatorColor(ind, ind.hi + 0.4);
  expect(d(lo, C.indicatorColor(ind, ind.lo - 3)) < 30, ind.name + ': steady colour below its range');
  expect(d(hi, C.indicatorColor(ind, ind.hi + 3)) < 30, ind.name + ': steady colour above its range');
  expect(d(lo, hi) > 150, ind.name + ': the two colours are clearly different');
  expect(ind.hi - ind.lo >= 1.2 && ind.hi - ind.lo <= 2.0, ind.name + ': range is about two pH units or less');
}
// phenolphthalein is right for weak acid + strong base, methyl orange is not
{ const x = exp('HAc'), a = pH(x, 24.95), b = pH(x, 25.05); expect(a < 9.1 && b > 9.1, 'phenolphthalein mid-range lies inside the acetic acid jump'); expect(!(a < 3.75 && b > 3.75), 'methyl orange mid-range lies outside it'); }
// curve sampling
{ const c = C.curve(exp('HAc'), 40); expect(c.length > 400 && c[0].v === 0 && Math.abs(c[c.length - 1].v - 40) < 1e-9 && c.every((p, i) => !i || p.v > c[i - 1].v), 'curve samples are ordered and cover the range'); }
expect(C.DROP_ML === 0.05 && C.BURET_ML === 50, 'drop is 0.05 mL, buret is 50 mL');

if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('model: all ' + checks + ' checks passed');
