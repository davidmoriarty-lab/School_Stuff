/* problems.js: the practice problems.
 *
 *   PACKET     every problem from the Unit 5 notes packet (with its teacher-edition answer), by topic
 *   generate   unlimited new problems with random numbers, for every skill
 *   check      marks a typed answer right / close / wrong and explains the likely mistake
 *
 * A problem is { id, skill, topic, kind, statement, unit, built, steps, answer, check(raw) }.
 * `kind` is 'number', 'formula' or 'multi' (one answer per element).
 */
(function (root) {
  'use strict';
  const C = root.MolesChem || require('./chem.js');
  const S = root.MolesSteps || require('./steps.js');
  const D = root.MolesData || require('./data.js');
  const EL = D.ELEMENTS, T = S.T;

  /* ---------- skills: what the progress tracker counts ---------- */
  const SKILLS = {
    p1: { topic: '5.1', label: 'Particles ↔ moles' },
    mm: { topic: '5.2', label: 'Molar mass' },
    conv: { topic: '5.3', label: 'Grams, moles and particles' },
    inside: { topic: '5.3', label: 'One element inside a compound' },
    stp: { topic: '5.4', label: 'Gas volume at STP' },
    pct: { topic: '5.5', label: 'Percent composition' },
    emp: { topic: '5.6', label: 'Empirical formulas' },
    molf: { topic: '5.6', label: 'Molecular formulas' },
    hyd: { topic: '5.7', label: 'Hydrates' }
  };

  /* ---------- random numbers (can be seeded for tests) ---------- */
  let rng = Math.random;
  const setRng = (f) => { rng = f || Math.random; };
  const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const pick = (a) => a[Math.floor(rng() * a.length)];
  const rint = (a, b) => a + Math.floor(rng() * (b - a + 1));
  /* A number with exactly sf significant figures, as a string: randSf(10, 500, 3) -> "25.0", "176", "5.05" */
  function randSf(min, max, sf) {
    const v = min + rng() * (max - min), e = Math.floor(Math.log10(v));
    let str = C.roundSig(v, sf).toFixed(Math.max(0, sf - 1 - e));
    // "300" would count as ONE sig fig: never hand a student a whole number that ends in zero
    if (str.indexOf('.') < 0 && /0$/.test(str)) str = str.slice(0, -1) + String(rint(1, 9));
    return str;
  }
  /* a particle count in scientific notation: "3.45e24" */
  function randSci(sf, lo, hi) {
    let m = C.roundSig(1 + rng() * 8.9, sf); if (m >= 9.995) m = 9.99;
    return m.toFixed(sf - 1) + 'e' + rint(lo, hi);
  }
  const spName = (f) => { const n = C.nameOf(f); return n ? n + ', [[' + f + ']]' : '[[' + f + ']]'; };

  /* ---------- checking ---------- */
  function sfNote(raw, answer) {
    const typed = C.sigFigs(raw);
    if (answer.sf && typed !== answer.sf && !/^\s*\d+\s*$/.test(raw) && Math.abs(C.parseNumber(raw) - answer.value) / Math.abs(answer.value) > 1e-9)
      return ' Give it to <b>' + answer.sf + '</b> significant figures: <b>' + answer.fmt.html + '</b>.';
    return '';
  }
  function numberCheck(built, diag, absTol) {
    return function (raw) {
      const u = C.parseNumber(raw);
      if (isNaN(u)) return { status: 'bad', msg: 'Type just the number, like <b>1.51e24</b> or <b>1.51 × 10^24</b>. (The unit is already shown next to the box.)' };
      const a = built.answer;
      const good = absTol !== undefined ? Math.abs(u - a.value) <= absTol : C.closeEnough(u, a.value, a.sf);
      if (good) return { status: 'ok', msg: '<b>Correct!</b> ' + a.fmt.html + ' ' + (a.unitHTML || a.unit || '') + sfNote(raw, a) };
      const d = diag ? diag(built, u) : null;
      const rel = Math.abs(u - a.value) / Math.abs(a.value);
      if (d) return { status: 'no', msg: d };
      if (absTol !== undefined ? Math.abs(u - a.value) < absTol * 10 : rel < 0.04) return { status: 'close', msg: 'Close, but not quite. Use atomic masses to <b>two decimal places</b> and keep every digit until the last step.' };
      return { status: 'no', msg: 'Not quite. Check that your units cancel to leave only the unit you want, then try again.' };
    };
  }
  function formulaCheck(built, diag, wantKey) {
    return function (raw) {
      const p = C.parseFormula(raw);
      if (!p.ok) return { status: 'bad', msg: p.error };
      const want = wantKey ? built.answer[wantKey] : built.answer.formula;
      if (C.sameFormula(raw, want)) return { status: 'ok', msg: '<b>Correct!</b> ' + S.fm(want) };
      const d = diag ? diag(built, raw) : null;
      return { status: 'no', msg: d || 'Not quite. Re-check the ratio of moles and whether any decimal needs to be cleared.' };
    };
  }

  /* ---------- building a problem object ---------- */
  function wrap(base, built, extra) {
    const p = Object.assign({ built, steps: built.steps, answer: built.answer }, base, extra);
    return p;
  }

  function convProblem(skill, spec, statement, id) {
    const built = S.buildConv(spec);
    return wrap({ id: id || skill, skill, topic: SKILLS[skill].topic, kind: 'number', statement: T(statement), unit: built.answer.unitHTML, placeholder: 'your answer', check: null }, built, { check: numberCheck(built, S.diagnoseConv) });
  }

  /* ================================================================================== */
  /*  Generators                                                                         */
  /* ================================================================================== */
  const G = {};
  const say = (arr) => pick(arr);           // choose one of several ways to word the same question
  const Fm = (f) => '[[' + f + ']]';
  const nm = (f) => C.nameOf(f);
  const withName = (f) => (nm(f) ? nm(f) + ', ' + Fm(f) : Fm(f));
  const ELN = (e) => EL[e].name.toLowerCase();

  G.p1 = function () {
    const kind = rint(0, 3);
    if (kind === 3) {                    // atoms inside a diatomic or small molecule
      const f = pick(['O2', 'N2', 'H2', 'Cl2', 'F2', 'Br2', 'I2']), el = f.replace(/\d/g, ''), v = randSf(0.2, 9.99, 3);
      return convProblem('p1', { given: { v, unit: 'mol', f }, to: { unit: 'part', f: el } }, say([
        'How many {f|' + ELN(el) + ' atoms} are in {g|' + v + ' mol} of [[' + f + ']] molecules?',
        'A sample contains {g|' + v + ' mol} of ' + withName(f) + ' molecules. How many {f|' + ELN(el) + ' atoms} is that?',
        'Find the number of {f|' + el + ' atoms} in {g|' + v + ' mol} of [[' + f + ']].']));
    }
    const f = pick(kind === 0 ? D.POOL.metals : pick([D.POOL.molecules, D.POOL.ionic])), pw = C.particleWord(f);
    if (rint(0, 1)) {
      const v = randSf(0.2, 9.99, 3);
      return convProblem('p1', { given: { v, unit: 'mol', f }, to: { unit: 'part', f } }, say([
        'How many {f|' + pw + '} are in {g|' + v + ' mol} of ' + withName(f) + '?', 'A chemist has {g|' + v + ' mol} of ' + withName(f) + '. How many {f|' + pw + '} does she have?',
        'Calculate the number of {f|' + pw + '} in {g|' + v + ' moles} of ' + withName(f) + '.', 'What is the {f|number of ' + pw + '} in {g|' + v + ' mol} of [[' + f + ']]?']));
    }
    const v = randSci(rint(2, 3), 22, 26);
    return convProblem('p1', { given: { v, unit: 'part', f }, to: { unit: 'mol', f } }, say([
      'How many {f|moles} are in {g|' + C.fmtGiven(v).html + ' ' + pw + '} of ' + withName(f) + '?', 'A sample contains {g|' + C.fmtGiven(v).html + ' ' + pw + '} of ' + withName(f) + '. How many {f|moles} is that?',
      'Convert {g|' + C.fmtGiven(v).html + ' ' + pw + '} of [[' + f + ']] to {f|moles}.', 'How many {f|moles of ' + nm(f) + '} are represented by {g|' + C.fmtGiven(v).html + ' ' + pw + '}?'].filter((x) => !/moles of null/.test(x))));
  };

  G.conv = function () {
    const f = pick(D.POOL.molarMass.concat(D.POOL.metals)), pw = C.particleWord(f), t = rint(0, 5), name = withName(f);
    if (t === 0) { const v = randSf(10, 499, 3); return convProblem('conv', { given: { v, unit: 'g', f }, to: { unit: 'mol', f } }, say(['How many {f|moles} are in {g|' + v + ' g} of ' + name + '?', 'A student has {g|' + v + ' g} of ' + name + '. How many {f|moles} is that?', 'Convert {g|' + v + ' grams} of [[' + f + ']] to {f|moles}.', 'What {f|amount in moles} of ' + name + ' is present in a {g|' + v + ' g} sample?'])); }
    if (t === 1) { const v = randSf(0.2, 9.99, 3); return convProblem('conv', { given: { v, unit: 'mol', f }, to: { unit: 'g', f } }, say(['What is the {f|mass in grams} of {g|' + v + ' mol} of ' + name + '?', 'How many {f|grams} are in {g|' + v + ' moles} of ' + name + '?', 'Calculate the {f|mass} of {g|' + v + ' mol} of [[' + f + ']].', 'A recipe needs {g|' + v + ' mol} of ' + name + '. How many {f|grams} should be weighed out?'])); }
    if (t === 2) { const v = randSf(5, 250, 3); return convProblem('conv', { given: { v, unit: 'g', f }, to: { unit: 'part', f } }, say(['How many {f|' + pw + '} are in {g|' + v + ' g} of ' + name + '?', 'A sample of ' + name + ' has a mass of {g|' + v + ' g}. How many {f|' + pw + '} does it contain?', 'Find the number of {f|' + pw + '} in {g|' + v + ' grams} of [[' + f + ']].', 'Calculate the {f|number of ' + pw + '} in a {g|' + v + ' g} sample of [[' + f + ']].'])); }
    if (t === 3) { const v = randSci(3, 22, 25); return convProblem('conv', { given: { v, unit: 'part', f }, to: { unit: 'g', f } }, say(['What is the {f|mass in grams} of {g|' + C.fmtGiven(v).html + ' ' + pw + '} of ' + name + '?', 'How many {f|grams} of ' + name + ' contain {g|' + C.fmtGiven(v).html + ' ' + pw + '}?', 'Calculate the {f|mass} of {g|' + C.fmtGiven(v).html + ' ' + pw + '} of [[' + f + ']].'])); }
    if (t === 4) { const v = randSf(10, 499, 3); return convProblem('conv', { given: { v, unit: 'g', f }, to: { unit: 'mol', f } }, say(['How many {f|moles} of ' + name + ' are in {g|' + v + ' g}?', 'Determine the {f|number of moles} in {g|' + v + ' g} of [[' + f + ']].', 'A lab bottle holds {g|' + v + ' g} of ' + name + '. How many {f|moles} is that?'])); }
    const v = randSf(0.2, 9.99, 3); return convProblem('conv', { given: { v, unit: 'mol', f }, to: { unit: 'part', f } }, say(['How many {f|' + pw + '} are in {g|' + v + ' mol} of ' + name + '?', 'Calculate the {f|number of ' + pw + '} in {g|' + v + ' moles} of ' + name + '.']));
  };

  G.inside = function () {
    const [f, el] = pick(D.POOL.insideCompound), t = rint(0, 3), name = withName(f), en = ELN(el);
    if (t === 0) { const v = randSf(0.2, 9.99, 3); return convProblem('inside', { given: { v, unit: 'mol', f }, to: { unit: 'part', f: el } }, say(['How many {f|' + el + ' atoms} are in {g|' + v + ' mol} of ' + name + '?', 'A sample contains {g|' + v + ' mol} of ' + name + '. How many {f|' + en + ' atoms} does it contain?', 'Find the number of {f|' + en + ' atoms} in {g|' + v + ' moles} of [[' + f + ']].'])); }
    if (t === 1) { const v = randSf(0.2, 9.99, 3); return convProblem('inside', { given: { v, unit: 'mol', f }, to: { unit: 'g', f: el } }, say(['A student measures out {g|' + v + ' mol} of ' + name + '. How many {f|grams of ' + en + '} does it contain?', 'How many {f|grams of ' + en + '} are in {g|' + v + ' moles} of [[' + f + ']]?', 'What {f|mass of ' + en + '} is present in {g|' + v + ' mol} of ' + name + '?'])); }
    if (t === 2) { const v = randSf(5, 250, 3); return convProblem('inside', { given: { v, unit: 'g', f }, to: { unit: 'g', f: el } }, say(['A student measures out {g|' + v + ' g} of ' + name + '. How many {f|grams of ' + en + '} are present?', 'How many {f|grams of ' + en + '} are in a {g|' + v + ' g} sample of [[' + f + ']]?', 'Calculate the {f|mass of ' + en + '} contained in {g|' + v + ' grams} of ' + name + '.'])); }
    const v = randSf(5, 250, 3); return convProblem('inside', { given: { v, unit: 'g', f }, to: { unit: 'part', f: el } }, say(['How many {f|' + el + ' atoms} are in {g|' + v + ' g} of ' + name + '?', 'A {g|' + v + ' g} sample of ' + name + ' contains how many {f|' + en + ' atoms}?']));
  };

  G.stp = function () {
    const f = pick(D.POOL.gases), pw = C.particleWord(f), t = rint(0, 5), name = withName(f);
    if (t === 0) { const v = randSf(0.2, 49.9, 3); return convProblem('stp', { given: { v, unit: 'mol', f }, to: { unit: 'L', f } }, say(['What {f|volume} will {g|' + v + ' mol} of ' + name + ' occupy at STP?', 'How many {f|liters} does {g|' + v + ' moles} of ' + name + ' gas fill at STP?', 'At STP, what is the {f|volume} of {g|' + v + ' mol} of [[' + f + ']]?'])); }
    if (t === 1) { const v = randSf(5, 800, 3); return convProblem('stp', { given: { v, unit: 'L', f }, to: { unit: 'mol', f } }, say(['How many {f|moles} of ' + name + ' are in {g|' + v + ' L} at STP?', 'A container holds {g|' + v + ' L} of [[' + f + ']] gas at STP. How many {f|moles} is that?', 'Convert {g|' + v + ' liters} of ' + name + ' at STP to {f|moles}.'])); }
    if (t === 2) { const v = randSf(1, 250, 3); return convProblem('stp', { given: { v, unit: 'g', f }, to: { unit: 'L', f } }, say(['What {f|volume} does {g|' + v + ' g} of ' + name + ' occupy at STP?', 'How many {f|liters} will {g|' + v + ' grams} of [[' + f + ']] gas fill at STP?', 'A {g|' + v + ' g} sample of ' + name + ' is a gas at STP. What is its {f|volume}?'])); }
    if (t === 3) { const v = randSf(5, 800, 3); return convProblem('stp', { given: { v, unit: 'L', f }, to: { unit: 'g', f } }, say(['What is the {f|mass} of {g|' + v + ' L} of ' + name + ' gas at STP?', 'How many {f|grams} of [[' + f + ']] are in {g|' + v + ' liters} at STP?', 'Find the {f|mass in grams} of a {g|' + v + ' L} sample of ' + name + ' at STP.'])); }
    if (t === 4) { const v = randSf(5, 800, 3); return convProblem('stp', { given: { v, unit: 'L', f }, to: { unit: 'part', f } }, say(['How many {f|' + pw + '} are in {g|' + v + ' L} of ' + name + ' at STP?', 'A {g|' + v + ' L} flask of [[' + f + ']] gas is at STP. How many {f|' + pw + '} does it hold?'])); }
    const v = randSci(3, 22, 25); return convProblem('stp', { given: { v, unit: 'part', f }, to: { unit: 'L', f } }, say(['What {f|volume} at STP is occupied by {g|' + C.fmtGiven(v).html + ' ' + pw + '} of ' + name + '?', 'How many {f|liters} do {g|' + C.fmtGiven(v).html + ' ' + pw + '} of [[' + f + ']] gas fill at STP?']));
  };

  function mmProblem(f, id) {
    const built = S.buildMolarMass({ f });
    const stem = say(['Calculate the {f|molar mass} of ' + withName(f) + '.', 'What is the {f|molar mass} of ' + withName(f) + '?', 'Find the {f|mass of one mole} of ' + withName(f) + ' in g/mol.', 'Determine the {f|molar mass} of [[' + f + ']].']);
    return wrap({ id: id || 'mm', skill: 'mm', topic: '5.2', kind: 'number', statement: T(id ? 'Calculate the {f|molar mass} of ' + spName(f) + '.' : stem), unit: 'g/mol', placeholder: 'g/mol' }, built, { check: numberCheck(built, S.diagnoseMolarMass, 0.06) });
  }
  G.mm = () => mmProblem(pick(D.POOL.molarMass));

  function pctProblem(f, el, id) {
    const built = S.buildPercent({ f, only: el });
    const stem = say(['What is the {f|percent by mass of ' + ELN(el) + '} in ' + withName(f) + '?', 'Find the {f|mass percent of ' + ELN(el) + '} in [[' + f + ']].', 'Calculate the {f|percent composition by mass of ' + ELN(el) + '} in ' + withName(f) + '.', '{f|What percent} of the mass of ' + withName(f) + ' is ' + ELN(el) + '?']);
    return wrap({ id: id || 'pct', skill: 'pct', topic: '5.5', kind: 'number', statement: T(id ? 'What is the {f|percent by mass of ' + ELN(el) + '} in ' + spName(f) + '?' : stem), unit: '%', placeholder: '%' }, built, { check: numberCheck(built, S.diagnosePercent, 0.06) });
  }
  G.pct = function () {
    const r = rint(0, 7);
    if (r === 0) {
      const el = pick(['H', 'C', 'O', 'N', 'Na', 'Ca', 'Fe', 'S']), m = randSf(20, 400, 3), pc = randSf(5, 70, 3), built = S.buildPercentOf({ mass: m, pct: pc, el });
      return wrap({ id: 'pct', skill: 'pct', topic: '5.5', kind: 'number', statement: T(say(['A {g|' + m + ' g} sample of a compound is {g|' + pc + ' %} ' + ELN(el) + ' by mass. How many {f|grams of ' + ELN(el) + '} are in the sample?', 'An analysis shows a compound is {g|' + pc + ' %} ' + ELN(el) + ' by mass. How much {f|' + ELN(el) + '} (in grams) is in {g|' + m + ' g} of the compound?'])), unit: 'g ' + el, placeholder: 'grams' }, built, { check: numberCheck(built, null) });
    }
    if (r === 1) {
      const [salt, x] = pick(D.POOL.hydrates), built = S.buildHydratePct({ salt, x });
      return wrap({ id: 'pct', skill: 'pct', topic: '5.5', kind: 'number', statement: T(say(['What is the {f|percent water by mass} in [[' + salt + '·' + x + 'H2O]]?', 'Calculate the {f|percent water} in the hydrate ' + (C.hydrateName(salt, x) || '[[' + salt + '·' + x + 'H2O]]') + ', [[' + salt + '·' + x + 'H2O]].'])), unit: '%', placeholder: '%' }, built, { check: numberCheck(built, null) });
    }
    const f = pick(D.POOL.pct), c = C.parseFormula(f), el = pick(c.order);
    return pctProblem(f, el);
  };

  /* percent data (or masses) from a real formula, for empirical-formula practice */
  function compositionItems(f, mode) {
    const comp = C.composition(f);
    if (mode === 'pct') return comp.rows.map((r) => ({ el: r.el, v: C.roundDp(r.pct, 2).toFixed(2), kind: 'pct' }));
    const total = 20 + rng() * 180;
    return comp.rows.map((r) => { const g = r.pct / 100 * total, e = Math.floor(Math.log10(g)); return { el: r.el, v: C.roundSig(g, 4).toFixed(Math.max(0, 3 - e)), kind: 'g' }; });
  }
  const reduceCounts = (counts, order) => { const g = order.map((e) => counts[e]).reduce(function gcd(a, b) { return b ? gcd(b, a % b) : a; }); return order.map((e) => ({ el: e, n: counts[e] / g })); };
  const itemsText = (items) => items.map((it) => '{g|' + it.v + (it.kind === 'pct' ? ' % ' : ' g ') + it.el + '}').join(', ').replace(/, ([^,]*)$/, ' and $1');

  G.emp = function () {
    const f = pick(D.POOL.empirical), c = C.parseFormula(f), mode = rint(0, 2) === 0 ? 'g' : 'pct', items = compositionItems(f, mode);
    const built = S.buildEmpirical({ items });
    const want = C.formulaString(reduceCounts(c.counts, c.order));
    built.answer = { kind: 'formula', formula: want, text: want };
    const stmt = mode === 'pct' ? say(['A compound is ' + itemsText(items) + ' by mass. What is its {f|empirical formula}?', 'Analysis of an unknown compound gives ' + itemsText(items) + ' by mass. Determine its {f|empirical formula}.', 'Find the {f|empirical formula} of a compound that is ' + itemsText(items) + ' by mass.'])
      : say(['A compound contains ' + itemsText(items) + '. What is its {f|empirical formula}?', 'A sample is analyzed and found to contain ' + itemsText(items) + '. Determine the {f|empirical formula} of the compound.']);
    return wrap({ id: 'emp', skill: 'emp', topic: '5.6', kind: 'formula', statement: T(stmt), unit: '', placeholder: 'e.g. C2H5' }, built, { check: formulaCheck(built, S.diagnoseEmpirical) });
  };
  G.molf = function () {
    const f = pick(D.POOL.empirical.filter((x) => { const c = C.parseFormula(x); const r = reduceCounts(c.counts, c.order); return r.some((p, i) => p.n !== c.counts[c.order[i]]); }));
    const c = C.parseFormula(f), items = compositionItems(f, 'pct'), M = C.fmtVal(C.molarMass(f), 4).text;
    if (rint(0, 1)) {                              // empirical formula and molar mass are given directly
      const emp = C.formulaString(reduceCounts(c.counts, c.order)), mb = S.buildMolecular({ emp, molarMass: M });
      return wrap({ id: 'molf', skill: 'molf', topic: '5.6', kind: 'formula', statement: T(say(['A compound has the empirical formula [[' + emp + ']] and a molar mass of {g|' + M + ' g/mol}. What is its {f|molecular formula}?', 'The empirical formula of a compound is [[' + emp + ']]. Its molar mass is {g|' + M + ' g/mol}. Find its {f|molecular formula}.', 'A compound with the empirical formula [[' + emp + ']] has a molar mass of {g|' + M + ' g/mol}. Determine the {f|molecular formula}.'])), unit: '', placeholder: 'molecular formula' }, mb, { check: formulaCheck(mb, S.diagnoseEmpirical) });
    }
    const built = S.buildEmpirical({ items, molarMass: parseFloat(M) });
    built.answer = Object.assign({}, built.answer, { formula: f, text: f });
    const stmt = say(['A compound is ' + itemsText(items) + ' by mass and has a molar mass of {g|' + M + ' g/mol}. Find its {f|molecular formula}.', 'An unknown compound is ' + itemsText(items) + ' by mass. Its molar mass is {g|' + M + ' g/mol}. What is its {f|molecular formula}?']);
    return wrap({ id: 'molf', skill: 'molf', topic: '5.6', kind: 'formula', statement: T(stmt), unit: '', placeholder: 'molecular formula' }, built, { check: formulaCheck(built, S.diagnoseEmpirical) });
  };

  G.hyd = function () {
    const [salt, x] = pick(D.POOL.hydrates), Ms = C.molarMass(salt), mH = randSf(3, 20, 3), mAnh = (parseFloat(mH) * Ms / (Ms + x * C.WATER)).toFixed(2);
    const ask = pick(['x', 'formula', 'pct', 'crucible', 'water', 'name']);
    const name = C.nameOf(salt) || salt, hf = '[[' + salt + '·' + x + 'H2O]]';
    if (ask === 'water') {
      const v = randSf(5, 200, 3);
      return convProblem('hyd', { given: { v, unit: 'g', f: salt + '·' + x + 'H2O' }, to: { unit: 'g', f: 'H2O' } }, say(['How many {f|grams of water} are driven off when {g|' + v + ' g} of ' + hf + ' is heated until it is anhydrous?', 'A {g|' + v + ' g} sample of ' + hf + ' is heated strongly. What {f|mass of water} is lost?']));
    }
    if (ask === 'crucible') {
      const empty = randSf(15, 25, 4), hyd = (parseFloat(empty) + parseFloat(mH)).toFixed(2), anh = (parseFloat(empty) + parseFloat(mAnh)).toFixed(2);
      const built = S.buildHydrate({ salt, crucible: { empty, hyd, anh } });
      built.answer = Object.assign({}, built.answer, { value: x, sf: 1, fmt: { text: String(x), html: String(x) }, unit: '', kind: 'number' });
      return wrap({ id: 'hyd', skill: 'hyd', topic: '5.7', kind: 'number', statement: T('A student heats a hydrate of ' + name + ', [[' + salt + ']], in a crucible. The empty crucible is {g|' + empty + ' g}. Crucible + hydrate is {g|' + hyd + ' g}. After heating until the mass stops changing, crucible + solid is {g|' + anh + ' g}. Find the value of {f|x} in [[' + salt + '·xH2O]].'), unit: 'x =', placeholder: 'whole number' }, built, { check: numberCheck(built, S.diagnoseHydrate, 0.3) });
    }
    const built = S.buildHydrate({ salt, mHyd: mH, mAnh, askPct: ask === 'pct' });
    const base = say(['A {g|' + mH + ' g} sample of a hydrate of ' + name + ', [[' + salt + ']], is heated until no water remains. The anhydrous [[' + salt + ']] has a mass of {g|' + mAnh + ' g}. ',
      'A hydrate of ' + name + ' has a mass of {g|' + mH + ' g}. After heating, {g|' + mAnh + ' g} of [[' + salt + ']] remains. ', 'When {g|' + mH + ' g} of a hydrate of [[' + salt + ']] is heated, the solid left over has a mass of {g|' + mAnh + ' g}. ']);
    if (ask === 'x') { built.answer = Object.assign({}, built.answer, { value: x, sf: 1, fmt: { text: String(x), html: String(x) }, unit: '', kind: 'number' });
      return wrap({ id: 'hyd', skill: 'hyd', topic: '5.7', kind: 'number', statement: T(base + 'Find the value of {f|x} in [[' + salt + '·xH2O]].'), unit: 'x =', placeholder: 'whole number' }, built, { check: numberCheck(built, S.diagnoseHydrate, 0.3) }); }
    if (ask === 'pct') { const v = built.pctWater; built.answer = Object.assign({}, built.answer, { kind: 'number', value: v, sf: 3, fmt: C.fmtVal(v, 3), unit: '%', text: C.fmtVal(v, 3).text });
      return wrap({ id: 'hyd', skill: 'hyd', topic: '5.7', kind: 'number', statement: T(base + 'What is the {f|percent water by mass} in the hydrate?'), unit: '%', placeholder: '%' }, built, { check: numberCheck(built, null) }); }
    if (ask === 'name') { const nmx = built.name;
      return wrap({ id: 'hyd', skill: 'hyd', topic: '5.7', kind: 'formula', statement: T(base + 'Find the {f|formula} of the hydrate (then name it).'), unit: '', placeholder: 'e.g. CuSO4·5H2O' }, built, { check: formulaCheck(built, null) }); }
    return wrap({ id: 'hyd', skill: 'hyd', topic: '5.7', kind: 'formula', statement: T(base + 'Find the {f|formula} of the hydrate.'), unit: '', placeholder: 'e.g. CuSO4·5H2O' }, built, { check: formulaCheck(built, null) });
  };

  const generate = (skill) => G[skill]();
  const SKILL_LIST = Object.keys(SKILLS);

  /* ================================================================================== */
  /*  The packet's own problems (with teacher-edition answers)                           */
  /* ================================================================================== */
  const cv = (skill, v, u, f, tu, tf, q, id, extraSf) => () => convProblem(skill, { given: { v, unit: u, f }, to: { unit: tu, f: tf }, extraSf }, q, id);
  const mmp = (f, id) => () => mmProblem(f, id);
  function pctMulti(f, id) {
    const built = S.buildPercent({ f });
    return () => wrap({ id, skill: 'pct', topic: '5.5', kind: 'multi', statement: T('Find the {f|percent composition} of every element in ' + spName(f) + '.'), unit: '%' }, built, {
      check: (vals) => {
        const rows = built.rows.map((r, i) => { const u = C.parseNumber(vals[i]); return { el: r.el, ok: Math.abs(u - r.pct2) <= 0.06, bad: isNaN(u), want: r.pct2 }; });
        if (rows.some((r) => r.bad)) return { status: 'bad', msg: 'Fill in a number for every element.' };
        const right = rows.filter((r) => r.ok).length;
        return right === rows.length ? { status: 'ok', msg: '<b>Correct!</b> ' + rows.map((r) => r.el + ' ' + r.want.toFixed(2) + ' %').join(', '), rows }
          : { status: 'no', msg: right + ' of ' + rows.length + ' right. Check the ones marked ✘: use ALL the atoms of the element (the subscript) and divide by the whole molar mass.', rows };
      } });
  }
  function empP(items, molarMass, empWant, molWant, q, id, skill) {
    return () => {
      const built = S.buildEmpirical({ items, molarMass });
      return wrap({ id, skill: skill || (molarMass ? 'molf' : 'emp'), topic: '5.6', kind: 'formula', statement: T(q), unit: '', placeholder: molWant ? 'molecular formula' : 'empirical formula' }, built, { check: formulaCheck(built, S.diagnoseEmpirical) });
    };
  }
  function hydP(spec, q, id, ask) {
    return () => {
      const built = S.buildHydrate(spec);
      return wrap({ id, skill: 'hyd', topic: '5.7', kind: 'formula', statement: T(q), unit: '', placeholder: 'formula of the hydrate' }, built, {
        check: (raw) => {
          const p = C.parseFormula(raw);
          if (!p.ok) return { status: 'bad', msg: p.error };
          if (C.sameFormula(raw, built.formula)) return { status: 'ok', msg: '<b>Correct!</b> ' + S.fm(built.formula) + (built.name ? ' — ' + built.name : '') };
          return { status: 'no', msg: 'Not quite. Compare <b>moles</b> of water to moles of salt (not grams), and round x to a whole number.' };
        } });
    };
  }
  const EI = (el, v, kind) => ({ el, v, kind });

  const PACKET = {
    '5.1': [
      cv('p1', '1.75', 'mol', 'Al', 'part', 'Al', 'How many {f|atoms} are in {g|1.75 moles} of aluminum?', '5.1-3'),
      cv('p1', '3.25', 'mol', 'H2O', 'part', 'H2O', 'How many {f|molecules} are in {g|3.25 moles} of [[H2O]]?', '5.1-4'),
      cv('p1', '3.4e26', 'part', 'CO2', 'mol', 'CO2', 'How many {f|moles} are in {g|3.4 × 10²⁶ molecules} of [[CO2]]?', '5.1-5'),
      cv('p1', '3.88e25', 'part', 'Ni', 'mol', 'Ni', 'How many {f|moles} are there in {g|3.88 × 10²⁵ atoms} of nickel?', '5.1-6')
    ],
    '5.2': ['Be', 'N2', 'O2', 'F2', 'Mg', 'Ag', 'LiI', 'PbCO3', 'Mg(OH)2', 'K3PO4', '(NH4)3PO4', 'C6H12O6'].map((f, i) => mmp(f, '5.2-' + (i + 1))),
    '5.3': [
      cv('conv', '2.5e24', 'part', 'CO2', 'g', 'CO2', 'Calculate the number of {f|grams} of [[CO2]] that will contain {g|2.5 × 10²⁴ molecules} of [[CO2]].', '5.3-1'),
      cv('conv', '176', 'g', 'CF4', 'mol', 'CF4', 'How many {f|moles} of carbon tetrafluoride, [[CF4]], are in {g|176 grams} of [[CF4]]?', '5.3-2'),
      cv('conv', '360.0', 'g', 'H2O', 'mol', 'H2O', 'How many {f|moles} of water are in {g|360.0 grams} of water?', '5.3-3'),
      cv('conv', '79.85', 'g', 'Fe2O3', 'mol', 'Fe2O3', 'How many {f|moles} of iron(III) oxide, [[Fe2O3]], are there in {g|79.85 grams} of iron(III) oxide?', '5.3-4'),
      cv('conv', '52.5', 'g', 'Cl2', 'part', 'Cl2', 'How many {f|molecules} of chlorine gas, [[Cl2]], are present in {g|52.5 grams} of [[Cl2]]?', '5.3-5'),
      cv('inside', '5.6', 'mol', 'Cu2O3', 'part', 'Cu', 'How many {f|copper atoms} are present in {g|5.6 moles} of [[Cu2O3]]?', '5.3-6'),
      cv('inside', '2.5', 'mol', 'C6H12O6', 'g', 'O', 'A student measures out {g|2.5 moles} of glucose, [[C6H12O6]]. How many {f|grams of oxygen} are contained in that amount of glucose?', '5.3-7'),
      cv('inside', '15.0', 'g', 'CaCl2', 'g', 'Cl', 'A student measures out {g|15.0 grams} of [[CaCl2]]. How many {f|grams of chlorine} are present?', '5.3-8')
    ],
    '5.4': [
      cv('stp', '3.20', 'mol', 'O2', 'L', 'O2', 'What {f|volume} will {g|3.20 moles} of [[O2]] occupy at STP?', '5.4-1'),
      cv('stp', '1.75', 'mol', 'NH3', 'L', 'NH3', 'What {f|volume} will {g|1.75 moles} of [[NH3]] occupy at STP?', '5.4-2'),
      cv('stp', '37.8', 'mol', 'CO2', 'L', 'CO2', 'What {f|volume} will {g|37.8 moles} of [[CO2]] occupy at STP?', '5.4-3'),
      cv('stp', '5.05', 'g', 'He', 'L', 'He', 'What {f|volume} will {g|5.05 grams} of helium occupy at STP?', '5.4-4'),
      cv('stp', '60.0', 'g', 'Xe', 'L', 'Xe', 'What {f|volume} will {g|60.0 grams} of xenon occupy at STP?', '5.4-5'),
      cv('stp', '75.3', 'L', 'NH3', 'part', 'NH3', 'A sample of [[NH3]] gas occupies {g|75.3 L} at STP. How many {f|molecules} is this?', '5.4-6'),
      cv('stp', '575', 'L', 'NH3', 'g', 'NH3', 'What is the {f|mass} of {g|575 L} of ammonia ([[NH3]]) gas at STP?', '5.4-7'),
      cv('stp', '5.00', 'g', 'O2', 'L', 'O2', 'A {g|5.00 gram} sample of [[O2]] is in a container at STP. What is the {f|volume} of this sample?', '5.4-8'),
      cv('stp', '5.00', 'g', 'O2', 'part', 'O2', 'How many {f|molecules} are present in the {g|5.00 g} of [[O2]] in the container in the question above?', '5.4-9'),
      cv('stp', '0.12', 'L', 'CO2', 'part', 'CO2', 'How many {f|molecules} are present in {g|0.12 L} of carbon dioxide gas at STP? <small>(Part 1 of 2)</small>', '5.4-10a'),
      cv('stp', '0.12', 'L', 'CO2', 'g', 'CO2', 'How many {f|grams} of carbon dioxide are in {g|0.12 L} at STP? <small>(Part 2 of 2: use the same mole value)</small>', '5.4-10b')
    ],
    '5.5': ['NaOH', 'CuBr2', 'N2S2', '(NH4)2S', '(NH4)3PO4'].map((f, i) => pctMulti(f, '5.5-' + (i + 1))),
    '5.6': [
      empP([EI('Na', '87.3', 'g'), EI('S', '121.5', 'g'), EI('O', '91.2', 'g')], undefined, 'Na2S2O3', null, 'Determine the {f|empirical formula} of the compound if it contains {g|87.3 g Na}, {g|121.5 g S} and {g|91.2 g O}.', '5.6-1'),
      empP([EI('Bi', '85.65', 'pct'), EI('O', '6.56', 'pct'), EI('F', '7.79', 'pct')], undefined, 'BiOF', null, 'A compound contains {g|85.65 % Bi}, {g|6.56 % O} and {g|7.79 % F}. What is the {f|empirical formula} of this compound?', '5.6-2'),
      () => { const mb = S.buildMolecular({ emp: 'CH2', molarMass: '42.09' }); return wrap({ id: '5.6-3', skill: 'molf', topic: '5.6', kind: 'formula', statement: T('Propene has an empirical formula of [[CH2]]. What is its {f|molecular formula} if it has a molar mass of {g|42.09 g/mol}?'), unit: '', placeholder: 'molecular formula' }, mb, { check: formulaCheck(mb, S.diagnoseEmpirical) }); },
      empP([EI('C', '75.42', 'pct'), EI('H', '6.63', 'pct'), EI('N', '8.38', 'pct'), EI('O', '9.57', 'pct')], 334.0, 'C21H22N2O2', 'C21H22N2O2', 'The percent composition of an unknown substance is {g|75.42 % carbon}, {g|6.63 % hydrogen}, {g|8.38 % nitrogen} and {g|9.57 % oxygen}. If its molar mass is {g|334.0 g/mol}, what is its {f|molecular formula}?', '5.6-4')
    ],
    '5.7': [
      hydP({ salt: 'MgSO4', mHyd: '13.52', mAnh: '6.60' }, 'A hydrate of magnesium sulfate has a mass of {g|13.52 g}. This sample is heated until no water remains. The [[MgSO4]] anhydrate has a mass of {g|6.60 g}. Find the {f|formula} of the hydrate.', '5.7-1'),
      hydP({ salt: 'CuSO4', mHyd: '3.97', mAnh: '2.54' }, 'A sample of copper(II) sulfate hydrate has a mass of {g|3.97 g}. After heating, the [[CuSO4]] that remains has a mass of {g|2.54 g}. Determine the {f|formula} of the hydrate.', '5.7-2'),
      hydP({ salt: 'Na2CO3', mHyd: '8.85', mWater: '1.28' }, 'A sample of the hydrate of sodium carbonate has a mass of {g|8.85 g}. It loses {g|1.28 g} when heated. Find the {f|formula} of the hydrate.', '5.7-3'),
      hydP({ salt: 'CaSO4', mHyd: '16.4', mAnh: '13.0' }, 'A {g|16.4 g} sample of hydrated calcium sulfate is heated until all the water is driven off. The calcium sulfate that remains has a mass of {g|13.0 g}. Find the {f|formula} of the hydrate.', '5.7-4'),
      hydP({ salt: 'CoCl2', pct: '45.43' }, 'A hydrate is determined to be {g|45.43 % water} and {g|54.57 % CoCl₂}. Find the {f|formula} of this hydrate. <small>(Hint: assume 100 g total.)</small>', '5.7-5')
    ]
  };

  /* Resolve a packet problem when it is needed (building every solution up front is wasteful) */
  const packetProblems = (topic) => (PACKET[topic] || []).map((mk) => mk());

  /* ---------- named worked examples used on the topic pages ---------- */
  const EXAMPLES = {
    mg: cv('p1', '2.50', 'mol', 'Mg', 'part', 'Mg', 'How many {f|atoms} are in {g|2.50 mol} of magnesium?', 'ex-mg'),
    co2: cv('p1', '3.4e26', 'part', 'CO2', 'mol', 'CO2', 'How many {f|moles} are in {g|3.4 × 10²⁶ molecules} of [[CO2]]?', 'ex-co2'),
    o2atoms: cv('p1', '2.00', 'mol', 'O2', 'part', 'O', 'How many {f|oxygen atoms} are in {g|2.00 mol} of [[O2]] molecules?', 'ex-o2'),
    al2so4: mmp('Al2(SO4)3', 'ex-al2so4'), mgoh: mmp('Mg(OH)2', 'ex-mgoh'), n2: mmp('N2', 'ex-n2'), nh4: mmp('(NH4)3PO4', 'ex-nh4'),
    h2o: cv('conv', '9.00', 'g', 'H2O', 'part', 'H2O', 'How many {f|molecules} are in {g|9.00 g} of water?', 'ex-h2o'),
    co2g: cv('conv', '2.5e24', 'part', 'CO2', 'g', 'CO2', 'Calculate the number of {f|grams} of [[CO2]] that will contain {g|2.5 × 10²⁴ molecules} of [[CO2]].', 'ex-co2g'),
    cf4: cv('conv', '176', 'g', 'CF4', 'mol', 'CF4', 'How many {f|moles} of carbon tetrafluoride, [[CF4]], are in {g|176 grams} of [[CF4]]?', 'ex-cf4'),
    cu: cv('inside', '5.6', 'mol', 'Cu2O3', 'part', 'Cu', 'How many {f|copper atoms} are present in {g|5.6 moles} of [[Cu2O3]]?', 'ex-cu'),
    glu: cv('inside', '2.5', 'mol', 'C6H12O6', 'g', 'O', 'A student measures out {g|2.5 moles} of glucose, [[C6H12O6]]. How many {f|grams of oxygen} are in that amount?', 'ex-glu'),
    cacl2: cv('inside', '15.0', 'g', 'CaCl2', 'g', 'Cl', 'A student measures out {g|15.0 grams} of [[CaCl2]]. How many {f|grams of chlorine} are present?', 'ex-cacl2'),
    o2g: cv('stp', '8.00', 'g', 'O2', 'L', 'O2', 'What {f|volume} does {g|8.00 g} of [[O2]] occupy at STP?', 'ex-o2g'),
    nh3L: cv('stp', '75.3', 'L', 'NH3', 'part', 'NH3', 'A sample of [[NH3]] gas occupies {g|75.3 L} at STP. How many {f|molecules} is this?', 'ex-nh3L'),
    co2L: cv('stp', '0.12', 'L', 'CO2', 'g', 'CO2', 'How many {f|grams} of carbon dioxide are in {g|0.12 L} at STP?', 'ex-co2L'),
    xe: cv('stp', '60.0', 'g', 'Xe', 'L', 'Xe', 'What {f|volume} will {g|60.0 grams} of xenon occupy at STP?', 'ex-xe'),
    caco3: () => { const built = S.buildPercent({ f: 'CaCO3' }); return wrap({ id: 'ex-caco3', skill: 'pct', topic: '5.5', kind: 'multi', statement: T('Find the {f|percent composition} of calcium carbonate, [[CaCO3]].') }, built, {}); },
    nh4no3: () => { const built = S.buildPercent({ f: 'NH4NO3', only: 'N' }); return wrap({ id: 'ex-nh4no3', skill: 'pct', topic: '5.5', kind: 'number', statement: T('What is the {f|percent by mass of nitrogen} in ammonium nitrate, [[NH4NO3]]?'), unit: '%' }, built, {}); },
    nh42s: () => { const built = S.buildPercent({ f: '(NH4)2S' }); return wrap({ id: 'ex-nh42s', skill: 'pct', topic: '5.5', kind: 'multi', statement: T('Find the {f|percent composition} of [[(NH4)2S]].') }, built, {}); },
    glucose: empP([EI('C', '40.0', 'pct'), EI('H', '6.7', 'pct'), EI('O', '53.3', 'pct')], 180, 'CH2O', 'C6H12O6', 'A compound is {g|40.0 % C}, {g|6.7 % H} and {g|53.3 % O} by mass and has a molar mass of {g|180 g/mol}. Find its {f|empirical} and {f|molecular formulas}.', 'ex-glucose'),
    thio: empP([EI('Na', '87.3', 'g'), EI('S', '121.5', 'g'), EI('O', '91.2', 'g')], undefined, 'Na2S2O3', null, 'Determine the {f|empirical formula} of a compound that contains {g|87.3 g Na}, {g|121.5 g S} and {g|91.2 g O}.', 'ex-thio'),
    meth: empP([EI('C', '75.0', 'pct'), EI('H', '25.0', 'pct')], undefined, 'CH4', null, 'A compound is {g|75.0 % C} and {g|25.0 % H} by mass. What is its {f|empirical formula}?', 'ex-meth'),
    hard: empP([EI('C', '75.42', 'pct'), EI('H', '6.63', 'pct'), EI('N', '8.38', 'pct'), EI('O', '9.57', 'pct')], 334.0, 'C21H22N2O2', 'C21H22N2O2', 'The percent composition of an unknown substance is {g|75.42 % C}, {g|6.63 % H}, {g|8.38 % N} and {g|9.57 % O}. Its molar mass is {g|334.0 g/mol}. Find the {f|empirical and molecular formulas}.', 'ex-hard'),
    propene: () => { const mb = S.buildMolecular({ emp: 'CH2', molarMass: '42.09' }); return wrap({ id: 'ex-propene', skill: 'molf', topic: '5.6', kind: 'formula', statement: T('Propene has the empirical formula [[CH2]] and a molar mass of {g|42.09 g/mol}. What is its {f|molecular formula}?') }, mb, {}); },
    cacl2hyd: hydP({ salt: 'CaCl2', mHyd: '7.36', mAnh: '5.55' }, 'A {g|7.36 g} sample of a hydrate of calcium chloride is heated until no water remains. The [[CaCl2]] left has a mass of {g|5.55 g}. Find the {f|formula and name} of the hydrate.', 'ex-cacl2hyd'),
    pctHyd: hydP({ salt: 'CoCl2', pct: '45.43' }, 'A hydrate is {g|45.43 % water} and {g|54.57 % CoCl₂}. Find the {f|formula and name}. <small>(Assume 100 g.)</small>', 'ex-pcthyd'),
    mono: hydP({ salt: 'Na2CO3', mHyd: '8.85', mWater: '1.28' }, 'A sample of a sodium carbonate hydrate has a mass of {g|8.85 g}. It loses {g|1.28 g} when heated. Find the {f|formula and name}.', 'ex-mono'),
    cruc: hydP({ salt: 'CuSO4', crucible: { empty: '18.42', hyd: '20.92', anh: '20.02' }, askPct: true }, 'A student heats blue [[CuSO4·xH2O]] in a crucible. Empty crucible: {g|18.42 g}. Crucible + hydrate: {g|20.92 g}. Crucible + solid after heating: {g|20.02 g}. Find {f|x}, the formula and the name, and the percent water.', 'ex-cruc')
  };
  const example = (key) => EXAMPLES[key]();

  const pctMultiProblem = (f, id) => pctMulti(f, id || 'pct-' + f)();

  const api = { pctMultiProblem, SKILLS, SKILL_LIST, setRng, seeded, generate, PACKET, packetProblems, EXAMPLES, example, mmProblem, pctProblem, convProblem, randSf, randSci, pick, rint, rng: () => rng(), itemsText, compositionItems, reduceCounts };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MolesProblems = api;
})(typeof self !== 'undefined' ? self : this);
