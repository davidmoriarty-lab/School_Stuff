/* tests/ui.test.js: does the whole lab in a real browser (needs Playwright).
 *   node simulations/buffers-lab/tests/ui.test.js
 * It drags equipment with the mouse, holds the pour button, weighs solid, stirs, reads the pH meter,
 * watches the procedure checklist, and checks that mistakes (no stirring, no tare, wrong amounts) show up. */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); } catch (e2) { console.error('Playwright is not installed; skipping.'); process.exit(0); } }
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
const problems = []; let checks = 0;
const expect = (c, m) => { checks++; if (!c) problems.push(m); };

(async () => {
  const browser = await chromium.launch(); const errors = [];
  const open = async (w, h) => { const page = await browser.newPage({ viewport: { width: w, height: h } }); page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(200); return page; };
  let page = await open(1500, 950);
  const S = (f) => page.evaluate(f);
  const center = async (id) => { const b = await page.locator('.item[data-id="' + id + '"] > .hit').boundingBox(); if (!b) throw new Error('cannot see the ' + id + ': ' + await page.evaluate((i) => document.querySelector('.item[data-id="' + i + '"]').getAttribute('transform'), id)); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const drag = async (a, b) => { const p = await center(a), q = await center(b); await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move((p.x + q.x) / 2, (p.y + q.y) / 2, { steps: 4 }); await page.mouse.move(q.x, q.y, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(60); };
  const tip = () => page.locator('#tip').innerText();

  /* goggles gate */
  await drag('acid', 'cyl50'); expect(await S(() => BufferLab.S.op === null) && await page.locator('#goggles').isVisible(), 'nothing works before the goggles are on');
  await page.click('#gogglesBtn'); expect(!(await page.locator('#goggles').isVisible()), 'goggles button clears the overlay');

  /* Buffer 1, step 1: pour acid into the 50 mL cylinder by holding the button */
  await drag('acid', 'cyl50'); expect(await S(() => BufferLab.S.op && BufferLab.S.op.type === 'pour' && BufferLab.S.op.dst === 'cyl50'), 'dragging the acid bottle onto the cylinder starts a pour');
  const hb = await page.locator('#holdBtn').boundingBox(); await page.mouse.move(hb.x + 20, hb.y + 10); await page.mouse.down(); await page.waitForTimeout(2600); await page.mouse.up(); await page.waitForTimeout(100);
  const v1 = await S(() => BufferLab.S.cont.cyl50.vol); expect(v1 > 8 && v1 < 40, 'holding the pour button for 2.6 s pours a sensible amount (' + v1.toFixed(1) + ' mL)');
  const v1b = await S(() => BufferLab.S.cont.cyl50.vol); await page.waitForTimeout(300); expect(Math.abs((await S(() => BufferLab.S.cont.cyl50.vol)) - v1b) < 1e-9, 'pouring stops when the button is released');
  await page.mouse.down(); await page.waitForTimeout(120); await page.mouse.up(); const tap = (await S(() => BufferLab.S.cont.cyl50.vol)) - v1b; expect(tap > 0.02 && tap < 0.6, 'a quick tap adds only a little (' + tap.toFixed(2) + ' mL)');
  expect((await page.locator('#zoomTitle').innerText()).includes('50 mL'), 'the zoom window follows the cylinder in use');
  await S(() => { const c = BufferLab.S.cont.cyl50; BufferLab.moveLiquid('acid', 'cyl50', 49.4 - c.vol); });   // bring it close to the line
  await page.click('[data-b=done]');
  /* finish with the dropper: 1 mL drawn from the bottle, then drops */
  await drag('dropper', 'acid'); await page.click('[data-b=draw]'); expect(Math.abs((await S(() => BufferLab.S.cont.dropper.vol)) - 1) < 1e-9, 'the dropper draws up 1 mL');
  await drag('dropper', 'cyl50'); await page.click('[data-b=half]'); await page.click('[data-b=drop]'); await page.click('[data-b=drop]');
  expect(Math.abs((await S(() => BufferLab.S.cont.cyl50.vol)) - 50.0) < 0.001, 'drops are 0.05 mL: the cylinder is at 50.00 mL');
  await drag('dropper', 'sink'); expect((await S(() => BufferLab.S.cont.dropper.vol)) === 0, 'the dropper empties into the sink');
  await drag('cyl50', 'b1'); await page.click('[data-b=all]'); expect(Math.abs((await S(() => BufferLab.S.cont.b1.vA)) - 50) < 0.001 && (await S(() => BufferLab.S.cont.cyl50.vol)) === 0, 'the cylinder pours into the Buffer 1 beaker');

  /* step 2: weigh the solid */
  await drag('boat', 'balance'); await page.waitForTimeout(700); expect((await page.locator('#balText').textContent()) === '1.52 g', 'the balance shows the mass of the weigh boat (1.52 g)');
  await page.locator('[data-act=tare]').click(); await page.waitForTimeout(1000); expect((await page.locator('#balText').textContent()) === '0.00 g', 'TARE zeros the balance');
  await drag('scoop', 'jar'); expect((await S(() => BufferLab.S.scoop)) > 0.8, 'the scoop loads at the jar');
  await drag('scoop', 'boat'); await page.click('[data-b=shake]'); await page.click('[data-b=tap]'); const sg = await S(() => BufferLab.S.boat.solid); expect(sg > 0.12 && sg < 0.36, 'shake + tap add small amounts (' + sg.toFixed(2) + ' g)');
  await page.click('[data-b=take]'); expect((await S(() => BufferLab.S.boat.solid)) < sg, '"take a little out" removes solid');
  await S(() => { BufferLab.S.boat.solid = 3.40; }); await page.waitForTimeout(900); expect((await page.locator('#balText').textContent()) === '3.40 g', 'the balance reads the solid to 0.01 g');
  await drag('scoop', 'jar'); expect((await tip()).includes('Never put chemicals back'), 'returning solid to the stock jar is refused');
  await drag('scoop', 'sink');
  /* step 3: add and stir */
  await drag('boat', 'b1'); expect(Math.abs((await S(() => BufferLab.S.cont.b1.gSolid)) - 3.40) < 1e-9 && (await S(() => BufferLab.S.boat.loc)) === 'bench', 'the solid goes into the beaker');
  await drag('probe', 'b1'); await page.waitForTimeout(3500); expect((await page.locator('#phSub').textContent()).includes('settling') && (await S(() => BufferLab.S.last.b1)) === null, 'with undissolved solid the reading never becomes stable');
  await drag('probe', 'rinse');
  await drag('rod', 'b1'); await page.waitForTimeout(5200); expect((await S(() => BufferLab.S.cont.b1.solid)) === 0 && (await S(() => BufferLab.S.bk.b1.mixed)), 'stirring dissolves the solid and mixes the solution');
  await page.click('[data-b=done]');
  /* step 4: pH */
  await drag('probe', 'b1'); await page.waitForTimeout(5500);
  const ph1 = parseFloat(await page.locator('#phText').textContent()); expect(Math.abs(ph1 - 4.75) <= 0.03 && (await page.locator('#phSub').textContent()).includes('stable'), 'Buffer 1 reads pH 4.75 (' + ph1 + ') and becomes stable');

  /* Buffer 2 */
  await drag('acid', 'cyl50'); await S(() => BufferLab.moveLiquid('acid', 'cyl50', 50)); await page.click('[data-b=done]'); await drag('cyl50', 'b2'); await page.click('[data-b=all]');
  await drag('naoh', 'cyl50'); await S(() => BufferLab.moveLiquid('naoh', 'cyl50', 41.5)); await page.click('[data-b=done]');
  await drag('cyl50', 'b2'); const hb2 = await page.locator('#holdBtn').boundingBox(); await page.mouse.move(hb2.x + 20, hb2.y + 10); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
  const part = await S(() => BufferLab.S.cont.b2.vB); expect(part > 0.3 && part < 41.5, 'a cylinder can be poured gradually (' + part.toFixed(1) + ' mL so far)'); await page.click('[data-b=all]');
  expect(Math.abs((await S(() => BufferLab.S.cont.b2.vB)) - 41.5) < 0.001 && !(await S(() => BufferLab.S.bk.b2.mixed)), 'NaOH is in the beaker, not yet mixed');
  await drag('probe', 'b2'); expect((await tip()).includes('rinse the probe'), 'moving the probe beaker to beaker without rinsing gives a technique warning');
  await page.waitForTimeout(3000); expect((await S(() => BufferLab.S.last.b2)) === null, 'an unstirred solution gives no stable reading');
  await drag('probe', 'rinse'); await drag('rod', 'b2'); await page.waitForTimeout(2600); await page.click('[data-b=done]');
  await drag('probe', 'b2'); await page.waitForTimeout(5500);
  const ph2 = parseFloat(await page.locator('#phText').textContent()); expect(Math.abs(ph2 - 4.75) <= 0.03, 'Buffer 2 reads pH 4.75 (' + ph2 + ')');

  /* the procedure panel */
  expect((await page.locator('.steps li.done').count()) === 8, 'all eight procedure steps are ticked (' + (await page.locator('.steps li.done').count()) + ')');
  expect((await page.locator('#doneBox').innerText()).includes('Lab complete') && (await page.locator('#status').innerText()).includes('Lab complete'), 'finishing both buffers shows "Lab complete"');
  expect((await page.locator('#notebook input, #notebook textarea, #notebook [data-tab]').count()) === 0 && (await page.locator('#notebook').innerText()).includes('lab sheet'), 'the questions are on the paper sheet: the panel has no answer boxes or tabs');
  await page.reload(); await page.waitForTimeout(200); await page.click('#gogglesBtn');
  expect((await page.locator('.steps li.done').count()) === 0, 'a reload starts a fresh bench');

  /* mistakes show up in the pH */
  await S(() => { BufferLab.moveLiquid('acid', 'b1', 50); BufferLab.S.cont.b1.solid = 1.70; BufferLab.S.cont.b1.gSolid = 1.70; });
  await drag('rod', 'b1'); await page.waitForTimeout(4500); await page.click('[data-b=done]'); await drag('probe', 'b1'); await page.waitForTimeout(5000);
  const bad = parseFloat(await page.locator('#phText').textContent()); expect(Math.abs(bad - 4.45) < 0.04, 'half the sodium acetate gives pH 4.45, not 4.75 (' + bad + ')');
  /* stress test and dumping */
  await drag('hcl', 'b1'); await page.click('[data-b=h20]'); expect(Math.abs((await S(() => BufferLab.S.cont.b1.vH)) - 1) < 1e-9, 'the HCl bottle adds 1.00 mL');
  await drag('b1', 'sink'); await page.click('[data-b=yes]'); expect((await S(() => BufferLab.S.cont.b1.vol)) === 0 && (await S(() => BufferLab.S.probe.loc)) === 'rinse', 'a beaker can be emptied into the sink');
  /* overflow */
  await drag('naoh', 'cyl50'); await S(() => BufferLab.moveLiquid('naoh', 'cyl50', 80)); expect((await S(() => BufferLab.S.cont.cyl50.vol)) <= 57.001 && (await tip()).includes('overflowed'), 'overfilling a cylinder spills');
  /* tap-to-select works without dragging */
  await page.click('[data-b=done]'); await S(() => BufferLab.moveLiquid('acid', 'b2', 50)); const c = await center('rod'); await page.mouse.click(c.x, c.y); const t = await center('b2'); await page.mouse.click(t.x, t.y); expect(await S(() => BufferLab.S.op && BufferLab.S.op.type === 'stir'), 'tap an item, then tap a target, also works: ' + (await tip()) + ' / sel=' + (await S(() => BufferLab.S.sel)));
  /* nothing leaks a NaN */
  expect(!/NaN|undefined/.test(await page.locator('body').innerText()), 'no NaN or undefined on the page');
  await page.close();

  /* phone-sized screen */
  page = await open(390, 844); await page.click('#gogglesBtn');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'nothing runs off the side of a phone screen');
  expect(await page.locator('.zoom').evaluate((z) => z.getBoundingClientRect().width > 150), 'on a phone the zoom window is big enough to read');
  await page.close();

  expect(errors.length === 0, 'JavaScript errors: ' + [...new Set(errors)].slice(0, 4).join(' | '));
  await browser.close();
  if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
  console.log('ui: all ' + checks + ' checks passed');
})();
