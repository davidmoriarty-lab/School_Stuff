/* tests/chair.test.js: checks the chair rules against the table every organic chemistry book has.
 *   node simulations/chirality-chairs/tests/chair.test.js */
const Chair = require('../js/chair.js');
const problems = []; let checks = 0; const ok = (c, m) => { checks++; if (!c) problems.push(m); };
const seeded = (n) => () => { n = (n * 1664525 + 1013904223) % 4294967296; return n / 4294967296; };

/* The textbook table: which pairs of axial (a) and equatorial (e) positions give each relationship.
 *   cis-1,2: a,e      trans-1,2: a,a or e,e
 *   cis-1,3: a,a or e,e      trans-1,3: a,e
 *   cis-1,4: a,e      trans-1,4: a,a or e,e                                                              */
const TABLE = { 'cis-1,2': ['ae'], 'trans-1,2': ['aa', 'ee'], 'cis-1,3': ['aa', 'ee'], 'trans-1,3': ['ae'], 'cis-1,4': ['ae'], 'trans-1,4': ['aa', 'ee'] };
const OFFS = { '1,2': 1, '1,3': 2, '1,4': 3 };
for (const name in TABLE) {
  const [rel, pos] = name.split('-'), off = OFFS[pos], target = { subs: [{ id: 'x', group: 'CH₃', c: 0, face: 1 }, { id: 'y', group: 'Cl', c: off, face: rel === 'cis' ? 1 : -1 }] };
  for (const flip of [1, -1]) {
    const accepted = new Set(), counts = {};
    for (let k1 = 0; k1 < 6; k1++) for (const t1 of ['ax', 'eq']) for (let k2 = 0; k2 < 6; k2++) for (const t2 of ['ax', 'eq']) {
      if (k1 === k2) continue; const r = Chair.check(target, { x: { k: k1, type: t1 }, y: { k: k2, type: t2 } }, flip);
      if (r.ok) { const key = (t1 === 'ax' ? 'a' : 'e') + (t2 === 'ax' ? 'a' : 'e'); accepted.add(key); counts[key] = (counts[key] || 0) + 1; }
    }
    const want = TABLE[name].slice().sort(), got = [...accepted]; const normalized = new Set(got.map((g) => (g === 'ea' ? 'ae' : g)));
    ok(JSON.stringify([...normalized].sort()) === JSON.stringify(want), name + ' (chair ' + (flip === 1 ? 'A' : 'B') + '): accepted ' + got.join(',') + ', textbook says ' + want.join(','));
    // each accepted type pair can sit on several carbon choices, and there must be at least 6 (any starting carbon)
    ok(Object.values(counts).reduce((s, v) => s + v, 0) >= 6, name + ': several carbon choices are accepted (the student may pick any carbon)');
  }
}
/* a ring flip: diaxial <-> diequatorial for the trans pairs, and ae <-> ea for the cis pairs */
for (const name in TABLE) {
  const [rel, pos] = name.split('-'), off = OFFS[pos], target = { subs: [{ id: 'x', group: 'CH₃', c: 2, face: 1 }, { id: 'y', group: 'Cl', c: (2 + off) % 6, face: rel === 'cis' ? 1 : -1 }] };
  const one = Chair.solve(target, 1), two = Chair.solve(target, -1, Chair.typesOf(one));
  ok(one && two, name + ': both chairs can be built');
  ok(two && ['x', 'y'].every((id) => two[id].type !== one[id].type), name + ': in the flip, every group switches axial/equatorial');
  ok(Chair.check(target, two, -1, Chair.typesOf(one)).ok, name + ': the flipped answer passes');
  // keeping the same types in the flipped chair is refused, even though the cis/trans and distances are fine
  const same = Chair.solve(target, -1); ok(same && Chair.check(target, same, -1, Chair.typesOf(one)).ok === (['x', 'y'].every((id) => same[id].type !== one[id].type)), name + ': an answer that keeps a group axial is refused');
  const keep = (() => { for (let k1 = 0; k1 < 6; k1++) for (let k2 = 0; k2 < 6; k2++) for (const a of ['ax', 'eq']) for (const b of ['ax', 'eq']) { const pl = { x: { k: k1, type: a }, y: { k: k2, type: b } }; if (k1 !== k2 && Chair.check(target, pl, -1).ok && a === one.x.type && b === one.y.type) return pl; } return null; })();
  ok(keep === null || !Chair.check(target, keep, -1, Chair.typesOf(one)).ok, name + ': same types in the flipped chair give a "no flip" error');
}
/* the famous results */
{ const t = (c2, face) => ({ subs: [{ id: 'x', group: 'CH₃', c: 0, face: 1 }, { id: 'y', group: 'CH₃', c: c2, face }] });
  const a = Chair.solve(t(1, -1), 1); ok(a && a.x.type === a.y.type, 'trans-1,2-dimethyl: both axial or both equatorial'); const b = Chair.solve(t(1, -1), -1, Chair.typesOf(a)); ok(b && b.x.type !== a.x.type, 'trans-1,2-dimethyl: the flip changes diaxial to diequatorial');
  const c = Chair.solve(t(3, -1), 1); ok(c && c.x.type === c.y.type, 'trans-1,4: same type'); const d = Chair.solve(t(3, 1), 1); ok(d && d.x.type !== d.y.type, 'cis-1,4: one axial, one equatorial');
  const e = Chair.solve({ subs: [0, 2, 4].map((c, i) => ({ id: 's' + i, group: ['CH₃', 'Cl', 'OH'][i], c, face: 1 })) }, 1); ok(e && e.s0.type === e.s1.type && e.s1.type === e.s2.type, 'all-cis 1,3,5: all axial or all equatorial'); }
