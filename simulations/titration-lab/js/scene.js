/* scene.js: draws the lab bench (ring stand, buret, flask, stirrer, pH meter) and the
 * zoomed-in views: particles in the flask, particles in the buret, and the buret scale.
 *
 * Everything is drawn in a fixed "bench" coordinate system (660 x 720) and scaled to fit.
 * The flask is a 125 mL Erlenmeyer drawn to scale, and its liquid level is computed from the
 * true volume of that shape. The buret is drawn shorter than a real one so it fits the screen.
 */
(function (root) {
  'use strict';
  const D = root.Draw, C = root.Chem;
  const W0 = 660, H0 = 694;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, f) => a + (b - a) * f;

  /* ---------- geometry (bench units; 16.7 units = 1 cm for the flask) ---------- */
  const PX_CM = 16.7;
  const FL = { cx: 262, bottom: 574, top: 384, neckY: 446, baseR: 56, neckR: 22, lipR: 26 };
  const BU = { cx: 262, top: 34, y0: 56, y50: 330, r: 10, ri: 7.5, cockY: 356, tipY: 401 };
  const mlToY = (ml) => BU.y0 + (BU.y50 - BU.y0) * ml / 50;

  /* Half-width of the inside of the flask at height y. */
  function flaskR(y) {
    if (y <= FL.neckY) return FL.neckR - 2;
    const f = (y - FL.neckY) / (FL.bottom - 8 - FL.neckY);
    return lerp(FL.neckR - 2, FL.baseR - 3, clamp(f, 0, 1));
  }
  /* Table of volume (mL) against liquid height, from the flask's real shape. */
  const LEVELS = (() => {
    const out = []; let vol = 0;
    for (let y = FL.bottom - 3; y >= FL.top + 4; y -= 0.5) {
      const r = flaskR(y) / PX_CM;
      vol += Math.PI * r * r * (0.5 / PX_CM);                // cm³ = mL
      out.push({ y, vol });
    }
    return out;
  })();
  function levelY(ml) { for (const p of LEVELS) if (p.vol >= ml) return p.y; return LEVELS[LEVELS.length - 1].y; }
  const FLASK_MAX_ML = LEVELS.find(p => p.y <= FL.neckY + 6).vol;   // full to the base of the neck

  /* ---------- particles ---------- */
  const STYLE = {
    H3O: { color: '#e25545', r: 0.062, nubs: 3, sign: '+', name: 'H₃O⁺' },
    OH: { color: '#3f7fe0', r: 0.06, nubs: 1, sign: '−', name: 'OH⁻' },
    Na: { color: '#a08fd0', r: 0.05, nubs: 0, sign: '+', name: 'Na⁺' },
    Cl: { color: '#4fb06c', r: 0.068, nubs: 0, sign: '−', name: 'Cl⁻' },
    water: { color: '#b9c6d8', r: 0.045, nubs: 2, sign: '', name: 'H₂O' }
  };
  const WEAK_COLOR = { acid: '#1fa39a', base: '#7a6fdc', Na2CO3: '#d98a2b', H3PO4: '#d98a2b' };
  function styleOf(sp, analyteId) {
    if (sp.kind !== 'weak') return STYLE[sp.kind];
    const A = C.REAGENTS[analyteId];
    return { color: WEAK_COLOR[analyteId] || WEAK_COLOR[A.type], r: 0.082, nubs: sp.protons, sign: sp.charge > 0 ? '+' : sp.charge < 0 ? '−' : '', name: sp.label,
      mult: Math.abs(sp.charge) > 1 ? Math.abs(sp.charge) : 0 };
  }

  function drawParticle(ctx, x, y, R, st, th, alpha) {
    const r = st.r * R;
    ctx.save(); ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    // acidic hydrogens: small white bumps around the body
    for (let i = 0; i < st.nubs; i++) {
      const a = -Math.PI / 2 + (i - (st.nubs - 1) / 2) * (st.nubs === 3 ? 2.094 : 1.75) + (st.nubs === 2 ? Math.PI : 0);
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 1.02, y + Math.sin(a) * r * 1.02, r * 0.5, 0, 7);
      ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = Math.max(0.8, r * 0.12); ctx.strokeStyle = '#4a5568'; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = st.color; ctx.fill();
    ctx.lineWidth = Math.max(0.8, r * 0.12); ctx.strokeStyle = 'rgba(20,30,50,.55)'; ctx.stroke();
    if (st.sign && r > 3.2) {
      const s = r * 0.55;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.2, r * 0.22); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
      if (st.sign === '+') { ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); }
      ctx.stroke();
    }
    ctx.restore();
  }

  /* A cloud of particles living inside a unit circle. */
  class Cloud {
    constructor() { this.parts = []; this.ghosts = []; }
    add(key, st, x, y, fade) {
      const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * 0.88;
      const p = { key, st, x: x === undefined ? Math.cos(a) * d : x, y: y === undefined ? Math.sin(a) * d : y,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, born: fade ? 0 : 1, flash: 0, dying: 0 };
      this.parts.push(p); return p;
    }
    count(key) { let n = 0; for (const p of this.parts) if (p.key === key && !p.dying && !p.pending) n++; return n; }

    /* Bring the cloud to the target counts. Particles of the same family are converted in place
     * (HA becomes A⁻ where it stands); the titrant's reacting ion flies in from the top to do it. */
    reconcile(target, styles, opts) {
      opts = opts || {};
      const keys = Object.keys(target), diff = {};
      for (const k of keys) diff[k] = target[k] - this.count(k);
      for (const p of this.parts) if (!(p.key in target) && !p.dying) p.dying = 0.001;
      const family = (k) => styles[k].family;
      const entry = () => ({ x: (Math.random() - 0.5) * 0.24, y: -0.86 });
      let animated = 0;
      // 1. conversions within a family (weak acid/base forms)
      for (const to of keys) for (const from of keys) {
        if (from === to || family(from) !== family(to) || !family(to)) continue;
        while (diff[to] > 0 && diff[from] < 0) {
          const cands = this.parts.filter(p => p.key === from && !p.dying && !p.pending);
          if (!cands.length) break;
          cands.sort((a, b) => (a.y + Math.abs(a.x)) - (b.y + Math.abs(b.x)));
          const p = cands[0];
          if (opts.instant || !opts.ghost || animated >= 8) { p.key = to; p.st = styles[to].st; p.flash = opts.instant ? 0 : 1; }
          else { p.pending = { key: to, st: styles[to].st }; const e = entry(); this.ghosts.push({ st: STYLE[opts.ghost], x: e.x, y: e.y, target: p, t: 0, delay: animated * 0.07 }); animated++; }
          diff[to]--; diff[from]++;
        }
      }
      // 2. everything else: new particles arrive (titrant ions drop in from the top), surplus ones fade out
      for (const k of keys) {
        while (diff[k] > 0) {
          const fromBuret = opts.titrantKinds && opts.titrantKinds.includes(k) && !opts.instant;
          const e = entry();
          const p = fromBuret ? this.add(k, styles[k].st, e.x, e.y, true) : this.add(k, styles[k].st, undefined, undefined, !opts.instant);
          if (fromBuret) { p.vy = 0.5; }
          if (opts.instant) p.born = 1;
          diff[k]--;
        }
        while (diff[k] < 0) {
          const cands = this.parts.filter(p => p.key === k && !p.dying && !p.pending);
          if (!cands.length) break;
          const p = cands[cands.length - 1];
          // H3O+ and OH- are used up by the titrant's ion: show it arriving
          if (!opts.instant && opts.ghost && (k === 'H3O' || k === 'OH') && k !== opts.ghost && animated < 8) {
            p.pending = { die: true }; const e = entry(); this.ghosts.push({ st: STYLE[opts.ghost], x: e.x, y: e.y, target: p, t: 0, delay: animated * 0.07 }); animated++;
          } else if (opts.instant) this.parts.splice(this.parts.indexOf(p), 1);
          else p.dying = 0.001;
          diff[k]++;
        }
      }
    }
    step(dt, stir) {
      const k = stir ? 1.5 : 1;                                // stirring: everything moves faster
      for (const p of this.parts) {
        p.vx += (Math.random() - 0.5) * 2.4 * dt * k; p.vy += (Math.random() - 0.5) * 2.4 * dt * k;
        const sp = Math.hypot(p.vx, p.vy), max = 0.28 * k;
        if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        const d = Math.hypot(p.x, p.y), lim = 0.92 - p.st.r;
        if (d > lim) { const nx = p.x / d, ny = p.y / d, vn = p.vx * nx + p.vy * ny; p.x = nx * lim; p.y = ny * lim; if (vn > 0) { p.vx -= 2 * vn * nx; p.vy -= 2 * vn * ny; } }
        if (p.born < 1) p.born = Math.min(1, p.born + dt * 2.5);
        if (p.flash > 0) p.flash = Math.max(0, p.flash - dt * 1.2);
        if (p.dying) p.dying += dt * 2.5;
      }
      this.parts = this.parts.filter(p => !(p.dying >= 1));
      for (const g of this.ghosts) {
        if (g.delay > 0) { g.delay -= dt; continue; }
        g.t += dt;
        const tx = g.target.x, ty = g.target.y, dx = tx - g.x, dy = ty - g.y, d = Math.hypot(dx, dy);
        const v = 1.9;
        if (d < v * dt + 0.03 || g.t > 2) {
          const p = g.target;
          if (p.pending) { if (p.pending.die) p.dying = 0.3; else { p.key = p.pending.key; p.st = p.pending.st; p.flash = 1; } p.pending = null; }
          g.done = true;
        } else { g.x += dx / d * v * dt; g.y += dy / d * v * dt; }
      }
      this.ghosts = this.ghosts.filter(g => !g.done);
    }
    settle() { for (const g of this.ghosts) { const p = g.target; if (p.pending) { if (p.pending.die) p.dying = 1; else { p.key = p.pending.key; p.st = p.pending.st; } p.pending = null; } } this.ghosts = []; this.parts = this.parts.filter(p => !(p.dying >= 1)); }
    draw(ctx, cx, cy, R, th) {
      for (const p of this.parts) {
        const a = Math.min(p.born, p.dying ? 1 - p.dying : 1) * (p.key === 'water' ? 0.5 : 1);
        if (p.flash > 0) { ctx.beginPath(); ctx.arc(cx + p.x * R, cy + p.y * R, p.st.r * R * (1.5 + 1.2 * (1 - p.flash)), 0, 7); ctx.strokeStyle = D.rgba('#f5b301', p.flash); ctx.lineWidth = 2.5; ctx.stroke(); }
        drawParticle(ctx, cx + p.x * R, cy + p.y * R, R, p.st, th, a);
      }
      for (const g of this.ghosts) if (g.delay <= 0) drawParticle(ctx, cx + g.x * R, cy + g.y * R, R, g.st, th, 0.95);
    }
  }

  /* How many of each particle to show for a mixture: the analyte starts as 20 particles. */
  function particleTargets(mix, water) {
    const unit = mix.nA / 20, target = {}, styles = {}, trace = [];
    for (const sp of mix.species) {
      const key = sp.kind === 'weak' ? 'w' + sp.protons : sp.kind;
      const n = Math.round(sp.mmol / unit);
      styles[key] = { st: styleOf(sp, mix.exp.analyte), family: sp.kind === 'weak' ? 'weak' : null, label: sp.label };
      target[key] = Math.min(n, 150);
      if (n === 0 && sp.mmol / unit > 0.02) trace.push(sp.label);
    }
    if (water) { target.water = 60; styles.water = { st: STYLE.water, family: null, label: 'H₂O' }; }
    return { target, styles, unit, trace };
  }
  function buretTargets(exp, water) {
    const T = C.REAGENTS[exp.titrant], ion = T.type === 'base' ? 'OH' : 'H3O', sp = T.type === 'base' ? 'Na' : 'Cl';
    const n = clamp(Math.round(8 * exp.Ct / 0.1), 2, 30);
    const target = { [ion]: n, [sp]: n }, styles = { [ion]: { st: STYLE[ion], label: STYLE[ion].name }, [sp]: { st: STYLE[sp], label: STYLE[sp].name } };
    if (water) { target.water = 34; styles.water = { st: STYLE.water, label: 'H₂O' }; }
    return { target, styles };
  }

  /* ---------- drawing helpers ---------- */
  function glassStroke(ctx, th, w) { ctx.strokeStyle = th.dark ? 'rgba(200,220,245,.75)' : 'rgba(70,95,130,.8)'; ctx.lineWidth = w || 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }
  const liquidCss = (c, th) => {
    // a faint water tint under the indicator colour so "colorless" liquid is still visible
    const base = th.dark ? [120, 160, 210, 0.22] : [150, 190, 230, 0.28], a = c[3];
    return 'rgba(' + Math.round(lerp(base[0], c[0], a / (a + 0.0001) * Math.min(1, a * 1.6))) + ',' + Math.round(lerp(base[1], c[1], Math.min(1, a * 1.6))) + ',' + Math.round(lerp(base[2], c[2], Math.min(1, a * 1.6))) + ',' + (base[3] + a * 0.75).toFixed(3) + ')';
  };

  function flaskPath(ctx) {
    const { cx, bottom, top, neckY, baseR, neckR, lipR } = FL;
    ctx.beginPath();
    ctx.moveTo(cx - lipR, top); ctx.lineTo(cx - neckR, top + 5); ctx.lineTo(cx - neckR, neckY);
    ctx.lineTo(cx - baseR, bottom - 12); ctx.quadraticCurveTo(cx - baseR - 2, bottom, cx - baseR + 10, bottom);
    ctx.lineTo(cx + baseR - 10, bottom); ctx.quadraticCurveTo(cx + baseR + 2, bottom, cx + baseR, bottom - 12);
    ctx.lineTo(cx + neckR, neckY); ctx.lineTo(cx + neckR, top + 5); ctx.lineTo(cx + lipR, top);
  }

  /* ---------- main draw ---------- */
  function draw(canvas, v) {
    const { ctx, w, h } = D.fit(canvas);
    const th = D.theme(), o = v.opts, ts = th.scale;
    for (const b of v.obstacles || []) canvas._texts.push(b);
    const anyLens = o.zFlask || o.zBuret || o.zRead;
    const usedW = anyLens ? W0 : 430;
    const padTop = 58 * ts;                                 // read-outs sit along the top
    const S = Math.min(w / usedW, (h - padTop - 6) / H0);
    const ox = (w - usedW * S) / 2, oy = h - 4 - H0 * S;            // the bench sits at the bottom of the picture
    ctx.save(); ctx.translate(ox, oy); ctx.scale(S, S);
    const fs = (px) => Math.max(px, 10.5 * ts / S);         // font size that stays readable when scaled down
    const T = (str, x, y, opt) => D.text(ctx, str, x, y, opt);
    const halo = th.dark ? 'rgba(8,12,23,.85)' : 'rgba(255,255,255,.9)';

    /* bench top */
    ctx.fillStyle = th.dark ? '#1b2338' : '#d9dfe9'; ctx.fillRect(-ox / S, 644, w / S, 400);
    ctx.strokeStyle = th.dark ? '#313c5a' : '#b9c2d2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-ox / S, 644); ctx.lineTo((w - ox) / S, 644); ctx.stroke();

    /* ring stand: base, rod, clamp */
    const metal = ctx.createLinearGradient(94, 0, 106, 0);
    metal.addColorStop(0, '#6f7a8c'); metal.addColorStop(0.45, '#d5dbe5'); metal.addColorStop(1, '#5c6677');
    ctx.fillStyle = th.dark ? '#2a3147' : '#4a5364'; D.roundRect(ctx, 66, 630, 338, 15, 4); ctx.fill();
    ctx.fillStyle = metal; ctx.fillRect(95, 22, 10, 610);
    ctx.fillStyle = '#39414f'; D.roundRect(ctx, 88, 178, 24, 26, 4); ctx.fill();          // boss head
    ctx.fillStyle = metal; ctx.fillRect(112, 187, 118, 7);                                  // clamp arm
    ctx.fillStyle = '#39414f';
    for (const yy of [140, 240]) { D.roundRect(ctx, 228, yy - 9, 12, 18, 3); ctx.fill(); D.roundRect(ctx, BU.cx + BU.r - 1, yy - 9, 12, 18, 3); ctx.fill(); }
    ctx.fillRect(232, 140, 5, 100);
    ctx.strokeStyle = '#39414f'; ctx.lineWidth = 3;
    for (const yy of [140, 240]) { ctx.beginPath(); ctx.moveTo(236, yy); ctx.lineTo(BU.cx - BU.r, yy); ctx.moveTo(BU.cx + BU.r, yy); ctx.lineTo(BU.cx + BU.r + 6, yy); ctx.stroke(); }

    /* stir plate */
    const plate = ctx.createLinearGradient(0, 576, 0, 632);
    plate.addColorStop(0, th.dark ? '#dfe4ec' : '#f7f8fb'); plate.addColorStop(0.16, th.dark ? '#c9d0db' : '#e6e9ef'); plate.addColorStop(0.17, th.dark ? '#3b455c' : '#56617a'); plate.addColorStop(1, th.dark ? '#2c3449' : '#434d63');
    ctx.fillStyle = plate; D.roundRect(ctx, 150, 576, 224, 55, 6); ctx.fill();
    ctx.fillStyle = '#1d2433'; ctx.beginPath(); ctx.arc(190, 608, 10, 0, 7); ctx.fill();
    ctx.strokeStyle = '#e8ecf3'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(190, 608); ctx.lineTo(190 + 8 * Math.cos(o.stir ? -0.6 : -2.4), 608 + 8 * Math.sin(o.stir ? -0.6 : -2.4)); ctx.stroke();
    ctx.fillStyle = o.stir ? '#3ddc84' : '#566078'; ctx.beginPath(); ctx.arc(214, 608, 3.5, 0, 7); ctx.fill();
    if (o.labels) T('stirrer', 330, 611, { size: fs(10), color: '#e8ecf3', align: 'center', base: 'middle', fixed: true });

    /* ----- flask ----- */
    const total = v.mix.V, surfY = levelY(total), col = v.color;
    // liquid
    ctx.save(); flaskPath(ctx); ctx.closePath(); ctx.clip();
    ctx.fillStyle = liquidCss(col, th); ctx.fillRect(FL.cx - 80, surfY, 160, FL.bottom - surfY + 2);
    // colour flashing where the drop lands, before stirring spreads it out
    if (v.flash && v.flash.a > 0.02) {
      const g = ctx.createRadialGradient(FL.cx, surfY + 6, 1, FL.cx, surfY + 10, 16 + 26 * v.flash.spread);
      const c = v.flash.color; g.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (0.85 * v.flash.a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
      ctx.fillStyle = g; ctx.fillRect(FL.cx - 80, surfY, 160, FL.bottom - surfY);
    }
    // stir bar
    const sa = v.time * (o.stir ? 9 : 0), bw = 15 * Math.abs(Math.cos(sa)) + 4;
    ctx.fillStyle = '#f4f6fa'; D.roundRect(ctx, FL.cx - bw, FL.bottom - 8, bw * 2, 6, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(60,70,90,.6)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    // surface
    const sr = flaskR(surfY);
    ctx.beginPath(); ctx.ellipse(FL.cx, surfY, sr, 3.2, 0, 0, 7);
    ctx.fillStyle = th.dark ? 'rgba(220,235,255,.16)' : 'rgba(255,255,255,.45)'; ctx.fill();
    ctx.strokeStyle = th.dark ? 'rgba(200,220,245,.5)' : 'rgba(70,95,130,.45)'; ctx.lineWidth = 1; ctx.stroke();
    // pH probe (behind the front glass line)
    if (o.meter) {
      ctx.strokeStyle = '#2b3242'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(279, 346); ctx.bezierCurveTo(279, 254, 60, 374, 62, 552); ctx.stroke();   // cable
      ctx.fillStyle = '#2b3242'; D.roundRect(ctx, 274, 340, 10, 30, 3); ctx.fill();
      const pg = ctx.createLinearGradient(276, 0, 283, 0); pg.addColorStop(0, 'rgba(210,225,245,.9)'); pg.addColorStop(1, 'rgba(150,170,200,.9)');
      ctx.fillStyle = pg; D.roundRect(ctx, 276, 368, 6.5, Math.max(40, FL.bottom - 22 - 368), 3); ctx.fill();
      ctx.strokeStyle = 'rgba(60,75,100,.7)'; ctx.lineWidth = 1; ctx.stroke();
    }
    // glass
    glassStroke(ctx, th, 2.2); flaskPath(ctx); ctx.stroke();
    ctx.strokeStyle = th.dark ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(FL.cx - FL.neckR + 5, FL.neckY + 6); ctx.lineTo(FL.cx - FL.baseR + 10, FL.bottom - 22); ctx.stroke();   // highlight
    // graduations on the flask
    ctx.strokeStyle = th.dark ? 'rgba(200,220,245,.45)' : 'rgba(70,95,130,.5)'; ctx.lineWidth = 1;
    for (const ml of [25, 50, 75, 100]) { const yy = levelY(ml), rr = flaskR(yy); ctx.beginPath(); ctx.moveTo(FL.cx + rr - 16, yy); ctx.lineTo(FL.cx + rr - 4, yy); ctx.stroke(); }

    /* ----- buret ----- */
    const reading = v.reading;                                // mL on the scale at the meniscus
    const menY = mlToY(clamp(reading, 0, 50));
    const tcol = th.dark ? 'rgba(130,170,220,.33)' : 'rgba(150,190,230,.42)';
    ctx.fillStyle = tcol;                                      // titrant
    ctx.fillRect(BU.cx - BU.ri, menY, BU.ri * 2, BU.y50 + 8 - menY);
    ctx.beginPath(); ctx.moveTo(BU.cx - BU.ri, BU.y50 + 8); ctx.lineTo(BU.cx - 3, BU.cockY - 6); ctx.lineTo(BU.cx + 3, BU.cockY - 6); ctx.lineTo(BU.cx + BU.ri, BU.y50 + 8); ctx.fill();
    ctx.fillRect(BU.cx - 2, BU.cockY + 6, 4, BU.tipY - BU.cockY - 6);
    ctx.beginPath(); ctx.ellipse(BU.cx, menY, BU.ri, 2.2, 0, 0, Math.PI); ctx.strokeStyle = th.dark ? 'rgba(200,220,245,.8)' : 'rgba(60,85,120,.8)'; ctx.lineWidth = 1.2; ctx.stroke();
    glassStroke(ctx, th, 2);
    ctx.beginPath(); ctx.moveTo(BU.cx - BU.r, BU.top); ctx.lineTo(BU.cx - BU.r, BU.y50 + 8); ctx.lineTo(BU.cx - 4, BU.cockY - 6); ctx.lineTo(BU.cx - 4, BU.cockY + 6); ctx.lineTo(BU.cx - 3, BU.tipY);
    ctx.moveTo(BU.cx + BU.r, BU.top); ctx.lineTo(BU.cx + BU.r, BU.y50 + 8); ctx.lineTo(BU.cx + 4, BU.cockY - 6); ctx.lineTo(BU.cx + 4, BU.cockY + 6); ctx.lineTo(BU.cx + 3, BU.tipY); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(BU.cx, BU.top, BU.r, 2.5, 0, 0, 7); ctx.stroke();
    // scale: a mark every mL, longer every 5, numbers every 10 (0 at the top)
    ctx.strokeStyle = th.dark ? 'rgba(225,235,250,.85)' : 'rgba(40,55,80,.85)'; ctx.lineWidth = 0.9;
    for (let ml = 0; ml <= 50; ml++) {
      const yy = mlToY(ml), len = ml % 5 === 0 ? BU.r * 1.5 : BU.r * 0.8;
      ctx.beginPath(); ctx.moveTo(BU.cx - BU.r, yy); ctx.lineTo(BU.cx - BU.r + len, yy); ctx.stroke();
      if (ml % 10 === 0) T(String(ml), BU.cx + BU.r + 5, yy, { size: fs(9.5), color: th.ink2, base: 'middle', fixed: true });
    }
    // stopcock
    ctx.fillStyle = '#e9edf4'; D.roundRect(ctx, BU.cx - 15, BU.cockY - 6, 30, 12, 4); ctx.fill(); ctx.strokeStyle = 'rgba(60,75,100,.8)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); ctx.translate(BU.cx + 20, BU.cockY); ctx.rotate(v.flowing ? Math.PI / 2 : 0);
    ctx.fillStyle = '#2f6fde'; D.roundRect(ctx, -5, -13, 10, 26, 4); ctx.fill(); ctx.restore();
    // drops and stream
    ctx.fillStyle = th.dark ? 'rgba(170,205,250,.9)' : 'rgba(95,150,215,.9)';
    if (v.stream) ctx.fillRect(BU.cx - 1.2, BU.tipY, 2.4, Math.max(0, surfY - BU.tipY));
    for (const d of v.drops || []) { const yy = lerp(BU.tipY + 3, surfY, d.f * d.f); ctx.beginPath(); ctx.moveTo(BU.cx, yy - 5); ctx.quadraticCurveTo(BU.cx + 4, yy + 2, BU.cx, yy + 4); ctx.quadraticCurveTo(BU.cx - 4, yy + 2, BU.cx, yy - 5); ctx.fill(); }

    /* pH meter */
    if (o.meter) {
      ctx.fillStyle = th.dark ? '#394562' : '#566381'; D.roundRect(ctx, 6, 550, 122, 86, 9); ctx.fill();
      ctx.fillStyle = '#cfe3c4'; D.roundRect(ctx, 16, 560, 102, 42, 5); ctx.fill();
      T(o.readPH ? v.mix.pH.toFixed(2) : '?.??', 112, 584, { size: v.mix.pH >= 9.995 && o.readPH ? 24 : 28, weight: 700, color: '#1c2a1a', align: 'right', base: 'middle', fixed: true, inside: true });
      T('pH', 21, 569, { size: 10, weight: 700, color: '#1c2a1a', base: 'middle', fixed: true, inside: true });
      T('pH meter', 67, 619, { size: fs(10), color: '#e8ecf3', align: 'center', base: 'middle', fixed: true, inside: true });
    }

    /* labels on the glassware */
    if (o.labels) {
      const A = C.REAGENTS[v.exp.analyte], Tt = C.REAGENTS[v.exp.titrant];
      T('buret: ' + v.exp.Ct.toFixed(3) + ' M ' + Tt.formula, BU.cx - BU.r - 8, 96, { size: fs(11), weight: 600, color: th.ink, align: 'right', base: 'middle', halo, alts: [[0, 22], [0, 44]] });
      T('(the titrant)', BU.cx - BU.r - 8, 96 + fs(11) * 1.3, { size: fs(10), color: th.muted, align: 'right', base: 'middle', halo, optional: true });
      T('flask: ' + (v.unknown ? '? M ' : v.exp.Ca.toFixed(3) + ' M ') + A.formula, FL.cx - FL.baseR - 8, 514, { size: fs(11), weight: 600, color: th.ink, align: 'right', base: 'middle', halo, alts: [[0, -20], [0, 20]] });
      T('(the analyte)', FL.cx - FL.baseR - 8, 514 + fs(11) * 1.3, { size: fs(10), color: th.muted, align: 'right', base: 'middle', halo, optional: true });
      T('stopcock', BU.cx + 34, BU.cockY, { size: fs(10), color: th.muted, base: 'middle', halo, optional: true });
    }

    /* ----- zoomed views ----- */
    const lensFrame = (cx, cy, R, sx, sy, fill) => {
      // callout lines from the spot on the glassware to the edge of the circle
      const ang = Math.atan2(cy - sy, cx - sx), da = Math.acos(clamp(R / Math.hypot(cx - sx, cy - sy), -1, 1));
      ctx.strokeStyle = th.muted; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cx - R * Math.cos(ang + s * da), cy - R * Math.sin(ang + s * da)); ctx.stroke(); }
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(sx, sy, 5, 0, 7); ctx.strokeStyle = th.accent; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fillStyle = th.dark ? '#0f1627' : '#ffffff'; ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = fill; ctx.fill(); ctx.restore();   // a pale wash of the liquid's colour, so particles stay easy to see
      ctx.lineWidth = 3; ctx.strokeStyle = th.accent; ctx.stroke();
    };
    const legend = (items, x, y, cols, colW, size) => {
      items.forEach((it, i) => {
        const lx = x + (i % cols) * colW, ly = y + Math.floor(i / cols) * size * 1.4;
        drawParticle(ctx, lx + 8, ly, size * 8, Object.assign({}, it.st, { r: 0.06 }), th, 1);
        T(it.label + (it.n === null ? '' : ': ' + it.n), lx + size * 1.7, ly, { size, weight: 600, color: th.ink, base: 'middle', fixed: true });
      });
    };
    /* Lay a legend out in the space available: as many columns as fit, smaller type if needed,
     * and species with a count of zero are the first to be left out. */
    const fitLegend = (items, x, y, width, height) => {
      let size = fs(12), list = items, cols = 1;
      for (let guard = 0; guard < 40; guard++) {
        ctx.font = D.font(size, 600);
        const widest = Math.max(...list.map(it => ctx.measureText(it.label + (it.n === null ? '' : ': ' + it.n)).width)) + size * 2.6;
        cols = clamp(Math.floor(width / widest), 1, 3);
        const rows = Math.max(1, Math.floor(height / (size * 1.4)));
        if (list.length <= cols * rows) break;
        const some = list.filter(it => it.n !== 0);
        if (some.length < list.length && some.length) list = some; else if (size > 8.5 / S) size *= 0.93; else { list = list.slice(0, cols * rows); break; }
      }
      legend(list, x, y, cols, width / cols, size);
      return y + Math.ceil(list.length / cols) * size * 1.4;
    };

    if (o.zFlask) {
      const cx = 522, cy = 466, R = 122;
      lensFrame(cx, cy, R, FL.cx + 20, Math.min(FL.bottom - 14, surfY + 14), liquidCss(col, th));
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R - 2, 0, 7); ctx.clip(); v.flaskCloud.draw(ctx, cx, cy, R, th); ctx.restore();
      T('In the flask', cx, cy - R - 9, { size: fs(12), weight: 700, color: th.ink, align: 'center', halo, fixed: true });
      const keys = Object.keys(v.flaskInfo.target).filter(k => k !== 'water');
      const items = keys.map(k => ({ st: v.flaskInfo.styles[k].st, label: v.flaskInfo.styles[k].label, n: v.flaskInfo.target[k] })).filter(it => it.n > 0 || true);
      const yEnd = fitLegend(items, 396, cy + R + 16, 258, H0 - (cy + R + 16) - 4);
      const note = v.flaskInfo.trace.length ? 'trace (less than one particle): ' + v.flaskInfo.trace.join(', ') : '';
      if (note && yEnd + fs(10) * 0.6 < H0) T(note, 396, yEnd + 1, { size: fs(10), color: th.ink2, base: 'middle', halo, optional: true });
    }
    if (o.zBuret) {
      const cx = 440, cy = 258, R = 62;
      lensFrame(cx, cy, R, BU.cx + 4, clamp(menY + 40, 90, BU.y50 - 10), tcol);
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R - 2, 0, 7); ctx.clip(); v.buretCloud.draw(ctx, cx, cy, R, th); ctx.restore();
      T('In the buret', cx + R + 10, cy - 30, { size: fs(12), weight: 700, color: th.ink, base: 'middle', halo, fixed: true });
      const keys = Object.keys(v.buretInfo.target).filter(k => k !== 'water');
      fitLegend(keys.map(k => ({ st: v.buretInfo.styles[k].st, label: v.buretInfo.styles[k].label, n: null })), cx + R + 10, cy - 30 + fs(12) * 1.5, 130, 60);
    }
    if (o.zRead) {
      // magnified buret scale: 2 mL of the tube around the meniscus, with 0.1 mL marks
      const x = 404, y = 44, bw = 238, bh = 138, span = 1.6;
      ctx.strokeStyle = th.muted; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(BU.cx + BU.r, menY); ctx.lineTo(x, y); ctx.moveTo(BU.cx + BU.r, menY); ctx.lineTo(x, y + bh); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = th.dark ? '#0f1627' : '#ffffff'; D.roundRect(ctx, x, y, bw, bh, 10); ctx.fill(); ctx.strokeStyle = th.accent; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); D.roundRect(ctx, x + 2, y + 2, bw - 4, bh - 4, 9); ctx.clip();
      const tx0 = x + 50, tx1 = x + 130, mid = y + bh / 2, yOf = (ml) => mid + (ml - reading) / span * bh;
      ctx.fillStyle = tcol; ctx.fillRect(tx0, mid, tx1 - tx0, bh);
      ctx.beginPath(); ctx.moveTo(tx0, mid - 9); ctx.quadraticCurveTo((tx0 + tx1) / 2, mid + 9, tx1, mid - 9); ctx.lineTo(tx1, mid + 4); ctx.lineTo(tx0, mid + 4); ctx.closePath(); ctx.fill();
      glassStroke(ctx, th, 2.5); ctx.beginPath(); ctx.moveTo(tx0, y); ctx.lineTo(tx0, y + bh); ctx.moveTo(tx1, y); ctx.lineTo(tx1, y + bh); ctx.stroke();
      ctx.strokeStyle = th.dark ? 'rgba(210,228,250,.95)' : 'rgba(40,60,95,.95)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tx0, mid - 9); ctx.quadraticCurveTo((tx0 + tx1) / 2, mid + 9, tx1, mid - 9); ctx.stroke();   // meniscus
      ctx.strokeStyle = th.dark ? 'rgba(225,235,250,.9)' : 'rgba(40,55,80,.9)';
      for (let t = Math.ceil((reading - span / 2) * 10 - 1); t <= (reading + span / 2) * 10 + 1; t++) {
        const ml = t / 10; if (ml < 0 || ml > 50) continue;
        const yy = yOf(ml), whole = t % 10 === 0, half = t % 5 === 0;
        ctx.lineWidth = whole ? 1.8 : 1; ctx.beginPath(); ctx.moveTo(tx0, yy); ctx.lineTo(tx0 + (whole ? 46 : half ? 34 : 24), yy); ctx.stroke();
        if (whole) T(String(ml), tx0 - 8, yy, { size: 15, weight: 700, color: th.ink, align: 'right', base: 'middle', fixed: true, inside: true });
      }
      ctx.restore();
      D.arrow(ctx, tx1 + 34, mid, tx1 + 7, mid, { color: th.accent, width: 2, head: 8 });
      T(o.readVol ? reading.toFixed(2) + ' mL' : 'read here', tx1 + 38, mid, { size: 13, weight: 700, color: th.ink, base: 'middle', fixed: true, inside: true });
      T('Buret scale', x + bw / 2, y - 7, { size: fs(12), weight: 700, color: th.ink, align: 'center', halo, fixed: true });
    }
    ctx.restore();
    canvas._layout = { S, ox, oy };
  }

  root.Scene = { draw, Cloud, particleTargets, buretTargets, levelY, FLASK_MAX_ML, STYLE, styleOf, drawParticle, W0, H0 };
})(typeof self !== 'undefined' ? self : this);
