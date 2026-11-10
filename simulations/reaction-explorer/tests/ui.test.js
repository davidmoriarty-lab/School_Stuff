/* tests/ui.test.js: checks the Reaction Explorer in a real browser. Needs Playwright.
 *
 *   node simulations/reaction-explorer/tests/ui.test.js
 *   RX_FULL=1 node ...     also sweeps every reaction, level, angle, energy and four screen sizes
 *                          for overlapping labels (about ten minutes)
 *
 * The page is opened with ?manual so the test drives the clock. It checks:
 *   - the page loads from a file with no errors, in both themes;
 *   - every reaction draws at every level, forwards and reversed, with and without a catalyst;
 *   - a collision with enough energy ends in "Effective collision", one without ends in "No reaction",
 *     and a wrong-end hit fails whatever the energy;
 *   - play, pause, pause-at-top, step, scrub, restart and the keyboard shortcuts;
 *   - every show/hide box, the level buttons, enlarging a graph, the help window;
 *   - the many-particle view: particles react, atoms are conserved, temperature and amounts respond;
 *   - every step of the guided lesson;
 *   - NO TWO LABELS OVERLAP and none runs off its graph, and nothing on the page is cut off.
 */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
  catch (e2) { console.error('Playwright is not installed; skipping.'); process.exit(0); }
}
const URL = 'file://' + path.join(__dirname, '..', 'index.html') + '?manual';
const FULL = !!process.env.RX_FULL;
const problems = []; let checks = 0;
const expect = (cond, msg) => { checks++; if (!cond) problems.push(msg); };

/* Runs in the page: every pair of labels on every visible canvas that overlap, and labels off their canvas. */
function overlapScan(matrix) {
  const out = [];
  const check = (tag) => {
    document.querySelectorAll('canvas').forEach(c => {
      if (!c.offsetParent || !c._texts) return;
      const T = c._texts;
      for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
        const a = T[i], q = T[j];
        if (Math.min(a.x1, q.x1) - Math.max(a.x0, q.x0) > 2 && Math.min(a.y1, q.y1) - Math.max(a.y0, q.y0) > 2) out.push(c.id + ': "' + a.str + '" overlaps "' + q.str + '" [' + tag + ']');
      }
      for (const a of T) if (!a.str.startsWith('page: ') && (a.x0 < -1 || a.y0 < -1 || a.x1 > c.clientWidth + 1 || a.y1 > c.clientHeight + 1)) out.push(c.id + ': "' + a.str + '" runs off the graph [' + tag + ']');
    });
  };
  const st = RX.st;
  RX.api.setTab('collision');
  for (const level of matrix.levels) for (const rx of RX.CD.REACTIONS) for (const rev of matrix.rev) for (const cat of matrix.cat) {
    RX.api.setLevel(level, true);
    if (level === 'ap') Object.assign(st.opts, { velocity: true, bondOrder: true, electrons: true, arrows: true });   // everything on at once
    RX.api.applyOpts();
    st.rxId = rx.id; st.reverse = rev; st.catalyst = cat; st.angle = 0;
    RX.api.rebuildSystem(false);
    for (const ang of matrix.angles) for (const ef of matrix.energies) {
      st.angle = ang; RX.api.rebuildRun();
      st.energy = Math.min(+document.getElementById('energy').max, Math.round((isFinite(st.path.barrier) ? Math.min(st.path.barrier, 400) : st.sys.Ea) * ef + 2));
      RX.api.rebuildRun();
      const n = st.run.frames.length - 1;
      for (const fr of [0, Math.round(n * 0.25), st.run.iTop - 6, st.run.iTop, st.run.iTop + 6, Math.round(n * 0.75), n]) {
        st.frame = Math.max(0, Math.min(n, fr)); RX.render(); RX.render();
        check([level, rx.id, rev ? 'reversed' : '', cat ? 'catalyst' : '', ang + '°', st.energy + ' kJ/mol', 'frame ' + st.frame].filter(Boolean).join(', '));
      }
    }
  }
  RX.api.setTab('chamber');
  for (const rx of RX.CD.REACTIONS) for (const cat of matrix.cat) {
    RX.api.setLevel('ap', true); st.rxId = rx.id; st.reverse = false; st.catalyst = cat; RX.api.rebuildSystem(false);
    st.chRunning = true;
    for (const T of [null, 300, 3000]) for (const mode of ['k', 'ln']) {
      if (T) st.chamber.setTemperature(T);
      st.mb.arrMode = mode; st.mb.pin = T ? 800 : null;
      for (let i = 0; i < 60; i++) RX.advance(0.033);
      check(['many particles', rx.id, cat ? 'catalyst' : '', T ? T + ' K' : 'default T', mode].filter(Boolean).join(', '));
    }
  }
  st.chRunning = false; st.catalyst = false;
  return [...new Set(out)];
}

