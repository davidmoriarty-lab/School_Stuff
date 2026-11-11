/* graphs.js: the titration curve (with optional slope strip) and the "what's in the flask" bars. */
(function (root) {
  'use strict';
  const D = root.Draw, C = root.Chem, Scene = root.Scene;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function frame(w, h, ts, m, xr, yr) {
    const L = m.l * ts, R = w - m.r * ts, T = m.t * ts, B = h - m.b * ts;
    return { L, R, T, B, ts, x: (v) => L + (v - xr[0]) / (xr[1] - xr[0]) * (R - L), y: (v) => B - (v - yr[0]) / (yr[1] - yr[0]) * (B - T),
      xInv: (px) => xr[0] + (px - L) / (R - L) * (xr[1] - xr[0]) };
  }
  function dot(ctx, x, y, r, col, th) { ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 7); ctx.fillStyle = th.panel; ctx.fill(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = col; ctx.fill(); }

  /* ---------- titration curve ---------- */
  function curve(canvas, v) {
    const { ctx, w, h } = D.fit(canvas);
    const th = D.theme(), ts = th.scale, o = v.opts, exp = v.exp;
    const halo = D.rgba(th.panel, 0.92);
    const xr = [0, v.vMax], yr = [0, 14];
    const slopeH = o.gSlope ? Math.max(54 * ts, h * 0.2) : 0;
    const f = frame(w, h, ts, { l: 44, r: 16, t: 12, b: o.gSlope ? slopeH / ts + 46 : 36 }, xr, yr);
    const secret = v.unknown && !v.revealed;                  // mystery sample: do not give the answer away

    // grid and axes (fixed labels first, so everything else keeps clear of them)
    ctx.strokeStyle = th.line; ctx.lineWidth = 1;
    for (let pH = 0; pH <= 14; pH += 2) {
      const y = Math.round(f.y(pH)) + 0.5; ctx.beginPath(); ctx.moveTo(f.L, y); ctx.lineTo(f.R, y); ctx.stroke();
      D.text(ctx, String(pH), f.L - 6 * ts, y, { size: 11 * ts, align: 'right', base: 'middle', color: th.muted, fixed: true });
    }
    const xt = D.ticks(0, v.vMax, 6);
    for (const t of xt) {
      const x = Math.round(f.x(t)) + 0.5; ctx.beginPath(); ctx.moveTo(x, f.T); ctx.lineTo(x, o.gSlope ? h - 36 * ts : f.B); ctx.stroke();
      D.text(ctx, String(t), x, h - 22 * ts, { size: 11 * ts, align: 'center', color: th.muted, fixed: true });
    }
    D.text(ctx, 'Volume of ' + C.REAGENTS[exp.titrant].formula + ' added (mL)', (f.L + f.R) / 2, h - 7 * ts, { size: 11.5 * ts, align: 'center', color: th.ink2, fixed: true });
    ctx.save(); ctx.translate(13 * ts, (f.T + f.B) / 2); ctx.rotate(-Math.PI / 2);
    D.text(ctx, 'pH', 0, 0, { size: 12 * ts, weight: 600, align: 'center', base: 'middle', color: th.ink2, fixed: true }); ctx.restore();
    ctx.strokeStyle = th.ink2; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(f.L, f.T); ctx.lineTo(f.L, f.B); ctx.lineTo(f.R, f.B); ctx.stroke();

    ctx.save(); ctx.beginPath(); ctx.rect(f.L, f.T - 2, f.R - f.L + 2, f.B - f.T + 4); ctx.clip();
    // indicator range: a band in the indicator's two colours
    const ind = v.indicator;
    if (o.cInd && ind && ind.id !== 'none' && !ind.universal) {
      const y0 = f.y(ind.hi), y1 = f.y(ind.lo), g = ctx.createLinearGradient(0, y1, 0, y0);
      const ca = C.indicatorColor(ind, ind.lo - 1.5), cb = C.indicatorColor(ind, ind.hi + 1.5);
      const css = (c) => 'rgba(' + c.slice(0, 3).map(Math.round).join(',') + ',' + Math.max(0.1, c[3] * 0.55).toFixed(2) + ')';
      g.addColorStop(0, css(ca)); g.addColorStop(1, css(cb));
      ctx.fillStyle = g; ctx.fillRect(f.L, y0, f.R - f.L, y1 - y0);
      ctx.strokeStyle = th.muted; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(f.L, y0); ctx.lineTo(f.R, y0); ctx.moveTo(f.L, y1); ctx.lineTo(f.R, y1); ctx.stroke(); ctx.setLineDash([]);
    }
    // buffer regions: 10% to 90% of the way to each equivalence point
    const eq = v.eq, pk = v.pk;
    if (o.cBuffer && !secret) eq.forEach((e, k) => {
      if (pk[k] === undefined) return;
      const a = k ? eq[k - 1] : 0, x0 = f.x(a + (e - a) * 0.1), x1 = f.x(a + (e - a) * 0.9);
      ctx.fillStyle = D.rgba(th.vib, 0.13); ctx.fillRect(x0, f.T, x1 - x0, f.B - f.T);
    });
    if (o.cSeven) { ctx.strokeStyle = th.muted; ctx.lineWidth = 1.2; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(f.L, f.y(7)); ctx.lineTo(f.R, f.y(7)); ctx.stroke(); ctx.setLineDash([]); }
    // whole curve (prediction)
    if (o.cPreview && !secret) {
      ctx.beginPath(); v.full.forEach((p, i) => { const x = f.x(p.v), y = f.y(clamp(p.pH, 0, 14)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.strokeStyle = th.muted; ctx.lineWidth = 1.6 * ts; ctx.setLineDash([5 * ts, 4 * ts]); ctx.stroke(); ctx.setLineDash([]);
    }
    // the data collected so far
    const P = v.points;
    ctx.beginPath(); P.forEach((p, i) => { const x = f.x(p.v), y = f.y(clamp(p.pH, 0, 14)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.strokeStyle = th.pe; ctx.lineWidth = 2.8 * ts; ctx.lineJoin = 'round'; ctx.stroke();
    if (P.length < 60) { ctx.fillStyle = th.pe; for (const p of P) { ctx.beginPath(); ctx.arc(f.x(p.v), f.y(clamp(p.pH, 0, 14)), 2.6 * ts, 0, 7); ctx.fill(); } }
    ctx.restore();

    // current point first (so labels avoid it), then markers and labels
    const cur = P[P.length - 1], cx = f.x(cur.v), cy = f.y(clamp(cur.pH, 0, 14));
    canvas._texts.push({ str: 'page: marker', x0: cx - 8 * ts, x1: cx + 8 * ts, y0: cy - 8 * ts, y1: cy + 8 * ts });
    if (!secret) eq.forEach((e, k) => {
      if (e > v.vMax) return;
      const pHe = C.mixture(exp, e).pH, big = v.jumps[k];
      if (o.cEq && big) {
        const x = f.x(e), y = f.y(pHe);
        ctx.strokeStyle = th.brk; ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, f.B); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
        dot(ctx, x, y, 5 * ts, th.brk, th);
        const right = x < (f.L + f.R) * 0.62;
        D.text(ctx, (eq.length > 1 ? (k ? '2nd ' : '1st ') : '') + 'equivalence point', x + (right ? 9 : -9) * ts, y + 2 * ts, { size: 12 * ts, weight: 700, align: right ? 'left' : 'right', base: 'middle', color: th.ink, halo,
          alts: [[0, 16 * ts], [0, -16 * ts], [(right ? -18 : 18) * ts, 0, right ? 'right' : 'left'], [0, 32 * ts], [0, -32 * ts]] });
        D.text(ctx, e.toFixed(2) + ' mL, pH ' + pHe.toFixed(2), x + (right ? 9 : -9) * ts, y + 17 * ts, { size: 11 * ts, align: right ? 'left' : 'right', base: 'middle', color: th.ink2, halo, optional: true,
          alts: [[0, 15 * ts], [0, -32 * ts], [0, 30 * ts]] });
      }
      if (o.cHalf && pk[k] !== undefined) {
        const a = k ? eq[k - 1] : 0, vh = a + (e - a) / 2, x = f.x(vh), y = f.y(C.mixture(exp, vh).pH);
        ctx.strokeStyle = th.form; ctx.lineWidth = 1.2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(x, f.B); ctx.lineTo(x, y); ctx.lineTo(f.L, y); ctx.stroke(); ctx.setLineDash([]);
        dot(ctx, x, y, 4.5 * ts, th.form, th);
        D.text(ctx, 'half-way: pH = pKₐ = ' + pk[k].toFixed(2), x + 8 * ts, y - 11 * ts, { size: 11.5 * ts, weight: 700, color: th.ink, halo, base: 'middle', optional: eq.length > 1 && k > 0 ? false : false,
          alts: [[0, 24 * ts], [-16 * ts, 0, 'right'], [-16 * ts, 24 * ts, 'right'], [0, -16 * ts], [0, 40 * ts]] });
      }
      if (o.cBuffer && pk[k] !== undefined) {
        const a = k ? eq[k - 1] : 0;
        D.text(ctx, 'buffer region', f.x(a + (e - a) * 0.5), f.T + 10 * ts, { size: 11 * ts, weight: 600, align: 'center', base: 'middle', color: th.ink2, halo, optional: true, alts: [[0, 16 * ts], [0, 32 * ts], [0, f.B - f.T - 26 * ts]] });
      }
    });
    if (o.cInd && ind && ind.id !== 'none' && !ind.universal)
      D.text(ctx, ind.name + ': ' + ind.acidName + ' → ' + ind.baseName, f.R - 5 * ts, f.y((ind.lo + ind.hi) / 2), { size: 11 * ts, weight: 600, align: 'right', base: 'middle', color: th.ink, halo, optional: true,
        alts: [[-(f.R - f.L) + 12 * ts, 0, 'left'], [-(f.R - f.L) * 0.35, 0], [0, -16 * ts], [0, 16 * ts]] });
    if (o.cSeven) D.text(ctx, 'neutral', f.L + 6 * ts, f.y(7) - 8 * ts, { size: 10.5 * ts, color: th.muted, halo, base: 'middle', optional: true, alts: [[0, 16 * ts]] });
    if (o.cPreview && !secret) D.text(ctx, 'dashed: predicted curve', f.R - 5 * ts, f.B - 9 * ts, { size: 10.5 * ts, align: 'right', base: 'middle', color: th.muted, halo, optional: true, alts: [[0, -16 * ts]] });
    dot(ctx, cx, cy, 6.5 * ts, th.ink, th);

    // slope strip: how fast the pH is changing; the tallest spike is the equivalence point
    if (o.gSlope) {
      const sT = f.B + 10 * ts, sB = h - 36 * ts;
      let smax = 0.5; const S = [];
      for (let i = 1; i < P.length; i++) { const dv = P[i].v - P[i - 1].v; if (dv > 1e-6) { const s = Math.abs(P[i].pH - P[i - 1].pH) / dv; S.push({ v: (P[i].v + P[i - 1].v) / 2, s }); smax = Math.max(smax, s); } }
      ctx.strokeStyle = th.line; ctx.lineWidth = 1; ctx.strokeRect(f.L + 0.5, sT + 0.5, f.R - f.L, sB - sT);
      ctx.save(); ctx.beginPath(); ctx.rect(f.L, sT, f.R - f.L, sB - sT); ctx.clip();
      ctx.beginPath(); ctx.moveTo(f.L, sB);
      for (const q of S) ctx.lineTo(f.x(q.v), sB - (sB - sT - 4) * Math.min(1, q.s / smax));
      ctx.lineTo(S.length ? f.x(S[S.length - 1].v) : f.L, sB); ctx.closePath();
      ctx.fillStyle = D.rgba(th.ke, 0.35); ctx.fill(); ctx.strokeStyle = th.ke; ctx.lineWidth = 1.8 * ts; ctx.stroke();
      ctx.restore();
      D.text(ctx, 'slope: how fast pH changes (ΔpH / ΔV)', f.L + 6 * ts, sT + 10 * ts, { size: 10.5 * ts, weight: 600, color: th.ink2, base: 'middle', halo, optional: true, alts: [[(f.R - f.L) * 0.45, 0]] });
    }
    canvas._hover = (mx) => {
      if (mx < f.L || mx > f.R) return null;
      const vol = f.xInv(mx); let p = P[0]; for (const q of P) if (Math.abs(q.v - vol) < Math.abs(p.v - vol)) p = q;
      return p.v.toFixed(2) + ' mL added\npH ' + p.pH.toFixed(2);
    };
  }

  /* ---------- what's in the flask ---------- */
  function bars(canvas, v) {
    const { ctx, w, h } = D.fit(canvas);
    const th = D.theme(), ts = th.scale;
    const sp = v.mix.species;
    v.barMax = Math.max(v.barMax || 0, ...sp.map(s => s.mmol), v.mix.nA) ;
    const yr = [0, v.barMax * 1.18];
    const f = frame(w, h, ts, { l: 40, r: 8, t: 10, b: 36 }, [0, 1], yr);
    ctx.strokeStyle = th.line; ctx.lineWidth = 1;
    for (const t of D.ticks(0, yr[1], 4)) { const y = Math.round(f.y(t)) + 0.5; ctx.beginPath(); ctx.moveTo(f.L, y); ctx.lineTo(f.R, y); ctx.stroke();
      D.text(ctx, D.fmt(t, yr[1] < 3 ? 1 : 0), f.L - 5 * ts, y, { size: 10.5 * ts, align: 'right', base: 'middle', color: th.muted, fixed: true }); }
    ctx.save(); ctx.translate(11 * ts, (f.T + f.B) / 2); ctx.rotate(-Math.PI / 2);
    D.text(ctx, 'Amount (mmol)', 0, 0, { size: 11 * ts, align: 'center', base: 'middle', color: th.ink2, fixed: true }); ctx.restore();
    const n = sp.length, slot = (f.R - f.L) / n, bw = Math.min(46 * ts, slot * 0.6), halo = D.rgba(th.panel, 0.9);
    const hide = v.unknown && !v.revealed;
    // if any formula is too long for its slot, every form of the weak acid/base uses its short name
    const R = C.REAGENTS[v.exp.analyte]; ctx.font = D.font(9.5 * ts, 600);
    const useShort = sp.some(s => s.kind === 'weak' && ctx.measureText(s.label).width > slot - 4);
    sp.forEach((s, i) => {
      const cx = f.L + slot * (i + 0.5), st = Scene.styleOf(s, v.exp.analyte), y = f.y(s.mmol);
      ctx.fillStyle = st.color;
      if (f.B - y > 0.6) { D.roundRect(ctx, cx - bw / 2, y, bw, f.B - y, 4); ctx.fill(); ctx.fillRect(cx - bw / 2, Math.min(f.B - 1, y + 4), bw, Math.max(0, f.B - y - 4)); }
      const val = hide ? '?' : s.mmol >= 0.0095 ? s.mmol.toFixed(2) : s.mmol < 1e-12 ? '0' : '≈0';
      D.text(ctx, val, cx, y - 6 * ts, { size: Math.min(11 * ts, slot * 0.4), weight: 700, align: 'center', color: th.ink, halo, fixed: true });
      // full formula if it fits; otherwise the short name (HA, A⁻ ...)
      let size = 11 * ts, label = s.label; ctx.font = D.font(size, 600);
      while (ctx.measureText(label).width > slot - 4 && size > 9.5 * ts) { size -= 0.5; ctx.font = D.font(size, 600); }
      if (useShort && s.kind === 'weak') { label = R.short[R.forms.indexOf(s.label)]; size = 11 * ts; }
      ctx.font = D.font(size, 600);
      while (ctx.measureText(label).width > slot - 3 && size > 7) { size -= 0.5; ctx.font = D.font(size, 600); }
      D.text(ctx, label, cx, f.B + 14 * ts, { size, weight: 600, align: 'center', color: th.ink, fixed: true });
    });
    D.text(ctx, 'total volume ' + v.mix.V.toFixed(2) + ' mL', (f.L + f.R) / 2, f.B + 29 * ts, { size: 10.5 * ts, align: 'center', color: th.muted, fixed: true });
    canvas._hover = (mx) => {
      const i = Math.floor((mx - f.L) / slot); if (i < 0 || i >= n || hide) return null;
      const s = sp[i];
      return s.label + '\n' + (s.mmol < 0.01 ? s.mmol.toExponential(2) : s.mmol.toFixed(3)) + ' mmol\n' + (s.conc < 0.001 ? s.conc.toExponential(2) : s.conc.toFixed(4)) + ' mol/L';
    };
  }

  root.Graphs = { curve, bars };
})(typeof self !== 'undefined' ? self : this);
