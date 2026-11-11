/* app.js: everything the student sees and touches.
 *
 *   BUILDING   drag a part from a tray (or click it, then click a square). While it is dragged,
 *              the pointer position is divided by the size of one square and rounded, which is
 *              what makes parts snap. Model.canPlace() decides whether the squares are free.
 *   RUNNING    Model.simulate() works out the whole journey in advance as a list of frames (the
 *              nutrient amounts after every tick). The page then just plays that list back,
 *              moving the food along each organ's route, firing sounds and updating the table.
 *   REPORT     when the food leaves (or spills), the findings from the model become the summary.
 */
(function () {
  'use strict';
  const D = self.DigestData, M = self.DigestModel, Art = self.DigestArt, Snd = self.DigestSound;
  const { COLS, ROWS, PARTS, FOODS } = D;
  const U = 100;                                   // drawing units per grid square
  const TICKS_PER_SECOND = 10, FAST = 4, END_SECONDS = 1.7;
  const MANUAL = /[?&]manual\b/.test(location.search);   // tests drive the clock themselves
  const $ = id => document.getElementById(id);
  const board = $('board');

  const NUTRIENTS = [
    ['cc', 'Complex<br>carbs', '#b9772a', null], ['su', 'Sugars', '#f08c2e', 'A_su'], ['pr', 'Protein', '#7d4fc4', null],
    ['aa', 'Amino<br>acids', '#b48ae6', 'A_aa'], ['fa', 'Fats', '#c9a400', null], ['fy', 'Fatty<br>acids', '#ecd23a', 'A_fy'], ['w', 'Water<br>(g)', '#3f9ddb', 'A_w']
  ];
  const COLOR = Object.fromEntries(NUTRIENTS.map(n => [n[0], n[2]]));
  const JUICE = { salivary: '#9fd6f2', chief: '#a56bd6', parietal: '#d8e04a', pancreas: '#f0b93a', gallbladder: '#7fae36', liver: '#7fae36' };
  const CHYME = '#cfa95e', BROWN = '#7a4a21';
  const HINT = 'Drag parts onto the grid to build a digestive system. Join the tube from the mouth to the anus, attach the glands, cells and vessels to the organs they serve, then choose a food and press Play.';

  const S = {
    placed: [], uid: 0, mode: 'build', food: 'apple', sim: null,
    tick: 0, playing: false, fast: false, endT: 0, drops: [], particles: [],
    drag: null, armed: null, cursor: null, seg: -1, timers: {}, clock: 0
  };

  /* ---------- small helpers ---------- */
  const mix = (a, b, k) => {
    const h = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    const A = h(a), B = h(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, k))).toString(16).padStart(2, '0')).join('');
  };
  const fmt = v => v == null ? '–' : Math.abs(v) < 0.05 ? '0' : v.toFixed(1);
  const centre = p => [(p.c + PARTS[p.type].w / 2) * U, (p.r + PARTS[p.type].h / 2) * U];
  const status = t => { $('status').textContent = t; };
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private window */ } } };

  /* ---------- the board ---------- */
  let grid = '<g>';
  for (let c = 1; c < COLS; c++) grid += '<line class="gridline" x1="' + c * U + '" y1="0" x2="' + c * U + '" y2="' + ROWS * U + '"/>';
  for (let r = 1; r < ROWS; r++) grid += '<line class="gridline" x1="0" y1="' + r * U + '" x2="' + COLS * U + '" y2="' + r * U + '"/>';
  board.innerHTML = grid + '</g><g id="gParts"></g><g id="gDucts"></g><g id="gPreview"></g><g id="gFx"></g>';
  const gParts = $('gParts'), gDucts = $('gDucts'), gPreview = $('gPreview'), gFx = $('gFx');

  function renderBoard() {
    gParts.innerHTML = S.placed.map(p => {
      const d = PARTS[p.type];
      return '<g class="part ' + d.kind + (S.drag && S.drag.uid === p.uid ? ' lifting' : '') + '" data-uid="' + p.uid + '" data-type="' + p.type + '" transform="translate(' + p.c * U + ' ' + p.r * U + ')">'
        + '<title>' + d.name + '</title><rect class="hit" width="' + d.w * U + '" height="' + d.h * U + '" rx="10"/>' + Art.draw(p.type) + '</g>';
    }).join('');

    /* a short connector wherever a gland, cell group or vessel is attached to something */
    const A = M.analyze(S.placed);
    let ducts = '';
    const link = (p, edge, dir) => {
      const x = edge.x * U, y = edge.y * U, col = JUICE[p.type] || (p.type === 'capillaries' ? '#d2413a' : '#7fa9d0');
      const x1 = x - dir[0] * 26, y1 = y - dir[1] * 26, x2 = x + dir[0] * 20, y2 = y + dir[1] * 20;
      ducts += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#4b3b34" stroke-width="11" stroke-linecap="round"/>'
        + '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + col + '" stroke-width="6" stroke-linecap="round"/>';
    };
    for (const p of S.placed) {
      const a = A.attach[p.uid];
      if (!a || (S.drag && S.drag.uid === p.uid)) continue;
      if (a.viaGallbladder) link(p, a.gbEdge, a.gbDir);
      else if (a.host) link(p, a.edge, a.dir);
    }
    gDucts.innerHTML = ducts;
  }

  /* ---------- trays, foods, table ---------- */
  function renderTray() {
    const make = type => {
      const d = PARTS[type], left = d.max - M.countOf(S.placed, type);
      return '<button class="tray-item' + (S.armed === type ? ' armed' : '') + '" data-type="' + type + '"' + (left <= 0 || S.mode !== 'build' ? ' disabled' : '') + '>'
        + Art.icon(D, type) + d.name + (d.max > 1 ? '<span class="count">×' + left + '</span>' : '') + '</button>';
    };
    $('trayTract').innerHTML = D.TRACT.map(make).join('');
    $('trayAcc').innerHTML = D.ACCESSORY.map(make).join('');
  }
  function renderFoods() {
    $('foods').innerHTML = Object.keys(FOODS).map(id => {
      const f = FOODS[id];
      return '<button class="food" data-food="' + id + '" aria-pressed="' + (S.food === id) + '"' + (S.mode === 'run' ? ' disabled' : '') + '><span class="emoji">' + f.icon + '</span>' + f.name + '<small>' + f.serving + '</small></button>';
    }).join('');
  }
  function renderTable(frame) {
    const f = FOODS[S.food];
    const init = { cc: f.cc, su: f.su, pr: f.pr, aa: 0, fa: f.fa, fy: 0, w: f.w };
    const now = frame || init;
    $('analysisFood').textContent = f.icon + ' ' + f.name + ', ' + f.serving;
    $('analysis').innerHTML = '<thead><tr><th>Nutrient</th>' + NUTRIENTS.map(n => '<th><span class="sw" style="background:' + n[2] + '"></span>' + n[1] + '</th>').join('') + '</tr></thead><tbody>'
      + '<tr><th>Initial</th>' + NUTRIENTS.map(n => '<td>' + fmt(init[n[0]]) + '</td>').join('') + '</tr>'
      + '<tr><th>In the gut now</th>' + NUTRIENTS.map(n => '<td data-now="' + n[0] + '">' + fmt(now[n[0]]) + '</td>').join('') + '</tr>'
      + '<tr><th>Absorbed</th>' + NUTRIENTS.map(n => '<td data-abs="' + n[0] + '">' + (n[3] ? fmt(frame ? frame[n[3]] : 0) : '') + '</td>').join('') + '</tr></tbody>';
  }
  function renderControls() {
    document.body.dataset.mode = S.mode;
    $('btnPlay').textContent = S.mode === 'done' ? '▶ Run again' : '▶ Play';
    $('btnPlay').disabled = S.mode === 'run' && S.playing;
    $('btnPause').disabled = !(S.mode === 'run' && S.playing);
    $('btnReset').disabled = S.mode === 'build';
    $('btnFast').setAttribute('aria-pressed', S.fast);
    $('btnClear').disabled = S.mode !== 'build';
  }
  function refresh() { renderBoard(); renderTray(); renderFoods(); renderControls(); }
  function changed() {
    store.set('dsb-layout', JSON.stringify(S.placed.map(p => [p.type, p.c, p.r])));
    refresh();
  }

  /* ---------- placing parts ---------- */
  function place(type, c, r) {
    if (!PARTS[type] || M.countOf(S.placed, type) >= PARTS[type].max || !M.canPlace(S.placed, type, c, r)) return false;
    S.placed.push({ uid: ++S.uid, type, c, r });
    return true;
  }
  const cellSize = () => board.getBoundingClientRect().width / COLS;
  function preview(type, c, r, ignoreUid) {
    if (c == null) { gPreview.innerHTML = ''; return false; }
    const d = PARTS[type], ok = M.canPlace(S.placed, type, c, r, ignoreUid);
    gPreview.innerHTML = '<rect class="preview ' + (ok ? 'ok' : 'no') + '" x="' + (c * U + 3) + '" y="' + (r * U + 3) + '" width="' + (d.w * U - 6) + '" height="' + (d.h * U - 6) + '" rx="10"/>';
    return ok;
  }

  function startDrag(ev, type, uid) {
    if (S.mode !== 'build' || ev.button > 0) return;
    ev.preventDefault();
    const rect = board.getBoundingClientRect(), cell = rect.width / COLS, d = PARTS[type];
    let gx = d.w / 2, gy = d.h / 2;
    if (uid != null) { const p = S.placed.find(q => q.uid === uid); gx = (ev.clientX - rect.left) / cell - p.c; gy = (ev.clientY - rect.top) / cell - p.r; }
    S.drag = { type, uid, gx, gy, x0: ev.clientX, y0: ev.clientY, moved: false, cell: null, ok: false };
    const ghost = document.createElement('div');
    ghost.id = 'ghost'; ghost.innerHTML = '<svg viewBox="0 0 ' + d.w * U + ' ' + d.h * U + '">' + Art.draw(type) + '</svg>';
    ghost.style.width = d.w * cell + 'px'; ghost.style.height = d.h * cell + 'px'; ghost.style.display = 'none';
    document.body.appendChild(ghost);
    window.addEventListener('pointermove', moveDrag);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  }
  function moveDrag(ev) {
    const g = S.drag; if (!g) return;
    if (!g.moved && Math.hypot(ev.clientX - g.x0, ev.clientY - g.y0) > 6) {
      g.moved = true; disarm(); Snd.play('lift');
      $('ghost').style.display = ''; if (g.uid != null) renderBoard();
    }
    if (!g.moved) return;
    const rect = board.getBoundingClientRect(), cell = rect.width / COLS, ghost = $('ghost');
    ghost.style.left = (ev.clientX - g.gx * cell) + 'px'; ghost.style.top = (ev.clientY - g.gy * cell) + 'px';
    const inside = ev.clientX >= rect.left - cell / 2 && ev.clientX <= rect.right + cell / 2 && ev.clientY >= rect.top - cell / 2 && ev.clientY <= rect.bottom + cell / 2;
    const d = PARTS[g.type];
    /* the snap: nearest whole square, kept on the board */
    const c = Math.max(0, Math.min(COLS - d.w, Math.round((ev.clientX - rect.left) / cell - g.gx)));
    const r = Math.max(0, Math.min(ROWS - d.h, Math.round((ev.clientY - rect.top) / cell - g.gy)));
    g.cell = inside ? { c, r } : null;
    g.ok = inside ? preview(g.type, c, r, g.uid) : preview(g.type, null);
  }
  function endDrag() {
    const g = S.drag; if (!g) return;
    S.drag = null;
    window.removeEventListener('pointermove', moveDrag); window.removeEventListener('pointerup', endDrag); window.removeEventListener('pointercancel', endDrag);
    const ghost = $('ghost'); if (ghost) ghost.remove();
    gPreview.innerHTML = '';
    if (!g.moved) { if (g.uid == null) arm(S.armed === g.type ? null : g.type); return; }   // a plain click: nothing was lifted
    if (g.ok) {
      if (g.uid != null) { const p = S.placed.find(q => q.uid === g.uid); p.c = g.cell.c; p.r = g.cell.r; }
      else S.placed.push({ uid: ++S.uid, type: g.type, c: g.cell.c, r: g.cell.r });
      Snd.play('click');
    } else if (!g.cell && g.uid != null) {
      S.placed = S.placed.filter(q => q.uid !== g.uid); Snd.play('lift');      // dragged off the grid
    } else Snd.play('buzz');
    changed();
  }

  /* click-to-place and keyboard placing */
  function arm(type) {
    S.armed = type; S.cursor = null; gPreview.innerHTML = '';
    if (type) { status('Now click a square on the grid to place the ' + PARTS[type].name.toLowerCase() + ' (or move it with the arrow keys and press Enter). Esc cancels.'); }
    else status(HINT);
    renderTray();
  }
  const disarm = () => { if (S.armed) arm(null); };
  function armedCell(ev) {
    const rect = board.getBoundingClientRect(), cell = rect.width / COLS, d = PARTS[S.armed];
    return { c: Math.max(0, Math.min(COLS - d.w, Math.round((ev.clientX - rect.left) / cell - d.w / 2))), r: Math.max(0, Math.min(ROWS - d.h, Math.round((ev.clientY - rect.top) / cell - d.h / 2))) };
  }
  function placeArmed(c, r) {
    const type = S.armed;
    if (place(type, c, r)) { Snd.play('click'); S.armed = null; S.cursor = null; gPreview.innerHTML = ''; status(HINT); changed(); }
    else Snd.play('buzz');
  }

  board.addEventListener('pointerdown', ev => {
    if (S.mode !== 'build') return;
    if (S.armed) { ev.preventDefault(); const k = armedCell(ev); placeArmed(k.c, k.r); return; }
    const g = ev.target.closest('.part');
    if (g) startDrag(ev, g.dataset.type, +g.dataset.uid);
  });
  board.addEventListener('pointermove', ev => { if (S.armed && S.mode === 'build' && !S.drag) { const k = armedCell(ev); S.cursor = k; preview(S.armed, k.c, k.r); } });
  board.addEventListener('pointerleave', () => { if (S.armed && !S.drag) gPreview.innerHTML = ''; });
  board.addEventListener('dblclick', ev => {
    const g = ev.target.closest('.part');
    if (g && S.mode === 'build') { S.placed = S.placed.filter(q => q.uid !== +g.dataset.uid); Snd.play('lift'); changed(); }
  });
  board.addEventListener('mouseover', ev => { const g = ev.target.closest('.part'); if (g && S.mode === 'build' && !S.armed && !S.drag) status(PARTS[g.dataset.type].info); });
  board.addEventListener('mouseout', ev => { if (ev.target.closest('.part') && S.mode === 'build' && !S.armed) status(HINT); });

  for (const id of ['trayTract', 'trayAcc']) {
    const el = $(id);
    el.addEventListener('pointerdown', ev => { const b = ev.target.closest('.tray-item'); if (b && !b.disabled) startDrag(ev, b.dataset.type, null); });
    el.addEventListener('keydown', ev => { const b = ev.target.closest('.tray-item'); if (b && !b.disabled && (ev.key === 'Enter' || ev.key === ' ')) {
      if (ev.key === 'Enter' && S.armed === b.dataset.type && S.cursor) return;      // Enter now means "place it" (handled below)
      ev.preventDefault(); ev.stopPropagation(); arm(S.armed === b.dataset.type ? null : b.dataset.type);
      if (S.armed) { S.cursor = { c: 0, r: 0 }; preview(S.armed, 0, 0); } const again = el.querySelector('[data-type="' + b.dataset.type + '"]'); if (again) again.focus(); } });
    el.addEventListener('mouseover', ev => { const b = ev.target.closest('.tray-item'); if (b && S.mode === 'build' && !S.armed && !S.drag) status(PARTS[b.dataset.type].info); });
    el.addEventListener('mouseout', () => { if (S.mode === 'build' && !S.armed) status(HINT); });
  }
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') { disarm(); return; }
    if (!S.armed || S.mode !== 'build') return;
    const d = PARTS[S.armed], k = S.cursor || { c: 0, r: 0 };
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
    if (step) { ev.preventDefault(); S.cursor = { c: Math.max(0, Math.min(COLS - d.w, k.c + step[0])), r: Math.max(0, Math.min(ROWS - d.h, k.r + step[1])) }; preview(S.armed, S.cursor.c, S.cursor.r); }
    else if (ev.key === 'Enter' && S.cursor) { ev.preventDefault(); placeArmed(S.cursor.c, S.cursor.r); }
  });

  /* ---------- running ---------- */
  const total = () => S.sim.frames.length - 1;
  function where() {                               // which organ the food is in, and how far through
    const sim = S.sim, t = Math.min(S.tick, total());
    let i = sim.segments.length - 1;
    for (let k = 0; k < sim.segments.length; k++) { const g = sim.segments[k]; if (t < g.start + g.ticks) { i = k; break; } }
    const seg = sim.segments[i], f = Math.min(1, (t - seg.start) / seg.ticks), part = sim.path[i];
    const local = Art.route(seg.type, f);
    return { i, seg, f, part, x: part.c * U + local[0], y: part.r * U + local[1], frame: sim.frames[Math.min(total(), Math.floor(t))] };
  }
  function colourAt(i, f) {
    const sim = S.sim, food = FOODS[sim.food], hasCal = sim.pctCal != null;
    let col = food.color;
    for (let k = 0; k <= i; k++) {
      const t = sim.path[k].type, g = k < i ? 1 : f;
      if (t === 'stomach') col = mix(col, hasCal ? CHYME : food.color, g);
      else if (t === 'small') col = mix(col, hasCal ? '#b9985a' : food.color, g * 0.6);
      else if (t === 'large' && hasCal) col = mix(col, BROWN, g);
    }
    return col;
  }

  function play() {
    if (S.mode === 'done') reset();
    if (S.mode === 'build') {
      const sim = M.simulate(S.placed, S.food);
      if (!sim.ok) { status('There is no mouth on the grid yet. Food has to get in somewhere!'); Snd.play('buzz'); return; }
      disarm();
      Object.assign(S, { sim, mode: 'run', tick: 0, endT: 0, seg: -1, particles: [], drops: [], timers: {}, clock: 0 });
      $('summary').hidden = true; $('trays').hidden = false;
    }
    S.playing = true;
    refresh();
  }
  function pause() { S.playing = false; board.classList.remove('chewing'); renderControls(); }
  function reset() {
    Object.assign(S, { mode: 'build', sim: null, playing: false, tick: 0, endT: 0, particles: [] });
    board.classList.remove('chewing'); gFx.innerHTML = ''; $('summary').hidden = true; $('trays').hidden = false;
    status(HINT); renderTable(); refresh();
  }

  /* fire fn every `gap` seconds of animation time */
  function every(name, gap, dt, fn) { S.timers[name] = (S.timers[name] || 0) + dt; if (S.timers[name] >= gap) { S.timers[name] = 0; fn(); } }
  function particle(x0, y0, x1, y1, color, r) { if (S.particles.length < 90) S.particles.push({ x0, y0, x1, y1, color, r: r || 5, age: 0, dur: 0.75 }); }

  function advance(dt) {                           // dt in seconds of real time
    if (S.mode !== 'run' || !S.playing) return;
    const speed = S.fast ? FAST : 1, sdt = dt * speed;
    S.clock += dt;
    for (const p of S.particles) p.age += sdt;
    S.particles = S.particles.filter(p => p.age < p.dur);

    if (S.tick < total()) {
      const before = where().frame;
      S.tick = Math.min(total(), S.tick + sdt * TICKS_PER_SECOND);
      const w = where(), type = w.seg.type;
      if (w.i !== S.seg) {                          // just entered a new organ
        S.seg = w.i; S.timers = {};
        status(FOODS[S.sim.food].icon + ' ' + w.seg.notes.join(' '));
        Snd.play({ esophagus: 'gulp', stomach: 'gurgle', small: 'squelch', large: 'rumble', anus: 'squeeze' }[type]);
      }
      const chewing = type === 'mouth' && w.f >= Art.CHEW_FROM && w.f < Art.CHEW_TO;
      board.classList.toggle('chewing', chewing);
      if (chewing) every('snd', 0.27, dt, () => Snd.play('chew'));
      else if (type === 'esophagus') every('snd', 0.45, dt, () => Snd.play('squeeze'));
      else if (type === 'stomach') every('snd', 0.8, dt, () => Snd.play('gurgle'));
      else if (type === 'small') every('snd', 1.0, dt, () => Snd.play('squelch'));
      else if (type === 'large') every('snd', 1.1, dt, () => Snd.play('rumble'));

      /* droplets of digestive juice from each working gland to the food */
      if (type !== 'mouth' || w.f >= Art.CHEW_FROM) {
        every('juice', 0.3, sdt, () => { for (const a of w.seg.secretors) { const [x, y] = centre(a); particle(x, y, w.x, w.y, JUICE[a.type], 5); } });
      }
      /* dots of absorbed nutrient from the food to a capillary or lymphatic vessel */
      every('absorb', 0.11, sdt, () => {
        const now = w.frame, pick = list => centre(list[Math.floor(Math.random() * list.length)]);
        const go = (list, key, col) => { if (list.length && now[key] - before[key] > 0.004) { const [x, y] = pick(list); particle(w.x, w.y, x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30, col, 4.5); return true; } return false; };
        let any = go(w.seg.blood, 'A_su', COLOR.su); any = go(w.seg.blood, 'A_aa', COLOR.aa) || any;
        any = go(w.seg.blood, 'A_w', COLOR.w) || any; any = go(w.seg.lymph, 'A_fy', COLOR.fy) || any;
        if (any) every('blip', 0.35, 0.11, () => Snd.play('absorb'));
      });
      updateNumbers(w.frame);
      if (S.tick >= total()) startEnding();
    } else {
      S.endT += sdt;
      if (S.endT >= END_SECONDS) finish();
    }
  }
  function updateNumbers(frame) {
    for (const n of NUTRIENTS) {
      const a = $('analysis').querySelector('[data-now="' + n[0] + '"]'), b = $('analysis').querySelector('[data-abs="' + n[0] + '"]');
      if (a) a.textContent = fmt(frame[n[0]]);
      if (b && n[3]) b.textContent = fmt(frame[n[3]]);
    }
  }
  function startEnding() {
    const r = S.sim;
    board.classList.remove('chewing');
    S.drops = Array.from({ length: 18 }, () => ({ vx: 50 + Math.random() * 190, vy: -230 + Math.random() * 280, r: 5 + Math.random() * 8 }));
    Snd.play(r.outcome === 'spill' ? 'spill' : r.stool === 'solid' ? 'plop' : 'splat');
    status(r.outcome === 'spill' ? 'The tube ends here, so everything spills out!' : r.stool === 'solid' ? 'Out it comes.' : 'Uh oh…');
  }
  function finish() {
    S.mode = 'done'; S.playing = false;
    updateNumbers(S.sim.frames[total()]);
    showSummary();
    Snd.play({ healthy: 'win', 'solid-problems': 'meh', diarrhea: 'lose', spill: 'lose' }[S.sim.outcome]);
    refresh();
  }

  /* ---------- drawing the food ---------- */
  const CRUMBS = [[0, 0], [0.9, 0.2], [-0.8, 0.4], [0.3, -0.9], [-0.4, -0.7], [0.6, 0.8], [-0.7, -0.2], [0.1, 0.6], [-0.2, 0.95]];
  function drawFx() {
    if (!S.sim || S.mode === 'build') { gFx.innerHTML = ''; return; }
    const w = where(), sim = S.sim, food = FOODS[sim.food], type = w.seg.type, f = w.f, fr = w.frame, I = sim.initial;
    const mass = (fr.cc + fr.su + fr.pr + fr.aa + fr.fa + fr.fy + fr.w) / Math.max(1, I.cc + I.su + I.pr + I.fa + I.w);
    const scale = 0.55 + 0.45 * Math.sqrt(Math.max(0, mass)), col = colourAt(w.i, f), wet = I.w ? fr.w / I.w : 0;
    let out = '';
    const halo = r => { out += '<circle cx="' + w.x.toFixed(1) + '" cy="' + w.y.toFixed(1) + '" r="' + r + '" fill="#fff7c2" opacity="0.55" stroke="#e0a52a" stroke-width="2" stroke-dasharray="5 5"/>'; };
    const crumbs = (n, spread, r) => {
      for (let i = 0; i < n; i++) {
        const wob = S.clock * 5 + i * 1.7;
        out += '<circle cx="' + (w.x + CRUMBS[i][0] * spread + Math.sin(wob) * spread * 0.18).toFixed(1) + '" cy="' + (w.y + CRUMBS[i][1] * spread + Math.cos(wob * 1.3) * spread * 0.18).toFixed(1)
          + '" r="' + r.toFixed(1) + '" fill="' + col + '" stroke="' + mix(col, '#000000', 0.35) + '" stroke-width="1.5"/>';
      }
    };
    const emoji = (x, y, size, ch) => '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + size.toFixed(1) + '" text-anchor="middle" dominant-baseline="central">' + ch + '</text>';

    if (S.tick < total()) {
      if (type === 'mouth') {
        if (f < Art.CHEW_FROM) out += emoji(w.x, w.y, 58, food.icon);
        else if (f < Art.CHEW_TO) { const k = (f - Art.CHEW_FROM) / (Art.CHEW_TO - Art.CHEW_FROM); if (k < 0.8) out += emoji(w.x, w.y, 58 * (1 - k), food.icon); crumbs(Math.ceil(9 * k), 22, 5.5); }
        else { halo(24); crumbs(9, 7, 6); }
      } else if (type === 'stomach') { halo(34); crumbs(9, 7 + 15 * Math.min(1, f * 5, (1 - f) * 7), 7.5 * scale); }
      else if (type === 'large') { halo(28); crumbs(9, wet > 0.25 ? 11 : 6.5, (wet > 0.25 ? 6 : 7.5) * scale); }
      else { halo(24); crumbs(9, 7, 6.5 * scale); }
    } else {
      /* the ending: a neat deposit, or a spray */
      const p = sim.path[sim.path.length - 1], d = PARTS[p.type], t = S.endT;
      const ex = p.type === 'anus' ? (p.c + 1) * U - 6 : (p.c + d.w) * U, ey = (p.r + (d.out == null ? 0 : d.out)) * U + 50;
      if (sim.outcome !== 'spill' && sim.stool === 'solid') {
        const k = Math.min(1, t / 0.6), bounce = Math.abs(Math.sin(Math.max(0, t - 0.6) * 9)) * 14 * Math.exp(-(Math.max(0, t - 0.6)) * 4);
        out += emoji(ex + 16 + 34 * k, ey + 62 * k * k - bounce, sim.pctCal == null ? 34 : 54, sim.pctCal == null ? '💧' : '💩');
      } else {
        const grow = Math.min(1, t / 1.1);
        out += '<ellipse cx="' + (ex + 70) + '" cy="' + (ey + 128) + '" rx="' + (95 * grow).toFixed(1) + '" ry="' + (16 * grow).toFixed(1) + '" fill="' + col + '" opacity="0.85"/>';
        for (const dr of S.drops) {
          const y = ey + dr.vy * t + 250 * t * t;
          if (y < ey + 126) out += '<circle cx="' + (ex + dr.vx * t).toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + dr.r.toFixed(1) + '" fill="' + col + '" stroke="' + mix(col, '#000000', 0.35) + '" stroke-width="1.5"/>';
        }
      }
    }
    for (const q of S.particles) {
      const k = q.age / q.dur, e = k * k * (3 - 2 * k);
      out += '<circle cx="' + (q.x0 + (q.x1 - q.x0) * e).toFixed(1) + '" cy="' + (q.y0 + (q.y1 - q.y0) * e - Math.sin(k * Math.PI) * 14).toFixed(1) + '" r="' + q.r + '" fill="' + q.color + '" stroke="rgba(0,0,0,.45)" stroke-width="1.2" opacity="' + (1 - k * 0.4).toFixed(2) + '"/>';
    }
    gFx.innerHTML = out;
  }

  /* ---------- the report ---------- */
  function showSummary() {
    const r = S.sim, food = FOODS[r.food], water = r.pctCal == null;
    const head = {
      healthy: ['ok', water ? '✅ Healthy: the water was absorbed' : '✅ Healthy digestion: solid stool'],
      'solid-problems': ['warn', water ? '⚠️ The water was absorbed, but the build has problems' : '⚠️ Solid stool, but the build has problems'],
      diarrhea: ['bad', r.stool === 'watery' ? '💩💦 Diarrhea! Watery stool' : '💩💦 Diarrhea! Loose stool'],
      spill: ['bad', '💥 Spill! The tract is not finished']
    }[r.outcome];
    const pc = v => Math.round(v) + '%';
    let h = '<h3>' + head[1] + '</h3><p>' + food.icon + ' ' + food.name + ': the system absorbed '
      + (water ? '' : '<b>' + pc(r.pctCal) + '</b> of the available Calories and ') + '<b>' + pc(r.pctWater) + '</b> of the water.</p>';
    if (r.why) h += '<p>' + r.why + '</p>';
    h += '<div class="bars">' + [['carb', 'Carbohydrate', COLOR.su], ['protein', 'Protein', COLOR.pr], ['fat', 'Fat', COLOR.fa], ['water', 'Water', COLOR.w]]
      .filter(g => r.groups[g[0]] != null).map(g => '<span>' + g[1] + '</span><span class="track"><span class="fill" style="display:block;width:' + Math.max(0, Math.min(100, r.groups[g[0]])).toFixed(1) + '%;background:' + g[2] + '"></span></span><span>' + pc(r.groups[g[0]]) + ' absorbed</span>').join('') + '</div>';
    const rank = { major: 0, minor: 1 };
    const probs = r.findings.filter(f => f.level !== 'info').sort((a, b) => rank[a.level] - rank[b.level]), info = r.findings.filter(f => f.level === 'info');
    const item = f => '<li><b>' + f.title + '</b>' + (f.level !== 'info' ? '<span class="tag ' + f.level + '">' + (f.level === 'major' ? 'serious' : 'minor') + '</span>' : '') + '<br>' + f.text + (f.note ? '<i>' + f.note + '</i>' : '') + '</li>';
    if (probs.length) h += '<h4>What went wrong</h4><ol>' + probs.map(item).join('') + '</ol>';
    if (info.length) h += '<h4>Parts doing nothing</h4><ul>' + info.map(item).join('') + '</ul>';
    h += '<div class="actions"><button class="btn primary" data-act="build">' + (probs.length ? 'Fix the build' : 'Back to the build') + '</button><button class="btn" data-act="again">Run it again</button></div>';
    const el = $('summary');
    el.className = 'summary ' + head[0]; el.innerHTML = h; el.hidden = false; $('trays').hidden = true;
    if (!MANUAL && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  $('summary').addEventListener('click', ev => {
    const act = ev.target.dataset && ev.target.dataset.act;
    if (act === 'build') reset(); else if (act === 'again') play();
  });

  /* ---------- buttons ---------- */
  $('btnPlay').addEventListener('click', play);
  $('btnPause').addEventListener('click', pause);
  $('btnReset').addEventListener('click', reset);
  $('btnFast').addEventListener('click', () => { S.fast = !S.fast; renderControls(); });
  $('btnHelp').addEventListener('click', () => $('help').showModal());
  let clearArmed = 0;
  $('btnClear').addEventListener('click', () => {
    if (!S.placed.length) return;
    if (Date.now() - clearArmed < 3000) { S.placed = []; clearArmed = 0; $('btnClear').textContent = 'Clear board'; disarm(); changed(); return; }
    clearArmed = Date.now(); $('btnClear').textContent = 'Click again to clear';
    setTimeout(() => { $('btnClear').textContent = 'Clear board'; }, 3000);
  });
  function setSound(on) { Snd.setEnabled(on); $('btnSound').textContent = on ? '🔊 Sound on' : '🔇 Sound off'; $('btnSound').setAttribute('aria-pressed', on); store.set('dsb-sound', on ? '1' : '0'); }
  $('btnSound').addEventListener('click', () => { setSound(!Snd.enabled); Snd.play('click'); });
  $('foods').addEventListener('click', ev => {
    const b = ev.target.closest('.food'); if (!b || b.disabled) return;
    if (S.mode === 'done') reset();
    S.food = b.dataset.food; store.set('dsb-food', S.food); renderFoods(); renderTable();
  });

  /* ---------- start up ---------- */
  try {
    for (const [type, c, r] of JSON.parse(store.get('dsb-layout') || '[]')) place(type, c, r);
  } catch (e) { S.placed = []; }
  if (FOODS[store.get('dsb-food')]) S.food = store.get('dsb-food');
  setSound(store.get('dsb-sound') !== '0');
  status(HINT); renderTable(); refresh();

  let last = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    if (!MANUAL) advance(dt);
    drawFx();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* for the tests and for curious teachers (open the browser console and type DSB.loadExample()) */
  self.DSB = {
    S, place: (t, c, r) => { const ok = place(t, c, r); changed(); return ok; },
    clear() { S.placed = []; changed(); },
    loadExample() { reset(); S.placed = []; for (const [t, c, r] of D.EXAMPLE) place(t, c, r); changed(); },
    setFood(id) { if (S.mode !== 'build') reset(); S.food = id; renderFoods(); renderTable(); },
    play, pause, reset, advance, drawFx,
    finish() { let n = 0; if (S.mode !== 'run') play(); S.playing = true; while (S.mode === 'run' && n++ < 20000) advance(0.05); drawFx(); return S.sim; }
  };
})();