/* Runs in the page: page text that is cut off or spills out of its box. */
function domOverflow() {
  const out = [];
  if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push('page scrolls sideways');
  document.querySelectorAll('.btn, .chips button, .seg button, .tabs button, .fact b, .slider output, .tag, .clock, .eq, .chk, .legend span, .funnel b, h2').forEach(el => {
    if (!el.offsetParent) return;
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') out.push('cut off: "' + el.textContent.trim().slice(0, 30) + '"');
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth + 1 || r.left < -1) out.push('off screen: "' + el.textContent.trim().slice(0, 30) + '"');
  });
  // the equation and the clock share the top of the stage: they must not meet
  document.querySelectorAll('.stage-card').forEach(card => {
    if (!card.offsetParent) return;
    const a = card.querySelector('.hud-tl').getBoundingClientRect(), b = card.querySelector('.hud-tr').getBoundingClientRect();
    if (a.right > b.left - 4 && a.bottom > b.top && b.bottom > a.top) out.push('stage heading meets the clock');
    const ban = card.querySelector('.banner');
    if (ban && !ban.hidden) for (const t of card.querySelectorAll('.tag, .eq, .clock, .clock-sub')) { const r = t.getBoundingClientRect(), q = ban.getBoundingClientRect(); if (Math.min(r.right, q.right) - Math.max(r.left, q.left) > 2 && Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top) > 2) out.push('result banner covers "' + t.textContent.slice(0, 20) + '"'); }
  });
  return out;
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const open = async (w, h, extra) => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(URL + (extra || ''));
    await page.waitForTimeout(100);
    return page;
  };
  const inked = (page, id) => page.evaluate((cid) => {       // share of a canvas that has something drawn on it
    const c = document.getElementById(cid), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 20) n++;
    return n / (d.length / (4 * 97));
  }, id);

  /* ---------- one collision ---------- */
  let page = await open(1366, 768, '&theme=light');
  expect(await page.title() !== '', 'page has a title');
  expect(await page.evaluate(() => RX.CD.REACTIONS.length) === 10, 'ten reactions');
  expect(await page.locator('#rxSelect option').count() === 10, 'reaction list filled in');
  expect(await inked(page, 'stage') > 0.02, 'stage is drawn');
  expect(await inked(page, 'cProfile') > 0.02, 'energy diagram is drawn');

  // every reaction at every level, forwards / reversed / catalysed
  const drawn = await page.evaluate(() => {
    const bad = [];
    for (const level of ['honors', 'ap', 'organic']) for (const rx of RX.CD.REACTIONS) for (const [rev, cat] of [[false, false], [true, false], [false, true]]) {
      RX.api.setLevel(level, true); RX.st.rxId = rx.id; RX.st.reverse = rev; RX.st.catalyst = cat; RX.api.rebuildSystem(false);
      RX.st.frame = RX.st.run.iTop; RX.render();
      const c = document.getElementById('stage'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 3; i < d.length; i += 4 * 53) if (d[i] > 20) n++;
      if (n < 200 || !RX.st.info || !isFinite(RX.st.info.fr.V)) bad.push([level, rx.id, rev, cat].join(' '));
      const eq = document.getElementById('hudEq').textContent;
      if (!eq.includes('→')) bad.push('no equation for ' + rx.id);
    }
    RX.st.reverse = false; RX.st.catalyst = false; RX.api.setLevel('honors', true); RX.api.setReaction('Cl_H2');
    return bad;
  });
  expect(drawn.length === 0, 'reactions that failed to draw: ' + drawn.join('; '));

  const runToEnd = () => page.evaluate(() => { RX.st.playing = true; for (let i = 0; i < 4000 && !RX.st.ended; i++) RX.advance(0.05); return { ended: RX.st.ended, banner: document.getElementById('banner').textContent, hidden: document.getElementById('banner').hidden, reacted: RX.st.run.reacted }; });
  const setE = (v) => page.evaluate((x) => { const e = document.getElementById('energy'); e.value = x; e.dispatchEvent(new Event('input')); return RX.st.energy; }, v);
  const setA = (v) => page.evaluate((x) => { const e = document.getElementById('angle'); e.value = x; e.dispatchEvent(new Event('input')); return RX.st.angle; }, v);

  await setE(40);
  let r = await runToEnd();
  expect(r.ended && r.reacted && r.banner.includes('Effective collision') && !r.hidden, 'Cl + H₂ at 40 kJ/mol reacts and says so (' + r.banner + ')');
  expect(await page.locator('#btnPlay').textContent() === '↺ Replay', 'play button offers a replay at the end');
  await setE(12);
  r = await runToEnd();
  expect(r.ended && !r.reacted && r.banner.includes('not enough energy'), 'Cl + H₂ at 12 kJ/mol bounces (' + r.banner + ')');
  await setE(60); await setA(180);
  r = await runToEnd();
  expect(r.reacted, 'H–H hit from the other end reacts (both ends are the same)');
  await page.evaluate(() => RX.api.setReaction('Cl_CH4'));
  await setE(200); await setA(180);
  r = await runToEnd();
  expect(!r.reacted && r.banner.includes('wrong end'), 'Cl hitting the carbon end of CH₄ does not react (' + r.banner + ')');
  await setA(90); await setE(40);
  r = await runToEnd();
  expect(!r.reacted && r.banner.includes('orientation'), 'side-on with 40 kJ/mol fails on orientation (' + r.banner + ')');
  await setA(0);

  // chips
  await page.click('#energyChips button:nth-child(1)');
  expect(!(await runToEnd()).reacted, '"Too little" fails');
  await page.click('#energyChips button:nth-child(2)');
  expect((await runToEnd()).reacted, '"Just enough" reacts');
  await page.click('#energyChips button:nth-child(3)');
  expect((await runToEnd()).reacted, '"Plenty" reacts');
  await page.click('#angleChips button:nth-child(4)');
  expect(await page.evaluate(() => RX.st.angle) === 180, '"Wrong end" sets 180°');
  await page.click('#angleChips button:nth-child(1)');

  // transport
  await page.click('#btnRestart');
  expect(await page.evaluate(() => RX.st.frame) === 0, 'restart goes to the start');
  await page.click('#btnPlay');
  expect(await page.evaluate(() => RX.st.playing), 'Launch starts playing');
  await page.evaluate(() => { for (let i = 0; i < 10; i++) RX.advance(0.05); });
  const f1 = await page.evaluate(() => RX.st.frame);
  expect(f1 > 0, 'time moves forward while playing');
  await page.keyboard.press('Space');
  expect(!(await page.evaluate(() => RX.st.playing)), 'Space pauses');
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => RX.st.frame) === Math.round(f1) + 4, 'right arrow steps forward');
  await page.keyboard.press('ArrowLeft');
  expect(await page.evaluate(() => RX.st.frame) === Math.round(f1), 'left arrow steps back');
  await page.keyboard.press('t');
  expect(await page.evaluate(() => RX.st.frame === RX.st.run.iTop), 'T jumps to the top of the hill');
  expect(await page.evaluate(() => { RX.render(); return RX.st.phase; }) === 'ts', 'the top of the hill is the transition state');
  expect((await page.locator('#caption').textContent()).includes('Transition state'), 'caption explains the transition state');
  await page.keyboard.press('r');
  expect(await page.evaluate(() => RX.st.frame) === 0, 'R restarts');
  await page.evaluate(() => { const s = document.getElementById('scrub'); s.value = 50; s.dispatchEvent(new Event('input')); });
  expect(await page.evaluate(() => RX.st.frame) === 50, 'scrubbing moves the animation');
  await page.evaluate(() => { RX.st.frame = 0; document.querySelector('[data-opt=pauseTS]').click(); RX.st.playing = true; for (let i = 0; i < 2000 && RX.st.playing; i++) RX.advance(0.03); });
  expect(await page.evaluate(() => RX.st.frame === RX.st.run.iTop && !RX.st.ended), '"Pause at top" stops at the transition state');
  await page.evaluate(() => document.querySelector('[data-opt=pauseTS]').click());

  // energy is conserved on screen: bars add up to the total in every frame
  const cons = await page.evaluate(() => { let worst = 0; for (const f of RX.st.run.frames) worst = Math.max(worst, Math.abs(f.V + f.KE + f.Evib - RX.st.run.Ecoll)); return worst; });
  expect(cons < 2, 'PE + KE stays equal to the collision energy (worst ' + cons.toFixed(2) + ')');

  // show / hide
  for (const [opt, card] of [['gProfile', '.g-profile'], ['gBars', '.g-bars'], ['gMorse', '.g-morse'], ['gPES', '.g-pes']]) {
    const before = await page.locator(card).isVisible();
    await page.click('[data-opt=' + opt + ']');
    expect(await page.locator(card).isVisible() === !before, opt + ' box shows / hides its graph');
    await page.click('[data-opt=' + opt + ']');
  }
  const optsOk = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll('[data-for=collision] [data-opt]').forEach(el => { const k = el.dataset.opt, v = RX.st.opts[k]; el.click(); if (RX.st.opts[k] === v) bad.push(k); try { RX.render(); } catch (e) { bad.push(k + ' threw ' + e.message); } el.click(); });
    return bad;
  });
  expect(optsOk.length === 0, 'show/hide boxes that do nothing or break: ' + optsOk.join(', '));
  for (const lv of ['ap', 'organic', 'honors']) {
    await page.click('#levelSeg [data-level=' + lv + ']');
    expect(await page.evaluate((l) => RX.st.level === l && document.querySelector('#levelSeg [data-level=' + l + ']').getAttribute('aria-pressed') === 'true', lv), lv + ' level button');
  }
  expect(await page.evaluate(() => RX.st.rxId) === 'F_H2', 'leaving Organic goes back to a general reaction');

  // reverse and catalyst
  await page.evaluate(() => RX.api.setReaction('F_H2'));
  const fwd = await page.evaluate(() => ({ Ea: RX.st.sys.Ea, dH: RX.st.sys.dH }));
  await page.click('#btnReverse');
  const rv = await page.evaluate(() => ({ Ea: RX.st.sys.Ea, dH: RX.st.sys.dH, eq: document.getElementById('hudEq').textContent }));
  expect(Math.abs(rv.dH + fwd.dH) < 1e-6 && Math.abs(rv.Ea - (fwd.Ea - fwd.dH)) < 2 && rv.eq.startsWith('H + HF'), 'reverse flips ΔH and uses Ea(reverse): ' + JSON.stringify(rv));
  await page.click('#btnReverse');
  await page.click('#optCatalyst');
  const ct = await page.evaluate(() => ({ Ea: RX.st.sys.Ea, dH: RX.st.sys.dH, tags: document.getElementById('hudTags').textContent }));
  expect(ct.Ea < fwd.Ea && ct.dH === fwd.dH && ct.tags.includes('catalyst'), 'catalyst lowers Ea, keeps ΔH: ' + JSON.stringify(ct));
  await page.click('#optCatalyst');

  // enlarge, help, theme, side panel
  await page.click('.g-profile .expand');
  expect(await page.evaluate(() => document.querySelector('.g-profile').classList.contains('big') && document.getElementById('cProfile').clientWidth > 900), 'a graph can be enlarged');
  await page.keyboard.press('Escape');
  expect(!(await page.evaluate(() => document.querySelector('.g-profile').classList.contains('big'))), 'Esc closes the enlarged graph');
  await page.click('#btnHelp');
  expect(await page.locator('#help').isVisible(), 'help opens');
  await page.keyboard.press('Escape');
  expect(!(await page.locator('#help').isVisible()), 'Esc closes help');
  await page.click('#btnTheme');
  expect(await page.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'theme switches');
  await page.evaluate(() => RX.render());
  expect(await inked(page, 'stage') > 0.02, 'stage draws in the dark theme');
  await page.keyboard.press('h');
  expect(!(await page.locator('#side').isVisible()), 'H hides the control panel');
  await page.keyboard.press('h');

  /* ---------- many particles ---------- */
  await page.click('#levelSeg [data-level=ap]');            // AP shows every graph in this view
  await page.keyboard.press('2');
  expect(await page.locator('#view-chamber').isVisible() && !(await page.locator('#view-collision').isVisible()), '2 switches to the many-particle view');
  expect(await page.locator('#temp').isVisible() && !(await page.locator('#energy').isVisible()), 'side panel swaps to the many-particle controls');
  await page.evaluate(() => RX.api.setReaction('F_H2'));
  await page.click('#btnChamberPlay');
  const ch = await page.evaluate(() => { for (let i = 0; i < 1500; i++) RX.advance(0.033); const c = RX.st.chamber; return { counts: c.counts(), stats: c.stats, T: c.tempAvg, target: c.targetT, hist: c.history.length, legend: document.getElementById('chLegend').textContent }; });
  expect(ch.stats.eff > 3 && ch.counts.AB > 0, 'F + H₂ reacts in the box (' + ch.stats.eff + ' effective collisions)');
  expect(ch.counts.A + ch.counts.AB === 30 && ch.counts.BC + ch.counts.AB === 30, 'atoms are conserved in the box');
  expect(ch.stats.eff <= ch.stats.energy && ch.stats.energy <= ch.stats.coll, 'tally: effective ≤ enough energy ≤ all collisions');
  expect(Math.abs(ch.T - ch.target) < ch.target * 0.12, 'thermostat holds the temperature (' + ch.T.toFixed(0) + ' vs ' + ch.target + ')');
  expect(ch.hist > 50 && ch.legend.includes('HF'), 'history and legend fill in');
  for (const id of ['chamber', 'cMB', 'cConc', 'cArr']) expect(await inked(page, id) > 0.01, id + ' is drawn');
  await page.evaluate(() => { const t = document.getElementById('temp'); t.value = 1500; t.dispatchEvent(new Event('input')); for (let i = 0; i < 60; i++) RX.advance(0.033); });
  expect(await page.evaluate(() => Math.abs(RX.st.chamber.tempAvg - 1500) < 200), 'temperature slider heats the gas');
  await page.evaluate(() => { const t = document.getElementById('nA'); t.value = 50; t.dispatchEvent(new Event('input')); });
  expect(await page.evaluate(() => RX.st.chamber.counts().A + RX.st.chamber.counts().AB) === 50 || await page.evaluate(() => RX.st.chamber.counts().A) === 50, 'amount slider adds particles');
  await page.click('#btnPin'); await page.click('#btnArrMode');
  expect(await page.evaluate(() => { RX.render(); return RX.st.mb.pin > 0 && RX.st.mb.arrMode === 'ln'; }), 'pin and Arrhenius mode buttons');
  await page.click('#btnChamberReset');
  expect(await page.evaluate(() => RX.st.chamber.counts().AB === 0 && RX.st.chamber.stats.coll === 0), 'reset clears the box');
  // insulated exothermic box heats up
  await page.evaluate(() => { document.querySelector('[data-opt=thermostat]').click(); RX.st.chamber.reset(30, 30, 600); RX.st.chRunning = true; for (let i = 0; i < 1500; i++) RX.advance(0.033); });
  expect(await page.evaluate(() => RX.st.chamber.tempAvg) > 700, 'an insulated exothermic reaction heats itself');
  await page.evaluate(() => document.querySelector('[data-opt=thermostat]').click());
  await page.click('#btnZoomLast');
  expect(await page.evaluate(() => RX.st.tab === 'collision' && RX.st.playing), '"Watch the last collision" opens the slow-motion view');
  await page.close();

  /* ---------- guided lesson ---------- */
  page = await open(1366, 768, '&theme=light');
  await page.click('#btnTour');
  const steps = await page.evaluate(() => RX.TOUR.length);
  for (let i = 0; i < steps; i++) {
    const ok = await page.evaluate(() => { for (let k = 0; k < 40; k++) RX.advance(0.04); return document.getElementById('tourTitle').textContent.length > 3 && document.getElementById('tourText').textContent.length > 40; });
    expect(ok, 'guided lesson step ' + (i + 1));
    await page.click('#tourNext');
  }
  expect(!(await page.locator('#tour').isVisible()), 'guided lesson closes after the last step');
  await page.close();

  /* ---------- nothing overlaps, nothing is cut off ---------- */
  const sizes = FULL ? [[1366, 768], [1920, 1080], [1100, 700], [1280, 720]] : [[1366, 768], [1100, 700]];
  const matrix = FULL ? { levels: ['honors', 'ap', 'organic'], rev: [false, true], cat: [false, true], angles: [0, 60, 180], energies: [0.6, 1.3, 2.4] }
    : { levels: ['ap', 'organic'], rev: [false, true], cat: [false], angles: [0, 60], energies: [0.6, 1.3] };
  for (const [w, h] of sizes) for (const theme of FULL ? ['light', 'dark'] : ['light']) {
    page = await open(w, h, '&theme=' + theme);
    const dom1 = await page.evaluate(domOverflow);
    expect(dom1.length === 0, w + '×' + h + ' page text: ' + dom1.join('; '));
    await page.evaluate(() => { RX.st.playing = true; for (let i = 0; i < 4000 && !RX.st.ended; i++) RX.advance(0.05); });
    const dom2 = await page.evaluate(domOverflow);
    expect(dom2.length === 0, w + '×' + h + ' page text with the result banner: ' + dom2.join('; '));
    const found = await page.evaluate(overlapScan, matrix);
    expect(found.length === 0, w + '×' + h + ' ' + theme + ': ' + found.length + ' label problems, e.g. ' + found.slice(0, 6).join(' | '));
    const dom3 = await page.evaluate(domOverflow);
    expect(dom3.length === 0, w + '×' + h + ' many-particle page text: ' + dom3.join('; '));
    await page.close();
  }

  expect(errors.length === 0, 'page errors: ' + [...new Set(errors)].join(' | '));
  await browser.close();
  if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
  console.log('ui: all ' + checks + ' checks passed' + (FULL ? ' (full sweep)' : ''));
})();
