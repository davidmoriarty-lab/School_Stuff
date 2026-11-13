/* tests/ui.test.js: works a whole set in a real browser, one problem at a time (needs Playwright).
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
  const K = await page.evaluate(() => MolePractice.set.map((p) => (p.type === 'conv' ? { t: 'c', a: p.answer.fmt.text, v: p.answer.value, from: p.from, to: p.to, label: p.label } : p.type === 'lab' ? { t: 'l', d: p.d, want: p.want, f: p.formula } : { t: 'f', e: p.empirical, m: p.molecular, mult: p.mult })));
  const card = () => page.locator('.prob');
  const cur = () => page.evaluate(() => MolePractice.state.cur);
  const ans = async (v) => { await card().locator('.pc-in').first().fill(String(v)); await card().locator('[data-act=check]').click(); };
  expect((await page.locator('.prob').count()) === 1 && (await page.locator('#setNo').innerText()) === 'Set #24680' && (await page.locator('.dot').count()) === 13, 'one problem on screen, thirteen dots, and ?set= picks the set');
  expect((await card().locator('.pc-skill').innerText()).toLowerCase().includes('problem 1 of 13') && (await page.locator('#score').innerText()).startsWith('0 / 13'), 'the problem says "Problem 1 of 13"; score 0 / 13');
  expect((await card().locator('button:has-text("Hint")').count()) === 0 && !(await page.locator('body').innerText()).toLowerCase().includes('hint'), 'there are no hints anywhere');
  expect((await page.locator('.dot:not([disabled])').count()) === 1, 'later problems are locked');
  /* problem 1: wrong answers, gate, then right */
  expect(await card().locator('[data-act=reveal]').isDisabled() && (await card().locator('.gate').innerText()).includes('after 3 wrong attempts'), 'the solution button is locked and says why');
  await card().locator('.pc-in').fill('banana'); await card().locator('[data-act=check]').click();
  expect((await card().locator('.pc-fb').getAttribute('class')).includes('bad') && (await page.evaluate(() => MolePractice.state.items[0].tries)) === 0, 'nonsense is not counted as an attempt');
  await ans(K[0].v * 2.9); expect((await card().locator('.pc-fb').getAttribute('class')).includes('no') && (await card().locator('.ptag').innerText()).includes('1 try') && await card().locator('[data-act=reveal]').isDisabled() && (await card().locator('.gate').innerText()).includes('2 more'), 'attempt 1: marked wrong, still locked (2 more)');
  await ans(K[0].v * 0.31); expect(await card().locator('[data-act=reveal]').isDisabled(), 'attempt 2: still locked');
  await ans(plain(K[0].a)); expect((await card().getAttribute('class')).includes('solved') && (await card().locator('.ptag').innerText()).includes('3 tries') && await card().locator('.pc-in').isDisabled(), 'the right answer solves and locks the problem');
  expect((await page.locator('#score').innerText()).startsWith('1 / 13') && (await cur()) === 0, 'score 1 / 13; stays on the problem until Next');
  await card().locator('[data-act=sol]').click(); expect((await card().locator('.sol .st-step').count()) >= 5, 'a finished problem can show its worked solution');
  await card().locator('[data-act=next]').click();
  expect((await cur()) === 1 && (await card().locator('.pc-skill').innerText()).toLowerCase().includes('problem 2 of 13') && (await page.locator('.prob').count()) === 1, 'Next shows only problem 2');
  /* going back */
  await page.locator('.dot[data-go="0"]').click(); expect((await cur()) === 0 && await card().locator('.pc-in').isDisabled(), 'a finished problem can be revisited with the dots');
  expect(await page.locator('.dot[data-go="5"]').isDisabled(), 'problems ahead stay locked'); await page.locator('.dot[data-go="1"]').click();
  /* problem 2: three misses, then the solution: it does not count, and a similar problem takes its place */
  for (let k = 0; k < 3; k++) await ans(K[1].v * (5 + k));
  expect(!(await card().locator('[data-act=reveal]').isDisabled()), 'after 3 wrong attempts the solution unlocks');
  const orig2 = await card().locator('.pc-q').innerText();
  await card().locator('[data-act=reveal]').click();
  expect((await card().getAttribute('class')).includes('shown') && (await card().locator('.sol .st-step').count()) >= 5 && (await card().locator('.ptag').innerText()).includes('does not count'), 'showing the solution works, and says it does not count');
  expect((await card().locator('[data-act=next]').count()) === 0 && (await card().locator('[data-act=retry]').count()) === 1 && (await card().locator('.gate').innerText()).includes('does not count'), 'there is no Next button: only "Try a similar problem"');
  expect((await page.locator('#score').innerText()).startsWith('1 / 13') && (await page.locator('.dot.shown').count()) === 1 && (await page.locator('.dot:not([disabled])').count()) === 2, 'the problem is not counted, and later problems stay locked');
  await page.locator('.dot[data-go="0"]').click(); await page.locator('.dot[data-go="1"]').click(); expect((await card().getAttribute('class')).includes('shown'), 'leaving and coming back keeps the shown state');
  await card().locator('[data-act=retry]').click();
  const sim2 = await card().locator('.pc-q').innerText();
  expect(sim2 !== orig2 && (await card().locator('.pc-skill').innerText()).toLowerCase().includes('problem 2 of 13') && (await card().locator('.pc-skill').innerText()).toLowerCase().includes('similar') && (await card().locator('.similar').count()) === 1, 'a similar problem replaces it, still problem 2 of 13');
  expect((await card().locator('.pc-in').first().isEnabled()) && (await card().locator('.ptag').count()) === 0 && (await card().locator('.pc-skill').innerText()).toLowerCase().includes((K[1].label || '').toLowerCase()), 'the similar problem starts fresh with the same kind of conversion');
  const K2 = await page.evaluate(() => { const p = MolePractice.set[1]; return { a: p.answer.fmt.text, f: p.formula, v: p.answer.value, from: p.from, to: p.to }; });
  expect(K2.from === K[1].from && K2.to === K[1].to && plain(K2.a) !== plain(K[1].a), 'same conversion (' + K2.from + ' to ' + K2.to + '), new answer');
  await ans(plain(K2.a)); expect((await card().getAttribute('class')).includes('solved') && (await page.locator('#score').innerText()).startsWith('2 / 13'), 'getting the similar problem right counts as problem 2');
  await card().locator('[data-act=next]').click();
  /* problems 3-10 first try */
  for (let i = 2; i < 10; i++) { expect((await cur()) === i, 'on problem ' + (i + 1)); await ans(plain(K[i].a)); expect((await card().locator('.ptag').innerText()).includes('first try'), 'problem ' + (i + 1) + ' accepts its key answer ' + K[i].a); await card().locator('[data-act=next]').click(); }
  /* formula problems */
  expect(K[10].t === 'f' && K[10].mult === 1 && K[11].mult === 2, 'problem 11 is a whole-number ratio and problem 12 needs x2');
  const fin = () => card().locator('.pc-in');
  await fin().nth(0).fill(K[10].e); await card().locator('[data-act=check]').click(); expect((await card().locator('.pc-fb').innerText()).includes('both'), 'both formulas are required');
  await fin().nth(1).fill(K[10].e); await card().locator('[data-act=check]').click(); expect((await card().locator('.pc-fb').innerText()).includes('(a) ✔') && (await card().locator('.pc-fb').innerText()).includes('n = molar mass'), 'empirical right, molecular wrong: each part gets feedback');
  expect((await card().locator('.mk').first().innerText()).includes('='), 'typed formulas are previewed with subscripts');
  await fin().nth(1).fill(K[10].m); await card().locator('[data-act=check]').click(); expect((await card().getAttribute('class')).includes('solved'), 'problem 11 solved with ' + K[10].e + ' / ' + K[10].m); await card().locator('[data-act=next]').click();
  const rounded = await page.evaluate(() => { const p = MolePractice.set[11], r = p.built.res.ratios; return p.built.pairs.map((x, i) => x.el + (Math.ceil(Math.round(r[i] * 2) / 2) > 1 ? Math.ceil(Math.round(r[i] * 2) / 2) : '')).join(''); });
  await fin().nth(0).fill(rounded); await fin().nth(1).fill(rounded); await card().locator('[data-act=check]').click(); expect((await card().locator('.pc-fb').innerText()).includes('multiply'), 'rounding 1.5 (' + rounded + ') is diagnosed');
  await fin().nth(0).fill(K[11].e); await fin().nth(1).fill(K[11].m); await card().locator('[data-act=check]').click();
  await card().locator('[data-act=next]').click();
  /* problem 13: the iron oxide lab, answered a part at a time */
  const L = K[12], lab = (k) => card().locator('.pc-in').nth(k), labCheck = () => card().locator('[data-act=check]').click();
  expect(L.t === 'l' && (await card().locator('.labt tr').count()) === 5 && (await card().locator('.pc-in').count()) === 6, 'problem 13 shows a 5-row data table and six answer boxes');
  expect((await card().innerText()).includes(L.d.empty.toFixed(2)) && (await card().innerText()).includes(L.d.final.toFixed(2)), 'the table holds this student\u2019s own numbers');
  await lab(0).fill(String(L.d.cFe)); await labCheck();
  expect((await card().locator('[data-lmsg="0"]').innerText()).includes('together') && (await card().locator('.ptag').innerText()).includes('1 try'), 'part (a): giving the crucible + iron total is diagnosed and counted');
  await lab(0).fill(String(L.d.fe)); await lab(1).fill(String(L.d.oxide)); await labCheck();
  expect(await lab(0).isDisabled() && await lab(1).isDisabled() && (await card().locator('.lmark').first().innerText()).includes('\u2714') && (await card().locator('.ptag').innerText()).includes('1 try'), 'correct parts lock with a check mark, and a correct partial check costs no attempt');
  await lab(2).fill(String(L.d.o)); await lab(3).fill(String(L.d.fe * 55.85)); await lab(4).fill(L.want.o.toPrecision(3)); await lab(5).fill(L.f); await labCheck();
  expect((await card().locator('[data-lmsg="3"]').innerText()).includes('multiplied') && !(await card().getAttribute('class')).includes('solved') && (await card().locator('.pc-fb').innerText()).includes('5 of 6'), 'one wrong part keeps the problem open: 5 of 6 correct');
  await lab(3).fill(L.want.fe.toPrecision(3)); await labCheck();
  expect((await card().getAttribute('class')).includes('solved') && (await card().locator('[data-act=sol]').count()) === 1, 'all six parts correct solves problem 13');
  await card().locator('[data-act=sol]').click(); expect((await card().locator('.sol .st-step').count()) >= 6 && (await card().locator('.sol').innerText()).includes('Subtract'), 'the lab solution begins with the subtraction step');
  expect((await card().locator('[data-act=next]').innerText()).includes('See my results'), 'the last problem offers "See my results"'); await card().locator('[data-act=next]').click(); await page.waitForTimeout(150);
  /* results */
  expect(await page.locator('#finish').isVisible() && (await page.locator('.prob').count()) === 0 && (await page.locator('#finish .big').innerText()).trim() === '8 / 13' && (await page.locator('#finish').innerText()).includes('1 needed a similar problem'), 'the results show 8 / 13 correct on the first try, and 1 similar problem');
  expect((await page.locator('#finish .res tr').count()) === 14 && (await page.locator('.dot.solved').count()) === 13 && (await page.locator('.dot.shown').count()) === 0 && (await page.locator('#finish .res').innerText()).includes('correct after 1 solution shown'), 'the results table and the dots match: all 13 done, one after a solution');
  await page.fill('#nameIn', 'Test Student'); await page.reload(); await page.waitForTimeout(150);
  expect((await page.locator('#finish .big').innerText()).trim() === '8 / 13' && (await page.inputValue('#nameIn')) === 'Test Student' && (await page.locator('#setNo').innerText()) === 'Set #24680', 'a reload keeps the set, the work and the name');
  expect(!/NaN(?![A-Za-z])|undefined/.test(await page.locator('body').innerText()), 'no NaN or undefined anywhere');
  await page.click('#againBtn'); await page.waitForTimeout(150);
  expect((await page.locator('#setNo').innerText()) !== 'Set #24680' && (await page.locator('#score').innerText()).startsWith('0 / 13') && !(await page.locator('#finish').isVisible()) && (await cur()) === 0, '"Try a new set" starts a different, fresh set');
  await page.close();
  /* a reload in the middle comes back to the same problem */
  page = await open('?set=777'); const K7 = await page.evaluate(() => MolePractice.set.map((p) => p.type === 'conv' ? p.answer.fmt.text : '')); await ans(plain(K7[0])); await card().locator('[data-act=next]').click(); await page.reload(); await page.waitForTimeout(150);
  expect((await cur()) === 1 && (await card().locator('.pc-skill').innerText()).toLowerCase().includes('problem 2 of 13'), 'a reload in the middle returns to the problem you were on'); await page.close();
  const a = await open(''), b = await open(''); await a.evaluate(() => localStorage.clear()); await a.reload(); const s1 = await a.locator('#setNo').innerText(); await b.evaluate(() => localStorage.clear()); await b.reload(); const s2 = await b.locator('#setNo').innerText();
  expect(/^Set #\d{5}$/.test(s1) && s1 !== s2, 'new visitors get their own random set (' + s1 + ', ' + s2 + ')'); await a.close(); await b.close();
  page = await open('?set=13579', 390); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'nothing runs off the side of a phone screen'); await page.screenshot({ path: path.join(require('os').tmpdir(), 'mole-phone.png') }); await page.close();
  expect(errors.length === 0, 'JavaScript errors: ' + [...new Set(errors)].slice(0, 3).join(' | '));
  await browser.close();
  if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
  console.log('ui: all ' + checks + ' checks passed');
})();