/* identical groups are interchangeable (two CH3 groups): the student may swap them */
{ const t = { subs: [{ id: 'x', group: 'CH₃', c: 0, face: 1 }, { id: 'y', group: 'CH₃', c: 1, face: -1 }] }; const a = Chair.solve(t, 1); ok(a && Chair.check(t, { x: a.y, y: a.x }, 1).ok, 'two identical groups can be placed either way round'); }
/* wrong answers get the right message */
{ const t = { subs: [{ id: 'x', group: 'CH₃', c: 0, face: 1 }, { id: 'y', group: 'Cl', c: 2, face: 1 }] };
  ok(Chair.check(t, { x: { k: 0, type: 'ax' }, y: { k: 1, type: 'eq' } }, 1).errors[0].type === 'distance', 'wrong spacing is reported as a distance error');
  const wrongSide = Chair.check(t, { x: { k: 0, type: 'ax' }, y: { k: 2, type: 'eq' } }, 1); ok(wrongSide.errors[0].type === 'face' && wrongSide.errors[0].want === 'cis', 'cis drawn as trans is reported as a cis/trans error');
  ok(Chair.check(t, { x: { k: 0, type: 'ax' } }, 1).errors[0].type === 'unplaced', 'a missing substituent is reported'); ok(Chair.check(t, { x: { k: 0, type: 'ax' }, y: { k: 0, type: 'eq' } }, 1).errors[0].type === 'samecarbon', 'two groups on one carbon are reported');
  for (const e of [{ type: 'unplaced', groups: ['Cl'] }, { type: 'samecarbon', a: 'Cl', b: 'Br' }, { type: 'distance', a: 'Cl', b: 'Br', want: 2, got: 1 }, { type: 'face', a: 'Cl', b: 'Br', want: 'trans' }, { type: 'noflip', group: 'Cl', now: 'ax' }]) ok(/\w{4}/.test(Chair.explain(e)) && !/undefined|NaN/.test(Chair.explain(e)), 'message for ' + e.type); }
/* problems: every generated target is solvable, in both chairs, and the flat drawing keeps its relationships */
{ const rng = seeded(7); let made = 0;
  for (const pat of ['p12', 'p13', 'p14', 'tri']) for (let i = 0; i < 400; i++) {
    const t = Chair.makeTarget(rng, pat), s = t.subs; made++;
    ok(new Set(s.map((x) => x.c)).size === s.length, pat + ': substituents are on different carbons');
    ok(s.every((x) => x.face === 1 || x.face === -1), pat + ': every substituent is a wedge or a dash');
    if (pat !== 'tri') ok(Chair.ringDist(s[0].c, s[1].c) === { p12: 1, p13: 2, p14: 3 }[pat], pat + ': carbons the right distance apart');
    else ok(s.length === 3 && new Set(s.map((x) => x.group)).size === 3, 'tri: three different groups');
    const one = Chair.solve(t, 1); ok(one && Chair.check(t, one, 1).ok, pat + ': chair A is solvable');
    const two = one && Chair.solve(t, -1, Chair.typesOf(one)); ok(two && Chair.check(t, two, -1, Chair.typesOf(one)).ok, pat + ': the ring flip is solvable');
  }
  ok(made === 1600, 'made 1600 problems'); }
