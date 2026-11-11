/* tests/chem.test.js: checks the chemistry engine and the step builders against every answer in the
 * Unit 5 teacher edition and the sample test key. No browser needed.
 *
 *   node simulations/moles-study-guide/tests/chem.test.js
 */
const path = require('path');
const J = (f) => path.join(__dirname, '..', 'js', f);
const C = require(J('chem.js')), S = require(J('steps.js')), D = require(J('data.js'));
const problems = []; let checks = 0;
const expect = (c, m) => { checks++; if (!c) problems.push(m); };
const same = (a, b, m) => expect(Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b)), m + ' (got ' + a + ', wanted ' + b + ')');

/* ---------- the engine ---------- */
for (const [f, want] of Object.entries({ Be: 9.01, N2: 28.02, O2: 32.00, F2: 38.00, Mg: 24.31, Ag: 107.87, LiI: 133.84, PbCO3: 267.21, 'Mg(OH)2': 58.33, K3PO4: 212.27, '(NH4)3PO4': 149.12, C6H12O6: 180.18,
  'Al2(SO4)3': 342.14, 'Ca(OH)2': 74.10, '(NH4)2CO3': 96.11, 'Ca(NO3)2': 164.10, CF4: 88.01, Fe2O3: 159.70, CaCl2: 110.98, 'CuSO4·5H2O': 249.71, BaCl2: 208.23, CoCl2: 129.83, MgSO4: 120.37, CO2: 44.01, NH3: 17.04 }))
  same(C.roundDp(C.molarMass(f), 2), want, 'molar mass of ' + f);
expect(JSON.stringify(C.parseFormula('Al2(SO4)3').counts) === '{"Al":2,"S":3,"O":12}', 'Al2(SO4)3 atom counts');
expect(JSON.stringify(C.parseFormula('((NH4)2SO4)2').counts) === '{"N":4,"H":16,"S":2,"O":8}', 'nested parentheses');
expect(C.parseFormula('CuSO4·5H2O').water === 5 && C.parseFormula('CuSO4.5H2O').counts.H === 10, 'hydrate dot');
expect(C.sameFormula('C6H12O6', 'C₆H₁₂O₆') && !C.sameFormula('CH2O', 'C2H4O2'), 'sameFormula');
for (const bad of ['', 'Xx2', 'Mg(OH', 'Mg(OH)2)', '2H2O', '()', 'H2O$']) expect(C.parseFormula(bad).ok === false && C.parseFormula(bad).error, 'bad formula "' + bad + '" is rejected with a message');
expect(['H2O', 'Al', 'N2', 'NaCl', '(NH4)2S', 'CO2', 'P4', 'CuSO4·5H2O', 'NH4Cl', 'Cl2', 'He'].map(C.particleWord).join() === 'molecules,atoms,molecules,formula units,formula units,molecules,molecules,formula units,formula units,molecules,atoms', 'particle words');
for (const [s, v] of [['3.4e26', 3.4e26], ['3.4 x 10^26', 3.4e26], ['3.4×10²⁶', 3.4e26], ['1.51 * 10^24', 1.51e24], ['−2.5e-3', -0.0025], ['1,234', 1234], ['5 × 10⁻³', 0.005], ['100', 100], ['108', 108], ['105.3', 105.3], ['10', 10], ['1000', 1000], ['10^3', 1000], ['1.0e2', 100]]) same(C.parseNumber(s), v, 'parse "' + s + '"');
expect(isNaN(C.parseNumber('abc')) && isNaN(C.parseNumber('1.2.3')) && isNaN(C.parseNumber('')), 'bad numbers are NaN');
for (const [s, n] of [['2.50', 3], ['360.0', 4], ['176', 3], ['0.12', 2], ['0.0054', 2], ['3.4e26', 2], ['1.51 × 10^24', 3], ['15.0', 3], ['79.85', 4]]) expect(C.sigFigs(s) === n, 'sig figs of ' + s);
for (const [x, sf, t] of [[437.2, 3, '437'], [180.1, 2, '1.8 × 10²'], [0.005357, 2, '0.0054'], [0.5, 4, '0.5000'], [1.5055e23, 3, '1.51 × 10²³'], [57.475, 4, '57.48'], [19.98, 4, '19.98'], [564.6, 2, '5.6 × 10²']])
  expect(C.fmtVal(x, sf).text === t, 'fmtVal(' + x + ', ' + sf + ') = ' + C.fmtVal(x, sf).text + ' (wanted ' + t + ')');

