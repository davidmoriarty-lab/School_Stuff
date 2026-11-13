/* tests/set.test.js: checks the problem sets.   node simulations/mole-conversions-practice/tests/set.test.js */
const M = require('../js/assignment.js'), C = require('../js/chem.js'), S = require('../js/steps.js'), P = require('../js/problems.js');
const problems = []; let checks = 0; const ok = (c, m) => { checks++; if (!c) problems.push(m); };
const key = (p) => p.from + '>' + p.to, one = new Set(M.ONE.map((k) => k.join('>'))), two = new Set(M.TWO.map((k) => k.join('>')));
ok(M.ONE.length === 6 && M.TWO.length === 6 && new Set([...one, ...two]).size === 12, 'there are 12 different conversions');
const seen = { kinds: new Set(), whole: new Set(), half: new Set() };
for (let seed = 10000; seed < 12500; seed++) {
  const s = M.makeSet(seed), conv = s.slice(0, 6), tag = 'set ' + seed + ': ';
  ok(s.length === 8 && conv.every((p) => p.type === 'conv') && s[6].type === 'formula' && s[7].type === 'formula', tag + '6 conversions then 2 formula problems');
  ok(new Set(conv.map(key)).size === 6, tag + 'no conversion appears twice');
  ok(conv.filter((p) => one.has(key(p))).length === 3 && conv.filter((p) => two.has(key(p))).length === 3, tag + '3 one-step and 3 two-step conversions');
  ok(new Set(conv.map((p) => p.formula)).size === 6, tag + 'six different substances');
  for (const p of conv) {
    seen.kinds.add(key(p)); const gas = p.from === 'L' || p.to === 'L';
    ok(!gas || M.GASES.includes(p.formula), tag + 'liters are only asked for real gases (' + p.formula + ')');
    ok(gas === /STP/.test(p.statement), tag + 'STP is mentioned exactly when liters are involved');
    ok(isFinite(p.answer.value) && p.answer.value > 0 && (p.answer.sf === 3 || p.answer.sf === 4) && p.steps.length >= 5 && !/gas gas|undefined|NaN(?![A-Za-z])/.test(p.statement), tag + 'answer and steps exist');
    ok(p.check(p.answer.fmt.text.replace(' × 10', 'e').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, (c) => '0123456789-'['⁰¹²³⁴⁵⁶⁷⁸⁹⁻'.indexOf(c)])).status === 'ok', tag + 'the key answer is accepted: ' + p.answer.fmt.text);
    ok(p.check(String(p.answer.value * 3.7)).status !== 'ok', tag + 'a wrong answer is rejected');
    // independent re-calculation of the answer
    const NA = 6.022e23, mm = C.molarMass(p.formula), v = C.parseNumber(p.built.spec.given.v), mol = p.from === 'part' ? v / NA : p.from === 'g' ? v / mm : p.from === 'L' ? v / 22.4 : v, want = p.to === 'part' ? mol * NA : p.to === 'g' ? mol * mm : p.to === 'L' ? mol * 22.4 : mol;
    ok(Math.abs(p.built.raw - want) <= 1e-9 * want, tag + key(p) + ' answer matches an independent calculation');
  }
  const w = s[6], h = s[7]; seen.whole.add(w.molecular); seen.half.add(h.molecular);
  ok(w.mult === 1 && w.built.res.ok && w.built.res.ratios.every((r) => Math.abs(r - Math.round(r)) < 0.03), tag + 'problem 7 has a whole-number ratio (' + w.built.res.ratios.map((r) => r.toFixed(2)) + ')');
  ok(h.mult === 2 && h.built.res.ok && h.built.res.ratios.some((r) => Math.abs(r - 1.5) < 0.02) && h.built.res.ratios.every((r) => Math.abs(r * 2 - Math.round(r * 2)) < 0.05), tag + 'problem 8 has a 1.5 in its ratio (' + h.built.res.ratios.map((r) => r.toFixed(2)) + ')');
  for (const p of [w, h]) {
    ok(C.sameFormula(p.engine.empirical, p.empirical) && C.sameFormula(p.engine.molecular, p.molecular), tag + 'the solver finds ' + p.empirical + ' and ' + p.molecular + ' from the data given');
    ok(/molar mass/i.test(p.statement) && p.steps.length >= 6, tag + 'the molar mass is given and the solution has steps');
    ok(M.checkFormula(p, 'emp', p.empirical).ok && M.checkFormula(p, 'mol', p.molecular).ok, tag + 'key formulas accepted');
    ok(!M.checkFormula(p, 'mol', p.empirical).ok && /empirical formula/.test(M.checkFormula(p, 'mol', p.empirical).msg), tag + 'empirical typed as molecular is explained');
    ok(M.checkFormula(p, 'emp', 'Xx2').bad === true, tag + 'a nonsense formula is rejected');
  }
  const r = h.built.res.ratios, pairs = h.built.pairs, up = C.formulaString(pairs.map((x, i) => ({ el: x.el, n: Math.round(r[i] + 0.001) })));
  ok(/multiply/.test(M.checkFormula(h, 'emp', up).msg), tag + 'rounding 1.5 up (' + up + ') gets the "multiply by 2" message');
}
ok(seen.kinds.size === 12, 'across many sets, all 12 conversions are used');
ok(seen.whole.size === M.WHOLE.length && seen.half.size === M.HALF.length, 'every formula compound is used (' + seen.whole.size + ' whole, ' + seen.half.size + ' with 1.5)');
/* the same set number gives the same problems; different numbers give different ones */
const sig = (n) => M.makeSet(n).map((p) => p.statement).join('|');
ok(sig(31415) === sig(31415), 'a set number always rebuilds the same set'); ok(sig(31415) !== sig(31416), 'different set numbers differ');
ok(new Set(Array.from({ length: 300 }, (_, i) => sig(20000 + i))).size === 300, '300 set numbers give 300 different sets');
if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.slice(0, 25).join('\n  ')); process.exit(1); }
console.log('set: all ' + checks + ' checks passed');
