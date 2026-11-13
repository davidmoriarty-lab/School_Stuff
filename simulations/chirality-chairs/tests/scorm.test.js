/* tests/scorm.test.js: runs the practice set inside a pretend learning system and checks what it is told.
 *   sh build-scorm.sh && node tests/scorm.test.js      (needs Playwright) */
const path = require('path'), fs = require('fs'), http = require('http'), { execSync } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); } catch (e2) { console.error('Playwright is not installed; skipping.'); process.exit(0); } }
const problems = []; let checks = 0; const expect = (c, m) => { checks++; if (!c) problems.push(m); };
const dir = path.join(__dirname, '..'), zip = path.join(dir, 'dist', 'chirality-chairs-scorm12.zip');

/* ---- the package ---- */
const list = execSync('unzip -Z1 "' + zip + '"').toString().trim().split('\n');
expect(list.includes('imsmanifest.xml') && !list.some((f) => f.startsWith('chirality-chairs/')), 'imsmanifest.xml is at the top level of the zip');
const man = fs.readFileSync(path.join(dir, 'imsmanifest.xml'), 'utf8');
expect(/<schemaversion>1\.2<\/schemaversion>/.test(man) && /adlcp:scormtype="sco"/.test(man) && /href="index.html"/.test(man), 'the manifest declares a SCORM 1.2 SCO that starts at index.html');
const files = [...man.matchAll(/<file href="([^"]+)"/g)].map((m) => m[1]);
expect(files.length === 9 && files.every((f) => list.includes(f)) && list.length === 10, 'every file in the manifest is in the zip, and nothing else');
for (const f of files.concat('imsmanifest.xml')) expect(execSync('unzip -p "' + zip + '" "' + f + '"').equals(fs.readFileSync(path.join(dir, f))), 'the zip is up to date: ' + f + ' (run sh build-scorm.sh)');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8'); for (const m of html.matchAll(/(?:src|href)="((?:js|css)\/[^"]+)"/g)) expect(files.includes(m[1]), 'index.html only uses packaged files: ' + m[1]);
expect(html.indexOf('js/scorm.js') < html.indexOf('js/app.js'), 'scorm.js loads before app.js');

