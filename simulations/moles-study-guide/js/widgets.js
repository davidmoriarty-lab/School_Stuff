/* widgets.js: the small interactive things inside the lessons. Each takes a container element. */
(function (root) {
  'use strict';
  const C = root.MolesChem, S = root.MolesSteps, D = root.MolesData, P = root.MolesProblems, Dg = root.MolesDiagrams, UI = root.MolesUI;
  const $ = UI.$, $$ = UI.$$, EL = D.ELEMENTS, fm = C.fmtFormula, pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const W = {};

  /* ---------- 5.1 / 5.2: one mole of different things ---------- */
  W.balance = function (el) {
    el.innerHTML = Dg.massBars();
    el.addEventListener('click', (e) => {
      const row = e.target.closest('.mb-row'); if (!row) return;
      $$('.mb-row', el).forEach((r) => r.classList.toggle('sel', r === row));
      const f = row.dataset.f, m = C.molarMass(f), w = C.particleWord(f);
      $('#mbNote', el).innerHTML = '<b>1 mol of ' + fm(f) + '</b> (' + (C.nameOf(f) || f) + ') = ' + S.K('6.022 × 10²³ ' + w) + ' = ' + S.F(m.toFixed(2) + ' g') + '. The number of particles is the same for every row; the mass is not, because each ' + C.particleSingular(w) + ' of ' + fm(f) + ' has its own mass.';
    });
  };

  /* ---------- 5.1: how many atoms? ---------- */
  W.atomCounter = function (el) {
    el.innerHTML = '<div class="card form"><div class="row"><label>Formula of the substance<input type="text" class="ac-f" value="H2O" autocomplete="off" spellcheck="false" autocapitalize="off"></label><label>Amount in moles<input type="text" class="ac-n" value="2.00" inputmode="decimal" autocomplete="off"></label></div>' +
      '<div class="chips">' + ['H2O', 'O2', 'CO2', 'C6H12O6', 'NH3', 'Al2(SO4)3', 'CaCl2'].map((f) => '<button type="button" class="chip" data-f="' + f + '">' + fm(f) + '</button>').join('') + '</div><div class="ac-out"></div></div>';
    const out = $('.ac-out', el), fi = $('.ac-f', el), ni = $('.ac-n', el);
    function go() {
      const f = C.parseFormula(fi.value), n = C.parseNumber(ni.value);
      if (!f.ok) { out.innerHTML = '<p class="err">' + f.error + '</p>'; return; }
      if (!(n > 0)) { out.innerHTML = '<p class="err">Type an amount in moles, like 2.00.</p>'; return; }
      const w = C.particleWord(f), sf = Math.max(2, C.sigFigs(ni.value));
      out.innerHTML = '<p><b>' + S.G(ni.value + ' mol') + ' of ' + fm(f.text) + '</b> contains ' + S.F(C.fmtVal(n * D.NA, sf).html + ' ' + w) + ' (' + S.K('6.022 × 10²³') + ' in every mole).</p>' +
        S.tbl(['Element', 'Atoms in ONE ' + C.particleSingular(w), 'Moles of those atoms', 'Number of atoms'], f.order.map((e) => [e, S.N(f.counts[e]), S.G(ni.value) + ' × ' + S.N(f.counts[e]) + ' = ' + C.fmtVal(n * f.counts[e], sf).html + ' mol', S.F(C.fmtVal(n * f.counts[e] * D.NA, sf).html)])) +
        '<p class="note">Total atoms: ' + C.fmtVal(n * D.NA * f.order.reduce((t, e) => t + f.counts[e], 0), sf).html + '. A subscript counts atoms <i>per particle</i>, so it also counts <i>moles of atoms per mole of particles</i>.</p>';
    }
    el.addEventListener('input', go); el.addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) { fi.value = c.dataset.f; go(); } }); go();
  };

  /* ---------- 5.1: atom, molecule or formula unit? ---------- */
  W.sortGame = function (el) {
    const pool = shuffle([].concat(D.POOL.metals.slice(0, 6), D.POOL.diatomic.slice(0, 3), D.POOL.molecules.slice(0, 7), D.POOL.ionic.slice(0, 8))).slice(0, 10);
    let i = 0, right = 0, done = 0;
    function why(f, w) {
      const p = C.parseFormula(f);
      if (w === 'atoms') return 'A single element written with no subscript is just <b>atoms</b>.';
      if (w === 'formula units') return 'It contains a ' + (p.order.some((e) => EL[e].metal) ? 'metal' : 'polyatomic ion') + ' plus nonmetals: an <b>ionic</b> compound, so its smallest repeating unit is a <b>formula unit</b>.';
      return p.order.length === 1 ? 'A diatomic element: two atoms bonded together make a <b>molecule</b>.' : 'Only nonmetals: a <b>covalent</b> compound, so it is made of <b>molecules</b>.';
    }
    function draw() {
      if (i >= pool.length) { el.innerHTML = '<div class="card"><h3>Done!</h3><p class="score">' + right + ' / ' + done + '</p><p>' + (right === done ? 'Perfect.' : 'Review the three rules above and try again.') + '</p><button class="btn primary" data-a="again">Play again</button></div>'; return; }
      const f = pool[i], w = C.particleWord(f);
      el.innerHTML = '<div class="card"><p class="note">Question ' + (i + 1) + ' of ' + pool.length + '</p><p style="font-size:1.4rem;margin:.2rem 0"><b>' + fm(f) + '</b> <small>' + (C.nameOf(f) || '') + '</small></p><p>What is one particle of this substance called?</p>' +
        '<div class="pc-actions">' + ['atoms', 'molecules', 'formula units'].map((x) => '<button class="btn" data-kind="' + x + '">' + C.particleSingular(x).replace(/^./, (c) => c.toUpperCase()) + '</button>').join('') + '</div><div class="pc-fb" aria-live="polite"></div></div>';
      el.dataset.ans = w;
    }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'again') { pool.splice(0, pool.length, ...shuffle(pool)); i = 0; right = 0; done = 0; draw(); return; }
      if (b.dataset.a === 'next') { i++; draw(); return; }
      if (!b.dataset.kind) return;
      const f = pool[i], w = C.particleWord(f), ok = b.dataset.kind === w; done++; if (ok) right++;
      const fbx = $('.pc-fb', el); fbx.className = 'pc-fb ' + (ok ? 'ok' : 'no'); fbx.innerHTML = '<span class="ic">' + (ok ? '✔' : '✘') + '</span><span>' + (ok ? '<b>Yes.</b> ' : '<b>It is ' + C.particleSingular(w) + 's.</b> ') + why(f, w) + ' <button class="btn" data-a="next">Next ▶</button></span>';
      $$('button[data-kind]', el).forEach((x) => { x.disabled = true; });
      UI.Store.record('p1', ok);
    });
    draw();
  };

  /* ---------- 5.3: which way up does the fraction go? ---------- */
  W.factorDrill = function (el) {
    const kinds = [['g', 'mol'], ['mol', 'g'], ['part', 'mol'], ['mol', 'part'], ['L', 'mol'], ['mol', 'L']];
    let n = 0, right = 0;
    function item() {
      const [u0, u1] = pick(kinds), f = u0 === 'L' || u1 === 'L' ? pick(D.POOL.gases) : pick(D.POOL.molarMass.concat(D.POOL.metals));
      const e = S.edge({ u: u0, s: f }, { u: u1, s: f });
      return { u0, u1, f, e };
    }
    function draw() {
      const it = item(), wantTop = it.e.num;
      const label = (u) => ({ g: 'grams', mol: 'moles', part: C.particleWord(it.f), L: 'liters' }[u]);
      const frac = (x, y, tag) => '<button type="button" class="frac k" data-ok="' + tag + '" style="cursor:pointer;border:0"><span class="num">' + x.vs + ' ' + S.unitHTML(x.u, x.s) + '</span><span class="den">' + y.vs + ' ' + S.unitHTML(y.u, y.s) + '</span></button>';
      const flip = Math.random() < .5, A = frac(it.e.num, it.e.den, '1'), B = frac(it.e.den, it.e.num, '0');
      el.innerHTML = '<div class="card"><p class="note">Round ' + (n + 1) + ' · score ' + right + '/' + n + '</p><p>You have <b>' + S.G('a number of ' + label(it.u0)) + '</b> of ' + fm(it.f) + ' and you want <b>' + S.F(label(it.u1)) + '</b>.<br>Click the conversion factor that <b>cancels</b> ' + S.G(label(it.u0)) + '.</p>' +
        '<div class="chain">' + (flip ? B + '<span class="or">or</span>' + A : A + '<span class="or">or</span>' + B) + '</div><div class="pc-fb" aria-live="polite"></div></div>';
      el.dataset.msg = it.u0 + '>' + it.u1;
    }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('.frac[data-ok]'); if (b) {
        const ok = b.dataset.ok === '1'; n++; if (ok) right++;
        const fbx = $('.pc-fb', el); fbx.className = 'pc-fb ' + (ok ? 'ok' : 'no');
        fbx.innerHTML = '<span class="ic">' + (ok ? '✔' : '✘') + '</span><span>' + (ok ? '<b>Right.</b> The unit you start with is on the <b>bottom</b>, so it cancels.' : '<b>Flip it.</b> The unit you START with must be on the bottom so that it cancels. Look for the unit that is left over on top.') + ' <button class="btn" data-a="next">Next ▶</button></span>';
        $$('.frac[data-ok]', el).forEach((x) => { x.disabled = true; x.style.opacity = x === b ? 1 : .5; });
        return;
      }
      if (e.target.closest('[data-a=next]')) draw();
    });
    draw();
  };

  /* ---------- 5.1: the calculator EE key ---------- */
  W.eeDemo = function (el) {
    el.innerHTML = '<div class="card form"><p>Compute <b>(a × 10<sup>b</sup>) ÷ (c × 10<sup>d</sup>)</b> two ways:</p><div class="row"><label>a<input type="text" class="a" value="3.4"></label><label>b<input type="text" class="b" value="26"></label><label>c<input type="text" class="c" value="6.022"></label><label>d<input type="text" class="d" value="23"></label></div><div class="ee-out"></div></div>';
    const out = $('.ee-out', el);
    function go() {
      const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((k) => parseFloat($('.' + k, el).value));
      if (![a, b, c, d].every(isFinite)) { out.innerHTML = '<p class="err">Type four numbers.</p>'; return; }
      const wrong = (a * Math.pow(10, b)) / c * Math.pow(10, d), right = a * Math.pow(10, b) / (c * Math.pow(10, d));
      out.innerHTML = '<div class="card" style="border-color:var(--bad)"><b class="err">✘ Typing it like it looks</b><div class="keys">' + S.kbd(a) + S.kbd('×') + S.kbd('10') + S.kbd('^') + S.kbd(b) + S.kbd('÷') + S.kbd(c) + S.kbd('×') + S.kbd('10') + S.kbd('^') + S.kbd(d) + S.kbd('=') + '</div><p>The calculator works left to right, so it divides by <b>c</b> and then <i>multiplies</i> by 10<sup>d</sup>: <b>' + C.fmtSci(wrong, 2).html + '</b></p></div>' +
        '<div class="card" style="border-color:var(--good)"><b class="ok">✔ Using the EE key (or ×10ˣ)</b><div class="keys">' + S.kbd(a) + S.kbd('EE') + S.kbd(b) + S.kbd('÷') + S.kbd(c) + S.kbd('EE') + S.kbd(d) + S.kbd('=') + '</div><p>EE makes each number one unit, so the answer is <b>' + C.fmtVal(right, 3).html + '</b></p></div>';
    }
    el.addEventListener('input', go); go();
  };

  /* ---------- 5.6: fixing decimals in a ratio ---------- */
  W.ratioFixer = function (el) {
    const ex = ['1 : 1.5', '1 : 1.33', '1 : 1.5 : 2', '1 : 1.25', '1 : 2.5 : 3', '1 : 3.96', '10.5 : 11 : 1 : 1'];
    el.innerHTML = '<div class="card form"><label>Type your ratio (numbers separated by : or commas)<input type="text" class="rf-in" value="1 : 1.5 : 2" autocomplete="off"></label><div class="chips">' + ex.map((x) => '<button type="button" class="chip" data-v="' + x + '">' + x + '</button>').join('') + '</div><div class="rf-out"></div></div>';
    const out = $('.rf-out', el), inp = $('.rf-in', el);
    function go() {
      const nums = inp.value.split(/[:,\s]+/).filter(Boolean).map(Number);
      if (nums.length < 2 || nums.some((x) => !(x > 0))) { out.innerHTML = '<p class="err">Type at least two positive numbers, like 1 : 1.5.</p>'; return; }
      const mn = Math.min.apply(null, nums), r = nums.map((x) => x / mn); let k = 0;
      for (const m of [1, 2, 3, 4, 5, 6, 7, 8]) if (r.every((x) => Math.abs(x * m - Math.round(x * m)) <= 0.1 + 1e-9)) { k = m; break; }
      if (!k) { out.innerHTML = '<p class="err">No small multiplier makes these whole numbers. Check your mole values.</p>'; return; }
      const fr = r.map((x) => x - Math.floor(x)).filter((x) => x > 0.1 && x < 0.9);
      const why = k === 1 ? 'Every number is already within 0.1 of a whole number, so just <b>round</b>. No multiplying.' : 'A decimal near <b>' + { 2: '.5', 3: '.33 or .67', 4: '.25 or .75', 5: '.2, .4, .6 or .8' }[k] + '</b> (here ' + fr.map((x) => x.toFixed(2)).join(', ') + ') means: multiply <b>everything</b> by <b>' + k + '</b>.';
      out.innerHTML = '<p>' + why + '</p>' + S.tbl(['', ...r.map((x, i) => 'Atom ' + (i + 1))], [['ratio'].concat(r.map((x) => S.K(x.toFixed(2)))), ['× ' + k].concat(r.map((x) => S.N((x * k).toFixed(2)))), ['whole number'].concat(r.map((x) => S.F(String(Math.round(x * k)))))]) + (k > 1 ? '<p class="note">Never round 1.5 up to 2. A ratio of 1 : 1.5 is really 2 : 3.</p>' : '');
    }
    el.addEventListener('input', go); el.addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) { inp.value = c.dataset.v; go(); } }); go();
  };

  /* ---------- 5.4: can I use 22.4 L/mol? ---------- */
  W.canIUse = function (el) {
    const items = [['1.00 mol of <b>CO₂</b> gas at 0 °C and 1 atm', true, 'It is a gas at STP: 22.4 L.'], ['1.00 mol of <b>liquid water</b> at 0 °C and 1 atm', false, 'A liquid is not a gas. 1 mol of liquid water is only about 18 mL.'], ['1.00 mol of <b>sodium metal</b> at STP', false, 'A solid takes up far less than 22.4 L (about 24 mL).'],
      ['1.00 mol of <b>O₂</b> gas at 25 °C and 1 atm', false, '25 °C is not STP (0 °C). The warmer gas takes up about 24.5 L per mole.'], ['0.500 mol of <b>He</b> gas at STP', true, 'Any gas at STP. 0.500 mol × 22.4 L/mol = 11.2 L.'], ['1.00 mol of <b>N₂</b> gas at 0 °C and 2 atm', false, 'The pressure is not 1 atm, so this is not STP.']];
    let order = shuffle(items.map((x, i) => i)), k = 0, right = 0;
    function draw() {
      if (k >= order.length) { el.innerHTML = '<div class="card"><p class="score">' + right + ' / ' + order.length + '</p><p>Remember both conditions: a <b>gas</b>, at <b>STP</b> (0 °C, 1 atm).</p><button class="btn primary" data-a="again">Again</button></div>'; return; }
      const it = items[order[k]];
      el.innerHTML = '<div class="card"><p class="note">Scenario ' + (k + 1) + ' of ' + order.length + '</p><p style="font-size:1.1rem">' + it[0] + '</p><p>Can you use <b>22.4 L/mol</b> here?</p><div class="pc-actions"><button class="btn" data-v="1">Yes</button><button class="btn" data-v="0">No</button></div><div class="pc-fb"></div></div>';
    }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'again') { order = shuffle(order); k = 0; right = 0; draw(); return; }
      if (b.dataset.a === 'next') { k++; draw(); return; }
      if (b.dataset.v === undefined) return;
      const it = items[order[k]], ok = (b.dataset.v === '1') === it[1]; if (ok) right++;
      const f = $('.pc-fb', el); f.className = 'pc-fb ' + (ok ? 'ok' : 'no'); f.innerHTML = '<span class="ic">' + (ok ? '✔' : '✘') + '</span><span>' + it[2] + ' <button class="btn" data-a="next">Next ▶</button></span>';
      $$('button[data-v]', el).forEach((x) => { x.disabled = true; });
    });
    draw();
  };

  /* ---------- 5.5: composition explorer ---------- */
  W.composition = function (el) {
    el.innerHTML = '<div class="card form"><label>Formula<input type="text" class="cx-f" value="Ca(NO3)2" autocomplete="off" spellcheck="false" autocapitalize="off"></label><div class="chips">' + ['H2O', 'H2O2', 'CO2', 'NaCl', 'Fe2O3', 'NH4NO3', 'C6H12O6', 'Al2(SO4)3'].map((f) => '<button type="button" class="chip" data-f="' + f + '">' + fm(f) + '</button>').join('') + '</div><div class="cx-out"></div></div>';
    const out = $('.cx-out', el), inp = $('.cx-f', el);
    function go() {
      const f = C.parseFormula(inp.value); if (!f.ok) { out.innerHTML = '<p class="err">' + f.error + '</p>'; return; }
      const comp = C.composition(f);
      out.innerHTML = Dg.pctBar({ rows: comp.rows.map((r) => ({ el: r.el, pct: r.pct })) }) + S.tbl(['Element', 'Mass in 1 mol (part)', '% of the whole'], comp.rows.map((r) => [r.el, S.N(r.n) + ' × ' + S.K(r.atomic.toFixed(2)) + ' = ' + r.sub.toFixed(2) + ' g', S.F(r.pct.toFixed(2) + ' %')])) + '<p class="note">Whole = molar mass = <b>' + comp.total.toFixed(2) + ' g/mol</b>.</p>';
    }
    el.addEventListener('input', go); el.addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) { inp.value = c.dataset.f; go(); } }); go();
  };

  /* ---------- 5.7: the heating lab ---------- */
  function crucibleSVG(t, look, heating, x) {
    const lerp = (a, b, f) => a + (b - a) * f, hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const a = hex(look.hyd), b = hex(look.anh), col = 'rgb(' + a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',') + ')';
    const steam = heating ? [0, 1, 2, 3, 4].map((i) => '<circle class="vapor" cx="' + (128 + i * 11) + '" cy="70" r="' + (4 + (i % 3)) + '" style="animation-delay:' + i * 0.25 + 's"/>').join('') : '';
    return '<svg viewBox="0 0 300 220" role="img" aria-label="A crucible of hydrate being heated"><style>.vapor{fill:var(--muted);opacity:.0;animation:vaporrise 1.4s infinite}@keyframes vaporrise{0%{opacity:.7;transform:translateY(0)}100%{opacity:0;transform:translateY(-46px)}}</style>' +
      '<rect x="0" y="206" width="300" height="3" fill="var(--line)"/>' +
      '<rect x="128" y="172" width="44" height="34" rx="4" fill="var(--panel2)" stroke="var(--ink2)" stroke-width="2"/>' + (heating ? '<path d="M150 168c-12-8-14-22-4-34 3 8 8 10 10 4 6 10 12 20-6 30z" fill="#f59e2a" stroke="#d9480f" stroke-width="1.5"/><path d="M150 166c-5-4-6-10-2-15 2 4 5 4 6 1 3 5 3 10-4 14z" fill="#ffe066"/>' : '') +
      '<path d="M96 150h108M104 150l-12 56M196 150l12 56M150 150v-0" stroke="var(--ink2)" stroke-width="4" stroke-linecap="round"/><path d="M118 150l32-14 32 14z" fill="none" stroke="var(--k)" stroke-width="3"/>' +
      '<path d="M122 92h56l-8 44h-40z" fill="var(--panel)" stroke="var(--ink2)" stroke-width="3" stroke-linejoin="round"/><path d="M127 100h46l-6 26h-34z" fill="' + col + '" stroke="rgba(0,0,0,.25)" stroke-width="1"/><path d="M127 100q23-10 46 0" fill="' + col + '" stroke="rgba(0,0,0,.25)" stroke-width="1"/>' +
      steam + '</svg>';
  }
  W.hydrateLab = function (el, o) {
    o = o || {};
    const choices = [['CuSO4', 5], ['CoCl2', 6], ['MgSO4', 7], ['BaCl2', 2], ['CaSO4', 2], ['Na2CO3', 10]];
    let sel = choices[0], t = 0, timer = null;
    const empty = 18.42, mHyd = 2.50;
    function data() { const Ms = C.molarMass(sel[0]), Mh = Ms + sel[1] * C.WATER, mAnh = mHyd * Ms / Mh; return { Ms, Mh, mAnh: Math.round(mAnh * 100) / 100, hyd: (empty + mHyd).toFixed(2), anh: (empty + Math.round(mAnh * 100) / 100).toFixed(2) }; }
    function shell() {
      el.innerHTML = '<div class="card"><div class="form"><label>Pick a hydrate to heat<select class="hl-sel">' + choices.map((c, i) => '<option value="' + i + '">' + C.fmtFormulaText(c[0] + '·' + c[1] + 'H2O') + ' (' + C.nameOf(c[0]) + ')</option>').join('') + '</select></label></div>' +
        '<div class="lab"><div class="crucible"></div><div class="hl-side"></div></div><div class="hl-solve"></div></div>';
      draw();
    }
    function draw() {
      const d = data(), look = D.HYDRATE_LOOK[sel[0]], heating = t > 0 && t < 1;
      $('.crucible', el).innerHTML = crucibleSVG(t, look, heating, sel[1]) + '<div class="pc-actions"><button class="btn primary" data-a="heat">' + (t >= 1 ? '↺ Do it again' : heating ? 'Heating…' : '🔥 Heat it') + '</button><label class="note">Heat: <input type="range" class="hl-rng" min="0" max="100" value="' + Math.round(t * 100) + '" aria-label="How long it has been heated"></label></div>';
      const mass = empty + mHyd - t * (mHyd - d.mAnh), waters = Math.round(sel[1] * (1 - t));
      $('.hl-side', el).innerHTML = '<p>Balance reading (crucible + sample):</p><p><span class="readout">' + mass.toFixed(2) + ' g</span></p>' +
        '<p>Color: <b>' + (t < 0.5 ? look.hydName : look.anhName) + '</b></p><p>Water molecules left for every ' + fm(sel[0]) + ' : <b>' + waters + '</b></p><div>' + fm(sel[0]) + ' ' + Array(waters).fill(Dg.water()).join('') + '</div>' +
        S.tbl(['Measurement', 'Mass'], [['Empty crucible', S.G(empty.toFixed(2) + ' g')], ['Crucible + hydrate (before heating)', S.G(d.hyd + ' g')], ['Crucible + solid (after heating)', t >= 1 ? S.G(d.anh + ' g') : '<i>heat until the mass stops changing</i>']]) +
        (t >= 1 ? '<p class="ok">✔ The mass stopped changing: all the water is gone.</p><button class="btn primary" data-a="solve">Find x from my data →</button>' : '');
      if (t < 1) $('.hl-solve', el).innerHTML = '';
    }
    function run() { cancelAnimationFrame(timer); const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; if (reduce) { t = 1; draw(); return; } t = Math.max(0, t); const step = () => { t = Math.min(1, t + 0.008); draw(); if (t < 1) timer = requestAnimationFrame(step); }; timer = requestAnimationFrame(step); }
    el.addEventListener('change', (e) => { if (e.target.classList.contains('hl-sel')) { sel = choices[+e.target.value]; t = 0; cancelAnimationFrame(timer); draw(); } });
    el.addEventListener('input', (e) => { if (e.target.classList.contains('hl-rng')) { cancelAnimationFrame(timer); t = e.target.value / 100; draw(); } });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-a]'); if (!b) return;
      if (b.dataset.a === 'heat') { if (t >= 1) t = 0; run(); }
      else if (b.dataset.a === 'solve') {
        const d = data(), built = S.buildHydrate({ salt: sel[0], crucible: { empty: empty.toFixed(2), hyd: d.hyd, anh: d.anh }, askPct: true });
        const box = $('.hl-solve', el); box.innerHTML = '';
        UI.stepper(box, { steps: built.steps, statement: 'Use the crucible data above to find <b>x</b>, the formula, the name and the percent water.' }, { id: 'ex:5.7:lab' });
        box.scrollIntoView({ block: 'nearest' });
      }
    });
    shell();
  };

  /* ---------- the periodic-table tile (5.2) ---------- */
  W.tile = (sym) => '<div class="ptile"><small>' + EL[sym].z + '</small><b>' + sym + '</b><span>' + EL[sym].mass.toFixed(2) + '</span></div>';

  root.MolesWidgets = W;
  if (typeof module !== 'undefined' && module.exports) module.exports = W;
})(typeof self !== 'undefined' ? self : this);