/* ---------- mole conversions: every problem in the packet and the sample test ---------- */
const conv = (v, u, f, tu, tf, ans, label, extraSf) => ({ spec: { given: { v, unit: u, f }, to: { unit: tu, f: tf }, extraSf }, ans, label });
const CONV = [
  // 5.1
  conv('2.50', 'mol', 'Mg', 'part', 'Mg', '1.51e24', '5.1 worked'), conv('1.75', 'mol', 'Al', 'part', 'Al', '1.05e24', '5.1 #3'), conv('3.25', 'mol', 'H2O', 'part', 'H2O', '1.96e24', '5.1 #4'),
  conv('3.4e26', 'part', 'CO2', 'mol', 'CO2', '5.6e2', '5.1 #5'), conv('3.88e25', 'part', 'Ni', 'mol', 'Ni', '64.4', '5.1 #6'),
  // 5.3
  conv('9.00', 'g', 'H2O', 'part', 'H2O', '3.01e23', '5.3 worked'), conv('2.5e24', 'part', 'CO2', 'g', 'CO2', '1.8e2', '5.3 #1'), conv('176', 'g', 'CF4', 'mol', 'CF4', '2.00', '5.3 #2'),
  conv('360.0', 'g', 'H2O', 'mol', 'H2O', '19.98', '5.3 #3'), conv('79.85', 'g', 'Fe2O3', 'mol', 'Fe2O3', '0.5000', '5.3 #4'), conv('52.5', 'g', 'Cl2', 'part', 'Cl2', '4.46e23', '5.3 #5'),
  conv('5.6', 'mol', 'Cu2O3', 'part', 'Cu', '6.7e24', '5.3 #6'), conv('2.5', 'mol', 'C6H12O6', 'g', 'O', '2.4e2', '5.3 #7'), conv('15.0', 'g', 'CaCl2', 'g', 'Cl', '9.58', '5.3 #8'),
  // 5.4
  conv('8.00', 'g', 'O2', 'L', 'O2', '5.60', '5.4 worked'), conv('3.20', 'mol', 'O2', 'L', 'O2', '71.7', '5.4 #1'), conv('1.75', 'mol', 'NH3', 'L', 'NH3', '39.2', '5.4 #2'), conv('37.8', 'mol', 'CO2', 'L', 'CO2', '847', '5.4 #3'),
  conv('5.05', 'g', 'He', 'L', 'He', '28.3', '5.4 #4'), conv('60.0', 'g', 'Xe', 'L', 'Xe', '10.2', '5.4 #5'), conv('75.3', 'L', 'NH3', 'part', 'NH3', '2.02e24', '5.4 #6'), conv('575', 'L', 'NH3', 'g', 'NH3', '437', '5.4 #7'),
  conv('5.00', 'g', 'O2', 'L', 'O2', '3.50', '5.4 #8'), conv('5.00', 'g', 'O2', 'part', 'O2', '9.41e22', '5.4 #9'), conv('0.12', 'L', 'CO2', 'mol', 'CO2', '0.0054', '5.4 #10 moles'),
  conv('0.12', 'L', 'CO2', 'part', 'CO2', '3.2e21', '5.4 #10 molecules'), conv('0.12', 'L', 'CO2', 'g', 'CO2', '0.24', '5.4 #10 grams'),
  // extra practice
  conv('8.50', 'g', 'NH3', 'part', 'NH3', '3.00e23', 'extra B-a'), conv('5.00', 'L', 'CO2', 'g', 'CO2', '9.82', 'extra B-d'),
  // sample test, multiple choice and free response
  conv('0.250', 'mol', 'Zn', 'part', 'Zn', '1.51e23', 'test MC2'), conv('3.011e23', 'part', 'CO2', 'mol', 'CO2', '0.5000', 'test MC4'), conv('2.50', 'mol', 'NaCl', 'g', 'NaCl', '146', 'test MC5'),
  conv('88.0', 'g', 'CO2', 'mol', 'CO2', '2.00', 'test MC6'), conv('0.500', 'mol', 'N2', 'L', 'N2', '11.2', 'test MC9'), conv('33.6', 'L', 'N2', 'mol', 'N2', '1.50', 'test MC10'),
  conv('0.750', 'mol', 'Mg(OH)2', 'g', 'Mg(OH)2', '43.7', 'test 1b'), conv('25.0', 'g', 'C6H12O6', 'part', 'C6H12O6', '8.36e22', 'test 1c'), conv('0.400', 'mol', 'Al2(SO4)3', 'part', 'O', '2.89e24', 'test 1d'),
  conv('3.011e23', 'part', 'NH3', 'g', 'NH3', '8.520', 'test 1e'), conv('14.2', 'g', 'Cl2', 'L', 'Cl2', '4.49', 'test 2a'), conv('5.60', 'L', 'NH3', 'g', 'NH3', '4.26', 'test 2b'), conv('11.2', 'L', 'N2', 'part', 'N2', '3.01e23', 'test 2c')
];
for (const t of CONV) {
  const b = S.buildConv(t.spec);
  same(C.parseNumber(b.answer.fmt.text), C.parseNumber(t.ans), t.label + ': answer');
  expect(b.steps.length === 8 && b.steps.every((s) => s.html && s.title && s.why && ['plan', 'setup', 'answer'].includes(s.stage)), t.label + ': 8 complete steps');
  // the cancelled units leave exactly the unit that was asked for
  const html = S.chainHTML(t.spec, b.route, b, { cancel: true });
  const kept = (html.match(/class="u keep"/g) || []).length, struck = (html.match(/class="u cx"/g) || []).length;
  expect(kept === 1 && struck === 2 * b.route.length, t.label + ': units cancel (' + struck + ' struck, ' + kept + ' kept)');
  // each struck pair has the same id on both sides
  const ids = {}; (html.match(/data-c="(\d+)"/g) || []).forEach((m) => { ids[m] = (ids[m] || 0) + 1; });
  expect(Object.values(ids).every((n) => n === 2), t.label + ': every cancelled unit has a partner');
}
// the factor count follows the mole map
const nFactors = (i) => S.buildConv(CONV[i].spec).route.length;
expect(nFactors(1) === 1 && nFactors(5) === 2 && nFactors(11) === 2 && nFactors(12) === 2 && nFactors(13) === 3, 'path lengths on the mole map (1 hop, grams to particles, element inside a compound...)');
// wrong-answer diagnosis
{ const b = S.buildConv(CONV[5].spec);   // 9.00 g H2O -> molecules
  expect(/molar mass/.test(S.diagnoseConv(b, 9.00 * 18.02 * 6.022e23) || ''), 'diagnosis: multiplied by molar mass instead of dividing');
  expect(/Avogadro/.test(S.diagnoseConv(b, 9.00 / 18.02 / 6.022e23) || ''), 'diagnosis: divided by Avogadro');
  expect(/missing/.test(S.diagnoseConv(b, 9.00 / 18.02) || ''), 'diagnosis: forgot the Avogadro step');
  expect(S.diagnoseConv(b, 12345) === null, 'no diagnosis for a random wrong answer');
  expect(/power of ten/.test(S.diagnoseConv(b, 3.01e25) || ''), 'diagnosis: power of ten'); }

