/* ui.js: reusable interface pieces.
 *
 *   Store            progress, settings (localStorage, with an in-memory fallback)
 *   stepper          a worked example that reveals one colour-coded step at a time
 *   problemCard      a practice problem with answer checking and a three-level hint ladder
 *   mc               a multiple-choice question with an explanation for every choice
 *   legendInline     the four highlight colours, as a one-line key
 */
(function (root) {
  'use strict';
  const C = root.MolesChem, S = root.MolesSteps, P = root.MolesProblems, Dg = root.MolesDiagrams;
  const T = S.T;
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  let uid = 0; const nextId = (p) => (p || 'u') + (++uid);

  /* ---------- progress and settings ---------- */
  const KEY = 'moles-study-guide-v1';
  const blank = () => ({ visited: {}, done: {}, skills: {}, mc: {}, quiz: [], test: { best: null, history: [] }, checkup: null, settings: {} });
  let mem = blank(), listeners = [];
  try { const raw = localStorage.getItem(KEY); if (raw) mem = Object.assign(blank(), JSON.parse(raw)); } catch (e) { /* private mode: keep going in memory */ }
  const Store = {
    get data() { return mem; },
    save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* ignore */ } listeners.forEach((f) => f()); },
    on(f) { listeners.push(f); },
    visit(id) { if (!mem.visited[id]) { mem.visited[id] = Date.now(); this.save(); } },
    done(id) { if (!mem.done[id]) { mem.done[id] = 1; this.save(); } },
    record(skill, ok) { const s = mem.skills[skill] || (mem.skills[skill] = { right: 0, total: 0 }); s.total++; if (ok) s.right++; this.save(); },
    mc(id, ok) { if (mem.mc[id] === undefined) { mem.mc[id] = ok ? 1 : 0; this.save(); } },
    setting(k, v) { if (v === undefined) return mem.settings[k]; mem.settings[k] = v; this.save(); },
    reset() { mem = blank(); this.save(); },
    /* per-topic checklist: worked an example, practised, answered the quick check */
    topic(id) {
      const skills = Object.keys(P.SKILLS).filter((k) => P.SKILLS[k].topic === id);
      const attempts = skills.reduce((t, k) => t + (mem.skills[k] ? mem.skills[k].total : 0), 0);
      const quick = Object.keys(mem.mc).filter((k) => k.indexOf('q' + id.replace('.', '')) === 0).length;
      return { examples: Object.keys(mem.done).some((k) => k.indexOf('ex:' + id) === 0), practice: attempts >= 3, check: quick >= 2, visited: !!mem.visited[id] };
    }
  };

  /* ---------- the colour key ---------- */
  const legendInline = () => '<div class="legend-inline" aria-label="Color key">' + S.G('given') + ' ' + S.F('find / answer') + ' ' + S.K('looked-up number or conversion factor') + ' ' + S.N('count or subscript') + ' <span class="u cx">canceled unit</span></div>';

  /* ---------- the stepper ---------- */
  const stepHTML = (st, i, isNew) => '<li class="st-step stage-' + st.stage + (isNew ? ' new' : '') + '"><div class="st-num" aria-hidden="true">' + (i + 1) + '</div><div class="st-body"><h4>' + st.title + '</h4>' +
    (st.why ? '<p class="st-why">' + st.why + '</p>' : '') + (st.diagram ? Dg.render(st.diagram) : '') + '<div class="st-main">' + st.html + '</div></div></li>';

  function stepper(el, problem, o) {
    o = o || {};
    const steps = problem.steps; let shown = o.all ? steps.length : 1;
    el.innerHTML = '<div class="stepper"><div class="st-q">' + (o.noLegend ? '' : legendInline()) + (problem.statement ? '<div class="st-statement">' + problem.statement + '</div>' : '') + '</div><ol class="st-list"></ol>' +
      '<div class="st-ctl"><button type="button" class="btn" data-a="back">◀ Back</button><button type="button" class="btn primary" data-a="next">Next step ▶</button><button type="button" class="btn" data-a="all">Show all steps</button><button type="button" class="btn ghost" data-a="restart">↺ Restart</button><span class="st-count" aria-live="polite"></span></div></div>';
    const list = $('.st-list', el), count = $('.st-count', el), next = $('[data-a=next]', el), back = $('[data-a=back]', el), all = $('[data-a=all]', el);
    function draw(newIdx) {
      list.innerHTML = steps.slice(0, shown).map((st, i) => stepHTML(st, i, i === newIdx)).join('');
      count.textContent = 'Step ' + shown + ' of ' + steps.length;
      next.disabled = shown >= steps.length; back.disabled = shown <= 1; all.disabled = shown >= steps.length;
      next.textContent = shown >= steps.length - 1 ? (shown >= steps.length ? 'All steps shown ✔' : 'Last step ▶') : 'Next step ▶';
      if (shown >= steps.length && o.id) Store.done(o.id);
      if (shown >= steps.length && o.onDone) o.onDone();
    }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-a]'); if (!b || !el.contains(b)) return;
      const a = b.dataset.a;
      if (a === 'next' && shown < steps.length) { shown++; draw(shown - 1); const last = list.lastElementChild; if (last && last.getBoundingClientRect().bottom > window.innerHeight - 70) last.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' }); }
      else if (a === 'back' && shown > 1) { shown--; draw(-1); }
      else if (a === 'all') { shown = steps.length; draw(-1); }
      else if (a === 'restart') { shown = 1; draw(0); }
    });
    draw(0);
    return { show: (n) => { shown = Math.max(1, Math.min(steps.length, n)); draw(-1); } };
  }

  /* A read-only list of steps (used inside hints) */
  const stepList = (steps) => '<ol class="st-list static">' + steps.map((s, i) => stepHTML(s, i, false)).join('') + '</ol>';

  /* ---------- the practice card ---------- */
  const SKILL_NAME = (k) => P.SKILLS[k] ? P.SKILLS[k].label : k;
  function problemCard(el, problem, o) {
    o = o || {};
    let hint = 0, finalized = false, solved = false, wrong = 0;
    const id = nextId('pc');
    function finalize(correct) { if (finalized) return; finalized = true; Store.record(problem.skill, correct); if (o.onFinal) o.onFinal(correct, problem); }
    function build() {
      const p = problem;
      let input;
      if (p.kind === 'multi') input = '<div class="pc-multi">' + p.built.rows.map((r, i) => '<label class="pc-mrow"><span class="pc-el">' + r.el + '</span><input class="pc-in" data-i="' + i + '" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="Percent ' + r.el + '"><span class="pc-unit">%</span><span class="pc-mark" aria-hidden="true"></span></label>').join('') + '</div>';
      else if (p.kind === 'formula') input = '<div class="pc-row"><label class="sr" for="' + id + '-in">Your answer</label><input id="' + id + '-in" class="pc-in wide" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + (p.placeholder || 'formula') + '"><span class="pc-preview" aria-live="polite"></span></div>';
      else input = '<div class="pc-row"><label class="sr" for="' + id + '-in">Your answer</label><input id="' + id + '-in" class="pc-in" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="' + (p.placeholder || 'answer') + '"><span class="pc-unit">' + (p.unit || '') + '</span></div>';
      el.innerHTML = '<div class="pcard" id="' + id + '"><div class="pc-head">' + (o.num ? '<span class="pc-num">' + o.num + '</span>' : '') + '<span class="pc-skill">' + SKILL_NAME(p.skill) + '</span></div>' +
        '<div class="pc-q">' + p.statement + '</div>' + input +
        '<div class="pc-actions"><button type="button" class="btn primary" data-a="check">Check</button><button type="button" class="btn" data-a="hint">Hint</button><button type="button" class="btn" data-a="solve">Show solution</button>' +
        (o.regen ? '<button type="button" class="btn ghost" data-a="new">New problem ↻</button>' : '') + '</div><div class="pc-fb" aria-live="polite"></div><div class="pc-hint"></div></div>';
      hintBtn();
    }
    const hintBtn = () => { const b = $('[data-a=hint]', el); if (b) b.textContent = hint === 0 ? 'Hint' : hint === 1 ? 'More help' : 'Hint'; if (b && hint >= 2) b.disabled = true; };
    const fb = (status, msg) => { const f = $('.pc-fb', el); f.className = 'pc-fb ' + status; f.innerHTML = (status === 'ok' ? '<span class="ic">✔</span>' : status === 'no' ? '<span class="ic">✘</span>' : status === 'close' ? '<span class="ic">≈</span>' : '<span class="ic">!</span>') + '<span>' + msg + '</span>'; };
    function showHint() {
      const h = $('.pc-hint', el); const st = problem.steps;
      hint = Math.min(2, hint + 1);
      const take = hint === 1 ? st.filter((s) => s.stage === 'plan') : st.filter((s) => s.stage !== 'answer');
      h.innerHTML = '<div class="hint-label">' + (hint === 1 ? 'Hint 1: what to do first' : 'Hint 2: set it up (the arithmetic is still yours)') + '</div>' + stepList(take); hintBtn();
      finalize(false);
    }
    function showSolution() {
      finalize(false);
      const h = $('.pc-hint', el); h.innerHTML = '<div class="hint-label">Full solution</div><div class="sol"></div>';
      stepper($('.sol', h), { steps: problem.steps, statement: '' }, { all: true, noLegend: false });
      if (hint < 2) { hint = 2; hintBtn(); }
    }
    function check() {
      const p = problem; let r;
      if (p.kind === 'multi') { const vals = $$('.pc-in', el).map((i) => i.value); r = p.check(vals); if (r.rows) $$('.pc-mrow', el).forEach((row, i) => { const m = $('.pc-mark', row); m.textContent = r.rows[i].ok ? '✔' : '✘'; row.classList.toggle('good', r.rows[i].ok); row.classList.toggle('bad', !r.rows[i].ok); }); }
      else r = p.check($('.pc-in', el).value);
      fb(r.status, r.msg);
      if (r.status === 'bad') return;
      if (r.status === 'ok') { solved = true; finalize(wrong === 0 && hint === 0); if (o.onSolved) o.onSolved(); }
      else { wrong++; finalize(false); if (wrong >= 2 && hint === 0) { const f = $('.pc-fb', el); f.insertAdjacentHTML('beforeend', ' <button type="button" class="linkbtn" data-a="hint">Want a hint?</button>'); } }
    }
    build();
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b || !el.contains(b)) return;
      if (b.dataset.a === 'check') check(); else if (b.dataset.a === 'hint') showHint(); else if (b.dataset.a === 'solve') showSolution();
      else if (b.dataset.a === 'new' && o.regen) { problem = o.regen(); hint = 0; finalized = false; solved = false; wrong = 0; build(); if (o.onNew) o.onNew(problem); }
    });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList.contains('pc-in')) { e.preventDefault(); check(); } });
    el.addEventListener('input', (e) => {
      if (e.target.classList.contains('wide')) { const pv = $('.pc-preview', el), v = e.target.value.trim(); if (!v) { pv.innerHTML = ''; return; } const f = C.parseFormula(v); pv.innerHTML = f.ok ? '= ' + C.fmtFormula(f.text) : '<span class="err">' + f.error + '</span>'; }
    });
    return { get problem() { return problem; } };
  }

  /* ---------- multiple choice ---------- */
  function mc(el, q, o) {
    o = o || {}; let chosen = o.chosen === undefined ? null : o.chosen, tries = 0;
    const id = nextId('mc'), topic = q.topic;
    function draw() {
      const answered = chosen !== null && o.mode !== 'test';
      const reviewing = o.mode === 'review';
      el.innerHTML = '<div class="mcq' + (answered ? ' answered' : '') + '"><div class="mc-q">' + (o.num ? '<span class="mc-num">' + o.num + '.</span> ' : '') + T(q.q) + '</div><div class="mc-choices" role="radiogroup" aria-label="Answer choices">' +
        q.choices.map((c, i) => {
          let cls = 'mc-choice'; if (chosen === i) cls += ' picked';
          if (answered || reviewing) { if (i === q.answer) cls += ' right'; else if (chosen === i) cls += ' wrong'; }
          return '<button type="button" role="radio" aria-checked="' + (chosen === i) + '" class="' + cls + '" data-i="' + i + '"' + (reviewing ? ' disabled' : '') + '><span class="mc-l">' + 'ABCD'[i] + '</span><span class="mc-t">' + T(c) + '</span>' + ((answered || reviewing) && i === q.answer ? '<span class="mc-flag">✔</span>' : (answered || reviewing) && chosen === i ? '<span class="mc-flag">✘</span>' : '') + '</button>';
        }).join('') + '</div>' +
        ((answered || reviewing) && chosen !== null ? '<div class="mc-fb ' + (chosen === q.answer ? 'ok' : 'no') + '">' + (chosen === q.answer ? '<b>Correct.</b> ' : '<b>Not quite.</b> ') + (q.notes ? T(q.notes[chosen].replace(/^Correct:\s*/, '')) : '') + '</div>' : '') +
        (reviewing && chosen === null ? '<div class="mc-fb no"><b>Skipped.</b> The answer is ' + 'ABCD'[q.answer] + '.</div>' : '') +
        ((answered || reviewing) && (q.notes || q.why) ? '<details class="mc-more"' + (reviewing ? '' : '') + '><summary>' + (q.notes ? 'Why is each choice right or wrong?' : 'Why?') + '</summary>' +
          (q.notes ? '<ul>' + q.choices.map((c, i) => '<li class="' + (i === q.answer ? 'right' : '') + '"><b>' + 'ABCD'[i] + '.</b> ' + T(q.notes[i]) + '</li>').join('') + '</ul>' : '<p>' + T(q.why) + '</p>') +
          (topic && chosen !== q.answer ? '<p><a class="reviewlink" href="#/t/' + topic + '">Review topic ' + topic + ' →</a></p>' : '') + '</details>' : '') + '</div>';
    }
    draw();
    if (o.mode !== 'review') el.addEventListener('click', (e) => {
      const b = e.target.closest('.mc-choice'); if (!b || !el.contains(b)) return;
      if (o.mode !== 'test' && chosen !== null && chosen === q.answer) return;      // already right
      chosen = +b.dataset.i; tries++;
      if (o.mode !== 'test') { if (o.id) Store.mc(o.id, chosen === q.answer && tries === 1); if (o.onAnswer) o.onAnswer(chosen, tries); }
      else if (o.onPick) o.onPick(chosen);
      draw();
    });
    return { get chosen() { return chosen; }, set chosen(v) { chosen = v; draw(); } };
  }

  /* ---------- small helpers ---------- */
  const escapeHTML = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* Pill tabs; fn(key, panelElement) fills the panel when a tab is chosen. */
  function pills(el, items, fn, o) {
    o = o || {};
    el.innerHTML = '<div class="pills" role="tablist">' + items.map((it, i) => '<button type="button" role="tab" class="pill" data-k="' + it.key + '" aria-selected="' + (i === 0) + '">' + it.label + '</button>').join('') + '</div><div class="pill-panel" role="tabpanel"></div>';
    const panel = $('.pill-panel', el);
    function pick(k) { $$('.pill', el).forEach((b) => b.setAttribute('aria-selected', b.dataset.k === k)); panel.innerHTML = ''; fn(k, panel); }
    el.addEventListener('click', (e) => { const b = e.target.closest('.pill'); if (b && el.contains(b)) pick(b.dataset.k); });
    pick(items[0].key);
    return { pick };
  }

  const api = { Store, stepper, stepList, problemCard, mc, pills, legendInline, escapeHTML, $, $$, nextId };
  root.MolesUI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
