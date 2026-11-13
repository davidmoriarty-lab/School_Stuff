/* tests/set.test.js: checks the problem sets.   node simulations/mole-conversions-practice/tests/set.test.js */
const M = require('../js/assignment.js'), C = require('../js/chem.js'), S = require('../js/steps.js'), P = require('../js/problems.js');
const problems = []; let checks = 0; const ok = (c, m) => { checks++; if (!c) problems.push(m); };
const key = (p) => p.from + '>' + p.to, one = new Set(M.ONE.map((k) => k.join('>'))), two = new Set(M.TWO.map((k) => k.join('>')));
ok(M.ONE.length === 6 && M.TWO.length === 6 && new Set([...one, ...two]).size === 12, 'there are 12 different conversions');
const seen = { kinds: new Set(), whole: new Set(), half: new Set(), oxides: new Set() }, labSigs = new Set();
for (let seed = 10000; seed < 12500; seed++) {
  const s = M.makeSet(seed), conv = s.slice(0, 10), tag = 'set ' + seed + ': ';
  ok(s.length === 13 && conv.every((p) => p.type === 'conv') && s[10].type === 'formula' && s[11].type === 'formula' && s[12].type === 'lab', tag + '10 conversions, 2 formula problems, then the lab');
  ok(new Set(conv.map(key)).size === 10, tag + 'no conversion appears twice');
  ok(conv.filter((p) => one.has(key(p))).length === 5 && conv.filter((p) => two.has(key(p))).length === 5, tag + '5 one-step and 5 two-step conversions');
  ok(new Set(conv.map((p) => p.formula)).size === 10, tag + 'ten different substances');
  for (const p of conv) {
    seen.kinds.add(key(p)); const gas = p.from === 'L' || p.to === 'L';
    ok(!gas || M.GASES.includes(p.formula), tag + 'liters are only asked for real gases (' + p.formula + ')');
    ok(!/formula unit/i.test(p.statement + p.unit) && /atom|molecule/.test(p.statement + p.unit) === (p.from === 'part' || p.to === 'part'), tag + 'particles are atoms or molecules, never formula units (' + p.formula + ')');
    ok(gas === /STP/.test(p.statement), tag + 'STP is mentioned exactly when liters are involved');
    ok(isFinite(p.answer.value) && p.answer.value > 0 && (p.answer.sf === 3 || p.answer.sf === 4) && p.steps.length >= 5 && !/gas gas|undefined|NaN(?![A-Za-z])/.test(p.statement), tag + 'answer and steps exist');
    ok(p.check(p.answer.fmt.text.replace(' × 10', 'e').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, (c) => '0123456789-'['⁰¹²³⁴⁵⁶⁷⁸⁹⁻'.indexOf(c)])).status === 'ok', tag + 'the key answer is accepted: ' + p.answer.fmt.text);
    ok(p.check(String(p.answer.value * 3.7)).status !== 'ok', tag + 'a wrong answer is rejected');
    // independent re-calculation of the answer
    const NA = 6.022e23, mm = C.molarMass(p.formula), v = C.parseNumber(p.built.spec.given.v), mol = p.from === 'part' ? v / NA : p.from === 'g' ? v / mm : p.from === 'L' ? v / 22.4 : v, want = p.to === 'part' ? mol * NA : p.to === 'g' ? mol * mm : p.to === 'L' ? mol * 22.4 : mol;
    ok(Math.abs(p.built.raw - want) <= 1e-9 * want, tag + key(p) + ' answer matches an independent calculation');
  }
  const w = s[10], h = s[11]; seen.whole.add(w.molecular); seen.half.add(h.molecular);
  ok(w.mult === 1 && w.built.res.ok && w.built.res.ratios.every((r) => Math.abs(r - Math.round(r)) < 0.03), tag + 'problem 11 has a whole-number ratio (' + w.built.res.ratios.map((r) => r.toFixed(2)) + ')');
  ok(h.mult === 2 && h.built.res.ok && h.built.res.ratios.some((r) => Math.abs(r - 1.5) < 0.02) && h.built.res.ratios.every((r) => Math.abs(r * 2 - Math.round(r * 2)) < 0.05), tag + 'problem 12 has a 1.5 in its ratio (' + h.built.res.ratios.map((r) => r.toFixed(2)) + ')');
  for (const p of [w, h]) {
    ok(C.sameFormula(p.engine.empirical, p.empirical) && C.sameFormula(p.engine.molecular, p.molecular), tag + 'the solver finds ' + p.empirical + ' and ' + p.molecular + ' from the data given');
    ok(/molar mass/i.test(p.statement) && p.steps.length >= 6, tag + 'the molar mass is given and the solution has steps');
    ok(M.checkFormula(p, 'emp', p.empirical).ok && M.checkFormula(p, 'mol', p.molecular).ok, tag + 'key formulas accepted');
    ok(!M.checkFormula(p, 'mol', p.empirical).ok && /empirical formula/.test(M.checkFormula(p, 'mol', p.empirical).msg), tag + 'empirical typed as molecular is explained');
    ok(M.checkFormula(p, 'emp', 'Xx2').bad === true, tag + 'a nonsense formula is rejected');
  }
  /* problem 13: the iron oxide lab */
  const L = s[12], d = L.d, c2 = (x) => Math.round(x * 100);
  ok(M.OXIDES.some((o) => o[2] === L.formula) && C.sameFormula(L.engine.empirical, L.formula), tag + 'lab: the data give a known iron oxide (' + L.formula + ')');
  ok(c2(d.cFe) - c2(d.empty) === c2(d.fe) && c2(d.final) - c2(d.empty) === c2(d.oxide) && c2(d.oxide) - c2(d.fe) === c2(d.o), tag + 'lab: the subtractions are exact');
  ok(d.first < d.final && d.first > d.cFe && d.empty >= 18 && d.fe >= 1.2 && d.fe <= 2.4 && d.o > 0.25, tag + 'lab: heating #1 is below the constant mass but above the iron reading');
  ok(L.statement.includes(d.empty.toFixed(2)) && L.statement.includes(d.final.toFixed(2)) && (L.statement.match(new RegExp(d.final.toFixed(2).replace('.', '\\.') + ' g', 'g')) || []).length === 2, tag + 'lab: the table shows the constant mass twice');
  ok(Math.abs(L.want.fe - d.fe / 55.85) < 1e-12 && Math.abs(L.want.o - d.o / 16.00) < 1e-12, tag + 'lab: moles are mass / molar mass');
  const keyAns = [String(d.fe), String(d.oxide), String(d.o), L.want.fe.toPrecision(3), L.want.o.toPrecision(3), L.formula];
  ok(M.checkLab(L, keyAns).every((r) => r.ok), tag + 'lab: the key answers are all accepted');
  ok(M.checkLab(L, ['', '', '', '', '', '']).every((r) => r.blank), tag + 'lab: blank boxes are not marked wrong');
  const wrong = M.checkLab(L, [String(d.cFe), String(d.first - d.empty), String(d.oxide + d.fe), String(d.fe * 55.85), String(d.o / 32), 'Xx2']);
  ok(wrong[0].msg.includes('together') && wrong[1].msg.includes('heating #1') && wrong[2].msg.includes('added') && wrong[3].msg.includes('multiplied') && wrong[4].msg.includes('ATOMS') && wrong[5].bad, tag + 'lab: typical slips each get their own message');
  ok(L.steps.length >= 6 && L.steps[0].id === 'masses' && /−/.test(L.steps[0].html), tag + 'lab: the solution starts with the subtractions');
  labSigs.add([d.empty, d.fe, L.formula].join('|'));
  const r = h.built.res.ratios, pairs = h.built.pairs, up = C.formulaString(pairs.map((x, i) => ({ el: x.el, n: Math.round(r[i] + 0.001) })));
  ok(/multiply/.test(M.checkFormula(h, 'emp', up).msg), tag + 'rounding 1.5 up (' + up + ') gets the "multiply by 2" message');
}
ok(seen.kinds.size === 12, 'across many sets, all 12 conversions are used');
ok(labSigs.size > 2400, 'the lab data differ from student to student (' + labSigs.size + ' different in 2500 sets)');
ok(seen.whole.size === M.WHOLE.length && seen.half.size === M.HALF.length, 'every formula compound is used (' + seen.whole.size + ' whole, ' + seen.half.size + ' with 1.5)');
/* the same set number gives the same problems; different numbers give different ones */
const sig = (n) => M.makeSet(n).map((p) => p.statement).join('|');
ok(sig(31415) === sig(31415), 'a set number always rebuilds the same set'); ok(sig(31415) !== sig(31416), 'different set numbers differ');
ok(new Set(Array.from({ length: 300 }, (_, i) => sig(20000 + i))).size === 300, '300 set numbers give 300 different sets');
if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.slice(0, 25).join('\n  ')); process.exit(1); }
console.log('set: all ' + checks + ' checks passed');