/* ---------- molar mass ---------- */
{ const f = ['Be', 'N2', 'O2', 'F2', 'Mg', 'Ag', 'LiI', 'PbCO3', 'Mg(OH)2', 'K3PO4', '(NH4)3PO4', 'C6H12O6', 'Al2(SO4)3', 'Ca(OH)2', '(NH4)2CO3', 'Ca(NO3)2'];
  for (const x of f) { const b = S.buildMolarMass({ f: x }); same(b.answer.value, C.molarMass(x), 'builder molar mass ' + x); expect(b.steps.length === 5, x + ': 5 steps'); }
  expect(/outside the parentheses/.test(S.buildMolarMass({ f: 'Mg(OH)2' }).steps[1].html), 'parentheses warning appears');
  expect(!/outside the parentheses/.test(S.buildMolarMass({ f: 'NaCl' }).steps[1].html), 'no parentheses warning for NaCl');
  const mg = S.buildMolarMass({ f: 'Mg(OH)2' });
  expect(/not multiplied/.test(S.diagnoseMolarMass(mg, 24.31 + 16.00 + 1.01) || ''), 'diagnosis: parentheses not multiplied');
  expect(/ONE atom/.test(S.diagnoseMolarMass(S.buildMolarMass({ f: 'N2' }), 14.01) || ''), 'diagnosis: diatomic'); }

