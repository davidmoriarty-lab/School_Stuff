/* tests/ui.test.js: checks the Digestive System Builder in a real browser. Needs Playwright.
 *
 *   node simulations/digestive-system-builder/tests/ui.test.js
 *
 * The page is opened with ?manual so the test drives the clock. It checks that:
 *   - the page loads from a file with no errors;
 *   - dragging a part from the tray with the mouse snaps it to the grid, a drop on an occupied
 *     square is refused, a placed part can be moved, and dragging it off the grid removes it;
 *   - click-to-place and keyboard placing work, and the tray counts go down;
 *   - Play is refused without a mouth;
 *   - a correct build runs through every organ, the food stays inside the picture, the table
 *     always adds up, and the report says "Healthy";
 *   - a broken build ends in diarrhea or a spill with a list of what went wrong;
 *   - pause, fast, reset, changing food, clearing the board and reloading the page all work;
 *   - nothing on the page is cut off at laptop and tablet sizes.
 */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
  catch (e2) { console.error('Playwright is not installed; skipping.'); process.exit(0); }
}
const URL = 'file://' + path.join(__dirname, '..', 'index.html') + '?manual';
const problems = []; let checks = 0;
const expect = (cond, msg) => { checks++; if (!cond) problems.push(msg); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL);

  const placed = () => page.evaluate(() => DSB.S.placed.map(p => p.type + '@' + p.c + ',' + p.r));
  const cellPoint = async (c, r) => { const b = await page.locator('#board').boundingBox(); const s = b.width / 18; return [b.x + c * s, b.y + r * s]; };
  /* drag the tray item so that the part's top-left square lands on (c, r) */
  const dragFromTray = async (type, c, r, w, h) => {
    const t = await page.locator('.tray-item[data-type="' + type + '"]').boundingBox();
    const [x, y] = await cellPoint(c + w / 2, r + h / 2);
    await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2); await page.mouse.down();
    await page.mouse.move(x + 7, y - 9, { steps: 6 }); await page.mouse.up();      // deliberately off-centre: it must snap
  };

  /* --- building with the mouse --- */
  await dragFromTray('mouth', 0, 1, 2, 2);
  expect((await placed()).join() === 'mouth@0,1', 'dragging the mouth from the tray snaps it to (0,1); got ' + (await placed()).join());
  expect(await page.locator('.tray-item[data-type="mouth"]').isDisabled(), 'the mouth leaves the tray once placed');
  await dragFromTray('esophagus', 1, 2, 2, 1);
  expect((await placed()).length === 1, 'a drop on occupied squares is refused');
  await dragFromTray('esophagus', 2, 2, 2, 1);
  expect((await placed()).includes('esophagus@2,2'), 'the esophagus snaps next to the mouth');
  {                                                   // move a placed part, then drag it off the grid
    let [x, y] = await cellPoint(3, 2.5); const [x2, y2] = await cellPoint(6, 4.5);
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x2, y2, { steps: 6 }); await page.mouse.up();
    expect((await placed()).includes('esophagus@5,4'), 'a placed part can be dragged to new squares; got ' + (await placed()).join());
    await page.mouse.move(x2, y2); await page.mouse.down(); await page.mouse.move(x2, y2 + 500, { steps: 6 }); await page.mouse.up();
    expect((await placed()).join() === 'mouth@0,1', 'dragging a part off the grid returns it to the tray');
  }
  /* click-to-place, then keyboard */
  await page.locator('.tray-item[data-type="capillaries"]').click();
  { const [x, y] = await cellPoint(10.5, 5.5); await page.mouse.click(x, y); }
  expect((await placed()).includes('capillaries@10,5'), 'click a part, then click a square, places it');
  expect((await page.locator('.tray-item[data-type="capillaries"] .count').textContent()) === '×2', 'the tray count goes down');
  await page.keyboard.press('Escape');
  await page.locator('.tray-item[data-type="lymph"]').focus();
  await page.keyboard.press('Enter'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  expect((await placed()).includes('lymph@2,1'), 'keyboard: Enter, arrows, Enter places a part; got ' + (await placed()).join());
  await page.locator('.part[data-type="lymph"]').dblclick();
  expect(!(await placed()).some(p => p.startsWith('lymph')), 'double-click removes a part');

  /* --- reload keeps the build; no mouth refuses to run --- */
  await page.reload();
  expect((await placed()).length === 2, 'the build survives a page reload');
  await page.evaluate(() => DSB.clear());
  await page.locator('#btnPlay').click();
  expect(await page.evaluate(() => DSB.S.mode) === 'build' && /no mouth/i.test(await page.locator('#status').textContent()), 'Play without a mouth is refused with a message');

  /* --- a correct build --- */
  await page.evaluate(() => { DSB.loadExample(); DSB.setFood('pizza'); });
  expect(await page.locator('#gDucts line').count() >= 18, 'every attached gland, cell group and vessel shows a connector');
  await page.locator('#btnPlay').click();
  const run = await page.evaluate(() => {
    const S = DSB.S, seen = [], bad = []; let n = 0, worst = 0;
    const init = S.sim.initial, cal0 = init.cc + init.su + init.pr + init.fa;
    while (S.mode === 'run' && n++ < 5000) {
      DSB.advance(0.04); DSB.drawFx();
      const status = document.getElementById('status').textContent.split(':')[0];
      if (seen[seen.length - 1] !== status) seen.push(status);
      for (const c of document.querySelectorAll('#gFx circle, #gFx ellipse')) { const x = +c.getAttribute('cx'), y = +c.getAttribute('cy'); if (!(x > -80 && x < 1880 && y > -80 && y < 680)) bad.push([x, y]); }
      const cell = k => parseFloat(document.querySelector('[data-' + k + ']').textContent) || 0;
      const now = k => parseFloat(document.querySelector('[data-now="' + k + '"]').textContent) || 0, abs = k => parseFloat(document.querySelector('[data-abs="' + k + '"]').textContent) || 0;
      worst = Math.max(worst, Math.abs(now('cc') + now('su') + now('pr') + now('aa') + now('fa') + now('fy') + abs('su') + abs('aa') + abs('fy') - cal0), Math.abs(now('w') + abs('w') - init.w));
    }
    return { seen, bad: bad.length, worst, mode: S.mode, outcome: S.sim.outcome, particles: n };
  });
  expect(run.mode === 'done' && run.outcome === 'healthy', 'the correct build finishes healthy (got ' + run.mode + ', ' + run.outcome + ')');
  expect(['Mouth', 'Esophagus', 'Stomach', 'Small intestine', 'Large intestine', 'Rectum and anus'].every(o => run.seen.some(s => s.includes(o))), 'the narration names every organ in turn (got ' + run.seen.join(' > ') + ')');
  expect(run.bad === 0, 'food and droplets stay inside the picture');
  expect(run.worst < 0.5, 'the table on screen always adds up to the initial amounts (worst gap ' + run.worst.toFixed(2) + ')');
  expect(await page.locator('#summary').isVisible() && /Healthy/.test(await page.locator('#summary h3').textContent()), 'the report says Healthy');
  expect(await page.locator('#trays').isHidden(), 'the trays make way for the report');
  expect((await page.locator('#gFx text').textContent()) === '💩', 'a solid stool is shown at the end');

  /* --- controls --- */
  await page.locator('#summary [data-act="again"]').click();
  expect(await page.evaluate(() => DSB.S.mode === 'run' && DSB.S.tick === 0), '"Run it again" restarts the run');
  await page.evaluate(() => { for (let i = 0; i < 20; i++) DSB.advance(0.04); });
  await page.locator('#btnPause').click();
  const t1 = await page.evaluate(() => { const t = DSB.S.tick; DSB.advance(0.5); return [t, DSB.S.tick]; });
  expect(t1[0] === t1[1] && t1[0] > 0, 'Pause stops the food');
  await page.locator('#btnFast').click(); await page.locator('#btnPlay').click();
  const t2 = await page.evaluate(() => { const t = DSB.S.tick; DSB.advance(0.05); return DSB.S.tick - t; });
  expect(Math.abs(t2 - 2) < 0.01, 'Fast runs four times faster (moved ' + t2 + ' ticks in 0.05 s)');
  await page.locator('#btnFast').click();
  expect(await page.locator('.food[data-food="apple"]').isDisabled(), 'food cannot be changed in the middle of a run');
  await page.locator('#btnReset').click();
  expect(await page.evaluate(() => DSB.S.mode === 'build') && await page.locator('#trays').isVisible() && await page.locator('#gFx *').count() === 0, 'Reset returns to building');
  await page.locator('.food[data-food="cheese"]').click();
  expect(/Cheese/.test(await page.locator('#analysisFood').textContent()) && (await page.locator('[data-now="fa"]').textContent()) === '149.0', 'choosing a food updates the table');

  /* --- broken builds --- */
  await page.evaluate(() => { DSB.S.placed = DSB.S.placed.filter(p => p.type !== 'liver'); DSB.finish(); });
  let head = await page.locator('#summary h3').textContent(), body = await page.locator('#summary').textContent();
  expect(/Diarrhea/.test(head) && /gallbladder has no liver/.test(body) && /osmo/.test(body), 'cheese with no liver: diarrhea, with the cause explained (got "' + head + '")');
  expect(await page.locator('#gFx ellipse').count() === 1, 'diarrhea ends in a puddle');
  await page.evaluate(() => { DSB.reset(); DSB.S.placed = DSB.S.placed.filter(p => p.type !== 'large'); DSB.finish(); });
  head = await page.locator('#summary h3').textContent(); body = await page.locator('#summary').textContent();
  expect(/Spill/.test(head) && /tube is open after the small intestine/.test(body) && /not connected/.test(body), 'a gap in the tube: spill, naming where (got "' + head + '")');
  await page.locator('#summary [data-act="build"]').click();
  expect(await page.evaluate(() => DSB.S.mode === 'build'), '"Fix the build" returns to building');

  /* --- clear board needs two clicks; sound toggle; help --- */
  await page.locator('#btnClear').click();
  expect((await placed()).length > 0, 'one click on Clear board does not clear');
  await page.locator('#btnClear').click();
  expect((await placed()).length === 0, 'a second click clears the board');
  await page.locator('#btnSound').click();
  expect(/off/.test(await page.locator('#btnSound').textContent()) && await page.evaluate(() => !DigestSound.enabled), 'the sound button mutes');
  await page.locator('#btnSound').click();
  const soundErrors = await page.evaluate(() => { const bad = []; for (const n of DigestSound.names) { try { DigestSound.play(n); } catch (e) { bad.push(n); } } return bad; });
  expect(soundErrors.length === 0, 'every sound effect plays without error');
  await page.locator('#btnHelp').click();
  expect(await page.locator('#help').isVisible(), 'the help window opens');
  await page.keyboard.press('Escape');

  /* --- layout --- */
  for (const [w, h] of [[1366, 768], [1024, 768], [1920, 1080], [820, 1180]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => DSB.loadExample());
    const over = await page.evaluate(() => {
      const out = [];
      if (document.documentElement.scrollWidth > innerWidth + 1) out.push('page scrolls sideways');
      for (const el of document.querySelectorAll('.tray-item, .food, .btn, #status')) if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) out.push('text overflows ' + (el.id || el.className) + ' "' + el.textContent.trim().slice(0, 20) + '"');
      const b = document.getElementById('board').getBoundingClientRect();
      if (b.width < 600) out.push('board only ' + Math.round(b.width) + 'px wide');
      return out;
    });
    expect(over.length === 0, w + 'x' + h + ': ' + over.join('; '));
  }

  expect(errors.length === 0, 'no errors in the browser console: ' + errors.join(' | '));
  await browser.close();
  if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
  console.log('ui: all ' + checks + ' checks passed');
})().catch(e => { console.error(e); process.exit(1); });
