/* tests/ui.test.js: works a whole set in a real browser (needs Playwright).
 *   node simulations/mole-conversions-practice/tests/ui.test.js */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); } catch (e2) { console.error('Playwright is not installed; skipping.'); process.exit(0); } }
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
const problems = []; let checks = 0; const expect = (c, m) => { checks++; if (!c) problems.push(m); };
const plain = (t) => t.replace(' × 10', 'e').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, (c) => '0123456789-'['⁰¹²³⁴⁵⁶⁷⁸⁹⁻'.indexOf(c)]);

(async () => {
  const browser = await chromium.launch(); const errors = [];
  const open = async (q, w) => { const page = await browser.newPage({ viewport: { width: w || 1280, height: 900 } }); page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('dialog', (d) => d.accept()); await page.goto(URL + (q || '')); await page.waitForTimeout(150); return page; };
  let page = await open('?set=24680');
  const keys = () => page.evaluate(() => MolePractice.set.map((p) => (p.type === 'conv' ? { t: 'c', a: p.answer.fmt.text, v: p.answer.value } : { t: 'f', e: p.empirical, m: p.molecular, mult: p.mult })));
  const K = await keys();
  expect((await page.locator('.prob').count()) === 8 && (await page.locator('#setNo').innerText()) === 'Set #24680', 'eight problems, and ?set= picks the set');
  expect((await page.locator('#score').innerText()).startsWith('0 / 8') && (await page.locator('.dot').count()) === 8, 'the header shows 0 / 8 and eight dots');
  expect((await page.locator('#ref').innerText()).includes('6.022') && (await page.locator('#ref .masses span').count()) >= 4, 'the reference box lists the constants and the atomic masses needed');
  const card = (i) => page.locator('#p' + (i + 1));
  /* problem 1: gates, wrong answers, hints, then right */
  expect(await card(0).locator('[data-a=hint]').isDisabled() && await card(0).locator('[data-a=reveal]').isDisabled(), 'hint and solution are locked before the first try');
  await card(0).locator('.pc-in').fill('banana'); await card(0).locator('[data-a=check]').click();
  expect((await card(0).locator('.pc-fb').getAttribute('class')).includes('bad') && (await page.evaluate(() => MolePractice.state.items[0].tries)) === 0, 'nonsense is not counted as a try');
  await card(0).locator('.pc-in').fill(String(K[0].v * 2.9)); await card(0).locator('.pc-in').press('Enter');
  expect((await card(0).locator('.pc-fb').getAttribute('class')).includes('no') && (await card(0).locator('.ptag').innerText()).includes('1 try'), 'a wrong answer is marked wrong and counted (Enter works)');
  await card(0).locator('[data-a=hint]').click(); const h1 = await card(0).locator('.pc-hint .st-step').count(); expect(h1 >= 1 && (await card(0).locator('.hint-label').innerText()).toLowerCase().includes('hint 1'), 'hint 1 appears after one try (' + h1 + ' steps)');
  await card(0).locator('.pc-in').fill(String(K[0].v * 0.31)); await card(0).locator('[data-a=check]').click(); await card(0).locator('[data-a=hint]').click();
  expect((await card(0).locator('.hint-label').innerText()).toLowerCase().includes('hint 2') && (await card(0).locator('.pc-hint .st-step').count()) > h1, 'hint 2 shows the setup after two tries');
  expect(!(await card(0).locator('.pc-hint').innerText()).includes(K[0].a), 'the hints do not give away the answer');
  await card(0).locator('.pc-in').fill(plain(K[0].a)); await card(0).locator('[data-a=check]').click();
  expect((await card(0).getAttribute('class')).includes('solved') && (await card(0).locator('.ptag').innerText()).includes('3 tries') && await card(0).locator('.pc-in').isDisabled(), 'the right answer solves and locks the problem');
  await card(0).locator('[data-a=sol]').click(); expect((await card(0).locator('.sol .st-step').count()) >= 5, 'a solved problem can show its worked solution');
  /* problem 2: three misses, then reveal (no credit) */
  for (let k = 0; k < 3; k++) { await card(1).locator('.pc-in').fill(String(K[1].v * (5 + k))); await card(1).locator('[data-a=check]').click(); }
  await card(1).locator('[data-a=reveal]').click();
  expect((await card(1).getAttribute('class')).includes('revealed') && (await card(1).locator('.sol .st-step').count()) >= 5 && (await card(1).locator('.ptag').innerText()).includes('no credit'), 'after 3 tries the solution can be shown, with no credit');
  /* problems 3-6 first try */
  for (let i = 2; i < 6; i++) { await card(i).locator('.pc-in').fill(plain(K[i].a)); await card(i).locator('[data-a=check]').click(); expect((await card(i).locator('.ptag').innerText()).includes('first try'), 'problem ' + (i + 1) + ' accepts its key answer ' + K[i].a); }
  /* formula problems */
  expect(K[6].t === 'f' && K[6].mult === 1 && K[7].mult === 2, 'problem 7 is a whole-number ratio and problem 8 needs ×2');
  const fin = (i) => card(i).locator('.pc-in');
  await fin(6).nth(0).fill(K[6].e); await card(6).locator('[data-a=check]').click(); expect((await card(6).locator('.pc-fb').innerText()).includes('both'), 'both formulas are required');
  await fin(6).nth(1).fill(K[6].e); await card(6).locator('[data-a=check]').click(); expect((await card(6).locator('.pc-fb').innerText()).includes('(a) ✔') && (await card(6).locator('.pc-fb').innerText()).includes('n = molar mass'), 'empirical right, molecular wrong: each part gets its own feedback');
  expect((await card(6).locator('.mk').first().innerText()).includes('='), 'typed formulas are previewed with subscripts');
  await fin(6).nth(1).fill(K[6].m); await card(6).locator('[data-a=check]').click(); expect((await card(6).getAttribute('class')).includes('solved'), 'problem 7 solved with ' + K[6].e + ' / ' + K[6].m);
  const rounded = await page.evaluate(() => { const p = MolePractice.set[7], r = p.built.res.ratios; return p.built.pairs.map((x, i) => x.el + (Math.ceil(Math.round(r[i] * 2) / 2) > 1 ? Math.ceil(Math.round(r[i] * 2) / 2) : '')).join(''); });
  await fin(7).nth(0).fill(rounded); await fin(7).nth(1).fill(rounded); await card(7).locator('[data-a=check]').click(); expect((await card(7).locator('.pc-fb').innerText()).includes('multiply'), 'rounding 1.5 (' + rounded + ') is diagnosed');
  await fin(7).nth(0).fill(K[7].e); await fin(7).nth(1).fill(K[7].m); await card(7).locator('[data-a=check]').click();
  /* results */
  await page.waitForTimeout(200);
  expect(await page.locator('#finish').isVisible() && (await page.locator('#finish .big').innerText()).trim() === '7 / 8' && (await page.locator('#score').innerText()).startsWith('7 / 8'), 'the results show 7 / 8');
  expect((await page.locator('#finish .res tr').count()) === 9 && (await page.locator('.dot.solved').count()) === 7 && (await page.locator('.dot.revealed').count()) === 1, 'the results table and the dots match');
  await page.fill('#nameIn', 'Test Student'); await page.reload(); await page.waitForTimeout(150);
  expect((await page.locator('#finish .big').innerText()).trim() === '7 / 8' && (await page.inputValue('#nameIn')) === 'Test Student' && (await page.locator('#setNo').innerText()) === 'Set #24680', 'a reload keeps the set, the work and the name');
  expect(!/NaN(?![A-Za-z])|undefined/.test(await page.locator('body').innerText()), 'no NaN or undefined anywhere');
  await page.click('#againBtn'); await page.waitForTimeout(150);
  expect((await page.locator('#setNo').innerText()) !== 'Set #24680' && (await page.locator('#score').innerText()).startsWith('0 / 8') && !(await page.locator('#finish').isVisible()), '"Try a new set" starts a different, fresh set');
  await page.close();
  /* two fresh visitors get different sets; phone layout */
  const a = await open(''), b = await open(''); await a.evaluate(() => localStorage.clear()); await a.reload(); const s1 = await a.locator('#setNo').innerText(); await b.evaluate(() => localStorage.clear()); await b.reload(); const s2 = await b.locator('#setNo').innerText();
  expect(/^Set #\d{5}$/.test(s1) && s1 !== s2, 'new visitors get their own random set (' + s1 + ', ' + s2 + ')'); await a.close(); await b.close();
  page = await open('?set=13579', 390); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'nothing runs off the side of a phone screen'); await page.close();
  expect(errors.length === 0, 'JavaScript errors: ' + [...new Set(errors)].slice(0, 3).join(' | '));
  await browser.close();
  if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
  console.log('ui: all ' + checks + ' checks passed');
})();