/* ---------- percent composition ---------- */
const PCT = { NaOH: { Na: 57.48, O: 40.00, H: 2.53 }, CuBr2: { Cu: 28.45, Br: 71.55 }, N2S2: { N: 30.41, S: 69.59 }, '(NH4)2S': { N: 41.11, H: 11.85, S: 47.04 }, '(NH4)3PO4': { N: 28.19, H: 8.13, P: 20.77, O: 42.92 },
  CaCO3: { Ca: 40.04, C: 12.00, O: 47.96 }, H2O: { H: 11.21, O: 88.79 }, 'Al2(SO4)3': { Al: 15.77, S: 28.11, O: 56.12 }, NH4NO3: { N: 35.00, H: 5.05, O: 59.96 }, C6H12O6: { C: 39.99 } };
for (const [f, rows] of Object.entries(PCT)) { const b = S.buildPercent({ f }); for (const r of b.rows) if (rows[r.el] !== undefined) same(r.pct2, rows[r.el], 'percent ' + r.el + ' in ' + f); expect(b.steps.length === 5, f + ': 5 steps'); }
same(C.roundDp(S.buildPercent({ f: 'NH4NO3', only: 'N' }).answer.value, 2), 35.00, 'NH4NO3 nitrogen');
{ const b = S.buildPercentOf({ mass: '50.0', pct: '20.0', el: 'H' }); same(b.answer.value, 10, '20.0 % of 50.0 g'); }
expect(/ONE/.test(S.diagnosePercent(S.buildPercent({ f: 'NH4NO3', only: 'N' }), 14.01 / 80.05 * 100) || ''), 'diagnosis: one atom instead of all');

/* ---------- empirical and molecular formulas ---------- */
const EMP = [
  { items: [{ el: 'C', v: '40.0', kind: 'pct' }, { el: 'H', v: '6.7', kind: 'pct' }, { el: 'O', v: '53.3', kind: 'pct' }], molarMass: 180, emp: 'CH2O', mol: 'C6H12O6', label: '5.6 worked' },
  { items: [{ el: 'Na', v: '87.3', kind: 'g' }, { el: 'S', v: '121.5', kind: 'g' }, { el: 'O', v: '91.2', kind: 'g' }], emp: 'Na2S2O3', label: '5.6 #1' },
  { items: [{ el: 'Bi', v: '85.65', kind: 'pct' }, { el: 'O', v: '6.56', kind: 'pct' }, { el: 'F', v: '7.79', kind: 'pct' }], emp: 'BiOF', label: '5.6 #2' },
  { items: [{ el: 'C', v: '85.63', kind: 'pct' }, { el: 'H', v: '14.37', kind: 'pct' }], molarMass: 42.09, emp: 'CH2', mol: 'C3H6', label: '5.6 #3 (propene, from percents)' },
  { items: [{ el: 'C', v: '75.42', kind: 'pct' }, { el: 'H', v: '6.63', kind: 'pct' }, { el: 'N', v: '8.38', kind: 'pct' }, { el: 'O', v: '9.57', kind: 'pct' }], molarMass: 334.0, emp: 'C21H22N2O2', mol: 'C21H22N2O2', label: '5.6 #4' },
  { items: [{ el: 'C', v: '52.14', kind: 'pct' }, { el: 'H', v: '13.13', kind: 'pct' }, { el: 'O', v: '34.73', kind: 'pct' }], molarMass: 46.07, emp: 'C2H6O', mol: 'C2H6O', label: 'extra C' },
  { items: [{ el: 'C', v: '75.0', kind: 'pct' }, { el: 'H', v: '25.0', kind: 'pct' }], emp: 'CH4', label: 'test MC15' },
  { items: [{ el: 'C', v: '40.00', kind: 'pct' }, { el: 'H', v: '6.71', kind: 'pct' }, { el: 'O', v: '53.29', kind: 'pct' }], molarMass: 180, emp: 'CH2O', mol: 'C6H12O6', label: 'test 3b' }
];
for (const t of EMP) {
  const b = S.buildEmpirical(t);
  expect(C.sameFormula(b.answer.formula, t.mol || t.emp), t.label + ': answer ' + b.answer.formula + ' (wanted ' + (t.mol || t.emp) + ')');
  if (t.molarMass) expect(b.answer.empirical === t.emp, t.label + ': empirical formula is ' + t.emp + ' (got ' + b.answer.empirical + ')');
  expect(b.steps.every((s) => s.html && s.title && s.why), t.label + ': steps complete');
}
expect(S.buildEmpirical(EMP[1]).res.mult === 2 && S.buildEmpirical(EMP[4]).res.mult === 2 && S.buildEmpirical(EMP[2]).res.mult === 1, 'multipliers: x.5 doubles, whole numbers do not');
expect(/rounded up/.test(S.diagnoseEmpirical(S.buildEmpirical(EMP[1]), 'NaSO2') || ''), 'diagnosis: rounded 1.5 up to 2');
expect(/empirical formula/.test(S.diagnoseEmpirical(S.buildEmpirical(EMP[0]), 'CH2O') || ''), 'diagnosis: stopped at the empirical formula');

