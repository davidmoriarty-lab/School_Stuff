/* draw.js: turns molecules, the flat cyclohexane ring and the chair template into SVG text.
 * No clicking happens here: app.js adds that. Everything is plain SVG so it prints and scales.
 */
(function (root) {
  'use strict';
  const Cip = root.Cip || require('./cip.js'), Chair = root.Chair || require('./chair.js');
  const f = (n) => Math.round(n * 10) / 10;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SUBS = { 2: '₂', 3: '₃' };
  const sub = (n) => (n === 1 ? '' : SUBS[n] || String(n));

  /* ---------- skeletal structures ---------- */
  const PAD = 38, LABEL_GAP = 12;
  function skeletal(mol, o) {
    o = o || {}; const g = Cip.graph(mol), A = mol.atoms;
    const spanX = Math.max.apply(null, A.map((a) => a.x)) - Math.min.apply(null, A.map((a) => a.x)), spanY = Math.max.apply(null, A.map((a) => a.y)) - Math.min.apply(null, A.map((a) => a.y));
    const L = Math.max(46, Math.min(72, 380 / Math.max(spanX, spanY * 1.3, 2.5)));   // small molecules are drawn larger
    const xs = A.map((a) => a.x * L), ys = A.map((a) => a.y * L);
    const pad = o.slots || (o.priorities && o.priorities.length) ? 78 : PAD;   // room for the numbered slots and the hydrogen labels
    const x0 = Math.min.apply(null, xs) - pad, y0 = Math.min.apply(null, ys) - pad, W = Math.max.apply(null, xs) - x0 + pad, H = Math.max.apply(null, ys) - y0 + pad;
    const P = A.map((a, i) => ({ x: xs[i] - x0, y: ys[i] - y0 }));
    const labeled = (i) => A[i].el !== 'C';
    const dirTo = (i, j) => { const dx = P[j].x - P[i].x, dy = P[j].y - P[i].y, d = Math.hypot(dx, dy) || 1; return { x: dx / d, y: dy / d, d }; };
    let s = '';
    /* bonds */
    mol.bonds.forEach((b, bi) => {
      const i = b.a, j = b.b, u = dirTo(i, j), sI = labeled(i) ? LABEL_GAP : 0, sJ = labeled(j) ? LABEL_GAP : 0;
      const p1 = { x: P[i].x + u.x * sI, y: P[i].y + u.y * sI }, p2 = { x: P[j].x - u.x * sJ, y: P[j].y - u.y * sJ }, nx = -u.y, ny = u.x;
      const line = (a, c, w) => '<line x1="' + f(a.x) + '" y1="' + f(a.y) + '" x2="' + f(c.x) + '" y2="' + f(c.y) + '" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round"/>';
      if (b.stereo && b.order === 1) {
        const from = b.from, a = from === i ? p1 : p2, c = from === i ? p2 : p1, ux = c.x - a.x, uy = c.y - a.y, len = Math.hypot(ux, uy), px = -uy / len, py = ux / len;
        if (b.stereo === 'w') s += '<polygon points="' + f(a.x) + ',' + f(a.y) + ' ' + f(c.x + px * 4.2) + ',' + f(c.y + py * 4.2) + ' ' + f(c.x - px * 4.2) + ',' + f(c.y - py * 4.2) + '" fill="currentColor"/>';
        else { for (let k = 1; k <= 7; k++) { const t = k / 7, cx = a.x + ux * t, cy = a.y + uy * t, w = 0.8 + 4.4 * t; s += '<line x1="' + f(cx + px * w) + '" y1="' + f(cy + py * w) + '" x2="' + f(cx - px * w) + '" y2="' + f(cy - py * w) + '" stroke="currentColor" stroke-width="1.7"/>'; } }
      } else if (b.order === 2) {
        // other neighbors of the two atoms decide which side the second line sits on (inside a ring, toward the ring)
        const others = []; [i, j].forEach((k) => g.nb[k].forEach((e) => { if (e.j !== i && e.j !== j) others.push(P[e.j]); }));
        let side = 0; if (others.length) { const mx = others.reduce((t, q) => t + q.x, 0) / others.length - (P[i].x + P[j].x) / 2, my = others.reduce((t, q) => t + q.y, 0) / others.length - (P[i].y + P[j].y) / 2; side = mx * nx + my * ny > 0 ? 1 : -1; }
        const terminal = g.nb[i].length === 1 || g.nb[j].length === 1 || !others.length || others.length === 1 && false;
        if (terminal || others.length < 2) { s += line({ x: p1.x + nx * 3.2, y: p1.y + ny * 3.2 }, { x: p2.x + nx * 3.2, y: p2.y + ny * 3.2 }) + line({ x: p1.x - nx * 3.2, y: p1.y - ny * 3.2 }, { x: p2.x - nx * 3.2, y: p2.y - ny * 3.2 }); }
        else { s += line(p1, p2) + line({ x: p1.x + side * nx * 5 + u.x * 5, y: p1.y + side * ny * 5 + u.y * 5 }, { x: p2.x + side * nx * 5 - u.x * 5, y: p2.y + side * ny * 5 - u.y * 5 }); }
      } else if (b.order === 3) { s += line(p1, p2) + line({ x: p1.x + nx * 3.6, y: p1.y + ny * 3.6 }, { x: p2.x + nx * 3.6, y: p2.y + ny * 3.6 }) + line({ x: p1.x - nx * 3.6, y: p1.y - ny * 3.6 }, { x: p2.x - nx * 3.6, y: p2.y - ny * 3.6 }); }
      else s += line(p1, p2);
    });
    /* Where to put an undrawn hydrogen's label around center c: the direction it really points if that is clear of the
     * drawn bonds, otherwise the emptiest direction (so labels never sit on top of each other). */
    const freeDir = (c, want, taken) => {
      const ang = (x, y) => Math.atan2(y, x), diff = (a, b) => { let d = Math.abs(a - b) % (2 * Math.PI); return Math.min(d, 2 * Math.PI - d); };
      const used = g.nb[c].map((e) => ang(P[e.j].x - P[c].x, P[e.j].y - P[c].y)).concat(taken), sep = (a) => Math.min.apply(null, used.map((u) => diff(a, u)).concat([Math.PI]));
      if (want) { const w = ang(want.x, want.y); if (sep(w) > 0.75) return w; }
      let best = 0, bs = -1; for (let k = 0; k < 72; k++) { const a = k * Math.PI / 36, sc = sep(a); if (sc > bs + 1e-9) { bs = sc; best = a; } } return best;
    };
    /* An undrawn hydrogen, drawn out as a bond to an "H": a wedge if it points toward you, a dash if it points away,
     * a plain line if the picture does not say. z comes from the other bonds (the H points opposite to the wedge). */
    const hBond = (c, ang, z) => {
      const ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux, a = P[c], e = { x: a.x + ux * 27, y: a.y + uy * 27 }; let s2 = '';
      if (z > 0.15) s2 = '<polygon points="' + f(a.x) + ',' + f(a.y) + ' ' + f(e.x + px * 4.4) + ',' + f(e.y + py * 4.4) + ' ' + f(e.x - px * 4.4) + ',' + f(e.y - py * 4.4) + '" fill="currentColor"/>';
      else if (z < -0.15) for (let k = 1; k <= 6; k++) { const t = k / 6, qx = a.x + (e.x - a.x) * t, qy = a.y + (e.y - a.y) * t, w = 0.8 + 4.2 * t; s2 += '<line x1="' + f(qx + px * w) + '" y1="' + f(qy + py * w) + '" x2="' + f(qx - px * w) + '" y2="' + f(qy - py * w) + '" stroke="currentColor" stroke-width="1.7"/>'; }
      else s2 = '<line x1="' + f(a.x) + '" y1="' + f(a.y) + '" x2="' + f(e.x) + '" y2="' + f(e.y) + '" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
      return '<g class="hbond ' + (z > 0.15 ? 'wedge' : z < -0.15 ? 'dash' : 'plain') + '">' + s2 + '<text x="' + f(a.x + ux * 39) + '" y="' + f(a.y + uy * 39 + 5) + '" text-anchor="middle" font-size="15" font-weight="600" fill="#1b2a38">H</text></g>';
    };
    /* heteroatom labels, with their hydrogens on the side away from the bond */
    A.forEach((a, i) => {
      if (a.el === 'C') return; const h = g.hs[i], nbs = g.nb[i]; let leftward = false;
      if (nbs.length === 1) leftward = P[nbs[0].j].x > P[i].x + 1; else if (nbs.length > 1) leftward = nbs.reduce((t, e) => t + P[e.j].x, 0) / nbs.length > P[i].x + 1;
      let hl = ''; if (h) hl = 'H' + sub(h);
      const main = '<text x="' + f(P[i].x) + '" y="' + f(P[i].y + 5) + '" text-anchor="middle" font-size="15" font-weight="600" fill="' + (a.el === 'O' ? '#c0392b' : a.el === 'N' ? '#2b5db0' : a.el === 'S' ? '#9a7b0a' : '#2f855a') + '">' + a.el + '</text>';
      const extra = hl ? '<text x="' + f(P[i].x + (leftward ? -8 : 8)) + '" y="' + f(P[i].y + 5) + '" text-anchor="' + (leftward ? 'end' : 'start') + '" font-size="15" font-weight="600" fill="currentColor">' + hl + '</text>' : '';
      s += main + extra;
    });
    /* clickable carbons, marks, priority numbers */
    let overlay = '';
    if (o.interactive) A.forEach((a, i) => { if (a.el === 'C') overlay += '<circle class="atom" data-atom="' + i + '" cx="' + f(P[i].x) + '" cy="' + f(P[i].y) + '" r="15" tabindex="0" role="button" aria-label="carbon atom ' + (i + 1) + '"/>'; });
    (o.marks || []).forEach((m, n) => { const i = m.atom, bad = m.state; overlay += '<circle class="mark ' + (bad || '') + '" cx="' + f(P[i].x) + '" cy="' + f(P[i].y) + '" r="14"/><g class="badge ' + (bad || '') + '"><circle cx="' + f(P[i].x + 15) + '" cy="' + f(P[i].y - 15) + '" r="9"/><text x="' + f(P[i].x + 15) + '" y="' + f(P[i].y - 11.5) + '" text-anchor="middle" font-size="11" font-weight="700">' + (n + 1) + '</text></g>'; });
    if (o.focus !== undefined) overlay += '<circle class="mark focus" cx="' + f(P[o.focus].x) + '" cy="' + f(P[o.focus].y) + '" r="15"/>';
    if (o.slots) {   // the four groups on one center, each a button that gets a number when clicked
      const c = o.slots.center, gs = Cip.groups(mol, c, g), usedH = [], nH = gs.filter((x) => x.atom === null).length; let hi = 0;
      gs.forEach((gr) => {
        const n = o.slots.nums[gr.id]; let q, extra = '';
        if (gr.atom !== null) { const u = dirTo(c, gr.atom), far = u.d + (labeled(gr.atom) ? 22 : 19); q = { x: P[c].x + u.x * far, y: P[c].y + u.y * far }; }
        else {
          const hx = gr.v.x, hy = -gr.v.y, d = Math.hypot(hx, hy), ang = freeDir(c, d < 0.2 ? null : { x: hx, y: hy }, usedH); usedH.push(ang); hi++;
          q = { x: P[c].x + Math.cos(ang) * 64, y: P[c].y + Math.sin(ang) * 64 }; extra = hBond(c, ang, nH === 1 ? gr.v.z : 0);
        }
        overlay += extra + '<g class="slot' + (n ? ' on' : '') + '" data-gid="' + gr.id + '" tabindex="0" role="button" aria-label="' + (gr.atom === null ? 'hydrogen that is not drawn' : A[gr.atom].el + ' group') + (n ? ', priority ' + n : '') + '"><circle cx="' + f(q.x) + '" cy="' + f(q.y) + '" r="13"/><text x="' + f(q.x) + '" y="' + f(q.y + 5) + '" text-anchor="middle" font-size="14" font-weight="800">' + (n || '') + '</text></g>';
      });
    }
    (o.priorities || []).forEach((pr) => {   // { center, groups:[{priority, atom}], hdir }
      const badge = (x, y, n) => '<g class="prio p' + n + '"><circle cx="' + f(x) + '" cy="' + f(y) + '" r="9"/><text x="' + f(x) + '" y="' + f(y + 4) + '" text-anchor="middle" font-size="11.5" font-weight="700">' + n + '</text></g>';
      const usedP = [];
      pr.groups.forEach((gr) => {
        if (gr.atom === null) {   // an undrawn hydrogen: show it where it points, with its number
          const hd = pr.hdir || { x: 0, y: 0 }, d = Math.hypot(hd.x, hd.y), ang = freeDir(pr.center, d < 0.2 ? null : hd, usedP); usedP.push(ang);
          overlay += hBond(pr.center, ang, pr.hz || 0) + badge(P[pr.center].x + Math.cos(ang) * 58, P[pr.center].y + Math.sin(ang) * 58, gr.priority);
        } else { const u = dirTo(pr.center, gr.atom), far = u.d + (labeled(gr.atom) ? 18 : 15); overlay += badge(P[pr.center].x + u.x * far, P[pr.center].y + u.y * far, gr.priority); }
      });
    });
    return { svg: '<svg class="mol" viewBox="0 0 ' + f(W) + ' ' + f(H) + '" width="' + f(W) + '" height="' + f(H) + '" role="img" aria-label="' + esc(o.label || 'molecule') + '" style="color:#1b2a38">' + s + overlay + '</svg>', w: W, h: H, pos: P };
  }

  /* ---------- the flat ring with wedges and dashes ---------- */
  const GROUP_COLOR = { 'CH₃': '#2b6cb0', 'CH₂CH₃': '#6b46c1', OH: '#c0392b', Cl: '#2f855a', Br: '#b7791f', 'NH₂': '#2c7a7b', F: '#d53f8c' };
  const groupColor = (g) => GROUP_COLOR[g] || '#444';
  function flatRing(target, o) {
    o = o || {}; const R = 58, cx = 150, cy = 118, pts = [], f2 = (n) => Math.round(n * 10) / 10;
    for (let k = 0; k < 6; k++) { const t = (90 - 60 * k) * Math.PI / 180; pts.push({ x: cx + R * Math.cos(t), y: cy - R * Math.sin(t), cos: Math.cos(t), sin: Math.sin(t) }); }
    let s = '<polygon points="' + pts.map((p) => f2(p.x) + ',' + f2(p.y)).join(' ') + '" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>';
    pts.forEach((p, k) => { s += '<text x="' + f2(cx + (p.x - cx) * 0.62) + '" y="' + f2(cy + (p.y - cy) * 0.62 + 4) + '" text-anchor="middle" font-size="12" fill="#8a97a3">' + (k + 1) + '</text>'; });
    target.subs.forEach((sub) => {
      const p = pts[sub.c], len = 36, ex = p.x + p.cos * len, ey = p.y - p.sin * len, ux = p.cos, uy = -p.sin, px = -uy, py = ux;
      if (sub.face === 1) s += '<polygon points="' + f2(p.x) + ',' + f2(p.y) + ' ' + f2(ex + px * 4.6) + ',' + f2(ey + py * 4.6) + ' ' + f2(ex - px * 4.6) + ',' + f2(ey - py * 4.6) + '" fill="currentColor"/>';
      else for (let k = 1; k <= 7; k++) { const t = k / 7, qx = p.x + (ex - p.x) * t, qy = p.y + (ey - p.y) * t, w = 0.8 + 4.4 * t; s += '<line x1="' + f2(qx + px * w) + '" y1="' + f2(qy + py * w) + '" x2="' + f2(qx - px * w) + '" y2="' + f2(qy - py * w) + '" stroke="currentColor" stroke-width="1.7"/>'; }
      const lx = ex + p.cos * 14, ly = ey - p.sin * 14 + 5, anchor = p.cos > 0.3 ? 'start' : p.cos < -0.3 ? 'end' : 'middle';
      s += '<text x="' + f2(lx + (anchor === 'start' ? -2 : anchor === 'end' ? 2 : 0)) + '" y="' + f2(ly) + '" text-anchor="' + anchor + '" font-size="17" font-weight="700" fill="' + groupColor(sub.group) + '">' + esc(sub.group) + '</text>';
    });
    return '<svg class="flat" viewBox="0 0 300 236" width="300" height="236" role="img" aria-label="flat cyclohexane ring with wedge and dash substituents" style="color:#1b2a38">' + s + '</svg>';
  }

  /* ---------- the chair template ---------- */
  const CHAIR = { w: 480, h: 330, R: 104, cx: 240, cy: 172, tilt: 20, azim: 18, pucker: 0.4, axLen: 0.62, eqLen: 0.66 };
  function chair(flip, o) {
    o = o || {}; const g = Chair.geometry(flip, { R: CHAIR.R, cx: CHAIR.cx, cy: CHAIR.cy, tilt: CHAIR.tilt, azim: CHAIR.azim, h: CHAIR.pucker, axLen: CHAIR.axLen, eqLen: CHAIR.eqLen }), placed = o.placed || {}, sp = {};
    let s = ''; const order = g.bonds.slice().sort((a, b) => a.depth - b.depth);
    order.forEach((b) => { const a = g.carbons[b.a], c = g.carbons[b.b]; s += '<line x1="' + f(a.x) + '" y1="' + f(a.y) + '" x2="' + f(c.x) + '" y2="' + f(c.y) + '" stroke="currentColor" stroke-width="' + (b.depth < -0.05 ? 5.2 : b.depth > 0.05 ? 2.4 : 3.6) + '" stroke-linecap="round"/>'; });
    for (const id in placed) sp[placed[id].k + placed[id].type] = id;
    let spots = '';
    g.lines.forEach((l) => {
      const c = g.carbons[l.k];
      [['ax', l.ax, l.axFace], ['eq', l.eq, l.eqFace]].forEach(([type, e, face]) => {
        const key = l.k + type, held = sp[key];
        s += '<line class="bond ' + type + '" x1="' + f(c.x) + '" y1="' + f(c.y) + '" x2="' + f(e.x) + '" y2="' + f(e.y) + '"/>';
        spots += '<g class="spot ' + type + (held ? ' filled' : '') + '" data-k="' + l.k + '" data-type="' + type + '" tabindex="' + (o.readonly ? -1 : 0) + '" role="button" aria-label="' + (type === 'ax' ? 'axial' : 'equatorial') + ' position, ' + (face === 1 ? 'pointing up' : 'pointing down') + '"><circle class="hit" cx="' + f(e.x) + '" cy="' + f(e.y) + '" r="25"/><circle class="ring" cx="' + f(e.x) + '" cy="' + f(e.y) + '" r="17"/>' + (held ? '<g class="chipmark" data-id="' + held + '"><rect x="' + f(e.x - 24) + '" y="' + f(e.y - 13) + '" width="48" height="26" rx="13" fill="' + groupColor(o.groups[held]) + '"/><text x="' + f(e.x) + '" y="' + f(e.y + 5) + '" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">' + esc(o.groups[held]) + '</text></g>' : '') + '</g>';
      });
    });
    return { svg: '<svg class="chair" viewBox="0 0 ' + CHAIR.w + ' ' + CHAIR.h + '" width="' + CHAIR.w + '" height="' + CHAIR.h + '" role="group" aria-label="chair conformation template" style="color:#1b2a38">' + s + spots + '</svg>', geometry: g };
  }

  const api = { skeletal, flatRing, chair, groupColor, CHAIR, esc };
  root.Draw = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
