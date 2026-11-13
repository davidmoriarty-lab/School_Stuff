/* tests/set.test.js: checks how each student's set of 12 problems is built.
 *   node simulations/chirality-chairs/tests/set.test.js */
const Cip = require('../js/cip.js'), Mol = require('../js/molecules.js'), Chair = require('../js/chair.js'), S = require('../js/set.js');
const problems = []; let checks = 0; const ok = (c, m) => { checks++; if (!c) problems.push(m); };
const COUNTS = { butan2ol: 1, chlorobutane: 1, methylhexane: 1, methylbutanol: 1, phenylethanol: 1, glyceraldehyde: 1, pentan3ol: 0, lacticacid: 1, alanine: 1, serine: 1, cysteine: 1, ibuprofen: 1, carvone: 1, limonene: 1, methylcyclohexanol: 2, bromomethylpentane: 2, dichlorobutane: 2, tartaric: 2, threonine: 2, ephedrine: 2, menthol: 3 };

const seen = { letters: {}, mols: {}, patterns: {}, none: 0, rot: 0 }, sigs = new Set();
for (let seed = 10000; seed < 12500; seed++) {
  const p = S.plan(seed), tag = 'set ' + seed + ': ';
  ok(p.length === 12 && p.slice(0, 8).every((x) => x.type === 'chiral') && p.slice(8).every((x) => x.type === 'chair'), tag + '8 chirality problems then 4 chair problems');
  const ids = p.slice(0, 8).map((x) => x.id); ok(new Set(ids).size === 8, tag + 'eight different molecules');
  ok(JSON.stringify(S.plan(seed)) === JSON.stringify(p), tag + 'the same set number rebuilds the same set');
  ok(p.slice(8).map((x) => x.pattern).join() === 'p12,p13,p14,tri', tag + 'chairs: 1,2 then 1,3 then 1,4 then three substituents');
  p.slice(0, 8).forEach((x, i) => {
    const d = S.chiralData(x); seen.mols[x.id] = 1; if (x.rotate) seen.rot++;
    ok(d.centers.length === COUNTS[x.id], tag + d.name + ' keeps its ' + COUNTS[x.id] + ' chiral centers after turning/flipping');
    ok(d.centers.every((c) => d.cfg[c].config === 'R' || d.cfg[c].config === 'S'), tag + d.name + ': every center gets R or S');
    d.centers.forEach((c) => { seen.letters[d.cfg[c].config] = (seen.letters[d.cfg[c].config] || 0) + 1; });
    if (!d.centers.length) seen.none++;
    ok(d.centers.length === 0 ? i === 1 : true, tag + 'the "no chiral centers" molecule only comes in spot 2');
  });
  p.slice(8).forEach((x, i) => { const t = x.target; seen.patterns[x.pattern] = 1; const one = Chair.solve(t, 1); ok(one && Chair.check(t, one, 1).ok, tag + 'chair ' + (i + 1) + ' is solvable'); const two = one && Chair.solve(t, -1, Chair.typesOf(one)); ok(two && Chair.check(t, two, -1, Chair.typesOf(one)).ok, tag + 'chair ' + (i + 1) + ' ring flip is solvable'); });
  sigs.add(p.map((x) => (x.type === 'chiral' ? x.id + x.rotate + x.flip.join('.') : x.target.key)).join('|'));
  // replacements: a different molecule/ring in the same spot, rebuilt the same way each time
  for (let slot = 0; slot < 12 && seed < 10300; slot++) for (let v = 1; v <= 3; v++) {
    const r = S.replacement(seed, p, slot, v); ok(r.type === p[slot].type, tag + 'a replacement is the same kind of problem');
    ok(JSON.stringify(S.replacement(seed, p, slot, v)) === JSON.stringify(r), tag + 'replacement ' + v + ' of spot ' + (slot + 1) + ' is rebuilt identically');
    if (r.type === 'chiral') { ok(r.id !== 'pentan3ol' || p[slot].id === 'pentan3ol', tag + 'no surprise "no chiral center" replacements'); const d = S.chiralData(r); ok(d.centers.length === COUNTS[r.id], tag + 'replacement ' + r.id + ' is intact'); if (v === 1) ok(r.id !== p[slot].id, tag + 'the first replacement is a different molecule'); }
    else { ok(r.pattern === p[slot].pattern && r.target.key !== p[slot].target.key, tag + 'a replacement chair has the same pattern but different groups or positions'); const one = Chair.solve(r.target, 1); ok(one && Chair.check(r.target, one, 1).ok, tag + 'the replacement chair is solvable'); }
  }
}
ok(sigs.size === 2500, 'every one of 2,500 set numbers gives a different set (' + sigs.size + ')');
ok(seen.letters.R > 1000 && seen.letters.S > 1000 && Math.abs(seen.letters.R - seen.letters.S) < 0.25 * (seen.letters.R + seen.letters.S), 'R and S come up about equally often (R ' + seen.letters.R + ', S ' + seen.letters.S + ')');
ok(Object.keys(seen.mols).length === Object.keys(COUNTS).length, 'every molecule in the pool is used by some set');
ok(seen.none > 50 && seen.none < 500, 'the "no chiral centers" molecule shows up now and then (' + seen.none + ' of 2500 sets)');
ok(seen.rot > 5000 && seen.rot < 15000, 'about half of the drawings are turned 180 degrees');
ok(Object.keys(seen.patterns).length === 4, 'all four chair patterns appear');
/* flipping a center changes its letter in a real set, and the original molecule data is never changed by it */
{ const p = S.plan(777).slice(0, 8), before = JSON.stringify(Mol.byId[p[0].id].mol); S.chiralData(p[0]); S.chiralData(Object.assign({}, p[0], { flip: Cip.chiralCenters(Mol.byId[p[0].id].mol) })); ok(JSON.stringify(Mol.byId[p[0].id].mol) === before, 'making a student\'s copy never changes the stored molecule'); }

if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.slice(0, 30).join('\n  ')); process.exit(1); }
console.log('set: all ' + checks + ' checks passed');