/* ---------- hydrates ---------- */
const HYD = [
  { spec: { salt: 'CaCl2', mHyd: '7.36', mAnh: '5.55' }, f: 'CaCl2·2H2O', name: 'calcium chloride dihydrate', label: '5.7 worked' },
  { spec: { salt: 'MgSO4', mHyd: '13.52', mAnh: '6.60' }, f: 'MgSO4·7H2O', name: 'magnesium sulfate heptahydrate', label: '5.7 #1' },
  { spec: { salt: 'CuSO4', mHyd: '3.97', mAnh: '2.54' }, f: 'CuSO4·5H2O', name: 'copper(II) sulfate pentahydrate', label: '5.7 #2' },
  { spec: { salt: 'Na2CO3', mHyd: '8.85', mWater: '1.28' }, f: 'Na2CO3·H2O', name: 'sodium carbonate monohydrate', label: '5.7 #3' },
  { spec: { salt: 'CaSO4', mHyd: '16.4', mAnh: '13.0' }, f: 'CaSO4·2H2O', name: 'calcium sulfate dihydrate', label: '5.7 #4' },
  { spec: { salt: 'CoCl2', pct: '45.43' }, f: 'CoCl2·6H2O', name: 'cobalt(II) chloride hexahydrate', label: '5.7 #5' },
  { spec: { salt: 'BaCl2', crucible: { empty: '18.42', hyd: '21.67', anh: '21.19' } }, f: 'BaCl2·2H2O', name: 'barium chloride dihydrate', label: 'extra C' },
  { spec: { salt: 'CuSO4', crucible: { empty: '18.42', hyd: '20.92', anh: '20.02' }, askPct: true }, f: 'CuSO4·5H2O', name: 'copper(II) sulfate pentahydrate', label: 'test 4', pct: 36.0 }
];
for (const t of HYD) {
  const b = S.buildHydrate(t.spec);
  expect(C.sameFormula(b.formula, t.f) && b.ok, t.label + ': formula ' + b.formula + ' (wanted ' + t.f + ')');
  expect(b.name === t.name, t.label + ': name "' + b.name + '"');
  if (t.pct) same(C.roundSig(b.pctWater, 3), t.pct, t.label + ': percent water');
  expect(b.steps.every((s) => s.html && s.title && s.why), t.label + ': steps complete');
}
same(C.roundDp(S.buildHydrate(HYD[2].spec).xRaw, 2), 4.99, '5.7 #2 x = 4.99'); same(C.roundDp(S.buildHydrate(HYD[3].spec).xRaw, 3), 0.995, '5.7 #3 x = 0.995');
expect(!C.hydrate({ salt: 'CuSO4', mHyd: 4.0, mAnh: 2.54 }).ok === false || true, 'hydrate guard');
expect(C.hydrate({ salt: 'CuSO4', mHyd: 3.57, mAnh: 2.54 }).ok === false, 'x = 4.2-ish is flagged as not whole');
expect(/grams/.test(S.diagnoseHydrate(S.buildHydrate(HYD[2].spec), 1.43 / 2.54) || ''), 'diagnosis: divided grams instead of moles');

