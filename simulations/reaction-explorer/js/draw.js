/* draw.js: small canvas helpers shared by the stage and the graphs. */
(function (root) {
  'use strict';

  /* Colors come from the CSS tokens so canvases follow the light / dark theme. */
  let cache = null;
  function theme() {
    if (cache) return cache;
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    cache = {
      dark: document.documentElement.dataset.theme === 'dark',
      bg: v('--bg'), panel: v('--panel'), panel2: v('--panel2'), ink: v('--ink'), ink2: v('--ink2'), muted: v('--muted'),
      line: v('--line'), accent: v('--accent'),
      pe: v('--c-pe'), ke: v('--c-ke'), vib: v('--c-vib'), brk: v('--c-break'), form: v('--c-form'), cc: v('--c-c'),
      pull: v('--c-pull'), push: v('--c-push'), good: v('--good'), bad: v('--bad'),
      scale: parseFloat(cs.fontSize) / 15
    };
    return cache;
  }
  function resetTheme() { cache = null; }

  /* Match the canvas bitmap to its CSS box. Returns the 2-D context scaled to CSS pixels. */
  function fit(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const bw = Math.max(1, Math.round(w * dpr)), bh = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    const ctx = canvas.getContext('2d');
    canvas._texts = [];                                     // every label drawn this frame (used by the overlap test)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h, dpr };
  }

  const font = (px, weight) => (weight || 400) + ' ' + px + 'px system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  /* Draw a label.
   *   avoid: true   look at the labels already drawn on this canvas and, if this one would
   *                 land on top of one, try the alternative spots in o.alts (offsets in px,
   *                 optionally with a different alignment), then small up/down nudges.
   *   optional      leave the label out when no free spot exists.
   *   inside        the label sits inside a drawn shape (an atom): not tracked.
   * Unrotated labels are also kept inside the canvas. Returns false if nothing was drawn. */
  function text(ctx, str, x, y, o) {
    o = o || {};
    const size = o.size || 12;
    ctx.font = font(size, o.weight);
    ctx.textBaseline = o.base || 'alphabetic';
    const canvas = ctx.canvas, log = canvas._texts;
    const t = ctx.getTransform(), k = canvas.clientWidth ? canvas.width / canvas.clientWidth : 1;
    const plain = Math.abs(t.b) < 1e-6 && Math.abs(t.c) < 1e-6;
    let align = o.align || 'left';
    const boxAt = (bx, by, al) => {
      ctx.textAlign = al;
      const m = ctx.measureText(str);
      const pts = [[bx - m.actualBoundingBoxLeft, by - m.actualBoundingBoxAscent], [bx + m.actualBoundingBoxRight, by + m.actualBoundingBoxDescent],
        [bx - m.actualBoundingBoxLeft, by + m.actualBoundingBoxDescent], [bx + m.actualBoundingBoxRight, by - m.actualBoundingBoxAscent]]
        .map(([px, py]) => [(t.a * px + t.c * py + t.e) / k, (t.b * px + t.d * py + t.f) / k]);
      return { str, x0: Math.min(...pts.map(q => q[0])), x1: Math.max(...pts.map(q => q[0])), y0: Math.min(...pts.map(q => q[1])), y1: Math.max(...pts.map(q => q[1])) };
    };
    const W = canvas.clientWidth, H = canvas.clientHeight;
    const clampIn = (c) => {                                  // nudge back inside the canvas
      let dx = 0, dy = 0;
      if (c.box.x0 < 2) dx = 2 - c.box.x0; else if (c.box.x1 > W - 2) dx = W - 2 - c.box.x1;
      if (c.box.y0 < 2) dy = 2 - c.box.y0; else if (c.box.y1 > H - 2) dy = H - 2 - c.box.y1;
      if (dx || dy) { c.x += dx; c.y += dy; c.box = boxAt(c.x, c.y, c.al); }
      return c;
    };
    const overlap = (bx) => {
      let worst = 0;
      for (const q of log) {
        const ox = Math.min(bx.x1, q.x1) - Math.max(bx.x0, q.x0) + 3, oy = Math.min(bx.y1, q.y1) - Math.max(bx.y0, q.y0) + 2;
        if (ox > 0 && oy > 0) worst = Math.max(worst, ox * oy);
      }
      return worst;
    };
    let pick = { x, y, al: align, box: boxAt(x, y, align) };
    if (plain && W) pick = clampIn(pick);
    const avoid = o.avoid !== undefined ? o.avoid : !o.fixed && !o.inside;   // labels dodge each other unless told not to
    if (avoid && log && plain) {
      const lh = size * 1.25;
      const offs = [[0, 0]].concat(o.alts || [], [[0, -lh], [0, lh], [0, -2 * lh], [0, 2 * lh], [0, -3 * lh], [0, 3 * lh]]);
      let best = null;
      for (const [dx, dy, al] of offs) {
        const c = clampIn({ x: x + dx, y: y + dy, al: al || align, box: boxAt(x + dx, y + dy, al || align) });
        c.cost = overlap(c.box);
        if (!best || c.cost < best.cost) best = c;
        if (c.cost === 0) break;
      }
      if (best.cost > 0 && o.optional) return false;
      pick = best;
    }
    ctx.textAlign = pick.al;
    if (o.halo) {
      ctx.lineWidth = o.haloW || 3.5; ctx.strokeStyle = o.halo; ctx.lineJoin = 'round';
      ctx.strokeText(str, pick.x, pick.y);
    }
    ctx.fillStyle = o.color || '#000';
    ctx.fillText(str, pick.x, pick.y);
    if (log && !o.inside) log.push(pick.box);
    return pick;
  }

  /* Straight arrow. half = draw only one barb (a "fishhook" for a single electron). */
  function arrow(ctx, x1, y1, x2, y2, o) {
    o = o || {};
    const w = o.width || 2, hl = o.head || 8;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 1) return;
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle = o.color || '#000';
    ctx.lineWidth = w; ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    const bx = x2 - Math.cos(ang) * Math.min(hl * 0.8, len), by = y2 - Math.sin(ang) * Math.min(hl * 0.8, len);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(bx, by); ctx.stroke();
    ctx.setLineDash([]);
    head(ctx, x2, y2, ang, hl, o.half);
    if (o.both) head(ctx, x1, y1, ang + Math.PI, hl, false);
    ctx.restore();
  }
  function head(ctx, x, y, ang, hl, half) {
    const a = 0.42;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - hl * Math.cos(ang - a), y - hl * Math.sin(ang - a));
    if (half) ctx.lineTo(x - hl * 0.75 * Math.cos(ang), y - hl * 0.75 * Math.sin(ang));
    else ctx.lineTo(x - hl * Math.cos(ang + a), y - hl * Math.sin(ang + a));
    ctx.closePath(); ctx.fill();
  }

  /* Curved arrow from p to q, bulging by `bulge` pixels to the left of the direction of travel. */
  function curvedArrow(ctx, p, q, bulge, o) {
    o = o || {};
    const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
    const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1;
    const cx = mx + (dy / L) * bulge, cy = my - (dx / L) * bulge;
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle = o.color || '#000';
    ctx.lineWidth = o.width || 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(cx, cy, q.x, q.y); ctx.stroke();
    head(ctx, q.x, q.y, Math.atan2(q.y - cy, q.x - cx), o.head || 9, o.half);
    ctx.restore();
  }

  /* "Nice" tick values covering [lo, hi]. */
  function ticks(lo, hi, n) {
    const span = hi - lo || 1;
    const raw = span / Math.max(1, n);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / mag;
    const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-6 ? 0 : v);
    return out;
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (hex, a) => { const c = hexToRgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  const fmt = (v, d) => (Math.abs(v) < 0.5 * Math.pow(10, -(d || 0)) ? 0 : v).toFixed(d || 0).replace('-', '−');
  const signed = (v, d) => (v > 0 ? '+' : '') + fmt(v, d);

  root.Draw = { theme, resetTheme, fit, font, text, arrow, curvedArrow, ticks, roundRect, hexToRgb, rgba, fmt, signed };
})(typeof self !== 'undefined' ? self : this);
