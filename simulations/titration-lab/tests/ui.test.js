/* tests/ui.test.js: checks the Titration Lab in a real browser. Needs Playwright.
 *
 *   node simulations/titration-lab/tests/ui.test.js
 *   TL_FULL=1 node ...     also sweeps every substance, volume, option set, theme and four
 *                          screen sizes for overlapping labels
 *
 * The page is opened with ?manual so the test drives the clock. It checks:
 *   - the page loads from a file with no errors;
 *   - drops, measured additions, hold-to-pour, auto-titrate, undo and new flask;
 *   - the read-outs, the curve data, the particle counts and the math agree with the model;
 *   - indicator colour and the flash where the drop lands;
 *   - every substance at both levels, every show/hide box, enlarging a graph, help, theme;
 *   - the mystery sample: a careful titration is marked right, sloppy ones get useful feedback;
 *   - every step of the guided lesson;
 *   - NO TWO LABELS OVERLAP, none runs off its drawing, and no page text is cut off.
 */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
  catch (e2) { console.error('Playwright is not installed; skipping.'); process.exit(0); }
}
const URL = 'file://' + path.join(__dirname, '..', 'index.html') + '?manual';
const FULL = !!process.env.TL_FULL;
const problems = []; let checks = 0;
const expect = (c, m) => { checks++; if (!c) problems.push(m); };

