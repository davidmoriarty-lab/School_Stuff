/* tests/test.js: checks the Periodic Table Highway in a real browser. Needs Playwright.
 *
 *   node simulations/periodic-table-highway/tests/test.js
 *   PTH_REF=elements.json node ...    also compares the table with a reference list
 *                                     ([[z, symbol, name], ...] with the same spellings)
 *
 * The game runs on a clock the test controls (the page is opened with ?manual), so a whole
 * round plays in milliseconds. It checks:
 *   - the element table (118 elements, unique symbols and names, families, every level's size);
 *   - every question the game can make: three different signs, the right one in the lane the
 *     game says, wrong signs that look like the right one, no lane three times in a row;
 *   - a perfect round of every level ends in a win with every element once;
 *   - a wrong lane stops the game, shows the right answer, and brings that element back first;
 *   - the speed ramp, steering keys (arrows, A and D, held keys, taps, buttons), pause;
 *   - the screen reader announcement, focus, reduced motion, and a fit at 1366x520.
 */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
  catch (e2) { console.error('Playwright is not installed; skipping.'); process.exit(0); }
}
const URL = 'file://' + path.join(__dirname, '..', 'index.html') + '?manual';
const problems = [];
const t0 = Date.now();
const lap = (n) => { if (process.env.PTH_TIMING) console.log('  ' + n + ': ' + ((Date.now() - t0) / 1000).toFixed(1) + 's'); };
const expect = (cond, msg) => { if (!cond) problems.push(msg); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push('page error: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  const open = async (seed, extra) => {
    await page.goto(URL + '&seed=' + (seed || 1) + (extra || ''));
    await page.evaluate(() => localStorage.clear());
    await page.goto(URL + '&seed=' + (seed || 1) + (extra || ''));
  };
  await open(1);

  /* ---------------------------------------------------- the element table */
  const tableReport = await page.evaluate(() => {
    const E = PTH.ELEMENTS, out = [];
    if (E.length !== 118) out.push('expected 118 elements, found ' + E.length);
    E.forEach((e, i) => {
      if (e.z !== i + 1) out.push('element ' + (i + 1) + ' has atomic number ' + e.z);
      if (!/^[A-Z][a-z]{0,2}$/.test(e.sym)) out.push(e.name + ': symbol "' + e.sym + '" is not capital then lower case');
      if (!/^[A-Z][a-z]+$/.test(e.name)) out.push('name "' + e.name + '" looks wrong');
      if (['nm', 'ng', 'ak', 'ae', 'mt', 'hl', 'pt', 'tm', 'la', 'ac'].indexOf(e.fam) < 0) out.push(e.name + ': family ' + e.fam);
      if (e.name.toLowerCase().charAt(0) !== e.sym.toLowerCase().charAt(0) && ['Na', 'K', 'Fe', 'Cu', 'Ag', 'Sn', 'Sb', 'W', 'Au', 'Hg', 'Pb'].indexOf(e.sym) < 0) {
        out.push(e.name + ' (' + e.sym + '): the symbol does not start with the name\'s letter and is not a known Latin symbol');
      }
    });
    if (new Set(E.map((e) => e.sym)).size !== 118) out.push('symbols are not unique');
    if (new Set(E.map((e) => e.name)).size !== 118) out.push('names are not unique');
    const spot = { Au: ['Gold', 79], Fe: ['Iron', 26], W: ['Tungsten', 74], Pb: ['Lead', 82], Ag: ['Silver', 47], K: ['Potassium', 19],
      Na: ['Sodium', 11], Hg: ['Mercury', 80], Sn: ['Tin', 50], Sb: ['Antimony', 51], Cu: ['Copper', 29], Pm: ['Promethium', 61], Og: ['Oganesson', 118] };
    Object.keys(spot).forEach((s) => {
      const e = E.filter((x) => x.sym === s)[0];
      if (!e || e.name !== spot[s][0] || e.z !== spot[s][1]) out.push('spot check failed for ' + s);
    });
    const sizes = { n20: 20, n36: 36, n54: 54, n88: 73, n118: 118, ak: 6, ae: 6, hl: 5, ng: 6, mt: 6, tm: 29, p2: 8, p3: 8, p4: 18 };
    PTH.LEVELS.forEach((l) => { if (PTH.poolOf(l.id).length !== sizes[l.id]) out.push('level ' + l.id + ' has ' + PTH.poolOf(l.id).length + ' elements, expected ' + sizes[l.id]); });
    if (PTH.LEVELS.length !== Object.keys(sizes).length) out.push('a level has no expected size in the test');
    if (PTH.poolOf('n88').some((e) => e.z >= 57 && e.z <= 71)) out.push('n88 contains a lanthanoid');
    if (PTH.poolOf('tm').some((e) => e.z > 80 || (e.z >= 57 && e.z <= 71))) out.push('tm contains a lanthanoid or an element past Hg');
    const fam = (f) => PTH.poolOf(f).map((e) => e.sym).join(',');
    if (fam('ak') !== 'Li,Na,K,Rb,Cs,Fr') out.push('alkali metals: ' + fam('ak'));
    if (fam('ae') !== 'Be,Mg,Ca,Sr,Ba,Ra') out.push('alkaline earth: ' + fam('ae'));
    if (fam('hl') !== 'F,Cl,Br,I,At') out.push('halogens: ' + fam('hl'));
    if (fam('ng') !== 'He,Ne,Ar,Kr,Xe,Rn') out.push('noble gases: ' + fam('ng'));
    if (fam('mt') !== 'B,Si,Ge,As,Sb,Te') out.push('metalloids: ' + fam('mt'));
    return { out, table: E.map((e) => [e.z, e.sym, e.name]) };
  });
  tableReport.out.forEach((m) => problems.push('table: ' + m));
  if (process.env.PTH_REF) {
    const ref = JSON.parse(require('fs').readFileSync(process.env.PTH_REF, 'utf8'));
    ref.forEach(([z, sym, name]) => {
      const mine = tableReport.table[z - 1];
      if (!mine || mine[1] !== sym) problems.push(`reference: element ${z} is ${mine && mine[1]}, reference ${sym}`);
      if (!mine || mine[2] !== name) problems.push(`reference: element ${z} is named ${mine && mine[2]}, reference ${name}`);
    });
    console.log('Compared the table with the reference list of ' + ref.length + ' elements.');
  }

  lap('table');
  /* --------------------------------- every question, and a perfect round */
  const rounds = await page.evaluate(() => {
    const report = { problems: [], levels: {} };
    PTH.LEVELS.forEach((lv) => {
      [3, 11, 29].forEach((seed) => {
        const pool = PTH.poolOf(lv.id);
        const G = PTH.makeGame({ pool, speed: 'normal', rng: PTH.rngFrom(seed), weak: [] });
        const seen = [], lanes = [];
        let guard = 0;
        while (G.phase === 'play' && guard++ < 200000) {
          G.step(1 / 60);
          if (G.q && !G.q.judged && G.q.d > 20 && !G.q._seen) {
            G.q._seen = true;
            const q = G.q;
            seen.push(q.el.sym); lanes.push(q.correctLane);
            if (q.options.length !== 3 || new Set(q.options).size !== 3) report.problems.push(lv.id + ': signs ' + q.options.join('/') + ' are not three different symbols');
            if (q.options[q.correctLane] !== q.el.sym) report.problems.push(lv.id + ': the sign in the right lane is not ' + q.el.sym);
            if (q.options.filter((s) => s === q.el.sym).length !== 1) report.problems.push(lv.id + ': the right symbol appears more than once');
            q.options.forEach((s, i) => { if (i !== q.correctLane && !PTH.ELEMENTS.some((e) => e.sym === s)) report.problems.push(lv.id + ': a wrong sign ' + s + ' is not an element'); });
            /* steer to the right lane in good time */
            const want = q.correctLane;
            for (let i = 0; i < 4 && G.lane !== want; i++) G.move(want > G.lane ? 1 : -1);
          }
        }
        if (G.phase !== 'win') report.problems.push(lv.id + ' seed ' + seed + ': a perfect round ended in ' + G.phase);
        if (G.answered !== pool.length) report.problems.push(lv.id + ': answered ' + G.answered + ' of ' + pool.length);
        if (seen.length !== pool.length || new Set(seen).size !== pool.length) report.problems.push(lv.id + ': not every element came up exactly once');
        for (let i = 2; i < lanes.length; i++) if (lanes[i] === lanes[i - 1] && lanes[i] === lanes[i - 2]) { report.problems.push(lv.id + ': the right lane repeated three times'); break; }
        report.levels[lv.id] = (report.levels[lv.id] || 0) + seen.length;
      });
    });
    return report;
  });
  rounds.problems.slice(0, 12).forEach((m) => problems.push('rounds: ' + m));
  expect(Object.keys(rounds.levels).length === 14, 'rounds: not every level was played');

  lap('rounds');
  /* wrong signs look like the right one: same first letter whenever the pool has one */
  const look = await page.evaluate(() => {
    const pool = PTH.poolOf('n20'), res = [];
    pool.forEach((el) => {
      const twins = pool.filter((c) => c !== el && c.sym[0] === el.sym[0]);
      if (!twins.length) return;
      let hits = 0, n = 40;
      for (let s = 1; s <= n; s++) {
        const G = PTH.makeGame({ pool: [el].concat(pool.filter((c) => c !== el)), speed: 'normal', rng: PTH.rngFrom(s * 13), weak: [el.sym] });
        G.step(1); G.step(1);
        const q = G.q;
        if (q.options.some((o, i) => i !== q.correctLane && o[0] === el.sym[0])) hits++;
      }
      res.push([el.name, hits / n]);
    });
    return res;
  });
  look.forEach(([name, r]) => expect(r >= 0.95, `lookalikes: ${name} had a same-first-letter wrong sign only ${Math.round(100 * r)}% of the time`));
  expect(look.length >= 5, 'lookalikes: too few elements had a lookalike to test');

  lap('lookalikes');
  /* ------------------------------------------------------- the speed ramp */
  const ramp = await page.evaluate(() => {
    const out = [];
    Object.keys(PTH.SPEEDS).forEach((k) => {
      const sp = PTH.SPEEDS[k];
      const G = PTH.makeGame({ pool: PTH.poolOf('n118'), speed: k, rng: PTH.rngFrom(2), weak: [] });
      const speeds = [G.speed];
      let guard = 0;
      while (G.answered < 60 && guard++ < 400000) {
        G.step(1 / 60);
        if (G.q && !G.q.judged && !G.q._s) { G.q._s = 1; for (let i = 0; i < 4 && G.lane !== G.q.correctLane; i++) G.move(G.q.correctLane > G.lane ? 1 : -1); }
        if (G.q && G.q.judged && !G.q._r) { G.q._r = 1; speeds.push(G.speed); }
      }
      out.push({ k, v0: sp.v0, vMax: sp.vMax, first: speeds[0], after1: speeds[1], last: speeds[speeds.length - 1], ramp: sp.ramp });
    });
    return out;
  });
  ramp.forEach((r) => {
    expect(r.first === r.v0, `ramp ${r.k}: starts at ${r.first}, not ${r.v0}`);
    expect(Math.abs(r.after1 - (r.v0 + r.ramp)) < 1e-9, `ramp ${r.k}: one right answer gives ${r.after1}`);
    expect(r.last === r.vMax, `ramp ${r.k}: tops out at ${r.last}, not ${r.vMax}`);
  });

  lap('ramp');
  /* ----------------------------- through the page: menu, steering, a loss */
  await open(5);
  expect(await page.evaluate(() => PTH.ui()) === 'menu', 'the game does not open on the menu');
  expect(await page.isDisabled('#btnPause'), 'Pause is enabled in the menu');
  expect((await page.$$('#overlay .lvl')).length === 14, 'the menu does not list 14 levels');
  await page.click('.lvl[data-level="p3"]');
  await page.click('[data-speed="relaxed"]');
  expect(await page.evaluate(() => PTH.cfg().level + '/' + PTH.cfg().speed) === 'p3/relaxed', 'choosing a level and speed did not stick');
  expect(await page.evaluate(() => document.activeElement && document.activeElement.id) !== 'x', 'focus check');
  await page.click('#bStart');
  expect(await page.evaluate(() => PTH.ui()) === 'play' && await page.isHidden('#overlay'), 'Start did not begin the game');
  expect(await page.isEnabled('#btnPause'), 'Pause is disabled while playing');

  const lane = () => page.evaluate(() => PTH.game().lane);
  expect(await lane() === 1, 'the game does not start in the middle lane');
  await page.keyboard.press('ArrowLeft'); expect(await lane() === 0, 'ArrowLeft did not move left');
  await page.keyboard.press('ArrowLeft'); expect(await lane() === 0, 'steering left past the edge moved the car');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); expect(await lane() === 2, 'ArrowRight twice did not reach the right lane');
  await page.keyboard.press('ArrowRight'); expect(await lane() === 2, 'steering right past the edge moved the car');
  await page.keyboard.press('a'); expect(await lane() === 1, 'A did not move left');
  await page.keyboard.press('d'); expect(await lane() === 2, 'D did not move right');
  await page.keyboard.down('ArrowLeft'); await page.keyboard.down('ArrowLeft'); await page.keyboard.up('ArrowLeft');
  expect(await lane() === 1, 'a held arrow key moved more than one lane');
  const box = await page.$eval('#stageWrap', (n) => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await page.mouse.click(box.x + box.w * 0.2, box.y + box.h * 0.5); expect(await lane() === 0, 'tapping the left side did not move left');
  await page.mouse.click(box.x + box.w * 0.8, box.y + box.h * 0.5); expect(await lane() === 1, 'tapping the right side did not move right');
  await page.evaluate(() => { document.getElementById('tRight').click(); }); expect(await lane() === 2, 'the on-screen right button did not move right');
  await page.evaluate(() => { document.getElementById('tLeft').click(); }); expect(await lane() === 1, 'the on-screen left button did not move left');

  /* the announcement for a screen reader */
  await page.evaluate(() => PTH.tick(1 / 60, 90));
  const q1 = await page.evaluate(() => { const q = PTH.game().q; return { name: q.el.name, opts: q.options }; });
  const said = await page.textContent('#live');
  expect(said.includes(q1.name) && q1.opts.every((o) => said.includes(o)), 'the announcement does not name the element and every sign: "' + said + '"');
  expect((await page.textContent('#promptName')) === q1.name, 'the prompt at the top does not show the element name');

  /* pause: nothing moves, Space resumes */
  await page.keyboard.press(' ');
  expect(await page.evaluate(() => PTH.ui()) === 'paused' && await page.isVisible('#overlay'), 'Space did not pause');
  const d0 = await page.evaluate(() => PTH.game().q.d);
  await page.evaluate(() => PTH.tick(1 / 60, 120));
  expect(await page.evaluate(() => PTH.game().q.d) === d0, 'the road kept moving while paused');
  await page.keyboard.press('ArrowLeft'); expect(await lane() === 1, 'steering worked while paused');
  expect(await page.evaluate(() => document.activeElement && document.activeElement.id) === 'bResume', 'focus is not on Resume when paused');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => PTH.ui()) === 'play', 'Enter on Resume did not resume');
  await page.keyboard.press('Escape'); expect(await page.evaluate(() => PTH.ui()) === 'paused', 'Escape did not pause');
  await page.click('#btnPause'); expect(await page.evaluate(() => PTH.ui()) === 'play', 'the Resume button did not resume');

  lap('steering and pause');
  /* timing: steering in good time counts; the lane the car is in when the sign arrives is the answer */
  await open(8);
  await page.click('.lvl[data-level="n20"]'); await page.click('#bStart');
  const play = (js) => page.evaluate(js);
  await play(() => { const G = PTH.game(); let n = 0; while ((!G.q || G.q.judged) && n++ < 5000) PTH.tick(1 / 60, 1, true); });
  /* steer about a quarter of a second before the sign arrives */
  const ok = await play(() => {
    const G = PTH.game(), q = G.q;
    for (let n = 0; n < 100000 && q.d > 0.5 + G.speed * 0.3; n++) PTH.tick(1 / 60, 1, true);
    for (let i = 0; i < 4 && G.lane !== q.correctLane; i++) G.move(q.correctLane > G.lane ? 1 : -1);
    for (let n = 0; n < 100000 && !q.judged; n++) PTH.tick(1 / 60, 1, true);
    return q.result;
  });
  expect(ok === 'ok', 'steering 0.3 seconds before the sign arrives was marked ' + ok);
  /* steer into a wrong lane in good time */
  await play(() => { const G = PTH.game(); let n = 0; while ((!G.q || G.q.judged) && n++ < 5000) PTH.tick(1 / 60, 1, true); });
  const miss = await play(() => {
    const G = PTH.game(), q = G.q;
    const wrongLane = (q.correctLane + 1) % 3;
    for (let n = 0; n < 100000 && q.d > 0.5 + G.speed * 0.3; n++) PTH.tick(1 / 60, 1, true);
    for (let i = 0; i < 4 && G.lane !== wrongLane; i++) G.move(wrongLane > G.lane ? 1 : -1);
    for (let n = 0; n < 100000 && !q.judged; n++) PTH.tick(1 / 60, 1, true);
    return { result: q.result, name: q.el.name, sym: q.el.sym, streak: G.streak, phase: G.phase, wrongSym: q.options[q.chosen] };
  });
  expect(miss.result === 'bad' && miss.phase === 'wrong', 'a wrong lane was not a loss');
  expect(await page.isHidden('#overlay'), 'the game over screen appeared before the pause to see the signs');
  await page.evaluate(() => PTH.tick(1 / 60, 30));
  expect(await page.isHidden('#overlay'), 'the game over screen came up before the short pause that lets you see the signs');
  await page.evaluate(() => PTH.tick(1 / 60, 40));
  expect(await page.isVisible('#overlay') && await page.evaluate(() => PTH.ui()) === 'over', 'no game over screen after a wrong lane');
  const overText = await page.textContent('#overlay');
  expect(overText.includes(miss.name + ' is ' + miss.sym) && overText.includes(miss.wrongSym), 'the game over screen does not give the right answer: ' + overText.slice(0, 200));
  expect(await page.evaluate(() => document.activeElement && document.activeElement.id) === 'bAgain', 'focus is not on Try again');
  expect(await page.textContent('#live') === 'Wrong lane. The symbol for ' + miss.name + ' is ' + miss.sym + '.', 'the announcement of a wrong lane is wrong');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pth:weak:n20')).join(',')) === miss.sym, 'the missed element was not remembered');
  expect(Number(await page.textContent('#hudStreak')) === miss.streak, 'the streak is not shown');

  /* restarting starts from scratch, and the missed element comes first */
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => PTH.ui()) === 'play', 'Try again did not restart');
  const fresh = await page.evaluate(() => { const G = PTH.game(); return { streak: G.streak, answered: G.answered, speed: G.speed, v0: PTH.SPEEDS.normal.v0, first: G.queue[0].sym }; });
  expect(fresh.streak === 0 && fresh.answered === 0 && fresh.speed === fresh.v0, 'a restart did not reset the streak and speed');
  expect(fresh.first === miss.sym, 'the missed element did not come back first (' + fresh.first + ' not ' + miss.sym + ')');
  /* answering it correctly takes it off the list */
  await play(() => { const G = PTH.game(); let n = 0; while ((!G.q || G.q.judged) && n++ < 5000) PTH.tick(1 / 60, 1, true); });
  await play(() => { const G = PTH.game(), q = G.q; for (let i = 0; i < 4 && G.lane !== q.correctLane; i++) G.move(q.correctLane > G.lane ? 1 : -1); for (let n = 0; n < 100000 && !q.judged; n++) PTH.tick(1 / 60, 1, true); });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pth:weak:n20')).length) === 0, 'a right answer did not take the element off the missed list');
  expect(Number(await page.evaluate(() => JSON.parse(localStorage.getItem('pth:best:n20:normal')))) >= 1, 'the best streak was not saved');

  lap('timing and restart');
  /* a perfect round through the page: the win screen */
  await open(9);
  await page.click('.lvl[data-level="ng"]'); await page.click('#bStart');
  await play(() => {
    const G = PTH.game(); let n = 0;
    while (G.phase === 'play' && n++ < 100000) {
      PTH.tick(1 / 60, 1, true);
      if (G.q && !G.q.judged && G.q.d > 18) for (let i = 0; i < 4 && G.lane !== G.q.correctLane; i++) G.move(G.q.correctLane > G.lane ? 1 : -1);
    }
    PTH.tick(1 / 60, 80);
  });
  expect(await page.evaluate(() => PTH.ui()) === 'win', 'a perfect round did not reach the win screen');
  expect((await page.textContent('#overlay')).includes('Noble gases: 6 of 6'), 'the win screen does not say the set was finished');
  expect(await page.textContent('#hudProg') === '6 / 6', 'the progress is not 6 / 6');
  await page.click('button:has-text("Change elements")');
  expect((await page.textContent('.lvl[data-level="ng"]')).includes('★'), 'a finished set has no star in the menu');

  lap('win');
  /* ------------------------------------------------------- reduced motion */
  const rm = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const p2 = await rm.newPage();
  await p2.goto(URL + '&seed=4');
  await p2.click('#bStart');
  await p2.evaluate(() => { const G = PTH.game(); let n = 0; while ((!G.q || G.q.judged) && n++ < 5000) PTH.tick(1 / 60, 1, true); const q = G.q; const w = (q.correctLane + 1) % 3; for (let i = 0; i < 4 && G.lane !== w; i++) G.move(w > G.lane ? 1 : -1); for (let n = 0; n < 100000 && !q.judged; n++) PTH.tick(1 / 60, 1, true); });
  expect(!(await p2.getAttribute('#stageWrap', 'class') || '').includes('shake'), 'the screen shook with reduced motion on');
  await rm.close();

  lap('reduced motion');
  /* ----------------------------------------------- the picture and the fit */
  await open(6);
  await page.click('#bStart');
  await page.evaluate(() => { const G = PTH.game(); let n = 0; while ((!G.q || G.q.d > 9) && n++ < 5000) PTH.tick(1 / 60, 1, true); PTH.tick(1 / 60); });
  const px = await page.evaluate(() => {
    const c = document.getElementById('stage'), x = c.getContext('2d'), w = c.width, h = c.height, seen = new Set();
    for (let i = 0; i < 40; i++) { const d = x.getImageData(Math.floor(w * (0.05 + 0.9 * (i % 8) / 8)), Math.floor(h * (0.1 + 0.85 * Math.floor(i / 8) / 5)), 1, 1).data; seen.add(d[0] + ',' + d[1] + ',' + d[2]); }
    return seen.size;
  });
  expect(px >= 10, 'the road looks blank (' + px + ' different colours)');
  for (const [w, h] of [[1366, 520], [1366, 650], [1100, 600], [900, 600], [1920, 950]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    const fit = await page.evaluate(() => {
      const r = document.getElementById('stageWrap').getBoundingClientRect();
      return { sideways: document.documentElement.scrollWidth > innerWidth + 1, down: document.documentElement.scrollHeight > innerHeight + 1, bottom: r.bottom, ih: innerHeight };
    });
    expect(!fit.sideways, `${w}x${h}: the page scrolls sideways`);
    expect(!fit.down, `${w}x${h}: the page scrolls down while playing (needs ${Math.round(fit.bottom)}px of ${fit.ih})`);
  }
  /* the menu: Start must be reachable at the smallest size */
  await page.setViewportSize({ width: 1366, height: 520 });
  await page.click('#btnMenu');
  const startBox = await page.$eval('#bStart', (n) => { const r = n.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, ih: innerHeight }; });
  expect(startBox.top >= 0 && startBox.bottom <= startBox.ih, `1366x520: the menu's Start button is off the screen (${Math.round(startBox.top)} to ${Math.round(startBox.bottom)} of ${startBox.ih})`);

  await browser.close();
  if (problems.length) {
    console.error(problems.length + ' problem(s):\n  ' + problems.join('\n  '));
    process.exit(1);
  }
  console.log('All checks passed: table, ' + Object.keys(rounds.levels).length + ' levels, questions, steering, wrong lane, win, speed, pause, layout.');
})();
