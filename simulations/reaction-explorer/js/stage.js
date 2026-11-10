/* stage.js: draws the slow-motion collision: electron clouds, atoms, bonds, forces, electrons. */
(function (root) {
  'use strict';
  const D = root.Draw, M = root.Model, EL = root.ChemData.ELEMENTS;

  const coreR = (el) => 0.22 + 0.33 * EL[el].rcov;          // Å: size of the drawn ball
  const lerp = (a, b, f) => a + (b - a) * f;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const unit = (p, q) => { const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1; return { x: dx / L, y: dy / L }; };
  const rot = (v, deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return { x: v.x * c - v.y * s, y: v.x * s + v.y * c }; };

  /* Frame at a fractional index (smooth playback at any speed). */
  function frameAt(run, f) {
    const fr = run.frames, i = clamp(Math.floor(f), 0, fr.length - 1), j = Math.min(fr.length - 1, i + 1), u = clamp(f - i, 0, 1);
    const a = fr[i], b = fr[j], o = {};
    for (const k in a) o[k] = lerp(a[k], b[k], u);
    return o;
  }

  /* Partial charges on A, B, C from formal charge moving across and from bond polarity. */
  function charges(sys, d) {
    const q = { A: sys.chargeA0 * (1 - d.progress), B: 0, C: sys.chargeC1 * d.progress };
    const pol = (i, j, n) => {
      const dx = EL[sys[i].el].en - EL[sys[j].el].en;       // i more electronegative → i goes negative
      q[i] -= 0.22 * dx * n; q[j] += 0.22 * dx * n;
    };
    pol('A', 'B', d.nAB);
    pol('B', 'C', d.nBC);
    return q;
  }

  /* All drawn atoms (the three particles plus any attached atoms) in Å. */
  function buildAtoms(sys, path, d) {
    const P = d.pos, atoms = [];
    const target = path.wrongEnd ? P.C : P.B;
    const away = { A: unit(target, P.A), C: unit(P.B, P.C), B: unit(P.C, P.B) };
    const lean = { A: d.nAB, C: d.nBC, B: d.nBC - d.nAB };
    for (const role of ['A', 'B', 'C']) {
      const part = sys[role], p = P[role];
      atoms.push({ el: part.el, x: p.x, y: p.y, z: 0, role, main: true, label: part.label });
      if (!part.deco) continue;
      const u = away[role], perp = { x: -u.y, y: u.x };
      part.deco.forEach((dc, k) => {
        if (part.umbrella) {
          const alpha = (90 - 19.5 * lean[role]) * Math.PI / 180;
          // three H atoms spaced around the axis; drawn slightly from the side so the one
          // pointing away from the viewer is not hidden behind the carbon
          const phi = [80, 200, 320][dc.slot] * Math.PI / 180;
          const z = Math.sin(alpha) * Math.cos(phi);
          const along = Math.cos(alpha) + 0.34 * z, side = Math.sin(alpha) * Math.sin(phi);
          atoms.push({ el: dc.el, x: p.x + dc.d * (along * u.x + side * perp.x), y: p.y + dc.d * (along * u.y + side * perp.y),
            z, role, parent: p, label: dc.el });
        } else {
          const v = rot(u, role === 'A' ? dc.ang : -dc.ang);
          atoms.push({ el: dc.el, x: p.x + dc.d * v.x, y: p.y + dc.d * v.y, z: 0, role, parent: p, label: dc.el });
        }
      });
    }
    return atoms;
  }

  /* Fit the whole collision in view once, so the camera never moves during playback. */
  function camera(run, w, h, opts) {
    const key = [w, h, opts.cloud, D.theme().scale].join('|');
    if (run.cam && run.cam.key === key) return run.cam;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const n = run.frames.length;
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 40))) {
      const fr = run.frames[i === 0 ? 0 : Math.min(n - 1, i)];
      const d = M.describe(run.path, fr);
      for (const a of buildAtoms(run.path.sys, run.path, d)) {
        const r = opts.cloud ? EL[a.el].rvdw * 0.9 : coreR(a.el) + 0.25;
        x0 = Math.min(x0, a.x - r); x1 = Math.max(x1, a.x + r); y0 = Math.min(y0, a.y - r); y1 = Math.max(y1, a.y + r);
      }
    }
    const last = M.describe(run.path, run.frames[n - 1]);
    for (const a of buildAtoms(run.path.sys, run.path, last)) { const r = EL[a.el].rvdw * 0.9; x0 = Math.min(x0, a.x - r); x1 = Math.max(x1, a.x + r); }
    const ts = D.theme().scale;
    const padTop = 58 * ts, padBot = 24 * ts, padX = 26 * ts;          // top: the equation and clock sit in the corners
    const scale = Math.min((w - 2 * padX) / (x1 - x0), (h - padTop - padBot) / Math.max(y1 - y0, 2.6), 125 * ts);
    run.cam = { key, scale, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, ox: w / 2, oy: padTop + (h - padTop - padBot) / 2, w, h, ts };
    return run.cam;
  }

  /* Camera for one frame. The wide view fits the whole collision. While the particles are
   * close together it zooms in (up to 1.8x) so the moment that matters fills the stage,
   * keeping room above and below the atoms for the force arrows and bond-length labels.
   * It depends only on the frame, so scrubbing back and forth is smooth. */
  function frameCamera(cam, atoms, o) {
    const ts = cam.ts;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, c0 = Infinity, c1 = -Infinity;
    for (const a of atoms) {
      const r = (o.cloud ? EL[a.el].rvdw * 0.9 : coreR(a.el) + 0.25) + 0.5, rc = coreR(a.el);
      x0 = Math.min(x0, a.x - r); x1 = Math.max(x1, a.x + r); y0 = Math.min(y0, a.y - r); y1 = Math.max(y1, a.y + r);
      c0 = Math.min(c0, a.y - rc); c1 = Math.max(c1, a.y + rc);
    }
    const topPx = (o.forces ? 66 : o.charges ? 22 : 6) * ts, botPx = ((o.lengths || o.bondOrder ? 36 : 0) + (o.velocity ? 30 : 0) + 6) * ts;
    const top = 56 * ts, bottom = cam.h - 18 * ts;                       // usable band of the canvas
    const fits = Math.min(
      (cam.w - 52 * ts) / (x1 - x0),
      (bottom - top) / (y1 - y0),
      (bottom - top - topPx - botPx) / Math.max(0.5, c1 - c0));
    const scale = clamp(fits, cam.scale, Math.min(cam.scale * 1.8, 150 * ts));
    const k = clamp((scale - cam.scale) / Math.max(1e-6, cam.scale * 0.8), 0, 1);     // 0 = wide, 1 = fully zoomed
    const oyClose = (top + topPx + bottom - botPx) / 2;
    return { scale, cx: lerp(cam.cx, (x0 + x1) / 2, k), cy: lerp(cam.cy, (c0 + c1) / 2, k), ox: cam.ox, oy: lerp(cam.oy, oyClose, k) };
  }

  /* ---------- electron cloud ---------- */
  let cloudCanvas = null, cloudBuf = null;
  function drawCloud(ctx, w, h, items, th) {
    const cell = 2.5, cw = Math.ceil(w / cell), ch = Math.ceil(h / cell), n = cw * ch;
    if (!cloudCanvas) cloudCanvas = document.createElement('canvas');
    if (cloudCanvas.width !== cw || cloudCanvas.height !== ch) { cloudCanvas.width = cw; cloudCanvas.height = ch; cloudBuf = null; }
    if (!cloudBuf) cloudBuf = { rho: new Float32Array(n), r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n) };
    const { rho, r, g, b } = cloudBuf;
    rho.fill(0); r.fill(0); g.fill(0); b.fill(0);
    for (const it of items) {
      const sx = it.x / cell, sy = it.y / cell, sg = it.sigma / cell, R = Math.ceil(sg * 2.7), inv = 1 / (2 * sg * sg);
      const i0 = Math.max(0, Math.floor(sx - R)), i1 = Math.min(cw - 1, Math.ceil(sx + R));
      const j0 = Math.max(0, Math.floor(sy - R)), j1 = Math.min(ch - 1, Math.ceil(sy + R));
      for (let j = j0; j <= j1; j++) {
        const dy = j + 0.5 - sy;
        for (let i = i0; i <= i1; i++) {
          const dx = i + 0.5 - sx;
          const v = it.w * Math.exp(-(dx * dx + dy * dy) * inv);
          if (v < 0.004) continue;
          const k = j * cw + i;
          rho[k] += v; r[k] += v * it.c[0]; g[k] += v * it.c[1]; b[k] += v * it.c[2];
        }
      }
    }
    const cctx = cloudCanvas.getContext('2d');
    const img = cctx.createImageData(cw, ch), px = img.data;
    const aMax = th.dark ? 205 : 175, tone = th.dark ? 1 : 0.8;
    for (let k = 0; k < n; k++) {
      const v = rho[k];
      if (v < 0.04) continue;
      const a = Math.min(1, (v - 0.04) / 0.78);
      const e = (v - 0.115) / 0.04, rim = 30 * Math.exp(-e * e);   // faint outline where the cloud ends
      const o = k * 4;
      px[o] = tone * r[k] / v; px[o + 1] = tone * g[k] / v; px[o + 2] = tone * b[k] / v;
      px[o + 3] = Math.min(255, Math.pow(a, 0.8) * aMax + rim);
    }
    cctx.putImageData(img, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cloudCanvas, 0, 0, cw * cell, ch * cell);
    ctx.restore();
  }

  function chargeTint(base, q) {
    const t = clamp(Math.abs(q) * 1.7, 0, 1), to = q < 0 ? [232, 62, 62] : [58, 108, 240];
    return [lerp(205, to[0], t), lerp(205, to[1], t), lerp(210, to[2], t)];
  }

  /* ---------- main draw ---------- */
  function draw(canvas, view) {
    const { ctx, w, h } = D.fit(canvas);
    const th = D.theme(), ts = th.scale, o = view.opts;
    const run = view.run;
    if (!run) return;
    // text laid over the stage by the page (equation, clock, result banner): labels keep clear of it
    for (const b of view.obstacles || []) canvas._texts.push(b);
    const path = run.path, sys = path.sys;
    const fr = frameAt(run, view.frame);
    const d = M.describe(path, fr);
    view.phase = phase(run, fr);
    const atoms = buildAtoms(sys, path, d);
    const cam = frameCamera(camera(run, w, h, o), atoms, o);
    const S = cam.scale;
    const X = (x) => cam.ox + (x - cam.cx) * S, Y = (y) => cam.oy + (y - cam.cy) * S;
    const q = charges(sys, d);
    const pA = { x: X(d.pos.A.x), y: Y(d.pos.A.y) }, pB = { x: X(d.pos.B.x), y: Y(d.pos.B.y) }, pC = { x: X(d.pos.C.x), y: Y(d.pos.C.y) };
    const rA = coreR(sys.A.el) * S, rB = coreR(sys.B.el) * S, rC = coreR(sys.C.el) * S;

    // how far attached atoms stick out, so labels can clear them
    let reach = Math.max(rA, rB, rC);
    for (const a of atoms) if (a.parent) reach = Math.max(reach, Math.abs(Y(a.y) - Y(a.parent.y)) + coreR(a.el) * S);

    // where the shared electrons sit along each bond (pulled toward the more electronegative atom)
    const share = (i, j) => clamp(0.5 + 0.12 * (EL[sys[j].el].en - EL[sys[i].el].en), 0.3, 0.7);
    const mAB = { x: lerp(pA.x, pB.x, share('A', 'B')), y: lerp(pA.y, pB.y, share('A', 'B')) };
    const mBC = { x: lerp(pB.x, pC.x, share('B', 'C')), y: lerp(pB.y, pC.y, share('B', 'C')) };

    /* electron clouds */
    if (o.cloud) {
      const items = [];
      for (const a of atoms) {
        const e = EL[a.el], qq = a.main ? q[a.role] : 0;
        items.push({ x: X(a.x), y: Y(a.y), sigma: e.rvdw / 2.15 * S * (1 - 0.12 * clamp(qq, -1, 1)), w: clamp(1 - 0.3 * qq, 0.65, 1.35),
          c: o.chargeMap ? chargeTint(e.cloud, qq) : e.cloud });
      }
      const mix = (c1, c2) => [(c1[0] + c2[0]) / 2 + 20, (c1[1] + c2[1]) / 2 + 20, (c1[2] + c2[2]) / 2 + 20];
      const cA = o.chargeMap ? [205, 205, 210] : EL[sys.A.el].cloud, cB = o.chargeMap ? [205, 205, 210] : EL[sys.B.el].cloud, cC = o.chargeMap ? [205, 205, 210] : EL[sys.C.el].cloud;
      if (d.nAB > 0.03) items.push({ x: mAB.x, y: mAB.y, sigma: 0.42 * S, w: 0.55 * d.nAB, c: mix(cA, cB) });
      if (d.nBC > 0.03) items.push({ x: mBC.x, y: mBC.y, sigma: 0.42 * S, w: 0.55 * d.nBC, c: mix(cB, cC) });
      drawCloud(ctx, w, h, items, th);
    }

    /* bonds as sticks: solid = full bond, dashed = partly made or partly broken */
    const stick = (p, r, n) => {
      if (n < 0.04) return;
      ctx.save();
      ctx.strokeStyle = D.rgba(th.dark ? '#dfe7f5' : '#3a4560', (o.cloud ? 0.5 : 0.9) * clamp(0.25 + n, 0, 1));
      ctx.lineWidth = (2.5 + 4.5 * n) * ts; ctx.lineCap = 'round';
      if (n < 0.88) ctx.setLineDash([7 * ts, 7 * ts]);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(r.x, r.y); ctx.stroke(); ctx.restore();
    };
    stick(pA, pB, d.nAB); stick(pB, pC, d.nBC);
    for (const a of atoms) if (a.parent) stick({ x: X(a.x), y: Y(a.y) }, { x: X(a.parent.x), y: Y(a.parent.y) }, 1);

    /* atoms */
    atoms.slice().sort((a, b) => a.z - b.z).forEach((a) => {
      const e = EL[a.el], x = X(a.x), y = Y(a.y), r = coreR(a.el) * S * (1 + 0.14 * a.z);
      const rgb = D.hexToRgb(e.color);
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
      g.addColorStop(0, 'rgb(' + rgb.map(c => Math.min(255, c + 70)).join(',') + ')');
      g.addColorStop(0.6, e.color);
      g.addColorStop(1, 'rgb(' + rgb.map(c => Math.round(c * 0.62)).join(',') + ')');
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = th.dark ? 'rgba(0,0,0,.55)' : 'rgba(30,40,70,.55)'; ctx.stroke();
      if (o.labels && r > 8) {
        const lum = 0.3 * rgb[0] + 0.59 * rgb[1] + 0.11 * rgb[2];
        const col = lum > 150 ? '#1a2233' : '#ffffff';
        const parts = String(a.label).split('_');
        const size = clamp(r * 0.95, 10, 26 * ts);
        D.text(ctx, parts[0], x - (parts[1] ? size * 0.16 : 0), y + size * 0.03, { size, weight: 700, align: 'center', base: 'middle', color: col, inside: true });
        if (parts[1]) D.text(ctx, parts[1], x + size * 0.42, y + size * 0.36, { size: size * 0.6, weight: 700, align: 'center', base: 'middle', color: col, inside: true });
      }
    });

    const halo = th.dark ? 'rgba(8,12,23,.85)' : 'rgba(255,255,255,.9)';
    const upPerp = (a) => { let n = { x: a.y, y: -a.x }; if (n.y > 0 || (n.y === 0 && n.x < 0)) n = { x: -n.x, y: -n.y }; return n; };

    /* partial charges */
    if (o.charges) {
      [['A', pA, rA], ['B', pB, rB], ['C', pC, rC]].forEach(([k, p, r]) => {
        const v = q[k];
        if (Math.abs(v) < 0.06) return;
        const full = Math.abs(v) > 0.8;
        const s = full ? (v < 0 ? '⊖' : '⊕') : (v < 0 ? 'δ−' : 'δ+');
        const k2 = r * 0.85 + 5;                               // sits at a corner of its atom; tries the other corners if taken
        D.text(ctx, s, p.x + k2, p.y - k2, { size: (full ? 20 : 13 + 9 * Math.min(1, Math.abs(v) * 1.6)) * ts, weight: 700, align: 'center', base: 'middle', color: th.ink, halo,
          alts: [[-2 * k2, 0], [0, 2 * k2], [-2 * k2, 2 * k2], [0, -12 * ts], [-2 * k2, -12 * ts]] });
      });
    }

    /* velocity arrows */
    if (o.velocity) {
      const f2 = frameAt(run, view.frame + 1), f1 = frameAt(run, view.frame - 1);
      const d1 = M.describe(path, f1), d2 = M.describe(path, f2), dt = Math.max(1e-6, f2.t - f1.t);
      [['A', pA, rA], ['B', pB, rB], ['C', pC, rC]].forEach(([k, p, r]) => {
        const vx = (d2.pos[k].x - d1.pos[k].x) / dt, vy = (d2.pos[k].y - d1.pos[k].y) / dt, sp = Math.hypot(vx, vy);
        const len = Math.min(90, sp * 620) * ts;
        if (len < 5) return;
        const ux = vx / sp, uy = vy / sp, off = reach + (o.lengths || o.bondOrder ? 50 : 14) * ts;
        const sx = p.x - ux * len / 2, sy = p.y + off + (k === 'B' ? 12 * ts : 0);
        D.arrow(ctx, sx, sy, sx + ux * len, sy + uy * len, { color: th.ink2, width: 2.4 * ts, head: 9 * ts });
      });
    }

    /* push / pull forces between each pair */
    if (o.forces) {
      const pairs = [['AB', pA, pB, 0], ['BC', pB, pC, 0], ['AC', pA, pC, 30 * ts]];
      for (const [k, p, r, extra] of pairs) {
        const F = d.F[k] * M.FORCE_NN;                       // nN, + = push apart
        if (Math.abs(F) < 0.12) continue;
        const a = unit(p, r), n = upPerp(a), off = reach + 20 * ts + extra;
        const P1 = { x: p.x + n.x * off, y: p.y + n.y * off }, P2 = { x: r.x + n.x * off, y: r.y + n.y * off };
        const dist = Math.hypot(P2.x - P1.x, P2.y - P1.y);
        let L = Math.min(74, 24 * Math.sqrt(Math.abs(F))) * ts + 6;
        const col = F > 0 ? th.push : th.pull, wd = 3.2 * ts, hd = 10 * ts;
        if (F < 0) {
          L = Math.min(L, dist / 2 - 5);
          if (L > 6) { D.arrow(ctx, P1.x, P1.y, P1.x + a.x * L, P1.y + a.y * L, { color: col, width: wd, head: hd });
            D.arrow(ctx, P2.x, P2.y, P2.x - a.x * L, P2.y - a.y * L, { color: col, width: wd, head: hd }); }
        } else {
          D.arrow(ctx, P1.x, P1.y, P1.x - a.x * L, P1.y - a.y * L, { color: col, width: wd, head: hd });
          D.arrow(ctx, P2.x, P2.y, P2.x + a.x * L, P2.y + a.y * L, { color: col, width: wd, head: hd });
        }
        ctx.save(); ctx.strokeStyle = D.rgba(col, 0.35); ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(P1.x, P1.y); ctx.lineTo(P2.x, P2.y); ctx.stroke(); ctx.restore();
        const mx = (P1.x + P2.x) / 2 + n.x * 9 * ts, my = (P1.y + P2.y) / 2 + n.y * 9 * ts;
        D.text(ctx, (F > 0 ? 'push ' : 'pull ') + D.fmt(Math.abs(F), 1) + ' nN', mx, my, { size: 12.5 * ts, weight: 700, align: 'center', base: 'middle', color: th.ink, halo,
          alts: [[0, -16 * ts], [44 * ts, 0], [-44 * ts, 0], [44 * ts, -16 * ts], [-44 * ts, -16 * ts], [0, -32 * ts], [70 * ts, 0], [-70 * ts, 0]] });
      }
    }

    /* bond lengths and bond strength */
    if (o.lengths || o.bondOrder) {
      const dims = [['AB', pA, pB, d.rAB, d.nAB, th.form], ['BC', pB, pC, d.rBC, d.nBC, th.brk]];
      let placed = null;
      for (const [k, p, r, dist, n, col] of dims) {
        if (dist > 3.4) continue;
        const a = unit(p, r), up = upPerp(a), off = reach + 16 * ts;
        const P1 = { x: p.x - up.x * off, y: p.y - up.y * off }, P2 = { x: r.x - up.x * off, y: r.y - up.y * off };
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2 * ts;
        ctx.beginPath(); ctx.moveTo(P1.x, P1.y); ctx.lineTo(P2.x, P2.y);
        ctx.moveTo(P1.x + up.x * 6, P1.y + up.y * 6); ctx.lineTo(P1.x - up.x * 6, P1.y - up.y * 6);
        ctx.moveTo(P2.x + up.x * 6, P2.y + up.y * 6); ctx.lineTo(P2.x - up.x * 6, P2.y - up.y * 6); ctx.stroke(); ctx.restore();
        const bits = [];
        if (o.lengths) bits.push(D.fmt(dist, 2) + ' Å');
        if (o.bondOrder) bits.push('bond ' + Math.round(n * 100) + '%');
        const str = bits.join(' · ');
        ctx.font = D.font(12.5 * ts, 700);
        const lab = { x: (P1.x + P2.x) / 2 - up.x * 13 * ts, y: (P1.y + P2.y) / 2 - up.y * 13 * ts, w: ctx.measureText(str).width };
        if (placed && Math.abs(lab.x - placed.x) < (lab.w + placed.w) / 2 + 10 && Math.abs(lab.y - placed.y) < 14 * ts) lab.y += 17 * ts;
        placed = lab;
        D.text(ctx, str, lab.x, lab.y, { size: 12.5 * ts, weight: 700, align: 'center', base: 'middle', color: th.ink, halo });
      }
    }

    /* the electrons that move: A's electron(s) and the B–C bonding pair */
    const uAB = unit(pA, path.wrongEnd ? pC : pB), uBC = unit(pB, pC);
    const homeA = { x: pA.x + uAB.x * (rA + 9 * ts), y: pA.y + uAB.y * (rA + 9 * ts) };
    const homeC = { x: pC.x + uBC.x * (rC + 9 * ts), y: pC.y + uBC.y * (rC + 9 * ts) };
    const wgt = smooth(d.progress);
    if (o.electrons) {
      const pr = upPerp(uBC), gap = 6.5 * ts;
      const dot = (p, col) => { ctx.beginPath(); ctx.arc(p.x, p.y, 5.5 * ts, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = th.dark ? '#fff' : '#111a2c'; ctx.stroke(); };
      const mixp = (p, r2, f, s) => ({ x: lerp(p.x, r2.x, f) + pr.x * gap * s, y: lerp(p.y, r2.y, f) + pr.y * gap * s });
      if (sys.mech === 'radical') {
        dot(mixp(homeA, mAB, wgt, -wgt), th.ke);
        dot(mixp(mBC, mAB, wgt, 1), th.form);
        dot(mixp(mBC, homeC, wgt, -(1 - wgt)), th.form);
      } else {
        dot(mixp(homeA, mAB, wgt, 1), th.ke); dot(mixp(homeA, mAB, wgt, -1), th.ke);
        dot(mixp(mBC, homeC, wgt, 1), th.form); dot(mixp(mBC, homeC, wgt, -1), th.form);
      }
    }

    /* curved arrows: where the electrons are about to go */
    if (o.arrows && !path.wrongEnd) {
      const al = clamp((0.5 - d.progress) / 0.2, 0, 1) * clamp((3.3 - d.rAB) / 0.6, 0, 1);
      if (al > 0.02) {
        ctx.save(); ctx.globalAlpha = al;
        const col = th.ink, half = sys.mech === 'radical';
        const style = { color: col, half, width: 2.6 * ts, head: 11 * ts };
        const lift = (p, px) => ({ x: p.x, y: p.y - px });
        if (half) {
          // one electron from A and one from the B–C bond meet between A and B; the other stays with C
          D.curvedArrow(ctx, lift(homeA, 6 * ts), lift(mAB, 8 * ts), 20 * ts, style);
          D.curvedArrow(ctx, lift(mBC, 6 * ts), { x: mAB.x + 10 * ts, y: mAB.y - 8 * ts }, -(rB + 16 * ts), style);
          D.curvedArrow(ctx, lift(mBC, -6 * ts), lift(homeC, -6 * ts), -(rC + 16 * ts), style);
        } else {
          // A's lone pair attacks B; the B–C bonding pair leaves with C
          const edgeB = { x: pB.x - uAB.x * (rB + 5 * ts), y: pB.y - uAB.y * (rB + 5 * ts) };
          D.curvedArrow(ctx, lift(homeA, 6 * ts), lift(edgeB, 6 * ts), 24 * ts, style);
          D.curvedArrow(ctx, lift(mBC, 6 * ts), lift(homeC, 6 * ts), rC + 16 * ts, style);
        }
        ctx.restore();
      }
    }

    /* name tags while the particles are separate */
    if (o.labels && view.phase) {
      const tag = (str, x, y) => D.text(ctx, str, x, y, { size: 14 * ts, weight: 600, align: 'center', base: 'middle', color: th.ink, halo, haloW: 2.5, optional: true,
        alts: [[0, 18 * ts], [0, -2 * below], [0, -2 * below - 18 * ts], [0, 36 * ts], [60 * ts, 0], [-60 * ts, 0]] });   // under the molecule, else above it
      const below = reach + (o.lengths || o.bondOrder ? 52 : 26) * ts + (o.velocity ? 30 * ts : 0);
      const f = sys.formulas;
      if ((view.phase === 'approach' || view.phase === 'retreat') && Math.min(d.rAB, d.rAC) > 2.3) {
        tag(f.A, pA.x, pA.y + below); tag(f.BC, (pB.x + pC.x) / 2, Math.max(pB.y, pC.y) + below);
      } else if (view.phase === 'products' && d.rBC > 2.3) {
        tag(f.AB, (pA.x + pB.x) / 2, Math.max(pA.y, pB.y) + below); tag(f.C, pC.x, pC.y + below);
      }
    }

    /* transition-state brackets */
    const nearTop = run.reacted && Math.abs(fr.s - path.sTS) < 0.03 * path.sMax && path.iTS > 5 && path.iTS < path.N - 5;
    if (nearTop) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const a of atoms) { const r = coreR(a.el) * S + 12 * ts; x0 = Math.min(x0, X(a.x) - r); x1 = Math.max(x1, X(a.x) + r); y0 = Math.min(y0, Y(a.y) - r); y1 = Math.max(y1, Y(a.y) + r); }
      ctx.save(); ctx.strokeStyle = th.ink; ctx.lineWidth = 2.5 * ts; ctx.lineJoin = 'round';
      const t = 10 * ts;
      ctx.beginPath(); ctx.moveTo(x0 + t, y0); ctx.lineTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x0 + t, y1);
      ctx.moveTo(x1 - t, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y1); ctx.lineTo(x1 - t, y1); ctx.stroke(); ctx.restore();
      D.text(ctx, '‡', x1 + 7 * ts, y0 + 8 * ts, { size: 24 * ts, weight: 700, color: th.ink, halo });
    }

    /* scale bar */
    const bx = 16 * ts, by = h - 12 * ts;
    ctx.save(); ctx.strokeStyle = th.muted; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx, by - 5); ctx.lineTo(bx, by); ctx.lineTo(bx + S, by); ctx.lineTo(bx + S, by - 5); ctx.stroke(); ctx.restore();
    D.text(ctx, '1 Å = 100 pm = 0.000 000 000 1 m', bx + S + 8, by + 1, { size: 11 * ts, color: th.muted, optional: true });

    return { fr, d, q };
  }

  /* Which part of the story this frame belongs to. */
  function phase(run, fr) {
    const p = run.path, b = Math.max(p.barrier, 1);
    const i = clamp(Math.round(fr.s / p.ds), 0, p.N - 1);
    const outbound = fr.v >= 0;
    if (run.reacted) {
      if (Math.abs(fr.s - p.sTS) < 0.035 * p.sMax) return 'ts';
      if (fr.s < p.sTS) return fr.V < 0.12 * b && fr.r1 > 2.6 ? 'approach' : 'climb';
      const drop = p.barrier - p.vEnd;
      return (fr.V - p.vEnd) > 0.1 * Math.max(drop, 1) && fr.r2 < 2.6 ? 'descend' : 'products';
    }
    if (!outbound) return fr.r1 > 2.9 ? 'retreat' : 'turn';
    if (fr.r1 > 2.6 && fr.V < 0.12 * b) return 'approach';
    return fr.KE < 0.12 * run.Ecoll ? 'turn' : 'climb';
  }

  root.Stage = { draw, frameAt, phase, charges, buildAtoms, coreR };
})(typeof self !== 'undefined' ? self : this);