function overlapScan(matrix) {
  const out = [], st = TL.st;
  const check = (tag) => {
    document.querySelectorAll('canvas').forEach(c => {
      if (!c.offsetParent || !c._texts) return;
      const T = c._texts;
      for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
        const a = T[i], q = T[j];
        if (a.str.startsWith('page: ') && q.str.startsWith('page: ')) continue;
        if (Math.min(a.x1, q.x1) - Math.max(a.x0, q.x0) > 2 && Math.min(a.y1, q.y1) - Math.max(a.y0, q.y0) > 2) out.push(c.id + ': "' + a.str + '" overlaps "' + q.str + '" [' + tag + ']');
      }
      for (const a of T) if (!a.str.startsWith('page: ') && (a.x0 < -1 || a.y0 < -1 || a.x1 > c.clientWidth + 1 || a.y1 > c.clientHeight + 1)) out.push(c.id + ': "' + a.str + '" runs off the drawing [' + tag + ']');
    });
  };
  for (const level of matrix.levels) for (const a of TL.C.ANALYTES) for (const set of matrix.sets) for (const ind of matrix.inds) {
    TL.api.setLevel(level, true);
    for (const k in set) st.opts[k] = set[k];
    st.indicator = ind; document.getElementById('indicator').value = ind;
    TL.api.setAnalyte(a.id, true); TL.api.applyOpts();
    const eq = st.eq;
    for (const v of [0, eq[0] * 0.2, eq[0] / 2, eq[0] - 0.05, eq[0], eq[0] + 0.05, eq[0] * 1.3, Math.min(49.9, eq[eq.length - 1] * 1.02), 49.95]) {
      if (v > 49.96) continue;
      TL.api.jump(Math.round(v * 20) / 20);
      for (let i = 0; i < 4; i++) TL.advance(0.05);
      TL.render();
      check([level, a.id, ind, Object.keys(set).filter(k => set[k]).join('+') || 'plain', st.vT.toFixed(2) + ' mL'].join(', '));
    }
  }
  return [...new Set(out)];
}
function domOverflow() {
  const out = [];
  if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push('page scrolls sideways');
  document.querySelectorAll('.btn, .seg button, .fact b, .slider output, .ro b, .chk, h2, .caption span').forEach(el => {
    if (!el.offsetParent) return;
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') out.push('cut off: "' + el.textContent.trim().slice(0, 30) + '"');
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth + 1 || r.left < -1) out.push('off screen: "' + el.textContent.trim().slice(0, 30) + '"');
  });
  const m = document.getElementById('math');
  if (m.offsetParent && m.scrollWidth > m.clientWidth + 1) out.push('the math card is wider than its box');
  const cap = document.getElementById('caption');
  if (cap.offsetParent && cap.scrollHeight > cap.clientHeight + 2) out.push('caption is cut off');
  return out;
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const open = async (w, h, extra) => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(URL + (extra || '')); await page.waitForTimeout(100);
    return page;
  };
  const inked = (page, id) => page.evaluate((cid) => { const c = document.getElementById(cid), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 20) n++; return n / (d.length / (4 * 97)); }, id);
  const run = (page, n) => page.evaluate((k) => { for (let i = 0; i < k; i++) TL.advance(0.033); return TL.st.vT; }, n || 30);

  let page = await open(1366, 768, '&theme=light');
  expect(await page.locator('#analyte option').count() >= 3, 'substance list filled in');
  for (const id of ['scene', 'cCurve', 'cBars']) expect(await inked(page, id) > 0.01, id + ' is drawn');
  expect(await page.locator('#outPH').textContent() === '1.00', '0.100 M HCl starts at pH 1.00');

  // one drop = 0.05 mL, and it lands a moment after it leaves the tip
  await page.click('#add1');
  expect(await page.evaluate(() => TL.st.vT) === 0 && await page.evaluate(() => TL.st.drops.length) === 1, 'a drop is falling, nothing added yet');
  expect(await run(page, 10) === 0.05, 'the drop adds 0.05 mL when it lands');
  await page.click('#add05'); expect(Math.abs(await run(page, 40) - 0.55) < 1e-9, '0.5 mL button');
  await page.click('#add1ml'); expect(Math.abs(await run(page, 40) - 1.55) < 1e-9, '1 mL button');
  await page.click('#add5'); expect(Math.abs(await run(page, 60) - 6.55) < 1e-9, '5 mL button');
  expect(await page.locator('#outVol').textContent() === '6.55 mL', 'volume read-out');
  const agree = await page.evaluate(() => { const m = TL.C.mixture(TL.st.exp, TL.st.vT); return Math.abs(m.pH - TL.st.mix.pH) < 1e-9 && TL.st.points.length === 132 && TL.st.points.every((p, i) => !i || p.v > TL.st.points[i - 1].v) && document.getElementById('outPH').textContent === m.pH.toFixed(2); });
  expect(agree, 'pH read-out and curve data match the model, one point per drop');
  await page.keyboard.press('z'); expect(Math.abs(await page.evaluate(() => TL.st.vT) - 1.55) < 1e-9, 'Z undoes the last addition');
  await page.click('#btnUndo'); await page.click('#btnUndo'); await page.click('#btnUndo');
  expect(await page.evaluate(() => TL.st.vT === 0 && TL.st.points.length === 1) && await page.locator('#btnUndo').isDisabled(), 'undo all the way back');
  await page.keyboard.press('d'); expect(await run(page, 10) === 0.05, 'D adds a drop');
  await page.keyboard.down('Space'); await run(page, 30); await page.keyboard.up('Space');
  const poured = await page.evaluate(() => TL.st.vT); await run(page, 10);
  expect(poured > 2 && poured < 3 && await page.evaluate(() => TL.st.vT) === poured, 'holding Space pours and letting go stops (' + poured + ' mL)');

  // particles: 20 H3O+ to start, removed one for one by OH-, Na+ arriving, Cl- untouched
  await page.click('#btnReset');
  const p0 = await page.evaluate(() => TL.st.flaskInfo.target);
  expect(p0.H3O === 20 && p0.Cl === 20 && p0.Na === 0 && p0.OH === 0, 'flask view starts with 20 H3O+ and 20 Cl- ' + JSON.stringify(p0));
  await page.evaluate(() => TL.api.jump(12.5)); await run(page, 40);
  const p1 = await page.evaluate(() => ({ t: TL.st.flaskInfo.target, shown: ['H3O', 'Na', 'Cl', 'OH'].map(k => TL.st.flaskCloud.count(k)) }));
  expect(p1.t.H3O === 10 && p1.t.Na === 10 && p1.t.Cl === 20 && p1.shown.join() === '10,10,20,0', 'half-way: 10 H3O+, 10 Na+, 20 Cl- on screen ' + JSON.stringify(p1));
  await page.evaluate(() => TL.api.jump(30)); await run(page, 40);
  const p2 = await page.evaluate(() => TL.st.flaskInfo.target);
  expect(p2.H3O === 0 && p2.OH === 4 && p2.Na === 24, 'after equivalence: excess OH- appears ' + JSON.stringify(p2));

  // indicator: colourless before, pink after, flash on the way
  await page.evaluate(() => TL.api.jump(24.8)); await run(page, 5);
  expect(await page.locator('#outColor').textContent() === 'colorless', 'colourless just before the endpoint');
  await page.click('#add1'); await run(page, 8);
  expect(await page.evaluate(() => !!TL.st.flash && TL.st.flash.dur > 1), 'near the endpoint the colour flashes where the drop lands, and lingers');
  for (let i = 0; i < 4; i++) { await page.click('#add1'); await run(page, 10); }
  expect(await page.evaluate(() => TL.st.mix.pH) > 9 && (await page.locator('#outColor').textContent()).includes('pink'), 'one drop past equivalence turns it pink');
  await page.evaluate(() => { const s = document.getElementById('indicator'); s.value = 'mor'; s.dispatchEvent(new Event('change')); });
  expect((await page.locator('#indHint').textContent()).includes('Good choice') || (await page.locator('#indHint').textContent()).includes('Poor choice'), 'indicator advice is given');

  // auto-titrate runs to the end of the axis and passes through pH 7 for strong/strong
  await page.click('#btnReset'); await page.keyboard.press('a');
  const auto = await page.evaluate(() => { let n = 0; while (TL.st.auto && n++ < 6000) TL.advance(0.033); const P = TL.st.points; return { v: TL.st.vT, n: P.length, near: P.filter(p => Math.abs(p.v - 25) < 0.026).map(p => p.pH), seconds: n * 0.033 }; });
  expect(Math.abs(auto.v - 40) < 0.06 && auto.near.some(p => Math.abs(p - 7) < 0.01), 'auto-titrate finishes and records the equivalence point ' + JSON.stringify(auto));
  expect(auto.seconds > 8 && auto.seconds < 90, 'auto-titrate takes a sensible time (' + auto.seconds.toFixed(0) + ' s)');

  // every substance, both levels: read-outs, graphs and math
  const subs = await page.evaluate(() => {
    const bad = [];
    for (const level of ['honors', 'ap']) for (const a of TL.C.ANALYTES) {
      TL.api.setLevel(level, true); TL.api.setAnalyte(a.id);
      for (const v of [0, TL.st.eq[0] / 2, TL.st.eq[0], TL.st.eq[0] + 5]) {
        TL.api.jump(v); try { for (let i = 0; i < 3; i++) TL.advance(0.05); } catch (e) { bad.push(a.id + ' threw ' + e.message); }
        const math = document.getElementById('math').textContent;
        if (math.length < 40 || /NaN|undefined/.test(math + document.getElementById('caption').textContent)) bad.push(a.id + ' math at ' + v);
        const sum = Object.values(TL.st.flaskInfo.target).reduce((x, y) => x + y, 0);
        if (!(sum >= 15 && sum <= 200)) bad.push(a.id + ' particle count ' + sum);
      }
    }
    TL.api.setLevel('ap', true); TL.api.setAnalyte('HAc'); TL.api.jump(12.5);
    return bad;
  });
  expect(subs.length === 0, 'substances with problems: ' + subs.join('; '));
  expect((await page.locator('#math').textContent()).includes('pKa') || (await page.locator('#subMath').textContent()).includes('Half'), 'acetic acid at 12.5 mL is the half-equivalence point');
  const half = await page.evaluate(() => { for (let i = 0; i < 40; i++) TL.advance(0.033); return [TL.st.flaskCloud.count('w1'), TL.st.flaskCloud.count('w0')]; });
  expect(half[0] === 10 && half[1] === 10, 'half-equivalence shows 10 HA and 10 A- ' + half);

  // show / hide boxes
  const opts = await page.evaluate(() => { const bad = []; document.querySelectorAll('[data-opt]').forEach(el => { const k = el.dataset.opt, v = TL.st.opts[k]; el.click(); if (TL.st.opts[k] === v) bad.push(k); try { TL.advance(0.03); } catch (e) { bad.push(k + ' threw ' + e.message); } el.click(); }); return bad; });
  expect(opts.length === 0, 'show/hide boxes that do nothing or break: ' + opts.join(', '));
  for (const [opt, sel] of [['gCurve', '.g-curve'], ['gBars', '.g-bars'], ['gMath', '.g-math']]) { const b = await page.locator(sel).isVisible(); await page.click('[data-opt=' + opt + ']'); expect(await page.locator(sel).isVisible() === !b, opt + ' shows / hides its card'); await page.click('[data-opt=' + opt + ']'); }
  await page.click('[data-opt=readPH]'); expect(!(await page.locator('#roPH').isVisible()), 'pH read-out can be hidden'); await page.click('[data-opt=readPH]');
  await page.click('.g-curve .expand'); expect(await page.evaluate(() => document.getElementById('cCurve').clientWidth > 900), 'the curve can be enlarged');
  await page.keyboard.press('Escape'); expect(!(await page.evaluate(() => document.querySelector('.g-curve').classList.contains('big'))), 'Esc closes it');
  await page.click('#btnHelp'); expect(await page.locator('#help').isVisible(), 'help opens'); await page.keyboard.press('Escape'); expect(!(await page.locator('#help').isVisible()), 'Esc closes help');
  await page.click('#btnTheme'); expect(await page.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'theme switches'); await page.evaluate(() => TL.render()); expect(await inked(page, 'scene') > 0.01, 'bench draws in the dark theme');
  await page.click('#levelSeg [data-level=honors]');
  expect(await page.evaluate(() => TL.st.level === 'honors' && TL.st.analyte === 'HAc' && !TL.st.opts.cBuffer), 'Honors keeps a core substance and hides AP items');
  // sliders
  await page.evaluate(() => { const s = document.getElementById('Ca'); s.value = 0.2; s.dispatchEvent(new Event('input')); });
  expect(await page.evaluate(() => Math.abs(TL.st.eq[0] - 50) < 1e-9 && TL.st.vT === 0), 'doubling the concentration doubles the equivalence volume and starts a new flask');
  // buret runs dry
  await page.evaluate(() => { TL.api.jump(49.9); }); await page.click('#add5'); await run(page, 60);
  expect(await page.evaluate(() => Math.abs(TL.st.vT - 50) < 1e-6) && await page.locator('#add1').isDisabled() && (await page.locator('#caption').textContent()).includes('empty'), 'the buret stops at 50.00 mL and says it is empty');
  await page.close();

  /* ---------- mystery sample ---------- */
  page = await open(1366, 768, '&theme=light');
  await page.click('#btnUnknown');
  const my = await page.evaluate(() => ({ Ca: TL.st.secretCa, start: TL.st.start, eq: TL.st.eq[0], out: document.getElementById('outCa').textContent, vol: document.getElementById('roVol').offsetParent !== null, lab: document.getElementById('labPanel').offsetParent !== null, text: document.getElementById('side').textContent + document.getElementById('math').textContent }));
  expect(my.out === '? M' && !my.vol && my.lab, 'mystery mode hides the concentration and the volume read-out, shows the lab report');
  expect(!my.text.includes(my.Ca.toFixed(4)) && !my.text.includes(my.eq.toFixed(2)), 'the answer is not printed anywhere');
  expect(my.eq + my.start < 49, 'the mystery sample can be titrated with one buret (' + my.eq.toFixed(1) + ' mL)');
  // a careless student: stops 3 mL past
  await page.evaluate((v) => TL.api.jump(v), Math.round((my.eq + 3) * 20) / 20);
  const fill = async (a, b, c) => { await page.fill('#labV0', String(a)); await page.fill('#labV1', String(b)); await page.fill('#labM', String(c)); await page.click('#btnCheck'); return page.locator('#labVerdict').textContent(); };
  const v1bad = +(my.start + Math.round((my.eq + 3) * 20) / 20).toFixed(2);
  let verdict = await fill(my.start, v1bad, (0.1 * (v1bad - my.start) / 25).toFixed(4));
  expect(verdict.includes('✘') && verdict.includes('past'), 'overshooting is caught: ' + verdict);
  verdict = await fill('', '', '');
  expect(verdict.includes('Fill in'), 'empty report is caught');
  // a careful student: stops on the first drop past equivalence
  const vEnd = (Math.floor(my.eq * 20 + 1e-9) + 1) / 20;
  await page.evaluate((v) => TL.api.jump(v), vEnd);
  expect((await page.locator('#outColor').textContent()).includes('pink') || await page.evaluate(() => TL.st.mix.pH > 8), 'first drop past equivalence shows the endpoint');
  verdict = await fill(my.start.toFixed(2), (my.start + vEnd).toFixed(2), (0.1 * vEnd / 25).toFixed(4));
  expect(verdict.includes('✔'), 'a careful titration is marked correct: ' + verdict);
  expect(await page.locator('#outCa').textContent() === my.Ca.toFixed(4) + ' M', 'the concentration is revealed after a correct answer');
  await page.click('#btnUnknown');
  expect(await page.evaluate(() => !TL.st.unknown && TL.st.start === 0) && !(await page.locator('#labPanel').isVisible()), 'leaving mystery mode restores the normal lab');
  await page.close();

  /* ---------- guided lesson ---------- */
  page = await open(1366, 768, '&theme=light');
  await page.click('#btnTour');
  const steps = await page.evaluate(() => TL.TOUR.length);
  for (let i = 0; i < steps; i++) {
    expect(await page.evaluate(() => { for (let k = 0; k < 20; k++) TL.advance(0.04); return document.getElementById('tourTitle').textContent.length > 3 && document.getElementById('tourText').textContent.length > 40; }), 'guided lesson step ' + (i + 1));
    const dom = await page.evaluate(domOverflow); expect(dom.length === 0, 'lesson step ' + (i + 1) + ' page text: ' + dom.join('; '));
    await page.click('#tourNext');
  }
  expect(!(await page.locator('#tour').isVisible()), 'guided lesson closes after the last step');
  await page.close();

  /* ---------- nothing overlaps, nothing is cut off ---------- */
  const sizes = FULL ? [[1366, 768], [1920, 1080], [1100, 700], [1280, 720]] : [[1366, 768], [1100, 700]];
  const everything = { zFlask: true, zBuret: true, zRead: true, water: true, gSlope: true, cPreview: true, cHalf: true, cBuffer: true, cEq: true, cInd: true, cSeven: true };
  const matrix = FULL ? { levels: ['honors', 'ap'], sets: [{}, everything, { zRead: true, readVol: false, meter: false }], inds: ['phth', 'mor', 'univ', 'none'] }
    : { levels: ['ap'], sets: [{}, everything], inds: ['phth', 'mor'] };
  for (const [w, h] of sizes) for (const theme of FULL ? ['light', 'dark'] : ['light']) {
    page = await open(w, h, '&theme=' + theme);
    const dom1 = await page.evaluate(domOverflow); expect(dom1.length === 0, w + '×' + h + ' page text: ' + dom1.join('; '));
    const found = await page.evaluate(overlapScan, matrix);
    expect(found.length === 0, w + '×' + h + ' ' + theme + ': ' + found.length + ' label problems, e.g. ' + found.slice(0, 8).join(' | '));
    const dom2 = await page.evaluate(domOverflow); expect(dom2.length === 0, w + '×' + h + ' page text after the sweep: ' + dom2.join('; '));
    await page.close();
  }
  expect(errors.length === 0, 'page errors: ' + [...new Set(errors)].join(' | '));
  await browser.close();
  if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
  console.log('ui: all ' + checks + ' checks passed' + (FULL ? ' (full sweep)' : ''));
})();