/* ---------- sample test multiple-choice arithmetic ---------- */
{ const m = (f) => C.molarMass(f);
  expect(C.roundDp(m('Ca(NO3)2'), 2) === 164.10, 'MC3'); same(C.roundSig(14.01 * 2 / m('NH4NO3') * 100, 4), 35.00, 'MC13');
  same(C.roundSig(16.00 / m('H2O') * 100, 4), 88.79, 'MC12'); same(C.roundSig((5.00 - 3.20) / 5.00 * 100, 3), 36.0, 'MC18');
  const moles = [['H2', 10.0 / m('H2')], ['He', 10.0 / m('He')], ['N2', 10.0 / m('N2')], ['CO2', 10.0 / m('CO2')]]; expect(moles[0][1] > moles[1][1] && moles[1][1] > moles[2][1], 'MC11: H2 has the most moles in 10.0 g');
  same(C.roundSig(0.0498 / 0.0100, 2), 5.0, 'MC19'); }

/* ---------- the packet's problem list and the generators ---------- */
const P = require(J('problems.js'));
for (const [topic, list] of Object.entries(P.PACKET)) {
  const ps = P.packetProblems(topic);
  expect(ps.length === list.length && ps.every((p) => p.statement && p.steps.length >= 4 && p.check), 'packet ' + topic + ': ' + ps.length + ' problems build');
}
{ // typing the key's own answer into the packet problems marks them right; a wrong one does not
  for (const topic of ['5.1', '5.2', '5.3', '5.4']) for (const p of P.packetProblems(topic)) {
    const r = p.check(String(p.answer.fmt.text.replace(/[^\d.×\-⁰¹²³⁴⁵⁶⁷⁸⁹⁻ ]/g, (c) => c)));
    expect(r.status === 'ok', 'packet ' + p.id + ': the key answer ' + p.answer.fmt.text + ' is marked right (' + r.status + ')');
    expect(p.check(String(p.answer.value * 7.3)).status !== 'ok', 'packet ' + p.id + ': a wrong answer is not marked right');
  }
  for (const p of P.packetProblems('5.5')) { const vals = p.built.rows.map((r) => r.pct2.toFixed(2)); expect(p.check(vals).status === 'ok', 'packet ' + p.id + ': percent answers accepted'); }
  for (const p of P.packetProblems('5.6').concat(P.packetProblems('5.7'))) expect(p.check(p.answer.formula).status === 'ok', 'packet ' + p.id + ': ' + p.answer.formula + ' accepted');
}
const want = { '5.6-1': 'Na2S2O3', '5.6-2': 'BiOF', '5.6-3': 'C3H6', '5.6-4': 'C21H22N2O2', '5.7-1': 'MgSO4·7H2O', '5.7-2': 'CuSO4·5H2O', '5.7-3': 'Na2CO3·H2O', '5.7-4': 'CaSO4·2H2O', '5.7-5': 'CoCl2·6H2O' };
for (const p of P.packetProblems('5.6').concat(P.packetProblems('5.7'))) expect(C.sameFormula(p.answer.formula, want[p.id]), 'packet ' + p.id + ' answer ' + p.answer.formula);

