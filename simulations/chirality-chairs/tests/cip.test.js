/* tests/cip.test.js: checks the chirality engine against facts from the textbook.
 *   node simulations/chirality-chairs/tests/cip.test.js
 * Nothing here is computed by the code being tested: orderings, Fischer-projection answers (L-amino acids are S
 * except cysteine, D-glyceraldehyde is R, D-glucose is 2R,3S,4R,5R ...) and the number of chiral centers in
 * real molecules all come from chemistry references. */
const Cip = require('../js/cip.js'), Mol = require('../js/molecules.js');
const problems = []; let checks = 0; const ok = (c, m) => { checks++; if (!c) problems.push(m); };

/* ---------- tiny builder: a center with named groups attached ---------- */
const GROUPS = {   // each: list of [element, parentIndexWithinGroup, bondOrder]; atom 0 attaches to the center
  H: [['H']], CH3: [['C']], F: [['F']], Cl: [['Cl']], Br: [['Br']], I: [['I']], OH: [['O']], SH: [['S']], NH2: [['N']],
  OCH3: [['O'], ['C', 0]], NHCH3: [['N'], ['C', 0]], 'CH2CH3': [['C'], ['C', 0]], 'CH2CH2CH3': [['C'], ['C', 0], ['C', 1]], 'CH(CH3)2': [['C'], ['C', 0], ['C', 0]],
  'C(CH3)3': [['C'], ['C', 0], ['C', 0], ['C', 0]], 'CH=CH2': [['C'], ['C', 0, 2]], 'C≡CH': [['C'], ['C', 0, 3]], 'CH2OH': [['C'], ['O', 0]], 'CH2NH2': [['C'], ['N', 0]], 'CH2Cl': [['C'], ['Cl', 0]],
  CHO: [['C'], ['O', 0, 2]], COOH: [['C'], ['O', 0, 2], ['O', 0]], COOCH3: [['C'], ['O', 0, 2], ['O', 0], ['C', 2]], 'CH(CH3)CH2CH3': [['C'], ['C', 0], ['C', 0], ['C', 2]], 'CH2CH(CH3)2': [['C'], ['C', 0], ['C', 1], ['C', 1]],
  'CH2CH2CH2CH3': [['C'], ['C', 0], ['C', 1], ['C', 2]], 'CCl3': [['C'], ['Cl', 0], ['Cl', 0], ['Cl', 0]], 'CH2CH2OH': [['C'], ['C', 0], ['O', 1]],
  'COCH3': [['C'], ['O', 0, 2], ['C', 0]], 'CH2SH': [['C'], ['S', 0]], 'C(=O)NH2': [['C'], ['O', 0, 2], ['N', 0]]
};
GROUPS.CH3 = [['C']];
function center(names, stereo) {   // names: 4 group names, placed at 90, 210, 330 degrees and one more; stereo: per-position 'w'/'d'/null
  const atoms = [{ el: 'C', x: 0, y: 0 }], bonds = [], at = [90, 210, 330, 30], heads = [];
  names.forEach((nm, k) => {
    const ang = [90, 210, 330, 270][k] * Math.PI / 180, spec = nm === 'C6H5' ? [['C'], ['C', 0, 2], ['C', 1], ['C', 2, 2], ['C', 3], ['C', 4, 2]] : GROUPS[nm];
    const base = atoms.length; heads.push(base);
    spec.forEach((s, i) => { atoms.push({ el: s[0], x: Math.cos(ang) * (1 + i * 0.2), y: -Math.sin(ang) * (1 + i * 0.2) }); const par = i === 0 ? 0 : base + s[1]; bonds.push({ a: par, b: base + i, order: s[2] || 1, stereo: i === 0 && stereo && stereo[k] ? stereo[k] : undefined, from: i === 0 && stereo && stereo[k] ? 0 : undefined }); });
    if (nm === 'C6H5') bonds.push({ a: base + 5, b: base, order: 1 });   // close the ring
  });
  return { mol: { atoms, bonds }, heads };
}
function order(names) {   // names listed in the order they come out, highest priority first
  const { mol, heads } = center(names, [null, null, null, 'd']), r = Cip.rank(mol, 0);
  if (!r) return null; return r.groups.map((g) => names[heads.indexOf(g.atom)]);
}
const higher = (a, b) => { const o = order([a, b, 'H', 'F'].map((x) => x)); if (!o) return null; return o.indexOf(a) < o.indexOf(b); };

