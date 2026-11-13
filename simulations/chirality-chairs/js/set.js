/* set.js: builds each student's set of 12 problems from a set number (the seed).
 *
 *   1-8    chirality: a molecule is shown; find the chiral centers and give R or S for each.
 *   9-12   cyclohexane chairs: a flat ring with wedges and dashes; build the chair, then the ring flip.
 *
 * The same set number always rebuilds the same problems. Each molecule is shown turned or not, and each
 * chiral center has a coin-flip chance of being drawn as its mirror image, so students rarely see the same answer.
 * If a student uses the solution on a problem, replacement() builds a similar one for that spot.
 */
(function (root) {
  'use strict';
  const Cip = root.Cip || require('./cip.js'), Mol = root.Molecules || require('./molecules.js'), Chair = root.Chair || require('./chair.js');

  function seeded(n) { let a = (n >>> 0) + 0x6D2B79F5; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* which molecules can go in which spot (easy to hard) */
  const TIERS = [
    ['butan2ol', 'chlorobutane', 'methylhexane'],
    ['methylbutanol', 'phenylethanol', 'glyceraldehyde', 'pentan3ol'],
    ['lacticacid', 'alanine', 'serine', 'cysteine', 'ibuprofen'],
    ['lacticacid', 'alanine', 'serine', 'cysteine', 'ibuprofen'],
    ['carvone', 'limonene', 'methylcyclohexanol'],
    ['carvone', 'limonene', 'methylcyclohexanol'],
    ['bromomethylpentane', 'dichlorobutane', 'tartaric', 'threonine', 'ephedrine', 'menthol'],
    ['bromomethylpentane', 'dichlorobutane', 'tartaric', 'threonine', 'ephedrine', 'menthol']
  ];
  const CHAIR_PATTERNS = ['p12', 'p13', 'p14', 'tri'];
  const N_CHIRAL = 8, N = 12;
  const pick = (rng, a) => a[Math.floor(rng() * a.length)];

  function chiralProblem(rng, id) {
    const base = Mol.byId[id].mol, centers = Cip.chiralCenters(base), flip = centers.filter(() => rng() < 0.5);
    return { type: 'chiral', id, rotate: rng() < 0.5, flip };
  }
  function plan(seed) {
    const rng = seeded(seed * 7919 + 13), used = new Set(), out = [];
    for (let s = 0; s < N_CHIRAL; s++) {
      let pool = TIERS[s].filter((id) => !used.has(id)); if (s === 1 && rng() > 0.3) pool = pool.filter((id) => id !== 'pentan3ol');   // "no chiral centers" only now and then
      const id = pick(rng, pool.length ? pool : TIERS[s]); used.add(id); out.push(chiralProblem(rng, id));
    }
    const keys = new Set();
    CHAIR_PATTERNS.forEach((pat) => { const t = Chair.makeTarget(rng, pat, keys); keys.add(t.key); out.push({ type: 'chair', pattern: pat, target: t }); });
    return out;
  }
  /* the v-th replacement for spot `slot`: the same kind of problem, a different molecule or ring */
  function replacement(seed, base, slot, v) {
    if (!v) return base[slot];
    const rng = seeded(seed * 104729 + slot * 31 + 5), b = base[slot];
    if (b.type === 'chiral') {
      const used = new Set(base.filter((x) => x.type === 'chiral').map((x) => x.id)); let p = b;
      for (let k = 0; k < v; k++) { let pool = TIERS[slot].filter((id) => !used.has(id) && id !== 'pentan3ol'); if (b.id === 'pentan3ol' && !used.has('pentan3ol')) pool = TIERS[slot].slice(); if (!pool.length) { used.clear(); base.forEach((x) => x.type === 'chiral' && x !== b && used.add(x.id)); pool = TIERS[slot].filter((id) => !used.has(id) && id !== 'pentan3ol'); } if (!pool.length) pool = TIERS[slot].filter((id) => id !== 'pentan3ol'); const id = pick(rng, pool); used.add(id); p = chiralProblem(rng, id); }
      return p;
    }
    const keys = new Set(base.filter((x) => x.type === 'chair').map((x) => x.target.key)); let p = b;
    for (let k = 0; k < v; k++) { const t = Chair.makeTarget(rng, b.pattern, keys); keys.add(t.key); p = { type: 'chair', pattern: b.pattern, target: t }; }
    return p;
  }
  /* the drawing and the answer for a chirality problem */
  function chiralData(p) {
    const mol = Mol.transform(Mol.byId[p.id].mol, { rotate: p.rotate, flip: p.flip }), centers = Cip.chiralCenters(mol), cfg = {};
    const g = Cip.graph(mol); centers.forEach((c) => { cfg[c] = Cip.config(mol, c, g); });
    return { mol, centers, cfg, name: Mol.byId[p.id].name };
  }

  const api = { seeded, plan, replacement, chiralData, TIERS, N, N_CHIRAL };
  root.ChiralSet = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
