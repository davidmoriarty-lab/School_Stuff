/* app.js: the shell. Hash routing, the side menu, search, theme, text size and keyboard shortcuts. */
(function () {
  'use strict';
  const UI = window.MolesUI, Store = UI.Store, Pages = window.MolesPages, $ = UI.$, $$ = UI.$$;
  const page = $('#page'), main = $('#main');

  /* ---------- the order of things (menu, prev/next) ---------- */
  const FIXED_TOP = [{ id: 'start', href: '#/', label: 'Start here', ic: '⌂' }, { id: 'map', href: '#/map', label: 'The Mole Map', ic: '◎' }];
  const FIXED_BOTTOM = [{ id: 'practice', href: '#/practice', label: 'Practice problems', ic: '✎' }, { id: 'cheat', href: '#/cheat', label: 'Cheat sheet', ic: '☰' }];
  const ORDER = ['start', 'map'].concat(Pages.TOPICS.map((t) => t.id), ['practice', 'cheat']);
  const hrefOf = (id) => (id === 'start' ? '#/' : /^5\./.test(id) ? '#/t/' + id : '#/' + id);
  const labelOf = (id) => { const t = Pages.TOPICS.find((x) => x.id === id); if (t) return t.id + ' ' + t.title; const f = FIXED_TOP.concat(FIXED_BOTTOM).find((x) => x.id === id); return f ? f.label : id; };

  function buildNav() {
    const link = (it) => '<a href="' + it.href + '" data-id="' + it.id + '"><span class="ic" aria-hidden="true">' + it.ic + '</span><span class="nt">' + it.label + '</span></a>';
    $('#nav').innerHTML = '<h6>Start</h6>' + FIXED_TOP.map(link).join('') + '<h6>Learn: Unit 5</h6>' +
      Pages.TOPICS.map((t) => '<a href="#/t/' + t.id + '" data-id="' + t.id + '"><span class="nb">' + t.id + '</span><span class="nt">' + t.short + '</span><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span></a>').join('') +
      '<h6>Test yourself</h6>' + FIXED_BOTTOM.map(link).join('');
    updateNav();
  }
  let current = 'start';
  function updateNav() {
    $$('#nav a').forEach((a) => {
      const id = a.dataset.id; if (id === current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      const dots = $$('.dots i', a); if (dots.length) { const p = Store.topic(id); [p.examples, p.practice, p.check].forEach((on, i) => dots[i].classList.toggle('on', !!on)); a.title = 'Worked an example · practised 3 problems · answered the quick check'; }
    });
  }
  Store.on(updateNav);

  /* ---------- routing ---------- */
  function parse(hash) {
    const parts = (hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
    if (!parts.length) return { id: 'start' };
    if (parts[0] === 't') return { id: parts[1] || 'start', sec: parts[2] };
    return { id: parts[0], sec: parts[1] };
  }
  let lastRoute = null;
  function render() {
    const r = parse(location.hash);
    const same = lastRoute && lastRoute.id === r.id;
    if (same && r.sec && /^5\./.test(r.id)) { scrollToSection(r.sec); lastRoute = r; return; }
    current = r.id;
    let view;
    try {
      view = Pages.render(r);
    } catch (e) { console.error(e); view = { title: 'Oops', html: '<div class="card"><h2>Something went wrong</h2><p>' + UI.escapeHTML(e.message) + '</p><p><a href="#/">Back to the start</a></p></div>' }; }
    page.innerHTML = view.html;
    document.title = (view.title ? view.title + ' · ' : '') + 'Moles Study Guide';
    if (view.mount) view.mount(page);
    updateNav(); buildBottom(r.id); lastRoute = r;
    document.body.classList.remove('nav-open'); $('#btnMenu').setAttribute('aria-expanded', 'false');
    if (/^5\./.test(r.id)) Store.visit(r.id);
    if (r.sec && /^5\./.test(r.id)) setTimeout(() => scrollToSection(r.sec), 30); else window.scrollTo(0, 0);
    main.focus({ preventScroll: true }); setupSpy();
  }
  function scrollToSection(sec) { const el = document.getElementById('s-' + sec); if (el) el.scrollIntoView({ block: 'start' }); }
  function buildBottom(id) {
    const i = ORDER.indexOf(id), bb = $('#bottombar');
    if (i < 0) { bb.innerHTML = ''; return; }
    const prev = ORDER[i - 1], next = ORDER[i + 1];
    bb.innerHTML = '<a class="' + (prev ? '' : 'dis') + '" href="' + (prev ? hrefOf(prev) : '#') + '">◀ ' + (prev ? (/^5\./.test(prev) ? prev : labelOf(prev)) : '') + '</a><a class="' + (next ? '' : 'dis') + '" href="' + (next ? hrefOf(next) : '#') + '">' + (next ? (/^5\./.test(next) ? next : labelOf(next)) : '') + ' ▶</a>';
  }
  let spy;
  function setupSpy() {
    if (spy) spy.disconnect(); const links = $$('.t-sub a'); if (!links.length) return;
    spy = new IntersectionObserver((entries) => { entries.forEach((en) => { if (en.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.dataset.s === en.target.id.slice(2))); }); }, { rootMargin: '-30% 0px -60% 0px' });
    $$('.sec').forEach((s) => spy.observe(s));
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.t-sub a'); if (!a) return;
    e.preventDefault(); const r = parse(location.hash); history.replaceState(null, '', '#/t/' + r.id + '/' + a.dataset.s); scrollToSection(a.dataset.s);
  });
  window.addEventListener('hashchange', render);

  /* ---------- menu, theme, text size, color key ---------- */
  $('#btnMenu').addEventListener('click', () => { const o = document.body.classList.toggle('nav-open'); $('#btnMenu').setAttribute('aria-expanded', String(o)); });
  $('#scrim').addEventListener('click', () => { document.body.classList.remove('nav-open'); $('#btnMenu').setAttribute('aria-expanded', 'false'); });
  const root = document.documentElement;
  const theme = Store.setting('theme') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  root.dataset.theme = theme;
  $('#btnTheme').addEventListener('click', () => { const t = root.dataset.theme === 'dark' ? 'light' : 'dark'; root.dataset.theme = t; Store.setting('theme', t); });
  const SIZES = ['m', 'l', 'xl', 's']; if (Store.setting('size')) root.dataset.size = Store.setting('size');
  $('#btnSize').addEventListener('click', () => { const i = SIZES.indexOf(root.dataset.size || 'm'), n = SIZES[(i + 1) % SIZES.length]; root.dataset.size = n; Store.setting('size', n); });
  const applyLabels = () => { document.body.classList.toggle('rolelabels', !!Store.setting('labels')); $('#optLabels').checked = !!Store.setting('labels'); };
  applyLabels();
  $('#optLabels').addEventListener('change', (e) => { Store.setting('labels', e.target.checked); applyLabels(); });
  const legend = $('#legend'), openLegend = () => { legend.hidden = false; $('#legendClose').focus(); }, closeLegend = () => { legend.hidden = true; };
  $('#btnLegend').addEventListener('click', openLegend); $('#legendClose').addEventListener('click', closeLegend); legend.addEventListener('click', (e) => { if (e.target === legend) closeLegend(); });

  /* ---------- search ---------- */
  const input = $('#search'), box = $('#searchResults'); let act = -1, hits = [];
  function doSearch() {
    const q = input.value.trim().toLowerCase(); if (!q) { box.hidden = true; return; }
    const words = q.split(/\s+/);
    hits = Pages.searchIndex().map((it) => { const hay = (it.title + ' ' + it.keys).toLowerCase(); let s = 0; for (const w of words) { if (hay.indexOf(w) < 0) return null; s += it.title.toLowerCase().indexOf(w) >= 0 ? 3 : 1; } return { it, s }; }).filter(Boolean).sort((a, b) => b.s - a.s).slice(0, 8).map((x) => x.it);
    box.innerHTML = hits.length ? hits.map((h, i) => '<a href="' + h.href + '" role="option" data-i="' + i + '">' + h.title + '<small>' + h.where + '</small></a>').join('') : '<div class="none">Nothing found. Try “parentheses”, “STP”, “empirical” or “hydrate”.</div>';
    box.hidden = false; act = -1;
  }
  input.addEventListener('input', doSearch); input.addEventListener('focus', doSearch);
  input.addEventListener('keydown', (e) => {
    const links = $$('a', box);
    if (e.key === 'ArrowDown') { e.preventDefault(); act = Math.min(links.length - 1, act + 1); } else if (e.key === 'ArrowUp') { e.preventDefault(); act = Math.max(0, act - 1); }
    else if (e.key === 'Enter') { const t = links[act >= 0 ? act : 0]; if (t) { location.hash = t.getAttribute('href'); box.hidden = true; input.blur(); } return; } else if (e.key === 'Escape') { box.hidden = true; input.blur(); return; } else return;
    links.forEach((a, i) => a.classList.toggle('act', i === act));
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search')) box.hidden = true; else if (e.target.closest('#searchResults a')) { box.hidden = true; input.value = ''; } });

  /* ---------- keys ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLegend();
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName); if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); input.focus(); }
    else if (e.key === '?') { e.preventDefault(); openLegend(); }
    else if (e.key === 'Escape') closeLegend();
    else if (e.key === '[' || e.key === ']') { const i = ORDER.indexOf(current), n = ORDER[i + (e.key === ']' ? 1 : -1)]; if (n) location.hash = hrefOf(n); }
  });

  /* ---------- global click behaviours for small widgets ---------- */
  document.addEventListener('click', (e) => {
    const f = e.target.closest('.flip'); if (f) f.setAttribute('aria-pressed', f.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
  });

  buildNav();
  window.MolesApp = { render, go: (h) => { location.hash = h; } };
  render();
})();