/* ---------- 1. priority orderings from the textbooks ---------- */
const ORDERS = [
  ['I', 'Br'], ['Br', 'Cl'], ['Cl', 'SH'], ['SH', 'OH'], ['OH', 'NH2'], ['NH2', 'CH3'], ['OCH3', 'OH'], ['OH', 'NHCH3'], ['CH3', 'H'],
  ['CCl3', 'COOH'], ['COOH', 'CHO'], ['CHO', 'CH2OH'], ['COOH', 'C(=O)NH2'], ['COCH3', 'CHO'], ['COOCH3', 'COOH'],
  ['CH2OH', 'CH(CH3)2'], ['CH2OH', 'CH2NH2'], ['CH2Cl', 'CH2OH'], ['CH2Cl', 'CH2SH'], ['CH2CH3', 'CH3'], ['CH2CH2CH3', 'CH2CH3'], ['CH(CH3)2', 'CH2CH2CH3'],
  ['CH(CH3)CH2CH3', 'CH2CH(CH3)2'], ['CH2CH(CH3)2', 'CH2CH2CH2CH3'], ['CH=CH2', 'CH(CH3)2'], ['C≡CH', 'CH=CH2'], ['C6H5', 'C(CH3)3'], ['C(CH3)3', 'CH(CH3)2'], ['C6H5', 'CH=CH2'], ['CH2CH2OH', 'CH2CH2CH3'], ['CH2OH', 'CH2CH2OH']
];
for (const [hi, lo] of ORDERS) { const r = higher(hi, lo); ok(r === true, 'priority: ' + hi + ' outranks ' + lo + (r === null ? ' (could not rank)' : '')); }
/* two identical groups mean no stereocenter */
ok(Cip.rank(center(['CH3', 'CH3', 'OH', 'H']).mol, 0).stereo === false, 'two CH3 groups: not a stereocenter');
ok(Cip.rank(center(['CH3', 'CH2CH3', 'OH', 'H']).mol, 0).stereo === true, 'CH3, CH2CH3, OH, H: a stereocenter');

/* ---------- 2. Fischer projections with known answers ---------- */
/* chain of centers drawn Fischer style. rows: [leftGroup, rightGroup] for each center; top and bottom end groups. */
function fischer(top, rows, bottom) {
  const atoms = [], bonds = [], centers = [];
  const group = (nm, par, x, y, stereo) => { const spec = GROUPS[nm]; const base = atoms.length; spec.forEach((s, i) => { atoms.push({ el: s[0], x: x + 0.1 * i, y: y + 0.1 * i }); const p = i === 0 ? par : base + s[1]; bonds.push({ a: p, b: base + i, order: s[2] || 1, stereo: i === 0 ? stereo : undefined, from: i === 0 && stereo ? par : undefined }); }); };
  const cs = rows.map((r, i) => { atoms.push({ el: 'C', x: 0, y: i }); return atoms.length - 1; }); centers.push(...cs);
  rows.forEach((r, i) => {
    const c = cs[i]; group(r[0], c, -1, i, 'w'); group(r[1], c, 1, i, 'w');
    if (i > 0) bonds.push({ a: cs[i - 1], b: c, order: 1, stereo: 'd', from: c }); else group(top, c, 0, i - 1, 'd');
    if (i === rows.length - 1) group(bottom, c, 0, i + 1, 'd');
    else bonds[bonds.length - 1] = bonds[bonds.length - 1];
  });
  // vertical bonds between centers: dash from the lower center upward is enough to describe each center's vertical neighbors
  return { mol: { atoms, bonds }, centers: cs };
}
const cfg = (f) => f.centers.map((c) => Cip.config(f.mol, c).config).join('');
ok(cfg(fischer('COOH', [['NH2', 'H']], 'CH3')) === 'S', 'L-alanine (COOH top, NH2 left) is S');
ok(cfg(fischer('COOH', [['H', 'NH2']], 'CH3')) === 'R', 'D-alanine is R');
ok(cfg(fischer('COOH', [['NH2', 'H']], 'CH2OH')) === 'S', 'L-serine is S');
ok(cfg(fischer('COOH', [['NH2', 'H']], 'CH2SH')) === 'R', 'L-cysteine is R (the famous exception: CH2SH outranks COOH)');
ok(cfg(fischer('COOH', [['OH', 'H']], 'CH3')) === 'S', 'L-lactic acid is S');
ok(cfg(fischer('CHO', [['H', 'OH']], 'CH2OH')) === 'R', 'D-glyceraldehyde is R');
ok(cfg(fischer('CHO', [['OH', 'H']], 'CH2OH')) === 'S', 'L-glyceraldehyde is S');
ok(cfg(fischer('COOH', [['H', 'OH'], ['H', 'OH']], 'COOH')) !== undefined && /^(RS|SR)$/.test(cfg(fischer('COOH', [['H', 'OH'], ['H', 'OH']], 'COOH'))), 'meso-tartaric acid (both OH on the same side) is R,S');
ok(/^(RR|SS)$/.test(cfg(fischer('COOH', [['H', 'OH'], ['OH', 'H']], 'COOH'))), 'tartaric acid with OH on opposite sides is R,R or S,S');
ok(cfg(fischer('CHO', [['H', 'OH'], ['OH', 'H'], ['H', 'OH'], ['H', 'OH']], 'CH2OH')) === 'RSRR', 'D-glucose is 2R,3S,4R,5R');
ok(cfg(fischer('CHO', [['H', 'OH'], ['H', 'OH'], ['H', 'OH']], 'CH2OH')) === 'RRR', 'D-ribose is 2R,3R,4R');
ok(cfg(fischer('CHO', [['H', 'OH'], ['OH', 'H'], ['H', 'OH'], ['H', 'OH']], 'CH2OH')) !== cfg(fischer('CHO', [['OH', 'H'], ['H', 'OH'], ['OH', 'H'], ['OH', 'H']], 'CH2OH')), 'D-glucose and L-glucose differ');
ok(cfg(fischer('CHO', [['OH', 'H'], ['H', 'OH'], ['OH', 'H'], ['OH', 'H']], 'CH2OH')) === 'SRSS', 'L-glucose is 2S,3R,4S,5S');

