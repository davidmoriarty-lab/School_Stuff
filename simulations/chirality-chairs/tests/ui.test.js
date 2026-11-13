/* tests/ui.test.js: works a whole set in a real browser, with real mouse drags (needs Playwright).
 *   node simulations/chirality-chairs/tests/ui.test.js */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); } catch (e2) { console.error('Playwright is not installed; skipping.'); process.exit(0); } }
const SetMod = require('../js/set.js');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
const problems = []; let checks = 0; const expect = (c, m) => { checks++; if (!c) problems.push(m); };

/* a set whose second problem is the molecule with no chiral centers, so that path gets tested too */
let SEED = 0; for (let s = 5000; s < 9000 && !SEED; s++) if (SetMod.plan(s)[1].id === 'pentan3ol') SEED = s;

(async () => {
  const browser = await chromium.launch(); const errors = [];
  const open = async (q, w) => { const page = await browser.newPage({ viewport: { width: w || 1280, height: 950 } }); page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('dialog', (d) => d.accept()); await page.goto(URL + (q || '')); await page.evaluate(() => localStorage.clear()); await page.goto(URL + (q || '')); await page.waitForTimeout(150); return page; };
  let page = await open('?set=' + SEED);
  const ev = (fn, a) => page.evaluate(fn, a);
  const cur = () => ev(() => ChiralApp.state.cur), item = () => ev(() => ChiralApp.state.items[ChiralApp.state.cur]);
  const card = page.locator('.prob'), fb = () => card.locator('.pc-fb').innerText();
  const tries = async () => (await item()).tries;

  /* ---------- the page ---------- */
  expect((await page.locator('.dot').count()) === 12 && (await page.locator('.dot.chair').count()) === 4, 'twelve dots: eight chirality, four chair (square)');
  expect((await page.locator('#setNo').innerText()) === 'Set #' + SEED && (await page.locator('.prob').count()) === 1 && (await page.locator('#score').innerText()).startsWith('0 / 12'), 'set number, one problem on screen, 0 / 12');
  expect((await page.locator('.dot:not([disabled])').count()) === 1, 'later problems are locked');

  /* ---------- the pop-up window for one chiral center ---------- */
  const modal = page.locator('#modal');
  const modalOpen = async () => !(await modal.getAttribute('hidden') !== null);
  const slot = (id) => page.locator('.dlg .slot[data-gid="' + id + '"]');
  const truthInfo = (i) => ev((k) => { const d = ChiralApp.data[k]; return { centers: d.centers, order: d.centers.map((c) => Cip.truthOrder(d.mol, c)), cfg: d.centers.map((c) => d.cfg[c].config), carbons: d.mol.atoms.map((a, j) => [a.el, j]).filter((x) => x[0] === 'C').map((x) => x[1]), name: d.name }; }, i);
  /* answer one center like a student: open its window, number the groups in order, choose a letter, press Done */
  async function doCenter(atom, order, letter) {
    await card.locator('.atom[data-atom="' + atom + '"]').click(); await modal.waitFor({ state: 'visible' });
    await page.locator('.dlg [data-mact=clear]').click(); for (const id of order) await slot(id).click();
    await page.locator('[data-mcfg="' + letter + '"]').click(); await page.locator('[data-mact=done]').click(); await modal.waitFor({ state: 'hidden' });
  }
  async function solveChiral() {
    const k = await cur(), t = await truthInfo(k);
    if (!t.centers.length) await card.locator('[data-none]').check();
    else for (let n = 0; n < t.centers.length; n++) await doCenter(t.centers[n], t.order[n], t.cfg[n]);
    await card.locator('[data-act=check]').click();
  }

  /* ---------- problem 1: windows, wrong answers, the gate, the solution, a similar problem ---------- */
  const T0 = await truthInfo(0), center = T0.centers[0], notCenter = T0.carbons.find((c) => T0.centers.indexOf(c) < 0);
  expect(await card.locator('[data-act=reveal]').isDisabled() && (await card.locator('.gate').innerText()).includes('after 3 wrong attempts'), 'the solution is locked at first');
  await card.locator('[data-act=check]').click(); expect((await fb()).includes('Click a chiral center') && (await tries()) === 0, 'checking with nothing marked asks for an answer (not counted)');
  await card.locator('.atom[data-atom="' + center + '"]').click();
  expect(await modal.isVisible() && (await page.locator('.dlg h3').innerText()) === 'Chiral center 1' && (await page.locator('.dlg .slot').count()) === 4, 'clicking a center opens a window for that center, with its four groups to rank');
  expect((await page.locator('.dlg .mark.focus').count()) === 1 && (await page.locator('.dlg .slot.on').count()) === 0, 'the window highlights that one carbon and starts with no numbers');
  { const hz = await ev((c) => Cip.groups(ChiralApp.data[0].mol, c).find((x) => x.atom === null).v.z, center); const cls = await page.locator('.dlg .hbond').getAttribute('class'); expect((await page.locator('.dlg .hbond').count()) === 1 && cls.includes(hz < 0 ? 'dash' : 'wedge') && (await page.locator('.dlg .hbond').textContent()).trim() === 'H', 'the window draws the undrawn hydrogen as a ' + (hz < 0 ? 'dashed' : 'wedged') + ' bond to an H (' + cls + ')'); }
  await page.locator('[data-mact=done]').click(); expect((await page.locator('.dlg .pc-fb').innerText()).includes('all four groups') && await modal.isVisible(), 'Done is refused until all four groups are numbered');
  await slot(T0.order[0][0]).click(); await slot(T0.order[0][1]).click();
  expect((await page.locator('.dlg .slot.on').count()) === 2 && (await slot(T0.order[0][0]).textContent()).trim() === '1' && (await slot(T0.order[0][1]).textContent()).trim() === '2', 'clicking groups numbers them 1, 2 in the order clicked');
  await slot(T0.order[0][0]).click(); expect((await page.locator('.dlg .slot.on').count()) === 1 && (await slot(T0.order[0][1]).textContent()).trim() === '1', 'clicking a numbered group takes its number off and the rest move up');
  await page.locator('[data-mact=clear]').click(); expect((await page.locator('.dlg .slot.on').count()) === 0, '"Clear the numbers" removes them all');
  for (const id of T0.order[0]) await slot(id).click(); await page.locator('[data-mact=done]').click(); expect((await page.locator('.dlg .pc-fb').innerText()).includes('R or S'), 'Done is also refused until R or S is chosen');
  await page.keyboard.press('Escape'); expect(!(await modal.isVisible()), 'Esc closes the window');
  expect((await card.locator('.crow').count()) === 1 && (await card.locator('.cstat').innerText()).includes('still needed'), 'the center stays marked in the list, saying it still needs R/S');
  await card.locator('[data-act=check]').click(); expect((await fb()).includes('Finish chiral center 1') && (await tries()) === 0, 'checking with an unfinished center asks to finish it (not counted)');
  await card.locator('[data-remove="' + center + '"]').click(); expect((await card.locator('.crow').count()) === 0, 'the ✕ button takes a center off the list');
  /* a carbon that is not a chiral center: it has four groups, so the window opens; the check explains why it is not */
  await card.locator('.atom[data-atom="' + notCenter + '"]').click(); const gs = await ev((a) => Cip.groups(ChiralApp.data[0].mol, a).length, notCenter);
  if (gs === 4) { const ng = await ev((a) => Cip.groups(ChiralApp.data[0].mol, a).map((x) => x.id), notCenter); for (const id of ng) await slot(id).click(); await page.locator('[data-mcfg="R"]').click(); await page.locator('[data-mact=done]').click(); await card.locator('[data-act=check]').click();
    expect((await fb()).includes('not') && (await fb()).includes('chiral center') && (await card.locator('.mark.no').count()) === 1 && (await tries()) === 1, 'numbering a carbon that is not a chiral center is explained and circled in red (1 wrong try): ' + (await fb()).slice(0, 90)); await card.locator('[data-remove="' + notCenter + '"]').click(); }
  else { await page.locator('[data-mact=remove]').click(); }
  const t1 = await tries(); await card.locator('[data-none]').check(); await card.locator('[data-act=check]').click(); expect((await fb()).includes('does') && (await tries()) === t1 + 1, 'claiming "no chiral centers" on a molecule that has one is refused');
  await card.locator('[data-none]').uncheck();
  /* the right center and the right priorities, but the wrong letter */
  const wrong0 = T0.cfg[0] === 'R' ? 'S' : 'R'; await doCenter(center, T0.order[0], wrong0); await card.locator('[data-act=check]').click();
  expect((await fb()).includes('R/S is wrong') && (await tries()) === 3 && !(await card.locator('[data-act=reveal]').isDisabled()), 'right priorities with the wrong letter: "R/S is wrong"; after 3 wrong tries the solution unlocks');
  const nameBefore = T0.name; await card.locator('[data-act=reveal]').click();
  expect((await card.getAttribute('class')).includes('shown') && (await card.locator('.ptag').innerText()).includes('does not count') && (await card.locator('[data-act=next]').count()) === 0 && (await card.locator('.why').count()) === 1, 'showing the solution: marked "does not count", only "Try a similar problem", with the explanation');
  expect((await card.locator('.prio').count()) === 4 && (await card.locator('.why li').count()) >= 4, 'the drawing shows the priority numbers 1-4 and the explanation lists them');
  expect((await page.locator('#score').innerText()).startsWith('0 / 12') && (await page.locator('.dot.shown').count()) === 1, 'it is not counted');
  await card.locator('[data-act=retry]').click();
  const nameAfter = await ev(() => ChiralApp.data[0].name); expect(nameAfter !== nameBefore && (await card.locator('.similar').count()) === 1 && (await cur()) === 0, 'a similar problem (' + nameAfter + ') replaces ' + nameBefore + ' in spot 1');
  await solveChiral(); expect((await card.getAttribute('class')).includes('solved') && (await card.locator('.ptag').innerText()).includes('correct') && (await card.locator('.mark.ok').count()) >= 1, 'the similar problem, answered through the window, is correct');
  await card.locator('[data-act=next]').click();

  /* ---------- problem 2: no chiral centers ---------- */
  expect((await ev(() => ChiralApp.data[1].centers.length)) === 0, 'problem 2 is the molecule with no chiral centers');
  const T1 = await truthInfo(1), c2 = T1.carbons[2];
  await card.locator('.atom[data-atom="' + c2 + '"]').click(); const g2 = await ev((a) => Cip.groups(ChiralApp.data[1].mol, a).map((x) => x.id), c2);
  for (const id of g2) await slot(id).click(); await page.locator('[data-mcfg="S"]').click(); await page.locator('[data-mact=done]').click(); await card.locator('[data-act=check]').click();
  expect((await fb()).includes('two') && ((await fb()).includes('identical') || (await fb()).includes('hydrogen')), 'a carbon with two identical groups: explained (' + (await fb()).slice(0, 80) + ')');
  await card.locator('[data-remove="' + c2 + '"]').click(); await card.locator('[data-none]').check(); expect((await card.locator('.crow').count()) === 0, 'ticking "no chiral centers" with nothing marked');
  await card.locator('[data-act=check]').click(); expect((await card.getAttribute('class')).includes('solved') && (await page.locator('#score').innerText()).startsWith('2 / 12'), '"no chiral centers" is correct here: 2 / 12');
  await card.locator('[data-act=next]').click();

  /* ---------- problem 3: a carbon with a double bond, wrong priorities, a letter that disagrees with them ---------- */
  { const k = await cur(), t = await truthInfo(k), sp2 = await ev((i) => { const m = ChiralApp.data[i].mol; return m.atoms.map((a, j) => [a, j]).filter(([a, j]) => a.el === 'C' && Cip.groups(m, j).some((x) => x.order > 1)).map((x) => x[1])[0]; }, k);
    if (sp2 !== undefined) { await card.locator('.atom[data-atom="' + sp2 + '"]').click(); expect((await page.locator('.dlg').innerText()).includes('does not have four single-bonded groups') && (await page.locator('.dlg .slot').count()) === 0, 'a carbon with a double bond: the window says it cannot be a chiral center'); await page.locator('[data-mact=remove]').click(); expect((await card.locator('.crow').count()) === 0 && !(await modal.isVisible()), '"Take my mark off" removes it'); }
    const c = t.centers[0], bad = t.order[0].slice(); [bad[0], bad[1]] = [bad[1], bad[0]];
    const own = await ev(([a, o, i]) => Cip.configFromOrder(ChiralApp.data[i].mol, a, o), [c, bad, k]);
    await doCenter(c, bad, own === 'R' ? 'S' : 'R'); await card.locator('[data-act=check]').click();
    expect((await fb()).includes('priority order') && (await fb()).includes('does not match the order you numbered') && (await tries()) === 1, 'wrong priorities plus a letter that does not match them: both are pointed out');
    await doCenter(c, bad, own); await card.locator('[data-act=check]').click(); expect((await fb()).includes('priority order') && !(await fb()).includes('does not match') && (await tries()) === 2, 'wrong priorities with a consistent letter: only the priority order is flagged (and the answer is not revealed)');
    await card.locator('[data-edit="' + c + '"]').click(); expect((await page.locator('.dlg .slot.on').count()) === 4 && (await modal.isVisible()), '"Edit" reopens the window with the numbers still there'); await page.keyboard.press('Escape'); }
  await solveChiral(); expect((await card.getAttribute('class')).includes('solved'), 'problem 3 is solved once the priorities and letter are right'); await card.locator('[data-act=next]').click();

  /* ---------- problems 4-8, including two chiral centers side by side ---------- */
  for (let i = 3; i < 8; i++) {
    expect((await cur()) === i, 'on problem ' + (i + 1)); const t = await truthInfo(i);
    if (t.centers.length > 1) {
      await card.locator('.atom[data-atom="' + t.centers[0] + '"]').click(); for (const id of t.order[0]) await slot(id).click(); await page.locator('[data-mcfg="' + t.cfg[0] + '"]').click(); await page.locator('[data-mact=done]').click();
      await card.locator('.atom[data-atom="' + t.centers[1] + '"]').click();
      expect((await page.locator('.dlg h3').innerText()) === 'Chiral center 2' && (await page.locator('.dlg .slot.on').count()) === 0 && (await page.locator('.dlg .slot').count()) === 4 && (await page.locator('.dlg .mark.focus').count()) === 1, 'side-by-side centers: center 2 opens its OWN window, with only its four groups and none of center 1’s numbers (' + t.name + ')');
      await page.keyboard.press('Escape'); expect((await card.locator('.crow').count()) === 2, 'both centers are listed separately');
    }
    await solveChiral(); expect((await card.getAttribute('class')).includes('solved'), 'problem ' + (i + 1) + ' (' + t.name + ') is solved through the windows');
    if (t.centers.length > 1) { expect((await card.locator('.ctabs button').count()) === t.centers.length && (await card.locator('.prio').count()) === 4, 'the solution shows ONE center’s priorities at a time (4 numbers), with a tab per center'); await card.locator('.ctabs button').nth(1).click(); expect((await card.locator('.prio').count()) === 4 && (await card.locator('.ctabs button[aria-pressed=true]').innerText()) === 'Center 2', 'switching tabs shows the other center’s numbers'); }
    await card.locator('[data-act=next]').click();
  }

  /* ---------- the chair problems ---------- */
  const spotCircle = (k, type) => page.locator('.board.live .spot[data-k="' + k + '"][data-type="' + type + '"] circle.ring');
  const centerOf = async (loc) => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  async function dragTo(from, to, steps) { await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: steps || 4 }); await page.mouse.move(to.x, to.y, { steps: steps || 4 }); await page.mouse.up(); await page.waitForTimeout(40); }
  const dragChip = async (id, k, type) => { await page.locator('.board.live').scrollIntoViewIfNeeded(); await page.evaluate(() => { const b = document.querySelector('.board.live'); b.scrollIntoView({ block: 'center' }); }); return dragTo(await centerOf(page.locator('.board.live .chip[data-id="' + id + '"]')), await centerOf(spotCircle(k, type))); };
  const placeAll = async (pl) => { for (const id in pl) await dragChip(id, pl[id].k, pl[id].type); };
  const sol = (flip, prev) => ev(([f, p]) => { const t = ChiralApp.probs[ChiralApp.state.cur].target; return Chair.solve(t, f, p || undefined); }, [flip, prev || null]);

  expect((await cur()) === 8 && (await page.locator('.flat').count()) === 1 && (await page.locator('.board').count()) === 1 && (await page.locator('.board.live .spot').count()) === 12, 'problem 9: the flat ring, one chair template with 12 positions (6 axial, 6 equatorial)');
  expect((await page.locator('.board.live .spot.ax').count()) === 6 && (await page.locator('.board.live .spot.eq').count()) === 6, 'six axial and six equatorial positions');
  const ids = await ev(() => ChiralApp.probs[ChiralApp.state.cur].target.subs.map((s) => s.id));
  expect((await page.locator('.board.live .chip').count()) === ids.length && ids.length >= 2, 'the substituents wait in the tray as chips (' + ids.length + ')');
  await card.locator('[data-act=check]').click(); expect((await fb()).includes('Place every') && (await tries()) === 0, 'checking an empty chair says to place everything (not counted)');
  /* a wrong placement: put the first two groups the wrong distance apart */
  const t9 = await ev(() => ChiralApp.probs[8].target); const want = Math.min(Math.abs(t9.subs[0].c - t9.subs[1].c), 6 - Math.abs(t9.subs[0].c - t9.subs[1].c)); const badK = want === 1 ? 3 : 1;
  const pl = await sol(1);
  await dragChip(ids[0], 0, 'ax'); await dragChip(ids[1], badK, 'eq'); for (let k = 2; k < ids.length; k++) await dragChip(ids[k], k + 2 > 5 ? 5 : k + 2, 'eq');
  await card.locator('[data-act=check]').click(); expect(((await fb()).includes('apart') || (await fb()).includes('neighboring') || (await fb()).includes('cis') || (await fb()).includes('trans') || (await fb()).includes('opposite')) && (await tries()) === 1, 'a wrong chair gets a specific message (1 wrong try): ' + (await fb()).slice(0, 100));
  /* moving and removing chips */
  await page.evaluate(() => document.querySelector('.board.live').scrollIntoView({ block: 'center' })); await dragTo(await centerOf(page.locator('.board.live .chipmark[data-id="' + ids[0] + '"]')), await centerOf(spotCircle(5, 'ax')));
  expect((await ev(() => ChiralApp.state.items[ChiralApp.state.cur].p1)).s0.k === 5, 'a placed chip can be dragged to another position');
  await page.evaluate(() => document.querySelector('.board.live').scrollIntoView({ block: 'center' })); await dragTo(await centerOf(page.locator('.board.live .chipmark[data-id="' + ids[0] + '"]')), { x: 20, y: 300 }); expect((await page.locator('.board.live .chip[data-id="' + ids[0] + '"]').count()) === 1, 'dropping a chip away from the chair returns it to the tray');
  await card.locator('[data-act=clear]').click(); expect((await page.locator('.board.live .chipmark').count()) === 0, '"Start this step over" empties the chair');
  /* the right chair: first chip by tapping, the rest by dragging */
  await page.locator('.board.live .chip[data-id="' + ids[0] + '"]').click(); await spotCircle(pl[ids[0]].k, pl[ids[0]].type).click({ force: true });
  expect((await ev(() => ChiralApp.state.items[ChiralApp.state.cur].p1))[ids[0]] !== undefined, 'tap a chip, then tap a position, also places it');
  for (let k = 1; k < ids.length; k++) await dragChip(ids[k], pl[ids[k]].k, pl[ids[k]].type);
  expect((await page.locator('.board.live .chipmark').count()) === ids.length, 'all chips sit on the chair');
  await card.locator('[data-act=check]').click();
  expect((await ev(() => ChiralApp.state.items[ChiralApp.state.cur].stage)) === 2 && (await fb()).includes('chair is right') && (await page.locator('.board').count()) === 2 && (await page.locator('.board.live').count()) === 1, 'the right chair unlocks step 2: the ring flip (a second, flipped template)');
  expect((await page.locator('.board').first().locator('.chipmark').count()) === ids.length, 'step 1 stays on screen with its groups');
  /* a ring flip that keeps every group in the same axial/equatorial type is refused */
  const same = await ev(() => { const A = ChiralApp, i = A.state.cur, t = A.probs[i].target, p1 = A.state.items[i].p1, types = Chair.typesOf(p1); const subs = t.subs; let found = null; const out = {}; (function go(n, used) { if (found) return; if (n === subs.length) { if (Chair.check(t, out, -1).ok) found = JSON.parse(JSON.stringify(out)); return; } for (let k = 0; k < 6; k++) { if (used.indexOf(k) >= 0) continue; out[subs[n].id] = { k, type: types[subs[n].id] }; go(n + 1, used.concat([k])); } })(0, []); return found; });
  if (same) { await placeAll(same); await card.locator('[data-act=check]').click(); expect(((await fb()).includes('still axial') || (await fb()).includes('still equatorial')) && (await tries()) === 2, 'a flip that keeps a group axial (or equatorial) is refused with that message: ' + (await fb()).slice(0, 90)); await card.locator('[data-act=clear]').click(); }
  const p1 = await ev(() => ChiralApp.state.items[ChiralApp.state.cur].p1); const flipPl = await sol(-1, Object.fromEntries(Object.entries(p1).map(([k, v]) => [k, v.type])));
  await placeAll(flipPl); await card.locator('[data-act=check]').click();
  expect((await card.getAttribute('class')).includes('solved') && (await fb()).includes('Correct') && (await page.locator('#score').innerText()).startsWith('9 / 12'), 'the correct ring flip solves problem 9: 9 / 12');
  await card.locator('[data-act=next]').click();

  /* problem 10: three wrong checks, the solution, a similar problem */
  const idsB = await ev(() => ChiralApp.probs[ChiralApp.state.cur].target.subs.map((s) => s.id)), t10 = await ev(() => ChiralApp.probs[ChiralApp.state.cur].target);
  await dragChip(idsB[0], 0, 'ax'); await dragChip(idsB[1], 0 === 0 ? 1 : 2, 'ax'); for (let k = 2; k < idsB.length; k++) await dragChip(idsB[k], 4, 'eq');
  for (let k = 0; k < 3; k++) await card.locator('[data-act=check]').click();
  expect((await tries()) === 3 && !(await card.locator('[data-act=reveal]').isDisabled()), 'three wrong chair checks unlock the solution (the same wrong chair each time still counts)');
  const keyBefore = t10.key; await card.locator('[data-act=reveal]').click();
  expect((await card.getAttribute('class')).includes('shown') && (await page.locator('.board').count()) === 2 && (await card.locator('.solution-lines li').count()) >= 2 * idsB.length, 'the solution shows a correct chair and its ring flip, with a line for every group');
  expect((await card.locator('[data-act=next]').count()) === 0, 'no Next button after the solution');
  await card.locator('[data-act=retry]').click(); const t10b = await ev(() => ChiralApp.probs[ChiralApp.state.cur].target);
  expect(t10b.key !== keyBefore && t10b.pattern === t10.pattern && (await card.locator('.similar').count()) === 1, 'a similar chair problem (same pattern, ' + t10.pattern + ') replaces it');
  const s10 = await sol(1); await placeAll(s10); await card.locator('[data-act=check]').click(); const p10 = await ev(() => ChiralApp.state.items[ChiralApp.state.cur].p1); await placeAll(await sol(-1, Object.fromEntries(Object.entries(p10).map(([k, v]) => [k, v.type])))); await card.locator('[data-act=check]').click();
  expect((await card.getAttribute('class')).includes('solved'), 'the similar chair problem can be solved'); await card.locator('[data-act=next]').click();

  /* a reload in the middle keeps the placed chips */
  const idsC = await ev(() => ChiralApp.probs[ChiralApp.state.cur].target.subs.map((s) => s.id)); const pc = await sol(1); await dragChip(idsC[0], pc[idsC[0]].k, pc[idsC[0]].type);
  await page.reload(); await page.waitForTimeout(200);
  expect((await cur()) === 10 && (await page.locator('.board.live .chipmark').count()) === 1, 'a reload keeps the problem and the chip already placed');

  /* problems 11 and 12 */
  for (let n = 10; n < 12; n++) {
    const ii = await ev(() => ChiralApp.probs[ChiralApp.state.cur].target.subs.map((s) => s.id)); await page.locator('[data-act=clear]').click(); const s = await sol(1); await placeAll(s); await card.locator('[data-act=check]').click();
    const pp = await ev(() => ChiralApp.state.items[ChiralApp.state.cur].p1); await placeAll(await sol(-1, Object.fromEntries(Object.entries(pp).map(([k, v]) => [k, v.type])))); await card.locator('[data-act=check]').click();
    expect((await card.getAttribute('class')).includes('solved'), 'chair problem ' + (n + 1) + ' (' + ii.length + ' groups) solved'); await card.locator('[data-act=next]').click();
  }

  /* ---------- results, saving, a new set ---------- */
  expect(await page.locator('#finish').isVisible() && (await page.locator('.prob').count()) === 0 && (await page.locator('#score').innerText()).startsWith('12 / 12'), 'all twelve done: the results page');
  expect((await page.locator('#finish .res tr').count()) === 13 && (await page.locator('#finish .big').innerText()).includes('/ 12') && (await page.locator('#finish .res').innerText()).includes('Chair:') && (await page.locator('#finish .res').innerText()).includes('correct after 1 solution'), 'the results table lists 12 problems, including the two solutions that led to similar problems');
  await page.fill('#nameIn', 'Test Student'); await page.reload(); await page.waitForTimeout(200);
  expect((await page.locator('#finish').isVisible()) && (await page.inputValue('#nameIn')) === 'Test Student' && (await page.locator('#setNo').innerText()) === 'Set #' + SEED, 'a reload keeps the finished set and the name');
  await page.locator('#saveBtn').click(); expect((await page.locator('#saved').innerText()).includes('Progress saved'), 'the Save progress button confirms');
  await page.click('#againBtn'); await page.waitForTimeout(150); expect((await page.locator('#setNo').innerText()) !== 'Set #' + SEED && (await page.locator('#score').innerText()).startsWith('0 / 12'), '"Try a new set" starts a different set');
  expect(!/NaN(?![A-Za-z])|undefined/.test(await page.locator('body').innerText()), 'no NaN or undefined anywhere');
  await page.close();

  /* ---------- keyboard use of the chair ---------- */
  page = await open('?set=' + SEED); await page.evaluate(() => { const st = ChiralApp.state; for (let i = 0; i < 8; i++) st.items[i].status = 'solved'; st.cur = 8; localStorage.setItem('chirality-chairs-v1', JSON.stringify(st)); }); await page.reload(); await page.waitForTimeout(200);
  { const id = (await page.evaluate(() => ChiralApp.probs[8].target.subs[0].id)), pl2 = await page.evaluate(() => Chair.solve(ChiralApp.probs[8].target, 1));
    await page.locator('.board.live .chip[data-id="' + id + '"]').focus(); await page.keyboard.press('Enter'); await page.locator('.board.live .spot[data-k="' + pl2[id].k + '"][data-type="' + pl2[id].type + '"]').focus(); await page.keyboard.press('Enter');
    expect((await page.evaluate(() => ChiralApp.state.items[8].p1))[id] !== undefined, 'the keyboard works: Enter on a chip, then Enter on a position, places it'); }
  await page.close();

  /* ---------- phone-sized screen ---------- */
  page = await open('?set=' + SEED, 390); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'chirality problem fits a phone screen');
  await page.evaluate(() => { const st = ChiralApp.state; for (let i = 0; i < 8; i++) st.items[i].status = 'solved'; st.cur = 8; localStorage.setItem('chirality-chairs-v1', JSON.stringify(st)); }); await page.reload(); await page.waitForTimeout(200);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && (await page.locator('.board.live svg.chair').evaluate((s) => s.getBoundingClientRect().width)) > 250, 'the chair problem fits a phone screen and the chair is still big enough to use');
  await page.close();

  expect(errors.length === 0, 'JavaScript errors: ' + [...new Set(errors)].slice(0, 3).join(' | '));
  await browser.close();
  if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
  console.log('ui: all ' + checks + ' checks passed');
})();
