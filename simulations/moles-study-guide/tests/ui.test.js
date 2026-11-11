/* tests/ui.test.js: drives the Moles Study Guide in a real browser. Needs Playwright.
 *
 *   node simulations/moles-study-guide/tests/ui.test.js
 *
 * It does what a student does: opens every page, steps through every worked example, types right and wrong
 * answers into practice problems, uses the hints, takes the checkup and quizzes, uses every
 * widget, searches, switches theme and text size, and uses a phone-sized screen.
 * It also checks that nothing on any page shows NaN / undefined, nothing runs off the screen sideways,
 * and no unit-cancel pair is left half-struck.
 */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); } catch (e2) { console.error('Playwright is not installed; skipping.'); process.exit(0); } }
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
const problems = []; let checks = 0;
const expect = (c, m) => { checks++; if (!c) problems.push(m); };
const TOPICS = ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7'];

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const open = async (hash, w, h, opts) => {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: w || 1366, height: h || 900 }, reducedMotion: 'reduce' }, opts || {}));
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(hash + ': ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(hash + ': ' + m.text()); });
    await page.goto(URL + (hash || '')); await page.waitForTimeout(120);
    return page;
  };
  const text = (page) => page.evaluate(() => document.getElementById('page').innerText);
  const badText = (t) => /(?<![A-Za-z])NaN(?![A-Za-z])|undefined|\[object|Infinity/.test(t);   // NaN as a word (NaNO3 is sodium nitrate)
  const overflowX = (page) => page.evaluate(() => {
    const bad = [], W = innerWidth;
    document.querySelectorAll('#page *').forEach((el) => {
      if (el.closest('.st-main, .diagram, .tablewrap, .t-sub, .pills, .chain, svg, .ladder, .mmap, .modal')) return;
      const r = el.getBoundingClientRect(); if (r.width && r.right > W + 2) bad.push(el.className + ' ' + (el.textContent || '').slice(0, 30));
    });
    return { page: document.documentElement.scrollWidth > W + 1, bad: bad.slice(0, 5) };
  });

  /* ---------- every page loads, reads cleanly, fits the screen ---------- */
  for (const [w, h] of [[1366, 800], [1024, 768], [390, 844]]) {
    for (const r of ['#/', '#/map', '#/practice', '#/cheat'].concat(TOPICS.map((t) => '#/t/' + t))) {
      const page = await open(r, w, h);
      const t = await text(page); expect(t.length > 200 && !badText(t), w + ' ' + r + ': page has content and no NaN/undefined');
      const o = await overflowX(page); expect(!o.page && o.bad.length === 0, w + ' ' + r + ': nothing runs off the screen sideways ' + JSON.stringify(o.bad));
      await page.context().close();
    }
  }

  /* ---------- navigation ---------- */
  let page = await open('#/', 1366, 900);
  expect((await page.locator('#nav a').count()) === 11, 'the menu has 11 links (no sample test, no calculators)');
  expect((await page.locator('#nav a[href="#/test"], #nav a[href="#/tools"]').count()) === 0, 'the sample test and calculators are gone from the menu');
  for (const t of TOPICS) {
    await page.click('#nav a[data-id="' + t + '"]'); await page.waitForTimeout(60);
    expect(await page.evaluate(() => location.hash) === '#/t/' + t && await page.locator('#nav a[aria-current=page]').getAttribute('data-id') === t && (await page.locator('.t-head h1').count()) === 1, 'menu opens topic ' + t);
    expect((await page.locator('.t-sub a').count()) === 6 && (await page.locator('.sec').count()) === 6, t + ' has six sections and a sub-nav');
  }
  await page.click('.t-sub a[data-s=practice]'); await page.waitForTimeout(80);
  expect((await page.evaluate(() => location.hash)).endsWith('/practice') && await page.evaluate(() => document.getElementById('s-practice').getBoundingClientRect().top < 400), 'sub-nav jumps to a section');
  await page.click('#nav a[data-id="5.5"]'); await page.waitForTimeout(60);
  await page.keyboard.press(']'); await page.waitForTimeout(60); expect(await page.evaluate(() => location.hash) === '#/t/5.6', '] moves to the next topic');
  await page.keyboard.press('['); await page.waitForTimeout(60); expect(await page.evaluate(() => location.hash) === '#/t/5.5', '[ moves to the previous topic');
  await page.click('.t-foot a.next'); await page.waitForTimeout(60); expect(await page.evaluate(() => location.hash) === '#/t/5.6', 'the Next button at the bottom works');
  await page.click('#nav a[data-id="5.7"]'); await page.waitForTimeout(60);
  expect((await page.locator('.t-foot a.next').getAttribute('href')) === '#/practice', 'the last topic leads to Practice');
  // search
  await page.keyboard.press('/'); expect(await page.evaluate(() => document.activeElement.id) === 'search', '/ focuses the search box');
  await page.keyboard.type('parenth'); await page.waitForTimeout(80);
  expect((await page.locator('#searchResults a').count()) > 0 && (await page.locator('#searchResults a').first().textContent()).includes('5.2'), 'search finds parentheses in 5.2');
  await page.keyboard.press('Enter'); await page.waitForTimeout(80); expect((await page.evaluate(() => location.hash)).startsWith('#/t/5.2'), 'Enter opens the first search result');
  await page.fill('#search', 'zzzzqq'); await page.waitForTimeout(60); expect((await page.locator('#searchResults .none').count()) === 1, 'a search with no match says so');
  await page.fill('#search', ''); await page.keyboard.press('Escape');
  // settings
  await page.click('#btnTheme'); expect(await page.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'theme switches to dark');
  const fs0 = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize); await page.click('#btnSize'); const fs1 = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize); expect(parseFloat(fs1) > parseFloat(fs0), 'text size grows (' + fs0 + ' → ' + fs1 + ')');
  await page.click('#btnLegend'); expect(await page.locator('#legend').isVisible(), 'the color key opens'); await page.check('#optLabels'); expect(await page.evaluate(() => document.body.classList.contains('rolelabels')), 'role labels switch on'); await page.keyboard.press('Escape'); expect(!(await page.locator('#legend').isVisible()), 'Esc closes the color key');
  await page.reload(); await page.waitForTimeout(100); expect(await page.evaluate(() => document.documentElement.dataset.theme) === 'dark' && await page.evaluate(() => document.body.classList.contains('rolelabels')), 'settings are remembered');
  await page.context().close();

  /* ---------- worked examples: every example of every topic ---------- */
  page = await open('#/t/5.1', 1366, 900);
  for (const t of TOPICS) {
    await page.goto(URL + '#/t/' + t); await page.waitForTimeout(100);
    const keys = await page.evaluate(() => [...document.querySelectorAll('#s-examples .pill')].map((b) => b.dataset.k));
    expect(keys.length >= 3, t + ': at least three worked examples (' + keys.length + ')');
    for (const k of keys) {
      await page.click('#s-examples .pill[data-k="' + k + '"]');
      const n0 = await page.locator('#s-examples .st-step').count(); expect(n0 === 1, t + '/' + k + ': starts with one step');
      let guard = 0; while (!(await page.locator('#s-examples [data-a=next]').isDisabled()) && guard++ < 15) await page.click('#s-examples [data-a=next]');
      const n = await page.locator('#s-examples .st-step').count(), tx = await page.locator('#s-examples .stepper').innerText();
      expect(n >= 4 && !badText(tx), t + '/' + k + ': ' + n + ' steps, no NaN');
      expect(/\d/.test(await page.locator('#s-examples .final').last().innerText().catch(() => '')) || (await page.locator('#s-examples .final').count()) > 0 || /%/.test(tx), t + '/' + k + ': ends with a final answer');
      // cancelled units come in pairs
      const pairs = await page.evaluate(() => { const c = {}; document.querySelectorAll('#s-examples .u.cx[data-c]').forEach((u) => { const st = u.closest('.st-step'); const key = [...st.parentNode.children].indexOf(st) + ':' + u.dataset.c; c[key] = (c[key] || 0) + 1; }); return Object.values(c).every((v) => v === 2); });
      expect(pairs, t + '/' + k + ': every canceled unit has its partner');
    }
    // restart / back
    await page.click('#s-examples [data-a=restart]'); expect((await page.locator('#s-examples .st-step').count()) === 1, t + ': restart goes back to step 1');
    await page.click('#s-examples [data-a=next]'); await page.click('#s-examples [data-a=back]'); expect((await page.locator('#s-examples .st-step').count()) === 1, t + ': back removes a step');
    // a fresh generated example
    await page.click('#s-examples button:has-text("fresh one")'); expect(!badText(await page.locator('#s-examples .stepper').innerText()) && (await page.locator('#s-examples .stepper').count()) >= 1, t + ': "try a fresh one" works');
  }
  await page.context().close();

  /* ---------- practice cards: right, wrong, hints, solution, progress ---------- */
  page = await open('#/t/5.3/practice', 1366, 900);
  const card = page.locator('#s-practice .gen .pcard').first();
  const answerOf = () => page.evaluate(() => { const p = document.querySelector('#s-practice .gen .pcard'); return null; });
  // use the packet problem #2 (176 g CF4 -> 2.00 mol) because its answer is known
  await page.click('#s-practice .packet details:nth-of-type(2) summary'); await page.waitForTimeout(80);
  const p2 = page.locator('#s-practice .packet details:nth-of-type(2) .pcard');
  await p2.locator('.pc-in').fill('2.00'); await p2.locator('[data-a=check]').click();
  expect((await p2.locator('.pc-fb').getAttribute('class')).includes('ok'), 'a right answer is marked right');
  await page.click('#s-practice .packet details:nth-of-type(1) summary'); await page.waitForTimeout(80);
  const p1 = page.locator('#s-practice .packet details:nth-of-type(1) .pcard');   // 2.5e24 molecules CO2 -> grams = 183.8 (1.8e2)
  await p1.locator('.pc-in').fill('banana'); await p1.locator('[data-a=check]').click(); expect((await p1.locator('.pc-fb').getAttribute('class')).includes('bad'), 'nonsense input is rejected with advice');
  await p1.locator('.pc-in').fill(String(2.5e24 / 6.022e23 / 44.01)); await p1.locator('[data-a=check]').click();
  expect((await p1.locator('.pc-fb').innerText()).toLowerCase().includes('upside down') || (await p1.locator('.pc-fb').innerText()).toLowerCase().includes('molar mass'), 'a flipped factor is diagnosed: ' + (await p1.locator('.pc-fb').innerText()).slice(0, 80));
  await p1.locator('[data-a=hint]').first().click(); expect((await p1.locator('.pc-hint .st-step').count()) === 2, 'hint 1 shows the plan (2 steps)');
  await p1.locator('[data-a=hint]').first().click(); expect((await p1.locator('.pc-hint .st-step').count()) >= 5 && !(await p1.locator('.pc-hint').innerText()).includes('Round to the right sig figs'), 'hint 2 shows the setup but not the final answer step');
  await p1.locator('[data-a=solve]').click(); expect((await p1.locator('.pc-hint .st-step').count()) === 8, 'show solution reveals all 8 steps');
  await p1.locator('.pc-in').fill('1.8e2'); await p1.locator('[data-a=check]').click(); expect((await p1.locator('.pc-fb').getAttribute('class')).includes('ok'), 'sci-notation answer accepted');
  // generated problem + new problem button
  const g = page.locator('#s-practice .gen .pcard').first(); const q0 = await g.locator('.pc-q').innerText();
  let changed = false; for (let i = 0; i < 5 && !changed; i++) { await g.locator('[data-a=new]').click(); changed = (await g.locator('.pc-q').innerText()) !== q0; } expect(changed, '"New problem" makes a new problem');
  // progress is counted: first try wrong/right
  const sk = await page.evaluate(() => JSON.parse(localStorage.getItem('moles-study-guide-v1')).skills);
  expect(sk.conv && sk.conv.total >= 2 && sk.conv.right >= 1 && sk.conv.right < sk.conv.total, 'progress counts first-try results ' + JSON.stringify(sk.conv));
  // the practice page for every skill: generate, type the key, see a tick (via the pills)
  await page.goto(URL + '#/t/5.6/practice'); await page.waitForTimeout(100);
  const sks = await page.locator('#s-practice .gen .pill').count(); expect(sks === 2, '5.6 practice offers empirical and molecular skills');
  await page.context().close();

  /* ---------- formula problems: typed formulas with a live preview ---------- */
  page = await open('#/t/5.6/practice', 1366, 900);
  await page.click('#s-practice .packet details:nth-of-type(1) summary'); const f1 = page.locator('#s-practice .packet details:nth-of-type(1) .pcard');   // Na2S2O3
  await f1.locator('.pc-in').fill('Na2S2O3'); expect((await f1.locator('.pc-preview').innerText()).includes('Na2S2O3'), 'the formula preview shows the typed formula');
  await f1.locator('.pc-in').fill('NaSO2'); await f1.locator('[data-a=check]').click(); expect((await f1.locator('.pc-fb').innerText()).includes('rounded up'), 'rounding 1.5 up is diagnosed');
  await f1.locator('.pc-in').fill('Na2S2O3'); await f1.locator('[data-a=check]').click(); expect((await f1.locator('.pc-fb').getAttribute('class')).includes('ok'), 'the right formula is accepted');
  await f1.locator('.pc-in').fill('Xx2'); await f1.locator('[data-a=check]').click(); expect((await f1.locator('.pc-fb').innerText()).includes('not an element'), 'an impossible formula gets a helpful message');
  await page.context().close();
  page = await open('#/t/5.5/practice', 1366, 900);
  await page.click('#s-practice .packet details:nth-of-type(1) summary'); const pc = page.locator('#s-practice .packet details:nth-of-type(1) .pcard');   // NaOH 57.48 40.00 2.53
  const ins = pc.locator('.pc-in'); await ins.nth(0).fill('57.48'); await ins.nth(1).fill('40.00'); await ins.nth(2).fill('9'); await pc.locator('[data-a=check]').click();
  expect((await pc.locator('.pc-mrow.good').count()) === 2 && (await pc.locator('.pc-mrow.bad').count()) === 1, 'multi-element answers are marked per element');
  await page.context().close();

  /* ---------- multiple choice, checkup, sample test ---------- */
  page = await open('#/t/5.1/check', 1366, 900);
  const mc0 = page.locator('#s-check .mcq').first(); await mc0.locator('.mc-choice').nth(0).click();
  expect((await mc0.locator('.mc-choice.wrong').count()) === 1 && (await mc0.locator('.mc-choice.right').count()) === 1 && (await mc0.locator('.mc-fb.no').count()) === 1, 'a wrong choice is marked and the right one revealed');
  await mc0.locator('.mc-choice').nth(3).click(); expect((await mc0.locator('.mc-fb.ok').count()) === 1, 'then the right choice is accepted');
  await page.context().close();
  page = await open('#/', 1366, 900);
  await page.click('[data-a=start]'); expect((await page.locator('.checkup .mcq').count()) === 7, 'the checkup asks 7 questions');
  const picks = [3, 0, 0, 2, 2, 2, 2]; for (let i = 0; i < 7; i++) await page.locator('.checkup .mcq').nth(i).locator('.mc-choice').nth(0).click();
  await page.click('[data-a=done]'); expect((await page.locator('.cres .score').innerText()).includes('/ 7') && (await page.locator('.cres .chip').count()) >= 1, 'the checkup shows a score and topics to study');
  await page.context().close();

  /* ---------- the "more questions" button on every quick check ---------- */
  for (const t of TOPICS) {
    page = await open('#/t/' + t + '/check', 1366, 900);
    expect((await page.locator('#s-check .qc .mcq').count()) === 2, t + ': the packet’s two quick-check questions');
    await page.click('#s-check [data-a=more]'); await page.click('#s-check [data-a=more]');
    const n = await page.locator('#s-check .qm .mcq').count(), tx = await page.locator('#s-check .qm').innerText();
    expect(n === 6 && !badText(tx), t + ': "give me 3 more" adds fresh questions (' + n + ')');
    const stems = await page.locator('#s-check .qm .mc-q').allInnerTexts(); expect(new Set(stems).size === stems.length, t + ': no repeated question');
    const q = page.locator('#s-check .qm .mcq').first(); await q.locator('.mc-choice').nth(0).click();
    expect((await q.locator('.mc-fb').count()) === 1 && (await q.locator('details.mc-more li').count()) === 4, t + ': a bank question explains every choice');
    await page.context().close();
  }


  /* ---------- widgets ---------- */
  page = await open('#/t/5.1', 1366, 900);
  for (let i = 0; i < 10; i++) { const kind = await page.evaluate(() => { const t = document.querySelector('#s-learn [data-w=sortGame] p[style]').textContent.trim().split(' ')[0]; return t; }); const w = await page.evaluate((f) => window.MolesChem.particleWord(f), kind); await page.click('[data-w=sortGame] [data-kind="' + w + '"]'); await page.click('[data-w=sortGame] [data-a=next]'); }
  expect((await page.locator('[data-w=sortGame] .score').innerText()).startsWith('10 / 10'), 'the sorting game can be won 10/10');
  await page.click('.mb-row[data-f=Fe]'); expect((await page.locator('#mbNote').innerText()).includes('55.85'), 'clicking iron shows 55.85 g');
  await page.fill('.ac-f', 'Al2(SO4)3'); await page.fill('.ac-n', '1.00'); expect((await page.locator('.ac-out').innerText()).includes('7.23'), 'atom counter: 1.00 mol Al2(SO4)3 has 7.23 × 10²⁴ O atoms');
  expect((await page.locator('.ee-out').innerText()).includes('5.6') && (await page.locator('.ee-out').innerText()).includes('565'), 'EE demo shows the wrong and the right answer');
  await page.context().close();
  page = await open('#/t/5.3', 1366, 900);
  for (let i = 0; i < 4; i++) { await page.locator('[data-w=factorDrill] .frac[data-ok="1"]').click(); await page.locator('[data-w=factorDrill] [data-a=next]').click(); }
  expect((await page.locator('[data-w=factorDrill] .note').innerText()).includes('score 4/4'), 'factor drill: the right orientation is always the one with the start unit on the bottom');
  await page.locator('[data-w=factorDrill] .frac[data-ok="0"]').click(); expect((await page.locator('[data-w=factorDrill] .pc-fb').getAttribute('class')).includes('no'), 'factor drill: the wrong way up is marked wrong');
  await page.click('.mm-node[data-n=part]'); await page.click('.mm-node[data-n=L]'); expect((await page.locator('.me-info .path').innerText()).includes('particles') && (await page.locator('.me-info li').count()) === 2, 'mole map: particles → liters goes through moles with 2 factors');
  await page.check('.me-br'); expect((await page.locator('.mmap.with-el').count()) === 1 && (await page.locator('.me-info li').count()) >= 3, 'mole map: the element-inside option adds the subscript step');
  await page.click('[data-a=prac]'); expect((await page.locator('.me-practice .pcard').count()) === 1 && !badText(await page.locator('.me-practice').innerText()), 'mole map: practice this path makes a problem');
  await page.context().close();
  page = await open('#/t/5.4', 1366, 900);
  for (let i = 0; i < 6; i++) { const t = await page.locator('[data-w=canIUse] p[style]').innerText(); const yes = /CO₂ gas at 0|0.500 mol of He/.test(t); await page.click('[data-w=canIUse] [data-v="' + (yes ? 1 : 0) + '"]'); await page.click('[data-w=canIUse] [data-a=next]'); }
  expect((await page.locator('[data-w=canIUse] .score').innerText()).startsWith('6 / 6'), '"can I use 22.4?" game is winnable');
  await page.context().close();
  page = await open('#/t/5.6', 1366, 900);
  await page.fill('.rf-in', '1 : 1.5 : 2'); expect((await page.locator('.rf-out').innerText()).includes('multiply') && (await page.locator('.rf-out').innerText()).includes('3'), 'ratio fixer: 1 : 1.5 : 2 → 2 : 3 : 4');
  await page.fill('.rf-in', '1 : 3.96'); expect((await page.locator('.rf-out').innerText()).includes('round'), 'ratio fixer: 3.96 just rounds');
  await page.context().close();
  page = await open('#/t/5.7', 1366, 900);
  expect((await page.locator('.hl-side .readout').innerText()).includes('20.92'), 'hydrate lab starts at 20.92 g');
  await page.evaluate(() => { const r = document.querySelector('.hl-rng'); r.value = 100; r.dispatchEvent(new Event('input', { bubbles: true })); });
  expect((await page.locator('.hl-side .readout').innerText()).includes('20.02') && (await page.locator('[data-w=hydrateLab] [data-a=solve]').count()) === 1, 'heating all the way gives 20.02 g and offers to solve');
  await page.click('[data-w=hydrateLab] [data-a=solve]'); await page.click('.hl-solve button:has-text("Show all steps")'); expect((await page.locator('.hl-solve .st-step').count()) >= 6 && (await page.locator('.hl-solve').innerText()).includes('pentahydrate'), 'the lab solution finds copper(II) sulfate pentahydrate');
  await page.selectOption('.hl-sel', '1'); expect((await page.locator('.hl-side').innerText()).includes('pink'), 'cobalt chloride hexahydrate is pink');
  await page.context().close();

  /* ---------- quiz me ---------- */
  page = await open('#/practice', 1366, 900);
  expect((await text(page)).includes('hand-written concept questions'), 'the practice page describes the question bank');
  await page.selectOption('.pq-n', '5'); await page.selectOption('.pq-k', 'calc'); await page.click('.pq-go');
  for (let i = 0; i < 5; i++) { expect((await page.locator('.pq-area .pcard').count()) === 1, 'calculation question ' + (i + 1) + ' appears'); await page.click('.pq-area [data-a=skip]'); }
  expect((await page.locator('.pq-area .score').innerText()).startsWith('0 / 5'), 'skipping everything scores 0/5');
  await page.click('.pq-area [data-a=again]'); await page.selectOption('.pq-k', 'mc'); await page.selectOption('.pq-n', '10'); await page.click('.pq-go');
  const stems = []; let right = 0;
  for (let i = 0; i < 10; i++) {
    expect((await page.locator('.pq-area .mcq').count()) === 1 && (await page.locator('.pq-area [data-a=next]').isDisabled()), 'multiple-choice question ' + (i + 1) + ' waits for an answer');
    stems.push(await page.locator('.pq-area .mc-q').innerText());
    const idx = await page.evaluate(() => 0); await page.locator('.pq-area .mc-choice').nth(idx).click();
    if ((await page.locator('.pq-area .mc-fb.ok').count()) === 1) right++;
    expect(!(await page.locator('.pq-area [data-a=next]').isDisabled()), 'answering unlocks Next'); await page.click('.pq-area [data-a=next]');
  }
  expect(new Set(stems).size === 10, 'ten multiple-choice questions, no repeats');
  expect((await page.locator('.pq-area .score').innerText()).startsWith(right + ' / 10'), 'the quiz score matches the first-try answers (' + right + ')');
  await page.click('.pq-area [data-a=again]'); await page.click('.pq-topics .chip[data-t="5.1"]'); await page.click('.pq-topics .chip[data-t="5.2"]'); await page.selectOption('.pq-k', 'both'); await page.selectOption('.pq-n', '20'); await page.click('.pq-go');
  let kinds = new Set();
  for (let i = 0; i < 20; i++) { const note = await page.locator('.pq-area .note').first().innerText(); kinds.add(/calculation/.test(note) ? 'c' : 'm'); const topicTxt = await page.locator('.pq-area .pq-card').innerText(); expect(!badText(topicTxt), 'mixed quiz question ' + (i + 1) + ' has no NaN'); await page.click('.pq-area [data-a=skip]'); }
  expect(kinds.size === 2, 'a mixed quiz contains both calculations and multiple choice');
  expect((await page.locator('.pq-area .score').innerText()).startsWith('0 / 20'), 'the 20-question mixed quiz finishes');
  await page.context().close();
  page = await open('#/', 1366, 900); await page.click('[data-a=start]'); expect((await page.locator('.checkup .mcq').count()) === 7, 'the checkup draws 7 questions from the bank');
  const cq = await page.locator('.checkup .mc-q').allInnerTexts(); expect(new Set(cq).size === 7, 'the checkup questions are different');
  await page.context().close();
  page = await open('#/t/5.2', 1366, 900); await page.fill('.t-f', 'Al2(SO4)3'); expect((await page.locator('.t-out').innerText()).includes('342.14'), '5.2 molar mass builder: Al2(SO4)3 = 342.14');
  await page.fill('.t-f', 'Mg(OH'); expect((await page.locator('.t-out').innerText()).includes('not closed'), '5.2 molar mass builder explains a bad formula');
  await page.context().close();

  /* ---------- cheat sheet and print ---------- */
  page = await open('#/cheat', 1366, 900);
  expect((await text(page)).includes('6.022 × 10²³') && (await page.locator('.mmap').count()) === 1, 'cheat sheet has the constants and the map');
  await page.emulateMedia({ media: 'print' }); expect(!(await page.locator('.top').isVisible()) && !(await page.locator('#nav').isVisible()), 'printing hides the menus');
  await page.context().close();

  /* ---------- phone ---------- */
  page = await open('#/t/5.3', 390, 844);
  expect(!(await page.locator('#nav').evaluate((n) => n.getBoundingClientRect().right > 5)), 'on a phone the menu starts closed');
  await page.click('#btnMenu'); expect(await page.locator('#nav').evaluate((n) => n.getBoundingClientRect().left >= 0 && n.getBoundingClientRect().width > 200), 'the menu button opens the menu'); await page.click('#nav a[data-id="5.4"]'); await page.waitForTimeout(100);
  expect(await page.evaluate(() => location.hash) === '#/t/5.4' && !(await page.evaluate(() => document.body.classList.contains('nav-open'))), 'choosing a topic closes the menu');
  expect((await page.locator('#bottombar a').count()) === 2, 'the bottom bar has previous and next');
  const mm = await page.evaluate(() => { const m = document.querySelector('.mmap'); if (!m) return null; const kids = [...m.querySelectorAll('.mm-node')].map((n) => Math.round(n.getBoundingClientRect().top)); return kids; });
  expect(mm && new Set(mm).size === mm.length, 'on a phone the mole map stacks vertically');
  await page.context().close();

  expect(errors.length === 0, 'JavaScript errors: ' + [...new Set(errors)].slice(0, 5).join(' | '));
  await browser.close();
  if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
  console.log('ui: all ' + checks + ' checks passed');
})();
