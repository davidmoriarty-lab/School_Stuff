/* lab.js: the lab bench. Holds the state of every container, lets you drag equipment onto other
 * equipment, and runs the clock (pouring, dissolving, stirring, the pH probe settling).
 *
 * How a drag works:
 *   1. You drag an item (say the acid bottle) and let go over a target (say the 50 mL cylinder).
 *   2. drop(item, target) looks the pair up in RULES. If the pair makes sense it starts an "operation":
 *      the bottle tips over the cylinder and the action bar under the bench shows what you can do
 *      (hold to pour, done...).
 *   3. tick() runs about 60 times a second. While you hold the pour button it moves liquid from the
 *      source to the target, a little each frame, faster the longer you hold.
 * Nothing on the bench tells you a volume or a mass directly: you read the meniscus in the zoom
 * window and the mass on the balance, like in the real lab.
 */
(function () {
  'use strict';
  const C = window.BufChem, G = window.BufGlass;
  const $ = (s, el) => (el || document).querySelector(s);
  const svg = $('#scene'), layer = $('#items'), bar = $('#actionbar'), tipEl = $('#tip');
  const BENCH = 640, SHELF = 200, BOAT_MASS = 1.52, DROP = 0.05;
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ---------- where everything lives ---------- */
  const IT = {
    acid: { x: 95, y: SHELF, w: 84, h: 150, drag: 1, name: 'acetic acid bottle', mouth: [0, -150] },
    naoh: { x: 205, y: SHELF, w: 84, h: 150, drag: 1, name: 'NaOH bottle', mouth: [0, -150] },
    jar: { x: 320, y: SHELF, w: 92, h: 104, name: 'sodium acetate jar' },
    hcl: { x: 415, y: SHELF, w: 46, h: 100, drag: 1, name: 'HCl dropper bottle' },
    scoop: { x: 525, y: SHELF, w: 114, h: 30, drag: 1, name: 'scoop' },
    dropper: { x: 630, y: SHELF - 8, w: 34, h: 122, drag: 1, name: 'dropper' },
    rod: { x: 760, y: SHELF, w: 154, h: 26, drag: 1, name: 'stirring rod' },
    balance: { x: 120, y: BENCH, w: 190, h: 72, name: 'balance' },
    boat: { x: 250, y: BENCH, w: 70, h: 30, drag: 1, name: 'weigh boat' },
    cyl50: { x: 335, y: BENCH, w: 70, h: 326, drag: 1, name: '50 mL graduated cylinder', mouth: [-25, -323], cap: 50 },
    cyl100: { x: 425, y: BENCH, w: 80, h: 406, drag: 1, name: '100 mL graduated cylinder', mouth: [-30, -403], cap: 100 },
    b1: { x: 560, y: BENCH, w: 124, h: 156, drag: 1, name: 'Buffer 1 beaker' },
    b2: { x: 720, y: BENCH, w: 124, h: 156, drag: 1, name: 'Buffer 2 beaker' },
    rinse: { x: 850, y: BENCH, w: 72, h: 86, name: 'rinse beaker' },
    probe: { x: 850, y: BENCH - 10, w: 30, h: 132, drag: 1, name: 'pH probe' },
    meter: { x: 950, y: BENCH, w: 114, h: 86, name: 'pH meter' },
    sink: { x: 1100, y: BENCH, w: 172, h: 124, name: 'sink' },
    boatHome: { x: 250, y: BENCH, w: 80, h: 34, name: 'bench' }
  };
  const ORDER = ['sink', 'meter', 'balance', 'jar', 'acid', 'naoh', 'hcl', 'rinse', 'b1', 'b2', 'probe', 'cyl100', 'cyl50', 'boat', 'scoop', 'rod', 'dropper'];
  const RULES = {
    acid: ['cyl50', 'cyl100', 'b1', 'b2'], naoh: ['cyl50', 'cyl100', 'b1', 'b2'], hcl: ['b1', 'b2'],
    cyl50: ['cyl100', 'b1', 'b2', 'sink'], cyl100: ['cyl50', 'b1', 'b2', 'sink'], b1: ['sink'], b2: ['sink'],
    dropper: ['acid', 'naoh', 'cyl50', 'cyl100', 'b1', 'b2', 'sink'], scoop: ['jar', 'boat', 'b1', 'b2', 'sink'],
    boat: ['balance', 'b1', 'b2', 'sink', 'boatHome'], rod: ['b1', 'b2'], probe: ['b1', 'b2', 'rinse']
  };
  const isBeaker = (id) => id === 'b1' || id === 'b2', isCyl = (id) => id === 'cyl50' || id === 'cyl100', isStock = (id) => id === 'acid' || id === 'naoh' || id === 'hcl';

  /* ---------- the state of the lab ---------- */
  let S;
  function fresh() {
    const water = C.addLiquid(C.empty(), 'water', 60);
    S = {
      goggles: S ? S.goggles : false,
      cont: { cyl50: C.empty(), cyl100: C.empty(), b1: C.empty(), b2: C.empty(), dropper: C.empty(), rinse: water },
      bk: { b1: { mixed: true, stirT: 0 }, b2: { mixed: true, stirT: 0 } },
      stock: { acid: 250, naoh: 250, hcl: 30, jar: 50 },
      scoop: 0, boat: { loc: 'bench', solid: 0 }, bal: { tare: 0, shown: 0 },
      probe: { loc: 'rinse', reading: 7.0, off: rand(-0.01, 0.01), stable: false, still: 0, t: 0 },
      last: { b1: null, b2: null }, flags: { weighed: false, naohMeasured: false, usedCylAcid: false },
      op: null, sel: null, zoom: 'cyl50', spilled: 0
    };
  }
  fresh();

  /* ---------- drawing ---------- */
  const els = {};
  function build() {
    layer.innerHTML = '';
    for (const id of ORDER) { const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'item' + (IT[id].drag ? ' drag' : '')); g.dataset.id = id; g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', IT[id].name); g.innerHTML = '<title>' + IT[id].name.charAt(0).toUpperCase() + IT[id].name.slice(1) + (IT[id].drag ? ' (drag me)' : '') + '</title><rect class="hit" x="' + (-IT[id].w / 2) + '" y="' + (-IT[id].h) + '" width="' + IT[id].w + '" height="' + IT[id].h + '" fill="transparent"/><g class="art"></g>'; layer.appendChild(g); els[id] = g; }   // the hit box stays put; only the picture inside is redrawn
    drawAll();
  }
  function art(id) {
    switch (id) {
      case 'acid': return G.bottle({ l1: '0.83 M', l2: 'HC₂H₃O₂', l3: 'acetic acid (vinegar)', l4: 'irritant', frac: S.stock.acid / 250, band: '#c2410c' });
      case 'naoh': return G.bottle({ l1: '0.50 M', l2: 'NaOH', l3: 'sodium hydroxide', l4: 'corrosive', frac: S.stock.naoh / 250, band: '#1f5f8b', glass: 'rgba(235,240,245,.75)', cap: '#1f5f8b' });
      case 'jar': return G.jar(S.stock.jar / 50);
      case 'hcl': return G.dropBottle();
      case 'scoop': return G.scoop(S.scoop);
      case 'dropper': return G.dropper(S.cont.dropper.vol);
      case 'rod': return G.rod();
      case 'balance': return G.balance(balText(), true);
      case 'boat': return G.boat(S.boat.solid);
      case 'cyl50': return G.cylinder(50, S.cont.cyl50.vol);
      case 'cyl100': return G.cylinder(100, S.cont.cyl100.vol);
      case 'b1': return G.beaker(250, S.cont.b1, { label: 'Buffer 1', swirl: S.op && S.op.type === 'stir' && S.op.dst === 'b1' });
      case 'b2': return G.beaker(250, S.cont.b2, { label: 'Buffer 2', swirl: S.op && S.op.type === 'stir' && S.op.dst === 'b2' });
      case 'rinse': return G.beaker(100, S.cont.rinse) + '<text x="0" y="-30" font-size="7.5" text-anchor="middle" fill="#1d3344">distilled</text><text x="0" y="-21" font-size="7.5" text-anchor="middle" fill="#1d3344">water</text>';
      case 'probe': return G.probe();
      case 'meter': return G.meter(phText(), phSub());
      case 'sink': return G.sink();
    }
    return '';
  }
  /* where an item sits right now: its home, or tipped over a target while an operation is running */
  function pose(id) {
    const o = S.op, it = IT[id];
    if (id === 'boat') return S.boat.loc === 'pan' ? { x: IT.balance.x, y: BENCH - 64, a: 0 } : { x: it.x, y: it.y, a: 0 };
    if (id === 'probe') { const l = S.probe.loc; return l === 'rinse' ? { x: it.x, y: it.y, a: 0 } : { x: IT[l].x + 30, y: BENCH - 12, a: 0 }; }
    if (o && o.src === id) {
      const d = o.dst, m = mouthOf(d);
      if (o.type === 'pour') { const deg = (isStock(id) && d === 'cyl50') ? 100 : -100, th = deg * Math.PI / 180, lx = it.mouth[0], ly = it.mouth[1]; return { x: m.x - (lx * Math.cos(th) - ly * Math.sin(th)), y: m.y - (lx * Math.sin(th) + ly * Math.cos(th)), a: deg }; }   // bottles tip in from the left over the 50 mL cylinder so they do not hide the 100 mL one
      if (o.type === 'dropper') return { x: m.x, y: m.y + (isStock(d) ? 100 : -4), a: 0 };   // in a stock bottle the tip goes down into the liquid
      if (o.type === 'hcl') { const th = -125 * Math.PI / 180; return { x: m.x - 98 * Math.sin(th), y: m.y - 8 + 98 * Math.cos(th), a: -125 }; }   // dropper tip just above the rim
      if (o.type === 'scoop') return { x: m.x - 34, y: m.y - 26, a: 22 };
      if (o.type === 'stir') return { x: IT[d].x - 4 + Math.sin(o.t * 9) * 16, y: BENCH - 70, a: 72 + Math.sin(o.t * 9) * 5 };
    }
    return { x: it.x, y: it.y, a: 0 };
  }
  function mouthOf(id) {
    if (id === 'boat') { const p = pose('boat'); return { x: p.x, y: p.y - 14 }; }
    const it = IT[id];
    if (isCyl(id)) return { x: it.x, y: BENCH - G.CYL[it.cap].h - 10 };
    if (isBeaker(id)) return { x: it.x + 14, y: BENCH - 160 };
    if (isStock(id)) return { x: it.x, y: it.y - 150 };
    return { x: it.x, y: it.y - it.h };
  }
  function place(id) { const p = S.dragging === id && S.dragPos ? S.dragPos : pose(id); els[id].setAttribute('transform', 'translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ') rotate(' + (p.a || 0).toFixed(1) + ')'); if (id === 'probe') cable(p); }
  function cable(p) { const x0 = IT.meter.x + 30, y0 = BENCH - 84, x1 = p.x, y1 = p.y - 128; $('#cable').setAttribute('d', 'M' + x0 + ' ' + y0 + ' C' + x0 + ' ' + (y0 - 90) + ' ' + x1 + ' ' + (y1 - 110) + ' ' + x1 + ' ' + y1); }
  function draw(id) { els[id].lastChild.innerHTML = art(id); place(id); els[id].classList.toggle('sel', S.sel === id); }
  function drawAll() { for (const id of ORDER) draw(id); drawZoom(); renderBar(); $('#boatSpot').style.display = S.boat.loc === 'pan' ? '' : 'none'; }
  function drawZoom() {
    const id = S.zoom, cap = IT[id].cap; $('#zoomSvg').innerHTML = G.zoomCylinder(cap, S.cont[id].vol);
    $('#zoomTitle').textContent = cap + ' mL cylinder, at eye level';
    document.querySelectorAll('#zoomPick button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.z === id)));
  }
  const balGross = () => (S.boat.loc === 'pan' ? BOAT_MASS + S.boat.solid : 0);
  function balText() { const v = S.bal.shown; return (Math.abs(v) < 0.005 ? 0 : v).toFixed(2) + ' g'; }
  function phText() { const p = S.probe; if (p.loc !== 'rinse' && S.cont[p.loc].vol < 25) return '--.--'; return p.reading.toFixed(2); }
  function phSub() { const p = S.probe; if (p.loc === 'rinse') return 'probe in rinse water'; if (S.cont[p.loc].vol < 25) return 'probe tip not covered'; return p.stable ? '● reading stable' : '~ settling…'; }
  /* ---------- messages and the action bar ---------- */
  function tip(msg, kind) { tipEl.textContent = msg; tipEl.className = 'tip ' + (kind || ''); }
  function renderBar() {
    const o = S.op; let h = '';
    const B = (k, label, cls) => '<button type="button" class="btn ' + (cls || '') + '" data-b="' + k + '">' + label + '</button>';
    if (!o) h = '<span class="idle">Drag a piece of equipment onto another one. On a touch screen you can also tap an item, then tap where it goes.</span>';
    else if (o.type === 'pour') h = '<b>' + cap1(IT[o.src].name) + ' → ' + IT[o.dst].name + '</b><button type="button" class="btn primary hold" id="holdBtn">Hold to pour</button>' + (isCyl(o.src) ? B('all', 'Pour it all in') : '') + B('done', 'Done');
    else if (o.type === 'dropper') h = '<b>Dropper at the ' + IT[o.dst].name + '</b>' + B('draw', 'Draw up 1 mL') + (isStock(o.dst) ? '' : B('drop', 'Add 1 drop') + B('half', 'Add 0.5 mL')) + B('done', 'Done') + '<span class="mini">dropper holds ' + S.cont.dropper.vol.toFixed(1) + ' of 3 mL</span>';
    else if (o.type === 'hcl') h = '<b>1.0 M HCl → ' + IT[o.dst].name + '</b>' + B('h1', 'Add 1 drop') + B('h20', 'Add 1.00 mL (20 drops)') + B('done', 'Done');
    else if (o.type === 'scoop') h = '<b>Scoop over the weigh boat</b>' + B('tap', 'Tap a little in') + B('shake', 'Shake some in') + B('dumpS', 'Tip it all in') + B('take', 'Take a little out') + B('done', 'Done');
    else if (o.type === 'stir') h = '<b>Stirring the ' + IT[o.dst].name + '…</b>' + B('done', 'Take the rod out');
    else if (o.type === 'dump') h = '<b>Empty the ' + IT[o.src].name + ' into the sink and rinse it?</b> You will have to make that buffer again.' + B('yes', 'Yes, empty it', 'danger') + B('done', 'Cancel');
    bar.innerHTML = h;
  }
  const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------- moving matter around ---------- */
  function noteAdd(dst, wasVol) { if (isBeaker(dst) && (wasVol > 1 || S.cont[dst].solid > 0)) { S.bk[dst].mixed = false; S.bk[dst].stirT = 0; } if (isBeaker(dst)) S.last[dst] = null; }
  function overflow(dst) {
    const max = isCyl(dst) ? G.CYL[IT[dst].cap].max : isBeaker(dst) ? 300 : dst === 'dropper' ? 3 : 1e9, m = S.cont[dst];
    if (m.vol > max) { C.transfer(m, C.empty(), m.vol - max); if (!S.spillNote || Date.now() - S.spillNote > 3000) { tip('It overflowed! Some solution spilled on the bench. Pour slowly near the top.', 'bad'); S.spillNote = Date.now(); } S.spilled++; }
  }
  /* move mL from src to dst; returns what actually moved */
  function moveLiquid(src, dst, mL) {
    let moved;
    if (isStock(src)) { moved = Math.min(mL, S.stock[src]); if (moved <= 0) return 0; S.stock[src] -= moved; if (dst !== 'sink') { const was = S.cont[dst].vol; C.addLiquid(S.cont[dst], src, moved); noteAdd(dst, was); } }
    else { const from = S.cont[src]; if (dst === 'sink') moved = C.transfer(from, C.empty(), mL); else { const was = S.cont[dst].vol; moved = C.transfer(from, S.cont[dst], mL); if (moved > 0) noteAdd(dst, was); } if (isBeaker(src)) S.last[src] = null; }
    if (dst !== 'sink') overflow(dst);
    if (isCyl(dst) && S.cont[dst].vB >= 5) S.flags.naohMeasured = true;
    if (isCyl(src) && isBeaker(dst) && S.cont[dst].vA >= 20) S.flags.usedCylAcid = true;
    return moved;
  }
  function addSolid(dst, g) { const m = S.cont[dst]; m.solid += g; m.gSolid += g; if (m.vol > 0) { S.bk[dst].mixed = false; S.bk[dst].stirT = 0; } S.last[dst] = null; }

  /* ---------- what happens when item lands on target ---------- */
  function drop(item, target) {
    if (!S.goggles) { tip('Put your safety goggles on first.', 'bad'); return false; }
    if (!(RULES[item] || []).includes(target)) { tip('The ' + IT[item].name + ' has nothing to do at the ' + IT[target].name + '.', 'bad'); return false; }
    endOp(true); S.sel = null;
    if (isCyl(item)) S.zoom = item; else if (isCyl(target)) S.zoom = target;
    if (item === 'acid' || item === 'naoh') { if (S.stock[item] <= 0) tip('That bottle is empty. Use “Reset the lab” to restock.', 'bad'); else { S.op = { type: 'pour', src: item, dst: target, t: 0, hold: false }; tip(isBeaker(target) ? 'Pouring straight into the beaker: its marks are only good to ±5 %. A graduated cylinder is far more accurate.' : 'Hold the button to pour. It starts slowly and speeds up. Stop a little below the line, then finish with the dropper.'); } }
    else if (item === 'hcl') { S.op = { type: 'hcl', src: 'hcl', dst: target }; tip('Stress test: add strong acid and watch how far the pH moves. Stir, then measure.'); }
    else if (isCyl(item)) {
      if (S.cont[item].vol <= 0) tip('That cylinder is empty.', 'bad');
      else if (target === 'sink') { moveLiquid(item, 'sink', 1e9); tip('Cylinder emptied into the sink and rinsed.'); }
      else { S.op = { type: 'pour', src: item, dst: target, t: 0, hold: false }; tip('Hold to pour, or pour it all in.'); }
    }
    else if (isBeaker(item)) { S.op = { type: 'dump', src: item, dst: 'sink' }; }
    else if (item === 'dropper') {
      if (target === 'sink') { C.transfer(S.cont.dropper, C.empty(), 9); tip('Dropper emptied and rinsed.'); }
      else { S.op = { type: 'dropper', src: 'dropper', dst: target }; tip(isStock(target) ? 'Draw some up, then drag the dropper to the cylinder to add it drop by drop.' : 'One drop is about 0.05 mL. You can also draw liquid up to take a little out.'); }
    }
    else if (item === 'scoop') {
      if (target === 'jar') { if (S.scoop > 0.004) tip('Never put chemicals back in the stock jar: it contaminates it. Use the sink/waste for extra.', 'bad'); else { const g = Math.min(S.stock.jar, rand(0.9, 1.7)); S.stock.jar -= g; S.scoop = g; tip('Scoop loaded. Drag it over the weigh boat.'); } }
      else if (target === 'boat') { S.op = { type: 'scoop', src: 'scoop', dst: 'boat' }; tip(S.boat.loc === 'pan' ? 'Watch the balance while you add solid.' : 'The weigh boat is not on the balance, so you cannot see the mass.'); }
      else if (target === 'sink') { S.scoop = 0; tip('Extra solid discarded.'); }
      else { if (S.scoop <= 0.004) tip('The scoop is empty.', 'bad'); else { addSolid(target, S.scoop); S.scoop = 0; tip('Solid added straight from the scoop. Did you know its mass? The procedure says to mass it in a weigh boat first.', 'bad'); } }
    }
    else if (item === 'boat') {
      if (target === 'balance') { S.boat.loc = 'pan'; tip('Weigh boat on the balance. Press TARE to zero it before adding solid.'); }
      else if (target === 'boatHome') { S.boat.loc = 'bench'; }
      else if (target === 'sink') { S.boat.solid = 0; S.boat.loc = 'bench'; tip('Solid discarded.'); }
      else { if (S.boat.solid <= 0.004) tip('The weigh boat is empty.', 'bad'); else { addSolid(target, S.boat.solid); S.boat.solid = 0; S.boat.loc = 'bench'; tip('Solid added to the beaker. Stir until it has all dissolved.'); } }
    }
    else if (item === 'rod') { if (S.cont[target].vol < 5) tip('There is nothing in that beaker to stir.', 'bad'); else { S.op = { type: 'stir', src: 'rod', dst: target, t: 0 }; tip('Stirring…'); } }
    else if (item === 'probe') {
      const from = S.probe.loc; if (from === target) return true;
      if (target !== 'rinse' && from !== 'rinse') { S.probe.off += rand(-0.02, 0.02); tip('Technique: rinse the probe in distilled water between solutions so one does not contaminate the next.', 'bad'); }
      else if (target === 'rinse') { S.probe.off = rand(-0.01, 0.01); tip('Probe rinsed.'); } else tip('Wait for the reading to settle before you record it.');
      S.probe.loc = target; S.probe.stable = false; S.probe.still = 0;
    }
    drawAll(); return true;
  }
  function endOp(quiet) { if (!S.op) return; S.op = null; stream(null); if (!quiet) drawAll(); }

  /* buttons in the action bar */
  function act(k) {
    const o = S.op; if (!o) return;
    if (k === 'done') { endOp(); return; }
    if (o.type === 'pour' && k === 'all') { moveLiquid(o.src, o.dst, 1e9); endOp(); tip('Poured.'); return; }
    if (o.type === 'dump' && k === 'yes') { S.cont[o.src] = C.empty(); S.bk[o.src] = { mixed: true, stirT: 0 }; S.last[o.src] = null; if (S.probe.loc === o.src) S.probe.loc = 'rinse'; endOp(); tip('Beaker emptied and rinsed.'); return; }
    if (o.type === 'dropper') {
      const d = S.cont.dropper;
      if (k === 'draw') { const room = 3 - d.vol; if (room < 0.05) tip('The dropper is full.', 'bad'); else if (isStock(o.dst)) { const v = Math.min(1, room, S.stock[o.dst]); S.stock[o.dst] -= v; C.addLiquid(d, o.dst, v); } else { if (S.cont[o.dst].vol <= 0) tip('Nothing there to draw up.', 'bad'); else { C.transfer(S.cont[o.dst], d, Math.min(1, room)); if (isBeaker(o.dst)) S.last[o.dst] = null; } } }
      else { const v = k === 'drop' ? DROP : 0.5; if (d.vol < 0.01) tip('The dropper is empty. Draw some up from a bottle first.', 'bad'); else moveLiquid('dropper', o.dst, v); }
    }
    if (o.type === 'hcl') moveLiquid('hcl', o.dst, k === 'h1' ? DROP : 1.0);
    if (o.type === 'scoop') {
      if (k === 'take') { if (S.boat.solid <= 0.004) tip('The weigh boat is empty.', 'bad'); else { const g = Math.min(S.boat.solid, rand(0.02, 0.09)); S.boat.solid -= g; S.scoop += g; } }
      else if (S.scoop <= 0.004) tip('The scoop is empty. Drag it to the sodium acetate jar to load it (empty extra into the sink first).', 'bad');
      else { const g = Math.min(S.scoop, k === 'tap' ? rand(0.01, 0.04) : k === 'shake' ? rand(0.12, 0.3) : 99); S.scoop -= g; S.boat.solid += g; if (S.scoop < 0.004) S.scoop = 0; }
    }
    drawAll();
  }
  function tare() { S.bal.tare = balGross(); tip('Balance tared: it now reads zero with whatever is on the pan.'); }

  /* ---------- the clock ---------- */
  function stream(o) {
    const el = $('#stream'); if (!o) { el.setAttribute('d', ''); return; }
    const m = mouthOf(o.dst), yb = o.dst === 'sink' ? BENCH - 20 : isCyl(o.dst) ? BENCH + G.cylLevel(IT[o.dst].cap, S.cont[o.dst].vol) : BENCH + G.beakerLevel(250, S.cont[o.dst].vol);
    el.setAttribute('d', 'M' + m.x + ' ' + (m.y + 2) + ' L' + m.x + ' ' + Math.max(m.y + 6, yb).toFixed(1));
  }
  let lastT = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; const o = S.op; const dirty = new Set();
    if (o && o.type === 'pour') {
      if (o.hold) { o.t += dt; const rate = o.t < 0.4 ? 1.2 : Math.min(14, 1.2 + (o.t - 0.4) * 7); const moved = moveLiquid(o.src, o.dst, rate * dt); stream(moved > 0 ? o : null); if (moved <= 0) { o.hold = false; tip(isStock(o.src) ? 'The bottle is empty.' : 'The cylinder is empty.'); } dirty.add(o.src); dirty.add(o.dst); }
      else { o.t = 0; stream(null); }
    }
    if (o && o.type === 'stir') { o.t += dt; const b = S.bk[o.dst]; b.stirT += dt; if (b.stirT >= 2 && S.cont[o.dst].solid <= 0) { if (!b.mixed) tip('Well mixed' + (S.cont[o.dst].gSolid > 0 ? ' and all dissolved' : '') + '. Ready to measure the pH.', 'good'); b.mixed = true; } place('rod'); }
    for (const id of ['b1', 'b2']) { const m = S.cont[id]; if (m.solid > 0 && m.vol > 0) { const stirring = o && o.type === 'stir' && o.dst === id; C.dissolve(m, (stirring ? 0.9 : 0.015) * dt); dirty.add(id); } }
    // balance display drifts to the true value like a real one settling
    const want = balGross() - S.bal.tare; if (Math.abs(want - S.bal.shown) > 0.0005) { S.bal.shown += (want - S.bal.shown) * Math.min(1, dt * 9); if (Math.abs(want - S.bal.shown) < 0.004) S.bal.shown = want; const t = $('#balText'); if (t) t.textContent = balText(); }
    if (S.boat.loc === 'pan' && S.boat.solid >= 0.5) S.flags.weighed = true;
    // the pH probe
    const p = S.probe; p.t += dt; let target;
    if (p.loc === 'rinse') target = 7.0 + p.off; else { const m = S.cont[p.loc]; target = m.vol >= 25 ? C.pH(m) + p.off : p.reading; if (m.vol >= 25 && !S.bk[p.loc].mixed) target += 0.12 * Math.sin(p.t * 1.7) + 0.06 * Math.sin(p.t * 4.3); }
    p.reading += (target - p.reading) * Math.min(1, dt * 1.6);
    const settled = Math.abs(target - p.reading) < 0.004 && (p.loc === 'rinse' || (S.bk[p.loc].mixed && S.cont[p.loc].vol >= 25 && S.cont[p.loc].solid <= 0));
    p.still = settled ? p.still + dt : 0; const st = p.still > 0.8; if (st !== p.stable) { p.stable = st; }
    if (p.stable && p.loc !== 'rinse') S.last[p.loc] = +p.reading.toFixed(2);
    const pt = $('#phText'); if (pt) { pt.textContent = phText(); $('#phSub').textContent = phSub(); }
    if (dirty.size) { dirty.forEach((id) => { if (els[id]) draw(id); }); drawZoom(); }
    if (window.BufNotebook) window.BufNotebook.sync();
    requestAnimationFrame(tick);
  }

  /* ---------- dragging ---------- */
  function pt(e) { const m = svg.getScreenCTM().inverse(); const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m); return { x: p.x, y: p.y }; }
  function box(id) { const p = id === 'boat' ? pose('boat') : IT[id], it = IT[id]; return { x0: p.x - it.w / 2 - 14, x1: p.x + it.w / 2 + 14, y0: p.y - it.h - 14, y1: p.y + 14 }; }
  function targetAt(item, p, q) {
    let best = null, bd = 1e9;
    for (const t of RULES[item] || []) { const b = box(t); for (const u of [p, q]) { if (u && u.x >= b.x0 && u.x <= b.x1 && u.y >= b.y0 && u.y <= b.y1) { const d = Math.abs(u.x - (b.x0 + b.x1) / 2); if (d < bd) { bd = d; best = t; } } } }
    return best;
  }
  let dr = null;
  svg.addEventListener('pointerdown', (e) => {
    const a = e.target.closest('[data-act]'); if (a) { if (a.dataset.act === 'tare') tare(); return; }
    const g = e.target.closest('.item, #boatSpot'); if (!g) { if (S.sel) { S.sel = null; drawAll(); } return; }
    const id = g.dataset.id; dr = { id, p0: pt(e), moved: false, off: null }; try { svg.setPointerCapture(e.pointerId); } catch (x) { /* older browsers */ }
  });
  svg.addEventListener('pointermove', (e) => {
    if (!dr) return; const p = pt(e);
    if (!dr.moved) { if (Math.hypot(p.x - dr.p0.x, p.y - dr.p0.y) < 6 || !IT[dr.id].drag) return; if (!S.goggles) { tip('Put your safety goggles on first.', 'bad'); dr = null; return; } dr.moved = true; const h = pose(dr.id); if (S.op && (S.op.src === dr.id || S.op.dst === dr.id)) endOp(); dr.off = { x: h.x - dr.p0.x, y: h.y - dr.p0.y }; S.dragging = dr.id; layer.appendChild(els[dr.id]); els[dr.id].classList.add('dragging'); (RULES[dr.id] || []).forEach((t) => els[t] && els[t].classList.add('can')); if (dr.id === 'boat' && S.boat.loc === 'pan') $('#boatSpot').classList.add('can'); }
    S.dragPos = { x: p.x + dr.off.x, y: p.y + dr.off.y, a: 0 }; place(dr.id);
    const t = targetAt(dr.id, p, { x: S.dragPos.x, y: S.dragPos.y - IT[dr.id].h / 2 }); document.querySelectorAll('.hot').forEach((x) => x.classList.remove('hot')); if (t) (els[t] || $('#boatSpot')).classList.add('hot');
  });
  function up(e) {
    if (!dr) return; const d = dr; dr = null; document.querySelectorAll('.can,.hot,.dragging').forEach((x) => x.classList.remove('can', 'hot', 'dragging'));
    if (d.moved) { const p = pt(e), t = targetAt(d.id, p, { x: S.dragPos.x, y: S.dragPos.y - IT[d.id].h / 2 }); S.dragging = null; S.dragPos = null; if (t) drop(d.id, t); else tip('Dropped on the bench: the ' + IT[d.id].name + ' goes back to its place.'); drawAll(); }
    else click(d.id);
  }
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  function click(id) {
    if (!S.goggles) { tip('Put your safety goggles on first.', 'bad'); return; }
    if (S.sel && S.sel !== id && (RULES[S.sel] || []).includes(id)) { drop(S.sel, id); return; }
    if (IT[id] && IT[id].drag) { S.sel = S.sel === id ? null : id; if (S.sel) tip(cap1(IT[id].name) + ' picked. Now tap where it should go: ' + RULES[id].map((t) => IT[t].name).join(', ') + '.'); drawAll(); }
    else if (S.sel) tip('The ' + IT[S.sel].name + ' has nothing to do at the ' + IT[id].name + '.', 'bad');
  }
  svg.addEventListener('keydown', (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; const a = e.target.closest('[data-act]'); if (a) { e.preventDefault(); tare(); return; } const g = e.target.closest('.item, #boatSpot'); if (g) { e.preventDefault(); click(g.dataset.id); } });

  /* the action bar: ordinary buttons, plus press-and-hold for pouring */
  bar.addEventListener('click', (e) => { const b = e.target.closest('[data-b]'); if (b) act(b.dataset.b); });
  const setHold = (v) => { if (S.op && S.op.type === 'pour') S.op.hold = v; };
  bar.addEventListener('pointerdown', (e) => { if (e.target.closest('#holdBtn')) { setHold(true); try { e.target.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } } });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) bar.addEventListener(ev, () => setHold(false));
  bar.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && e.target.id === 'holdBtn') { e.preventDefault(); setHold(true); } });
  bar.addEventListener('keyup', (e) => { if (e.target.id === 'holdBtn') setHold(false); });

  document.querySelectorAll('#zoomPick button').forEach((b) => b.addEventListener('click', () => { S.zoom = b.dataset.z; drawZoom(); }));
  $('#gogglesBtn').addEventListener('click', () => { S.goggles = true; $('#goggles').hidden = true; tip('Goggles on. Start with Buffer 1, step 1: measure 50.0 mL of the acetic acid in a graduated cylinder.', 'good'); });
  $('#resetBtn').addEventListener('click', () => { if (confirm('Reset the whole bench? All solutions will be discarded. Your notebook is kept.')) { fresh(); drawAll(); tip('Fresh bench, fresh glassware.'); } });

  build(); requestAnimationFrame(tick);
  /* a small handle for the notebook and for the tests */
  window.BufferLab = { get S() { return S; }, IT, RULES, drop, act, tare, moveLiquid, drawAll, reset() { fresh(); drawAll(); }, setHold, truth() { const t = (id) => ({ acid: S.cont[id].vA, naoh: S.cont[id].vB, solid: S.cont[id].gSolid, pH: S.last[id], truePH: S.cont[id].vol > 0 ? C.pH(S.cont[id]) : null, mixed: S.bk[id].mixed, undissolved: S.cont[id].solid, vol: S.cont[id].vol }); return { b1: t('b1'), b2: t('b2'), flags: S.flags }; } };
})();
