/* tests/model.test.js: checks the board logic and the digestion model with no browser.
 *
 *   node simulations/digestive-system-builder/tests/model.test.js
 *
 * It checks that:
 *   - parts cannot overlap or hang off the grid, and the tray limits hold;
 *   - the tube is traced from the mouth through every joined opening, and stops at a gap;
 *   - each gland, cell group and vessel attaches to the organ it touches;
 *   - nothing is created or destroyed: at every tick, initial = in the gut + absorbed;
 *   - a correct build absorbs nearly everything, gives solid stool and reports no problems;
 *   - every kind of mistake is reported, and the ones that should cause diarrhea do;
 *   - a mistake that cannot matter for a food (no gallbladder, eating an apple) says so.
 */
const path = require('path');
const D = require(path.join(__dirname, '..', 'js', 'data.js'));
const M = require(path.join(__dirname, '..', 'js', 'model.js'));

const problems = []; let checks = 0;
const expect = (cond, msg) => { checks++; if (!cond) problems.push(msg); };
const build = list => list.map(([type, c, r], i) => ({ uid: i + 1, type, c, r }));
const example = (drop = [], move = {}) => build(D.EXAMPLE.filter(e => !drop.includes(e[0])).map(e => move[e[0]] ? [e[0], ...move[e[0]]] : e));
const titles = r => r.findings.map(f => f.title).join(' | ');
const has = (r, text) => r.findings.some(f => f.title.includes(text));

/* --- the board --- */
const ex = example();
expect(D.EXAMPLE.every(([t, c, r], i) => M.canPlace(build(D.EXAMPLE.slice(0, i)), t, c, r)), 'the example build fits on the grid without overlaps');
expect(!M.canPlace(ex, 'chief', 4, 2), 'a part cannot be placed on top of the stomach');
expect(!M.canPlace([], 'small', D.COLS - 3, 0), 'a part cannot hang off the right edge');
expect(!M.canPlace([], 'stomach', 0, D.ROWS - 1), 'a part cannot hang off the bottom edge');
expect(!M.canPlace(ex, 'liver', 10, 0) && M.canPlace(ex, 'liver', 10, 0, ex.find(p => p.type === 'liver').uid), 'a part may be moved onto squares it already covers');
for (const t of Object.keys(D.PARTS)) expect(D.EXAMPLE.filter(e => e[0] === t).length <= D.PARTS[t].max, t + ': example respects the tray limit');

/* --- tracing --- */
let A = M.analyze(ex);
expect(A.path.map(p => p.type).join() === D.TRACT.join(), 'example path runs mouth to anus in order (got ' + A.path.map(p => p.type).join() + ')');
const hostOf = type => { const a = ex.find(p => p.type === type); const h = A.attach[a.uid].host; return h ? h.type : null; };
expect(hostOf('salivary') === 'mouth' && hostOf('chief') === 'stomach' && hostOf('parietal') === 'stomach', 'salivary gland and stomach cells attach to the right organs');
expect(hostOf('pancreas') === 'small' && hostOf('gallbladder') === 'small' && hostOf('lymph') === 'small', 'pancreas, gallbladder and lymphatics attach to the small intestine');
expect(A.attach[ex.find(p => p.type === 'liver').uid].viaGallbladder, 'the liver drains through the gallbladder it touches');
A = M.analyze(example([], { stomach: [4, 3] }));
expect(A.path.map(p => p.type).join() === 'mouth,esophagus', 'a stomach one row too low is not joined (path stops at the esophagus)');
expect(M.simulate(example(['mouth']), 'apple').error === 'no-mouth', 'no mouth: the run is refused');

/* --- conservation, for every food and several builds --- */
const builds = { correct: ex, 'no pancreas': example(['pancreas']), 'no capillaries': example(['capillaries']), 'open after stomach': example([], { small: [8, 3] }) };
for (const [label, b] of Object.entries(builds)) for (const food of Object.keys(D.FOODS)) {
  const r = M.simulate(b, food), f = D.FOODS[food];
  let worst = 0, negative = false;
  for (const fr of r.frames) {
    worst = Math.max(worst, Math.abs(fr.cc + fr.su + fr.pr + fr.aa + fr.fa + fr.fy + fr.A_su + fr.A_aa + fr.A_fy - (f.cc + f.su + f.pr + f.fa)), Math.abs(fr.w + fr.A_w - f.w));
    if (Object.values(fr).some(v => v < -1e-9)) negative = true;
  }
  expect(worst < 1e-6, label + ' / ' + food + ': Calories and water are conserved (off by ' + worst + ')');
  expect(!negative, label + ' / ' + food + ': no amount goes negative');
  expect(r.frames.length - 1 === r.segments.reduce((n, s) => n + s.ticks, 0), label + ' / ' + food + ': one frame per tick');
}

/* --- a correct build --- */
for (const food of Object.keys(D.FOODS)) {
  const r = M.simulate(ex, food);
  expect(r.outcome === 'healthy' && r.stool === 'solid' && r.findings.length === 0, 'correct build / ' + food + ': healthy with no findings (got ' + r.outcome + '; ' + titles(r) + ')');
  expect(r.pctWater > 95, 'correct build / ' + food + ': over 95% of water absorbed (got ' + r.pctWater.toFixed(1) + ')');
  if (r.pctCal != null) expect(r.pctCal > 95 && r.pctCal < 100, 'correct build / ' + food + ': 95 to 100% of Calories absorbed (got ' + r.pctCal.toFixed(1) + ')');
}

