/* tests/scorm.test.js: runs the lab inside a pretend learning system and checks what it is told.
 *   node simulations/buffers-lab/tests/scorm.test.js      (needs Playwright; run build-scorm.sh first) */
const path = require('path'), fs = require('fs'), http = require('http'), { execSync } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); } catch (e2) { console.error('Playwright is not installed; skipping.'); process.exit(0); } }
const problems = []; let checks = 0; const expect = (c, m) => { checks++; if (!c) problems.push(m); };
const dir = path.join(__dirname, '..'), zip = path.join(dir, 'dist', 'buffers-lab-scorm12.zip');

/* the package: manifest at the top level, every listed file present and identical to the source */
const list = execSync('unzip -Z1 "' + zip + '"').toString().trim().split('\n');
expect(list[0] === 'imsmanifest.xml' && !list.some((f) => f.startsWith('buffers-lab/')), 'imsmanifest.xml is at the top level of the zip');
const man = fs.readFileSync(path.join(dir, 'imsmanifest.xml'), 'utf8');
expect(/<schemaversion>1\.2<\/schemaversion>/.test(man) && /adlcp:scormtype="sco"/.test(man) && /href="index.html"/.test(man), 'the manifest declares a SCORM 1.2 SCO that starts at index.html');
const files = [...man.matchAll(/<file href="([^"]+)"/g)].map((m) => m[1]);
expect(files.length === 7 && files.every((f) => list.includes(f)), 'every file in the manifest is in the zip');
for (const f of files.concat('imsmanifest.xml')) expect(execSync('unzip -p "' + zip + '" "' + f + '"').equals(fs.readFileSync(path.join(dir, f))), 'the zip is up to date: ' + f);
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8'); for (const m of html.matchAll(/(?:src|href)="((?:js|css)\/[^"]+)"/g)) expect(files.includes(m[1]), 'index.html only uses packaged files: ' + m[1]);
expect(!/teacher|id="exact"/i.test(html), 'the teacher view is gone');

