/* tests/scorm.test.js: runs the practice set inside a pretend learning system and checks what it is told.
 *   sh build-scorm.sh && node tests/scorm.test.js      (needs Playwright) */
const path = require('path'), fs = require('fs'), http = require('http'), { execSync } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); } catch (e2) { console.error('Playwright is not installed; skipping.'); process.exit(0); } }
const problems = []; let checks = 0; const expect = (c, m) => { checks++; if (!c) problems.push(m); };
const dir = path.join(__dirname, '..'), zip = path.join(dir, 'dist', 'mole-conversions-practice-scorm12.zip');
const plain = (t) => t.replace(' × 10', 'e').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, (c) => '0123456789-'['⁰¹²³⁴⁵⁶⁷⁸⁹⁻'.indexOf(c)]);

/* ---- the package ---- */
const list = execSync('unzip -Z1 "' + zip + '"').toString().trim().split('\n');
expect(list.includes('imsmanifest.xml') && !list.some((f) => f.startsWith('mole-conversions-practice/')), 'imsmanifest.xml is at the top level of the zip');
const man = fs.readFileSync(path.join(dir, 'imsmanifest.xml'), 'utf8');
expect(/<schemaversion>1\.2<\/schemaversion>/.test(man) && /adlcp:scormtype="sco"/.test(man) && /href="index.html"/.test(man), 'the manifest declares a SCORM 1.2 SCO that starts at index.html');
const files = [...man.matchAll(/<file href="([^"]+)"/g)].map((m) => m[1]);
expect(files.length === 11 && files.every((f) => list.includes(f)) && list.length === 12, 'every file in the manifest is in the zip, and nothing else');
for (const f of files.concat('imsmanifest.xml')) expect(execSync('unzip -p "' + zip + '" "' + f + '"').equals(fs.readFileSync(path.join(dir, f))), 'the zip is up to date: ' + f + ' (run sh build-scorm.sh)');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8'); for (const m of html.matchAll(/(?:src|href)="((?:js|css)\/[^"]+)"/g)) expect(files.includes(m[1]), 'index.html only uses packaged files: ' + m[1]);
expect(html.indexOf('js/scorm.js') < html.indexOf('js/assignment.js'), 'scorm.js loads before assignment.js');

