/* cip.js: the chemistry behind the chirality problems. No drawing, no page: just logic.
 *
 * A molecule is  { atoms: [{ el, x, y }], bonds: [{ a, b, order, stereo, from }] }
 *   x, y     where the atom is drawn (y grows downward, like a screen)
 *   order    1, 2 or 3 (aromatic rings are written as alternating single/double, "Kekule" style)
 *   stereo   'w' (wedge, toward you) or 'd' (dash, away from you) or absent
 *   from     the atom at the NARROW end of the wedge/dash: that is the stereocenter the wedge describes
 *
 * Three jobs:
 *   1. chiralCenters(mol)  which atoms are chiral centers (four different groups)
 *   2. rank(mol, c)        the CIP priority of the four groups on center c, with the reasons
 *   3. config(mol, c)      'R' or 'S', from the drawing (wedges and dashes give the 3D picture)
 *
 * How CIP ranking works here (the standard "hierarchical digraph"):
 *   Every group is a tree that grows outward from the center, one "sphere" at a time. Two groups are
 *   compared sphere by sphere: first the atom attached to the center (higher atomic number wins); if they
 *   tie, compare the SET of atoms attached to it (highest first); if they still tie, move one sphere out,
 *   and so on. Double bonds count twice (a duplicate atom is added at each end). Hydrogens that are not
 *   drawn are added back. Rings are followed around until they come back to where they started.
 */
