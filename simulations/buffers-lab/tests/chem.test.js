/* tests/chem.test.js: checks the chemistry engine.   node simulations/buffers-lab/tests/chem.test.js */
const C = require('../js/chem.js');
const problems = []; let checks = 0;
const near = (a, b, tol, m) => { checks++; if (!(Math.abs(a - b) <= tol)) problems.push(m + ' (got ' + a + ', wanted ' + b + ' ± ' + tol + ')'); };
const ok = (c, m) => { checks++; if (!c) problems.push(m); };
const mix = (f) => { const m = C.empty(); f(m); return m; };

near(C.PKA, 4.7545, 0.0005, 'pKa of acetic acid');
// plain 0.83 M acetic acid: [H+] = sqrt(Ka*C) => pH 2.42
near(C.pH(mix((m) => C.addLiquid(m, 'acid', 50))), -Math.log10(Math.sqrt(1.76e-5 * 0.83)), 0.005, 'pH of 0.83 M acetic acid');
near(C.pH(mix((m) => C.addLiquid(m, 'naoh', 50))), 14 + Math.log10(0.5), 0.005, 'pH of 0.50 M NaOH');
near(C.pH(mix((m) => C.addLiquid(m, 'water', 50))), 7, 0.005, 'pH of water');
near(C.pH(mix((m) => C.addLiquid(m, 'hcl', 10))), 0, 0.005, 'pH of 1.0 M HCl');
// Buffer 1: 50.0 mL acid + 3.40 g sodium acetate
const b1 = mix((m) => { C.addLiquid(m, 'acid', 50); m.solid = 3.40; });
near(C.pH(b1), 2.419, 0.01, 'undissolved solid does not change the pH');
C.dissolve(b1, 99); near(C.pH(b1), 4.754, 0.005, 'Buffer 1 at pH 4.75'); ok(b1.solid === 0, 'all solid dissolved');
// Buffer 2: 50.0 mL acid + 41.5 mL NaOH (half neutralized)
const b2 = mix((m) => { C.addLiquid(m, 'acid', 50); C.addLiquid(m, 'naoh', 41.5); });
near(C.pH(b2), 4.754, 0.005, 'Buffer 2 at pH 4.75'); near(b2.vol, 91.5, 1e-9, 'volumes add');
// Henderson-Hasselbalch agrees with the full solution across a range of mistakes
for (const g of [1.0, 2.0, 3.0, 3.4, 4.0, 6.8]) { const m = mix((x) => { C.addLiquid(x, 'acid', 50); x.solid = g; C.dissolve(x, 99); }); near(C.pH(m), C.PKA + Math.log10((g / C.M_NAAC) / 0.0415), 0.01, 'HH check with ' + g + ' g'); }
for (const v of [10, 20, 30, 41.5, 60, 75]) { const n = v * 0.5 / 1000, m = mix((x) => { C.addLiquid(x, 'acid', 50); C.addLiquid(x, 'naoh', v); }); near(C.pH(m), C.PKA + Math.log10(n / (0.0415 - n)), 0.01, 'HH check with ' + v + ' mL NaOH'); }
// equivalence point (83.0 mL NaOH) is basic; past it is strongly basic
const eq = C.pH(mix((x) => { C.addLiquid(x, 'acid', 50); C.addLiquid(x, 'naoh', 83); })); ok(eq > 8.5 && eq < 9.7, 'equivalence point is basic (' + eq.toFixed(2) + ')');
ok(C.pH(mix((x) => { C.addLiquid(x, 'acid', 50); C.addLiquid(x, 'naoh', 100); })) > 12, 'excess NaOH is strongly basic');
// the stress test: Buffer 2 (fewer moles) moves more than Buffer 1
const p1 = C.pH(b1), p2 = C.pH(b2); C.addLiquid(b1, 'hcl', 5); C.addLiquid(b2, 'hcl', 5);
ok(p1 - C.pH(b1) > 0.05 && (p2 - C.pH(b2)) > 1.5 * (p1 - C.pH(b1)), 'Buffer 2 changes more than Buffer 1 with strong acid (' + (p1 - C.pH(b1)).toFixed(3) + ' vs ' + (p2 - C.pH(b2)).toFixed(3) + ')');
// transfers keep the composition and conserve moles
const a = mix((m) => C.addLiquid(m, 'acid', 50)), d = C.empty(); C.transfer(a, d, 20);
near(a.vol, 30, 1e-9, 'transfer leaves 30 mL'); near(d.ac, 20 * 0.83 / 1000, 1e-12, 'transfer moves the right moles'); near(d.vA, 20, 1e-9, 'acid volume is tracked'); near(C.pH(a), C.pH(d), 1e-6, 'both parts have the same pH');
C.transfer(a, d, 999); ok(a.vol === 0 && a.ac === 0, 'emptying leaves nothing behind'); near(d.ac, 0.0415, 1e-12, 'moles conserved');
// species: at pH = pKa half is HA
const sp = C.species(b2); ok(sp.HA > 0 && sp.A > 0, 'species');
// pre-lab answers
near(C.prelab.q1, 10.7, 0.05, 'pre-lab 1: 10.7 g sodium citrate'); near(C.prelab.q4, 3.37, 0.04, 'pre-lab 4'); near(C.prelab.q4simple, 3.40, 0.01, 'pre-lab 4 (pH = pKa)'); near(C.prelab.q5, 41.3, 0.3, 'pre-lab 5'); near(C.prelab.q5simple, 41.5, 1e-9, 'pre-lab 5 (pH = pKa)');
near(C.pctError(4.60), 3.158, 0.001, 'percent error');

if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('chem: all ' + checks + ' checks passed');