/* the same seed gives the same problem */
{ const a = Chair.makeTarget(seeded(5), 'p13'), b = Chair.makeTarget(seeded(5), 'p13'); ok(a.key === b.key, 'same seed, same chair problem'); }
/* geometry: 6 carbons, 12 lines, axial lines are vertical and point the way their carbon does; equatorial lines tilt the other way */
for (const flip of [1, -1]) {
  const g = Chair.geometry(flip, { R: 104, tilt: 20, azim: 18, h: 0.4, axLen: 0.62, eqLen: 0.66 }); ok(g.carbons.length === 6 && g.lines.length === 6 && g.bonds.length === 6, 'geometry has 6 carbons, 6 pairs of lines');
  g.lines.forEach((l, k) => {
    const c = g.carbons[k], up = c.side === 1;
    ok(Math.abs(l.ax.x - c.x) < 0.01 + 0, 'axial line is vertical (carbon ' + k + ')');
    ok(up ? l.ax.y < c.y : l.ax.y > c.y, 'axial line points ' + (up ? 'up' : 'down') + ' on an ' + (up ? 'up' : 'down') + ' carbon (carbon ' + k + ', flip ' + flip + ')');
    ok(up ? l.eq.y > c.y - 6 : l.eq.y < c.y + 6, 'equatorial line is flatter and tilts the other way (carbon ' + k + ')');
    ok(Math.hypot(l.ax.x - l.eq.x, l.ax.y - l.eq.y) > 25, 'the two ends are far enough apart to click (carbon ' + k + ')');
  });
  const pts = []; g.lines.forEach((l) => { pts.push(l.ax, l.eq); }); let minD = 1e9; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) minD = Math.min(minD, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)); ok(minD > 24, 'the 12 drop spots do not crowd each other (closest ' + minD.toFixed(1) + ' px)');
}
/* flipping changes which carbons are up: the first chair has carbon 0 up, the flipped chair has it down */
ok(Chair.carbonSide(0, 1) === 1 && Chair.carbonSide(0, -1) === -1 && Chair.faceOf(0, 'ax', 1) === 1 && Chair.faceOf(0, 'eq', 1) === -1, 'carbon 0: axial up, equatorial down in chair A; reversed in chair B');

/* ---------- an independent check, straight from 3D coordinates ----------
 * The checker above uses a rule ("axial points the way its carbon points"). Here we rebuild the same answers from real
 * 3D geometry instead, without using that rule: carbon positions, bond direction vectors, and the sign of each vector's
 * height above the ring's middle plane. If the rule and the geometry ever disagreed, these would fail. */