(function (root) {
  'use strict';
  const Z = { H: 1, C: 6, N: 7, O: 8, F: 9, P: 15, S: 16, Cl: 17, Br: 35, I: 53 };
  const VALENCE = { C: 4, N: 3, O: 2, S: 2, F: 1, Cl: 1, Br: 1, I: 1, H: 1 };
  const MAXD = 7;   // how many spheres out we look before declaring two groups identical

  /* ---------- the molecule as a graph ---------- */
  function graph(mol) {
    const n = mol.atoms.length, nb = Array.from({ length: n }, () => []);
    mol.bonds.forEach((b, i) => { nb[b.a].push({ j: b.b, order: b.order || 1, bond: i }); nb[b.b].push({ j: b.a, order: b.order || 1, bond: i }); });
    const hs = mol.atoms.map((a, i) => { const used = nb[i].reduce((t, x) => t + x.order, 0); return Math.max(0, (VALENCE[a.el] || 0) - used); });
    return { mol, nb, hs };
  }

  /* ---------- the tree of one group ---------- */
  function node(el, idx, dup) { return { z: el === null ? 0 : Z[el], el, idx, dup: !!dup, kids: [] }; }
  /* branch rooted at atom j, reached from atom `from`, path = atoms already on the way (to spot ring closures) */
  function grow(g, j, from, path, depth) {
    const a = g.mol.atoms[j], me = node(a.el, j, false);
    if (depth >= MAXD) return me;
    const p2 = path.concat([j]);
    for (const e of g.nb[j]) {
      if (e.j === from && e.order === 1) continue;                      // the way we came
      if (e.j === from) { for (let k = 1; k < e.order; k++) me.kids.push(dupNode(g, e.j)); continue; }   // double bond back to the parent: a duplicate of it
      if (path.indexOf(e.j) >= 0 || e.j === from) me.kids.push(dupNode(g, e.j));                          // ring closure: a duplicate of the atom we met before
      else me.kids.push(grow(g, e.j, j, p2, depth + 1));
      for (let k = 1; k < e.order; k++) me.kids.push(dupNode(g, e.j));  // the second (third) bond of a double (triple) bond
    }
    for (let k = 0; k < g.hs[j]; k++) me.kids.push(node('H', null, false));
    return me;
  }
  /* a duplicate atom: same element, but its own substituents are phantom atoms (atomic number 0) */
  function dupNode(g, j) { const d = node(g.mol.atoms[j].el, j, true); d.kids = [node(null, null, true), node(null, null, true), node(null, null, true)]; d.kids.forEach((k) => { k.phantom = true; }); return d; }

  /* levels(n): sphere by sphere, each sphere is a list of "sets" (one per parent, parents in ranked order) */
  function levels(n) {
    sortKids(n);
    const out = [[[n.z]]]; let cur = [n];
    for (let d = 1; d <= MAXD; d++) {
      const sets = [], next = [];
      for (const p of cur) { sets.push(p.kids.map((k) => k.z)); p.kids.forEach((k) => next.push(k)); }
      if (!next.length) break; out.push(sets); cur = next;
    }
    return out;
  }
  function cmpLevels(la, lb) {
    const L = Math.max(la.length, lb.length);
    for (let d = 0; d < L; d++) {
      const A = la[d] || [], B = lb[d] || [], m = Math.max(A.length, B.length);
      for (let i = 0; i < m; i++) {
        const sa = A[i] || [], sb = B[i] || [], w = Math.max(sa.length, sb.length);
        for (let k = 0; k < w; k++) { const x = sa[k] || 0, y = sb[k] || 0; if (x !== y) return { r: x > y ? 1 : -1, sphere: d + 1, A: sa, B: sb }; }
      }
    }
    return { r: 0 };
  }
  function cmp(a, b) { if (a._lv === undefined) a._lv = levels(a); if (b._lv === undefined) b._lv = levels(b); return cmpLevels(a._lv, b._lv); }
  function sortKids(n) { if (n._sorted) return; n._sorted = true; n.kids.forEach(sortKids); n.kids.sort((a, b) => -cmp(a, b).r); }

  /* ---------- which atoms are stereocenters ---------- */
  function neighbours(g, c) {   // the four groups on c: { atom index or null for H, order }
    const out = g.nb[c].map((e) => ({ j: e.j, order: e.order, bond: e.bond })); for (let k = 0; k < g.hs[c]; k++) out.push({ j: null, order: 1, bond: null }); return out;
  }
  function branch(g, c, e) { return e.j === null ? node('H', null, false) : grow(g, e.j, c, [c], 1); }

  /* label like  C(O,H,H)  for the solution text */
  const sym = (k) => (k.phantom ? '0' : k.dup ? '(' + k.el + ')' : k.el);
  function describe(n) { const kids = n.kids.filter((k) => !k.phantom); return n.dup ? '(' + n.el + ')' : n.el + (kids.length ? '(' + kids.map(sym).join(',') + ')' : ''); }

  /* Rank the four groups on center c, highest priority first. Returns null if c is not a stereocenter. */
  function rank(mol, c, g) {
    g = g || graph(mol); const a = mol.atoms[c];
    if (a.el !== 'C') return null;
    const nbs = neighbours(g, c); if (nbs.length !== 4 || nbs.some((e) => e.order !== 1)) return null;
    const br = nbs.map((e) => ({ e, tree: branch(g, c, e) }));
    br.forEach((x) => sortKids(x.tree));
    br.sort((p, q) => -cmp(p.tree, q.tree).r);
    const ties = []; for (let i = 0; i < 3; i++) if (cmp(br[i].tree, br[i + 1].tree).r === 0) ties.push([i, i + 1]);
    const reasons = []; for (let i = 0; i < 3; i++) { const r = cmp(br[i].tree, br[i + 1].tree); if (r.r !== 0) reasons.push({ upper: i, lower: i + 1, sphere: r.sphere, A: r.A, B: r.B }); }
    return { groups: br.map((x, i) => ({ priority: i + 1, atom: x.e.j, bond: x.e.bond, label: describe(x.tree), tree: x.tree })), ties, reasons, stereo: ties.length === 0 };
  }
  function chiralCenters(mol) { const g = graph(mol), out = []; mol.atoms.forEach((a, i) => { const r = rank(mol, i, g); if (r && r.stereo) out.push(i); }); return out; }
  /* why is atom c NOT a center? name the identical groups, e.g. "two hydrogen atoms" */
  function whyNot(mol, c) {
    const g = graph(mol), a = mol.atoms[c];
    if (a.el !== 'C') return 'this is not a carbon atom';
    const nbs = neighbours(g, c);
    if (nbs.length !== 4 || nbs.some((e) => e.order !== 1)) return 'it does not have four single bonds (it is part of a double or triple bond, or it has fewer than four groups)';
    const r = rank(mol, c, g); if (r.stereo) return null;
    const t = r.groups[r.ties[0][0]], u = r.groups[r.ties[0][1]];
    return t.atom === null && u.atom === null ? 'it has two hydrogen atoms' : 'it has two identical groups (' + t.label + ' twice)';
  }

  /* ---------- R or S from the picture ---------- */
  /* 3D direction from center c toward neighbor e: x right, y UP, z toward the viewer. Wedge = +, dash = -. */
  function vec(mol, c, e) {
    const A = mol.atoms[c], B = mol.atoms[e.j], v = { x: B.x - A.x, y: -(B.y - A.y), z: 0 };
    if (e.bond !== null) { const b = mol.bonds[e.bond]; if (b.stereo && b.from === c) v.z = b.stereo === 'w' ? 0.8 : -0.8; }
    return v;
  }
  function config(mol, c, g) {
    g = g || graph(mol); const r = rank(mol, c, g); if (!r || !r.stereo) return null;
    const nbs = neighbours(g, c), explicit = nbs.filter((e) => e.j !== null), vs = {};
    explicit.forEach((e) => { vs[e.j] = vec(mol, c, e); });
    // an undrawn hydrogen points opposite to the sum of the others
    const sum = explicit.reduce((s, e) => ({ x: s.x + vs[e.j].x, y: s.y + vs[e.j].y, z: s.z + vs[e.j].z }), { x: 0, y: 0, z: 0 });
    const hv = { x: -sum.x, y: -sum.y, z: -sum.z };
    if (explicit.length === 3 && explicit.every((e) => vs[e.j].z === 0)) return { config: null, reason: 'no wedge or dash on this center' };
    const v = r.groups.map((gr) => (gr.atom === null ? hv : vs[gr.atom]));
    const [a, b, cc, d] = v, sub = (p, q) => ({ x: p.x - q.x, y: p.y - q.y, z: p.z - q.z });
    const p = sub(a, d), q = sub(b, d), s = sub(cc, d);
    const det = p.x * (q.y * s.z - q.z * s.y) - p.y * (q.x * s.z - q.z * s.x) + p.z * (q.x * s.y - q.y * s.x);
    return { config: det < 0 ? 'R' : 'S', det, lowestZ: d.z, ranking: r, dir: v };
  }
  function allConfigs(mol) { const g = graph(mol), out = {}; chiralCenters(mol).forEach((c) => { out[c] = config(mol, c, g).config; }); return out; }

  const api = { Z, graph, rank, chiralCenters, whyNot, config, allConfigs, describe, neighbours };
  root.Cip = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
