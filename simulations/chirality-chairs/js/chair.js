/* chair.js: the cyclohexane chair, with no drawing and no page: geometry, the rules, and the checking.
 *
 * The flat ring drawing has substituents on wedges (up, toward you) and dashes (down, away from you).
 * A chair has 12 positions: at each of the 6 carbons there is one AXIAL bond (straight up or down) and one
 * EQUATORIAL bond (out to the side, tilted a little the other way). Two facts decide everything:
 *   1. the carbons alternate up, down, up, down around the ring. An axial bond points the same way as its
 *      carbon (up on an "up" carbon, down on a "down" carbon). An equatorial bond points the opposite way.
 *   2. a ring flip swaps every up carbon with every down carbon. So every axial bond becomes equatorial,
 *      every equatorial becomes axial, but "up" stays up and "down" stays down.
 *
 * Because a student may put the substituents on ANY carbons, answers are not checked against one fixed
 * carbon. Instead we check the relationships the flat drawing demands:
 *   - how many carbons apart each pair is (1,2 / 1,3 / 1,4),
 *   - whether each pair is cis (same side, both up or both down) or trans (opposite sides).
 * After a ring flip, every substituent must also have switched between axial and equatorial.
 */
(function (root) {
  'use strict';
  const SIDE = { 1: 'up', '-1': 'down' };

  /* flip = +1 for the first chair, -1 for the ring-flipped chair */
  const carbonSide = (k, flip) => (k % 2 === 0 ? 1 : -1) * flip;             // +1: this carbon is an "up" carbon
  const faceOf = (k, type, flip) => (type === 'ax' ? carbonSide(k, flip) : -carbonSide(k, flip));   // +1: the bond points up
  const ringDist = (a, b) => { const d = Math.abs(a - b) % 6; return Math.min(d, 6 - d); };
  const pos = (d) => '1,' + (d + 1);

  /* ---------- checking a student's placement ---------- */
  /* target: { subs: [{ id, group, c, face }] }   (c = carbon in the flat ring 0-5, face = +1 up / -1 down)
   * placed: { id: { k, type } }                  (k = chair carbon 0-5, type = 'ax' | 'eq')
   * prevTypes: for the ring-flip step, { id: 'ax' | 'eq' } the type each substituent had in the first chair  */
  function check(target, placed, flip, prevTypes) {
    const subs = target.subs, errors = [];
    const missing = subs.filter((s) => !placed[s.id]);
    if (missing.length) return { ok: false, errors: [{ type: 'unplaced', groups: missing.map((s) => s.group) }] };
    const used = {}; for (const s of subs) { const k = placed[s.id].k; if (used[k] !== undefined) return { ok: false, errors: [{ type: 'samecarbon', a: used[k], b: s.group }] }; used[k] = s.group; }
    /* identical groups (two CH3, say) are interchangeable: try every way of matching them to the flat drawing */
    const byGroup = {}; subs.forEach((s, i) => { (byGroup[s.group] = byGroup[s.group] || []).push(i); });
    const classes = Object.values(byGroup).filter((l) => l.length > 1);
    let best = null;
    const perms = (arr) => (arr.length <= 1 ? [arr] : arr.reduce((acc, x, i) => acc.concat(perms(arr.slice(0, i).concat(arr.slice(i + 1))).map((p) => [x].concat(p))), []));
    const assignments = classes.reduce((acc, cls) => acc.reduce((o, a) => o.concat(perms(cls).map((p) => { const m = Object.assign({}, a); cls.forEach((idx, n) => { m[idx] = p[n]; }); return m; })), []), [{}]);
    for (const asg of assignments) {
      const errs = [];
      for (let i = 0; i < subs.length; i++) for (let j = i + 1; j < subs.length; j++) {
        const ti = subs[i], tj = subs[j], si = placed[subs[asg[i] !== undefined ? asg[i] : i].id], sj = placed[subs[asg[j] !== undefined ? asg[j] : j].id];
        const dT = ringDist(ti.c, tj.c), dS = ringDist(si.k, sj.k);
        if (dT !== dS) errs.push({ type: 'distance', a: ti.group, b: tj.group, want: dT, got: dS });
        else { const relT = ti.face === tj.face, relS = faceOf(si.k, si.type, flip) === faceOf(sj.k, sj.type, flip); if (relT !== relS) errs.push({ type: 'face', a: ti.group, b: tj.group, want: relT ? 'cis' : 'trans' }); }
      }
      if (!best || errs.length < best.length) best = errs; if (!errs.length) break;
    }
    errors.push(...best);
    if (!errors.length && prevTypes) { for (const s of subs) if (placed[s.id].type === prevTypes[s.id]) errors.push({ type: 'noflip', group: s.group, now: placed[s.id].type }); }
    return { ok: errors.length === 0, errors };
  }

  /* find one correct placement (for "show the solution"); prevTypes makes it a ring flip of an earlier answer */
  function solve(target, flip, prevTypes) {
    const subs = target.subs, out = {};
    function go(i, used) {
      if (i === subs.length) return check(target, out, flip, prevTypes).ok;
      for (let k = 0; k < 6; k++) { if (used.indexOf(k) >= 0) continue; for (const type of ['ax', 'eq']) { out[subs[i].id] = { k, type }; if (go(i + 1, used.concat([k]))) return true; } }
      delete out[subs[i].id]; return false;
    }
    return go(0, []) ? Object.assign({}, out) : null;
  }
  const typesOf = (placed) => { const o = {}; for (const id in placed) o[id] = placed[id].type; return o; };

  /* ---------- a message for each kind of mistake ---------- */
  function explain(e) {
    if (e.type === 'unplaced') return 'Place every substituent first: ' + e.groups.join(', ') + ' ' + (e.groups.length === 1 ? 'is' : 'are') + ' still waiting.';
    if (e.type === 'samecarbon') return e.a + ' and ' + e.b + ' are on the same carbon. In the flat drawing they are on different carbons, so give each its own carbon.';
    if (e.type === 'distance') return e.a + ' and ' + e.b + ' are ' + (e.want === 1 ? 'on neighboring carbons' : e.want === 2 ? 'two carbons apart (a 1,3 relationship)' : 'on opposite carbons (a 1,4 relationship)') + ' in the flat ring, but on the chair they are ' + (e.got === 1 ? 'on neighboring carbons' : e.got === 2 ? 'two carbons apart' : 'on opposite carbons') + '. Count the carbons again.';
    if (e.type === 'face') return e.a + ' and ' + e.b + ' are ' + e.want + ' in the flat ring (' + (e.want === 'cis' ? 'both wedges or both dashes, so on the same side' : 'one wedge and one dash, so on opposite sides') + '), but on your chair they are ' + (e.want === 'cis' ? 'trans' : 'cis') + '. Remember: axial points the way its carbon points, and equatorial points the opposite way.';
    if (e.type === 'noflip') return e.group + ' is still ' + (e.now === 'ax' ? 'axial' : 'equatorial') + '. In a ring flip every axial group becomes equatorial and every equatorial group becomes axial.';
    return 'Something is not right.';
  }

  /* ---------- making a problem ---------- */
  const GROUPS = ['CH₃', 'CH₂CH₃', 'OH', 'Cl', 'Br', 'NH₂', 'F'];
  const PATTERNS = { p12: [0, 1], p13: [0, 2], p14: [0, 3], tri: null };
  const TRI = [[0, 1, 3], [0, 2, 3], [0, 1, 2], [0, 2, 4]];
  function makeTarget(rng, pattern, avoid) {
    const pick = (a) => a[Math.floor(rng() * a.length)];
    for (let guard = 0; guard < 200; guard++) {
      const offs = pattern === 'tri' ? pick(TRI) : PATTERNS[pattern], start = Math.floor(rng() * 6), dir = rng() < 0.5 ? 1 : -1;
      const groups = []; const pool = GROUPS.slice();
      for (let i = 0; i < offs.length; i++) { if (offs.length === 2 && i === 1 && rng() < 0.2) groups.push(groups[0]); else { const g = pick(pool.filter((x) => groups.indexOf(x) < 0)); groups.push(g); } }
      let faces = offs.map(() => (rng() < 0.5 ? 1 : -1));
      if (offs.length === 3 && faces.every((f) => f === faces[0]) && rng() < 0.7) faces[1] = -faces[1];
      const subs = offs.map((o, i) => ({ id: 's' + i, group: groups[i], c: ((start + dir * o) % 6 + 6) % 6, face: faces[i] }));
      const t = { pattern, subs, key: subs.map((s) => s.c + s.group + s.face).join('|') };
      if (avoid && avoid.has(t.key)) continue;
      return t;
    }
    throw new Error('could not build a chair problem');
  }
  /* a short name for the relationship, e.g. "cis-1,3" */
  function describe(target) {
    const s = target.subs; if (s.length === 2) return (s[0].face === s[1].face ? 'cis' : 'trans') + '-' + pos(ringDist(s[0].c, s[1].c));
    return s.length + ' substituents';
  }

  /* ---------- geometry for drawing the chair ---------- */
  /* Cyclohexane: six carbons on a hexagon of radius R, alternately above and below the middle plane (the pucker is
   * exaggerated a little so the chair is easy to read). Look at it from slightly above and the familiar chair appears:
   * carbon 0 is the right-hand tip pointing up, carbon 3 the left-hand tip pointing down. flip = -1 draws the ring-flipped chair. */
  function geometry(flip, o) {
    o = o || {}; const R = o.R || 78, h = o.h || 0.34, tilt = (o.tilt || 24) * Math.PI / 180, azim = (o.azim === undefined ? 0 : o.azim) * flip * Math.PI / 180,   // the ring-flipped chair is the mirror image, so it is turned the other way
       cx = o.cx || 0, cy = o.cy || 0;
    const P = [], E = [];
    for (let k = 0; k < 6; k++) { const th = -k * Math.PI / 3; P.push({ x: Math.cos(th), y: Math.sin(th), z: carbonSide(k, flip) * h }); }
    const proj = (p) => { const x1 = p.x * Math.cos(azim) - p.y * Math.sin(azim), y1 = p.x * Math.sin(azim) + p.y * Math.cos(azim); return { x: cx + R * x1, y: cy - R * (p.z * Math.cos(tilt) + y1 * Math.sin(tilt)), depth: y1 }; };
    const carbons = P.map((p, k) => Object.assign({ k, side: carbonSide(k, flip) }, proj(p)));
    for (let k = 0; k < 6; k++) {   // equatorial bonds run parallel to the ring bonds one step away
      const a = P[(k + 1) % 6], b = P[(k + 2) % 6], w = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, radial = { x: P[k].x, y: P[k].y };
      const s = w.x * radial.x + w.y * radial.y < 0 ? -1 : 1; E.push({ x: s * w.x, y: s * w.y, z: s * w.z });
    }
    const lines = carbons.map((c, k) => {
      const base = P[k], ax = { x: base.x, y: base.y, z: base.z + carbonSide(k, flip) * (o.axLen || 0.55) }, eqv = E[k], eqL = o.eqLen || 0.62, eq = { x: base.x + eqv.x * eqL, y: base.y + eqv.y * eqL, z: base.z + eqv.z * eqL };
      return { k, ax: proj(ax), eq: proj(eq), axFace: faceOf(k, 'ax', flip), eqFace: faceOf(k, 'eq', flip) };
    });
    const bonds = []; for (let k = 0; k < 6; k++) { const a = carbons[k], b = carbons[(k + 1) % 6]; bonds.push({ a: k, b: (k + 1) % 6, depth: (a.depth + b.depth) / 2 }); }
    const vectors = P.map((pt, k) => ({ k, ax: { x: 0, y: 0, z: Math.sign(pt.z) }, eq: E[k] }));   // 3D directions of the two bonds on each carbon
    return { carbons, lines, bonds, p3: P, vectors };
  }

  const api = { carbonSide, faceOf, ringDist, check, solve, typesOf, explain, makeTarget, describe, geometry, GROUPS, PATTERNS, SIDE };
  root.Chair = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