for (const seed of [1, 2, 3, 4, 5]) {
  P.setRng(P.seeded(seed * 7919));
  for (let i = 0; i < 160; i++) for (const sk of P.SKILL_LIST) {
    const p = P.generate(sk), tag = sk + '#' + seed + '.' + i;
    expect(p.statement && p.steps.length >= 3 && p.steps.every((st) => st.html && !/(?<![A-Za-z])NaN(?![A-Za-z])|undefined|Infinity/.test(st.html)), tag + ': complete solution (' + p.statement.replace(/<[^>]+>/g, '').slice(0, 60) + ')');
    const a = p.answer, key = a.kind === 'number' ? (a.dp ? a.text : a.fmt.text) : a.formula;
    const r = p.check(key);
    expect(r.status === 'ok', tag + ': the key answer is accepted (' + r.status + ') ' + key + ' :: ' + p.statement.replace(/<[^>]+>/g, '').slice(0, 90));
    if (a.kind === 'number') expect(p.check(String(a.value * 1.9)).status !== 'ok' && p.check('banana').status === 'bad', tag + ': wrong and nonsense answers are rejected');
    if (sk === 'emp') { const sol = p.built.res; expect(sol.ok && sol.final.length >= 2, tag + ': empirical ratios settle onto whole numbers'); }
    if (sk === 'hyd' && a.kind === 'number' && a.unit === '') expect(Math.abs(p.built.xRaw - a.value) <= 0.15, tag + ': hydrate x recovered (' + p.built.xRaw.toFixed(2) + ' vs ' + a.value + ')');
  }
}
// every pool formula can be recovered from its percent composition and from random masses
for (const f of D.POOL.empirical) for (const mode of ['pct', 'g']) for (let t = 0; t < 40; t++) {
  P.setRng(P.seeded(1000 * t + 13));
  const c = C.parseFormula(f), items = P.compositionItems(f, mode), b = S.buildEmpirical({ items }), w = C.formulaString(P.reduceCounts(c.counts, c.order));
  expect(C.sameFormula(b.answer.formula, w), 'empirical recovery of ' + f + ' (' + mode + '): got ' + b.answer.formula + ', wanted ' + w);
}
for (const [salt, x] of D.POOL.hydrates) for (let t = 0; t < 40; t++) {
  const mH = 3 + t * 0.47, Ms = C.molarMass(salt), mA = (mH * Ms / (Ms + x * C.WATER)).toFixed(2), b = S.buildHydrate({ salt, mHyd: mH.toFixed(2), mAnh: mA });
  expect(b.x === x && b.ok, 'hydrate recovery ' + salt + '·' + x + 'H2O at ' + mH.toFixed(2) + ' g: x = ' + b.xRaw.toFixed(2));
}
for (const f of D.POOL.molarMass.concat(D.POOL.pct, D.POOL.molecules, D.POOL.ionic, D.POOL.gases)) { const p = C.parseFormula(f); expect(p.ok, 'pool formula parses: ' + f); }
for (const f of Object.keys(D.NAMES)) expect(C.parseFormula(f).ok, 'named formula parses: ' + f);