/* --- mistakes --- */
const check = (label, b, food, outcome, finding) => {
  const r = M.simulate(b, food);
  expect(r.outcome === outcome, label + ' / ' + food + ': outcome ' + outcome + ' (got ' + r.outcome + ', water ' + r.pctWater.toFixed(0) + '%)');
  expect(has(r, finding), label + ' / ' + food + ': reports "' + finding + '" (got ' + titles(r) + ')');
  return r;
};
check('no pancreas', example(['pancreas']), 'pizza', 'diarrhea', 'No pancreas');
check('pancreas on the stomach', example(['chief', 'parietal'], { pancreas: [4, 1] }), 'pizza', 'diarrhea', 'pancreas is not attached to the small intestine');
check('no liver', example(['liver']), 'cheese', 'diarrhea', 'gallbladder has no liver');
check('no bile at all', example(['liver', 'gallbladder']), 'cheese', 'diarrhea', 'No bile reached');
check('no lymphatics', example(['lymph']), 'cheese', 'diarrhea', 'No lymphatic vessels');
check('no capillaries', example(['capillaries']), 'apple', 'diarrhea', 'No capillaries on the small intestine');
check('no capillaries', example(['capillaries']), 'apple', 'diarrhea', 'No capillaries on the large intestine');
let r = check('no gallbladder', example(['gallbladder']), 'apple', 'solid-problems', 'No bile reached');
expect(r.findings.find(f => f.title.includes('No bile')).mattered === false, 'no bile / apple: flagged as not mattering for a fat-free food');
r = check('liver straight onto the intestine', example(['gallbladder'], { liver: [9, 1] }), 'cheese', 'solid-problems', 'No gallbladder');
expect(r.groups.fat < M.simulate(ex, 'cheese').groups.fat, 'liver without gallbladder: less fat absorbed than the correct build');
check('no salivary gland', example(['salivary']), 'bread', 'solid-problems', 'No salivary gland');
r = check('no parietal cells', example(['parietal']), 'chicken', 'solid-problems', 'Pepsin was not active');
expect(r.groups.protein < M.simulate(ex, 'chicken').groups.protein - 3, 'no acid: clearly less protein absorbed');
check('open tube', example([], { small: [8, 3] }), 'pizza', 'spill', 'The tube is open after the stomach');
check('open tube', example([], { small: [8, 3] }), 'pizza', 'spill', 'small intestine is not connected');

const noStomach = build([['mouth', 0, 1], ['esophagus', 2, 2], ['small', 4, 2], ['large', 8, 2], ['anus', 11, 2], ['salivary', 0, 0], ['pancreas', 4, 1], ['gallbladder', 6, 1], ['liver', 6, 0], ['capillaries', 4, 4], ['lymph', 5, 4], ['capillaries', 8, 4]]);
check('no stomach', noStomach, 'pizza', 'diarrhea', 'No stomach before the small intestine');
const noEsophagus = build([['mouth', 0, 1], ['stomach', 2, 2], ['small', 5, 2], ['large', 9, 2], ['anus', 12, 2], ['salivary', 0, 0], ['chief', 2, 1], ['parietal', 3, 1], ['pancreas', 5, 1], ['gallbladder', 7, 1], ['liver', 7, 0], ['capillaries', 5, 4], ['lymph', 6, 4], ['capillaries', 9, 4]]);
check('no esophagus', noEsophagus, 'pizza', 'solid-problems', 'No esophagus');
const colonFirst = build([['mouth', 0, 1], ['esophagus', 2, 2], ['stomach', 4, 2], ['large', 7, 2], ['small', 10, 2], ['anus', 14, 2], ['salivary', 0, 0], ['chief', 4, 1], ['parietal', 5, 1], ['pancreas', 10, 1], ['gallbladder', 12, 1], ['liver', 12, 0], ['capillaries', 10, 4], ['lymph', 11, 4], ['capillaries', 7, 4]]);
check('large intestine first', colonFirst, 'pizza', 'diarrhea', 'large intestine comes before the small intestine');
const noColon = build([['mouth', 0, 1], ['esophagus', 2, 2], ['stomach', 4, 2], ['small', 7, 2], ['anus', 11, 2], ['salivary', 0, 0], ['chief', 4, 1], ['parietal', 5, 1], ['pancreas', 7, 1], ['gallbladder', 9, 1], ['liver', 9, 0], ['capillaries', 7, 4], ['lymph', 8, 4]]);
check('no large intestine', noColon, 'pizza', 'diarrhea', 'No large intestine');
r = M.simulate(build([['mouth', 0, 1], ['capillaries', 2, 1]]), 'apple');
expect(r.outcome === 'spill' && r.findings.some(f => f.level === 'info' && f.title.includes('capillaries')), 'a mouth alone spills, and stray capillaries are listed as doing nothing');

if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('model: all ' + checks + ' checks passed');