(async () => {
  const browser = await chromium.launch(); const errors = [];
  let lmsPage = '';
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  const server = http.createServer((req, res) => { const u = req.url.split('?')[0]; if (u === '/lms') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(lmsPage); return; } const fp = path.join(dir, path.normalize(u)); if (!fp.startsWith(dir) || !fs.existsSync(fp)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(fp)] || 'application/octet-stream' }); res.end(fs.readFileSync(fp)); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + server.address().port;
  const lms = (stored) => '<script>var store=' + JSON.stringify(stored) + ';var calls=[];window.API={LMSInitialize:function(){calls.push(["init"]);return "true"},LMSGetValue:function(k){return store[k]||""},LMSSetValue:function(k,v){store[k]=String(v);calls.push(["set",k,String(v)]);return "true"},LMSCommit:function(){calls.push(["commit"]);return "true"},LMSFinish:function(){calls.push(["finish"]);return "true"},LMSGetLastError:function(){return "0"},LMSGetErrorString:function(){return ""},LMSGetDiagnostic:function(){return ""}};</script><iframe id="sco" src="index.html" style="width:1280px;height:1000px;border:0"></iframe>';
  const start = async (stored) => { lmsPage = lms(stored || {}); const page = await browser.newPage({ viewport: { width: 1300, height: 1040 } }); await page.addInitScript(() => { Math.random = () => 0.163117; });   // every new visitor gets set #24680, so the test is the same every time
    page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('dialog', (d) => d.accept()); await page.goto(base + '/lms'); await page.waitForTimeout(400); return page; };
  let page = await start(), f = page.frameLocator('#sco'); const fr = () => page.frames().find((x) => x.url().endsWith('index.html'));
  const store = () => page.evaluate(() => store), calls = () => page.evaluate(() => calls), sco = (fn, a) => fr().evaluate(fn, a);
  const card = () => f.locator('.prob'), modal = () => f.locator('#modal');
  const truth = (i) => sco((k) => { const d = ChiralApp.data[k]; return { centers: d.centers, order: d.centers.map((c) => Cip.truthOrder(d.mol, c)), cfg: d.centers.map((c) => d.cfg[c].config), name: d.name }; }, i);
  async function doCenter(atom, order, letter) { await card().locator('.atom[data-atom="' + atom + '"]').click(); await modal().waitFor({ state: 'visible' }); for (const id of order) await f.locator('.dlg .slot[data-gid="' + id + '"]').click(); await f.locator('[data-mcfg="' + letter + '"]').click(); await f.locator('[data-mact=done]').click(); await modal().waitFor({ state: 'hidden' }); }
  async function solveChiral() { const k = await sco(() => ChiralApp.state.cur), t = await truth(k); if (!t.centers.length) await card().locator('[data-none]').check(); else for (let n = 0; n < t.centers.length; n++) await doCenter(t.centers[n], t.order[n], t.cfg[n]); await card().locator('[data-act=check]').click(); }
  /* chairs: place the groups through the page's own placing function (the drag itself is tested in ui.test.js) */
  async function solveChair() {
    const k = await sco(() => ChiralApp.state.cur);
    await sco((i) => { const A = ChiralApp, t = A.probs[i].target, s = Chair.solve(t, 1); for (const id in s) A.placeOn(i, 1, id, s[id].k, s[id].type); }, k); await card().locator('[data-act=check]').click();
    await sco((i) => { const A = ChiralApp, t = A.probs[i].target, p1 = A.state.items[i].p1, s = Chair.solve(t, -1, Chair.typesOf(p1)); for (const id in s) A.placeOn(i, 2, id, s[id].k, s[id].type); }, k); await card().locator('[data-act=check]').click();
  }
  const solveCur = async () => ((await sco(() => ChiralApp.state.cur)) < 8 ? solveChiral() : solveChair());

  /* ---- starting ---- */
  expect((await calls())[0][0] === 'init' && (await store())['cmi.core.lesson_status'] === 'incomplete', 'on opening, the page reports "incomplete"');
  expect(await f.locator('#newSet').isHidden(), 'inside a class there is no "New set" button');
  expect(/^✔ Saved to your class at /.test(await f.locator('#saved').innerText()), 'the page shows "Saved to your class" with the time');
  const seed = await sco(() => ChiralApp.state.seed);

  /* ---- progress and score ---- */
  await solveCur(); expect((await card().getAttribute('class')).includes('solved'), 'problem 1 is solved through the window'); await card().locator('[data-act=next]').click();
  const s1 = await store(); expect(s1['cmi.core.score.raw'] === '8' && s1['cmi.core.lesson_status'] === 'incomplete', 'after 1 of 12 the score is 8 and the lab is still incomplete (' + s1['cmi.core.score.raw'] + ')');
  expect(JSON.parse(s1['cmi.suspend_data']).s === seed && s1['cmi.core.lesson_location'] === '1' && s1['cmi.suspend_data'].length < 4096, 'the set number and the place are stored (' + s1['cmi.suspend_data'].length + ' characters)');

  /* ---- a half-finished chiral center is saved: marked, two groups numbered, no letter yet ---- */
  const t2 = await truth(1); const c0 = t2.centers.length ? t2.centers[0] : await sco(() => ChiralApp.data[1].mol.atoms.map((a, i) => [a.el, i]).filter((x) => x[0] === 'C')[2][1]);
  const ord = await sco((a) => Cip.groups(ChiralApp.data[1].mol, a).map((g) => g.id), c0);
  await card().locator('.atom[data-atom="' + c0 + '"]').click(); await f.locator('.dlg .slot[data-gid="' + ord[0] + '"]').click(); await f.locator('.dlg .slot[data-gid="' + ord[1] + '"]').click(); await f.keyboard ? 0 : 0; await page.keyboard.press('Escape');
  const before = (await calls()).filter((c) => c[0] === 'commit').length; await f.locator('#saveBtn').click();
  expect(/Progress saved to your class/.test(await f.locator('#saved').innerText()) && (await calls()).filter((c) => c[0] === 'commit').length > before, 'the Save progress button commits to the class and confirms it');
  const mid = await store(), w = JSON.parse(mid['cmi.suspend_data']).i[1]; expect(w[5] === 0 && JSON.stringify(w[6]) === JSON.stringify([c0]) && w[8].length === 1 && w[8][0][1].length === 2, 'the marked center and the two numbered groups are in the saved data');
  await page.close();

  /* ---- coming back ---- */
  page = await start(mid); f = page.frameLocator('#sco');
  expect((await sco(() => ChiralApp.state.seed)) === seed && (await sco(() => ChiralApp.state.cur)) === 1, 'resuming gives the same set and the same problem');
  expect((await f.locator('.dot.solved').count()) === 1 && (await f.locator('#score').innerText()).startsWith('1 / 12'), 'problem 1 is still counted');
  expect(await f.locator('#newSet').isHidden() && (await card().locator('.crow').count()) === 1 && (await card().locator('.cstat').innerText()).includes('still needed'), 'the half-finished center is still on the list, and New set stays hidden');
  await card().locator('[data-edit="' + c0 + '"]').click(); expect((await f.locator('.dlg .slot.on').count()) === 2, 'opening it again shows the two numbers that were already set'); await page.keyboard.press('Escape');
  expect((await store())['cmi.core.lesson_status'] === 'incomplete', 'resuming does not complete anything');

  /* ---- using the solution: it does not count, the spot gets a similar problem, all of it saved ---- */
  const nameBefore = (await truth(1)).name;
  for (let k = 0; k < 3; k++) { if (k === 0) { await card().locator('[data-remove="' + c0 + '"]').click(); } await card().locator('[data-none]').check(); await card().locator('[data-act=check]').click(); await card().locator('[data-none]').uncheck(); if ((await sco(() => ChiralApp.state.items[1].tries)) < k + 1) { await doCenter(c0, ord, 'R'); await card().locator('[data-act=check]').click(); } }
  const tries1 = await sco(() => ChiralApp.state.items[1].tries); expect(tries1 >= 3 && !(await card().locator('[data-act=reveal]').isDisabled()), 'three wrong checks unlock the solution (' + tries1 + ')');
  await card().locator('[data-act=reveal]').click(); const sh = await store(); expect(JSON.parse(sh['cmi.suspend_data']).i[1][4] === 2 && sh['cmi.core.score.raw'] === '8' && sh['cmi.core.lesson_status'] === 'incomplete', 'showing the solution is saved as "shown" and earns no score or completion');
  await page.close(); page = await start(sh); f = page.frameLocator('#sco');
  expect((await card().getAttribute('class')).includes('shown') && (await card().locator('[data-act=next]').count()) === 0, 'resuming at a shown solution still offers only "Try a similar problem"');
  await card().locator('[data-act=retry]').click(); const nameAfter = (await truth(1)).name; const sv1 = JSON.parse((await store())['cmi.suspend_data']).i[1];
  expect(nameAfter !== nameBefore && sv1[3] === 1 && sv1[2] === 1 && sv1[4] === 0, 'a similar problem (' + nameAfter + ') replaces ' + nameBefore + ', and that is saved');
  const st1 = await store(); await page.close(); page = await start(st1); f = page.frameLocator('#sco');
  expect((await truth(1)).name === nameAfter && (await card().locator('.similar').count()) === 1, 'resuming gives the same similar problem');
  await solveCur(); expect((await card().getAttribute('class')).includes('solved') && (await store())['cmi.core.score.raw'] === '17', 'the similar problem counts as problem 2: score 17 (2 of 12)'); await card().locator('[data-act=next]').click();

  /* ---- a chair in the middle: chips are saved and come back ---- */
  for (let i = 2; i < 8; i++) { await solveCur(); await card().locator('[data-act=next]').click(); }
  expect((await sco(() => ChiralApp.state.cur)) === 8 && (await store())['cmi.core.score.raw'] === '67', 'problems 3-8 done: score 67 (8 of 12)');
  await sco(() => { const A = ChiralApp, t = A.probs[8].target, s = Chair.solve(t, 1); const id = Object.keys(s)[0]; A.placeOn(8, 1, id, s[id].k, s[id].type); }); await f.locator('#saveBtn').click();
  const cm = await store(), cw = JSON.parse(cm['cmi.suspend_data']).i[8]; expect(cw[5] === 1 && cw[6].length === 1, 'a chip placed on the chair is saved');
  await page.close(); page = await start(cm); f = page.frameLocator('#sco'); expect((await f.locator('.board.live .chipmark').count()) === 1, 'the chip is back on the chair after resuming');
  await solveCur(); expect((await card().getAttribute('class')).includes('solved'), 'the chair, both steps, can be finished after resuming'); await card().locator('[data-act=next]').click();
  expect((await sco(() => ChiralApp.state.items[8].stage)) === 2 && (await store())['cmi.core.lesson_status'] === 'incomplete', 'still incomplete with three problems left');
  for (let i = 9; i < 12; i++) { expect((await store())['cmi.core.lesson_status'] === 'incomplete', 'still incomplete before problem ' + (i + 1)); await solveCur(); await card().locator('[data-act=next]').click(); }
  await f.locator('#finish').waitFor(); const s2 = await store();
  expect(s2['cmi.core.lesson_status'] === 'completed' && s2['cmi.core.score.raw'] === '100', 'all 12 answered correctly: "completed" with a score of 100 (' + s2['cmi.core.lesson_status'] + ', ' + s2['cmi.core.score.raw'] + ')');
  expect((await f.locator('#finish').innerText()).includes('reported to your class') && (await f.locator('#againBtn').count()) === 0, 'the results say completion was reported, and offer no new set');
  expect((await f.locator('#finish .res').innerText()).includes('correct after 1 solution shown'), 'the results show the one problem that needed a similar problem');
  const c = await calls(); expect(c.findIndex((x) => x[1] === 'cmi.core.lesson_status' && x[2] === 'completed') < c.map((x) => x[0]).lastIndexOf('commit'), 'the completion is committed straight away');
  await sco(() => ChiralScorm.finish()); const s3 = await store(); expect((await calls()).some((x) => x[0] === 'finish') && /^\d\d:\d\d:\d\d$/.test(s3['cmi.core.session_time']), 'on leaving, the session time is sent and the session is finished');
  await page.close();

  /* ---- a completed attempt stays completed ---- */
  page = await start(s3); f = page.frameLocator('#sco');
  expect((await sco(() => ChiralApp.state.cur)) === 12 && await f.locator('#finish').isVisible(), 'a returning student sees their results');
  await f.locator('.dot[data-go="0"]').click(); await f.locator('#saveBtn').click(); expect((await store())['cmi.core.lesson_status'] === 'completed' && (await store())['cmi.core.score.raw'] === '100', 'revisiting a problem never sets a completed set back or lowers the score');
  await page.close();

  /* ---- bad saved data, worst-case size, and no learning system ---- */
  page = await start({ 'cmi.suspend_data': '{"v":99,"junk":true}' }); f = page.frameLocator('#sco'); expect((await f.locator('.prob').count()) === 1 && (await sco(() => ChiralApp.state.cur)) === 0, 'unreadable saved data starts a fresh set instead of breaking'); await page.close();
  page = await start(); f = page.frameLocator('#sco');
  const len = await sco(() => { const st = ChiralApp.state; st.items.forEach((it, k) => { it.status = 'solved'; it.tries = 3; it.tot = 9; it.shownN = 3; it.variant = 3; if (k < 8) { it.marked = [10, 11, 12]; it.cfg = { 10: 'R', 11: 'S', 12: 'R' }; it.prio = { 10: [10, 11, 12, 'H0'], 11: [10, 11, 12, 'H0'], 12: [10, 11, 12, 'H0'] }; } else { it.stage = 2; it.p1 = { s0: { k: 5, type: 'ax' }, s1: { k: 3, type: 'eq' }, s2: { k: 1, type: 'ax' } }; it.p2 = { s0: { k: 5, type: 'eq' }, s1: { k: 3, type: 'ax' }, s2: { k: 1, type: 'eq' } }; } }); return ChiralApp.encode().length; });
  expect(len <= 4000, 'worst-case saved data still fits (' + len + ' of 4096 characters)'); await page.close();
  page = await browser.newPage({ viewport: { width: 1200, height: 900 } }); page.on('pageerror', (e) => errors.push(e.message)); await page.goto(base + '/index.html'); await page.evaluate(() => localStorage.clear()); await page.goto(base + '/index.html'); await page.waitForTimeout(300);
  expect(await page.evaluate(() => ChiralScorm.connected === false) && !(await page.locator('#newSet').isHidden()) && /^✔ Saved on this device at /.test(await page.locator('#saved').innerText()), 'opened on its own, the page runs without a learning system and keeps "New set"'); await page.close();
  expect(errors.length === 0, 'JavaScript errors: ' + [...new Set(errors)].slice(0, 3).join(' | '));
  await browser.close(); server.close();
  if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
  console.log('scorm: all ' + checks + ' checks passed');
})();
