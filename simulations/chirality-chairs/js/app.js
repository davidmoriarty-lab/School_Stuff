/* app.js: the page. One problem at a time; the chirality problems (1-8) and the chair problems (9-12).
 *
 * Rules, the same as the other practice sets:
 *   - no hints; a wrong answer gets a specific message,
 *   - the worked solution unlocks after 3 wrong attempts,
 *   - using it means that problem does not count: the spot gets a similar problem that must be answered correctly,
 *   - the set is complete when all 12 spots are answered correctly.
 * Work is saved in the browser after every step (and with the Save progress button).
 */
(function (root) {
  'use strict';
  const Cip = root.Cip, Chair = root.Chair, Draw = root.Draw, S = root.ChiralSet, Mol = root.Molecules;
  const $ = (s, el) => (el || document).querySelector(s), $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = Draw.esc, N = S.N, REVEAL = 3, KEY = 'chirality-chairs-v1', VER = 1;
  const SYM = {}; Object.keys(Cip.Z).forEach((k) => { SYM[Cip.Z[k]] = k; });
  let st, base, probs, data, savedAt = null;

  /* ---------- state ---------- */
  const fresh = () => ({ tries: 0, tot: 0, shownN: 0, variant: 0, status: 'open', fb: null, marked: [], cfg: {}, prio: {}, viewC: 0, none: false, mstate: {}, stage: 1, p1: {}, p2: {}, sel: null, showSol: false });
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  function save(manual) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private window */ } savedAt = new Date(); showSaved(!!manual); }
  function showSaved(manual) { const el = $('#saved'); if (!el) return; el.textContent = savedAt ? '✔ ' + (manual ? 'Progress saved' : 'Saved') + ' on this device at ' + savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Your work saves automatically on this device.'; el.classList.toggle('flash', !!manual); }
  const newSeed = () => 10000 + Math.floor(Math.random() * 90000);
  const score = () => st.items.filter((it) => it.status === 'solved').length;
  const firstOpen = () => { const i = st.items.findIndex((it) => it.status !== 'solved'); return i < 0 ? N : i; };
  function rebuild() { base = S.plan(st.seed); probs = base.map((b, i) => S.replacement(st.seed, base, i, st.items[i].variant)); data = probs.map((p) => (p.type === 'chiral' ? S.chiralData(p) : null)); }
  function start(seed) { st = { ver: VER, seed, name: st ? st.name : '', cur: 0, items: Array.from({ length: N }, fresh) }; rebuild(); save(); drawAll(); }

  /* ---------- header ---------- */
  function header() {
    const reach = firstOpen();
    $('#setNo').textContent = 'Set #' + st.seed; $('#score').textContent = score() + ' / ' + N + ' done';
    $('#dots').innerHTML = st.items.map((it, i) => '<button type="button" class="dot ' + (i >= S.N_CHIRAL ? 'chair ' : '') + it.status + (i === st.cur ? ' here' : '') + '" data-go="' + i + '"' + (i > reach ? ' disabled' : '') + ' aria-label="Problem ' + (i + 1) + ' (' + (i >= S.N_CHIRAL ? 'chair' : 'chirality') + '): ' + (it.status === 'solved' ? 'done' : it.status === 'shown' ? 'solution shown, try a similar problem' : i > reach ? 'locked' : 'not finished') + '"' + (i === st.cur ? ' aria-current="step"' : '') + '>' + (i + 1) + '</button>').join('');
  }
  const tagFor = (it) => (it.status === 'solved' ? '<span class="ptag ok">✔ correct' + (it.tries === 0 && !it.shownN ? ' · first try' : '') + '</span>' : it.status === 'shown' ? '<span class="ptag no">solution shown · does not count</span>' : it.tries ? '<span class="ptag">' + it.tries + (it.tries === 1 ? ' wrong try' : ' wrong tries') + '</span>' : '');
  const gateNote = (it) => (it.status === 'shown' ? 'Because you used the solution, this problem does not count. Try a similar problem to get credit for problem ' : it.status === 'solved' ? '' : (it.tries < REVEAL ? 'The worked solution unlocks after ' + REVEAL + ' wrong attempts' + (it.tries ? ' (' + (REVEAL - it.tries) + ' more).' : '.') : 'You can now show the worked solution, but this problem will not count. You will get a similar problem to try instead.'));

  /* ---------- explanation of a chirality answer ---------- */
  function reasonText(r, groups) {
    const up = groups[r.upper].label, lo = groups[r.lower].label, A = r.A.map((z) => SYM[z] || '∅').join(','), B = r.B.map((z) => SYM[z] || '∅').join(',');
    if (r.sphere === 1) return '<code>' + esc(up) + '</code> beats <code>' + esc(lo) + '</code>: the first atom is ' + A + ' (atomic number ' + r.A[0] + ') versus ' + B + ' (' + r.B[0] + ').';
    return '<code>' + esc(up) + '</code> beats <code>' + esc(lo) + '</code>: the first atoms tie, so look at what is attached' + (r.sphere > 2 ? ', then one atom further out' : '') + ': (' + A + ') beats (' + B + ').';
  }
  function whyHTML(d) {
    if (!d.centers.length) return '<div class="why"><h4>Why there are no chiral centers</h4>' + '<p>A chiral center needs four <b>different</b> groups. In this molecule every sp³ carbon has two identical groups (for example the two ethyl groups, or two hydrogens), so none qualifies.</p></div>';
    let h = '<div class="why"><h4>The answer, step by step</h4>';
    d.centers.forEach((c, n) => {
      const cf = d.cfg[c], r = cf.ranking;
      h += '<p><b>Center ' + (n + 1) + '</b>: rank the four groups (the numbers on the drawing).</p><ol>' + r.groups.map((g) => '<li><code>' + esc(g.label) + '</code></li>').join('') + '</ol>';
      if (r.reasons.length) h += '<ul class="solution-lines">' + r.reasons.map((x) => '<li>' + reasonText(x, r.groups) + '</li>').join('') + '</ul>';
      h += '<p>Now look with group <b>4</b> pointing away from you. Going <b>1 → 2 → 3</b> turns ' + (cf.config === 'R' ? '<b>clockwise</b>, so this center is <b>R</b>' : '<b>counterclockwise</b>, so this center is <b>S</b>') + '.' + (cf.lowestZ > 0.05 ? ' (Group 4 points toward you in this drawing, so what you see on the page is the reverse of this: flip it.)' : '') + '</p>';
    });
    return h + '</div>';
  }

  /* ---------- chirality card ---------- */
  let modalAtom = null, modalNote = '', modalReturn = null;
  const orderOf = (it, a) => it.prio[a] || [];
  const centerDone = (it, a) => orderOf(it, a).length === 4 && !!it.cfg[a];
  const unmark = (it, a) => { const p = it.marked.indexOf(a); if (p >= 0) it.marked.splice(p, 1); delete it.cfg[a]; delete it.prio[a]; it.mstate = {}; };
  function chiralCard(i, el) {
    const it = st.items[i], d = data[i], locked = it.status !== 'open';
    const viewC = Math.min(it.viewC || 0, Math.max(0, d.centers.length - 1));
    const marks = locked ? d.centers.map((c) => ({ atom: c, state: it.status === 'solved' ? 'ok' : '' })) : it.marked.map((a) => ({ atom: a, state: it.mstate[a] }));
    const pri = locked && d.centers.length ? [(() => { const c = d.centers[viewC], cf = d.cfg[c], hv = cf.dir[3]; return { center: c, groups: cf.ranking.groups.map((g) => ({ priority: g.priority, atom: g.atom })), hdir: { x: hv.x, y: -hv.y } }; })()] : [];
    const m = Draw.skeletal(d.mol, { interactive: !locked, marks, priorities: pri, label: 'organic molecule, problem ' + (i + 1) });
    const rows = it.marked.map((a, n) => '<div class="crow"><span class="cb">' + (n + 1) + '</span><span class="cinfo"><b>Chiral center ' + (n + 1) + '</b><span class="cstat ' + (centerDone(it, a) ? 'done' : '') + '">' + (centerDone(it, a) ? '✔ priorities set · ' + it.cfg[a] : 'priorities and R/S still needed') + '</span></span><button type="button" class="btn small" data-edit="' + a + '">' + (centerDone(it, a) ? 'Edit' : 'Open') + '</button><button type="button" class="btn small ghost" data-remove="' + a + '" aria-label="Remove chiral center ' + (n + 1) + '">✕</button></div>').join('');
    const tabs = locked && d.centers.length > 1 ? '<div class="ctabs" role="group" aria-label="Show the priorities for one center at a time">' + d.centers.map((c, n) => '<button type="button" data-viewc="' + n + '" aria-pressed="' + (n === viewC) + '">Center ' + (n + 1) + '</button>').join('') + '<span class="note">One center at a time, so the numbers never overlap.</span></div>' : '';
    el.innerHTML = '<div class="pc-head"><span class="pc-num">' + (i + 1) + '</span><span class="pc-skill">Problem ' + (i + 1) + ' of ' + N + ' · Chirality' + (it.variant ? ' · a similar problem' : '') + '</span>' + tagFor(it) + '</div>' +
      (it.variant && !locked && !it.tries ? '<div class="similar">You looked at the solution to the last one, so it did not count. Try this similar problem instead: it counts as problem ' + (i + 1) + '.</div>' : '') +
      '<p class="pc-q">Find every <b>chiral center</b> in this molecule. For each one, rank its four groups and decide <b>R</b> or <b>S</b>.</p>' +
      '<div class="chiral-grid"><div><div class="molbox">' + m.svg + '</div>' + tabs + '</div><div class="steps-box"><h3>Your answer</h3><ol><li><b>Click a chiral center</b> on the drawing (a carbon with four different groups; count the hydrogens that are not drawn).</li><li>A window opens for <b>that center only</b>: click its four groups from highest priority to lowest, then choose R or S.</li><li>Repeat for every chiral center.</li></ol>' +
      '<label class="tog"><input type="checkbox" data-none' + (it.none ? ' checked' : '') + (locked ? ' disabled' : '') + '> This molecule has no chiral centers</label>' +
      '<div class="rows">' + (locked ? '' : rows) + '</div></div></div>' +
      '<div class="pc-actions">' + (it.status === 'solved' ? '<button type="button" class="btn primary" data-act="next">' + (i === N - 1 ? 'See my results' : 'Next problem') + ' ▶</button>' : it.status === 'shown' ? '<button type="button" class="btn primary" data-act="retry">Try a similar problem ▶</button>' : '<button type="button" class="btn primary" data-act="check">Check</button><button type="button" class="btn ghost" data-act="reveal"' + (it.tries >= REVEAL ? '' : ' disabled') + '>Show solution (does not count)</button>') + '</div>' +
      (it.status === 'solved' ? '' : '<div class="note gate">' + gateNote(it) + (it.status === 'shown' ? (i + 1) + '.' : '') + '</div>') +
      '<div class="pc-fb' + (it.fb ? ' ' + it.fb[0] : '') + '" aria-live="polite">' + (it.fb ? it.fb[1] : '') + '</div>' + (locked ? whyHTML(d) : '');
  }

  /* ---------- the pop-up window for one chiral center ---------- */
  function openCenter(a) {
    const it = st.items[st.cur]; if (it.status !== 'open') return;
    if (it.marked.indexOf(a) < 0) { it.marked.push(a); it.none = false; it.mstate = {}; it.fb = null; }
    if (!it.prio[a]) it.prio[a] = []; modalAtom = a; modalNote = ''; modalReturn = document.activeElement; save(); render(); renderModal();
  }
  function closeModal() { const box = $('#modal'); box.hidden = true; box.innerHTML = ''; modalAtom = null; document.body.classList.remove('modal-open'); render(); const r = modalReturn; modalReturn = null; if (r && r.focus && document.contains(r)) r.focus({ preventScroll: true }); }
  function renderModal() {
    const box = $('#modal'), i = st.cur, it = st.items[i], d = data[i], a = modalAtom; if (a === null) { box.hidden = true; return; }
    const n = it.marked.indexOf(a) + 1, gs = Cip.groups(d.mol, a), four = gs.length === 4 && gs.every((x) => x.order === 1), order = orderOf(it, a), nums = {}; order.forEach((id, k) => { nums[id] = k + 1; });
    const m = Draw.skeletal(d.mol, { focus: a, slots: four ? { center: a, nums } : null, label: 'organic molecule: choose the priorities for chiral center ' + n });
    const seg = (v) => '<button type="button" data-mcfg="' + v + '" aria-pressed="' + (it.cfg[a] === v) + '">' + v + '</button>';
    const dirWord = (v) => { const a = (Math.atan2(v.y, v.x) * 180 / Math.PI + 360) % 360; return ['right', 'upper right', 'up', 'upper left', 'left', 'lower left', 'down', 'lower right'][Math.round(a / 45) % 8]; }, byId = {}; gs.forEach((x) => { byId[x.id] = x; });
    const list = order.length ? '<ol class="orderlist">' + order.map((id) => '<li>' + (typeof id === 'number' ? esc(d.mol.atoms[id].el) + ' group (' + dirWord(byId[id].v) + ')' : 'H, not drawn') + '</li>').join('') + '</ol>' : '<p class="note">No groups numbered yet.</p>';
    box.hidden = false; document.body.classList.add('modal-open');
    box.innerHTML = '<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgTitle"><div class="dlg-head"><h3 id="dlgTitle">Chiral center ' + n + '</h3><button type="button" class="btn small ghost" data-mact="close" aria-label="Close this window">✕</button></div>' +
      (four ? '<p><b>Step 1.</b> Click the four groups on the highlighted carbon, from <b>highest priority (1)</b> to <b>lowest (4)</b>. Click a numbered group again to take its number off. The hydrogens that are not drawn are shown as <b>H</b>.</p><div class="dlg-mol">' + m.svg + '</div><div class="dlg-order"><b>Your order so far:</b>' + list + '</div>' +
        '<p><b>Step 2.</b> Turn the molecule so that group <b>4</b> points <b>away</b> from you. Does <b>1 → 2 → 3</b> go clockwise (<b>R</b>) or counterclockwise (<b>S</b>)?</p><div class="seg big" role="group" aria-label="Configuration of this center">' + seg('R') + seg('S') + '</div>' +
        (modalNote ? '<div class="pc-fb bad">' + esc(modalNote) + '</div>' : '') + '<div class="dlg-actions"><button type="button" class="btn primary" data-mact="done">Done with this center</button><button type="button" class="btn" data-mact="clear">Clear the numbers</button><button type="button" class="btn ghost" data-mact="remove">This is not a chiral center</button></div>'
        : '<div class="dlg-mol">' + m.svg + '</div><div class="pc-fb bad">This carbon does not have four single-bonded groups (it is part of a double bond, or it has fewer than four groups), so it cannot be a chiral center.</div><div class="dlg-actions"><button type="button" class="btn primary" data-mact="remove">Take my mark off</button></div>') + '</div>';
    const first = $('.dlg .slot, .dlg [data-mact]', box); if (first) first.focus({ preventScroll: true });
  }
  function modalClick(e) {
    const it = st.items[st.cur], a = modalAtom; if (a === null) return;
    const slot = e.target.closest('.slot'), cfg = e.target.closest('[data-mcfg]'), act = e.target.closest('[data-mact]');
    if (e.target.id === 'modal') { closeModal(); return; }
    if (slot) { const id = /^H/.test(slot.dataset.gid) ? slot.dataset.gid : +slot.dataset.gid, ord = it.prio[a], p = ord.indexOf(id); if (p >= 0) ord.splice(p, 1); else if (ord.length < 4) ord.push(id); modalNote = ''; it.fb = null; save(); renderModal(); const again = $('.dlg .slot[data-gid="' + slot.dataset.gid + '"]'); if (again) again.focus({ preventScroll: true }); return; }
    if (cfg) { it.cfg[a] = cfg.dataset.mcfg; modalNote = ''; it.fb = null; save(); renderModal(); return; }
    if (!act) return; const k = act.dataset.mact;
    if (k === 'close') closeModal();
    else if (k === 'clear') { it.prio[a] = []; modalNote = ''; save(); renderModal(); }
    else if (k === 'remove') { unmark(it, a); it.fb = null; save(); closeModal(); }
    else if (k === 'done') { if (orderOf(it, a).length !== 4) { modalNote = 'Click all four groups to number them 1 to 4.'; renderModal(); } else if (!it.cfg[a]) { modalNote = 'Choose R or S.'; renderModal(); } else closeModal(); }
  }

  function checkChiral(i) {
    const it = st.items[i], d = data[i], truth = new Set(d.centers), marked = it.marked; it.mstate = {};
    const bad = (msg) => { it.fb = ['bad', msg]; save(); render(); };
    if (it.none && marked.length) return bad('You ticked "no chiral centers" but also marked some atoms. Pick one: either mark the centers or tick the box.');
    if (!it.none && !marked.length) return bad('Click a chiral center on the molecule first. If you think there are none, tick "This molecule has no chiral centers".');
    const unfinished = marked.filter((a) => !centerDone(it, a)); if (unfinished.length) return bad('Finish ' + (unfinished.length === 1 ? 'chiral center ' + (marked.indexOf(unfinished[0]) + 1) : 'every center you marked') + ': click the center to open its window, number the four groups 1 to 4, and choose R or S.');
    const extras = marked.filter((a) => !truth.has(a)), missing = d.centers.filter((c) => marked.indexOf(c) < 0), real = marked.filter((a) => truth.has(a));
    const wrongOrder = real.filter((a) => orderOf(it, a).join() !== Cip.truthOrder(d.mol, a).join()), okOrder = real.filter((a) => wrongOrder.indexOf(a) < 0), wrongLetter = okOrder.filter((a) => it.cfg[a] !== d.cfg[a].config);
    const inconsistent = wrongOrder.filter((a) => Cip.configFromOrder(d.mol, a, orderOf(it, a)) !== it.cfg[a]);
    if (!extras.length && !missing.length && !wrongOrder.length && !wrongLetter.length) { it.status = 'solved'; it.fb = ['ok', '<b>Correct!</b> ' + (d.centers.length ? 'Look at the explanation below to compare your priorities with the reasoning.' : 'There are no chiral centers.')]; it.viewC = 0; save(); render(); return; }
    it.tries++; it.tot++; const lines = [], num = (a) => marked.indexOf(a) + 1;
    extras.forEach((a) => { it.mstate[a] = 'no'; lines.push('Center ' + num(a) + ' (circled in red) is <b>not</b> a chiral center: ' + esc(Cip.whyNot(d.mol, a) || 'it is not stereogenic') + '.'); });
    if (it.none && d.centers.length) lines.push('This molecule <b>does</b> have chiral centers. Look for carbons with four different groups.');
    if (missing.length && marked.length) lines.push('You missed <b>' + missing.length + '</b> chiral center' + (missing.length > 1 ? 's' : '') + '. Check every carbon again, and remember the hydrogens that are not drawn.');
    wrongOrder.forEach((a) => { it.mstate[a] = 'no'; lines.push('Center ' + num(a) + ': the <b>priority order</b> is not right. Compare the atoms attached directly to the center first (the higher atomic number wins). If two groups tie, compare the atoms attached to them, then go one atom further out.' + (inconsistent.indexOf(a) >= 0 ? ' Also, the R/S you chose does not match the order you numbered: check the direction again.' : '')); });
    wrongLetter.forEach((a) => { it.mstate[a] = 'no'; lines.push('Center ' + num(a) + ': your priorities are right, but <b>R/S is wrong</b>. Hold group 4 away from you and trace 1 → 2 → 3 again (if group 4 points toward you on the page, the direction you see is reversed).'); });
    it.fb = ['no', lines.length === 1 ? lines[0] : '<ul>' + lines.map((l) => '<li>' + l + '</li>').join('') + '</ul>']; save(); render();
  }

  /* ---------- chair card ---------- */
  const groupsOf = (t) => { const g = {}; t.subs.forEach((s) => { g[s.id] = s.group; }); return g; };
  function board(which, placed, t, live) {
    const flip = which === 1 ? 1 : -1, c = Draw.chair(flip, { placed, groups: groupsOf(t), readonly: !live });
    const tray = live ? '<div class="tray" data-tray>' + t.subs.filter((s) => !placed[s.id]).map((s) => '<button type="button" class="chip' + (st.items[st.cur].sel === s.id ? ' sel' : '') + '" data-id="' + s.id + '" style="background:' + Draw.groupColor(s.group) + '">' + esc(s.group) + '</button>').join('') + (t.subs.every((s) => placed[s.id]) ? '<span class="hint">All placed. Drag a group to move it, or tap it to take it off.</span>' : '') + '</div>' : '';
    return '<div class="board' + (live ? ' live' : '') + '" data-which="' + which + '">' + tray + c.svg.replace('class="chair"', 'class="chair' + (live ? '' : ' readonly') + '"') + '</div>';
  }
  function chairCard(i, el) {
    const it = st.items[i], p = probs[i], t = p.target, locked = it.status !== 'open';
    const solved = it.status === 'solved', shown = it.status === 'shown';
    let panels = '', sol = null;
    if (shown) {
      const a = Chair.solve(t, 1), b = Chair.solve(t, -1, Chair.typesOf(a)); sol = { a, b };
      const line = (s, k) => { const pl = (k === 'a' ? a : b)[s.id]; return '<li><b>' + esc(s.group) + '</b>: ' + (pl.type === 'ax' ? 'axial' : 'equatorial') + ', pointing ' + (Chair.faceOf(pl.k, pl.type, k === 'a' ? 1 : -1) === 1 ? 'up' : 'down') + '</li>'; };
      panels = '<div class="panel locked"><h3>One correct chair</h3>' + board(1, a, t, false) + '<ul class="solution-lines">' + t.subs.map((s) => line(s, 'a')).join('') + '</ul></div><div class="panel locked"><h3>The ring flip of that chair</h3>' + board(2, b, t, false) + '<ul class="solution-lines">' + t.subs.map((s) => line(s, 'b')).join('') + '</ul><p class="note">Any carbons work as long as the groups are the right distance apart and on the right sides (cis = same side, trans = opposite sides). In the flip, every axial group becomes equatorial and every equatorial group becomes axial, while up stays up and down stays down.</p></div>';
    } else {
      const s1 = it.stage === 1 && !solved;
      panels = '<div class="panel ' + (s1 ? 'active' : 'locked') + '"><h3>Step 1: build the chair' + (s1 ? '' : ' ✔') + '</h3>' + (s1 ? '<p class="note">Drag each group onto an axial (blue) or equatorial (orange) position. Any carbon works, as long as the groups are the right distance apart and on the right sides.</p>' : '') + board(1, it.p1, t, s1) + '</div>' +
        (it.stage === 2 || solved ? '<div class="panel ' + (solved ? 'locked' : 'active') + '"><h3>Step 2: ring flip' + (solved ? ' ✔' : '') + '</h3>' + (solved ? '' : '<p class="note">Flip the ring: the up carbons become down carbons and the down carbons become up. Place every group again in its new position.</p>') + board(2, it.p2, t, !solved) + '</div>' : '<div class="panel locked"><h3>Step 2: ring flip</h3><p class="note">This unlocks when your chair in step 1 is right.</p></div>');
    }
    el.innerHTML = '<div class="pc-head"><span class="pc-num">' + (i + 1) + '</span><span class="pc-skill">Problem ' + (i + 1) + ' of ' + N + ' · Chair conformation' + (it.variant ? ' · a similar problem' : '') + '</span>' + tagFor(it) + '</div>' +
      (it.variant && !locked && !it.tries ? '<div class="similar">You looked at the solution to the last one, so it did not count. Try this similar problem instead: it counts as problem ' + (i + 1) + '.</div>' : '') +
      '<p class="pc-q">Here is a cyclohexane ring. <b>Wedge</b> = up (toward you), <b>dash</b> = down (away from you). Build its <b>chair conformation</b>, then do a <b>ring flip</b>. The other positions hold hydrogens, so you only place the groups shown.</p>' +
      '<div class="chair-top"><div class="flatbox">' + Draw.flatRing(t) + '<div class="cap">numbers are the ring carbons, going clockwise</div></div><div class="legend"><span class="ax"><i></i>axial: straight up or straight down</span><span class="eq"><i></i>equatorial: out to the side</span><span class="rule"><b>Reminder:</b> the carbons of a chair alternate up, down, up, down. An axial bond points the same way as its carbon; an equatorial bond points the opposite way.</span></div></div>' + panels +
      '<div class="pc-actions">' + (solved ? '<button type="button" class="btn primary" data-act="next">' + (i === N - 1 ? 'See my results' : 'Next problem') + ' ▶</button>' : shown ? '<button type="button" class="btn primary" data-act="retry">Try a similar problem ▶</button>' : '<button type="button" class="btn primary" data-act="check">' + (it.stage === 1 ? 'Check my chair' : 'Check my ring flip') + '</button><button type="button" class="btn" data-act="clear">Start this step over</button><button type="button" class="btn ghost" data-act="reveal"' + (it.tries >= REVEAL ? '' : ' disabled') + '>Show solution (does not count)</button>') + '</div>' +
      (solved ? '' : '<div class="note gate">' + gateNote(it) + (shown ? (i + 1) + '.' : '') + '</div>') + '<div class="pc-fb' + (it.fb ? ' ' + it.fb[0] : '') + '" aria-live="polite">' + (it.fb ? it.fb[1] : '') + '</div>';
    void sol;
  }
  function checkChairStep(i) {
    const it = st.items[i], t = probs[i].target, which = it.stage, placed = which === 1 ? it.p1 : it.p2;
    const r = Chair.check(t, placed, which === 1 ? 1 : -1, which === 2 ? Chair.typesOf(it.p1) : undefined);
    if (r.errors.length && r.errors[0].type === 'unplaced') { it.fb = ['bad', esc(Chair.explain(r.errors[0]))]; save(); render(); return; }
    if (r.ok) {
      if (which === 1) { it.stage = 2; it.fb = ['ok', '<b>Your chair is right.</b> Now do the ring flip: the groups that were axial become equatorial, and the groups that were equatorial become axial.']; }
      else { it.status = 'solved'; it.fb = ['ok', '<b>Correct!</b> Every group switched between axial and equatorial, and they are still the same distance apart and on the same sides.']; }
      it.sel = null; save(); render(); return;
    }
    it.tries++; it.tot++; const msgs = r.errors.map((e) => Chair.explain(e)).filter((v, k, a) => a.indexOf(v) === k);
    it.fb = ['no', msgs.length === 1 ? esc(msgs[0]) : '<ul>' + msgs.map((m) => '<li>' + esc(m) + '</li>').join('') + '</ul>']; save(); render();
  }

  /* ---------- results ---------- */
  function results() {
    const first = st.items.filter((it) => !it.shownN && it.tries === 0).length, again = st.items.filter((it) => it.shownN).length, fin = $('#finish');
    fin.hidden = false; fin.innerHTML = '<h2>Set complete</h2><p class="big">' + first + ' / ' + N + '</p><p>correct on the first try' + (again ? ' · ' + again + ' needed a similar problem after the solution was shown' : '') + '</p>' +
      '<table class="res"><tr><th>#</th><th>Problem</th><th>Result</th><th>Wrong tries</th></tr>' + probs.map((p, i) => { const it = st.items[i]; return '<tr><td>' + (i + 1) + '</td><td>' + (p.type === 'chiral' ? 'Chirality: ' + esc(data[i].name) : 'Chair: ' + esc(Chair.describe(p.target))) + '</td><td>✔ ' + (it.shownN ? 'correct after ' + it.shownN + (it.shownN === 1 ? ' solution' : ' solutions') + ' shown' : it.tries ? 'correct' : 'correct, first try') + '</td><td>' + (it.tot || it.tries) + '</td></tr>'; }).join('') + '</table>' +
      '<p><label>Name <input id="nameIn" type="text" value="' + esc(st.name || '') + '" autocomplete="name"></label> <button type="button" class="btn primary" id="printBtn">Print my results</button> <button type="button" class="btn" id="againBtn">Try a new set</button></p>';
  }

  /* ---------- drawing the page ---------- */
  function render() {
    const i = st.cur; if (i >= N) return;
    const el = $('#p' + (i + 1)); if (!el) return; const it = st.items[i];
    el.className = 'pcard prob ' + it.status; probs[i].type === 'chiral' ? chiralCard(i, el) : chairCard(i, el); header();
  }
  function drawAll() {
    if (st.cur > firstOpen()) st.cur = firstOpen();
    const fin = $('#finish');
    if (st.cur >= N) { $('#list').innerHTML = ''; results(); header(); return; }
    fin.hidden = true; fin.innerHTML = ''; $('#list').innerHTML = '<div id="p' + (st.cur + 1) + '"></div>'; render();
  }
  const go = (i) => { st.cur = i; save(); drawAll(); window.scrollTo(0, 0); };
  function retry(i) { const it = st.items[i], keep = { tot: it.tot, shownN: it.shownN + 1, variant: it.variant + 1 }; Object.assign(it, fresh(), keep); probs[i] = S.replacement(st.seed, base, i, it.variant); data[i] = probs[i].type === 'chiral' ? S.chiralData(probs[i]) : null; save(true); render(); window.scrollTo(0, 0); }

  /* ---------- clicks ---------- */
  document.addEventListener('click', (e) => {
    if (e.target.closest('#modal')) { modalClick(e); return; }
    const d = e.target.closest('[data-go]'); if (d && !d.disabled) { go(+d.dataset.go); return; }
    const card = e.target.closest('.prob'), i = st.cur, it = st.items[i];
    if (card) {
      const a = e.target.closest('[data-act]'), at = e.target.closest('.atom'), ed = e.target.closest('[data-edit]'), rm = e.target.closest('[data-remove]'), vc = e.target.closest('[data-viewc]');
      if (a) {
        const act = a.dataset.act;
        if (act === 'check') probs[i].type === 'chiral' ? checkChiral(i) : checkChairStep(i);
        else if (act === 'reveal') { if (it.tries >= REVEAL && confirm('Show the full solution?\n\nThis problem will NOT count. You will get a similar problem to try instead, and that one has to be answered correctly.')) { it.status = 'shown'; it.fb = null; save(true); render(); } }
        else if (act === 'retry') retry(i);
        else if (act === 'next') go(Math.min(N, firstOpen() > i ? i + 1 : firstOpen()));
        else if (act === 'clear') { if (it.stage === 1) it.p1 = {}; else it.p2 = {}; it.sel = null; it.fb = null; save(); render(); }
        return;
      }
      if (vc) { it.viewC = +vc.dataset.viewc; render(); return; }
      if (at && it.status === 'open') { openCenter(+at.dataset.atom); return; }
      if (ed && it.status === 'open') { openCenter(+ed.dataset.edit); return; }
      if (rm && it.status === 'open') { unmark(it, +rm.dataset.remove); it.fb = null; save(); render(); return; }
      const none = e.target.closest('[data-none]'); if (none && it.status === 'open') { it.none = none.checked; if (it.none) { it.marked = []; it.cfg = {}; it.mstate = {}; } it.fb = null; save(); render(); return; }
      const spot = e.target.closest('.spot'), live = e.target.closest('.board.live');
      if (spot && live && !drag.justDragged) { if (it.sel) placeOn(i, +live.dataset.which, it.sel, +spot.dataset.k, spot.dataset.type); return; }
      const chip = e.target.closest('.chip'); if (chip && live && !drag.justDragged) { it.sel = it.sel === chip.dataset.id ? null : chip.dataset.id; render(); return; }
      return;
    }
    if (e.target.id === 'newSet' || e.target.id === 'againBtn') { if (e.target.id === 'againBtn' || st.items.every((x) => x.tot === 0 && x.status === 'open' && !x.marked.length && !Object.keys(x.p1).length) || confirm('Start a brand-new set of problems? Your work on this set will be erased.')) { start(newSeed()); window.scrollTo(0, 0); } }
    if (e.target.id === 'printBtn') window.print();
    if (e.target.id === 'saveBtn') save(true);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalAtom !== null) { e.preventDefault(); closeModal(); return; }
    if (e.key === 'Tab' && modalAtom !== null) { const f = $$('#modal button:not([disabled]), #modal .slot').filter((x) => x.offsetParent !== null || x.closest('svg')); if (f.length) { const at = f.indexOf(document.activeElement); if (e.shiftKey && at <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && at === f.length - 1) { e.preventDefault(); f[0].focus(); } } return; }
    if (e.key !== 'Enter' && e.key !== ' ') return; const slotK = e.target.closest && e.target.closest('.slot'); if (slotK) { e.preventDefault(); slotK.dispatchEvent(new MouseEvent('click', { bubbles: true })); return; }
    const spot = e.target.closest && e.target.closest('.spot'), atom = e.target.closest && e.target.closest('.atom');
    if (spot) { e.preventDefault(); const live = spot.closest('.board.live'), it = st.items[st.cur]; if (live && it.sel) placeOn(st.cur, +live.dataset.which, it.sel, +spot.dataset.k, spot.dataset.type); }
    else if (atom) { e.preventDefault(); atom.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  });
  document.addEventListener('input', (e) => { if (e.target.id === 'nameIn') { st.name = e.target.value; save(); } });

  /* ---------- dragging groups onto the chair ---------- */
  const drag = { on: null, justDragged: false };
  function placeOn(i, which, id, k, type) {
    const it = st.items[i], placed = which === 1 ? it.p1 : it.p2;
    for (const other in placed) if (placed[other].k === k && placed[other].type === type && other !== id) delete placed[other];   // a spot holds one group: the old one goes back to the tray
    placed[id] = { k, type }; it.sel = null; it.fb = null; save(); render();
    const again = $('.board[data-which="' + which + '"] .spot[data-k="' + k + '"][data-type="' + type + '"]'); if (again) again.focus({ preventScroll: true });
  }
  function nearestSpot(boardEl, x, y) {
    let best = null, bd = 44; $$('.spot', boardEl).forEach((sp) => { const r = $('circle', sp).getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, dd = Math.hypot(x - cx, y - cy); if (dd < bd) { bd = dd; best = sp; } }); return best;
  }
  document.addEventListener('pointerdown', (e) => {
    const src = e.target.closest('.chip, .chipmark'), boardEl = src && src.closest('.board.live'); if (!boardEl || e.button > 0) return;
    drag.on = { id: src.dataset.id, which: +boardEl.dataset.which, x: e.clientX, y: e.clientY, moved: false, fromSpot: src.classList.contains('chipmark'), board: boardEl, label: src.textContent.trim(), color: src.classList.contains('chip') ? src.style.background : (src.querySelector('rect') || {}).getAttribute && src.querySelector('rect').getAttribute('fill') };
    drag.justDragged = false;
  });
  document.addEventListener('pointermove', (e) => {
    const d = drag.on; if (!d) return;
    if (!d.moved) { if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return; d.moved = true; const g = document.createElement('div'); g.className = 'dragghost'; g.textContent = d.label; g.style.background = d.color || '#444'; document.body.appendChild(g); d.ghost = g; document.body.classList.add('dragging-now'); }
    d.ghost.style.left = e.clientX + 'px'; d.ghost.style.top = e.clientY + 'px';
    $$('.spot.over').forEach((s) => s.classList.remove('over')); const sp = nearestSpot(d.board, e.clientX, e.clientY); if (sp) sp.classList.add('over');
  });
  function endDrag(e) {
    const d = drag.on; if (!d) return; drag.on = null; document.body.classList.remove('dragging-now'); $$('.spot.over').forEach((s) => s.classList.remove('over'));
    if (d.ghost) d.ghost.remove();
    const i = st.cur, it = st.items[i], placed = d.which === 1 ? it.p1 : it.p2;
    if (!d.moved) { if (d.fromSpot) { delete placed[d.id]; it.fb = null; save(); render(); drag.justDragged = true; setTimeout(() => { drag.justDragged = false; }, 0); } return; }
    drag.justDragged = true; setTimeout(() => { drag.justDragged = false; }, 0);
    const sp = e.type === 'pointerup' ? nearestSpot(d.board, e.clientX, e.clientY) : null;
    if (sp) placeOn(i, d.which, d.id, +sp.dataset.k, sp.dataset.type); else { delete placed[d.id]; it.fb = null; save(); render(); }
  }
  document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);

  /* ---------- start ---------- */
  const forced = parseInt((location.search.match(/[?&]set=(\d{1,9})/) || [])[1], 10), old = load();
  if (old && old.items && old.items[0] && !old.items[0].prio) old.ver = -1;   // saved with the older answer format
  if (forced && (!old || old.seed !== forced)) { st = old ? { name: old.name } : null; start(forced); }
  else if (old && old.ver === VER && old.seed && Array.isArray(old.items) && old.items.length === N) { st = old; rebuild(); drawAll(); }
  else start(newSeed());
  showSaved(false);
  root.ChiralApp = { get state() { return st; }, get probs() { return probs; }, get data() { return data; }, start, placeOn, render, openCenter, closeModal };
})(typeof self !== 'undefined' ? self : this);