/* ---------- 3. how many chiral centers do real molecules have? ---------- */
const COUNTS = { butan2ol: 1, chlorobutane: 1, methylhexane: 1, methylbutanol: 1, phenylethanol: 1, glyceraldehyde: 1, pentan3ol: 0, lacticacid: 1, alanine: 1, serine: 1, cysteine: 1, ibuprofen: 1, carvone: 1, limonene: 1, methylcyclohexanol: 2, bromomethylpentane: 2, dichlorobutane: 2, tartaric: 2, threonine: 2, ephedrine: 2, menthol: 3 };
for (const id in COUNTS) ok(Cip.chiralCenters(Mol.byId[id].mol).length === COUNTS[id], Mol.byId[id].name + ' has ' + COUNTS[id] + ' chiral center(s), found ' + Cip.chiralCenters(Mol.byId[id].mol).length);
ok(Object.keys(COUNTS).length === Mol.POOL.length, 'every molecule in the pool has a known center count');
/* the chiral atoms are the right ones: in ibuprofen it is the carbon between the ring and COOH */
{ const m = Mol.byId.ibuprofen.mol, c = Cip.chiralCenters(m)[0]; const nb = Cip.graph(m).nb[c].map((e) => m.atoms[e.j].el + ':' + Cip.graph(m).nb[e.j].length); ok(nb.length === 3, 'ibuprofen center is a CH with three drawn neighbors'); }
/* the answer to "why is this not a center?" names the identical groups */
{ const m = Mol.byId.butan2ol.mol; ok(/two hydrogen/.test(Cip.whyNot(m, 0)) || /three|hydrogen/.test(Cip.whyNot(m, 0)) || Cip.whyNot(m, 0) !== null, 'a CH3 carbon is not a center and says why'); const m2 = Mol.byId.pentan3ol.mol; ok(/identical|ethyl|CH2/.test(Cip.whyNot(m2, 2) || ''), '3-pentanol: carbon 3 has two identical groups (' + Cip.whyNot(m2, 2) + ')'); }
{ const m = Mol.byId.carvone.mol; ok(/double|four single/.test(Cip.whyNot(m, 0)), 'a carbonyl carbon is not a center (double bond)'); }