(async () => {
  const browser = await chromium.launch(); const errors = [];
  let lmsPage = '';
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  const server = http.createServer((req, res) => { const u = req.url.split('?')[0]; if (u === '/lms') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(lmsPage); return; } const fp = path.join(dir, path.normalize(u)); if (!fp.startsWith(dir) || !fs.existsSync(fp)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(fp)] || 'application/octet-stream' }); res.end(fs.readFileSync(fp)); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + server.address().port;
  const lms = (stored) => '<script>var store=' + JSON.stringify(stored) + ';var calls=[];window.API={LMSInitialize:function(){calls.push(["init"]);return "true"},LMSGetValue:function(k){return store[k]||""},LMSSetValue:function(k,v){store[k]=String(v);calls.push(["set",k,String(v)]);return "true"},LMSCommit:function(){calls.push(["commit"]);return "true"},LMSFinish:function(){calls.push(["finish"]);return "true"},LMSGetLastError:function(){return "0"},LMSGetErrorString:function(){return ""},LMSGetDiagnostic:function(){return ""}};</script><iframe id="sco" src="index.html" style="width:1280px;height:900px;border:0"></iframe>';
  const start = async (stored) => { lmsPage = lms(stored || {}); const page = await browser.newPage({ viewport: { width: 1300, height: 940 } }); page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('dialog', (d) => d.accept()); await page.goto(base + '/lms'); await page.waitForTimeout(400); return page; };
  let page = await start(); let f = page.frameLocator('#sco'); const fr = () => page.frames().find((x) => x.url().endsWith('index.html'));
  const store = () => page.evaluate(() => store), calls = () => page.evaluate(() => calls);
  const sco = (fn, a) => fr().evaluate(fn, a);
  const card = () => f.locator('.prob');
  const answer = async (i) => { const k = await sco((i) => { const p = MolePractice.set[i]; return p.type === 'conv' ? { t: 'c', a: p.answer.fmt.text } : p.type === 'lab' ? { t: 'l', v: [p.d.fe, p.d.oxide, p.d.o, p.want.fe, p.want.o, p.formula] } : { t: 'f', e: p.empirical, m: p.molecular }; }, i);
    if (k.t === 'c') await card().locator('.pc-in').fill(plain(k.a)); else if (k.t === 'l') for (let j = 0; j < 6; j++) await card().locator('.pc-in').nth(j).fill(String(k.v[j])); else { await card().locator('.pc-in').nth(0).fill(k.e); await card().locator('.pc-in').nth(1).fill(k.m); }
    await card().locator('[data-act=check]').click(); };

  /* ---- starting ---- */
  expect((await calls())[0][0] === 'init' && (await store())['cmi.core.lesson_status'] === 'incomplete', 'on opening, the page reports "incomplete"');
  expect((await f.locator('#newSet').isHidden()), 'inside a class there is no "New set" button');
  const seed = await sco(() => MolePractice.state.seed);
  expect(/^✔ Saved to your class at /.test(await f.locator('#saved').innerText()), 'the page shows "Saved to your class" with the time');

  /* ---- progress and score ---- */
  await answer(0); await card().locator('[data-act=next]').click();
  let s1 = await store(); expect(s1['cmi.core.score.raw'] === '8' && s1['cmi.core.lesson_status'] === 'incomplete', 'after 1 correct of 13 the score is 8 and the lab is still incomplete (' + s1['cmi.core.score.raw'] + ')');
  expect(JSON.parse(s1['cmi.suspend_data']).s === seed && s1['cmi.core.lesson_location'] === '1', 'the set number and current problem are stored in suspend_data and lesson_location');
  expect(s1['cmi.suspend_data'].length < 4096, 'suspend_data is within the SCORM 1.2 limit (' + s1['cmi.suspend_data'].length + ' chars)');
  /* a wrong answer and typed text are saved too */
  await card().locator('.pc-in').fill('12345'); await card().locator('[data-act=check]').click(); await card().locator('.pc-in').fill('678');
  /* Save progress button */
  const before = (await calls()).filter((c) => c[0] === 'commit').length; await f.locator('#saveBtn').click();
  expect((await f.locator('#saved').innerText()).includes('Progress saved to your class') && (await calls()).filter((c) => c[0] === 'commit').length > before, 'the Save progress button commits to the class and confirms it');
  const mid = await store(); const w = JSON.parse(mid['cmi.suspend_data']).i[1]; expect(w[0] === 1 && w[2][0] === '678', 'the unfinished problem\u2019s tries and typed answer are saved');
  await page.close();

  /* ---- coming back ---- */
  page = await start(mid); f = page.frameLocator('#sco');
  expect((await sco(() => MolePractice.state.seed)) === seed && (await sco(() => MolePractice.state.cur)) === 1, 'resuming gives the same set and the same problem');
  expect((await card().locator('.pc-in').inputValue()) === '678' && (await card().locator('.ptag').innerText()).includes('1 try'), 'the typed answer and the try count come back');
  expect((await f.locator('.dot.solved').count()) === 1 && (await f.locator('#score').innerText()).startsWith('1 / 13'), 'the finished problem is still counted');
  expect((await f.locator('#newSet').isHidden()), 'the New set button stays hidden when resuming');
  expect((await store())['cmi.core.lesson_status'] === 'incomplete', 'resuming does not complete anything');

  /* ---- using the solution on problem 2: it does not count, a similar problem takes its place ---- */
  for (let k = 0; k < 3; k++) { await card().locator('.pc-in').fill(String(99999 + k)); await card().locator('[data-act=check]').click(); }
  const orig = await card().locator('.pc-q').innerText();
  await card().locator('[data-act=reveal]').click();
  let sh = await store(); const shItem = JSON.parse(sh['cmi.suspend_data']).i[1];
  expect(shItem[1] === 2 && sh['cmi.core.score.raw'] === '8' && sh['cmi.core.lesson_status'] === 'incomplete', 'showing the solution is saved as "shown" and earns no score or completion (score ' + sh['cmi.core.score.raw'] + ')');
  await page.close(); page = await start(sh); f = page.frameLocator('#sco');
  expect((await card().getAttribute('class')).includes('shown') && (await card().locator('[data-act=next]').count()) === 0, 'resuming at a shown solution still offers only "Try a similar problem"');
  await card().locator('[data-act=retry]').click();
  const q1 = await card().locator('.pc-q').innerText(); const saved1 = JSON.parse((await store())['cmi.suspend_data']).i[1];
  expect(q1 !== orig && saved1[1] === 0 && saved1[5] === 1 && saved1[6] === 1, 'a similar problem replaces it, and the number of similar problems and solutions shown is saved');
  const st1 = await store(); await page.close(); page = await start(st1); f = page.frameLocator('#sco');
  expect((await card().locator('.pc-q').innerText()) === q1 && (await card().locator('.similar').count()) === 1, 'resuming gives the same similar problem');
  expect((await store())['cmi.core.lesson_status'] === 'incomplete', 'still incomplete while problem 2 is open');
  await answer(1); expect((await store())['cmi.core.score.raw'] === '15' && (await store())['cmi.core.lesson_status'] === 'incomplete', 'the similar problem counts as problem 2: score 15 (2 of 13)'); await card().locator('[data-act=next]').click();
  for (let i = 2; i < 13; i++) { expect((await sco(() => MolePractice.state.cur)) === i, 'on problem ' + (i + 1)); expect((await store())['cmi.core.lesson_status'] === 'incomplete', 'still incomplete before problem ' + (i + 1) + ' is finished'); await answer(i); await card().locator('[data-act=next]').click(); }
  await f.locator('#finish').waitFor();
  const s2 = await store(); expect(s2['cmi.core.lesson_status'] === 'completed', 'all 13 answered correctly: "completed" (' + s2['cmi.core.lesson_status'] + ')');
  expect(s2['cmi.core.score.raw'] === '100', 'all 13 done: score 100 (' + s2['cmi.core.score.raw'] + ')');
  expect((await f.locator('#finish').innerText()).includes('reported to your class') && (await f.locator('#againBtn').count()) === 0, 'the results say completion was reported, and offer no new set');
  const c = await calls(); expect(c.findIndex((x) => x[1] === 'cmi.core.lesson_status' && x[2] === 'completed') < c.map((x) => x[0]).lastIndexOf('commit'), 'the completion is committed straight away');
  await sco(() => MoleScorm.finish()); const s3 = await store(); expect((await calls()).some((x) => x[0] === 'finish') && /^\d\d:\d\d:\d\d$/.test(s3['cmi.core.session_time']), 'on leaving, the session time is sent and the session is finished');
  await page.close();

  /* ---- a completed attempt is shown as completed, never downgraded ---- */
  page = await start(s3); f = page.frameLocator('#sco');
  expect((await sco(() => MolePractice.state.cur)) === 13 && await f.locator('#finish').isVisible() && (await f.locator('#finish .big').innerText()).trim() === '11 / 13', 'a returning student sees their results (11 / 13 first try)');
  await f.locator('.dot[data-go="0"]').click(); await f.locator('#saveBtn').click();
  expect((await store())['cmi.core.lesson_status'] === 'completed' && (await store())['cmi.core.score.raw'] === '100', 'revisiting a problem never sets a completed lab back to incomplete or lowers the score');
  await page.close();

  /* ---- bad or old saved data is ignored ---- */
  page = await start({ 'cmi.suspend_data': '{"v":1,"junk":true}' }); f = page.frameLocator('#sco');
  expect((await f.locator('.prob').count()) === 1 && (await sco(() => MolePractice.state.cur)) === 0, 'unreadable saved data starts a fresh set instead of breaking');
  await page.close();

  /* ---- size: even worst-case answers fit ---- */
  page = await start(); f = page.frameLocator('#sco');
  const len = await sco(() => { const st = MolePractice.state; st.items.forEach((it) => { it.tries = 3; it.status = 'solved'; it.vals = it.vals.map(() => '1234567890'.repeat(5)); it.fok = [1, 1, 1, 1, 1, 1]; it.showSol = true; }); return MolePractice.encode().length; });
  expect(len <= 4000, 'worst-case answers still fit in suspend_data (' + len + ' chars)');
  await page.close();

  /* ---- no learning system: the page still works and saves in the browser ---- */
  page = await browser.newPage({ viewport: { width: 1200, height: 900 } }); page.on('pageerror', (e) => errors.push(e.message)); await page.goto(base + '/index.html'); await page.evaluate(() => localStorage.clear()); await page.goto(base + '/index.html'); await page.waitForTimeout(300);
  expect(await page.evaluate(() => MoleScorm.connected === false) && !(await page.locator('#newSet').isHidden()), 'opened on its own, the page runs without a learning system and keeps "New set"');
  expect(/^✔ Saved on this device at /.test(await page.locator('#saved').innerText()), 'standalone it says "Saved on this device"');
  const ans0 = await page.evaluate(() => MolePractice.set[0].answer.fmt.text); await page.locator('.pc-in').fill(plain(ans0)); await page.locator('[data-act=check]').click(); await page.locator('#saveBtn').click();
  expect((await page.locator('#saved').innerText()).includes('Progress saved on this device'), 'the Save progress button confirms saving on this device');
  await page.reload(); await page.waitForTimeout(200); expect((await page.locator('.dot.solved').count()) === 1, 'a reload brings the progress back');
  await page.close();
  expect(errors.length === 0, 'JavaScript errors: ' + [...new Set(errors)].slice(0, 3).join(' | '));
  await browser.close(); server.close();
  if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
  console.log('scorm: all ' + checks + ' checks passed');
})();
