/* app.js: state, controls, delivery of titrant, course levels, mystery sample and guided lesson. */
(function () {
  'use strict';
  const C = window.Chem, D = window.Draw, Scene = window.Scene, Graphs = window.Graphs, Explain = window.Explain;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const MANUAL = params.has('manual');                       // tests drive the clock themselves
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DROP = C.DROP_ML;
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sci = (v) => { const e = Math.floor(Math.log10(v)); return (v / Math.pow(10, e)).toFixed(1) + ' × 10' + String(e).split('').map(c => SUP[c]).join(''); };

  const ALL_OPTS = ['meter', 'stir', 'zFlask', 'zBuret', 'zRead', 'water', 'readVol', 'readPH', 'captions', 'labels',
    'gCurve', 'gBars', 'gMath', 'gSlope', 'cPreview', 'cEq', 'cHalf', 'cBuffer', 'cInd', 'cSeven'];
  const LEVELS = {
    honors: ['meter', 'stir', 'zFlask', 'readVol', 'readPH', 'captions', 'labels', 'gCurve', 'gBars', 'gMath', 'cEq', 'cInd', 'cSeven'],
    ap: ['meter', 'stir', 'zFlask', 'zBuret', 'readVol', 'readPH', 'captions', 'labels', 'gCurve', 'gBars', 'gMath', 'gSlope', 'cEq', 'cHalf', 'cBuffer', 'cInd', 'cSeven']
  };

  const st = {
    level: 'honors', analyte: 'HCl', Ca: 0.10, Va: 25, Ct: 0.10, indicator: 'phth', opts: {},
    unknown: false, revealed: false, secretCa: 0.1, start: 0,
    vT: 0, points: [], undo: [], pending: 0, rate: 0, acc: 0, drops: [], holding: false, auto: false,
    time: 0, flash: null, barMax: 0, dirty: true,
    flaskCloud: new Scene.Cloud(), buretCloud: new Scene.Cloud()
  };
  window.TL = { st, C };

  /* ---------- the experiment ---------- */
  const expNow = () => ({ analyte: st.analyte, titrant: C.REAGENTS[st.analyte].type === 'acid' ? 'NaOH' : 'HCl', Ca: st.unknown ? st.secretCa : st.Ca, Va: st.Va, Ct: st.Ct });
  const indNow = () => C.INDICATORS.find(i => i.id === st.indicator);
  const secret = () => st.unknown && !st.revealed;

  /* Start again with a fresh flask and a full buret. */
  function newFlask() {
    st.exp = expNow();
    st.eq = C.equivalencePoints(st.exp); st.pk = C.pKaSequence(st.exp);
    st.jumps = st.eq.map((e, k) => C.jumpSize(st.exp, k) > 0.1);
    const lastSeen = st.eq.filter((e, k) => st.jumps[k]).pop() || st.eq[0];
    st.vMax = clamp(Math.ceil(lastSeen * 1.5 / 10) * 10, 20, 50);
    st.full = C.curve(st.exp, st.vMax);
    st.vT = 0; st.undo = []; st.pending = 0; st.acc = 0; st.drops = []; st.auto = false; st.holding = false; st.flash = null; st.barMax = 0;
    st.mix = C.mixture(st.exp, 0); st.points = [{ v: 0, pH: st.mix.pH }];
    st.flaskCloud = new Scene.Cloud(); st.buretCloud = new Scene.Cloud();
    syncClouds(true);
    updatePanel(); updateReadouts(); st.dirty = true;
  }
  function syncClouds(instant) {
    const T = C.REAGENTS[st.exp.titrant];
    st.flaskInfo = Scene.particleTargets(st.mix, st.opts.water);
    st.flaskCloud.reconcile(st.flaskInfo.target, st.flaskInfo.styles, { instant, ghost: T.type === 'base' ? 'OH' : 'H3O', titrantKinds: T.type === 'base' ? ['Na', 'OH'] : ['Cl', 'H3O'] });
    st.buretInfo = Scene.buretTargets(st.exp, st.opts.water);
    st.buretCloud.reconcile(st.buretInfo.target, st.buretInfo.styles, { instant: true });
  }
  const buretLeft = () => C.BURET_ML - st.start - st.vT;
  const roomLeft = () => Math.min(buretLeft(), Scene.FLASK_MAX_ML - st.Va - st.vT);

  /* Add dv mL of titrant to the flask (one drop at a time while pouring). */
  function addVolume(dv) {
    if (roomLeft() < dv - 1e-9) { st.pending = 0; st.auto = false; st.holding = false; return false; }
    const before = st.mix.pH;
    st.vT = Math.round((st.vT + dv) * 1e6) / 1e6;
    st.mix = C.mixture(st.exp, st.vT);
    st.points.push({ v: st.vT, pH: st.mix.pH });
    syncClouds(false);
    // colour flashing where the drop lands: the titrant is locally in excess until it is stirred in
    const ind = indNow();
    if (ind.id !== 'none') {
      const base = C.REAGENTS[st.exp.titrant].type === 'base', far = C.indicatorColor(ind, base ? 13.5 : 0.5), now = C.indicatorColor(ind, st.mix.pH);
      const diff = Math.abs(far[0] - now[0]) + Math.abs(far[1] - now[1]) + Math.abs(far[2] - now[2]) + 255 * Math.abs(far[3] - now[3]);
      if (diff > 60) {
        const next = st.eq.find(e => e >= st.vT - 1e-9), d = next === undefined ? 9 : next - st.vT;
        const dur = clamp(0.25 + 1.9 * Math.exp(-d / 0.7), 0.25, 2.1) * (st.opts.stir ? 1 : 3);
        st.flash = { color: far.slice(0, 3).map(Math.round), a: 1, spread: 0, dur };
      }
    }
    if (Math.abs(st.mix.pH - before) > 0) st.dirty = true;
    updateReadouts();
    return true;
  }
  function queue(ml, rate) {
    if (roomLeft() < DROP) return;
    st.undo.push(st.vT);
    if (ml <= DROP + 1e-9) st.drops.push({ f: 0 });
    else { st.pending += ml; st.rate = rate; }
    st.dirty = true;
  }
  function undo() {
    if (!st.undo.length) return;
    const v = st.undo.pop();
    st.pending = 0; st.acc = 0; st.drops = []; st.auto = false; st.flash = null;
    st.vT = v; st.points = st.points.filter(p => p.v <= v + 1e-9);
    st.mix = C.mixture(st.exp, v);
    st.flaskCloud.settle(); syncClouds(true);
    updateReadouts(); st.dirty = true;
  }
  /* Auto-titrate: quick where the curve is flat, drop by drop where it is steep. */
  function autoRate() {
    const a = C.mixture(st.exp, st.vT).pH, b = C.mixture(st.exp, st.vT + 0.25).pH;
    return clamp(4.5 / (1 + Math.abs(b - a) * 14), 0.2, 4.5);
  }

  /* ---------- time ---------- */
  function advance(dt) {
    st.time += dt;
    let flowing = false;
    for (const d of st.drops) { d.f += dt / 0.22; if (d.f >= 1) { d.done = true; addVolume(DROP); } }
    if (st.drops.length) { st.drops = st.drops.filter(d => !d.done); st.dirty = true; }
    let rate = 0;
    if (st.pending > 1e-9) rate = st.rate; else if (st.holding) rate = 2.5; else if (st.auto) rate = autoRate();
    if (rate > 0) {
      flowing = true; st.acc += rate * dt;
      while (st.acc >= DROP) {
        st.acc -= DROP;
        if (!addVolume(DROP)) break;
        if (st.pending > 1e-9) { st.pending = Math.max(0, st.pending - DROP); if (st.pending <= 1e-9) { st.pending = 0; if (!st.holding && !st.auto) { st.acc = 0; break; } } }   // measured amount delivered: stop exactly there
        if (st.auto && (st.vT >= st.vMax - 1e-9)) { st.auto = false; break; }
      }
      st.dirty = true;
    } else st.acc = 0;
    st.slow = rate > 0 && rate < 0.8;
    st.flowing = flowing || st.drops.length > 0;
    st.stream = flowing && !st.slow;
    if (flowing && st.slow && !st.drops.length && st.acc < DROP * 0.5) st.drops.push({ f: 0, cosmetic: true, done: false });
    st.drops = st.drops.filter(d => !(d.cosmetic && d.f >= 1));
    if (st.flash) { st.flash.a -= dt / st.flash.dur; st.flash.spread = Math.min(1, st.flash.spread + dt / st.flash.dur); if (st.flash.a <= 0) st.flash = null; st.dirty = true; }
    if (st.opts.zFlask) { st.flaskCloud.step(dt, st.opts.stir); st.dirty = true; } else st.flaskCloud.settle();
    if (st.opts.zBuret) { st.buretCloud.step(dt, false); st.dirty = true; }
    if (st.opts.stir) st.dirty = true;
    $('btnAuto').setAttribute('aria-pressed', st.auto); $('btnAuto').textContent = st.auto ? 'Stop' : '▶ Auto';
  }

  /* ---------- drawing ---------- */
  function hudBoxes(canvas) {
    const c = canvas.getBoundingClientRect(), out = [];
    canvas.parentElement.querySelectorAll('.ro').forEach(el => {
      if (el.hidden || !el.offsetParent) return;
      const r = el.getBoundingClientRect();
      out.push({ str: 'page: ' + el.textContent.slice(0, 20), x0: r.left - c.left, x1: r.right - c.left, y0: r.top - c.top, y1: r.bottom - c.top });
    });
    return out;
  }
  function render() {
    D.resetTheme();
    const view = { opts: st.opts, exp: st.exp, mix: st.mix, color: C.indicatorColor(indNow(), st.mix.pH), reading: st.start + st.vT, time: st.time,
      flowing: st.flowing, stream: st.stream, drops: st.drops, flash: st.flash, unknown: secret(),
      flaskCloud: st.flaskCloud, buretCloud: st.buretCloud, flaskInfo: st.flaskInfo, buretInfo: st.buretInfo, obstacles: hudBoxes($('scene')) };
    Scene.draw($('scene'), view);
    const g = { opts: st.opts, exp: st.exp, mix: st.mix, points: st.points, full: st.full, eq: st.eq, pk: st.pk, jumps: st.jumps, vMax: st.vMax,
      indicator: indNow(), unknown: st.unknown, revealed: st.revealed, barMax: st.barMax };
    if (st.opts.gCurve) Graphs.curve($('cCurve'), g);
    if (st.opts.gBars) { Graphs.bars($('cBars'), g); st.barMax = g.barMax; }
    st.dirty = false;
  }

  /* ---------- text ---------- */
  function colorName() {
    const ind = indNow(), pH = st.mix.pH;
    if (ind.id === 'none') return 'colorless';
    if (ind.universal) return pH < 3 ? 'red' : pH < 5 ? 'orange' : pH < 6.5 ? 'yellow' : pH < 8 ? 'green' : pH < 10.5 ? 'blue' : 'violet';
    if (pH < ind.lo) return ind.acidName;
    if (pH > ind.hi) return ind.baseName;
    return ind.id === 'phth' ? 'pale pink' : 'changing…';
  }
  let lastMath = '';
  function updateReadouts() {
    const ex = Explain.explain(st.exp, st.vT, st.mix, secret());
    $('outVol').textContent = st.vT.toFixed(2) + ' mL';
    $('outPH').textContent = st.mix.pH.toFixed(2);
    $('outColor').innerHTML = colorName();
    let cap = ex.caption;
    if (buretLeft() < DROP) cap = '<b>The buret is empty.</b> Press "New flask" to refill it and start again.';
    else if (st.Va + st.vT > Scene.FLASK_MAX_ML - DROP) cap = '<b>The flask is full.</b> Press "New flask" to start again.';
    else if (st.unknown && !st.revealed && st.eq[0] && st.vT > st.eq[0] + 2) cap = 'The color has been changed for a while now: you have probably gone past the endpoint. Try again with <b>New flask</b>, or use Undo.';
    $('caption').innerHTML = '<span>' + cap + '</span>';
    $('subMath').textContent = ex.stage;
    if (ex.html !== lastMath) { $('math').innerHTML = ex.html; lastMath = ex.html; }
    const none = roomLeft() < DROP;
    for (const id of ['add1', 'add05', 'add1ml', 'add5', 'btnFlow', 'btnAuto']) $(id).disabled = none && !(id === 'btnAuto' && st.auto);
    $('btnUndo').disabled = !st.undo.length;
  }
  function updatePanel() {
    const A = C.REAGENTS[st.analyte], T = C.REAGENTS[st.exp.titrant], info = C.ANALYTES.find(a => a.id === st.analyte), ind = indNow();
    $('blurb').textContent = info.note;
    const facts = [];
    facts.push(['In the buret', T.formula + ' (' + (T.type === 'base' ? 'strong base' : 'strong acid') + ')']);
    facts.push(['Sample is a', (A.strong ? 'strong ' : 'weak ') + A.type]);
    if (!A.strong && st.level === 'ap') {
      const pk = A.Ka.map(k => -Math.log10(k));
      if (A.type === 'acid' || A.Ka.length > 1) facts.push([A.Ka.length > 1 ? 'pKₐ values' : 'Kₐ · pKₐ', A.Ka.length > 1 ? pk.map(x => x.toFixed(2)).join(', ') : sci(A.Ka[0]) + ' · ' + pk[0].toFixed(2)]);
      else facts.push(['Kb · pKₐ of ' + A.forms[0], sci(C.KW / A.Ka[0]) + ' · ' + pk[0].toFixed(2)]);
    }
    if (!secret()) facts.push(['Equivalence at', st.eq.filter((e, k) => st.jumps[k] || k === 0).map(e => e.toFixed(2)).join(' and ') + ' mL']);
    $('facts').innerHTML = facts.map(([k, v]) => '<div class="fact' + (v.length > 16 ? ' wide' : '') + '"><small>' + k + '</small><b style="font-size:.9rem">' + v + '</b></div>').join('');
    $('outCa').textContent = secret() ? '? M' : (st.unknown ? st.secretCa : st.Ca).toFixed(st.unknown ? 4 : 2) + ' M';
    $('Ca').disabled = st.unknown; $('outVa').textContent = st.Va.toFixed(2) + ' mL'; $('outCt').textContent = st.Ct.toFixed(2) + ' M';
    $('lblCt').firstChild.textContent = 'Concentration of ' + T.formula + ' ';
    $('btnUnknown').setAttribute('aria-pressed', st.unknown);
    $('labPanel').hidden = !st.unknown;
    const last = st.eq.filter((e, k) => st.jumps[k]).pop();
    if (ind.id === 'none') $('indHint').textContent = 'Without an indicator you need the pH meter to find the equivalence point.';
    else if (ind.universal) $('indHint').textContent = 'Changes color gradually across the whole pH scale: good for seeing the pH, poor for a sharp endpoint.';
    else {
      let verdict = '';
      if (!secret() && last !== undefined) {
        const lo = C.mixture(st.exp, last - 0.05).pH, hi = C.mixture(st.exp, last + 0.05).pH, a = Math.min(lo, hi), b = Math.max(lo, hi);
        const mid = (ind.lo + ind.hi) / 2;
        verdict = mid > a && mid < b ? ' Good choice here: one drop at the equivalence point jumps the pH from ' + lo.toFixed(1) + ' to ' + hi.toFixed(1) + ', straight through this range.'
          : ' Poor choice here: at the equivalence point the pH jumps from ' + lo.toFixed(1) + ' to ' + hi.toFixed(1) + ', which misses the middle of this range.';
      }
      $('indHint').innerHTML = 'Changes from ' + ind.acidName + ' to ' + ind.baseName + ' between pH ' + ind.lo + ' and ' + ind.hi + '.' + verdict;
    }
    if (last > C.BURET_ML) $('blurb').textContent += ' Careful: this needs ' + last.toFixed(1) + ' mL, more than one buret holds. Use a more concentrated titrant.';
  }

  /* ---------- options and levels ---------- */
  function applyOpts() {
    if (secret()) st.opts.readVol = false;
    document.querySelectorAll('[data-opt]').forEach(el => { el.checked = !!st.opts[el.dataset.opt]; });
    document.querySelectorAll('[data-card]').forEach(el => { el.hidden = !st.opts[el.dataset.card]; });
    $('row2').hidden = !st.opts.gBars && !st.opts.gMath; $('row2').style.display = $('row2').hidden ? 'none' : '';
    $('col').style.display = !st.opts.gCurve && $('row2').hidden ? 'none' : '';
    $('roVol').hidden = !st.opts.readVol; $('roPH').hidden = !st.opts.readPH || !st.opts.meter;
    $('caption').classList.toggle('off', !st.opts.captions);
    st.dirty = true;
  }
  function setLevel(level, keep) {
    st.level = level;
    for (const k of ALL_OPTS) st.opts[k] = LEVELS[level].includes(k);
    document.querySelectorAll('#levelSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.level === level));
    fillAnalytes();
    if (!keep && level === 'honors' && C.ANALYTES.find(a => a.id === st.analyte).level === 'ap') setAnalyte('HCl');
    applyOpts();
    if (st.exp) { syncClouds(true); updatePanel(); updateReadouts(); }
  }
  function fillAnalytes() {
    const sel = $('analyte'); sel.innerHTML = '';
    const groups = {};
    for (const a of C.ANALYTES) {
      if (st.level === 'honors' && a.level === 'ap' && a.id !== st.analyte) continue;
      const R = C.REAGENTS[a.id];
      if (!groups[a.group]) { groups[a.group] = document.createElement('optgroup'); groups[a.group].label = a.group; sel.appendChild(groups[a.group]); }
      const o = document.createElement('option'); o.value = a.id; o.textContent = R.formula + ' · ' + R.name; groups[a.group].appendChild(o);
    }
    sel.value = st.analyte;
  }
  function setAnalyte(id, keepInd) {
    st.analyte = id; $('analyte').value = id;
    if (!keepInd) { st.indicator = C.ANALYTES.find(a => a.id === id).indicator; $('indicator').value = st.indicator; }
    newFlask();
  }
  function setUnknown(on) {
    st.unknown = on; st.revealed = false;
    if (on) {
      st.secretCa = Math.round((0.05 + Math.random() * 0.13) * 1e4) / 1e4;
      st.start = Math.round((0.4 + Math.random() * 2.4) * 100) / 100;
      st.opts.zRead = true; st.opts.cPreview = false;
      if (st.indicator === 'none') { st.indicator = 'phth'; $('indicator').value = 'phth'; }
    } else st.start = 0;
    for (const id of ['labV0', 'labV1', 'labM']) $(id).value = '';
    $('labVerdict').textContent = ''; $('labVerdict').className = 'verdict';
    newFlask(); applyOpts();
  }
  function checkLab() {
    const v0 = parseFloat($('labV0').value), v1 = parseFloat($('labV1').value), M = parseFloat($('labM').value);
    const out = $('labVerdict'), eq = st.eq[st.eq.length > 1 && st.jumps[1] && false ? 1 : 0], msgs = [];
    if (![v0, v1, M].every(Number.isFinite)) { out.className = 'verdict no'; out.textContent = 'Fill in both buret readings and your concentration first.'; return; }
    const okStart = Math.abs(v0 - st.start) <= 0.05, okEnd = Math.abs(v1 - (st.start + st.vT)) <= 0.05;
    if (!okStart) msgs.push('Check your starting reading: read the bottom of the meniscus on the zoomed scale.');
    if (!okEnd) msgs.push('Check your final reading against the zoomed scale.');
    const over = st.vT - eq;
    if (over > 0.15) msgs.push('You went about ' + over.toFixed(2) + ' mL past the equivalence point, so your answer comes out too high. Go drop by drop near the end.');
    else if (over < -0.15) msgs.push('You stopped about ' + (-over).toFixed(2) + ' mL before the equivalence point: the color change has to be permanent.');
    const good = Math.abs(M - st.secretCa) / st.secretCa <= 0.015;
    if (good) { out.className = 'verdict ok'; out.textContent = '✔ Correct to within 1.5%. The sample was ' + st.secretCa.toFixed(4) + ' M. ' + (msgs.length ? '' : 'Clean titration.'); st.revealed = true; updatePanel(); updateReadouts(); applyOpts(); }
    else {
      const fromTheirs = st.Ct * (v1 - v0) / st.Va;
      if (Math.abs(M - fromTheirs) / Math.max(fromTheirs, 1e-9) > 0.02 && !msgs.length) msgs.push('Your readings look right, but the calculation does not match them. Use M(flask) = M(buret) × V(added) ÷ V(flask).');
      out.className = 'verdict no'; out.textContent = '✘ Not yet. ' + (msgs.join(' ') || 'Check your calculation.');
    }
  }

  /* ---------- guided lesson ---------- */
  const only = (...on) => { for (const k of ALL_OPTS) st.opts[k] = on.includes(k); applyOpts(); };
  const fresh = (id, ind) => { if (st.unknown) { st.unknown = false; st.start = 0; } st.Ca = 0.10; st.Va = 25; st.Ct = 0.10; $('Ca').value = 0.1; $('Va').value = 25; $('Ct').value = 0.1; st.indicator = ind; $('indicator').value = ind; setAnalyte(id, true); };
  const jump = (ml) => { st.vT = ml; st.mix = C.mixture(st.exp, ml); st.points = st.full.filter(p => p.v <= ml).concat([{ v: ml, pH: st.mix.pH }]); st.undo = [0]; syncClouds(true); updateReadouts(); };
  const TOUR = [
    { title: 'Meet the equipment', text: 'The flask holds 25.00 mL of hydrochloric acid, the sample we want to study. The buret above it holds sodium hydroxide of known concentration. The stopcock lets it out a drop at a time. A buret is numbered from the top, so it reads how much has been delivered.',
      ask: 'Why is the buret numbered from the top down instead of from the bottom up?', go: () => { only('labels', 'stir', 'readVol', 'captions'); fresh('HCl', 'phth'); } },
    { title: 'Zoom in on the particles', text: 'The circles are magnified views. Each white bump is a hydrogen that can be given away. In the flask: H₃O⁺ and Cl⁻ from the acid. In the buret: Na⁺ and OH⁻ from the base. Water is left out so the solutes are easy to see.',
      ask: 'HCl is a strong acid. How does the particle view show that? Are there any whole HCl molecules?', go: () => { only('labels', 'stir', 'readVol', 'captions', 'zFlask', 'zBuret'); fresh('HCl', 'phth'); } },
    { title: 'Add some base', text: 'Press "5 mL" and watch the flask view. Each OH⁻ that arrives finds an H₃O⁺ and they become water. The Na⁺ and Cl⁻ just watch: they are spectator ions.',
      ask: 'After 10 mL, how many H₃O⁺ are left out of the 30 you started with? Predict the number at 20 mL.', go: () => { only('labels', 'stir', 'readVol', 'captions', 'zFlask', 'gBars', 'meter', 'readPH'); fresh('HCl', 'phth'); } },
    { title: 'The titration curve', text: 'Press "Auto" to run the whole titration. The pH barely changes for a long time, then leaps. The middle of that leap is the equivalence point: the moles of OH⁻ added equal the moles of H₃O⁺ that were in the flask.',
      ask: 'Why does the pH change so little at first and so much near 25 mL? Look at how many H₃O⁺ are left each time.', go: () => { only('labels', 'stir', 'readVol', 'captions', 'zFlask', 'gCurve', 'gBars', 'meter', 'readPH', 'cEq', 'cSeven'); fresh('HCl', 'none'); } },
    { title: 'Indicators and the endpoint', text: 'Phenolphthalein is colorless in acid and pink in base. We are 0.5 mL short of the equivalence point. Add one drop at a time: the pink flashes where the drop lands and fades as it mixes in. Stop when a faint pink stays.',
      ask: 'How many drops did it take? Why does the color flash and then vanish before the endpoint?', go: () => { only('labels', 'stir', 'readVol', 'captions', 'zFlask', 'gCurve', 'meter', 'readPH', 'cEq', 'cInd', 'cSeven'); fresh('HCl', 'phth'); jump(24.5); } },
    { title: 'A weak acid looks different', text: 'Now the flask holds acetic acid at the same concentration. Look at the flask view: almost every molecule still has its hydrogen. Only about 1 in 75 has ionized, so the starting pH is higher than for HCl.',
      ask: 'Same concentration, same volume. Will it take more, less or the same amount of NaOH to reach equivalence? Run it and see.', go: () => { only('labels', 'stir', 'readVol', 'captions', 'zFlask', 'gCurve', 'gBars', 'meter', 'readPH', 'cEq', 'cSeven', 'cInd'); fresh('HAc', 'phth'); } },
    { title: 'Half-way: pH = pKₐ', text: 'At 12.50 mL exactly half of the acetic acid has been turned into acetate. Count them in the flask view: the two are equal. When [HA] = [A⁻], the pH equals the acid\'s pKₐ. Around this point the mixture is a buffer and the curve is nearly flat.',
      ask: 'Add 1 mL more. How much did the pH change? Compare with adding 1 mL near the equivalence point.', go: () => { only('labels', 'stir', 'readVol', 'captions', 'zFlask', 'gCurve', 'gBars', 'gMath', 'meter', 'readPH', 'cEq', 'cHalf', 'cBuffer', 'cSeven'); fresh('HAc', 'phth'); jump(12.5); } },
    { title: 'Why the equivalence point is above 7', text: 'At equivalence all the acetic acid is gone, but the flask is not neutral. It is full of acetate, a weak base, which takes protons from water and leaves OH⁻. Open "The math" to see the calculation.',
      ask: 'Would methyl orange (changes at pH 3.1 to 4.4) work as the indicator here? Pick it and look at the curve.', go: () => { only('labels', 'stir', 'readVol', 'captions', 'zFlask', 'gCurve', 'gBars', 'gMath', 'meter', 'readPH', 'cEq', 'cHalf', 'cSeven', 'cInd'); fresh('HAc', 'phth'); jump(25); } },
    { title: 'Your turn: a mystery sample', text: 'The concentration in the flask is now hidden and the volume read-out is off, as in a real lab. Read the buret scale before you start, titrate to a faint permanent pink, read it again, and calculate. Enter your results in the lab report at the bottom of the panel.',
      ask: 'What is the concentration of the acid? How close can the class get to each other?', go: () => { only('labels', 'stir', 'captions', 'zRead', 'gMath', 'cInd'); fresh('HCl', 'phth'); setUnknown(true); } }
  ];
  let tourAt = -1;
  function showTour(i) {
    tourAt = clamp(i, 0, TOUR.length - 1);
    const s = TOUR[tourAt];
    $('tour').hidden = false; document.body.classList.remove('no-side'); $('side').scrollTop = 0;
    $('tourStep').textContent = 'Guided lesson · step ' + (tourAt + 1) + ' of ' + TOUR.length;
    $('tourTitle').textContent = s.title; $('tourText').textContent = s.text; $('tourAsk').textContent = s.ask ? 'Ask: ' + s.ask : '';
    $('tourPrev').disabled = tourAt === 0; $('tourNext').textContent = tourAt === TOUR.length - 1 ? 'Finish' : 'Next →';
    s.go(); updatePanel(); st.dirty = true;
  }
  TL.TOUR = TOUR; TL.showTour = showTour;
  TL.api = { setLevel, setAnalyte, setUnknown, newFlask, applyOpts, queue, addVolume, jump, undo, updatePanel };

  /* ---------- loop ---------- */
  let tPrev = 0;
  function loop(t) { const dt = Math.min(0.1, (t - tPrev) / 1000 || 0); tPrev = t; advance(dt); if (st.dirty) render(); requestAnimationFrame(loop); }
  TL.advance = (dt) => { advance(dt); render(); };
  TL.render = render;

  /* ---------- wiring ---------- */
  function init() {
    const saved = (() => { try { return localStorage.getItem('tl-theme'); } catch (e) { return null; } })();
    document.documentElement.dataset.theme = params.get('theme') || saved || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    for (const i of C.INDICATORS) { const o = document.createElement('option'); o.value = i.id; o.textContent = i.name + (i.lo !== undefined && !i.universal ? ' (pH ' + i.lo + ' to ' + i.hi + ')' : ''); $('indicator').appendChild(o); }
    const level = LEVELS[params.get('level')] ? params.get('level') : 'honors';
    if (params.get('analyte') && C.REAGENTS[params.get('analyte')]) st.analyte = params.get('analyte');
    st.indicator = params.get('ind') || C.ANALYTES.find(a => a.id === st.analyte).indicator;
    setLevel(level, true);
    (params.get('show') || '').split(',').filter(Boolean).forEach(k => { st.opts[k] = true; });
    (params.get('hide') || '').split(',').filter(Boolean).forEach(k => { st.opts[k] = false; });
    $('indicator').value = st.indicator;
    newFlask(); applyOpts();
    if (params.get('v')) { jump(+params.get('v')); }

    $('analyte').addEventListener('change', (e) => setAnalyte(e.target.value));
    $('indicator').addEventListener('change', (e) => { st.indicator = e.target.value; updatePanel(); updateReadouts(); st.dirty = true; });
    for (const [id, key] of [['Ca', 'Ca'], ['Va', 'Va'], ['Ct', 'Ct']]) $(id).addEventListener('input', (e) => { st[key] = +e.target.value; newFlask(); });
    document.querySelectorAll('#levelSeg button').forEach(b => b.addEventListener('click', () => setLevel(b.dataset.level)));
    document.querySelectorAll('[data-opt]').forEach(el => el.addEventListener('change', () => {
      st.opts[el.dataset.opt] = el.checked; applyOpts();
      if (el.dataset.opt === 'water' || el.dataset.opt === 'zFlask' || el.dataset.opt === 'zBuret') syncClouds(true);
    }));
    $('add1').addEventListener('click', () => queue(DROP));
    $('add05').addEventListener('click', () => queue(0.5, 1.2));
    $('add1ml').addEventListener('click', () => queue(1, 2));
    $('add5').addEventListener('click', () => queue(5, 5));
    const hold = (on) => { if (on && !st.holding && roomLeft() >= DROP) st.undo.push(st.vT); st.holding = on && roomLeft() >= DROP; st.dirty = true; };
    $('btnFlow').addEventListener('pointerdown', (e) => { e.preventDefault(); hold(true); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) $('btnFlow').addEventListener(ev, () => hold(false));
    $('btnAuto').addEventListener('click', () => { if (!st.auto && roomLeft() >= DROP) { st.undo.push(st.vT); st.auto = true; } else st.auto = false; st.dirty = true; });
    $('btnUndo').addEventListener('click', undo);
    $('btnReset').addEventListener('click', () => { if (st.unknown) setUnknown(true); else newFlask(); });
    $('btnUnknown').addEventListener('click', () => setUnknown(!st.unknown));
    $('btnCheck').addEventListener('click', checkLab);
    $('btnReveal').addEventListener('click', () => { st.revealed = true; $('labVerdict').className = 'verdict'; $('labVerdict').textContent = 'The sample was ' + st.secretCa.toFixed(4) + ' M. Equivalence point: ' + st.eq[0].toFixed(2) + ' mL added.'; updatePanel(); updateReadouts(); applyOpts(); });

    $('btnTheme').addEventListener('click', () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; try { localStorage.setItem('tl-theme', t); } catch (e) { /* private mode */ } D.resetTheme(); st.dirty = true; });
    $('btnSide').addEventListener('click', () => { document.body.classList.toggle('no-side'); st.dirty = true; });
    const full = () => { if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); };
    $('btnFull').addEventListener('click', full);
    document.addEventListener('fullscreenchange', () => { document.documentElement.classList.toggle('present', !!document.fullscreenElement); D.resetTheme(); st.dirty = true; });
    $('btnHelp').addEventListener('click', () => { $('help').hidden = false; });
    $('helpClose').addEventListener('click', () => { $('help').hidden = true; });
    $('help').addEventListener('click', (e) => { if (e.target === $('help')) $('help').hidden = true; });
    $('btnTour').addEventListener('click', () => showTour(0));
    $('tourClose').addEventListener('click', () => { $('tour').hidden = true; });
    $('tourPrev').addEventListener('click', () => showTour(tourAt - 1));
    $('tourNext').addEventListener('click', () => { if (tourAt === TOUR.length - 1) $('tour').hidden = true; else showTour(tourAt + 1); });
    document.querySelectorAll('.card .expand').forEach(b => b.addEventListener('click', () => {
      const card = b.closest('.card'), on = !card.classList.contains('big');
      document.querySelectorAll('.card.big').forEach(c => { c.classList.remove('big'); c.querySelector('.expand').textContent = '⤢'; });
      card.classList.toggle('big', on); b.textContent = on ? '✕' : '⤢'; st.dirty = true;
    }));
    const tip = $('tip');
    document.querySelectorAll('.card canvas').forEach(c => {
      c.addEventListener('mousemove', (e) => {
        const r = c.getBoundingClientRect(), txt = c._hover ? c._hover(e.clientX - r.left, e.clientY - r.top) : null;
        if (!txt) { tip.hidden = true; return; }
        tip.textContent = txt; tip.hidden = false;
        tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 8, e.clientX + 14) + 'px'; tip.style.top = Math.max(8, e.clientY - tip.offsetHeight - 10) + 'px';
      });
      c.addEventListener('mouseleave', () => { tip.hidden = true; });
    });
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input[type=number], input[type=text], select, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (e.key === 'Escape') { $('help').hidden = true; document.querySelectorAll('.card.big').forEach(c => { c.classList.remove('big'); c.querySelector('.expand').textContent = '⤢'; }); st.dirty = true; }
      else if (e.key === ' ') { e.preventDefault(); if (!e.repeat) hold(true); }
      else if (k === 'd') queue(DROP);
      else if (k === 'a') $('btnAuto').click();
      else if (k === 'z') undo();
      else if (k === 'r') $('btnReset').click();
      else if (k === 'h') $('btnSide').click();
      else if (k === 'f') full();
    });
    document.addEventListener('keyup', (e) => { if (e.key === ' ') hold(false); });
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => { st.dirty = true; if (MANUAL) render(); }); document.querySelectorAll('canvas').forEach(c => ro.observe(c)); }
    window.addEventListener('resize', () => { st.dirty = true; });
    document.addEventListener('click', () => { st.dirty = true; });
    render();
    if (!MANUAL) requestAnimationFrame(loop);
  }
  init();
})();