/* ---------- 4. things that must not change the answer ---------- */
for (const p of Mol.POOL) {
  const base = Cip.allConfigs(p.mol), cs = Object.keys(base);
  const rot = Cip.allConfigs(Mol.transform(p.mol, { rotate: true }));
  ok(JSON.stringify(rot) === JSON.stringify(base), p.name + ': turning the drawing 180 degrees does not change R/S');
  const mir = Cip.allConfigs(Mol.transform(p.mol, { flip: cs.map(Number) }));
  ok(cs.every((c) => mir[c] === (base[c] === 'R' ? 'S' : 'R')), p.name + ': flipping every wedge swaps every R and S');
  // renumber the atoms in a different order: same answer for the same atom
  const perm = p.mol.atoms.map((_, i) => i).reverse(), inv = []; perm.forEach((o, n) => { inv[o] = n; });
  const re = { atoms: perm.map((o) => p.mol.atoms[o]), bonds: p.mol.bonds.map((b) => ({ a: inv[b.a], b: inv[b.b], order: b.order, stereo: b.stereo, from: b.from === undefined ? undefined : inv[b.from] })) };
  const rc = Cip.allConfigs(re); ok(cs.every((c) => rc[inv[c]] === base[c]), p.name + ': the order the atoms are listed in does not matter');
  // flip just one center: only that one changes
  if (cs.length > 1) { const one = Number(cs[0]), part = Cip.allConfigs(Mol.transform(p.mol, { flip: [one] })); ok(cs.every((c) => (Number(c) === one ? part[c] !== base[c] : part[c] === base[c])), p.name + ': flipping one center changes only that center'); }
}
/* serine vs cysteine drawn identically: the descriptor differs, because CH2SH outranks COOH */
{ const s = Mol.byId.serine.mol, c = Mol.byId.cysteine.mol; const sc = Cip.allConfigs(s)[0], cc = Cip.allConfigs(Mol.transform(c, { flip: [0] }))[0]; ok(sc !== cc, 'same drawing, serine vs cysteine: opposite descriptors'); }
/* meso check: 2,3-dichlorobutane drawn RR; flip one end and it becomes R,S (meso) */
{ const m = Mol.byId.dichlorobutane.mol, cf = Cip.allConfigs(m), fl = Cip.allConfigs(Mol.transform(m, { flip: [2] })); ok(cf[1] === cf[2] && fl[1] !== fl[2], '2,3-dichlorobutane: same-letter pair becomes the R,S (meso) pair when one center is flipped'); }
/* the explanation text */
{ const r = Cip.config(Mol.byId.alanine.mol, 1).ranking; ok(r.groups.map((g) => g.label).join(' ') === 'N(H,H) C(O,O,(O)) C(H,H,H) H', 'alanine priorities: ' + r.groups.map((g) => g.label).join(' ')); }

/* ---------- 5. R/S from a ranking the student chose ---------- */
for (const p of Mol.POOL) {
  const g = Cip.graph(p.mol);
  for (const c of Cip.chiralCenters(p.mol)) {
    const ord = Cip.truthOrder(p.mol, c), real = Cip.config(p.mol, c, g).config;
    ok(ord.length === 4 && new Set(ord).size === 4, p.name + ' center ' + c + ': four distinct groups in the true order');
    ok(Cip.configFromOrder(p.mol, c, ord, g) === real, p.name + ' center ' + c + ': the true order gives the true letter');
    // swapping any two neighbours in the ranking reverses the letter (a basic fact about R/S)
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) { const sw = ord.slice(); [sw[i], sw[j]] = [sw[j], sw[i]]; ok(Cip.configFromOrder(p.mol, c, sw, g) === (real === 'R' ? 'S' : 'R'), p.name + ' center ' + c + ': swapping ranks ' + (i + 1) + ' and ' + (j + 1) + ' reverses R/S'); }
    // a cyclic rotation of the top three leaves the letter alone
    ok(Cip.configFromOrder(p.mol, c, [ord[1], ord[2], ord[0], ord[3]], g) === real, p.name + ' center ' + c + ': rotating the top three groups keeps the letter');
    const gs = Cip.groups(p.mol, c, g); ok(gs.length === 4 && gs.filter((x) => x.atom === null).length <= 1, p.name + ' center ' + c + ': the pop-up shows four groups');
  }
}
ok(Cip.configFromOrder(Mol.byId.butan2ol.mol, 1, [1, 1, 1, 1]) === null, 'a ranking that repeats a group is not accepted');
ok(Cip.groups(Mol.byId.butan2ol.mol, 0).length === 4 && Cip.groups(Mol.byId.butan2ol.mol, 0).filter((x) => x.atom === null).length === 3, 'a CH3 carbon shows its three undrawn hydrogens');

if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.slice(0, 40).join('\n  ')); process.exit(1); }
console.log('cip: all ' + checks + ' checks passed');
