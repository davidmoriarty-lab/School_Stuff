/* assignment.js: the Mole Conversions practice set.
 *
 * Every student gets their own set of 8 problems, built from a "set number" (the seed):
 *   1-6  mole conversions between particles, moles, grams and liters of gas at STP.
 *        There are 12 possible conversions (6 one-step, 6 two-step). Each set uses 3 of each,
 *        so no conversion appears twice.
 *   7    empirical + molecular formula where the mole ratio comes out in whole numbers
 *   8    empirical + molecular formula where the ratio comes out as 1 : 1.5, so every number
 *        has to be multiplied by 2
 * The same set number always rebuilds the same problems, so a teacher can open a student's set
 * with  index.html?set=12345.
 *
 * The chemistry (answers, step-by-step solutions, wrong-answer diagnosis) comes from the same
 * engine as the Moles Study Guide: chem.js, steps.js and problems.js.
 */
(function (root) {
  'use strict';
  const C = root.MolesChem || require('./chem.js'), S = root.MolesSteps || require('./steps.js'), P = root.MolesProblems || require('./problems.js'), D = root.MolesData || require('./data.js'), UI = root.MolesUI;
  const T = S.T, fm = C.fmtFormula;

  /* ---------- the 12 conversions ---------- */
  const ONE = [['part', 'mol'], ['mol', 'part'], ['g', 'mol'], ['mol', 'g'], ['L', 'mol'], ['mol', 'L']];
  const TWO = [['part', 'g'], ['g', 'part'], ['part', 'L'], ['L', 'part'], ['g', 'L'], ['L', 'g']];
  const UNIT = { part: 'particles', mol: 'moles', g: 'grams', L: 'liters at STP' };
  /* substances that really are gases at 0 °C and 1 atm */
  const GASES = ['O2', 'N2', 'H2', 'He', 'Ne', 'Ar', 'Kr', 'Xe', 'Cl2', 'F2', 'CO2', 'CO', 'NH3', 'CH4', 'SO2', 'C3H8', 'C2H6', 'C2H4', 'C2H2', 'H2S', 'N2O', 'HCl', 'NF3', 'SF6'].filter((f) => C.parseFormula(f).ok);
  const SOLIDS = D.POOL.molecules.filter((f) => D.POOL.gases.indexOf(f) < 0).concat(D.POOL.ionic, D.POOL.metals);
  /* empirical / molecular pairs. WHOLE: the ratio is whole numbers. HALF: the ratio has a 1.5 */
  const WHOLE = [['CH2O', 'C6H12O6'], ['CH2O', 'C2H4O2'], ['CH2O', 'C3H6O3'], ['CH2O', 'C5H10O5'], ['CH2', 'C2H4'], ['CH2', 'C4H8'], ['CH2', 'C6H12'], ['CH', 'C6H6'], ['CH', 'C2H2'], ['NO2', 'N2O4'], ['HO', 'H2O2'], ['CH3', 'C2H6'], ['NH2', 'N2H4'], ['CH2Cl', 'C2H4Cl2'], ['C2H4O', 'C4H8O2'], ['CHO2', 'C2H2O4'], ['C5H7N', 'C10H14N2']];
  const HALF = [['C2H3', 'C4H6'], ['C2H3', 'C8H12'], ['P2O3', 'P4O6'], ['As2O3', 'As4O6'], ['C2H3O2', 'C4H6O4'], ['C2H3O3', 'C4H6O6']];

  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(P.rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function convProblem(from, to, used) {
    const gas = from === 'L' || to === 'L'; let f;
    do { f = P.pick(gas ? GASES : SOLIDS); } while (used.has(f)); used.add(f);
    const v = from === 'part' ? P.randSci(3, 22, 25) : from === 'L' ? P.randSf(5, 400, 3) : from === 'g' ? P.randSf(5, 250, 3) : P.randSf(0.2, 9.99, 3);
    const pw = C.particleWord(f), name = (C.nameOf(f) || '').replace(/ gas$/, ''), sub = name ? name + (gas ? ' gas' : '') + ', [[' + f + ']]' : '[[' + f + ']]' + (gas ? ' gas' : '');
    const given = '{g|' + (from === 'part' ? C.fmtGiven(v).html + ' ' + pw : v + ({ mol: ' mol', g: ' g', L: ' L' })[from]) + '}';
    const stp = gas ? (name ? ', at STP' : ' at STP') : '';
    const q = to === 'part' ? 'How many {f|' + pw + '} are in ' + given + ' of ' + sub + stp + '?'
      : to === 'mol' ? 'How many {f|moles} are in ' + given + ' of ' + sub + stp + '?'
      : to === 'g' ? 'What is the {f|mass, in grams,} of ' + given + ' of ' + sub + stp + '?'
      : 'What {f|volume, in liters,} does ' + given + ' of ' + sub + (name ? ',' : '') + ' occupy at STP?';
    const p = P.convProblem(gas ? 'stp' : 'conv', { given: { v, unit: from, f }, to: { unit: to, f } }, q);
    p.type = 'conv'; p.label = UNIT[from] + ' → ' + UNIT[to]; p.from = from; p.to = to; p.formula = f; p.elements = C.parseFormula(f).order;
    return p;
  }

  function formulaProblem(pair, mode) {
    const emp = pair[0], mol = pair[1], items = P.compositionItems(mol, mode), M = C.fmtVal(C.molarMass(mol), 4).text;
    const built = S.buildEmpirical({ items, molarMass: parseFloat(M) });
    const q = (mode === 'pct' ? 'A compound is ' + P.itemsText(items) + ' by mass.' : 'A sample of a compound contains ' + P.itemsText(items) + '.') + ' Its molar mass is {g|' + M + ' g/mol}. Find its {f|empirical formula} and its {f|molecular formula}.';
    return { type: 'formula', label: 'empirical and molecular formula', statement: T(q), built, steps: built.steps, empirical: emp, molecular: mol, mult: built.res.mult, elements: C.parseFormula(mol).order, engine: { empirical: built.answer.empirical, molecular: built.answer.formula } };
  }
  /* what is wrong with a typed formula? returns { ok, msg } */
  function checkFormula(p, which, raw) {
    const u = C.parseFormula(raw); if (!u.ok) return { bad: true, msg: u.error };
    const want = which === 'emp' ? p.empirical : p.molecular;
    if (C.sameFormula(raw, want)) return { ok: true, msg: '' };
    if (which === 'emp') {
      if (C.sameFormula(raw, p.molecular)) return { msg: 'That is the molecular formula. The empirical formula is the <b>simplest</b> whole-number ratio.' };
      if (p.mult > 1) { const r = p.built.res.ratios, pairs = p.built.pairs; for (const rnd of [Math.floor, Math.ceil]) { if (C.sameFormula(raw, C.formulaString(pairs.map((x, i) => ({ el: x.el, n: Math.max(1, rnd(Math.round(r[i] * 2) / 2)) }))))) return { msg: 'It looks like 1.5 was rounded to a whole number. You cannot round a .5: multiply <b>every</b> number in the ratio by ' + p.mult + ' instead.' }; } }
      const d = S.diagnoseEmpirical(p.built, raw); return { msg: d && !/empirical formula\. The question/.test(d) ? d : 'Not quite. Change each amount to moles, divide every one by the smallest, and check whether a decimal needs to be cleared.' };
    }
    if (C.sameFormula(raw, p.empirical)) return { msg: 'That is the empirical formula. Find n = molar mass ÷ empirical formula mass, then multiply every subscript by n.' };
    return { msg: 'Not quite. Find the mass of one empirical formula unit, divide the molar mass by it to get n, and multiply every subscript by n.' };
  }

  function makeSet(seed) {
    P.setRng(P.seeded(seed));
    const kinds = shuffle(shuffle(ONE).slice(0, 3).concat(shuffle(TWO).slice(0, 3))), used = new Set();
    const list = kinds.map((k) => convProblem(k[0], k[1], used));
    list.push(formulaProblem(P.pick(WHOLE), P.rint(0, 1) ? 'pct' : 'g'));
    list.push(formulaProblem(P.pick(HALF), 'pct'));
    return list;
  }

  const api = { ONE, TWO, WHOLE, HALF, GASES, makeSet, checkFormula };
  root.MoleSet = api;
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  /* ============================== the page ============================== */
  const $ = (s, el) => (el || document).querySelector(s), $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const KEY = 'mole-conversions-practice-v1', HINT1 = 1, HINT2 = 2, REVEAL = 3;
  let st, set;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private window */ } };
  const newSeed = () => 10000 + Math.floor(Math.random() * 90000);
  function start(seed) { st = { seed, name: st ? st.name : '', items: Array.from({ length: 8 }, () => ({ tries: 0, status: 'open', vals: ['', ''], hint: 0 })) }; set = makeSet(seed); save(); drawAll(); }

  const done = (it) => it.status !== 'open';
  const score = () => st.items.filter((it) => it.status === 'solved').length;
  function header() {
    const n = st.items.filter(done).length;
    $('#setNo').textContent = 'Set #' + st.seed; $('#score').textContent = score() + ' / 8 correct';
    $('#dots').innerHTML = st.items.map((it, i) => '<a href="#p' + (i + 1) + '" class="dot ' + it.status + '" aria-label="Problem ' + (i + 1) + ': ' + (it.status === 'solved' ? 'correct' : it.status === 'revealed' ? 'solution shown' : 'not finished') + '">' + (i + 1) + '</a>').join('');
    const fin = $('#finish'); fin.hidden = n < 8;
    if (n === 8) {
      const first = st.items.filter((it) => it.status === 'solved' && it.tries === 1).length;
      fin.innerHTML = '<h2>Set complete</h2><p class="big">' + score() + ' / 8</p><p>' + first + ' correct on the first try · ' + st.items.filter((it) => it.status === 'revealed').length + ' needed the solution</p>' +
        '<table class="res"><tr><th>#</th><th>Problem</th><th>Result</th><th>Tries</th></tr>' + set.map((p, i) => '<tr><td>' + (i + 1) + '</td><td>' + p.label + '</td><td>' + (st.items[i].status === 'solved' ? '✔ correct' : '✘ solution shown') + '</td><td>' + st.items[i].tries + '</td></tr>').join('') + '</table>' +
        '<p><label>Name <input id="nameIn" type="text" value="' + UI.escapeHTML(st.name || '') + '" autocomplete="name"></label> <button type="button" class="btn primary" id="printBtn">Print my results</button> <button type="button" class="btn" id="againBtn">Try a new set</button></p>';
    }
  }
  function reference() {
    const els = [...new Set(set.reduce((a, p) => a.concat(p.elements), []))].sort();
    $('#ref').innerHTML = '<b>Reference</b><div class="refrow"><span>1 mol = <b>6.022 × 10²³</b> particles</span><span>1 mol of gas at STP = <b>22.4 L</b></span></div><div class="masses">' + els.map((e) => '<span><b>' + e + '</b> ' + D.ELEMENTS[e].mass.toFixed(2) + '</span>').join('') + '</div><div class="note">Atomic masses in g/mol. Round your answer to the correct significant figures only at the end.</div>';
  }
  function card(i) {
    const p = set[i], it = st.items[i], el = $('#p' + (i + 1)), locked = done(it);
    const input = p.type === 'conv'
      ? '<div class="pc-row"><label class="sr" for="in' + i + '">Your answer</label><input id="in' + i + '" class="pc-in" data-k="0" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="your answer" value="' + UI.escapeHTML(it.vals[0]) + '"' + (locked ? ' disabled' : '') + '><span class="pc-unit">' + p.unit + '</span></div><div class="note">Scientific notation: type 1.51e24 or 1.51 x 10^24.</div>'
      : '<div class="frm"><label>(a) Empirical formula <input class="pc-in wide" data-k="0" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="like C2H5" value="' + UI.escapeHTML(it.vals[0]) + '"' + (locked ? ' disabled' : '') + '><span class="mk" data-m="0"></span></label><label>(b) Molecular formula <input class="pc-in wide" data-k="1" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="like C4H10" value="' + UI.escapeHTML(it.vals[1]) + '"' + (locked ? ' disabled' : '') + '><span class="mk" data-m="1"></span></label></div><div class="note">Type subscripts as plain numbers: C6H12O6.</div>';
    const badge = it.status === 'solved' ? '<span class="ptag ok">✔ correct' + (it.tries === 1 ? ' · first try' : ' · ' + it.tries + ' tries') + '</span>' : it.status === 'revealed' ? '<span class="ptag no">solution shown · no credit</span>' : it.tries ? '<span class="ptag">' + it.tries + (it.tries === 1 ? ' try' : ' tries') + '</span>' : '';
    el.className = 'pcard prob ' + it.status;
    el.innerHTML = '<div class="pc-head"><span class="pc-num">' + (i + 1) + '</span><span class="pc-skill">' + p.label + '</span>' + badge + '</div><div class="pc-q">' + p.statement + '</div>' + input +
      '<div class="pc-actions">' + (locked ? '<button type="button" class="btn" data-a="sol">' + (it.showSol ? 'Hide' : 'Show') + ' the worked solution</button>'
        : '<button type="button" class="btn primary" data-a="check">Check</button><button type="button" class="btn" data-a="hint"' + (it.tries >= HINT1 && it.hint < 2 ? '' : ' disabled') + '>' + (it.hint === 0 ? 'Hint' : 'More help') + '</button><button type="button" class="btn ghost" data-a="reveal"' + (it.tries >= REVEAL ? '' : ' disabled') + '>Show solution (no credit)</button>') + '</div>' +
      (locked ? '' : '<div class="note gate">' + (it.tries < HINT1 ? 'Try it first. A hint unlocks after your first attempt.' : it.tries < REVEAL ? 'The full solution unlocks after ' + REVEAL + ' attempts.' : '') + '</div>') +
      '<div class="pc-fb" aria-live="polite"></div><div class="pc-hint"></div>';
    if (it.fb) fb(el, it.fb[0], it.fb[1]);
    $$('.pc-in.wide', el).forEach(preview);
    hints(i);
  }
  /* show a typed formula with real subscripts, or say what is wrong with it */
  function preview(inp) { const m = $('.mk[data-m="' + inp.dataset.k + '"]', inp.closest('.prob')), v = inp.value.trim(), f = v ? C.parseFormula(v) : null; m.innerHTML = !v ? '' : f.ok ? '= ' + fm(f.text) : '<span class="err">' + f.error + '</span>'; }
  function fb(el, status, msg) { const f = $('.pc-fb', el); f.className = 'pc-fb ' + status; f.innerHTML = '<span class="ic">' + ({ ok: '✔', no: '✘', close: '≈', bad: '!' })[status] + '</span><span>' + msg + '</span>'; }
  function hints(i) {
    const p = set[i], it = st.items[i], h = $('#p' + (i + 1) + ' .pc-hint');
    if (done(it)) { h.innerHTML = ''; if (it.showSol) { h.innerHTML = '<div class="hint-label">Worked solution</div><div class="sol"></div>'; UI.stepper($('.sol', h), { steps: p.steps, statement: '' }, { all: true }); } return; }
    if (!it.hint) { h.innerHTML = ''; return; }
    const take = it.hint === 1 ? p.steps.filter((s) => s.stage === 'plan') : p.steps.filter((s) => s.stage !== 'answer');
    h.innerHTML = '<div class="hint-label">' + (it.hint === 1 ? 'Hint 1: what to do first' : 'Hint 2: the setup (the arithmetic is still yours)') + '</div>' + UI.stepList(take);
  }
  function check(i) {
    const p = set[i], it = st.items[i], el = $('#p' + (i + 1)); $$('.pc-in', el).forEach((inp) => { it.vals[+inp.dataset.k] = inp.value; });
    let ok, status, msg;
    if (p.type === 'conv') { const r = p.check(it.vals[0]); if (r.status === 'bad') { fb(el, 'bad', r.msg); return; } ok = r.status === 'ok'; status = r.status; msg = r.msg; }
    else {
      if (!it.vals[0].trim() || !it.vals[1].trim()) { fb(el, 'bad', 'Fill in both formulas, then check.'); return; }
      const a = checkFormula(p, 'emp', it.vals[0]), b = checkFormula(p, 'mol', it.vals[1]);
      if (a.bad || b.bad) { fb(el, 'bad', (a.bad ? '(a) ' + a.msg + ' ' : '') + (b.bad ? '(b) ' + b.msg : '')); return; }
      ok = a.ok && b.ok; status = ok ? 'ok' : 'no';
      msg = ok ? '<b>Correct!</b> Empirical ' + fm(p.empirical) + ', molecular ' + fm(p.molecular) + '.' : (a.ok ? '<b>(a)</b> ✔ correct. ' : '<b>(a)</b> ' + a.msg + ' ') + (b.ok ? '<b>(b)</b> ✔ correct.' : a.ok ? '<b>(b)</b> ' + b.msg : '<b>(b)</b> Get the empirical formula first, then use the molar mass.');
    }
    it.tries++; if (ok) it.status = 'solved'; it.fb = [status, msg]; save(); card(i); header();
    if (ok && st.items.every(done)) $('#finish').scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function drawAll() {
    $('#list').innerHTML = '<h2 class="part">Part 1 · Mole conversions <small>particles, moles, grams and liters of gas at STP</small></h2>' + [0, 1, 2, 3, 4, 5].map((i) => '<div id="p' + (i + 1) + '"></div>').join('') +
      '<h2 class="part">Part 2 · Empirical and molecular formulas</h2>' + [6, 7].map((i) => '<div id="p' + (i + 1) + '"></div>').join('');
    for (let i = 0; i < 8; i++) card(i); header(); reference();
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'), c = e.target.closest('.prob');
    if (b && c) {
      const i = +c.id.slice(1) - 1, it = st.items[i], a = b.dataset.a;
      if (a === 'check') check(i);
      else if (a === 'hint') { it.hint = Math.min(2, it.tries >= HINT2 ? it.hint + 1 : 1); save(); card(i); }
      else if (a === 'reveal') { if (confirm('Show the full solution? This problem will not count as correct.')) { it.status = 'revealed'; it.showSol = true; it.fb = null; save(); card(i); header(); } }
      else if (a === 'sol') { it.showSol = !it.showSol; save(); card(i); }
      return;
    }
    if (e.target.id === 'newSet' || e.target.id === 'againBtn') { if (e.target.id === 'againBtn' || st.items.every((x) => x.tries === 0) || confirm('Start a brand-new set of problems? Your work on this set will be erased.')) { start(newSeed()); window.scrollTo(0, 0); } }
    if (e.target.id === 'printBtn') window.print();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList.contains('pc-in')) { const c = e.target.closest('.prob'); if (c) { e.preventDefault(); check(+c.id.slice(1) - 1); } } });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'nameIn') { st.name = e.target.value; save(); return; }
    const c = e.target.closest('.prob'); if (!c || !e.target.classList.contains('pc-in')) return;
    st.items[+c.id.slice(1) - 1].vals[+e.target.dataset.k] = e.target.value; save();
    if (e.target.classList.contains('wide')) preview(e.target);
  });

  const forced = parseInt((location.search.match(/[?&]set=(\d{1,9})/) || [])[1], 10), old = load();
  if (forced && (!old || old.seed !== forced)) { st = old ? { name: old.name } : null; start(forced); }
  else if (old && old.seed && Array.isArray(old.items) && old.items.length === 8) { st = old; set = makeSet(st.seed); drawAll(); }
  else start(newSeed());
  root.MolePractice = { get state() { return st; }, get set() { return set; }, start };
})(typeof self !== 'undefined' ? self : this);