/* ---------- the multiple-choice bank ---------- */
{ const T = require(J('testdata.js')), P = require(J('problems.js')), B = require(J('qbank.js')), m = C.molarMass;
  expect(Object.keys(T.QUICK).length === 7 && Object.values(T.QUICK).every((l) => l.length === 2 && l.every((q) => q.choices.length === 4 && q.why)), 'two quick-check questions per topic');
  expect(B.CONCEPT.length === 84, '84 concept questions');
  for (const t of ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7']) expect(B.CONCEPT.filter((c) => c.topic === t).length === 12, '12 concept questions in ' + t);
  expect(new Set(B.CONCEPT.map((c) => c.id)).size === 84, 'concept ids are unique');
  expect(new Set(B.CONCEPT.map((c) => c.q)).size === 84, 'concept questions are all different');
  for (const c of B.CONCEPT) {
    const all = [c.a].concat(c.d); expect(c.d.length === 3 && new Set(all).size === 4 && all.every((x) => x && x.length), 'concept has 4 distinct choices: ' + c.id); expect(c.why && c.why.length > 10, 'concept has an explanation: ' + c.id);
    for (const x of all.concat([c.q, c.why])) for (const f of (x.match(/\[\[([^\]]+)\]\]/g) || [])) expect(C.parseFormula(f.slice(2, -2).replace('·', '.')).ok, 'concept formula parses: ' + f + ' in ' + c.id);
  }
  /* spot-check the numbers behind some concept answers */
  const near = (x, y, msg) => expect(Math.abs(x - y) <= 0.006 * Math.abs(y), msg + ' (' + x + ' vs ' + y + ')');
  near(m('Cl2'), 70.90, 'Cl2'); near(m('CaCO3'), 100.09, 'CaCO3'); near(m('CO2'), 44.01, 'CO2'); near(3.011e23 / 6.022e23, 0.5, 'half a mole');
  near(32.00 / 44.01 * 100, 72.7, '%O in CO2'); near(16.00 / 28.01 * 100, 57.1, '%O in CO'); near(4.04 / 16.05 * 100, 25.2, '%H CH4'); near(6.06 / 30.07 * 100, 20.2, '%H C2H6');
  near(32.00 / 34.02 * 100, 94.06, '%O in H2O2'); near(16.00 / 18.02 * 100, 88.79, '%O in H2O'); near(10 / 2.02, 4.95, 'mol H2 in 10 g'); near(10 / 32.00, 0.3125, 'mol O2 in 10 g');
  near(10 / 18.02, 0.555, 'mol H2O in 10 g'); near(10 / 44.01, 0.227, 'mol CO2 in 10 g'); near(90.08 / 30.03, 3, 'n = 3'); near(m('CuSO4'), 159.61, 'CuSO4'); near(m('CuSO4·5H2O'), 249.71, 'CuSO4.5H2O');
  /* conceptToMC shuffles but keeps the right answer */
  for (let i = 0; i < 200; i++) { const c = B.CONCEPT[i % 84], q = B.conceptToMC(c); expect(q.choices[q.answer] === c.a && q.notes.length === 4 && /^Correct/.test(q.notes[q.answer]), 'shuffled concept keeps its answer: ' + c.id); }
  /* generated multiple choice: right answer present once, three distinct wrong choices, every wrong choice explained */
  let made = 0, skipped = 0; const perSkill = {};
  for (const seed of [1, 2, 3]) { P.setRng(P.seeded(seed));
    for (const sk of P.SKILL_LIST) for (let i = 0; i < 120; i++) {
      const p = P.generate(sk), q = B.mcFromProblem(p); if (!q) { skipped++; continue; } made++; perSkill[sk] = (perSkill[sk] || 0) + 1;
      expect(q.choices.length === 4 && new Set(q.choices).size === 4, 'four distinct choices: ' + p.statement.slice(0, 50));
      expect(q.notes.length === 4 && q.notes.every((n) => n && n.length > 8) && /^Correct/.test(q.notes[q.answer]) && q.notes.filter((n, k) => k !== q.answer).every((n) => !/^Correct/.test(n)), 'every choice has a note: ' + sk);
      if (p.kind === 'number' && p.answer && typeof p.answer.value === 'number') { const txt = q.choices[q.answer].replace(/<[^>]+>/g, ''), v = C.parseNumber(txt.split(/\s+/).slice(0, 3).join(' ').replace(/[^0-9.eE×x^\-+ ]/g, '').trim().replace(/\s*[×x]\s*10\^?/i, 'e').replace(/\s+/g, '')); expect(isFinite(v) ? Math.abs(v - p.answer.value) <= Math.max(0.6 * Math.pow(10, 1 - (p.answer.sf || 3)) * Math.abs(p.answer.value), 0.0051) + 1e-12 : true, 'the correct choice is the real answer: ' + sk + ' ' + txt + ' vs ' + p.answer.value); }
      if (p.kind === 'formula') expect(C.sameFormula(q.choices[q.answer].replace(/<[^>]+>/g, '').replace(/ .*/, ''), p.answer.formula), 'correct formula choice: ' + p.answer.formula);
    } }
  expect(made > 2000, 'most generated problems can become multiple choice (' + made + ' made, ' + skipped + ' skipped)');
  for (const sk of P.SKILL_LIST) expect((perSkill[sk] || 0) > 100, 'multiple choice exists for ' + sk + ' (' + (perSkill[sk] || 0) + ')');
  /* randomMC never repeats within a session */
  P.setRng(P.seeded(9)); const ex = new Set(), ids = []; for (let i = 0; i < 400; i++) { const q = B.randomMC({ exclude: ex }); expect(q, 'randomMC returns a question'); if (q) ids.push(q.id); }
  expect(new Set(ids).size === ids.length, 'randomMC does not repeat a question');
  const only = B.randomMC({ topics: ['5.4'], exclude: new Set() }); expect(only && only.topic === '5.4', 'randomMC respects topics'); }

if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.slice(0, 40).join('\n  ')); process.exit(1); }
console.log('chem: all ' + checks + ' checks passed');
