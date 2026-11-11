/* steps.js: turns a problem into a step-by-step, colour-coded solution.
 *
 * Every builder returns { steps:[...], answer:{...}, ... }. A step is
 *   { id, stage:'plan'|'setup'|'answer', title, why, html, diagram? }
 * and the same step lists drive the worked examples, the hint ladder in the practice cards,
 * the calculators and the sample-test solutions. `stage` says how much a hint gives away:
 *   plan   = what is given, what is wanted, which path on the mole map
 *   setup  = the numbers and conversion factors, written out
 *   answer = the arithmetic and the rounded answer
 *
 * Highlight roles (the same four colours on every page):
 *   G given (blue)   F find / answer (teal)   K looked-up number or conversion factor (amber)   N count or subscript (magenta)
 */
(function (root) {
  'use strict';
  const C = root.MolesChem || require('./chem.js');
  const D = root.MolesData || require('./data.js');
  const EL = D.ELEMENTS;

  /* ---------- little HTML helpers ---------- */
  const R = (cls, h) => '<span class="r ' + cls + '">' + h + '</span>';
  const G = (h) => R('g', h), F = (h) => R('f', h), K = (h) => R('k', h), N = (h) => R('n', h);
  const fm = C.fmtFormula;
  const kbd = (t) => '<kbd>' + t + '</kbd>';
  const tbl = (head, rows, cls) => '<table class="wk ' + (cls || '') + '"><thead><tr>' + head.map((h) => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' +
    rows.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
  const sig = (x, n) => C.fmtVal(x, n || 4).html;
  const unitWord = (u, s) => (u === 'g' ? 'grams' : u === 'mol' ? 'moles' : u === 'L' ? 'liters' : C.particleWord(s));

  /* A unit with its substance: "g H₂O", "molecules H₂O", "mol Cu" */
  function unitHTML(u, s, cancelId, cancelled, keep) {
    const label = u === 'part' ? C.particleWord(s) : u;
    const cls = 'u' + (cancelled ? ' cx' : '') + (keep ? ' keep' : '');
    return '<span class="' + cls + '"' + (cancelId !== undefined ? ' data-c="' + cancelId + '"' : '') + '>' + label + ' ' + fm(s) + '</span>';
  }
  const unitText = (u, s) => (u === 'part' ? C.particleWord(s) : u) + ' ' + C.fmtFormulaText(s);

  /* ================================================================================== */
  /*  Mole conversions (5.1, 5.3, 5.4): grams, moles, particles, liters at STP           */
  /* ================================================================================== */

  /* A conversion factor between two units of one substance (or the subscript bridge between substances). */
  function edge(from, to) {
    const s = from.s, M = C.molarMass(s);
    const one = (u, sp) => ({ v: 1, vs: '1', u, s: sp });
    const mk = (kind, num, den, why, label) => ({ kind, from, to, num, den, why, label });
    if (from.u === 'g' && to.u === 'mol') return mk('mm', one('mol', s), { v: M, vs: M.toFixed(2), u: 'g', s }, 'molar mass', 'molar mass of ' + C.fmtFormulaText(s));
    if (from.u === 'mol' && to.u === 'g') return mk('mm', { v: M, vs: M.toFixed(2), u: 'g', s }, one('mol', s), 'molar mass', 'molar mass of ' + C.fmtFormulaText(s));
    if (from.u === 'part' && to.u === 'mol') return mk('na', one('mol', s), { v: D.NA, vs: C.fmtSci(D.NA, 3).html, u: 'part', s }, "Avogadro's number", "Avogadro's number");
    if (from.u === 'mol' && to.u === 'part') return mk('na', { v: D.NA, vs: C.fmtSci(D.NA, 3).html, u: 'part', s }, one('mol', s), "Avogadro's number", "Avogadro's number");
    if (from.u === 'L' && to.u === 'mol') return mk('stp', one('mol', s), { v: D.MOLAR_VOLUME, vs: '22.4', u: 'L', s }, 'molar volume at STP', 'molar volume (22.4 L/mol)');
    if (from.u === 'mol' && to.u === 'L') return mk('stp', { v: D.MOLAR_VOLUME, vs: '22.4', u: 'L', s }, one('mol', s), 'molar volume at STP', 'molar volume (22.4 L/mol)');
    throw new Error('no factor from ' + from.u + ' to ' + to.u);
  }
  function ratioEdge(sFrom, sTo) {
    const pf = C.parseFormula(sFrom), n = sTo === 'H2O' && pf.water ? pf.water : pf.counts[sTo];     // the water in a hydrate counts like an element
    return { kind: 'ratio', from: { u: 'mol', s: sFrom }, to: { u: 'mol', s: sTo }, n, why: 'subscript', label: 'subscript of ' + sTo + ' in ' + C.fmtFormulaText(sFrom),
      num: { v: n, vs: String(n), u: 'mol', s: sTo }, den: { v: 1, vs: '1', u: 'mol', s: sFrom } };
  }

  function convRoute(spec) {
    const s0 = spec.given.f, s1 = spec.to.f || s0, u0 = spec.given.unit, u1 = spec.to.unit;
    const route = []; let cur = { u: u0, s: s0 };
    const toMol = () => { if (cur.u === 'mol') return; route.push(edge(cur, { u: 'mol', s: cur.s })); cur = { u: 'mol', s: cur.s }; };
    if (s1 !== s0) { toMol(); route.push(ratioEdge(cur.s, s1)); cur = { u: 'mol', s: s1 }; }
    if (cur.u !== u1) { toMol(); if (cur.u !== u1) { route.push(edge(cur, { u: u1, s: cur.s })); cur = { u: u1, s: cur.s }; } }
    return route;
  }

  /* The conversion chain as HTML. opts: cancel (strike the units that cancel), result ('raw' | 'final' | none) */
  function chainHTML(spec, route, built, opts) {
    opts = opts || {};
    const g = spec.given, parts = [];
    parts.push('<span class="term">' + G(C.fmtGiven(g.v).html + ' ' + unitHTML(g.unit, g.f, 0, opts.cancel)) + '</span>');
    route.forEach((e, i) => {
      const last = i === route.length - 1;
      parts.push('<span class="times">×</span>');
      parts.push('<span class="frac k"><span class="num">' + e.num.vs + ' ' + unitHTML(e.num.u, e.num.s, last ? undefined : i + 1, opts.cancel && !last, last && (opts.cancel || opts.result)) +
        '</span><span class="den">' + e.den.vs + ' ' + unitHTML(e.den.u, e.den.s, i, opts.cancel) + '</span></span>');
    });
    if (opts.result) {
      parts.push('<span class="eq">=</span>');
      const t = route[route.length - 1].num;
      parts.push('<span class="term">' + F((opts.result === 'raw' ? C.fmtVal(built.raw, 6).html : built.answer.fmt.html) + ' ' + unitHTML(t.u, t.s, undefined, false, true)) + '</span>');
    }
    return '<div class="chain">' + parts.join('') + '</div>';
  }

  /* Keystrokes for a calculator, with the EE key for scientific notation */
  function keysFor(spec, route) {
    const num = (v, vs) => { if (Math.abs(v) >= 1e5 || Math.abs(v) < 1e-3) { const f = C.fmtSci(v, 3); return kbd(parseFloat(f.mant)) + kbd('EE') + kbd(f.exp); } return kbd(vs); };
    const gv = C.parseNumber(spec.given.v);
    let out = num(gv, C.fmtGiven(spec.given.v).text.replace(/ × 10.*/, '')); const m = /^([\d.]+)\s*(?:e|[x×*]\s*10\^?)\s*([+-]?\d+)$/i.exec(String(spec.given.v).trim());
    if (m) out = kbd(m[1]) + kbd('EE') + kbd(m[2]);
    route.forEach((e) => {
      if (e.num.v === 1 && e.den.v !== 1) out += kbd('÷') + num(e.den.v, e.den.vs);
      else if (e.den.v === 1 && e.num.v !== 1) out += kbd('×') + num(e.num.v, e.num.vs);
      else if (e.den.v === 1 && e.num.v === 1) { /* nothing */ } else out += kbd('×') + num(e.num.v, e.num.vs) + kbd('÷') + num(e.den.v, e.den.vs);
    });
    return out + kbd('=');
  }

  /* Mini molar-mass calculation used inside other steps: "H: 2 × 1.01 = 2.02 …" */
  function mmMini(s) {
    const f = C.parseFormula(s), mb = C.massBreakdown(f.counts, f.order);
    if (f.order.length === 1 && f.counts[f.order[0]] === 1) return K(EL[f.order[0]].sym + ' = ' + EL[f.order[0]].mass.toFixed(2) + ' g/mol') + ' (straight from the periodic table)';
    return mb.rows.map((r) => r.el + ': ' + N(r.n) + ' × ' + K(r.atomic.toFixed(2)) + ' = ' + r.sub.toFixed(2)).join(' &nbsp; ') + ' &nbsp;→&nbsp; molar mass of ' + fm(s) + ' = ' + K(mb.total.toFixed(2) + ' g/mol');
  }

  function buildConv(spec) {
    const g = spec.given, s0 = g.f, s1 = spec.to.f || s0;
    const route = convRoute(spec);
    const sf = Math.min.apply(null, [g.v].concat(spec.extraSf || []).map(C.sigFigs));
    let raw = C.parseNumber(g.v); const running = [raw];
    route.forEach((e) => { raw *= e.num.v / e.den.v; running.push(raw); });
    const ans = C.fmtVal(raw, sf), last = route[route.length - 1].num;
    const answer = { value: raw, sf, fmt: ans, unit: unitText(last.u, last.s), unitHTML: unitHTML(last.u, last.s), text: ans.text, kind: 'number' };
    const built = { spec, route, raw, answer, running };
    const inside = s1 !== s0;
    const givenFull = C.fmtGiven(g.v).html + ' ' + unitHTML(g.unit, s0);
    const wantWords = unitWord(spec.to.unit, s1) + (spec.to.unit === 'g' || spec.to.unit === 'mol' || spec.to.unit === 'L' ? ' of ' : ' of ') + fm(s1);
    const steps = [];

    steps.push({ id: 'identify', stage: 'plan', title: 'Name what you have and what you want',
      why: 'Every mole problem starts by writing the given and circling the unit you are asked for.',
      html: '<div class="idrow"><span class="tag g">GIVEN</span> ' + G(givenFull) + '</div><div class="idrow"><span class="tag f">FIND</span> ' + F(wantWords) + '</div>' +
        (inside ? '<p class="note">The question is about the <b>' + (EL[s1] ? EL[s1].name.toLowerCase() : 'water') + '</b> <i>inside</i> ' + fm(s0) + ', not the whole compound. That means we will need ' + (EL[s1] ? 'the subscript' : 'the number of waters in the formula') + '.</p>' : '') });

    const word = (e) => unitWord(e.u, e.s);
    const pathWords = [word({ u: g.unit, s: s0 })].concat(route.map((e) => word(e.to)));
    steps.push({ id: 'path', stage: 'plan', title: 'Plan the path on the mole map',
      why: 'You can never jump from particles to grams (or liters). Every trip goes through moles.',
      diagram: { type: 'mapPath', nodes: [g.unit].concat(route.map((e) => e.to.u)), ratio: inside, species: s0, element: inside ? s1 : null },
      html: '<p class="path">' + pathWords.map((w, i) => (i === 0 ? G(w) : i === pathWords.length - 1 ? F(w) : K(w))).join(' <b>→</b> ') + '</p>' +
        '<p class="note">' + route.length + ' conversion factor' + (route.length > 1 ? 's' : '') + ' needed: ' + route.map((e) => K(e.why)).join(', ') + '.</p>' });

    steps.push({ id: 'numbers', stage: 'setup', title: 'Get the number for each factor',
      why: 'These are the looked-up values: the periodic table, Avogadro’s number, the molar volume or the subscripts.',
      html: route.map((e) => {
        if (e.kind === 'mm') return '<div class="line"><b>Molar mass of ' + fm(e.from.s) + ':</b> ' + mmMini(e.from.s) + '</div>';
        if (e.kind === 'na') return '<div class="line"><b>Avogadro’s number:</b> ' + K('6.022 × 10<sup>23</sup> ' + C.particleWord(e.from.s)) + ' in every ' + K('1 mol') + '</div>';
        if (e.kind === 'stp') return '<div class="line"><b>Molar volume at STP:</b> ' + K('22.4 L') + ' of any gas per ' + K('1 mol') + ' <small>(gases at STP only)</small></div>';
        return '<div class="line"><b>The ' + (e.to.s === 'H2O' ? 'formula' : 'subscript') + ':</b> every ' + fm(e.from.s) + ' contains ' + N(e.n) + ' ' + (EL[e.to.s] ? EL[e.to.s].name.toLowerCase() + ' atom' : 'water molecule') + (e.n > 1 ? 's' : '') + ', so ' + K('1 mol ' + fm(e.from.s)) + ' contains ' + N(e.n) + ' ' + K('mol ' + fm(e.to.s)) + '</div>';
      }).join('') });

    steps.push({ id: 'factors', stage: 'setup', title: 'Write each one as a conversion factor',
      why: 'A conversion factor is a fraction equal to 1. Put the unit you want to cancel on the bottom.',
      html: route.map((e, i) => {
        const prev = i === 0 ? unitText(g.unit, s0) : unitText(route[i - 1].num.u, route[i - 1].num.s);
        const frac = (x, y, on) => '<span class="frac' + (on ? ' k' : ' dim') + '"><span class="num">' + x.vs + ' ' + unitHTML(x.u, x.s) + '</span><span class="den">' + y.vs + ' ' + unitHTML(y.u, y.s) + '</span></span>';
        return '<div class="line factorrow"><span class="eqtext">' + K(e.num.vs + ' ' + unitHTML(e.num.u, e.num.s)) + ' = ' + K(e.den.vs + ' ' + unitHTML(e.den.u, e.den.s)) + '</span> ' +
          frac(e.num, e.den, true) + ' <span class="or">or</span> ' + frac(e.den, e.num, false) + '<div class="note">Pick the left one: <b>' + prev + '</b> is already on top, so it must go on the bottom to cancel.</div></div>';
      }).join('') });

    steps.push({ id: 'chain', stage: 'setup', title: 'Set up the chain',
      why: 'Line the factors up left to right so each unit sits above its partner below.', html: chainHTML(spec, route, built, {}) });
    const left = unitText(last.u, last.s);
    steps.push({ id: 'cancel', stage: 'setup', title: 'Cancel the units',
      why: 'If the units cancel to leave only the unit you want, the setup is right. If not, a factor is upside down.',
      html: chainHTML(spec, route, built, { cancel: true }) + '<p class="note">Everything cancels except ' + F(left) + ' — exactly the unit we were asked for. ✔</p>' });
    steps.push({ id: 'calc', stage: 'answer', title: 'Calculate (do not round yet)',
      why: 'Type the whole chain on your calculator in one go. Use the EE key for × 10 to a power.',
      html: '<div class="keys">' + keysFor(spec, route) + '</div>' + chainHTML(spec, route, built, { result: 'raw' }) +
        '<p class="note">Keep every digit the calculator gives you until the very last step.</p>' });
    const mid = running.findIndex((v, i) => i > 0 && route[i - 1].to.u === 'mol');
    steps.push({ id: 'answer', stage: 'answer', title: 'Round to the right sig figs and label it',
      why: 'The answer can only be as precise as the data you were given.',
      html: '<p>' + G(C.fmtGiven(g.v).html) + ' has <b>' + C.sigFigs(g.v) + '</b> significant figure' + (C.sigFigs(g.v) > 1 ? 's' : '') + (spec.extraSf ? ' (the other data has ' + spec.extraSf.map(C.sigFigs).join(', ') + ')' : '') + ', so the answer gets <b>' + sf + '</b>.</p>' +
        '<div class="final">' + F(ans.html + ' ' + unitHTML(last.u, last.s)) + '</div>' +
        (mid > 0 && route[route.length - 1].to.u !== 'mol' ? '<p class="note">Check: along the way you passed through <b>' + C.fmtVal(running[mid], Math.max(sf, 2)).html + ' mol</b>' + (route[route.length - 1].to.u === 'part' ? ' — each mole is 6.022 × 10<sup>23</sup> particles.' : '.') + '</p>' : '') });
    return Object.assign(built, { steps });
  }

  /* What mistake produced this wrong answer?  (flipped or skipped factor) */
  function diagnoseConv(built, user) {
    if (!isFinite(user) || user <= 0) return null;
    const { spec, route } = built, v0 = C.parseNumber(spec.given.v);
    const near = (a) => Math.abs(user - a) / Math.abs(a) < 0.03;
    for (let i = 0; i < route.length; i++) {
      let flip = v0, skip = v0;
      route.forEach((e, j) => { flip *= j === i ? e.den.v / e.num.v : e.num.v / e.den.v; if (j !== i) skip *= e.num.v / e.den.v; });
      if (near(flip)) return 'It looks like the <b>' + route[i].label + '</b> factor is upside down. The unit you want to cancel goes on the <b>bottom</b>.';
      if (near(skip) && route.length > 1) return 'It looks like the <b>' + route[i].label + '</b> step is missing. Count your conversion factors against the path on the mole map.';
    }
    if (route.length === 1 && near(v0)) return 'That is just the number you were given. Did you apply the conversion factor?';
    const r = Math.log10(user / built.raw);
    if (Math.abs(r - Math.round(r)) < 0.03 && Math.round(r) !== 0) return 'Your digits are right but the power of ten is off by ' + Math.abs(Math.round(r)) + '. Check how you typed the scientific notation (use the EE key).';
    return null;
  }

  /* ================================================================================== */
  /*  Molar mass (5.2)                                                                   */
  /* ================================================================================== */
  function treeLines(tree, depth) {
    // Describe parentheses: "(OH)₂ : O 1 × 2 = 2, H 1 × 2 = 2"
    const out = [];
    tree.forEach((nd) => {
      if (nd.type !== 'grp') return;
      const inner = {}; const order = [];
      const walk = (kids, m) => kids.forEach((k) => { if (k.type === 'el') { if (!(k.el in inner)) { inner[k.el] = 0; order.push(k.el); } inner[k.el] += k.n * m; } else walk(k.kids, m * k.n); });
      const inside = {}; const o2 = [];
      const w1 = (kids) => kids.forEach((k) => { if (k.type === 'el') { if (!(k.el in inside)) { inside[k.el] = 0; o2.push(k.el); } inside[k.el] += k.n; } else { const sub = {}; /* nested */ } });
      w1(nd.kids); walk(nd.kids, nd.n);
      out.push({ n: nd.n, kids: nd.kids, per: o2.map((e) => ({ el: e, inside: inside[e], total: inner[e] })) });
    });
    return out;
  }

  function buildMolarMass(spec) {
    const f = C.parseFormula(spec.f), mb = C.massBreakdown(f.counts, f.order), total = mb.total;
    const groups = f.parts.length === 1 ? treeLines(f.parts[0].tree) : [];
    const steps = [];
    steps.push({ id: 'identify', stage: 'plan', title: 'What are we finding?', why: 'Molar mass is the mass of one mole of the substance, in grams per mole (g/mol).',
      html: '<div class="idrow"><span class="tag g">GIVEN</span> ' + G(fm(spec.f) + (C.nameOf(spec.f) ? ' (' + C.nameOf(spec.f) + ')' : '')) + '</div><div class="idrow"><span class="tag f">FIND</span> ' + F('molar mass in g/mol') + '</div>' +
        (f.order.length === 1 && f.counts[f.order[0]] === 1 ? '<p class="note">One element, one atom: the molar mass is just the number on the periodic table.</p>' : '<p class="note">Add up the atomic mass of <b>every atom</b> in the formula.</p>') });
    const lines = f.order.map((e) => '<tr><td><b>' + e + '</b> <small>' + EL[e].name + '</small></td><td>' + N(f.counts[e]) + '</td></tr>');
    steps.push({ id: 'count', stage: 'plan', title: 'Count the atoms of each element', why: 'A subscript multiplies the atom just before it. A subscript outside parentheses multiplies everything inside.',
      diagram: { type: 'atomGroups', formula: spec.f },
      html: '<table class="wk"><thead><tr><th>Element</th><th>Atoms</th></tr></thead><tbody>' + lines.join('') + '</tbody></table>' +
        groups.map((gr) => '<div class="warn">⚠ The ' + N(gr.n) + ' outside the parentheses multiplies <b>everything</b> inside: ' + gr.per.map((p) => p.el + ': ' + p.inside + ' × ' + gr.n + ' = ' + N(p.total)).join(', ') + '.</div>').join('') });
    steps.push({ id: 'lookup', stage: 'setup', title: 'Look up each atomic mass', why: 'Use the periodic table, to two decimal places.',
      html: tbl(['Element', 'Atomic mass (g/mol)'], mb.rows.map((r) => [r.el, K(r.atomic.toFixed(2))])) });
    steps.push({ id: 'multiply', stage: 'setup', title: 'Multiply: atoms × atomic mass', why: 'This gives the mass each element contributes to one mole of the compound.',
      html: tbl(['Element', 'Atoms × atomic mass', 'Mass (g)'], mb.rows.map((r) => [r.el, N(r.n) + ' × ' + K(r.atomic.toFixed(2)), r.sub.toFixed(2)])) });
    const ans = C.roundDp(total, 2).toFixed(2);
    steps.push({ id: 'add', stage: 'answer', title: 'Add them up', why: 'The total is the mass of one mole. Round to 0.01 and include the unit g/mol.',
      html: '<div class="sum">' + mb.rows.map((r) => r.sub.toFixed(2)).join(' + ') + ' = </div><div class="final">' + F(ans + ' g/mol') + '</div>' +
        (f.order.length === 1 && f.counts[f.order[0]] > 1 ? '<p class="note">' + fm(spec.f) + ' is a molecule of ' + f.counts[f.order[0]] + ' atoms, so its molar mass is ' + f.counts[f.order[0]] + ' × ' + EL[f.order[0]].mass.toFixed(2) + ', not just the atomic mass.</p>' : '') });
    const answer = { value: total, sf: ans.replace('.', '').replace(/^0+/, '').length, fmt: { text: ans, html: ans }, unit: 'g/mol', text: ans, kind: 'number', dp: 2 };
    return { spec, f, mb, answer, steps, groups };
  }
  function diagnoseMolarMass(built, user) {
    const near = (a) => Math.abs(user - a) < 0.06;
    const f = built.f;
    // forgot the outside subscript on a group: add each element once per group member
    const alt = built.mb.rows.reduce((t, r) => t + r.atomic * (built.groups.length ? 1 : r.n), 0);
    if (built.groups.length) {
      const f2 = C.parseFormula(built.spec.f); let t = 0; const seen = {};
      const walk = (kids) => kids.forEach((k) => { if (k.type === 'el') t += EL[k.el].mass * k.n; else walk(k.kids); });
      walk(f2.parts[0].tree);
      if (near(t)) return 'It looks like the number outside the parentheses was not multiplied through. Everything inside the parentheses gets multiplied.';
    }
    if (f.order.length === 1 && f.counts[f.order[0]] > 1 && near(EL[f.order[0]].mass)) return 'That is the atomic mass of ONE atom. ' + fm(built.spec.f) + ' is a diatomic molecule, so double it.';
    const noSub = built.mb.rows.reduce((t, r) => t + r.atomic, 0);
    if (!built.groups.length && f.order.length > 1 && near(noSub)) return 'It looks like the subscripts were ignored. Each element’s atomic mass must be multiplied by how many atoms there are.';
    return null;
  }

  /* ================================================================================== */
  /*  Percent composition (5.5)                                                          */
  /* ================================================================================== */
  function buildPercent(spec) {
    const f = C.parseFormula(spec.f), comp = C.composition(f), M = comp.total;
    const rows = comp.rows.map((r) => Object.assign({ pct2: C.roundDp(r.pct, 2) }, r));
    const steps = [];
    steps.push({ id: 'identify', stage: 'plan', title: 'What are we finding?', why: 'Percent composition is each element’s share of the compound’s mass: part ÷ whole × 100.',
      html: '<div class="idrow"><span class="tag g">GIVEN</span> ' + G(fm(spec.f) + (C.nameOf(spec.f) ? ' (' + C.nameOf(spec.f) + ')' : '')) + '</div><div class="idrow"><span class="tag f">FIND</span> ' + F(spec.only ? '% ' + EL[spec.only].name.toLowerCase() + ' by mass' : '% of every element, by mass') + '</div>' +
        '<p class="note"><b>% element</b> = ' + N('mass of that element in 1 mol') + ' ÷ ' + K('molar mass of the compound') + ' × 100</p>' });
    steps.push({ id: 'whole', stage: 'setup', title: 'Find the molar mass (the whole)', why: 'The molar mass is the denominator for every percent.',
      diagram: { type: 'atomGroups', formula: spec.f }, html: '<div class="line">' + mmMini(spec.f) + '</div>' });
    steps.push({ id: 'parts', stage: 'setup', title: 'Find each element’s mass in one mole (the parts)', why: 'Count all the atoms of the element in the formula — including the ones inside parentheses — then multiply by its atomic mass.',
      html: tbl(['Element', 'Atoms × atomic mass', 'Part (g)'], rows.map((r) => [r.el, N(r.n) + ' × ' + K(r.atomic.toFixed(2)), r.sub.toFixed(2)])) });
    steps.push({ id: 'percent', stage: 'answer', title: 'Divide each part by the whole and × 100', why: 'Round each percent to two decimal places.',
      html: tbl(['Element', 'part ÷ whole × 100', '% by mass'], rows.map((r) => [r.el, r.sub.toFixed(2) + ' ÷ ' + K(M.toFixed(2)) + ' × 100', (spec.only ? (r.el === spec.only ? F(r.pct2.toFixed(2) + ' %') : r.pct2.toFixed(2) + ' %') : F(r.pct2.toFixed(2) + ' %'))])) });
    const tot = rows.reduce((t, r) => t + r.pct2, 0);
    steps.push({ id: 'check', stage: 'answer', title: 'Check: do they add to 100 %?', why: 'A quick way to catch a missed atom. Rounding can make the total 99.99 or 100.01.',
      diagram: { type: 'pctBar', rows: rows.map((r) => ({ el: r.el, pct: r.pct })) },
      html: '<div class="sum">' + rows.map((r) => r.pct2.toFixed(2)).join(' + ') + ' = <b>' + tot.toFixed(2) + ' %</b></div>' });
    const target = spec.only ? rows.find((r) => r.el === spec.only) : null;
    const answer = target ? { value: target.pct, sf: 4, fmt: { text: target.pct2.toFixed(2), html: target.pct2.toFixed(2) }, unit: '%', text: target.pct2.toFixed(2), kind: 'number', dp: 2 } : { kind: 'multi', rows: rows.map((r) => ({ el: r.el, pct: r.pct2 })) };
    return { spec, f, comp, rows, answer, steps };
  }
  function diagnosePercent(built, user) {
    const t = built.rows.find((r) => r.el === built.spec.only); if (!t) return null;
    const near = (a) => Math.abs(user - a) < 0.15;
    if (t.n > 1 && near(t.atomic / built.comp.total * 100)) return 'You used the mass of ONE ' + t.el + ' atom. Multiply by all ' + t.n + ' of them before dividing.';
    const others = built.rows.filter((r) => r !== t).reduce((s, r) => s + r.sub, 0);
    if (near(t.sub / others * 100)) return 'It looks like you divided by the mass of the OTHER elements. The denominator is the whole compound’s molar mass.';
    if (near(100 - t.pct)) return 'That is the percent of everything EXCEPT ' + t.el + '.';
    return null;
  }
  /* "A 50.0 g sample is 20.0 % hydrogen. How many grams of hydrogen?" */
  function buildPercentOf(spec) {
    const m = C.parseNumber(spec.mass), p = C.parseNumber(spec.pct), sf = Math.min(C.sigFigs(spec.mass), C.sigFigs(spec.pct)), val = m * p / 100, ans = C.fmtVal(val, sf);
    const steps = [
      { id: 'identify', stage: 'plan', title: 'What do we know?', why: 'A percent by mass means “grams of this element in every 100 g”.', html: '<div class="idrow"><span class="tag g">GIVEN</span> ' + G(spec.mass + ' g sample') + ' and ' + G(spec.pct + ' % ' + spec.el) + '</div><div class="idrow"><span class="tag f">FIND</span> ' + F('grams of ' + spec.el) + '</div>' },
      { id: 'decimal', stage: 'setup', title: 'Change the percent to a decimal', why: 'Divide by 100 (move the decimal two places left).', html: '<div class="line">' + G(spec.pct + ' %') + ' ÷ 100 = ' + K(C.fmtVal(p / 100, 4).html) + '</div>' },
      { id: 'multiply', stage: 'answer', title: 'Multiply by the mass of the sample', why: 'The part is the percent (as a decimal) of the whole.', html: '<div class="chain"><span class="term">' + K(C.fmtVal(p / 100, 4).html) + '</span><span class="times">×</span><span class="term">' + G(spec.mass + ' g') + '</span><span class="eq">=</span><span class="term">' + F(ans.html + ' g ' + spec.el) + '</span></div>' }];
    return { spec, steps, answer: { value: val, sf, fmt: ans, unit: 'g ' + spec.el, text: ans.text, kind: 'number' } };
  }

  /* ================================================================================== */
  /*  Empirical and molecular formulas (5.6)                                             */
  /* ================================================================================== */
  const moleTxt = (x) => C.roundSig(x, 4).toString().replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  function buildEmpirical(spec) {
    const items = spec.items;                                   // [{el, v: '40.0', kind:'pct'|'g'}]
    const usesPct = items[0].kind === 'pct';
    const grams = items.map((it) => ({ el: it.el, grams: C.parseNumber(it.v) }));
    const res = C.empirical(grams);
    const sym = items.map((it) => it.el);
    const steps = [];
    steps.push({ id: 'identify', stage: 'plan', title: 'What do we know and what do we want?', why: 'An empirical formula is the simplest whole-number ratio of atoms. The recipe: ' + (usesPct ? '% → grams → moles → ÷ smallest → whole numbers.' : 'grams → moles → ÷ smallest → whole numbers.'),
      diagram: { type: 'empPipeline', pct: usesPct, molecular: !!spec.molarMass },
      html: '<div class="idrow"><span class="tag g">GIVEN</span> ' + items.map((it) => G(it.v + (usesPct ? ' % ' : ' g ') + it.el)).join(', ') + (spec.molarMass ? ' and ' + G('molar mass ' + spec.molarMass + ' g/mol') : '') + '</div>' +
        '<div class="idrow"><span class="tag f">FIND</span> ' + F('empirical formula' + (spec.molarMass ? ' and molecular formula' : '')) + '</div>' });
    if (usesPct) steps.push({ id: 'assume', stage: 'plan', title: 'Assume a 100 g sample', why: 'Then every percent turns directly into grams. (45.2 % means 45.2 g in 100 g.)',
      html: tbl(['Element', 'Percent', 'Grams in 100 g'], items.map((it) => [it.el, G(it.v + ' %'), G(it.v + ' g')])) });
    steps.push({ id: 'moles', stage: 'setup', title: 'Change each mass to moles', why: 'Divide the grams by the atomic mass. Atoms combine in whole-number ratios of moles, not grams.',
      html: tbl(['Element', 'grams ÷ atomic mass', 'Moles'], items.map((it, i) => [it.el, G(it.v) + ' ÷ ' + K(EL[it.el].mass.toFixed(2)), F(moleTxt(res.moles[i]) + ' mol')])) });
    const minI = res.moles.indexOf(res.min);
    steps.push({ id: 'divide', stage: 'setup', title: 'Divide every mole value by the smallest', why: 'The smallest becomes 1. The others become the ratio of atoms. Never divide by the largest.',
      diagram: { type: 'moleBars', labels: sym, moles: res.moles, ratios: res.ratios, mult: 1 },
      html: tbl(['Element', 'moles ÷ smallest (' + moleTxt(res.min) + ')', 'Ratio'], items.map((it, i) => [it.el, moleTxt(res.moles[i]) + ' ÷ ' + K(moleTxt(res.min)), F(res.ratios[i].toFixed(2))])) +
        '<p class="note">Smallest = ' + sym[minI] + ' (' + moleTxt(res.min) + ' mol), so its ratio is exactly 1.</p>' });
    const allNearWhole = res.mult === 1;
    let whyMult;
    if (!res.ok) whyMult = 'These ratios do not settle onto whole numbers. Check the data and the atomic masses.';
    else if (allNearWhole) whyMult = 'Every ratio is within about 0.1 of a whole number, so round each one (3.96 is really 4). No multiplying is needed.';
    else {
      const fr = res.frac.map((x) => Math.round(x * 100) / 100).filter((x) => x > 0.1 && x < 0.9);
      const pat = res.mult === 2 ? 'a decimal near <b>.5</b>' : res.mult === 3 ? 'a decimal near <b>.33</b> or <b>.67</b>' : res.mult === 4 ? 'a decimal near <b>.25</b> or <b>.75</b>' : 'a decimal near <b>.2, .4, .6 or .8</b>';
      whyMult = 'At least one ratio has ' + pat + ' (' + fr.join(', ') + '). Multiply <b>every</b> ratio by ' + N(res.mult) + ' to clear it. <b>Do not</b> round 1.5 up to 2: that changes the compound.';
    }
    steps.push({ id: 'whole', stage: 'setup', title: allNearWhole ? 'Round to whole numbers' : 'Multiply to clear the decimals', why: whyMult.replace(/<[^>]+>/g, ''),
      diagram: allNearWhole ? null : { type: 'moleBars', labels: sym, moles: res.moles, ratios: res.ratios, mult: res.mult },
      html: '<p>' + whyMult + '</p>' + (res.ok ? tbl(['Element', 'Ratio' + (allNearWhole ? '' : ' × ' + res.mult), 'Whole number'], items.map((it, i) => [it.el, res.ratios[i].toFixed(2) + (allNearWhole ? '' : ' × ' + N(res.mult) + ' = ' + (res.ratios[i] * res.mult).toFixed(2)), N(res.final[i])])) : '') });
    const pairs = items.map((it, i) => ({ el: it.el, n: res.ok ? res.final[i] : 0 }));
    const empF = C.formulaString(pairs);
    steps.push({ id: 'formula', stage: 'answer', title: 'Write the empirical formula', why: 'The whole numbers are the subscripts. A subscript of 1 is not written.',
      html: '<div class="final">' + F(fm(empF)) + '</div>' + (spec.molarMass ? '' : '') });
    let answer = { kind: 'formula', formula: empF, text: empF };
    let mol = null;
    if (spec.molarMass) {
      const empCounts = {}; pairs.forEach((p) => { empCounts[p.el] = p.n; });
      mol = C.molecular(empCounts, sym, spec.molarMass);
      const molPairs = pairs.map((p) => ({ el: p.el, n: p.n * mol.n })), molF = C.formulaString(molPairs);
      steps.push({ id: 'molecular', stage: 'answer', title: 'Molecular formula: how many empirical units fit in the molar mass?', why: 'The molecular formula is a whole-number multiple (n) of the empirical formula.',
        diagram: { type: 'empVsMol', unit: empF, n: mol.n, pairs: pairs },
        html: '<div class="line">Empirical formula mass of ' + fm(empF) + ' = ' + K(mol.empMass.toFixed(2) + ' g/mol') + '</div>' +
          '<div class="chain"><span class="term"><b>n</b> =</span><span class="frac k"><span class="num">' + G(spec.molarMass + ' g/mol') + '</span><span class="den">' + K(mol.empMass.toFixed(2) + ' g/mol') + '</span></span><span class="eq">=</span><span class="term">' + N(mol.nRaw.toFixed(2)) + ' ≈ ' + N(mol.n) + '</span></div>' +
          '<div class="line">Multiply every subscript by ' + N(mol.n) + (mol.n === 1 ? ' (the molecular formula is the same as the empirical formula).' : ':') + '</div><div class="final">' + F(fm(molF)) + '</div>' });
      answer = { kind: 'formula', formula: molF, empirical: empF, text: molF, n: mol.n };
    }
    return { spec, res, pairs, mol, answer, steps };
  }
  function diagnoseEmpirical(built, userText) {
    const u = C.parseFormula(userText);
    if (!u.ok) return null;
    const { res, pairs, spec } = built;
    // rounded the ratio instead of multiplying (1.5 -> 2)
    if (res.mult > 1) {
      const rounded = pairs.map((p, i) => ({ el: p.el, n: Math.max(1, Math.round(res.ratios[i])) }));
      if (C.sameFormula(userText, C.formulaString(rounded))) return 'It looks like a decimal like .5 was rounded up to the next whole number. Instead, multiply <b>every</b> ratio by ' + res.mult + ' to clear it.';
    }
    if (spec.molarMass && built.mol && built.mol.n > 1 && C.sameFormula(userText, built.answer.empirical)) return 'That is the empirical formula. The question gave the molar mass, so find n = molar mass ÷ empirical mass and multiply the subscripts.';
    const asRatio = C.formulaString(pairs.map((p, i) => ({ el: p.el, n: Math.max(1, Math.round(res.moles[i] / Math.max.apply(null, res.moles) * 10) / 10 >= 1 ? 1 : 1) })));
    return null;
  }

  /* Empirical formula + molar mass -> molecular formula (no percents involved) */
  function buildMolecular(spec) {
    const f = C.parseFormula(spec.emp), M = C.parseNumber(spec.molarMass);
    const pairs = f.order.map((e) => ({ el: e, n: f.counts[e] }));
    const mol = C.molecular(f.counts, f.order, M);
    const molPairs = pairs.map((p) => ({ el: p.el, n: p.n * mol.n })), molF = C.formulaString(molPairs);
    const steps = [
      { id: 'identify', stage: 'plan', title: 'What do we know and what do we want?', why: 'The molecular formula is a whole-number multiple (n) of the empirical formula.',
        html: '<div class="idrow"><span class="tag g">GIVEN</span> ' + G('empirical formula ' + fm(spec.emp)) + ' and ' + G('molar mass ' + spec.molarMass + ' g/mol') + '</div><div class="idrow"><span class="tag f">FIND</span> ' + F('molecular formula') + '</div>' },
      { id: 'empmass', stage: 'setup', title: 'Find the mass of one empirical formula unit', why: 'Add up the atomic masses in the empirical formula.',
        html: '<div class="line">' + mmMini(spec.emp) + '</div>' },
      { id: 'n', stage: 'answer', title: 'How many empirical units fit in the molar mass?', why: 'n = molar mass ÷ empirical formula mass. It should come out very close to a whole number.',
        html: '<div class="chain"><span class="term"><b>n</b> =</span><span class="frac k"><span class="num">' + G(spec.molarMass + ' g/mol') + '</span><span class="den">' + K(mol.empMass.toFixed(2) + ' g/mol') + '</span></span><span class="eq">=</span><span class="term">' + N(mol.nRaw.toFixed(2)) + ' ≈ ' + N(mol.n) + '</span></div>' },
      { id: 'formula', stage: 'answer', title: 'Multiply every subscript by n', why: 'Every atom count in the empirical formula is multiplied, not just one.',
        diagram: { type: 'empVsMol', unit: spec.emp, n: mol.n, pairs },
        html: '<div class="line">' + pairs.map((p) => p.el + ': ' + N(p.n) + ' × ' + N(mol.n) + ' = ' + (p.n * mol.n)).join(' &nbsp; ') + '</div><div class="final">' + F(fm(molF)) + '</div>' }
    ];
    return { spec, mol, pairs, steps, answer: { kind: 'formula', formula: molF, empirical: spec.emp, text: molF, n: mol.n } };
  }

  /* ================================================================================== */
  /*  Hydrates (5.7)                                                                     */
  /* ================================================================================== */
  function buildHydrate(spec) {
    // spec: { salt, mHyd?, mAnh?, mWater?, pct?, crucible?:{empty,hyd,anh}, askPct? } (strings or numbers for data)
    const num = (v) => (v === undefined ? undefined : C.parseNumber(String(v)));
    let mHyd = num(spec.mHyd), mAnh = num(spec.mAnh), mWater = num(spec.mWater);
    const steps = [];
    const salt = spec.salt, Ms = C.molarMass(salt), Mw = C.WATER;
    const crucible = spec.crucible;
    const fN = (x, d) => (d === undefined ? C.roundDp(x, 2) : C.roundDp(x, d)).toString();
    if (crucible) {
      const e = num(crucible.empty), h = num(crucible.hyd), a = num(crucible.anh);
      mHyd = h - e; mAnh = a - e; mWater = h - a;
    }
    const pct = spec.pct !== undefined ? num(spec.pct) : undefined;
    const givenTxt = crucible ? [G('crucible ' + crucible.empty + ' g'), G('crucible + hydrate ' + crucible.hyd + ' g'), G('crucible + anhydrous ' + crucible.anh + ' g')].join(', ')
      : pct !== undefined ? G(spec.pct + ' % water') + ' and ' + G((100 - pct).toFixed(2).replace(/\.?0+$/, '') + ' % ' + fm(salt))
      : [mHyd !== undefined ? G(spec.mHyd + ' g hydrate') : '', mAnh !== undefined ? G(spec.mAnh + ' g anhydrous ' + fm(salt)) : '', spec.mWater !== undefined ? G(spec.mWater + ' g water lost') : ''].filter(Boolean).join(', ');
    steps.push({ id: 'identify', stage: 'plan', title: 'What do we know and what do we want?', why: 'The mass lost on heating is the mass of the water. Compare moles of water to moles of salt — not grams.',
      diagram: { type: 'hydrateIdea', salt },
      html: '<div class="idrow"><span class="tag g">GIVEN</span> ' + givenTxt + '</div><div class="idrow"><span class="tag f">FIND</span> ' + F('x in ' + fm(salt) + '·xH2O, then the formula and name') + '</div>' });
    if (crucible) steps.push({ id: 'crucible', stage: 'plan', title: 'Subtract the empty crucible', why: 'The balance measures crucible + sample. Only the sample matters.',
      html: tbl(['Quantity', 'Calculation', 'Mass (g)'], [['hydrate', G(crucible.hyd) + ' − ' + G(crucible.empty), fN(mHyd)], ['anhydrous ' + fm(salt), G(crucible.anh) + ' − ' + G(crucible.empty), fN(mAnh)], ['water lost', G(crucible.hyd) + ' − ' + G(crucible.anh), F(fN(mWater))]]) });
    if (pct !== undefined) { mHyd = 100; mWater = pct; mAnh = 100 - pct; steps.push({ id: 'assume', stage: 'plan', title: 'Assume a 100 g sample', why: 'Then each percent is the number of grams.', html: tbl(['Part', 'Percent', 'Grams in 100 g'], [['water', G(spec.pct + ' %'), G(spec.pct + ' g')], [fm(salt), G((100 - pct).toFixed(2).replace(/\.?0+$/, '') + ' %'), G((100 - pct).toFixed(2).replace(/\.?0+$/, '') + ' g')]]) }); }
    else if (!crucible) {
      if (mWater === undefined) { mWater = mHyd - mAnh; steps.push({ id: 'water', stage: 'plan', title: 'Mass of water = mass lost', why: 'Heating drives off only the water.', html: '<div class="chain"><span class="term">' + G(spec.mHyd + ' g') + '</span><span class="times">−</span><span class="term">' + G(spec.mAnh + ' g') + '</span><span class="eq">=</span><span class="term">' + F(fN(mWater) + ' g water') + '</span></div><p class="note">hydrate − anhydrous salt = water</p>' }); }
      else if (mAnh === undefined) { mAnh = mHyd - mWater; steps.push({ id: 'anh', stage: 'plan', title: 'Mass of anhydrous salt = hydrate − water lost', why: 'What is left after heating is the salt alone.', html: '<div class="chain"><span class="term">' + G(spec.mHyd + ' g') + '</span><span class="times">−</span><span class="term">' + G(spec.mWater + ' g') + '</span><span class="eq">=</span><span class="term">' + F(fN(mAnh) + ' g ' + fm(salt)) + '</span></div>' }); }
    }
    const nW = mWater / Mw, nS = mAnh / Ms, xRaw = nW / nS, x = Math.round(xRaw);
    steps.push({ id: 'moles', stage: 'setup', title: 'Change both masses to moles', why: 'Water: ÷ 18.02 g/mol. Salt: ÷ its molar mass (without the water!).',
      html: '<div class="line"><b>Molar mass of H₂O:</b> ' + K('18.02 g/mol') + '</div><div class="line"><b>Molar mass of ' + fm(salt) + ':</b> ' + mmMini(salt) + '</div>' +
        tbl(['', 'grams ÷ molar mass', 'Moles'], [['water', G(fN(mWater)) + ' ÷ ' + K('18.02'), F(sig(nW, 3) + ' mol')], [fm(salt), G(fN(mAnh)) + ' ÷ ' + K(Ms.toFixed(2)), F(sig(nS, 3) + ' mol')]]) });
    const ok = x >= 1 && Math.abs(xRaw - x) <= 0.15;
    steps.push({ id: 'ratio', stage: 'answer', title: 'Find x: moles of water per mole of salt', why: 'x is the ratio. Round it to the nearest whole number.',
      html: '<div class="chain"><span class="term"><b>x</b> =</span><span class="frac k"><span class="num">' + sig(nW, 3) + ' mol H₂O</span><span class="den">' + sig(nS, 3) + ' mol ' + fm(salt) + '</span></span><span class="eq">=</span><span class="term">' + N(xRaw.toFixed(2)) + ' ≈ ' + F(String(x)) + '</span></div>' +
        (ok ? '<p class="note">' + xRaw.toFixed(2) + ' is within 0.15 of ' + x + ', so x = ' + x + '.</p>' : '<div class="warn">⚠ ' + xRaw.toFixed(2) + ' is not close to a whole number. Check the masses, or the sample may not be fully dry (reheat and re-weigh).</div>') });
    const formula = salt + '·' + (x > 1 ? x : '') + 'H2O', name = C.hydrateName(salt, x), saltName = C.nameOf(salt);
    steps.push({ id: 'formula', stage: 'answer', title: 'Write the formula and the name', why: 'Name the salt first, then add the prefix for x and the word “hydrate”.',
      html: '<div class="final">' + F(fm(formula)) + '</div>' + (name ? '<div class="line">name: ' + (saltName ? K(saltName) : '') + ' + ' + N(C.hydratePrefix(x) + 'hydrate') + ' = ' + F('<b>' + name + '</b>') + '</div>' : '<div class="line">Name the salt, then add the prefix <b>' + (C.hydratePrefix(x) || '?') + 'hydrate</b>.</div>') });
    const pctW = mWater / (mHyd !== undefined ? mHyd : mAnh + mWater) * 100;
    if (spec.askPct) steps.push({ id: 'pct', stage: 'answer', title: 'Percent water in the hydrate', why: 'part ÷ whole × 100, using the masses from the experiment.',
      html: '<div class="chain"><span class="term">' + F('% water') + ' =</span><span class="frac"><span class="num">' + G(fN(mWater) + ' g water') + '</span><span class="den">' + G(fN(mHyd) + ' g hydrate') + '</span></span><span class="times">× 100 =</span><span class="term">' + F(C.fmtVal(pctW, 3).html + ' %') + '</span></div>' });
    const answer = { kind: 'formula', formula, x, xRaw, name, text: formula, pctWater: pctW };
    return { spec, salt, Ms, mHyd, mAnh, mWater, nW, nS, xRaw, x, ok, formula, name, pctWater: pctW, answer, steps };
  }
  function diagnoseHydrate(built, userX) {
    const near = (a) => Math.abs(userX - a) / Math.max(Math.abs(a), 1e-9) < 0.04;
    if (near(built.mWater / built.mAnh)) return 'It looks like you divided the <b>grams</b> of water by the grams of salt. Convert both to <b>moles</b> first (water ÷ 18.02, salt ÷ its own molar mass).';
    if (near(built.mWater / built.Ms)) return 'It looks like the water was divided by the salt’s molar mass. Water uses 18.02 g/mol.';
    return null;
  }

  /* Problem text with markup: [[Al2(SO4)3]] -> formatted formula, {g|3.25 mol} -> blue "given" highlight (also f, k, n) */
  const T = (str) => str.replace(/\[\[([^\]]+)\]\]/g, (m, f) => fm(f)).replace(/\{([gfkn])\|([^}]*)\}/g, (m, r, t) => R(r, t));

  /* Percent water in a hydrate, straight from its formula: x waters in one formula unit */
  function buildHydratePct(spec) {
    const f = C.parseFormula(spec.salt + '·' + spec.x + 'H2O'), Ms = C.molarMass(spec.salt), Mw = C.WATER, wMass = spec.x * Mw, Mh = Ms + wMass, pct = wMass / Mh * 100;
    const steps = [
      { id: 'identify', stage: 'plan', title: 'What are we finding?', why: 'Percent water is part ÷ whole × 100: the mass of the water in one mole of the hydrate, over the molar mass of the whole hydrate.',
        diagram: { type: 'hydrateIdea', salt: spec.salt }, html: '<div class="idrow"><span class="tag g">GIVEN</span> ' + G(fm(f.text) + (C.hydrateName(spec.salt, spec.x) ? ' (' + C.hydrateName(spec.salt, spec.x) + ')' : '')) + '</div><div class="idrow"><span class="tag f">FIND</span> ' + F('% water by mass') + '</div>' },
      { id: 'salt', stage: 'setup', title: 'Molar mass of the anhydrous salt', why: 'Add the atoms of the salt only (the water comes next).', html: '<div class="line">' + mmMini(spec.salt) + '</div>' },
      { id: 'water', stage: 'setup', title: 'Mass of the water in one mole of hydrate', why: 'The dot means x whole water molecules, each 18.02 g/mol.', html: '<div class="chain"><span class="term">' + N(spec.x) + '</span><span class="times">×</span><span class="term">' + K('18.02 g/mol') + '</span><span class="eq">=</span><span class="term">' + wMass.toFixed(2) + ' g</span></div><div class="line">Whole hydrate: ' + Ms.toFixed(2) + ' + ' + wMass.toFixed(2) + ' = ' + K(Mh.toFixed(2) + ' g/mol') + '</div>' },
      { id: 'pct', stage: 'answer', title: 'part ÷ whole × 100', why: 'Round to three sig figs.', html: '<div class="chain"><span class="term">' + F('% water') + ' =</span><span class="frac"><span class="num">' + wMass.toFixed(2) + ' g</span><span class="den">' + Mh.toFixed(2) + ' g</span></span><span class="times">× 100 =</span><span class="term">' + F(C.fmtVal(pct, 3).html + ' %') + '</span></div>' }];
    return { spec, steps, pct, answer: { kind: 'number', value: pct, sf: 3, fmt: C.fmtVal(pct, 3), unit: '%', text: C.fmtVal(pct, 3).text } };
  }

  const api = { buildHydratePct, edge, T, G, F, K, N, R, fm, kbd, tbl, unitText, unitHTML, buildConv, diagnoseConv, convRoute, chainHTML, buildMolarMass, diagnoseMolarMass, buildPercent, diagnosePercent, buildPercentOf, buildEmpirical, buildMolecular, diagnoseEmpirical,
    buildHydrate, diagnoseHydrate, mmMini, moleTxt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MolesSteps = api;
})(typeof self !== 'undefined' ? self : this);