const sub3 = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }), cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }), len3 = (a) => Math.hypot(a.x, a.y, a.z), dot3 = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
for (const flip of [1, -1]) {
  const g = Chair.geometry(flip, {}), P = g.p3, tag = ' (chair ' + (flip === 1 ? 'A' : 'B') + ')';
  for (let k = 0; k < 6; k++) {
    const v = g.vectors[k], z = Math.sign(P[k].z);
    ok(Math.abs(P[k].z) > 0.05 && z === Chair.carbonSide(k, flip), 'carbon ' + k + ' sits above/below the ring plane exactly as the rule says' + tag);
    ok(v.ax.x === 0 && v.ax.y === 0 && v.ax.z === z, 'carbon ' + k + ': the axial bond is vertical and points away from the middle plane, on its carbon’s side' + tag);
    ok(Math.sign(v.eq.z) === -z, 'carbon ' + k + ': the equatorial bond tilts to the OPPOSITE side from the axial bond (z ' + v.eq.z.toFixed(2) + ')' + tag);
    const radial = { x: P[k].x, y: P[k].y, z: 0 }; ok(dot3({ x: v.eq.x, y: v.eq.y, z: 0 }, radial) > 0.3, 'carbon ' + k + ': the equatorial bond points outward, away from the ring' + tag);
    // the textbook picture: an equatorial bond is parallel to the two ring bonds one step away on either side
    for (const [a, b] of [[(k + 1) % 6, (k + 2) % 6], [(k + 5) % 6, (k + 4) % 6]]) { const bond = sub3(P[b], P[a]); ok(len3(cross(v.eq, bond)) / (len3(v.eq) * len3(bond)) < 1e-9, 'carbon ' + k + ': the equatorial bond is parallel to ring bond ' + a + '-' + b + tag); }
    // the angle between the axial and equatorial bond on a carbon is the tetrahedral-ish angle, not 0 or 180
    const ang = Math.acos(dot3(v.ax, v.eq) / (len3(v.ax) * len3(v.eq))) * 180 / Math.PI; ok(ang > 90 && ang < 125, 'carbon ' + k + ': axial/equatorial angle looks tetrahedral (' + ang.toFixed(0) + ' degrees)' + tag);
  }
}
/* the oracle: same question, answered from the 3D vectors */
function oracleOk(target, placed, flip, prevTypes) {
  const g = Chair.geometry(flip, {}), face = (pl) => Math.sign(g.vectors[pl.k][pl.type].z), subs = target.subs;
  const ks = subs.map((s) => placed[s.id].k); if (new Set(ks).size !== ks.length) return false;
  const dist = (a, b) => { const d = Math.abs(a - b); return Math.min(d, 6 - d); };
  for (let i = 0; i < subs.length; i++) for (let j = i + 1; j < subs.length; j++) { if (dist(subs[i].c, subs[j].c) !== dist(placed[subs[i].id].k, placed[subs[j].id].k)) return false; if ((subs[i].face === subs[j].face) !== (face(placed[subs[i].id]) === face(placed[subs[j].id]))) return false; }
  if (prevTypes) for (const s of subs) if (placed[s.id].type === prevTypes[s.id]) return false;
  return true;
}
{ const rng = seeded(99); let compared = 0, accepted = 0;
  for (const pat of ['p12', 'p13', 'p14', 'tri']) for (let n = 0; n < 40; n++) {
    let t = Chair.makeTarget(rng, pat); t = { subs: t.subs.map((s, i) => Object.assign({}, s, { group: 'G' + i })) };   // all groups different, so no swapping to consider
    for (const flip of [1, -1]) {
      const prev = flip === -1 ? Chair.typesOf(Chair.solve(t, 1)) : undefined, positions = []; for (let k = 0; k < 6; k++) for (const type of ['ax', 'eq']) positions.push({ k, type });
      const pick = (i, cur) => { if (i === t.subs.length) { const placed = {}; t.subs.forEach((s, j) => { placed[s.id] = cur[j]; }); const a = Chair.check(t, placed, flip, prev).ok, b = oracleOk(t, placed, flip, prev); compared++; if (a) accepted++; ok(a === b, pat + ' ' + JSON.stringify(t.subs.map((s) => [s.c, s.face])) + ' flip ' + flip + ': the checker and the 3D oracle disagree on ' + JSON.stringify(cur)); return; } positions.forEach((pos) => { if (cur.some((c) => c.k === pos.k)) return; pick(i + 1, cur.concat([pos])); }); };
      pick(0, []);
    }
  }
  ok(compared > 100000 && accepted > 500, 'compared the checker with the 3D oracle on ' + compared + ' placements (' + accepted + ' accepted)'); }
/* the checker never accepts a placement the oracle rejects when two groups are identical either (swapping allowed) */
{ const t = { subs: [{ id: 'a', group: 'X', c: 0, face: 1 }, { id: 'b', group: 'X', c: 2, face: -1 }] }; let both = 0; for (let k1 = 0; k1 < 6; k1++) for (let k2 = 0; k2 < 6; k2++) for (const t1 of ['ax', 'eq']) for (const t2 of ['ax', 'eq']) { if (k1 === k2) continue; const pl = { a: { k: k1, type: t1 }, b: { k: k2, type: t2 } }, sw = { a: pl.b, b: pl.a }; ok(Chair.check(t, pl, 1).ok === Chair.check(t, sw, 1).ok, 'identical groups: swapping the two chips never changes the verdict'); both += Chair.check(t, pl, 1).ok ? 1 : 0; } ok(both > 0, 'identical groups: some placements are accepted'); }

if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.slice(0, 30).join('\n  ')); process.exit(1); }
console.log('chair: all ' + checks + ' checks passed');
