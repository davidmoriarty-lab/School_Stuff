/* molecules.js: the pool of molecules for the chirality problems, drawn as skeletal structures with wedges
 * and dashes. Atoms are placed by angle from the atom before them (math angles: 0 = right, 90 = up), one
 * bond length apart. The answers are NOT stored here: cip.js works them out from the drawing.
 *
 * Also: transform(), which makes each student's copy different (turned 180 degrees, and some wedges flipped,
 * which changes R to S at that center).
 */
(function (root) {
  'use strict';
  const Cip = root.Cip || require('./cip.js');

  function build(fn) {
    const atoms = [], bonds = [];
    const api = {
      atoms, bonds,
      a(el, x, y) { atoms.push({ el, x, y: -y }); return atoms.length - 1; },
      bond(a, b, order, stereo) { bonds.push({ a, b, order: order || 1, stereo: stereo || undefined, from: stereo ? a : undefined }); },
      /* a new atom one bond away from p at the given angle; o = { order, stereo } */
      at(p, ang, el, o) { o = o || {}; const P = atoms[p], r = ang * Math.PI / 180, i = atoms.length; atoms.push({ el, x: P.x + Math.cos(r), y: P.y - Math.sin(r) }); api.bond(p, i, o.order, o.stereo); return i; },
      /* a six-membered ring (clockwise from start angle); orders = bond orders ring[k]-ring[k+1] */
      ring(cx, cy, start, orders) { const idx = []; for (let k = 0; k < 6; k++) { const t = (start - 60 * k) * Math.PI / 180; idx.push(atoms.length); atoms.push({ el: 'C', x: cx + Math.cos(t), y: cy - Math.sin(t) }); } for (let k = 0; k < 6; k++) api.bond(idx[k], idx[(k + 1) % 6], orders ? orders[k] : 1); return idx; }
    };
    fn(api); return { atoms, bonds };
  }
  const BENZENE = [1, 2, 1, 2, 1, 2];

  const POOL = [];
  const add = (id, name, tier, fn) => POOL.push({ id, name, tier, mol: build(fn) });

  /* ---- one chiral center, plain chains ---- */
  add('butan2ol', '2-butanol', 'A', (b) => { const A = b.a('C', 0, 0), B = b.at(A, 30, 'C'), C = b.at(B, -30, 'C'); b.at(C, 30, 'C'); b.at(B, 90, 'O', { stereo: 'w' }); });
  add('chlorobutane', '2-chlorobutane', 'A', (b) => { const A = b.a('C', 0, 0), B = b.at(A, 30, 'C'), C = b.at(B, -30, 'C'); b.at(C, 30, 'C'); b.at(B, 90, 'Cl', { stereo: 'd' }); });
  add('methylhexane', '3-methylhexane', 'A', (b) => { const c1 = b.a('C', 0, 0), c2 = b.at(c1, 30, 'C'), c3 = b.at(c2, -30, 'C'), c4 = b.at(c3, 30, 'C'), c5 = b.at(c4, -30, 'C'); b.at(c5, 30, 'C'); b.at(c3, 270, 'C', { stereo: 'w' }); });
  add('methylbutanol', '2-methylbutan-1-ol', 'A2', (b) => { const c1 = b.a('C', 0, 0), c2 = b.at(c1, 30, 'C'), c3 = b.at(c2, -30, 'C'); b.at(c3, 30, 'C'); b.at(c1, 150, 'O'); b.at(c2, 90, 'C', { stereo: 'd' }); });
  add('phenylethanol', '1-phenylethanol', 'A2', (b) => { const r = b.ring(0, 0, 30, BENZENE), s = b.at(r[0], 30, 'C'); b.at(s, 90, 'C'); b.at(s, -30, 'O', { stereo: 'w' }); });
  add('glyceraldehyde', 'glyceraldehyde', 'A2', (b) => { const c2 = b.a('C', 0, 0), c1 = b.at(c2, 150, 'C'), c3 = b.at(c2, 30, 'C'); b.at(c1, 90, 'O', { order: 2 }); b.at(c3, 90, 'O'); b.at(c2, 270, 'O', { stereo: 'w' }); });
  add('pentan3ol', '3-pentanol (no chiral center)', 'A0', (b) => { const c1 = b.a('C', 0, 0), c2 = b.at(c1, 30, 'C'), c3 = b.at(c2, -30, 'C'), c4 = b.at(c3, 30, 'C'); b.at(c4, -30, 'C'); b.at(c3, 270, 'O'); });

  /* ---- acids and amino acids ---- */
  add('lacticacid', 'lactic acid', 'B', (b) => { const me = b.a('C', 0, 0), c2 = b.at(me, 30, 'C'), c1 = b.at(c2, -30, 'C'); b.at(c1, 30, 'O', { order: 2 }); b.at(c1, 270, 'O'); b.at(c2, 270, 'O', { stereo: 'd' }); });
  add('alanine', 'alanine', 'B', (b) => { const me = b.a('C', 0, 0), c2 = b.at(me, 30, 'C'), c1 = b.at(c2, -30, 'C'); b.at(c1, 30, 'O', { order: 2 }); b.at(c1, 270, 'O'); b.at(c2, 270, 'N', { stereo: 'd' }); });
  add('serine', 'serine', 'B', (b) => { const c2 = b.a('C', 0, 0), c1 = b.at(c2, 30, 'C'), c3 = b.at(c2, 150, 'C'); b.at(c1, 90, 'O', { order: 2 }); b.at(c1, -30, 'O'); b.at(c3, 90, 'O'); b.at(c2, 270, 'N', { stereo: 'w' }); });
  add('cysteine', 'cysteine', 'B', (b) => { const c2 = b.a('C', 0, 0), c1 = b.at(c2, 30, 'C'), c3 = b.at(c2, 150, 'C'); b.at(c1, 90, 'O', { order: 2 }); b.at(c1, -30, 'O'); b.at(c3, 90, 'S'); b.at(c2, 270, 'N', { stereo: 'd' }); });
  add('ibuprofen', 'ibuprofen', 'B', (b) => {
    const r = b.ring(0, 0, 30, BENZENE), cs = b.at(r[0], 30, 'C'), c1 = b.at(cs, -30, 'C');
    b.at(cs, 90, 'C', { stereo: 'w' }); b.at(c1, 30, 'O', { order: 2 }); b.at(c1, 270, 'O');
    const ch2 = b.at(r[3], 210, 'C'), ch = b.at(ch2, 150, 'C'); b.at(ch, 90, 'C'); b.at(ch, 210, 'C');
  });

  /* ---- rings ---- */
  add('carvone', 'carvone', 'C', (b) => {
    const r = b.ring(0, 0, 90, [1, 2, 1, 1, 1, 1]);   // r1=r2 is the ring double bond
    b.at(r[0], 90, 'O', { order: 2 }); b.at(r[1], 30, 'C');
    const cp = b.at(r[4], 210, 'C', { stereo: 'w' }); b.at(cp, 270, 'C'); b.at(cp, 150, 'C', { order: 2 });
  });
  add('limonene', 'limonene', 'C', (b) => {
    const r = b.ring(0, 0, 90, [1, 1, 1, 1, 1, 2]);   // bond k joins r[k] and r[k+1]: bond 5 joins r5 and r0
    b.at(r[0], 90, 'C'); const cp = b.at(r[3], 270, 'C', { stereo: 'd' }); b.at(cp, 210, 'C'); b.at(cp, 330, 'C', { order: 2 });
  });
  add('methylcyclohexanol', '2-methylcyclohexanol', 'C', (b) => { const r = b.ring(0, 0, 90); b.at(r[1], 30, 'O', { stereo: 'w' }); b.at(r[0], 90, 'C', { stereo: 'd' }); });

  /* ---- more than one chiral center ---- */
  add('bromomethylpentane', '2-bromo-3-methylpentane', 'D', (b) => { const c1 = b.a('C', 0, 0), c2 = b.at(c1, 30, 'C'), c3 = b.at(c2, -30, 'C'), c4 = b.at(c3, 30, 'C'); b.at(c4, -30, 'C'); b.at(c2, 90, 'Br', { stereo: 'w' }); b.at(c3, 270, 'C', { stereo: 'd' }); });
  add('dichlorobutane', '2,3-dichlorobutane', 'D', (b) => { const c1 = b.a('C', 0, 0), c2 = b.at(c1, 30, 'C'), c3 = b.at(c2, -30, 'C'); b.at(c3, 30, 'C'); b.at(c2, 90, 'Cl', { stereo: 'w' }); b.at(c3, 270, 'Cl', { stereo: 'w' }); });
  add('tartaric', 'tartaric acid', 'D', (b) => {
    const ca = b.a('C', 0, 0), c2 = b.at(ca, -30, 'C'), c3 = b.at(c2, 30, 'C'), cb = b.at(c3, -30, 'C');
    b.at(ca, 90, 'O', { order: 2 }); b.at(ca, 210, 'O'); b.at(cb, 30, 'O', { order: 2 }); b.at(cb, 270, 'O');
    b.at(c2, 270, 'O', { stereo: 'w' }); b.at(c3, 90, 'O', { stereo: 'w' });
  });
  add('threonine', 'threonine', 'D', (b) => { const me = b.a('C', 0, 0), c3 = b.at(me, 30, 'C'), c2 = b.at(c3, -30, 'C'), c1 = b.at(c2, 30, 'C'); b.at(c1, 90, 'O', { order: 2 }); b.at(c1, -30, 'O'); b.at(c3, 90, 'O', { stereo: 'w' }); b.at(c2, 270, 'N', { stereo: 'd' }); });
  add('ephedrine', 'ephedrine', 'D', (b) => {
    const r = b.ring(0, 0, 30, BENZENE), c1 = b.at(r[0], 30, 'C'), c2 = b.at(c1, -30, 'C');
    b.at(c1, 90, 'O', { stereo: 'w' }); b.at(c2, 30, 'C'); const n = b.at(c2, 270, 'N', { stereo: 'd' }); b.at(n, 330, 'C');
  });
  add('menthol', 'menthol', 'D', (b) => { const r = b.ring(0, 0, 90); b.at(r[1], 30, 'O', { stereo: 'd' }); const ip = b.at(r[0], 90, 'C', { stereo: 'w' }); b.at(ip, 150, 'C'); b.at(ip, 30, 'C'); b.at(r[3], 270, 'C', { stereo: 'd' }); });

  const byId = {}; POOL.forEach((p) => { byId[p.id] = p; });

  /* ---------- making each student's copy different ---------- */
  const clone = (m) => ({ atoms: m.atoms.map((a) => Object.assign({}, a)), bonds: m.bonds.map((x) => Object.assign({}, x)) });
  /* opts.rotate: turn the drawing 180 degrees in the plane (same molecule, new look)
   * opts.flip:   a list of atom indices whose wedges/dashes are reversed (that center becomes its mirror image) */
  function transform(m, opts) {
    const t = clone(m); opts = opts || {};
    if (opts.rotate) { const cx = t.atoms.reduce((s, a) => s + a.x, 0) / t.atoms.length, cy = t.atoms.reduce((s, a) => s + a.y, 0) / t.atoms.length; t.atoms.forEach((a) => { a.x = 2 * cx - a.x; a.y = 2 * cy - a.y; }); }
    (opts.flip || []).forEach((c) => t.bonds.forEach((b) => { if (b.stereo && b.from === c) b.stereo = b.stereo === 'w' ? 'd' : 'w'; }));
    return t;
  }

  const api = { POOL, byId, build, transform, clone };
  root.Molecules = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
