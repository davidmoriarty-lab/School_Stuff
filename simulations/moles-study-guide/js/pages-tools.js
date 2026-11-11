/* pages-tools.js: everything that is not a topic: the Start page, the Mole Map, the calculators,
 * Practice (quiz me) and the Cheat Sheet. Also assembles MolesPages for the router. */
(function (root) {
  'use strict';
  const C = root.MolesChem, S = root.MolesSteps, P = root.MolesProblems, Dg = root.MolesDiagrams, UI = root.MolesUI, W = root.MolesWidgets, B = root.MolesBank, D = root.MolesData, L = root.MolesLearn;
  const T = S.T, fm = C.fmtFormula, $ = UI.$, $$ = UI.$$, Store = UI.Store, EL = D.ELEMENTS;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const bar = (right, total) => { const p = total ? right / total : 0; return '<div class="bar-track"><i class="' + (p < 0.5 ? 'low' : p < 0.8 ? 'mid' : '') + '" style="width:' + Math.round(p * 100) + '%"></i></div>'; };

  /* ============================================================================== */
  /*  The interactive mole map                                                        */
  /* ============================================================================== */
  const UNITNAME = { part: 'particles', mol: 'moles', g: 'grams', L: 'liters (gas at STP)' };
  function makeConv(from, to, bridge) {
    let f, el = null;
    if (bridge) { const [cf, e] = pick(D.POOL.insideCompound); f = cf; el = e; } else f = (from === 'L' || to === 'L') ? pick(D.POOL.gases) : pick(D.POOL.molarMass.concat(D.POOL.metals));
    const toF = el || f, pw = C.particleWord(toF), fromPw = C.particleWord(f);
    const v = from === 'part' ? P.randSci(3, 22, 25) : from === 'L' ? P.randSf(5, 500, 3) : from === 'g' ? P.randSf(5, 250, 3) : P.randSf(0.2, 9.99, 3);
    const gtxt = from === 'part' ? C.fmtGiven(v).html + ' ' + fromPw : from === 'mol' ? v + ' mol' : from === 'g' ? v + ' g' : v + ' L';
    const ftxt = { part: pw, mol: 'moles', g: 'grams', L: 'liters' }[to];
    const q = 'Convert {g|' + gtxt + '} of ' + (C.nameOf(f) ? C.nameOf(f) + ', ' : '') + '[[' + f + ']] to {f|' + ftxt + (el ? ' of ' + EL[el].name.toLowerCase() : '') + '}.';
    const skill = bridge ? 'inside' : (from === 'L' || to === 'L') ? 'stp' : 'conv';
    return P.convProblem(skill, { given: { v, unit: from, f }, to: { unit: to, f: toF } }, q);
  }
  W.mapExplorer = function (el, o) {
    o = o || {}; let from = null, to = null, bridge = false;
    el.innerHTML = '<div class="card"><div class="me-map"></div><div class="me-info"></div></div><div class="me-practice"></div>';
    const mapBox = $('.me-map', el), info = $('.me-info', el), prac = $('.me-practice', el);
    function nodes() { if (!from || !to || from === to) return null; const seq = from === 'mol' ? ['mol', to] : to === 'mol' ? [from, 'mol'] : [from, 'mol', to]; return seq; }
    function draw() {
      const seq = nodes(), path = seq ? seq.slice() : [];
      if (seq && bridge) { const i = path.lastIndexOf('mol'); path.splice(i + 1, 0, 'el'); if (to !== 'mol') path.splice(i + 2, 0, 'mol'); else path.splice(i + 2, 0, 'mol'); }
      mapBox.innerHTML = Dg.moleMap({ path: seq && bridge ? ['_'].slice(1).concat(pathWithBridge(seq)) : path, ratio: bridge, interactive: true, element: bridge ? 'of one element' : null });
      let hint;
      if (!from) hint = 'Click the box you are <b>starting from</b>.'; else if (!to) hint = 'Now click the box you want to <b>end at</b>.'; else if (from === to) hint = 'Pick two different boxes.';
      else { const ed = seq.length - 1; hint = '<p class="path">' + seq.map((u, i) => (i === 0 ? S.G(UNITNAME[u]) : i === seq.length - 1 ? S.F(UNITNAME[u]) : S.K(UNITNAME[u]))).join(' <b>→</b> ') + '</p><p>' + (ed === 2 ? 'Two factors: <b>' + ['part', 'g', 'L'].includes(from) + '</b>'.replace('true', 'always through moles') : 'One factor.') + '</p>'; hint = '<p class="path">' + seq.map((u, i) => (i === 0 ? S.G(UNITNAME[u]) : i === seq.length - 1 ? S.F(UNITNAME[u]) : S.K(UNITNAME[u]))).join(' <b>→</b> ') + '</p>' + factorList(seq, bridge); }
      info.innerHTML = '<div style="margin-top:.6rem">' + hint + '</div><label class="chk" style="margin-top:.4rem"><input type="checkbox" class="me-br"' + (bridge ? ' checked' : '') + '> The question asks about <b>one element inside</b> the compound (adds the subscript step)</label>' +
        '<div class="pc-actions">' + (nodes() ? '<button class="btn primary" data-a="prac">Practice this path ▶</button>' : '') + '<button class="btn ghost" data-a="reset">Clear</button></div>';
    }
    function pathWithBridge(seq) { const out = []; let done = false; seq.forEach((u) => { out.push(u); if (u === 'mol' && !done) { out.push('el'); out.push('mol'); done = true; } }); return out; }
    function factorList(seq, br) {
      const items = [];
      for (let i = 0; i + 1 < seq.length; i++) {
        const a = seq[i], b = seq[i + 1];
        items.push(({ 'part>mol': '÷ 6.022 × 10²³ (Avogadro)', 'mol>part': '× 6.022 × 10²³ (Avogadro)', 'g>mol': '÷ molar mass', 'mol>g': '× molar mass', 'L>mol': '÷ 22.4 L/mol', 'mol>L': '× 22.4 L/mol' })[a + '>' + b]);
        if (br && b === 'mol' && !items.some((x) => /subscript/.test(x))) items.splice(items.length, 0, 'compound → element: × subscript');
      }
      if (br && !items.some((x) => /subscript/.test(x))) items.push('compound → element: × subscript');
      return '<ol>' + items.map((x) => '<li>' + S.K(x) + '</li>').join('') + '</ol>';
    }
    el.addEventListener('click', (e) => {
      const n = e.target.closest('.mm-node[data-n]'), b = e.target.closest('[data-a]');
      if (n && n.dataset.n !== 'el') { const k = n.dataset.n; if (!from || (from && to)) { from = k; to = null; } else to = k; draw(); }
      else if (b && b.dataset.a === 'reset') { from = to = null; prac.innerHTML = ''; draw(); }
      else if (b && b.dataset.a === 'prac') { prac.innerHTML = ''; const box = document.createElement('div'); box.style.marginTop = '.8rem'; prac.appendChild(box); UI.problemCard(box, makeConv(from, to, bridge), { regen: () => makeConv(from, to, bridge) }); }
    });
    el.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.mm-node[data-n]')) { e.preventDefault(); e.target.click(); } });
    el.addEventListener('change', (e) => { if (e.target.classList.contains('me-br')) { bridge = e.target.checked; draw(); } });
    draw();
  };

  /* ============================================================================== */
  /*  Calculators                                                                     */
  /* ============================================================================== */
  const solveBox = (el, built, statement, banner) => {
    el.innerHTML = (banner ? '<div class="card" style="border-color:var(--f)">' + banner + '</div>' : '') + '<div class="sb"></div>';
    UI.stepper($('.sb', el), { steps: built.steps, statement }, { all: true });
  };
  const err = (el, m) => { el.innerHTML = '<p class="err">' + m + '</p>'; };

  W.tool_mm = function (el) {
    el.innerHTML = '<div class="card form"><label>Type a formula (use parentheses and a dot for hydrates, like Al2(SO4)3 or CuSO4.5H2O)<input type="text" class="t-f" value="Al2(SO4)3" autocomplete="off" spellcheck="false" autocapitalize="off"></label><div class="chips">' + ['H2O', 'Mg(OH)2', 'Ca(NO3)2', '(NH4)3PO4', 'C6H12O6', 'Al2(SO4)3', 'CuSO4·5H2O'].map((f) => '<button type="button" class="chip" data-f="' + f + '">' + fm(f) + '</button>').join('') + '</div></div><div class="t-out" style="margin-top:.7rem"></div>';
    const inp = $('.t-f', el), out = $('.t-out', el);
    function go() { const f = C.parseFormula(inp.value); if (!f.ok) { err(out, f.error); return; } const b = S.buildMolarMass({ f: inp.value }); solveBox(out, b, 'Find the <span class="r f">molar mass</span> of ' + fm(f.text) + '.', '<b>Molar mass of ' + fm(f.text) + ' = ' + S.F(b.answer.text + ' g/mol') + '</b>'); }
    el.addEventListener('input', (e) => { if (e.target === inp) go(); }); el.addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) { inp.value = c.dataset.f; go(); } }); go();
  };

  /* ============================================================================== */
  /*  Pages                                                                           */
  /* ============================================================================== */
  const pageHead = (title, sub) => '<header class="t-head"><span class="t-num" aria-hidden="true">★</span><div><h1>' + title + '</h1><p>' + sub + '</p></div></header>';
  const mountAll = (el) => L.mountWidgets(el);

  function skillBars() {
    const sk = Store.data.skills;
    return '<div class="bars">' + P.SKILL_LIST.map((k) => { const s = sk[k] || { right: 0, total: 0 }; return '<div class="bar-row"><span><a href="#/t/' + P.SKILLS[k].topic + '">' + P.SKILLS[k].topic + '</a> ' + P.SKILLS[k].label + '</span>' + bar(s.right, s.total) + '<span>' + (s.total ? s.right + '/' + s.total : '—') + '</span></div>'; }).join('') + '</div><p class="note">Counts problems you got right on the <b>first try</b> without opening the solution. Weak spots (red) are where to practice next.</p>';
  }

  function startPage() {
    const html = '<div class="hero"><h1>Moles Study Guide</h1><p>Everything in Honors Chemistry Unit 5: the mole, molar mass, conversions, gases at STP, percent composition, formulas and hydrates. Learn it, watch it solved step by step, practice it, and quiz yourself.</p></div>' +
      '<div class="cards3"><a class="cardlink" href="#/t/5.1"><h3>1. Learn it</h3><p>Seven topics with pictures, worked examples and the mistakes to avoid.</p></a><a class="cardlink" href="#/practice"><h3>2. Practice it</h3><p>Unlimited problems with hints, instant checking and a note on <i>why</i> a wrong answer is wrong.</p></a><a class="cardlink" href="#/practice"><h3>3. Test yourself</h3><p>Build a quiz of calculations and multiple choice from a huge bank of questions, with no repeats.</p></a></div>' +
      '<div class="sec"><h2>Not sure where to start? Take the 7-question checkup</h2><div class="checkup"></div></div>' +
      '<div class="sec"><h2>How to read every problem</h2><p>Every worked example uses the same four colors, so you can see the <b>job</b> of each number at a glance:</p><div class="card"><div class="legend-list" style="margin:0"><div><span class="r g">given</span><span>what you <b>start with</b></span></div><div><span class="r f">find</span><span>what you are <b>asked for</b>, and the final answer</span></div><div><span class="r k">looked up</span><span>a number from the periodic table, or a <b>conversion factor</b></span></div><div><span class="r n">count</span><span>a <b>subscript</b> or number of atoms</span></div><div><span class="u cx">canceled unit</span><span>units that cancel. What is left should be the unit you want.</span></div></div></div></div>' +
      '<div class="sec"><h2>If you have 6 days before the test</h2><div class="card plan"><div><b>Day 1</b><span>5.1 The mole + 5.2 Molar mass</span></div><div><b>Day 2</b><span>5.3 Mole conversions (draw the mole map from memory)</span></div><div><b>Day 3</b><span>5.4 Gas volume at STP</span></div><div><b>Days 4–5</b><span>5.5 Percent composition + 5.6 Formulas</span></div><div><b>Day 6</b><span>5.7 Hydrates, then a mixed quiz on every topic</span></div></div></div>' +
      '<div class="sec"><h2>Your progress</h2><div class="card prog">' + skillBars() + '<p><button class="btn ghost" id="resetProg">Reset my progress</button></p></div></div>';
    return { title: 'Start', html, mount(el) {
      const box = $('.checkup', el), saved = Store.data.checkup;
      let items = [], picks = {};
      function intro() {
        const last = saved ? '<p class="note">Last time: <b>' + saved.score + ' / 7</b>' + (saved.missed && saved.missed.length ? '. Topics to study: ' + [...new Set(saved.missed)].join(', ') : '') + '.</p>' : '';
        box.innerHTML = '<div class="card"><p>One question from each topic, about two minutes. No grades, no pressure: it just points you to what to study first.</p>' + last + '<button class="btn primary" data-a="start">' + (saved ? 'Take it again' : 'Start the checkup') + '</button></div>';
      }
      function draw() {
        box.innerHTML = '<div class="cq"></div><div class="pc-actions"><button class="btn primary" data-a="done">See my results</button></div><div class="cres"></div>';
        items.forEach((q, i) => { const d = document.createElement('div'); d.style.margin = '.7rem 0'; $('.cq', box).appendChild(d); UI.mc(d, q, { mode: 'test', num: i + 1, onPick: (c) => { picks[q.id] = c; } }); });
      }
      function results() {
        const missed = items.filter((q) => picks[q.id] !== q.answer), right = items.length - missed.length;
        Store.data.checkup = { score: right, missed: missed.map((q) => q.topic), at: Date.now() }; Store.save();
        $('.cres', box).innerHTML = '<div class="card"><p class="score">' + right + ' / 7</p>' + (missed.length ? '<p>Start with these topics:</p><div class="chips">' + [...new Set(missed.map((q) => q.topic))].map((t) => '<a class="chip" style="text-decoration:none;color:inherit" href="#/t/' + t + '">' + t + ' ' + L.TOPICS.find((x) => x.id === t).short + '</a>').join('') + '</div>' : '<p>Great start! Head to <a href="#/practice">Practice</a> and build a mixed quiz.</p>') + '</div>';
      }
      intro();
      box.addEventListener('click', (e) => { if (e.target.closest('[data-a=start]')) { picks = {}; items = L.TOPICS.map((t) => B.forTopic(t.id, 1, new Set())[0]); draw(); } else if (e.target.closest('[data-a=done]')) results(); });
      $('#resetProg', el).addEventListener('click', () => { if (confirm('Erase all of your saved progress on this device?')) { Store.reset(); location.reload(); } });
    } };
  }

  function mapPage() {
    const conversions = [['Particles → moles', '÷ 6.022 × 10²³', '5.1'], ['Moles → particles', '× 6.022 × 10²³', '5.1'], ['Grams → moles', '÷ molar mass', '5.3'], ['Moles → grams', '× molar mass', '5.3'], ['Liters (gas, STP) → moles', '÷ 22.4 L/mol', '5.4'], ['Moles → liters (gas, STP)', '× 22.4 L/mol', '5.4'], ['Moles of compound → moles of one element in it', '× subscript', '5.3']];
    const html = pageHead('The Mole Map', 'Every conversion in Unit 5 goes through the moles box') + '<div class="sec">' + '<div class="big"><b>BIG IDEA</b><p>Moles are the <b>hub</b>. To get from any box to any other box, go <b>to moles</b> first, then <b>out</b> to where you want to be. You never skip the middle.</p></div>' +
      '<h3>Explore it</h3>' + '<div data-w="mapExplorer"></div>' + '<h3>Every arrow in one table</h3><div class="tablewrap">' + S.tbl(['Conversion', 'Multiply or divide by', 'Learn it in'], conversions.map((c) => [c[0], S.K(c[1]), '<a href="#/t/' + c[2] + '">' + c[2] + '</a>'])) + '</div>' +
      '<h3>Drill: which way up?</h3><div data-w="factorDrill"></div>' +
      '<h3>Which factor? (from the packet’s extra practice)</h3><div class="card factorq"></div></div>';
    return { title: 'The Mole Map', html, mount(el) {
      mountAll(el);
      const q = [['Grams of a compound to moles of the compound.', 1], ['Moles of molecules to the number of molecules.', 3], ['Liters of a gas at STP to moles of the gas.', 5], ['Percent composition to grams (to start an empirical formula).', 6]];
      const opts = ['× molar mass', '÷ molar mass', '× 6.022 × 10²³', '÷ 6.022 × 10²³', '× 22.4 L/mol', '÷ 22.4 L/mol', 'assume 100 g: each % becomes grams'];
      const box = $('.factorq', el); const key = [1, 2, 5, 6];
      box.innerHTML = q.map((x, i) => '<div class="test-q"><b>' + 'abcd'[i] + '.</b> ' + x[0] + '<div class="chips" style="margin-top:.3rem">' + opts.map((o, k) => '<button type="button" class="chip" data-i="' + i + '" data-k="' + k + '">' + o + '</button>').join('') + '</div><div class="pc-fb" aria-live="polite"></div></div>').join('');
      box.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; const i = +b.dataset.i, ok = +b.dataset.k === [1, 2, 5, 6][i] || (i === 1 && +b.dataset.k === 2); const f = b.closest('.test-q').querySelector('.pc-fb'); f.className = 'pc-fb ' + (ok ? 'ok' : 'no'); f.innerHTML = '<span class="ic">' + (ok ? '✔' : '✘') + '</span><span>' + (ok ? 'Right.' : 'Not that one. Think about which unit must cancel.') + '</span>'; });
    } };
  }


  /* ---------- practice: quiz me ---------- */
  const labelOfItem = (it) => (it.kind === 'concept' ? { label: 'Concept questions', topic: it.topic } : { label: P.SKILLS[it.skill].label, topic: P.SKILLS[it.skill].topic });
  function practicePage() {
    const topics = L.TOPICS, info = B.info();
    const html = pageHead('Practice problems', 'Build your own quiz. Every question has hints or an explanation of each wrong choice') + '<div class="sec"><h2>Where you stand</h2><div class="card">' + skillBars() + '</div></div>' +
      '<div class="sec"><h2>Quiz me</h2><div class="card form"><div><b>Topics to include</b><div class="chips pq-topics" style="margin-top:.3rem">' + topics.map((t) => '<button type="button" class="chip" aria-pressed="true" data-t="' + t.id + '">' + t.id + ' ' + t.short + '</button>').join('') + '</div></div>' +
      '<div class="row"><label>Question type<select class="pq-k"><option value="both">Both, mixed</option><option value="calc">Calculations (type your answer)</option><option value="mc">Multiple choice</option></select></label><label>How many questions?<select class="pq-n"><option value="5">5</option><option value="10" selected>10</option><option value="20">20</option><option value="30">30</option></select></label><label>Order<select class="pq-o"><option value="mix">Mixed up</option><option value="weak">Focus on my weak spots</option></select></label></div><button class="btn primary pq-go">Start quiz ▶</button></div><div class="pq-area" style="margin-top:1rem"></div>' +
      '<p class="note">The question bank: ' + info.concept + ' hand-written concept questions, ' + info.packet + ' problems from your packet, and a generator for ' + info.skills + ' problem types that mixes ' + info.compounds + ' compounds, ' + info.hydrates + ' hydrates and ' + info.formulas + ' formulas with random numbers. In a test of 180,000 generated questions, more than 100,000 were different, so you will rarely see one twice. Questions you have already seen in a quiz are skipped.</p></div>';
    return { title: 'Practice', html, mount(el) {
      const area = $('.pq-area', el); const on = () => $$('.pq-topics .chip', el).filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.t);
      el.addEventListener('click', (e) => { const c = e.target.closest('.pq-topics .chip'); if (c) c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); });
      const sessionSeen = new Set(), sessionStatements = new Set();
      $('.pq-go', el).addEventListener('click', () => {
        const ts = on(); if (!ts.length) { area.innerHTML = '<p class="err">Pick at least one topic.</p>'; return; }
        const kind = $('.pq-k', el).value, n = +$('.pq-n', el).value, weak = $('.pq-o', el).value === 'weak';
        let skills = P.SKILL_LIST.filter((k) => ts.indexOf(P.SKILLS[k].topic) >= 0);
        if (weak) skills = skills.slice().sort((a, b) => { const f = (k) => { const s = Store.data.skills[k]; return s && s.total ? s.right / s.total : 0.4; }; return f(a) - f(b); });
        const pickSkill = (i) => (weak ? skills[Math.min(skills.length - 1, Math.floor(Math.random() * Math.max(1, Math.ceil(skills.length / 2))))] : skills[i % skills.length]);
        /* build the whole quiz up front; no question repeats within it (or across quizzes in this visit) */
        const items = [];
        for (let i = 0; i < n; i++) {
          const wantMC = kind === 'mc' || (kind === 'both' && Math.random() < 0.5);
          let it = null;
          for (let g = 0; g < 30 && !it; g++) {
            if (wantMC) { const q = B.randomMC({ topics: ts, exclude: sessionSeen, conceptShare: 0.4 }); if (q) it = { kind: q.concept ? 'concept' : 'mc', skill: q.skill, topic: q.topic, mc: q }; }
            else { const sk = pickSkill(i), prob = P.generate(sk), key = prob.statement.replace(/<[^>]+>/g, ''); if (!sessionStatements.has(key)) { sessionStatements.add(key); it = { kind: 'calc', skill: sk, topic: P.SKILLS[sk].topic, prob }; } }
          }
          if (!it) { const sk = pickSkill(i); it = { kind: 'calc', skill: sk, topic: P.SKILLS[sk].topic, prob: P.generate(sk) }; }
          items.push(it);
        }
        if (!weak) for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
        let i = 0, right = 0; const cur = { counted: false }; const miss = {}, tally = {};
        const count = (it, ok) => { const l = labelOfItem(it), k = l.label; tally[k] = tally[k] || { r: 0, n: 0, topic: l.topic }; tally[k].n++; if (ok) { tally[k].r++; right++; } else miss[k] = l.topic; };
        function next() {
          if (i >= items.length) {
            area.innerHTML = '<div class="card"><h3>Quiz complete</h3><p class="score">' + right + ' / ' + items.length + '</p><p>first-try correct</p>' + S.tbl(['Skill', 'Right', 'Of'], Object.keys(tally).map((k) => [k, tally[k].r, tally[k].n])) + (Object.keys(miss).length ? '<p>Review: ' + Object.keys(miss).map((k) => '<a href="#/t/' + miss[k] + '">' + miss[k] + ' ' + k + '</a>').join(', ') + '</p>' : '<p>Nothing missed. Try another quiz with different topics!</p>') + '<button class="btn primary" data-a="again">New quiz</button></div>';
            Store.data.quiz.push({ at: Date.now(), right, n: items.length }); Store.save(); return;
          }
          const it = items[i];
          area.innerHTML = '<p class="note">Question ' + (i + 1) + ' of ' + items.length + ' · ' + (it.kind === 'calc' ? 'calculation' : 'multiple choice') + '</p><div class="pq-card"></div><div class="pc-actions"><button class="btn primary" data-a="next" disabled>' + (i === items.length - 1 ? 'Finish' : 'Next question ▶') + '</button><button class="btn ghost" data-a="skip">Skip</button></div>';
          cur.counted = false; const box = $('.pq-card', area), done = (ok) => { if (cur.counted) return; cur.counted = true; count(it, ok); $('[data-a=next]', area).disabled = false; };
          if (it.kind === 'calc') UI.problemCard(box, it.prob, { onFinal: done });
          else UI.mc(box, it.mc, { onAnswer: (c, tries) => done(c === it.mc.answer && tries === 1) });
        }
        area.onclick = (e) => { const b = e.target.closest('[data-a]'); if (!b) return; if (b.dataset.a === 'next' || b.dataset.a === 'skip') { if (!cur.counted) count(items[i], false); i++; next(); } else if (b.dataset.a === 'again') { area.innerHTML = ''; area.onclick = null; $('.pq-go', el).scrollIntoView({ block: 'center' }); } };
        next();
      });
    } };
  }

  /* ---------- the cheat sheet ---------- */
  function cheatPage() {
    const rows = (a) => a.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('');
    const html = pageHead('Cheat sheet', 'Everything for Unit 5 on one page (print it with Ctrl + P)') + '<div class="cheat sec"><p class="noprint"><button class="btn primary" onclick="window.print()">Print this page</button></p>' +
      '<h3>The mole map</h3>' + Dg.moleMap({ path: [], ratio: true }) +
      '<h3>Constants</h3><table><tr><th>Avogadro’s number</th><td>6.022 × 10²³ particles/mol</td><th>Molar volume at STP</th><td>22.4 L/mol (gas, 0 °C, 1 atm)</td></tr><tr><th>Molar mass of water</th><td>18.02 g/mol</td><th>Atomic masses</th><td>use two decimals from the periodic table</td></tr></table>' +
      '<h3>Which particle?</h3><table><tr><th>Atoms</th><td>single elements (Al, Mg, He)</td><th>Molecules</th><td>nonmetal compounds and diatomics (H₂O, O₂)</td><th>Formula units</th><td>ionic compounds (NaCl)</td></tr></table>' +
      '<h3>Diatomic elements</h3><p>H₂ N₂ O₂ F₂ Cl₂ Br₂ I₂ &nbsp; (<b>H</b>ave <b>N</b>o <b>F</b>ear <b>O</b>f <b>I</b>ce <b>Cl</b>old <b>Br</b>ew)</p>' +
      '<h3>The methods</h3><table><tr><th>Molar mass</th><td>list elements → count atoms (parentheses multiply!) → × atomic mass → add (g/mol)</td></tr><tr><th>Mole conversion</th><td>given → moles → answer; units cancel; one element inside a compound uses the subscript as a mole ratio</td></tr><tr><th>Gas at STP</th><td>moles ↔ liters with 22.4 L/mol (gases at STP only)</td></tr><tr><th>% composition</th><td>(atomic mass × subscript) ÷ molar mass × 100; totals 100 %</td></tr><tr><th>Empirical formula</th><td>% → g (assume 100 g) → mol → ÷ smallest → × 2, 3, 4 if needed (.5 → 2, .33 → 3, .25 → 4)</td></tr><tr><th>Molecular formula</th><td>n = molar mass ÷ empirical mass; multiply every subscript by n</td></tr><tr><th>Hydrate</th><td>water = hydrate − anhydrous; both to moles; x = mol H₂O ÷ mol salt; name = salt + prefix + hydrate</td></tr></table>' +
      '<h3>Hydrate prefixes</h3><p>' + D.PREFIX.map((p, i) => (i + 1) + ' = ' + p + '-').join(' &nbsp; ') + '</p>' +
      '<h3>Sig figs</h3><p>Nonzero digits and zeros between them count. Leading zeros never count. Trailing zeros count only with a decimal point. Answer = fewest sig figs in the <i>given</i> data. Exact numbers (1 mol, subscripts) never limit.</p>' +
      '<h3>Top mistakes</h3><ul><li>Forgetting to multiply inside parentheses (Mg(OH)₂)</li><li>Using 14.01 for N₂ instead of 28.02</li><li>Skipping moles (grams → molecules needs two factors)</li><li>Multiplying when you should divide: let the units cancel</li><li>Using 22.4 L/mol for a liquid, a solid, or 25 °C</li><li>Using ONE atom’s mass in percent composition</li><li>Rounding 1.5 to 2 instead of multiplying everything by 2</li><li>Dividing grams of water by grams of salt instead of comparing moles</li></ul>' +
      '<h3>Color key</h3><p>' + UI.legendInline() + '</p></div>';
    return { title: 'Cheat sheet', html, mount() {} };
  }

  /* ---------- the page table, search index, and the router entry ---------- */
  function searchIndex() {
    const base = [{ title: 'The Mole Map', keys: 'mole map conversion path hub', href: '#/map', where: 'Page' }, { title: 'Practice problems: quiz me', keys: 'practice quiz problems hints weak spots', href: '#/practice', where: 'Page' }, { title: 'Cheat sheet', keys: 'cheat sheet formulas summary print', href: '#/cheat', where: 'Page' }, { title: 'Scientific notation and the EE key', keys: 'ee key scientific notation calculator exponent', href: '#/t/5.1/method', where: 'Topic 5.1' }, { title: 'Parentheses in formulas', keys: 'parentheses subscript outside multiply', href: '#/t/5.2/learn', where: 'Topic 5.2' }, { title: 'Diatomic elements', keys: 'diatomic H2 N2 O2 F2 Cl2 Br2 I2', href: '#/t/5.2/learn', where: 'Topic 5.2' }, { title: 'Naming hydrates', keys: 'hydrate name prefix penta hexa roman numeral', href: '#/t/5.7/learn', where: 'Topic 5.7' }, { title: 'Color key', keys: 'color key legend given find', href: '#/', where: 'Start' }];
    return base.concat(L.searchItems());
  }
  const PAGES = { start: startPage, map: mapPage, practice: practicePage, cheat: cheatPage };
  function render(r) {
    if (/^5\.\d$/.test(r.id) && L.TOPICS.some((t) => t.id === r.id)) return L.topicPage(r.id);
    const f = PAGES[r.id] || startPage; const v = f(r.sec); const m = v.mount; v.mount = (el) => { mountAll(el); if (m) m(el); }; return v;
  }
  root.MolesPages = { TOPICS: L.TOPICS, render, searchIndex };
})(typeof self !== 'undefined' ? self : this);
