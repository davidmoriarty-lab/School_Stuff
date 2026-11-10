/* graphs.js: the graphs linked to the slow-motion collision. Each one shows a live marker
 * for the atoms on the stage, so students can connect the picture with the graph. */
(function (root) {
  'use strict';
  const D = root.Draw, M = root.Model;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* Common frame: returns the plot rectangle and scale functions. */
  function frame(ctx, w, h, th, m, xr, yr) {
    const ts = th.scale;
    const L = m.l * ts, R = w - m.r * ts, T = m.t * ts, B = h - m.b * ts;
    return {
      L, R, T, B, ts,
      x: (v) => L + (v - xr[0]) / (xr[1] - xr[0]) * (R - L),
      y: (v) => B - (v - yr[0]) / (yr[1] - yr[0]) * (B - T),
      xInv: (px) => xr[0] + (px - L) / (R - L) * (xr[1] - xr[0]),
      yInv: (py) => yr[0] + (B - py) / (B - T) * (yr[1] - yr[0])
    };
  }
  function yAxis(ctx, f, th, yr, label, n) {
    const ts = f.ts;
    let widest = 0;
    ctx.save(); ctx.strokeStyle = th.line; ctx.lineWidth = 1;
    for (const v of D.ticks(yr[0], yr[1], n || 5)) {
      const y = Math.round(f.y(v)) + 0.5;
      if (y < f.T - 1 || y > f.B + 1) continue;
      ctx.beginPath(); ctx.moveTo(f.L, y); ctx.lineTo(f.R, y); ctx.stroke();
      const str = D.fmt(v, Math.abs(yr[1] - yr[0]) < 3 ? 1 : 0);
      D.text(ctx, str, f.L - 6 * ts, y, { size: 11 * ts, align: 'right', base: 'middle', color: th.muted, fixed: true });
      widest = Math.max(widest, ctx.measureText(str).width);
    }
    ctx.restore();
    if (label) {
      ctx.save(); ctx.translate(Math.max(8 * ts, f.L - 6 * ts - widest - 11 * ts), (f.T + f.B) / 2); ctx.rotate(-Math.PI / 2);
      D.text(ctx, label, 0, 0, { size: 11.5 * ts, align: 'center', base: 'middle', color: th.ink2, fixed: true });
      ctx.restore();
    }
  }
  function dot(ctx, x, y, r, col, th) {
    ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 7); ctx.fillStyle = th.panel; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = col; ctx.fill();
  }
  /* Vertical double arrow with a label beside it. */
  function span(ctx, x, y1, y2, col, label, th, side, f) {
    const ts = f.ts;
    if (Math.abs(y2 - y1) > 14) D.arrow(ctx, x, y1, x, y2, { color: col, width: 2 * ts, head: 8 * ts, both: true });
    else { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2 * ts; ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke(); ctx.restore(); }
    const halo = D.rgba(th.panel, 0.9);
    const small = Math.abs(y2 - y1) < 24 * ts;            // tiny gap: put the label underneath so the marker cannot hide it
    const ly = small ? Math.max(y1, y2) + 15 * ts : clamp((y1 + y2) / 2, f.T + 8 * ts, f.B - 8 * ts);
    D.text(ctx, label, x + (side < 0 ? -7 : 7) * ts, ly, { size: 12 * ts, weight: 700, align: side < 0 ? 'right' : 'left', base: 'middle', color: th.ink, halo,
      alts: [[(side < 0 ? 14 : -14) * ts, 0, side < 0 ? 'left' : 'right'], [0, -18 * ts], [0, 18 * ts], [(side < 0 ? 14 : -14) * ts, -18 * ts, side < 0 ? 'left' : 'right'], [(side < 0 ? 14 : -14) * ts, 18 * ts, side < 0 ? 'left' : 'right']] });
  }

  /* ---------- 1. energy diagram ---------- */
  function profile(canvas, view) {
    const { ctx, w, h } = D.fit(canvas);
    const th = D.theme(), o = view.opts, run = view.run;
    if (!run) return;
    const path = run.path, sys = path.sys, fr = view.fr;
    const big = h > 420;
    const vEnd = path.reactive ? path.vEnd : 0;
    const top = path.reactive ? path.barrier : Math.min(path.barrier, Math.max(run.Ecoll * 1.25, 30));
    const other = view.uncatPath;
    let lo = Math.min(0, vEnd), hi = Math.max(top, o.showTotal ? run.Ecoll : 0, other ? other.barrier : 0, 8);
    const pad = (hi - lo) * 0.16;
    const yr = [lo - pad * 0.9, hi + pad * 1.3], xr = [-0.04, 1.04];
    const f = frame(ctx, w, h, th, { l: 60, r: 14, t: 10, b: 30 }, xr, yr), ts = f.ts;
    yAxis(ctx, f, th, yr, 'Potential energy (kJ/mol)', big ? 8 : 5);
    D.text(ctx, 'Reaction progress  →', (f.L + f.R) / 2, f.B + 20 * ts, { size: 11.5 * ts, align: 'center', color: th.ink2, fixed: true });

    const halo = D.rgba(th.panel, 0.9);
    const curve = (p, col, width, dash, fill) => {
      ctx.save(); ctx.beginPath();
      for (let i = 0; i < p.N; i++) {
        const x = f.x(p.x[i] / p.xMax), y = f.y(Math.min(p.V[i], yr[1] + 5));
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = col; ctx.lineWidth = width; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash);
      ctx.save(); ctx.beginPath(); ctx.rect(f.L - 2, f.T - 2, f.R - f.L + 4, f.B - f.T + 4); ctx.clip();
      ctx.beginPath();
      for (let i = 0; i < p.N; i++) { const x = f.x(p.x[i] / p.xMax), y = f.y(Math.min(p.V[i], yr[1] + 5)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke();
      if (fill) {
        ctx.lineTo(f.x(p.x[p.N - 1] / p.xMax), f.B); ctx.lineTo(f.x(0), f.B); ctx.closePath();
        const g = ctx.createLinearGradient(0, f.T, 0, f.B); g.addColorStop(0, D.rgba(th.pe, 0.28)); g.addColorStop(1, D.rgba(th.pe, 0.03));
        ctx.fillStyle = g; ctx.fill();
      }
      ctx.restore(); ctx.restore();
    };
    if (other) curve(other, th.muted, 2 * ts, [6 * ts, 5 * ts], false);
    curve(path, th.pe, 3 * ts, null, true);

    let keLabel = null;
    // the kinetic energy of the atoms right now = gap between the curve and the collision's total energy
    if (fr && o.showTotal) {
      const bx = f.x(fr.x), by = f.y(Math.min(fr.V + fr.Evib, yr[1])), yE0 = f.y(run.Ecoll);
      if (yE0 < by - 3) {
        ctx.save(); ctx.strokeStyle = th.ke; ctx.lineWidth = 5 * ts; ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, Math.max(yE0, f.T)); ctx.stroke(); ctx.restore();
        if (by - yE0 > 26 * ts) keLabel = { x: bx + 7 * ts, y: (by + Math.max(yE0, f.T)) / 2 };
      }
    }
    const xTS = f.x(path.x[path.iTS] / path.xMax), yTS = f.y(Math.min(path.barrier, yr[1])), y0 = f.y(0), yP = f.y(vEnd);
    // level guides
    ctx.save(); ctx.strokeStyle = th.muted; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(f.L, y0); ctx.lineTo(f.R, y0);
    if (path.reactive) { ctx.moveTo(xTS, yP); ctx.lineTo(f.R, yP); }
    ctx.stroke(); ctx.restore();

    // names
    const below = (y) => y + 15 * ts, above = (y) => y - 8 * ts;
    D.text(ctx, 'Reactants', f.x(0.0), above(y0), { size: 12 * ts, weight: 700, color: th.ink, halo });
    D.text(ctx, sys.formulas.A + ' + ' + sys.formulas.BC, f.x(0.0), below(y0), { size: 11.5 * ts, color: th.ink2, halo });
    if (path.reactive) {
      // a product level close under the hill top leaves no room above it: write both lines underneath
      const cramped = (yP - yTS) < 34 * ts && path.x[path.iTS] / path.xMax > 0.55;
      D.text(ctx, 'Products', f.x(1.0), cramped ? below(yP) : above(yP), { size: 12 * ts, weight: 700, align: 'right', color: th.ink, halo });
      D.text(ctx, sys.formulas.AB + ' + ' + sys.formulas.C, f.x(1.0), below(yP) + (cramped ? 14 * ts : 0), { size: 11.5 * ts, align: 'right', color: th.ink2, halo });
      const early = path.x[path.iTS] / path.xMax < 0.4;
      if (path.iTS > 5 && path.iTS < path.N - 5) {
        const lateTS = path.x[path.iTS] / path.xMax > 0.6;
        D.text(ctx, 'Transition state ‡', xTS + (early ? -8 : lateTS ? 12 : 0) * ts, yTS - 9 * ts, { size: 12 * ts, weight: 700, align: early ? 'left' : lateTS ? 'right' : 'center', color: th.ink, halo });
      }
      if (other) {
        ctx.save(); ctx.strokeStyle = th.muted; ctx.lineWidth = 2 * ts; ctx.setLineDash([6 * ts, 5 * ts]);
        ctx.beginPath(); ctx.moveTo(f.L + 8 * ts, f.T + 9 * ts); ctx.lineTo(f.L + 34 * ts, f.T + 9 * ts); ctx.stroke(); ctx.restore();
        D.text(ctx, 'without catalyst (Eₐ = ' + D.fmt(other.barrier, 0) + ')', f.L + 40 * ts, f.T + 9 * ts, { size: 11 * ts, base: 'middle', color: th.ink2, halo, optional: true, alts: [[(f.R - f.L) * 0.35, 0], [(f.R - f.L) * 0.5, 0]] });
      }
    } else {
      D.text(ctx, 'A hits the wrong atom: it is pushed back', f.x(0.5), f.T + 16 * ts, { size: 12 * ts, weight: 700, align: 'center', color: th.ink, halo });
    }

    // Ea, ΔH, Ea(reverse)
    if (path.reactive) {
      const tilt = '';
      if (o.showEa && path.barrier > 0.5) span(ctx, xTS - 16 * ts, y0, yTS, th.pe, 'Eₐ = ' + D.fmt(path.barrier, 0) + tilt, th, -1, f);
      if (o.showEaRev && path.barrier - vEnd > 0.5) {
        if (yP - yTS < 24 * ts) D.text(ctx, 'Eₐ(reverse) = ' + D.fmt(path.barrier - vEnd, 0), f.x(1.0), yTS - 9 * ts, { size: 12 * ts, weight: 700, align: 'right', color: th.ink, halo });
        else span(ctx, xTS + 16 * ts, yP, yTS, th.muted, 'Eₐ(reverse) = ' + D.fmt(path.barrier - vEnd, 0), th, 1, f);
      }
      if (o.showDH && Math.abs(sys.dH) >= 0.5) {
        const col = sys.dH < 0 ? th.brk : th.form;
        // keep ΔH clear of the Ea arrows: on the right for an early hill, on the left for a late one
        const late = path.x[path.iTS] / path.xMax > 0.55;
        if (late) { ctx.save(); ctx.strokeStyle = th.muted; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(f.x(0.2), yP); ctx.lineTo(xTS, yP); ctx.stroke(); ctx.restore(); }
        span(ctx, f.x(late ? 0.3 : 0.9), y0, yP, col, 'ΔH = ' + D.signed(sys.dH, 0), th, -1, f);
      }
    }
    // total energy of this collision
    const yE = f.y(run.Ecoll);
    if (o.showTotal && yE > f.T - 2) {
      ctx.save(); ctx.strokeStyle = th.ke; ctx.lineWidth = 2 * ts; ctx.setLineDash([8 * ts, 5 * ts]);
      ctx.beginPath(); ctx.moveTo(f.L, yE); ctx.lineTo(f.R, yE); ctx.stroke(); ctx.restore();
      D.text(ctx, 'energy of this collision: ' + D.fmt(run.Ecoll, 0) + ' kJ/mol', f.R - 4, yE - 6 * ts, { size: 11.5 * ts, weight: 600, align: 'right', color: th.ink, halo,
        optional: true, alts: [[0, 20 * ts], [-(f.R - f.L) + 12 * ts, 0, 'left'], [-(f.R - f.L) + 12 * ts, 20 * ts, 'left'], [-(f.R - f.L) * 0.3, 0], [-(f.R - f.L) * 0.3, 20 * ts], [-(f.R - f.L) * 0.5, 0], [-(f.R - f.L) * 0.5, 20 * ts]] });
    }
    if (keLabel) D.text(ctx, 'KE', keLabel.x, keLabel.y, { size: 11 * ts, weight: 700, base: 'middle', color: th.ink, halo, optional: true, alts: [[-14 * ts, 0, 'right']] });
    if (fr) dot(ctx, f.x(fr.x), f.y(Math.min(fr.V, yr[1])), 7 * ts, th.ink, th);
    canvas._hover = (mx, my) => {
      if (mx < f.L || mx > f.R) return null;
      const u = clamp(f.xInv(mx), 0, 1) * path.xMax;
      let i = 0; while (i < path.N - 1 && path.x[i] < u) i++;
      return 'PE = ' + D.fmt(path.V[i], 0) + ' kJ/mol\n' + (path.wrongEnd ? 'A–C' : 'A–B') + ' distance ' + D.fmt(path.r1[i], 2) + ' Å\nB–C distance ' + D.fmt(path.r2[i], 2) + ' Å';
    };
  }

  /* ---------- 2. energy bars ---------- */
  function bars(canvas, view) {
    const { ctx, w, h } = D.fit(canvas);
    const th = D.theme(), run = view.run, fr = view.fr;
    if (!run || !fr) return;
    const path = run.path;
    const base = Math.min(0, path.reactive ? path.vEnd : 0);
    const total = run.Ecoll - base;
    const yr = [0, Math.max(total * 1.18, 10)];
    const f = frame(ctx, w, h, th, { l: 56, r: 40, t: 12, b: 44 }, [0, 1], yr), ts = f.ts;
    yAxis(ctx, f, th, yr, 'Energy (kJ/mol)', 4);
    const showVib = path.fv > 0 && view.opts.vib;
    const items = [['Potential', 'stored in bonds', fr.V - base, th.pe, 'PE'], ['Kinetic', 'motion', fr.KE + (showVib ? 0 : fr.Evib), th.ke, 'KE']];
    if (showVib) items.push(['Vibration', 'of new bond', fr.Evib, th.vib, 'Vib.']);
    const n = items.length, bw = Math.min(54 * ts, (f.R - f.L) / n * 0.62), halo = D.rgba(th.panel, 0.9);
    items.forEach((it, i) => {
      const cx = f.L + (f.R - f.L) * (i + 0.5) / n, y = f.y(Math.max(0, it[2]));
      ctx.fillStyle = it[3];
      if (f.B - y > 0.5) { D.roundRect(ctx, cx - bw / 2, y, bw, f.B - y, 4); ctx.fill(); ctx.fillRect(cx - bw / 2, Math.min(f.B - 1, y + 4), bw, Math.max(0, f.B - y - 4)); }
      D.text(ctx, D.fmt(it[2], 0), cx, y - 5 * ts, { size: 12 * ts, weight: 700, align: 'center', color: th.ink, halo });
      const tight = (f.R - f.L) / n < 74 * ts;
      D.text(ctx, tight ? it[4] : it[0], cx, f.B + 15 * ts, { size: 11.5 * ts, weight: 700, align: 'center', color: th.ink });
      if (!tight) D.text(ctx, it[1], cx, f.B + 29 * ts, { size: 10 * ts, align: 'center', color: th.muted });
    });
    const yT = f.y(total);
    ctx.save(); ctx.strokeStyle = th.ink2; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(f.L, yT); ctx.lineTo(f.R, yT); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.strokeStyle = th.ink2; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(f.R, yT); ctx.lineTo(f.R + 5 * ts, yT); ctx.stroke(); ctx.restore();
    D.text(ctx, 'total', f.R + 8 * ts, yT, { size: 10.5 * ts, weight: 600, base: 'middle', color: th.ink2, fixed: true });
    canvas._hover = () => 'Potential + kinetic' + (showVib ? ' + vibration' : '') + ' = ' + D.fmt(total, 0) + ' kJ/mol at every instant.\nEnergy is conserved: it only changes form.';
  }

  /* ---------- 3. bond energy vs bond length (Morse curves) ---------- */
  function morse(canvas, view) {
    const { ctx, w, h } = D.fit(canvas);
    const th = D.theme(), run = view.run, d = view.d;
    if (!run) return;
    const sys = run.path.sys, sf = sys.surface;
    const Dmax = Math.max(sf.AB.D, sf.BC.D);
    const xr = [0.3, 4.2], yr = [-Dmax * 1.12, Dmax * 0.42];
    const f = frame(ctx, w, h, th, { l: 62, r: 12, t: 10, b: 36 }, xr, yr), ts = f.ts;
    yAxis(ctx, f, th, yr, 'Potential energy (kJ/mol)', 5);
    for (const v of [1, 2, 3, 4]) D.text(ctx, String(v), f.x(v), f.B + 13 * ts, { size: 11 * ts, align: 'center', color: th.muted, fixed: true });
    D.text(ctx, f.R - f.L > 215 * ts ? 'Distance between the two nuclei (Å)' : 'Distance (Å)', (f.L + f.R) / 2, f.B + 29 * ts, { size: 11.5 * ts, align: 'center', color: th.ink2, fixed: true });
    const halo = D.rgba(th.panel, 0.9);
    ctx.save(); ctx.strokeStyle = th.ink2; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(f.L, f.y(0)); ctx.lineTo(f.R, f.y(0)); ctx.stroke(); ctx.restore();
    
    

    const nameAB = sys.A.label.split('_')[0] + '–' + sys.B.label.split('_')[0], nameBC = sys.B.label.split('_')[0] + '–' + sys.C.label.split('_')[0];
    const sets = [[sf.BC, th.brk, nameBC + ' bond (breaking)', d ? d.rBC : null, 1], [sf.AB, th.form, nameAB + ' bond (forming)', d ? d.rAB : null, -1]];
    ctx.save(); ctx.beginPath(); ctx.rect(f.L, f.T, f.R - f.L, f.B - f.T); ctx.clip();
    for (const [m, col] of sets) {
      ctx.beginPath();
      for (let i = 0; i <= 220; i++) {
        const r = xr[0] + (xr[1] - xr[0]) * i / 220, y = f.y(Math.min(M.morseSinglet(m, r), yr[1] * 1.5));
        if (i) ctx.lineTo(f.x(r), y); else ctx.moveTo(f.x(r), y);
      }
      ctx.strokeStyle = col; ctx.lineWidth = 2.6 * ts; ctx.stroke();
    }
    ctx.restore();
    // legend in the empty corner above the zero line (identity is never color alone: names are written out)
    const wide = f.R - f.L > 330 * ts;
    sets.forEach(([m, col, name], k) => {
      const x = f.x(m.re), y = f.y(-m.D);
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, f.B); ctx.stroke(); ctx.restore();
      const size = (wide ? 11.5 : 10.5) * ts, ly = f.T + (9 + k * 15) * ts;
      ctx.font = D.font(size, 600);
      const short = name.replace(' bond', ''), room = f.R - f.L - 34 * ts;
      let str = short + ': ' + D.fmt(m.D, 0) + ' kJ/mol, ' + D.fmt(m.re, 2) + ' Å';
      if (ctx.measureText(str).width > room) str = short + ': ' + D.fmt(m.D, 0) + ' kJ/mol';
      if (ctx.measureText(str).width > room) str = short.replace(/ \(.*\)/, '') + ': ' + D.fmt(m.D, 0);
      D.text(ctx, str, f.R - 4, ly, { size, weight: 600, align: 'right', base: 'middle', color: th.ink, halo, fixed: true });
      ctx.font = D.font(size, 600);
      ctx.fillStyle = col; ctx.fillRect(f.R - 4 - ctx.measureText(str).width - 18 * ts, ly - 2.5 * ts, 13 * ts, 5 * ts);
    });
    D.text(ctx, 'atoms apart: no bond', f.R - 4, f.y(0) - 5 * ts, { size: 10.5 * ts, align: 'right', color: th.muted, halo, optional: true, alts: [[0, 16 * ts]] });
    // live markers
    sets.forEach(([m, col, name, r]) => {
      if (r === null) return;
      const rr = clamp(r, xr[0], xr[1]);
      dot(ctx, f.x(rr), f.y(clamp(M.morseSinglet(m, rr), yr[0], yr[1])), 6.5 * ts, col, th);
    });
    canvas._hover = (mx) => {
      if (mx < f.L || mx > f.R) return null;
      const r = f.xInv(mx);
      return 'at ' + D.fmt(r, 2) + ' Å\n' + nameBC + ': ' + D.fmt(M.morseSinglet(sf.BC, r), 0) + ' kJ/mol\n' + nameAB + ': ' + D.fmt(M.morseSinglet(sf.AB, r), 0) + ' kJ/mol';
    };
  }

  /* ---------- 4. energy map (potential energy surface seen from above) ---------- */
  const mapCache = { key: '', canvas: null };
  function pes(canvas, view) {
    const { ctx, w, h } = D.fit(canvas);
    const th = D.theme(), run = view.run, d = view.d;
    if (!run) return;
    const path = run.path, sys = path.sys;
    const ts = th.scale, rmin = 0.4, rmax = 3.6;
    const size = Math.min(w - 58 * ts, h - 46 * ts);
    const L = Math.max(46 * ts, (w - size) / 2 + 14 * ts), T = 8 * ts, R = L + size, B = T + size;
    const X = (r) => L + (r - rmin) / (rmax - rmin) * size, Y = (r) => B - (r - rmin) / (rmax - rmin) * size;
    const theta = path.wrongEnd ? 0 : path.theta;
    const key = [sys.id, sys.reversed, sys.catalyst, sys.surface.S.toFixed(4), sys.surface.AB.D, theta, th.dark, sys.swapped].join('|');
    if (mapCache.key !== key) {
      const n = 110, g = M.surfaceGrid(sys, theta, n, rmin, rmax);
      const c = mapCache.canvas || (mapCache.canvas = document.createElement('canvas'));
      c.width = c.height = n;
      const cx = c.getContext('2d'), img = cx.createImageData(n, n);
      const lo = Math.min(0, sys.dH) - 8, hi = Math.max(sys.Ea, 0) + Math.max(140, Math.abs(sys.dH) * 0.9);
      const bands = 16;
      // one hue, light to dark: low energy (valleys) is the strong end
      const c0 = th.dark ? [150, 122, 250] : [96, 60, 190], c1 = th.dark ? [22, 28, 46] : [246, 247, 252];
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const v = g[j * n + i];
        let t = clamp((v - lo) / (hi - lo), 0, 1);
        t = Math.floor(Math.sqrt(t) * bands) / bands;
        const o = ((n - 1 - j) * n + i) * 4;
        img.data[o] = c0[0] + (c1[0] - c0[0]) * t; img.data[o + 1] = c0[1] + (c1[1] - c0[1]) * t; img.data[o + 2] = c0[2] + (c1[2] - c0[2]) * t; img.data[o + 3] = 255;
      }
      cx.putImageData(img, 0, 0);
      mapCache.key = key;
    }
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(mapCache.canvas, L, T, size, size);
    ctx.strokeStyle = th.line; ctx.lineWidth = 1; ctx.strokeRect(L + 0.5, T + 0.5, size, size); ctx.restore();
    const halo = D.rgba(th.dark ? '#161c2e' : '#ffffff', 0.85);
    for (const v of [1, 2, 3]) {
      D.text(ctx, String(v), X(v), B + 13 * ts, { size: 11 * ts, align: 'center', color: th.muted, fixed: true });
      D.text(ctx, String(v), L - 6 * ts, Y(v), { size: 11 * ts, align: 'right', base: 'middle', color: th.muted, fixed: true });
    }
    const la = sys.A.label.split('_')[0], lb = sys.B.label.split('_')[0], lc = sys.C.label.split('_')[0];
    D.text(ctx, la + '–' + lb + ' distance (Å)', (L + R) / 2, B + 27 * ts, { size: 11.5 * ts, align: 'center', color: th.ink2, fixed: true });
    ctx.save(); ctx.translate(L - 30 * ts, (T + B) / 2); ctx.rotate(-Math.PI / 2);
    D.text(ctx, lb + '–' + lc + ' distance (Å)', 0, 0, { size: 11.5 * ts, align: 'center', base: 'middle', color: th.ink2, fixed: true }); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(L, T, size, size); ctx.clip();
    if (path.reactive) {
      // the easiest route (valley floor)
      ctx.beginPath();
      for (let i = 0; i < path.N; i++) { const x = X(path.r1[i]), y = Y(path.r2[i]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.strokeStyle = th.ink; ctx.lineWidth = 1.6 * ts; ctx.setLineDash([5 * ts, 4 * ts]); ctx.stroke(); ctx.setLineDash([]);
      const tx = X(path.r1[path.iTS]), ty = Y(path.r2[path.iTS]);
      D.text(ctx, '‡', tx + 7 * ts, ty - 7 * ts, { size: 17 * ts, weight: 700, color: th.ink, halo });
      D.text(ctx, 'reactants', X(rmax) - 6 * ts, Y(sys.surface.BC.re) - 9 * ts, { size: 11 * ts, weight: 700, align: 'right', color: th.ink, halo, alts: [[0, 24 * ts]] });
      D.text(ctx, 'products', X(sys.surface.AB.re) + 8 * ts, T + 14 * ts, { size: 11 * ts, weight: 700, color: th.ink, halo });
      // where this collision has been so far
      const upto = Math.floor(view.frame);
      ctx.beginPath();
      for (let i = 0; i <= upto && i < run.frames.length; i++) { const q = run.frames[i], x = X(q.r1), y = Y(q.r2); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.strokeStyle = th.ke; ctx.lineWidth = 2.4 * ts; ctx.stroke();
      if (d) dot(ctx, X(d.rAB), Y(d.rBC), 6 * ts, th.ink, th);
    } else {
      D.text(ctx, 'no route this way', (L + R) / 2, (T + B) / 2, { size: 12 * ts, weight: 700, align: 'center', color: th.ink, halo });
    }
    ctx.restore();
    canvas._hover = (mx, my) => {
      if (mx < L || mx > R || my < T || my > B) return null;
      const r1 = rmin + (mx - L) / size * (rmax - rmin), r2 = rmin + (B - my) / size * (rmax - rmin);
      return la + '–' + lb + ' ' + D.fmt(r1, 2) + ' Å, ' + lb + '–' + lc + ' ' + D.fmt(r2, 2) + ' Å\nPE = ' + D.fmt(M.energy(sys.surface, r1, r2, theta), 0) + ' kJ/mol\nStronger color = lower energy (valley)';
    };
  }

  root.Graphs = { profile, bars, morse, pes, frame, yAxis, dot };
})(typeof self !== 'undefined' ? self : this);
