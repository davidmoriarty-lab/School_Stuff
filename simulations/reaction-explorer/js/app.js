/* app.js: state, controls, playback and the guided lesson. */
(function () {
  'use strict';
  const M = window.Model, D = window.Draw, CD = window.ChemData, EL = CD.ELEMENTS;
  const Stage = window.Stage, Graphs = window.Graphs, CS = window.ChamberSim;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const MANUAL = params.has('manual');                       // tests drive the clock themselves
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- what each course level switches on ---------- */
  const ALL_OPTS = ['cloud', 'labels', 'forces', 'velocity', 'lengths', 'bondOrder', 'charges', 'chargeMap', 'electrons', 'arrows', 'vib', 'captions',
    'gProfile', 'gBars', 'gMorse', 'gPES', 'showEa', 'showDH', 'showEaRev', 'showTotal', 'pauseTS', 'loop',
    'orient', 'allowReverse', 'thermostat', 'flashes', 'trails', 'gMB', 'gConc', 'gArr', 'gFunnel'];
  const LEVELS = {
    honors: ['cloud', 'labels', 'captions', 'gProfile', 'gBars', 'showEa', 'showDH', 'showTotal',
      'orient', 'thermostat', 'flashes', 'trails', 'gMB', 'gConc', 'gFunnel'],
    ap: ['cloud', 'labels', 'captions', 'forces', 'lengths', 'charges', 'vib', 'gProfile', 'gBars', 'gMorse', 'gPES', 'showEa', 'showDH', 'showEaRev', 'showTotal',
      'orient', 'allowReverse', 'thermostat', 'flashes', 'trails', 'gMB', 'gConc', 'gArr', 'gFunnel'],
    organic: ['cloud', 'labels', 'captions', 'electrons', 'arrows', 'charges', 'lengths', 'bondOrder', 'gProfile', 'gMorse', 'showEa', 'showDH', 'showTotal',
      'orient', 'thermostat', 'flashes', 'trails', 'gMB', 'gConc', 'gFunnel']
  };

  const st = {
    tab: 'collision', level: 'honors', rxId: 'F_H2', reverse: false, catalyst: false, customEa: 40, customDH: -60,
    energy: 30, angle: 0, opts: {}, playing: false, frame: 0, speed: 25,
    sys: null, path: null, run: null, uncatPath: null, pausedAtTop: false, ended: false,
    chamber: null, chRunning: false, mb: { ymax: 0, pin: null, arrMode: 'k' }, dirty: true
  };
  window.RX = { st, M, CD };

  /* ---------- building the system, the path and the run ---------- */
  const sysCache = new Map(), pathCache = new Map();
  function getSystem() {
    const rx = CD.REACTIONS.find(r => r.id === st.rxId);
    const key = [st.rxId, st.reverse, st.catalyst, rx.custom ? st.customEa + '/' + st.customDH : ''].join('|');
    if (!sysCache.has(key)) {
      if (sysCache.size > 60) sysCache.clear();
      const s = M.buildSystem(rx, EL, { reverse: st.reverse, catalyst: st.catalyst, customEa: st.customEa, customDH: st.customDH });
      s.key = key; sysCache.set(key, s);
    }
    return sysCache.get(key);
  }
  function getPath(sys, theta, vib) {
    const key = sys.key + (sys.swapped ? 's' : '') + (sys.uncat ? 'u' : '') + '|' + theta + '|' + vib;
    if (!pathCache.has(key)) { if (pathCache.size > 80) pathCache.clear(); pathCache.set(key, M.buildPath(sys, theta, { vibration: vib })); }
    return pathCache.get(key);
  }

  function rebuildSystem(keepEnergy) {
    const prev = st.sys;
    st.sys = getSystem();
    const sys = st.sys;
    const sameParticles = prev && prev.id === sys.id && prev.reversed === sys.reversed;
    if (!st.chamber || !sameParticles) {
      st.chamber = new CS.Chamber(sys, st.opts);
      st.chRunning = false; st.mb.ymax = 0; st.mb.pin = null;
      $('temp').value = st.chamber.T0; $('nA').value = 30; $('nBC').value = 30;
    } else { st.chamber.setSystem(sys); st.mb.ymax = 0; }
    const emax = Math.ceil(Math.max(60, sys.Ea * 2.5, sys.Ea + 50) / 10) * 10;
    $('energy').max = emax;
    if (!keepEnergy) st.energy = Math.min(emax, Math.round(sys.Ea * 1.35 + 4));
    st.energy = clamp(st.energy, 0, emax);
    $('energy').value = st.energy;
    updateReactionPanel();
    rebuildRun();
    updateChamberUi(true);
  }

  function rebuildRun() {
    let sys = st.sys, theta = st.angle;
    if (sys.homonuclear && theta > 90) { sys = Object.assign(M.swapEnds(sys), { key: st.sys.key }); theta = 180 - theta; }
    st.path = getPath(sys, theta, st.opts.vib);
    st.run = M.runCollision(st.path, st.energy);
    st.uncatPath = null;
    if (sys.catalyst && sys.uncatSurface && st.path.reactive) {
      const un = Object.assign({}, sys, { surface: sys.uncatSurface, uncat: true });
      st.uncatPath = getPath(un, theta, false);
    }
    st.frame = 0; st.playing = false; st.pausedAtTop = false; st.ended = false;
    $('scrub').max = st.run.frames.length - 1;
    $('banner').hidden = true;
    updateCollisionUi();
    st.dirty = true;
  }

  /* 1364023 → "1.4 million" */
  function big(n) {
    if (n < 1000) return String(Math.round(n));
    const r = +n.toPrecision(2);
    if (r < 1e6) return r.toLocaleString('en-US');
    if (r < 1e9) return (r / 1e6) + ' million';
    if (r < 1e12) return (r / 1e9) + ' billion';
    return (r / 1e12) + ' trillion';
  }

  /* ---------- side panel text ---------- */
  function updateReactionPanel() {
    const sys = st.sys, rx = sys.rx;
    $('rxBlurb').textContent = rx.blurb + (st.reverse ? ' (Shown here running in reverse.)' : '');
    const kind = Math.abs(sys.dH) < 0.5 ? 'neither' : sys.dH < 0 ? 'exothermic' : 'endothermic';
    const ap = sys.approx ? '≈ ' : '';
    const nm = (p) => p.group || p.label.split('_')[0];
    $('rxFacts').innerHTML =
      '<div class="fact"><small>Activation energy</small><b>' + ap + D.fmt(sys.Ea, 0) + ' kJ/mol</b></div>' +
      '<div class="fact"><small>ΔH · <span class="' + (sys.dH < 0 ? 'exo' : 'endo') + '">' + kind + '</span></small><b>' + ap + D.signed(sys.dH, 0) + ' kJ/mol</b></div>' +
      '<div class="fact"><small>Break ' + nm(sys.B) + '–' + nm(sys.C) + ' bond</small><b>+' + D.fmt(sys.surface.BC.D, 0) + '</b></div>' +
      '<div class="fact"><small>Make ' + nm(sys.A) + '–' + nm(sys.B) + ' bond</small><b>−' + D.fmt(sys.surface.AB.D, 0) + '</b></div>';
    $('hudEq').textContent = sys.equation;
    const tags = [];
    if (kind !== 'neither') tags.push('<span class="tag ' + (sys.dH < 0 ? 'exo' : 'endo') + '">' + kind + ' · ΔH ' + D.signed(sys.dH, 0) + '</span>'); else tags.push('<span class="tag">ΔH = 0</span>');
    tags.push('<span class="tag">Eₐ ' + D.fmt(sys.Ea, 0) + ' kJ/mol</span>');
    if (sys.catalyst) tags.push('<span class="tag cat">catalyst: Eₐ was ' + D.fmt(sys.EaUncat, 0) + '</span>');
    $('hudTags').innerHTML = tags.join('');
    $('btnReverse').setAttribute('aria-pressed', st.reverse);
    $('customBox').hidden = !rx.custom;
    $('outCustomEa').textContent = D.fmt(sys.Ea, 0) + ' kJ/mol';
    $('outCustomDH').textContent = D.signed(sys.dH, 0) + ' kJ/mol';
    $('lblNA').firstChild.textContent = 'Amount of ' + sys.formulas.A + ' ';
    $('lblNBC').firstChild.textContent = 'Amount of ' + sys.formulas.BC + ' ';
  }

  function updateCollisionUi() {
    const sys = st.sys, path = st.path;
    $('outEnergy').textContent = D.fmt(st.energy, 0) + ' kJ/mol';
    const need = path.reactive ? path.barrier : Infinity;
    const max = +$('energy').max;
    $('eaMark').style.left = 'calc(' + clamp(need / max, 0, 1) * 100 + '% - ' + (clamp(need / max, 0, 1) * 16 - 7) + 'px)';
    $('eaMark').style.display = need <= max ? '' : 'none';
    const odds = 1 / Math.exp(-st.energy / (M.R_GAS * 298));
    const oddsTxt = odds < 1.5 ? 'almost every collision' : odds < 1e9 ? 'about 1 collision in ' + big(odds) : 'fewer than 1 collision in a billion';
    $('energyHint').textContent = (path.reactive ? 'Needed at this orientation: ' + D.fmt(need, 0) + ' kJ/mol. ' : 'No amount of energy works from this side. ') +
      'At room temperature ' + oddsTxt + ' is this energetic.';
    const a = st.angle;
    $('outAngle').textContent = a + '° ' + (a === 0 ? '(head-on)' : a < 90 ? '(tilted)' : a === 90 ? '(side-on)' : a < 180 ? '(far end tilted)' : (sys.homonuclear ? '(other end)' : '(wrong end)'));
    $('angle').value = a;
    $('subProfile').textContent = path.theta > 2 || path.wrongEnd ? 'for this orientation' : 'potential energy along the reaction';
  }

  /* ---------- captions for the story ---------- */
  function caption(ph, run) {
    const s = run.path.sys, f = s.formulas, p = run.path;
    const bc = f.BC, a = f.A, ab = f.AB, c = f.C;
    switch (ph) {
      case 'approach': return '<span><b>Approach.</b> ' + a + ' and ' + bc + ' are still far apart and barely feel each other. All the energy is kinetic (motion).</span>';
      case 'climb': return p.wrongEnd
        ? '<span><b>Electron clouds repel.</b> ' + a + ' is pressing against the wrong atom. Nothing here can bond with it.</span>'
        : '<span><b>Climbing the energy hill.</b> The electron clouds push back, so the particles slow down. Kinetic energy is turning into potential energy, and the old bond starts to stretch.</span>';
      case 'ts': return '<span><b>Transition state ‡.</b> The top of the hill: the old bond is partly broken and the new bond is partly formed. Potential energy is at its maximum.</span>';
      case 'descend': return '<span><b>Rolling down the other side.</b> The new bond pulls its atoms together. Potential energy turns back into kinetic energy' + (p.fv > 0 ? ', and the new bond vibrates' : '') + '.</span>';
      case 'products': {
        const tail = Math.abs(s.dH) < 0.5 ? 'The products carry the same energy the reactants brought.'
          : s.dH < 0 ? 'They leave with <b>more</b> kinetic energy than the reactants brought: the reaction is <b>exothermic</b> and heats its surroundings.'
          : 'They leave with <b>less</b> kinetic energy than the reactants brought: the reaction is <b>endothermic</b> and cools its surroundings.';
        return '<span><b>Products.</b> ' + ab + ' and ' + c + ' fly apart. ' + tail + '</span>';
      }
      case 'turn': return run.reason === 'orientation'
        ? '<span><b>Wrong orientation.</b> Approaching this way the hill is too high to climb, so the particles stop and are pushed back.</span>'
        : '<span><b>Not enough energy.</b> All the kinetic energy has been used up before the top of the hill. The particles stop and are pushed back.</span>';
      case 'retreat': return '<span><b>No reaction.</b> ' + a + ' and ' + bc + ' bounce apart unchanged with the same energy they came in with. This was an ineffective collision.</span>';
    }
    return '';
  }
  function bannerText(run) {
    const p = run.path, s = p.sys;
    if (run.reacted) return ['ok', '✔ Effective collision: ' + s.formulas.AB + ' + ' + s.formulas.C + ' formed'];
    if (p.wrongEnd) return ['no', '✘ No reaction: ' + s.formulas.A + ' hit the wrong end of ' + s.formulas.BC];
    if (run.reason === 'orientation') return ['no', '✘ No reaction: poor orientation (this way needs ' + D.fmt(p.barrier, 0) + ' kJ/mol, had ' + D.fmt(run.Ecoll, 0) + ')'];
    return ['no', '✘ No reaction: not enough energy (needs ' + D.fmt(p.barrier, 0) + ' kJ/mol, had ' + D.fmt(run.Ecoll, 0) + ')'];
  }

  /* ---------- drawing one frame of everything ---------- */
  function render() {
    D.resetTheme();
    if (st.tab === 'collision') renderCollision(); else renderChamber();
    st.dirty = false;
  }
  /* Boxes (in canvas coordinates) of the page text that sits on top of a canvas. */
  function hudBoxes(canvas) {
    const c = canvas.getBoundingClientRect(), out = [];
    canvas.parentElement.querySelectorAll('.hud > *, .hud .tag, .banner').forEach(el => {
      if (el.hidden || !el.offsetParent || el.classList.contains('tags')) return;
      const r = el.getBoundingClientRect();
      if (r.width && r.height) out.push({ str: 'page: ' + el.textContent.slice(0, 24), x0: r.left - c.left, x1: r.right - c.left, y0: r.top - c.top, y1: r.bottom - c.top });
    });
    return out;
  }
  let lastCaption = '';
  function renderCollision() {
    const view = { run: st.run, frame: st.frame, opts: st.opts, uncatPath: st.uncatPath, obstacles: hudBoxes($('stage')) };
    const info = Stage.draw($('stage'), view);
    if (!info) return;
    view.fr = info.fr; view.d = info.d;
    st.info = info;
    if (st.opts.gProfile) Graphs.profile($('cProfile'), view);
    if (st.opts.gBars) Graphs.bars($('cBars'), view);
    if (st.opts.gMorse) Graphs.morse($('cMorse'), view);
    if (st.opts.gPES) Graphs.pes($('cPES'), view);
    $('hudClock').textContent = 't = ' + D.fmt(info.fr.t, 0) + ' fs';
    $('scrub').value = Math.round(st.frame);
    const ph = Stage.phase(st.run, info.fr);
    st.phase = ph;
    const cap = st.opts.captions ? caption(ph, st.run) : '';
    if (cap !== lastCaption) { $('caption').innerHTML = cap; lastCaption = cap; }
    $('caption').classList.toggle('off', !st.opts.captions);
    $('btnPlay').textContent = st.playing ? 'Pause' : st.ended ? '↺ Replay' : st.frame > 0 ? '▶ Resume' : '▶ Launch';
  }

  let uiTick = 0;
  function renderChamber() {
    const ch = st.chamber;
    CS.drawBox($('chamber'), ch, st.opts);
    if (st.opts.gMB) CS.mb($('cMB'), ch, st.mb);
    if (st.opts.gConc) CS.conc($('cConc'), ch);
    if (st.opts.gArr) CS.arr($('cArr'), ch, st.mb);
    if (uiTick++ % 6 === 0) updateChamberUi(false);
  }
  function updateChamberUi(full) {
    const ch = st.chamber, sys = st.sys, th = D.theme();
    if (!ch) return;
    const c = ch.counts(), cols = CS.spColor(th);
    $('chLegend').innerHTML = CS.SPECIES.map(sp => '<span><i style="border-color:' + cols[sp] + '"></i>' + sys.formulas[sp] + ': ' + c[sp] + '</span>').join('');
    $('chTemp').textContent = 'T = ' + D.fmt(ch.tempAvg, 0) + ' K';
    $('chTempSub').textContent = st.opts.thermostat ? 'held at ' + D.fmt(ch.targetT, 0) + ' K' : 'insulated box (started at ' + D.fmt(ch.targetT, 0) + ' K)';
    const s = ch.stats, pct = (a, b) => b ? ' (' + D.fmt(100 * a / b, a / b < 0.1 ? 1 : 0) + '%)' : '';
    $('funnel').innerHTML =
      '<div><small>' + sys.formulas.A + ' + ' + sys.formulas.BC + ' collisions</small><b>' + s.coll + '</b></div>' +
      '<div><small>…with enough energy</small><b>' + s.energy + pct(s.energy, s.coll) + '</b></div>' +
      '<div class="win"><small>…and the right orientation = reacted</small><b>' + s.eff + pct(s.eff, s.coll) + '</b></div>' +
      (st.opts.allowReverse ? '<div><small>reverse reactions</small><b>' + s.rev + '</b></div>' : '');
    $('outTemp').textContent = D.fmt(+$('temp').value, 0) + ' K';
    $('outNA').textContent = $('nA').value; $('outNBC').textContent = $('nBC').value;
    $('outSimSpeed').textContent = Math.pow(2, +$('simSpeed').value) + '×';
    $('btnChamberPlay').textContent = st.chRunning ? 'Pause' : '▶ Start';
    $('btnZoomLast').disabled = !ch.last;
    $('subConc').textContent = s.eff ? s.eff + ' made so far' : '';
    let cap;
    const frac = M.arrhenius(Math.max(0, sys.Ea), ch.tempAvg);
    if (!st.chRunning && ch.t === 0) cap = 'Press <b>Start</b>. Every particle is moving, but only some collisions are hard enough, and aimed well enough, to react.';
    else if (!st.opts.thermostat && sys.dH < -1 && ch.tempAvg > ch.targetT * 1.05) cap = '<b>Exothermic in an insulated box:</b> each reaction turns potential energy into motion, so the temperature is climbing and the reaction speeds itself up. This is how explosions run away.';
    else if (!st.opts.thermostat && sys.dH > 1 && ch.tempAvg < ch.targetT * 0.95) cap = '<b>Endothermic in an insulated box:</b> each reaction turns motion into potential energy, so the gas is cooling and the reaction is slowing down.';
    else if (frac < 0.002) cap = 'At this temperature only about <b>1 collision in ' + big(1 / frac) + '</b> has enough energy. Raise the temperature or add a catalyst.';
    else if (st.opts.allowReverse && s.rev > 3) cap = 'Products are turning back into reactants too. When forward and reverse rates match, the amounts level off: <b>equilibrium</b>.';
    else cap = 'Gray ring = collision without reaction. <b>Green ring = effective collision.</b> About ' + D.fmt(frac * 100, frac < 0.1 ? 1 : 0) + '% of collisions have enough energy right now.';
    if ($('chCaption').innerHTML !== cap) $('chCaption').innerHTML = '<span>' + cap + '</span>';
    if (full) st.dirty = true;
  }

  /* ---------- time ---------- */
  function advance(dt) {
    if (st.tab === 'collision') {
      if (!st.playing) return;
      const last = st.run.frames.length - 1, before = st.frame;
      st.frame = Math.min(last, st.frame + dt * st.speed / 0.5);
      const top = st.run.iTop;
      if (st.opts.pauseTS && !st.pausedAtTop && before < top && st.frame >= top && top < last - 2) { st.frame = top; st.playing = false; st.pausedAtTop = true; }
      if (st.frame >= last) {
        st.playing = false; st.ended = true;
        const [cls, txt] = bannerText(st.run);
        $('banner').className = 'banner ' + cls; $('banner').textContent = txt; $('banner').hidden = false;
        if (st.opts.loop && !MANUAL) setTimeout(() => { if (st.ended && st.tab === 'collision') { restart(); st.playing = true; } }, 1800);
      }
      st.dirty = true;
    } else if (st.chRunning) {
      st.chamber.step(Math.min(dt, 0.05) * Math.pow(2, +$('simSpeed').value));
      st.dirty = true;
    }
  }
  function restart() { st.frame = 0; st.playing = false; st.ended = false; st.pausedAtTop = false; $('banner').hidden = true; st.dirty = true; }
  function togglePlay() {
    if (st.tab === 'chamber') { st.chRunning = !st.chRunning; updateChamberUi(true); return; }
    if (st.ended) restart();
    st.playing = !st.playing; st.dirty = true;
  }
  function stepFrames(n) { st.playing = false; st.ended = false; $('banner').hidden = true; st.frame = clamp(Math.round(st.frame) + n, 0, st.run.frames.length - 1); st.dirty = true; }

  let tPrev = 0;
  function loop(t) {
    const dt = Math.min(0.1, (t - tPrev) / 1000 || 0); tPrev = t;
    advance(dt);
    if (st.dirty) render();
    requestAnimationFrame(loop);
  }
  RX.advance = (dt) => { advance(dt); render(); };
  RX.render = render;

  /* ---------- options and levels ---------- */
  function applyOpts() {
    document.querySelectorAll('[data-opt]').forEach(el => { el.checked = !!st.opts[el.dataset.opt]; });
    document.querySelectorAll('[data-card]').forEach(el => { el.hidden = !st.opts[el.dataset.card]; });
    st.dirty = true;
  }
  function setLevel(level, keepRx) {
    st.level = level;
    for (const k of ALL_OPTS) st.opts[k] = LEVELS[level].includes(k);
    document.querySelectorAll('#levelSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.level === level));
    applyOpts();
    if (!keepRx) {
      const rx = CD.REACTIONS.find(r => r.id === st.rxId);
      if (level === 'organic' && rx.level !== 'organic') setReaction('SN2');
      else if (level !== 'organic' && rx.level === 'organic') setReaction('F_H2');
      else if (st.sys) rebuildRun();
    }
  }
  function setReaction(id) {
    st.rxId = id; st.reverse = false; st.angle = 0;
    $('rxSelect').value = id;
    rebuildSystem(false);
  }
  function setTab(tab) {
    st.tab = tab; st.playing = false;
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
    $('view-collision').hidden = tab !== 'collision'; $('view-chamber').hidden = tab !== 'chamber';
    document.querySelectorAll('.side [data-for]').forEach(el => { el.hidden = el.dataset.for !== tab; });
    updateChamberUi(true); st.dirty = true;
  }

  /* ---------- guided lesson ---------- */
  const only = (...on) => { for (const k of ALL_OPTS) st.opts[k] = on.includes(k) || ['orient', 'thermostat', 'flashes', 'trails', 'gMB', 'gConc', 'gFunnel'].includes(k); applyOpts(); };
  const setup = (id, eFactor, angle) => { setTab('collision'); if (st.rxId !== id || st.reverse || st.catalyst) { st.catalyst = false; $('optCatalyst').checked = false; setReaction(id); } st.angle = angle || 0; rebuildRun(); st.energy = Math.round(st.path.barrier * eFactor + (eFactor > 1 ? 3 : 0)); if (!isFinite(st.energy)) st.energy = Math.round(st.sys.Ea * 3); $('energy').value = st.energy; rebuildRun(); };
  const TOUR = [
    { title: 'Meet the particles', text: 'A fluorine atom is about to meet a hydrogen molecule. The soft glow around each nucleus is its electron cloud. Where two clouds merge into one, the atoms are sharing electrons: that is a covalent bond.',
      ask: 'Which atoms are bonded right now? How can you tell from the picture?', go: () => { only('cloud', 'labels'); setup('F_H2', 3); } },
    { title: 'A collision that works', text: 'Press Launch and watch in slow motion. The whole event takes about 150 femtoseconds. Use the slider under the picture to drag back and forth through it.',
      ask: 'Which bond broke? Which bond formed? Did they happen one after the other, or at the same time?', go: () => { only('cloud', 'labels', 'captions'); setup('F_H2', 3); st.playing = true; } },
    { title: 'A collision that fails', text: 'Same particles, same aim, but a gentler collision. Chlorine and hydrogen need at least 23 kJ/mol. This collision has less.',
      ask: 'Predict before you press Launch: what will happen? Why do the particles turn around?', go: () => { only('cloud', 'labels', 'captions'); setup('Cl_H2', 0.6); } },
    { title: 'The energy hill', text: 'The graph shows potential energy as the reaction goes from reactants (left) to products (right). The dot is the atoms you are watching. The dashed line is the energy this collision has to spend. The height of the hill is the activation energy, Eₐ.',
      ask: 'Change the collision energy. What is the smallest value that gets the dot over the hill?', go: () => { only('cloud', 'labels', 'captions', 'gProfile', 'showEa', 'showTotal'); setup('Cl_H2', 1.25); st.playing = true; } },
    { title: 'Energy changes form', text: 'The bars show where the energy is. As the particles climb the hill they slow down: kinetic energy becomes potential energy. The total never changes. The animation will pause at the top.',
      ask: 'At the top of the hill, which bar is biggest? Where did the kinetic energy go?', go: () => { only('cloud', 'labels', 'captions', 'gProfile', 'gBars', 'showEa', 'showTotal', 'pauseTS', 'velocity'); setup('Cl_H2', 1.25); st.playing = true; } },
    { title: 'Aim matters too', text: 'Plenty of energy this time, but the molecule is turned sideways. Try the orientation slider: head-on, tilted, side-on, wrong end.',
      ask: 'Why does a sideways hit fail even with lots of energy? What two things does an effective collision need?', go: () => { only('cloud', 'labels', 'captions', 'gProfile', 'showEa', 'showTotal'); setup('CO_NO2', 1.0, 0); st.energy = Math.round(st.sys.Ea * 1.25); $('energy').value = st.energy; st.angle = 90; rebuildRun(); st.playing = true; } },
    { title: 'Exothermic or endothermic?', text: 'Compare where the reactants start with where the products finish. Here the products are lower: energy was released (ΔH is negative). Then choose Br + H₂ from the reaction list and compare.',
      ask: 'Do the products fly away faster or slower than the reactants came in? What would a thermometer show?', go: () => { only('cloud', 'labels', 'captions', 'gProfile', 'gBars', 'showEa', 'showDH', 'showTotal', 'velocity', 'vib'); setup('F_H2', 3); st.playing = true; } },
    { title: 'Push and pull', text: 'Arrows show the forces between each pair of atoms. Arrows pointing apart mean repulsion (push); arrows pointing together mean attraction (pull). The second graph shows the energy of each bond as its length changes.',
      ask: 'When does the push on the incoming atom turn into a pull? What is special about that moment?', go: () => { only('cloud', 'labels', 'captions', 'forces', 'lengths', 'gProfile', 'gMorse', 'showEa', 'showTotal', 'pauseTS'); setup('H_H2', 1.2); st.playing = true; } },
    { title: 'Follow the electrons', text: 'The dots are the electrons that move. The yellow one starts on chlorine; the blue pair is the C–H bond. Curved arrows show where each electron is headed. δ+ and δ− show which atom holds the shared electrons more tightly.',
      ask: 'Where does each of the three electrons end up? Which atom is left with an unpaired electron?', go: () => { only('cloud', 'labels', 'captions', 'electrons', 'arrows', 'charges', 'bondOrder', 'gProfile', 'showEa', 'showTotal'); setup('Cl_CH4', 1.5); st.playing = true; } },
    { title: 'Zoom out: many particles', text: 'Real samples contain huge numbers of particles moving at different speeds. Gray rings are collisions that failed, green rings are collisions that reacted. The tally under the box keeps score.',
      ask: 'Out of all the collisions, what fraction react? What stops the others?', go: () => { only('cloud', 'labels', 'captions', 'gProfile', 'gBars', 'showEa', 'showDH', 'showTotal'); if (st.rxId !== 'Cl_H2') setReaction('Cl_H2'); setTab('chamber'); st.chamber.reset(30, 30, st.chamber.T0); st.chRunning = true; } },
    { title: 'Turn up the heat', text: 'The curve shows how kinetic energy is shared among the molecules. The shaded tail is the fraction with at least Eₐ. Press "Pin curve", then raise the temperature and compare.',
      ask: 'Does heating change Eₐ? What does change? Why does a small temperature rise speed a reaction up so much?', go: () => { setTab('chamber'); st.opts.gMB = true; st.opts.gArr = false; applyOpts(); st.mb.pin = st.chamber.tempAvg; st.chRunning = true; } },
    { title: 'Add a catalyst', text: 'A catalyst gives the reaction an easier route. Tick "Catalyst" in the Reaction panel and watch the Eₐ line on the distribution move left. Then look at view ① to see the lower hill.',
      ask: 'Did the catalyst change the temperature, ΔH, or the energy of the particles? What did it change?', go: () => { setTab('chamber'); st.mb.pin = null; st.catalyst = true; $('optCatalyst').checked = true; rebuildSystem(true); st.chRunning = true; } }
  ];
  let tourAt = -1;
  function showTour(i) {
    tourAt = clamp(i, 0, TOUR.length - 1);
    const s = TOUR[tourAt];
    $('tour').hidden = false; document.body.classList.remove('no-side'); $('side').scrollTop = 0;
    $('tourStep').textContent = 'Guided lesson · step ' + (tourAt + 1) + ' of ' + TOUR.length;
    $('tourTitle').textContent = s.title; $('tourText').textContent = s.text; $('tourAsk').textContent = s.ask ? 'Ask: ' + s.ask : '';
    $('tourPrev').disabled = tourAt === 0; $('tourNext').textContent = tourAt === TOUR.length - 1 ? 'Finish' : 'Next →';
    s.go(); updateChamberUi(true); st.dirty = true;
  }
  RX.showTour = showTour; RX.TOUR = TOUR;
  RX.api = { setReaction, setLevel, setTab, rebuildSystem, rebuildRun, applyOpts };

  /* ---------- wiring ---------- */
  function init() {
    // theme
    const saved = (() => { try { return localStorage.getItem('rx-theme'); } catch (e) { return null; } })();
    const theme = params.get('theme') || saved || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;

    // reaction list
    const groups = [['General chemistry', 'core'], ['AP classic', 'ap'], ['Organic chemistry', 'organic']];
    const sel = $('rxSelect');
    for (const [label, lv] of groups) {
      const og = document.createElement('optgroup'); og.label = label;
      CD.REACTIONS.filter(r => r.level === lv).forEach(r => { const o = document.createElement('option'); o.value = r.id; o.textContent = r.custom ? 'Build your own: ' + r.name : r.name; og.appendChild(o); });
      sel.appendChild(og);
    }
    sel.addEventListener('change', () => setReaction(sel.value));

    const level = LEVELS[params.get('level')] ? params.get('level') : 'honors';
    if (params.get('rx') && CD.REACTIONS.some(r => r.id === params.get('rx'))) st.rxId = params.get('rx');
    st.reverse = params.has('reverse'); st.catalyst = params.has('cat');
    setLevel(level, true);
    (params.get('show') || '').split(',').filter(Boolean).forEach(k => { st.opts[k] = true; });
    (params.get('hide') || '').split(',').filter(Boolean).forEach(k => { st.opts[k] = false; });
    applyOpts();
    sel.value = st.rxId; $('optCatalyst').checked = st.catalyst;
    rebuildSystem(false);
    if (params.get('E')) { st.energy = clamp(+params.get('E'), 0, +$('energy').max); $('energy').value = st.energy; }
    if (params.get('angle')) st.angle = clamp(+params.get('angle'), 0, 180);
    rebuildRun();
    if (params.get('tab') === 'chamber') setTab('chamber');

    document.querySelectorAll('#levelSeg button').forEach(b => b.addEventListener('click', () => setLevel(b.dataset.level)));
    document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
    document.querySelectorAll('[data-opt]').forEach(el => el.addEventListener('change', () => {
      st.opts[el.dataset.opt] = el.checked; applyOpts();
      if (el.dataset.opt === 'vib') { const f = st.frame; rebuildRun(); st.frame = Math.min(f, st.run.frames.length - 1); }
      updateChamberUi(true);
    }));

    $('btnReverse').addEventListener('click', () => { st.reverse = !st.reverse; st.angle = 0; rebuildSystem(false); });
    $('optCatalyst').addEventListener('change', (e) => { st.catalyst = e.target.checked; rebuildSystem(true); });
    $('customEa').addEventListener('input', (e) => { st.customEa = +e.target.value; rebuildSystem(true); });
    $('customDH').addEventListener('input', (e) => { st.customDH = +e.target.value; rebuildSystem(true); });
    $('energy').addEventListener('input', (e) => { st.energy = +e.target.value; rebuildRun(); });
    $('angle').addEventListener('input', (e) => { st.angle = +e.target.value; rebuildRun(); });
    $('energyChips').addEventListener('click', (e) => {
      const f = +e.target.dataset.e; if (!f) return;
      const need = st.path.reactive ? st.path.barrier : st.sys.Ea;
      st.energy = clamp(Math.round((need * f + (f > 1 ? 1.5 : 0)) * 2) / 2, 1, +$('energy').max); $('energy').value = st.energy; rebuildRun();
    });
    $('angleChips').addEventListener('click', (e) => { if (e.target.dataset.a === undefined) return; st.angle = +e.target.dataset.a; rebuildRun(); });

    $('btnPlay').addEventListener('click', togglePlay);
    $('btnRestart').addEventListener('click', restart);
    $('btnStepB').addEventListener('click', () => stepFrames(-4));
    $('btnStepF').addEventListener('click', () => stepFrames(4));
    $('scrub').addEventListener('input', (e) => { st.playing = false; st.ended = false; $('banner').hidden = true; st.frame = +e.target.value; st.dirty = true; });
    $('speed').addEventListener('change', (e) => { st.speed = +e.target.value; updateSlow(); });
    function updateSlow() { $('hudSlow').textContent = '1 second here = ' + st.speed + ' fs · ' + big(1e15 / st.speed) + ' times slower than real life'; }
    updateSlow();

    // chamber
    $('temp').addEventListener('input', (e) => { st.chamber.setTemperature(+e.target.value); updateChamberUi(true); });
    $('nA').addEventListener('input', (e) => { st.chamber.setCount('A', +e.target.value); updateChamberUi(true); });
    $('nBC').addEventListener('input', (e) => { st.chamber.setCount('BC', +e.target.value); updateChamberUi(true); });
    $('simSpeed').addEventListener('input', () => updateChamberUi(true));
    $('btnChamberPlay').addEventListener('click', togglePlay);
    $('btnChamberReset').addEventListener('click', () => { st.chamber.reset(+$('nA').value, +$('nBC').value, +$('temp').value); st.mb.ymax = 0; updateChamberUi(true); });
    $('btnPin').addEventListener('click', () => { st.mb.pin = st.mb.pin ? null : st.chamber.tempAvg; $('btnPin').textContent = st.mb.pin ? 'Unpin' : 'Pin curve'; st.dirty = true; });
    $('btnArrMode').addEventListener('click', () => { st.mb.arrMode = st.mb.arrMode === 'k' ? 'ln' : 'k'; $('btnArrMode').textContent = st.mb.arrMode === 'k' ? 'ln k vs 1/T' : 'k vs T'; st.dirty = true; });
    $('btnZoomLast').addEventListener('click', () => {
      const L = st.chamber.last; if (!L) return;
      st.chRunning = false; setTab('collision');
      st.angle = st.opts.orient ? L.angle : 0;
      st.energy = clamp(Math.round(L.Eloc * 2) / 2, 0.5, +$('energy').max); $('energy').value = st.energy;
      rebuildRun(); st.playing = true;
    });

    // top bar
    $('btnTheme').addEventListener('click', () => {
      const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = t; try { localStorage.setItem('rx-theme', t); } catch (e) { /* private mode */ }
      D.resetTheme(); updateChamberUi(true); st.dirty = true;
    });
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

    // enlarge a graph
    document.querySelectorAll('.card .expand').forEach(b => b.addEventListener('click', () => {
      const card = b.closest('.card'), on = !card.classList.contains('big');
      document.querySelectorAll('.card.big').forEach(c => c.classList.remove('big'));
      card.classList.toggle('big', on); b.textContent = on ? '✕' : '⤢'; st.dirty = true;
    }));

    // hover read-outs on graphs
    const tip = $('tip');
    document.querySelectorAll('.card canvas').forEach(c => {
      c.addEventListener('mousemove', (e) => {
        const r = c.getBoundingClientRect(), txt = c._hover ? c._hover(e.clientX - r.left, e.clientY - r.top) : null;
        if (!txt) { tip.hidden = true; return; }
        tip.textContent = txt; tip.hidden = false;
        tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 8, e.clientX + 14) + 'px';
        tip.style.top = Math.max(8, e.clientY - tip.offsetHeight - 10) + 'px';
      });
      c.addEventListener('mouseleave', () => { tip.hidden = true; });
    });

    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input[type=text], select, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (k === 'Escape') { $('help').hidden = true; document.querySelectorAll('.card.big').forEach(c => { c.classList.remove('big'); c.querySelector('.expand').textContent = '⤢'; }); st.dirty = true; return; }
      if (e.target.matches('input[type=range]') && (k === 'ArrowLeft' || k === 'ArrowRight')) return;
      if (k === ' ') { e.preventDefault(); togglePlay(); }
      else if (k === 'ArrowRight' && st.tab === 'collision') { e.preventDefault(); stepFrames(e.shiftKey ? 20 : 4); }
      else if (k === 'ArrowLeft' && st.tab === 'collision') { e.preventDefault(); stepFrames(e.shiftKey ? -20 : -4); }
      else if (k === 'r' || k === 'R') { if (st.tab === 'collision') restart(); else $('btnChamberReset').click(); }
      else if (k === 't' || k === 'T') { if (st.tab === 'collision') { st.playing = false; st.ended = false; $('banner').hidden = true; st.frame = st.run.iTop; st.dirty = true; } }
      else if (k === 'h' || k === 'H') $('btnSide').click();
      else if (k === 'f' || k === 'F') full();
      else if (k === '1') setTab('collision');
      else if (k === '2') setTab('chamber');
    });

    // a canvas whose box changes size (window resize, caption wrapping, a card hidden) must be redrawn
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => { st.dirty = true; if (MANUAL) render(); });
      document.querySelectorAll('canvas').forEach(c => ro.observe(c));
    }
    window.addEventListener('resize', () => { st.dirty = true; });
    document.addEventListener('click', () => { st.dirty = true; });

    render();
    if (!MANUAL) requestAnimationFrame(loop);
  }

  init();
})();