(async () => {
  const browser = await chromium.launch(); const errors = [];
  /* a learning system serves pages over http, so the test does too (browsers wall off file:// frames) */
  let lmsPage = '';
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  const server = http.createServer((req, res) => { const u = req.url.split('?')[0]; if (u === '/lms') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(lmsPage); return; } const fp = path.join(dir, path.normalize(u)); if (!fp.startsWith(dir) || !fs.existsSync(fp)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(fp)] || 'application/octet-stream' }); res.end(fs.readFileSync(fp)); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + server.address().port;
  /* a pretend learning system: index.html runs in a frame, the API lives on the parent page */
  const lms = (stored) => '<script>var store=' + JSON.stringify(stored) + ';var calls=[];window.API={LMSInitialize:function(){calls.push(["init"]);return "true"},LMSGetValue:function(k){return store[k]||""},LMSSetValue:function(k,v){store[k]=String(v);calls.push(["set",k,String(v)]);return "true"},LMSCommit:function(){calls.push(["commit"]);return "true"},LMSFinish:function(){calls.push(["finish"]);return "true"},LMSGetLastError:function(){return "0"},LMSGetErrorString:function(){return ""},LMSGetDiagnostic:function(){return ""}};</script><iframe id="sco" src="index.html" style="width:1500px;height:950px;border:0"></iframe>';
  const start = async (stored) => { lmsPage = lms(stored || {}); const page = await browser.newPage({ viewport: { width: 1520, height: 980 } }); page.on('pageerror', (e) => errors.push(e.message)); await page.goto(base + '/lms'); await page.waitForTimeout(400); return page; };
  let page = await start(); let f = page.frameLocator('#sco'); const fr = () => page.frames().find((x) => x.url().endsWith('index.html')); await fr().evaluate(() => { localStorage.clear(); }); await page.reload(); await page.waitForTimeout(400);
  const store = () => page.evaluate(() => store), calls = () => page.evaluate(() => calls);
  expect((await calls())[0][0] === 'init' && (await store())['cmi.core.lesson_status'] === 'incomplete', 'on opening, the lab reports "incomplete"');
  expect((await f.locator('#status').innerText()).includes('in progress'), 'the header shows "Lab in progress"');
  await f.locator('#gogglesBtn').click();
  /* do the lab quickly through the lab's own functions (the drag test covers the mouse) */
  await fr().evaluate(() => { const L = BufferLab; L.moveLiquid('acid', 'cyl50', 50); L.drop('cyl50', 'b1'); L.act('all'); L.drop('boat', 'balance'); L.tare(); L.S.boat.solid = 3.40; });
  await page.waitForTimeout(500); await fr().evaluate(() => { const L = BufferLab; L.drop('boat', 'b1'); L.drop('rod', 'b1'); }); await page.waitForTimeout(5200);
  await fr().evaluate(() => { BufferLab.act('done'); BufferLab.drop('probe', 'b1'); }); await page.waitForTimeout(5000);
  const s1 = await store(); expect(s1['cmi.core.score.raw'] === '25' && s1['cmi.core.lesson_status'] === 'incomplete', 'after Buffer 1 the score is 25 and the lab is still incomplete (' + s1['cmi.core.score.raw'] + ')');
  const ph1 = await fr().evaluate(() => BufferLab.S.last.b1);
  await fr().evaluate(() => { const L = BufferLab; L.drop('probe', 'rinse'); L.moveLiquid('acid', 'cyl50', 50); L.drop('cyl50', 'b2'); L.act('all'); L.moveLiquid('naoh', 'cyl50', 41.5); L.drop('cyl50', 'b2'); L.act('all'); L.drop('rod', 'b2'); }); await page.waitForTimeout(2600);
  await fr().evaluate(() => { BufferLab.act('done'); BufferLab.drop('probe', 'b2'); }); await page.waitForTimeout(5000);
  const ph2 = await fr().evaluate(() => BufferLab.S.last.b2);
  expect((await store())['cmi.core.score.raw'] === '50' && (await store())['cmi.core.lesson_status'] === 'incomplete', 'all 8 steps done but no data yet: score 50, still incomplete');
  await f.locator('[data-tab=data]').click();
  const fill = async (vals) => { for (const [k, v] of vals) await f.locator('[data-save=' + k + ']').fill(v); await f.locator('#checkData').click(); };
  const pe = (p) => (Math.abs(p - 4.75) / 4.75 * 100).toFixed(2);
  await fill([['d1acid', '50.0'], ['d2acid', '50.0'], ['d1mass', '9.99'], ['d2naoh', '41.5'], ['d1ph', String(ph1)], ['d2ph', String(ph2)], ['e1', pe(ph1)], ['e2', pe(ph2)]]);
  expect((await store())['cmi.core.lesson_status'] === 'incomplete' && (await store())['cmi.core.score.raw'] === '94', 'one wrong data entry: score 94, not complete (' + (await store())['cmi.core.score.raw'] + ')');
  await fill([['d1mass', '3.40']]);
  const s2 = await store(); expect(s2['cmi.core.lesson_status'] === 'completed' && s2['cmi.core.score.raw'] === '100', 'all steps + correct data: "completed" with a score of 100');
  expect((await f.locator('#status').innerText()).includes('Lab complete') && (await f.locator('#dataFb').innerText()).includes('reported to your class'), 'the student is told the lab is complete and reported');
  expect(JSON.parse(s2['cmi.suspend_data']).d1mass === '3.40', 'the notebook is stored with the learning system');
  const c = await calls(); expect(c.some((x) => x[0] === 'commit') && c.findIndex((x) => x[1] === 'cmi.core.lesson_status' && x[2] === 'completed') < c.map((x) => x[0]).lastIndexOf('commit'), 'the completion is committed straight away');
  /* leaving the page closes the session properly */
  await fr().evaluate(() => BufScorm.finish()); const s3 = await store(); expect((await calls()).some((x) => x[0] === 'finish') && /^\d\d:\d\d:\d\d$/.test(s3['cmi.core.session_time']), 'on leaving, the session time is sent and the session is finished (' + s3['cmi.core.session_time'] + ')');
  await page.close();
  /* coming back later: still complete, notebook restored, never downgraded */
  page = await start(s3); f = page.frameLocator('#sco'); await page.evaluate(() => 0);
  expect((await f.locator('#status').innerText()).includes('Lab complete'), 'a returning student still sees "Lab complete"');
  await f.locator('[data-tab=data]').click(); expect((await f.locator('[data-save=d1mass]').inputValue()) === '3.40', 'the notebook comes back from the learning system');
  await f.locator('#gogglesBtn').click(); await page.waitForTimeout(600); expect((await store())['cmi.core.lesson_status'] === 'completed' && (await store())['cmi.core.score.raw'] === '100', 'a completed lab is never set back to incomplete');
  await page.close();
  /* with no learning system the page still works */
  page = await browser.newPage(); page.on('pageerror', (e) => errors.push(e.message)); await page.goto('file://' + path.join(dir, 'index.html')); await page.waitForTimeout(300);
  expect(await page.evaluate(() => BufScorm.connected === false) && (await page.locator('#status').innerText()).includes('in progress'), 'opened on its own, the lab runs without a learning system');
  await page.close();
  expect(errors.length === 0, 'JavaScript errors: ' + errors.slice(0, 3).join(' | '));
  await browser.close(); server.close();
  if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
  console.log('scorm: all ' + checks + ' checks passed');
})();
