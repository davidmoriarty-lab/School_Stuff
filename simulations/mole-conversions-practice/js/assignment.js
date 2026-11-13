/* assignment.js: the Mole Conversions practice set.
 *
 * Every student gets their own set of 13 problems, built from a "set number" (the seed):
 *   1-10  mole conversions between particles, moles, grams and liters of gas at STP.
 *         There are 12 possible conversions (6 one-step, 6 two-step). Each set uses 5 of each,
 *         in random order, so no conversion appears twice.
 *   11    empirical + molecular formula where the mole ratio comes out in whole numbers
 *   12    empirical + molecular formula where the ratio comes out as 1 : 1.5, so every number
 *         has to be multiplied by 2
 *   13    an iron oxide lab: masses of a crucible are given, and the student subtracts to find the
 *         mass of iron, iron oxide and oxygen, then moles, then the empirical formula. The oxide
 *         (FeO, Fe2O3 or Fe3O4) and every mass are different for every student.
 * The problems are shown one at a time. A hint-free design: a wrong answer gets a specific
 * message, and the worked solution unlocks only after 3 attempts (and then earns no credit).
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
  /* only atoms and molecules: no ionic compounds, so "formula units" never appears */
  const notFU = (f) => C.particleWord(f) !== 'formula units';
  /* substances that really are gases at 0 °C and 1 atm */
  const GASES = ['O2', 'N2', 'H2', 'He', 'Ne', 'Ar', 'Kr', 'Xe', 'Cl2', 'F2', 'CO2', 'CO', 'NH3', 'CH4', 'SO2', 'C3H8', 'C2H6', 'C2H4', 'C2H2', 'H2S', 'N2O', 'HCl', 'NF3', 'SF6'].filter((f) => C.parseFormula(f).ok && notFU(f));
  const SOLIDS = D.POOL.molecules.filter((f) => D.POOL.gases.indexOf(f) < 0).concat(D.POOL.metals).filter(notFU);
  /* empirical / molecular pairs. WHOLE: the ratio is whole numbers. HALF: the ratio has a 1.5 */
  const WHOLE = [['CH2O', 'C6H12O6'], ['CH2O', 'C2H4O2'], ['CH2O', 'C3H6O3'], ['CH2O', 'C5H10O5'], ['CH2', 'C2H4'], ['CH2', 'C4H8'], ['CH2', 'C6H12'], ['CH', 'C6H6'], ['CH', 'C2H2'], ['NO2', 'N2O4'], ['HO', 'H2O2'], ['CH3', 'C2H6'], ['NH2', 'N2H4'], ['CH2Cl', 'C2H4Cl2'], ['C2H4O', 'C4H8O2'], ['CHO2', 'C2H2O4'], ['C5H7N', 'C10H14N2']];
  const HALF = [['C2H3', 'C4H6'], ['C2H3', 'C8H12'], ['P2O3', 'P4O6'], ['As2O3', 'As4O6'], ['C2H3O2', 'C4H6O4'], ['C2H3O3', 'C4H6O6']];

  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(P.rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function convProblem(from, to, used) {
    const gas = from === 'L' || to === 'L'; let f;
    do { f = P.pick(gas ? GASES : SOLIDS); } while (used.has(f) || !notFU(f)); used.add(f);
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

  const NCONV = 10, N = NCONV + 3;
  /* ---------- problem 13: the iron oxide lab ---------- */
  const OXIDES = [[1, 1, 'FeO'], [2, 3, 'Fe2O3'], [3, 4, 'Fe3O4']];
  const MFE = D.ELEMENTS.Fe.mass, MO = D.ELEMENTS.O.mass, g2 = (c) => (c / 100).toFixed(2);
  function labProblem() {
    for (let guard = 0; guard < 200; guard++) {
      const ox = P.pick(OXIDES), empty = P.rint(1800, 3499), fe = P.rint(120, 240), o = Math.round(fe / 100 / MFE * (ox[1] / ox[0]) * MO * 100);
      const first = empty + fe + o - P.rint(6, 15), final = empty + fe + o, cFe = empty + fe;
      const built = S.buildEmpirical({ items: [{ el: 'Fe', v: g2(fe), kind: 'g' }, { el: 'O', v: g2(o), kind: 'g' }] });
      if (!built.res.ok || built.answer.formula !== ox[2] || first <= cFe) continue;
      const d = { empty: empty / 100, cFe: cFe / 100, first: first / 100, final: final / 100, fe: fe / 100, o: o / 100, oxide: (fe + o) / 100 }, want = { fe: d.fe / MFE, o: d.o / MO };
      const row = (t, v) => '<tr><td>' + t + '</td><td>' + v.toFixed(2) + ' g</td></tr>';
      const table = '<table class="labt"><caption>Data table</caption>' + row('Mass of empty crucible and lid', d.empty) + row('Mass of crucible, lid and iron powder (before heating)', d.cFe) + row('Mass of crucible, lid and product after heating #1', d.first) + row('Mass of crucible, lid and product after heating #2', d.final) + row('Mass of crucible, lid and product after heating #3', d.final) + '</table>';
      const stmt = '<p>In an iron oxide lab, a student placed iron powder in a crucible with a lid and heated it strongly. The iron reacted with oxygen in the air to form an iron oxide:</p><p class="rxn">Fe + O<sub>2</sub> \u2192 Fe<sub>x</sub>O<sub>y</sub></p><p>The student heated, cooled and weighed the crucible three times, until the mass stopped changing. Use the data table to find the {f|empirical formula} of the iron oxide (the values of x and y).</p>' + table;
      const diff = (a, b) => S.G(a.toFixed(2) + ' g') + ' − ' + S.G(b.toFixed(2) + ' g') + ' = ' + S.F((a - b).toFixed(2) + ' g');
      const dataStep = { id: 'masses', stage: 'plan', title: 'Subtract to find the masses', why: 'The balance reads the crucible <b>and</b> its contents together. Subtract the empty crucible to get the mass of just the contents. Use the <b>last</b> reading, because the mass had stopped changing (all the iron had reacted).',
        html: '<table class="wk"><tbody><tr><td><b>iron</b></td><td>(crucible + iron) − empty crucible</td><td>' + diff(d.cFe, d.empty) + '</td></tr><tr><td><b>iron oxide</b></td><td>(crucible + oxide, heating #3) − empty crucible</td><td>' + diff(d.final, d.empty) + '</td></tr><tr><td><b>oxygen</b></td><td>iron oxide − iron</td><td>' + diff(d.oxide, d.fe) + '</td></tr></tbody></table><p class="note">The oxygen came from the air. Its mass is the mass the sample <b>gained</b>.</p>' };
      const steps = [dataStep].concat(built.steps.map((x) => (x.id === 'identify' ? Object.assign({}, x, { stage: 'setup' }) : x)));
      return { type: 'lab', label: 'iron oxide lab: empirical formula', statement: T(stmt), built, steps, d, want, formula: ox[2], empirical: ox[2], molecular: ox[2], mult: built.res.mult, elements: ['Fe', 'O'], engine: { empirical: built.answer.formula } };
    }
    throw new Error('could not build the lab problem');
  }
  /* the six answer boxes of problem 13; returns one verdict per box */
  function checkLab(p, vals) {
    const d = p.d, near = (u, v, t) => Math.abs(u - v) <= (t === undefined ? 0.006 : t), rel = (u, v) => Math.abs(u - v) / v <= 0.025, out = [];
    const num = (k) => { const raw = vals[k].trim(); if (!raw) return { blank: true }; const u = C.parseNumber(raw); return isNaN(u) ? { bad: true } : { u }; };
    const say = (k, ok, msg) => out[k] = { ok, msg };
    const mass = (k, truth, hints) => { const r = num(k); if (r.blank) { out[k] = { blank: true }; return; } if (r.bad) { out[k] = { bad: true, msg: 'Type just the number.' }; return; } if (near(r.u, truth)) { say(k, true, ''); return; } let m = 'Not quite.'; for (const h of hints) if (near(r.u, h[0], 0.011)) { m = h[1]; break; } say(k, false, m); };
    mass(0, d.fe, [[d.cFe, 'That is the crucible and the iron together. Subtract the empty crucible.'], [d.empty, 'That is only the empty crucible.'], [d.final, 'That is the crucible and the product. The iron is the earlier measurement.']]);
    mass(1, d.oxide, [[d.final, 'That includes the crucible. Subtract the empty crucible.'], [d.first - d.empty, 'That uses heating #1, when the mass was still changing. Use the last reading.'], [d.first, 'That includes the crucible, and heating #1 was not the last reading.'], [d.cFe - d.empty, 'That is the mass of the iron, not of the oxide.']]);
    mass(2, d.o, [[d.oxide + d.fe, 'You added. The oxygen is what the sample gained: oxide minus iron.'], [d.final - d.cFe, 'Good idea, but check your subtraction.'], [d.first - d.cFe, 'That uses heating #1. Use the last reading.'], [d.oxide, 'That is the whole oxide. Subtract the iron from it to find just the oxygen.'], [d.fe, 'That is the iron. The oxygen is oxide minus iron.']]);
    const mol = (k, truth, g, M, other) => { const r = num(k); if (r.blank) { out[k] = { blank: true }; return; } if (r.bad) { out[k] = { bad: true, msg: 'Type just the number.' }; return; } if (rel(r.u, truth)) { say(k, true, ''); return; } let m = 'Not quite. Moles = grams ÷ molar mass.'; if (rel(r.u, g)) m = 'That is the mass. Divide by the molar mass to get moles.'; else if (rel(r.u, g * M)) m = 'You multiplied. Divide the grams by the molar mass.'; else if (rel(r.u, g / other)) m = 'Check the molar mass: use the one for THIS element.'; else if (k === 4 && rel(r.u, g / (2 * MO))) m = 'Count oxygen ATOMS: use 16.00 g/mol, not the 32.00 of O₂.'; say(k, false, m); };
    mol(3, p.want.fe, d.fe, MFE, MO); mol(4, p.want.o, d.o, MO, MFE);
    const raw = vals[5].trim();
    if (!raw) out[5] = { blank: true }; else { const f = C.parseFormula(raw); if (!f.ok) out[5] = { bad: true, msg: f.error }; else { const r = checkFormula(p, 'emp', raw); out[5] = r.ok ? { ok: true, msg: '' } : { ok: false, msg: r.msg.replace('That is the molecular formula. ', '') }; } }
    return out;
  }

  function makeSet(seed) {
    P.setRng(P.seeded(seed));
    const kinds = shuffle(shuffle(ONE).slice(0, NCONV / 2).concat(shuffle(TWO).slice(0, NCONV / 2))), used = new Set();
    const list = kinds.map((k) => convProblem(k[0], k[1], used));
    list.push(formulaProblem(P.pick(WHOLE), P.rint(0, 1) ? 'pct' : 'g'));
    list.push(formulaProblem(P.pick(HALF), 'pct'));
    list.push(labProblem());
    return list;
  }

  const api = { ONE, TWO, WHOLE, HALF, GASES, NCONV, N, OXIDES, makeSet, checkFormula, checkLab };
  root.MoleSet = api;
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  /* ============================== the page ============================== */
  /* One problem is on screen at a time. st.cur is the problem showing (N means the results page).
   * A student can go back to problems they have finished, but not ahead to ones they have not reached. */
  const $ = (s, el) => (el || document).querySelector(s), $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const KEY = 'mole-conversions-practice-v2', REVEAL = 3;
  let st, set;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const SC = root.MoleScorm, linked = () => !!(SC && SC.connected);
  /* The learning system keeps the student's work in a small text field (4096 characters), so the work is
   * packed tightly: [tries, 0 open / 1 correct / 2 solution shown, typed answers, parts right, solution open]. */
  function encode() {
    const code = { open: 0, solved: 1, revealed: 2 };
    const pack = (keep) => JSON.stringify({ v: 2, s: st.seed, c: st.cur, n: String(st.name || '').slice(0, 40), i: st.items.map((it) => { let v = it.vals.map((x) => String(x || '').slice(0, 40)); if (!keep && it.status !== 'open') v = []; while (v.length && !v[v.length - 1]) v.pop(); return [it.tries, code[it.status] || 0, v, [0, 1, 2, 3, 4, 5].map((k) => (it.fok[k] ? 1 : 0)).join(''), it.showSol ? 1 : 0]; }) });
    const full = pack(true); return full.length <= 3900 ? full : pack(false);
  }
  function decode(o) {
    if (!o || o.v !== 2 || !Number.isInteger(o.s) || !Array.isArray(o.i) || o.i.length !== N) return null;
    const status = ['open', 'solved', 'revealed'];
    return { seed: o.s, name: String(o.n || ''), cur: Math.max(0, Math.min(N, +o.c || 0)), items: o.i.map((r) => { const v = Array.isArray(r[2]) ? r[2].map(String) : []; while (v.length < 6) v.push(''); return { tries: +r[0] || 0, status: status[r[1]] || 'open', vals: v.slice(0, 6), fok: String(r[3] || '').split('').map((c) => c === '1'), showSol: !!r[4] }; }) };
  }
  let savedAt = null;
  function showSaved(manual) {
    const el = $('#saved'); if (!el) return; if (!savedAt) { el.textContent = linked() ? 'Your work is saved to your class automatically.' : 'Your work saves automatically on this device.'; return; }
    el.textContent = '✔ ' + (manual ? 'Progress saved' : 'Saved') + (linked() ? ' to your class' : ' on this device') + ' at ' + savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    el.classList.toggle('flash', !!manual);
  }
  function save(force) {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private window */ }
    if (linked()) { SC.suspend(encode(), st.cur, force); SC.report(st.items.filter((it) => it.status === 'solved').length, st.items.filter((it) => it.status !== 'open').length, N); }
    savedAt = new Date(); showSaved(!!force);
  }
  const newSeed = () => 10000 + Math.floor(Math.random() * 90000);
  const done = (it) => it.status !== 'open';
  const firstOpen = () => { const i = st.items.findIndex((it) => !done(it)); return i < 0 ? N : i; };
  function start(seed) { st = { seed, name: st ? st.name : '', cur: 0, items: Array.from({ length: N }, () => ({ tries: 0, status: 'open', vals: ['', '', '', '', '', ''], fok: [] })) }; set = makeSet(seed); save(); drawAll(); }

  const score = () => st.items.filter((it) => it.status === 'solved').length;
  function header() {
    const reach = firstOpen();
    $('#setNo').textContent = 'Set #' + st.seed; $('#score').textContent = score() + ' / ' + N + ' correct';
    $('#dots').innerHTML = st.items.map((it, i) => '<button type="button" class="dot ' + it.status + (i === st.cur ? ' here' : '') + '" data-go="' + i + '"' + (i > reach ? ' disabled' : '') + ' aria-label="Problem ' + (i + 1) + ': ' + (it.status === 'solved' ? 'correct' : it.status === 'revealed' ? 'solution shown' : i > reach ? 'locked' : 'not finished') + '"' + (i === st.cur ? ' aria-current="step"' : '') + '>' + (i + 1) + '</button>').join('');
  }
  /* No constants or atomic masses are given: students use the mole conversion chart in their notes. */
  function reference() {
    $('#ref').innerHTML = '<b>Remember:</b> you have the <b>mole conversion chart</b> in your notes. Use it to plan each conversion.';
  }
  function results() {
    const first = st.items.filter((it) => it.status === 'solved' && it.tries === 1).length, fin = $('#finish');
    fin.hidden = false; fin.innerHTML = '<h2>Set complete</h2><p class="big">' + score() + ' / ' + N + '</p><p>' + first + ' correct on the first try · ' + st.items.filter((it) => it.status === 'revealed').length + ' needed the solution</p>' +
      '<table class="res"><tr><th>#</th><th>Problem</th><th>Result</th><th>Tries</th></tr>' + set.map((p, i) => '<tr><td>' + (i + 1) + '</td><td>' + p.label + '</td><td>' + (st.items[i].status === 'solved' ? '✔ correct' : '✘ solution shown') + '</td><td>' + st.items[i].tries + '</td></tr>').join('') + '</table>' +
      '<p><label>Name <input id="nameIn" type="text" value="' + UI.escapeHTML(st.name || '') + '" autocomplete="name"></label> <button type="button" class="btn primary" id="printBtn">Print my results</button> ' + (linked() ? '' : '<button type="button" class="btn" id="againBtn">Try a new set</button>') + '</p>' + (linked() ? '<p class="reported">\u2714 Your completion has been reported to your class.</p>' : '');
  }
  function card(i) {
    const p = set[i], it = st.items[i], el = $('#p' + (i + 1)), locked = done(it), last = i === N - 1;
    const LAB = [['(a) Mass of iron used', 'g', 0], ['(b) Mass of iron oxide formed', 'g', 1], ['(c) Mass of oxygen that combined with the iron', 'g', 2], ['(d) Moles of iron, Fe', 'mol Fe', 3], ['Moles of oxygen, O', 'mol O', 4]];
    const labRow = (t, u, k) => '<div class="lrow"><label for="in' + i + '-' + k + '">' + t + '</label><div class="lin"><input id="in' + i + '-' + k + '" class="pc-in" data-k="' + k + '" inputmode="decimal" autocomplete="off" spellcheck="false" value="' + UI.escapeHTML(it.vals[k]) + '"' + (locked || it.fok[k] ? ' disabled' : '') + '><span class="pc-unit">' + u + '</span><span class="lmark" aria-hidden="true">' + (it.fok[k] ? '✔' : '') + '</span></div><div class="lmsg" data-lmsg="' + k + '"></div></div>';
    const input = p.type === 'lab'
      ? '<div class="labform">' + LAB.map((r) => labRow(r[0], r[1], r[2])).join('') + '<div class="lrow"><label for="in' + i + '-5">(e) Empirical formula of the iron oxide</label><div class="lin"><input id="in' + i + '-5" class="pc-in wide" data-k="5" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="like C2H5" value="' + UI.escapeHTML(it.vals[5]) + '"' + (locked || it.fok[5] ? ' disabled' : '') + '><span class="mk" data-m="5"></span><span class="lmark" aria-hidden="true">' + (it.fok[5] ? '✔' : '') + '</span></div><div class="lmsg" data-lmsg="5"></div></div></div><div class="remind"><b>Remember:</b> if a ratio comes out as a decimal, multiply <b>every</b> number in the ratio by the same whole number to scale it up to whole numbers.</div><div class="note">Type subscripts as plain numbers: Fe2O3.</div>'
      : p.type === 'conv'
      ? '<div class="pc-row"><label class="sr" for="in' + i + '">Your answer</label><input id="in' + i + '" class="pc-in" data-k="0" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="your answer" value="' + UI.escapeHTML(it.vals[0]) + '"' + (locked ? ' disabled' : '') + '><span class="pc-unit">' + p.unit + '</span></div><div class="note">Scientific notation: type 1.51e24 or 1.51 x 10^24.</div>'
      : '<div class="frm"><label>(a) Empirical formula <input class="pc-in wide" data-k="0" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="like C2H5" value="' + UI.escapeHTML(it.vals[0]) + '"' + (locked ? ' disabled' : '') + '><span class="mk" data-m="0"></span></label><label>(b) Molecular formula <input class="pc-in wide" data-k="1" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="like C4H10" value="' + UI.escapeHTML(it.vals[1]) + '"' + (locked ? ' disabled' : '') + '><span class="mk" data-m="1"></span></label></div><div class="note">Type subscripts as plain numbers: C6H12O6.</div>';
    const badge = it.status === 'solved' ? '<span class="ptag ok">✔ correct' + (it.tries === 1 ? ' · first try' : ' · ' + it.tries + ' tries') + '</span>' : it.status === 'revealed' ? '<span class="ptag no">solution shown · no credit</span>' : it.tries ? '<span class="ptag">' + it.tries + (it.tries === 1 ? ' try' : ' tries') + '</span>' : '';
    const need = REVEAL - it.tries;
    el.className = 'pcard prob ' + it.status;
    el.innerHTML = '<div class="pc-head"><span class="pc-num">' + (i + 1) + '</span><span class="pc-skill">Problem ' + (i + 1) + ' of ' + N + ' · ' + p.label + '</span>' + badge + '</div><div class="pc-q">' + p.statement + '</div>' + input +
      '<div class="pc-actions">' + (locked ? '<button type="button" class="btn" data-act="sol">' + (it.showSol ? 'Hide' : 'Show') + ' the worked solution</button><button type="button" class="btn primary" data-act="next">' + (last ? 'See my results' : 'Next problem') + ' ▶</button>'
        : '<button type="button" class="btn primary" data-act="check">Check</button><button type="button" class="btn ghost" data-act="reveal"' + (it.tries >= REVEAL ? '' : ' disabled') + '>Show solution (no credit)</button>') + '</div>' +
      (locked ? '' : '<div class="note gate">' + (need > 0 ? 'The worked solution unlocks after ' + REVEAL + ' wrong attempts' + (it.tries ? ' (' + need + ' more).' : '.') : 'You can now show the worked solution, but the problem will not count as correct.') + '</div>') +
      '<div class="pc-fb" aria-live="polite"></div><div class="pc-hint"></div>';
    if (it.fb) fb(el, it.fb[0], it.fb[1]);
    if (p.type === 'lab' && it.lmsg) it.lmsg.forEach((m, k) => { const e = $('[data-lmsg="' + k + '"]', el); if (e && m) e.textContent = m; });
    $$('.pc-in.wide', el).forEach(preview);
    const h = $('.pc-hint', el); if (locked && it.showSol) { h.innerHTML = '<div class="hint-label">Worked solution</div><div class="sol"></div>'; UI.stepper($('.sol', h), { steps: p.steps, statement: '' }, { all: true }); }
  }
  /* show a typed formula with real subscripts, or say what is wrong with it */
  function preview(inp) { const m = $('.mk[data-m="' + inp.dataset.k + '"]', inp.closest('.prob')), v = inp.value.trim(), f = v ? C.parseFormula(v) : null; m.innerHTML = !v ? '' : f.ok ? '= ' + fm(f.text) : '<span class="err">' + f.error + '</span>'; }
  function fb(el, status, msg) { const f = $('.pc-fb', el); f.className = 'pc-fb ' + status; f.innerHTML = '<span class="ic">' + ({ ok: '✔', no: '✘', close: '≈', bad: '!' })[status] + '</span><span>' + msg + '</span>'; }
  function check(i) {
    const p = set[i], it = st.items[i], el = $('#p' + (i + 1)); $$('.pc-in', el).forEach((inp) => { it.vals[+inp.dataset.k] = inp.value; });
    let ok, status, msg;
    if (p.type === 'lab') {
      const res = checkLab(p, it.vals), bad = res.filter((r) => r && r.bad), filled = res.filter((r) => r && !r.blank);
      if (!filled.length) { fb(el, 'bad', 'Type at least one answer, then check.'); return; }
      if (filled.every((r) => r.bad)) { fb(el, 'bad', bad[0].msg); return; }
      res.forEach((r, k) => { if (r && r.ok) it.fok[k] = true; });
      it.lmsg = res.map((r, k) => (r && !r.ok && !it.fok[k] ? r.msg : ''));
      const right = [0, 1, 2, 3, 4, 5].filter((k) => it.fok[k]).length, wrong = res.filter((r) => r && r.ok === false).length;
      ok = right === 6; if (ok) it.status = 'solved';
      if (wrong || bad.length) it.tries++;
      it.fb = ok ? ['ok', '<b>Correct!</b> The iron oxide is ' + fm(p.empirical) + '.'] : [wrong ? 'no' : 'bad', right + ' of 6 answers correct.' + (wrong ? ' Read the note under each wrong answer.' : ' Fill in the rest.')];
      save(); card(i); header();
      if (ok) $('#p' + (i + 1) + ' [data-act=next]').focus({ preventScroll: true });
      return;
    }
    if (p.type === 'conv') { const r = p.check(it.vals[0]); if (r.status === 'bad') { fb(el, 'bad', r.msg); return; } ok = r.status === 'ok'; status = r.status; msg = r.msg; }
    else {
      if (!it.vals[0].trim() || !it.vals[1].trim()) { fb(el, 'bad', 'Fill in both formulas, then check.'); return; }
      const a = checkFormula(p, 'emp', it.vals[0]), b = checkFormula(p, 'mol', it.vals[1]);
      if (a.bad || b.bad) { fb(el, 'bad', (a.bad ? '(a) ' + a.msg + ' ' : '') + (b.bad ? '(b) ' + b.msg : '')); return; }
      ok = a.ok && b.ok; status = ok ? 'ok' : 'no';
      msg = ok ? '<b>Correct!</b> Empirical ' + fm(p.empirical) + ', molecular ' + fm(p.molecular) + '.' : (a.ok ? '<b>(a)</b> ✔ correct. ' : '<b>(a)</b> ' + a.msg + ' ') + (b.ok ? '<b>(b)</b> ✔ correct.' : a.ok ? '<b>(b)</b> ' + b.msg : '<b>(b)</b> Get the empirical formula first, then use the molar mass.');
    }
    it.tries++; if (ok) it.status = 'solved'; it.fb = [status, msg]; save(); card(i); header();
    if (ok) $('#p' + (i + 1) + ' [data-act=next]').focus({ preventScroll: true });
  }
  function drawAll() {
    if (st.cur > firstOpen()) st.cur = firstOpen();
    const fin = $('#finish');
    if (st.cur >= N) { $('#list').innerHTML = ''; results(); } else { fin.hidden = true; fin.innerHTML = ''; $('#list').innerHTML = '<div id="p' + (st.cur + 1) + '"></div>'; card(st.cur); }
    header(); reference();
  }
  const go = (i) => { st.cur = i; save(); drawAll(); window.scrollTo(0, 0); };
  document.addEventListener('click', (e) => {
    const d = e.target.closest('[data-go]'); if (d && !d.disabled) { go(+d.dataset.go); return; }
    const b = e.target.closest('[data-act]'), c = e.target.closest('.prob');
    if (b && c) {
      const i = +c.id.slice(1) - 1, it = st.items[i], a = b.dataset.act;
      if (a === 'check') check(i);
      else if (a === 'reveal') { if (it.tries >= REVEAL && confirm('Show the full solution? This problem will not count as correct.')) { it.status = 'revealed'; it.showSol = true; it.fb = null; save(); card(i); header(); } }
      else if (a === 'sol') { it.showSol = !it.showSol; save(); card(i); }
      else if (a === 'next') go(Math.min(N, firstOpen() > i ? i + 1 : firstOpen()));
      return;
    }
    if (e.target.id === 'newSet' || e.target.id === 'againBtn') { if (e.target.id === 'againBtn' || st.items.every((x) => x.tries === 0) || confirm('Start a brand-new set of problems? Your work on this set will be erased.')) { start(newSeed()); window.scrollTo(0, 0); } }
    if (e.target.id === 'printBtn') window.print();
    if (e.target.id === 'saveBtn') { save(true); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList.contains('pc-in')) { const c = e.target.closest('.prob'); if (c) { e.preventDefault(); check(+c.id.slice(1) - 1); } } });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'nameIn') { st.name = e.target.value; save(); return; }
    const c = e.target.closest('.prob'); if (!c || !e.target.classList.contains('pc-in')) return;
    st.items[+c.id.slice(1) - 1].vals[+e.target.dataset.k] = e.target.value; save();
    if (e.target.classList.contains('wide')) preview(e.target);
  });

  if (linked()) {
    /* inside a class: one set per student, resumed from the learning system */
    const nb = $('#newSet'); if (nb) nb.hidden = true;
    const sv = decode(SC.saved);
    if (sv) { st = sv; set = makeSet(st.seed); drawAll(); showSaved(false); } else start(newSeed());
  } else {
    const forced = parseInt((location.search.match(/[?&]set=(\d{1,9})/) || [])[1], 10), old = load();
    if (forced && (!old || old.seed !== forced)) { st = old ? { name: old.name } : null; start(forced); }
    else if (old && old.seed && Array.isArray(old.items) && old.items.length === N) { st = old; set = makeSet(st.seed); drawAll(); }
    else start(newSeed());
  }
  showSaved(false);
  root.MolePractice = { get state() { return st; }, get set() { return set; }, start, encode, decode };
})(typeof self !== 'undefined' ? self : this);
