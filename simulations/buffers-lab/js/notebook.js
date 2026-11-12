/* notebook.js: the right-hand panel. Procedure checklist, pre-lab questions with answer checks,
 * the data table and the analysis questions. Everything typed here is saved in the browser
 * (localStorage), so a reload does not lose it.
 *
 * The checks never show the answer. They compare what the student typed with what is really on
 * the bench (BufferLab.truth()) or with the calculation (BufChem.prelab), and reply with a hint.
 */
(function () {
  'use strict';
  const C = window.BufChem, Lab = window.BufferLab, root = document.getElementById('notebook');
  const KEY = 'buffers-lab-notebook-v1';
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { saved = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { /* private window: just keep it in memory */ } };
  const num = (s) => { const v = parseFloat(String(s).replace(',', '.').replace(/[^0-9.eE+-]/g, '')); return isFinite(v) ? v : NaN; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const STEPS = {
    b1: [['Using a graduated cylinder, obtain <b>50.0 mL</b> of 0.83 M HC₂H₃O₂ and pour it into the Buffer 1 beaker.', 'Drag the acid bottle onto a cylinder and hold to pour. Finish with the dropper. Then drag the cylinder onto the beaker.'],
      ['Mass out the grams of solid NaC₂H₃O₂ you calculated in the pre-lab (question 4).', 'Drag the weigh boat onto the balance, press TARE, load the scoop at the jar, then drag the scoop over the boat.'],
      ['Add the solid to the beaker and stir until it has completely dissolved.', 'Drag the weigh boat onto the beaker, then drag the stirring rod into the beaker.'],
      ['Measure the pH with the pH meter and record it.', 'Drag the pH probe into the beaker and wait for “reading stable”.']],
    b2: [['Using a graduated cylinder, obtain <b>50.0 mL</b> of 0.83 M HC₂H₃O₂ and pour it into the Buffer 2 beaker.', 'Same as before, into the second beaker.'],
      ['Measure out the volume of 0.50 M NaOH you calculated in the pre-lab (question 5).', 'Use a clean, empty cylinder. Drag the NaOH bottle onto it.'],
      ['Add the NaOH to the beaker and stir.', 'Drag the cylinder onto the beaker, then stir with the rod.'],
      ['Measure the pH with the pH meter and record it.', 'Rinse the probe in distilled water first, then drag it into the beaker.']]
  };
  const stepList = (k) => '<ol class="steps" data-k="' + k + '">' + STEPS[k].map((s, i) => '<li data-i="' + i + '"><span class="ck">✔</span><span>' + (i + 1) + '. ' + s[0] + '<span class="how">' + s[1] + '</span></span></li>').join('') + '</ol>';
  const ta = (id, rows) => '<textarea data-save="' + id + '" rows="' + (rows || 3) + '" placeholder="Type your answer here">' + esc(saved[id]) + '</textarea>';
  const numQ = (id, label, unit) => '<div class="row"><input type="text" inputmode="decimal" data-save="' + id + '" value="' + esc(saved[id]) + '" aria-label="' + label + '"><span>' + unit + '</span><button type="button" class="btn" data-check="' + id + '">Check</button></div><div class="fb" data-fb="' + id + '" aria-live="polite"></div>';
  const cell = (id) => '<td><input type="text" inputmode="decimal" data-save="' + id + '" value="' + esc(saved[id]) + '" aria-label="' + id + '"><span class="cellfb" data-cfb="' + id + '"></span></td>';
  /* the three particle pictures from the lab handout: black = acetate ion, black + white = acetic acid */
  function particles(nA, nHA, seed) {
    const pos = [[26, 22], [58, 18], [84, 30], [22, 50], [54, 46], [82, 58], [38, 68], [66, 70]]; let s = '<svg viewBox="0 0 104 88" aria-hidden="true"><path d="M8 6 L8 74 Q8 82 16 82 L88 82 Q96 82 96 74 L96 6" fill="none" stroke="#333" stroke-width="2"/><path d="M8 12 L96 12" stroke="#999" stroke-width="1"/>';
    const order = pos.map((p, i) => i).sort((a, b) => ((a * seed) % 7) - ((b * seed) % 7)).slice(0, nA + nHA);
    order.forEach((pi, k) => { const [x, y] = pos[pi]; s += '<circle cx="' + x + '" cy="' + y + '" r="7" fill="#111"/>'; if (k >= nA) s += '<circle cx="' + (x + 8) + '" cy="' + (y + 2) + '" r="3.5" fill="#fff" stroke="#111" stroke-width="1.2"/>'; });
    return s + '</svg>';
  }

  root.innerHTML = '<div class="tabs" role="tablist">' + [['proc', 'Procedure'], ['pre', 'Pre-lab'], ['data', 'Data'], ['ana', 'Analysis']].map((t, i) => '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (i === 0) + '">' + t[1] + '</button>').join('') + '</div>' +
    /* ---- procedure ---- */
    '<div class="pane" data-pane="proc"><h2>Objective</h2><p>Use two different methods to prepare buffered solutions with the exact same pH. Both buffers have a target pH of <b>4.75</b>. Acetic acid has K<sub>a</sub> = 1.76 × 10⁻⁵.</p>' +
    '<p class="safety">Safety: goggles on at all times · rinse skin with water if any solution touches it · when diluting acids, always add acid to water.</p>' +
    '<h2>Buffer 1: acetic acid + sodium acetate</h2>' + stepList('b1') + '<h2>Buffer 2: acetic acid + sodium hydroxide</h2>' + stepList('b2') +
    '<p class="how">The check marks show a step was done, not that it was done accurately. Accuracy shows up in your pH.</p>' +
    '<h2>Going further (optional)</h2><p>Add 1.00 mL of 1.0 M HCl to each finished buffer, stir, and measure the pH again. Which buffer changes more? You will need this for analysis question 5.</p></div>' +
    /* ---- pre-lab ---- */
    '<div class="pane" data-pane="pre" hidden><h2>Pre-lab questions</h2><p class="how">Do the math on paper. “Check” tells you if you are right and gives a hint if you are not.</p>' +
    '<div class="eq">pH = pK<sub>a</sub> + log( [A⁻] / [HA] )</div>' +
    '<div class="q"><label>1. What mass of sodium citrate, NaH₂C₆H₅O₇, is required to prepare Buffer A with a pH of 3.13 from 50.0 mL of 1.0 M citric acid, H₃C₆H₅O₇? (K<sub>a</sub> = 8.4 × 10⁻⁴, pK<sub>a</sub> = 3.13)</label>' + numQ('q1', 'mass of sodium citrate', 'g') + '</div>' +
    '<div class="q"><label>2. What is the predominant form of the acid in Buffer A?</label>' + ta('q2', 2) + '</div>' +
    '<div class="q"><label>3. Buffer B is prepared with twice the number of moles of acid and base, but the same ratio of acid to base as Buffer A.<br>(a) Is the pH of Buffer B greater than, less than, or equal to 3.13? Justify your answer.</label>' + ta('q3a') + '<label>(b) Which buffer, A or B, would be more resistant to pH change when a strong acid or a strong base is added? Justify your answer.</label>' + ta('q3b') + '</div>' +
    '<div class="q"><label>4. Determine the mass, in grams, of sodium acetate that should be added to 50.0 mL of 0.83 M HC₂H₃O₂(aq) to make a buffer solution with a pH of 4.75. <span class="how">You will use this in Buffer 1, step 2.</span></label>' + numQ('q4', 'mass of sodium acetate', 'g NaC₂H₃O₂') + '</div>' +
    '<div class="q"><label>5. Determine the volume, in mL, of 0.50 M NaOH(aq) that should be added to 50.0 mL of 0.83 M HC₂H₃O₂(aq) to make a buffer solution with a pH of 4.75. <span class="how">You will use this in Buffer 2, step 2.</span></label>' + numQ('q5', 'volume of NaOH', 'mL NaOH') + '</div></div>' +
    /* ---- data ---- */
    '<div class="pane" data-pane="data" hidden><h2>Data</h2><p class="how">Record what <b>you</b> read from the cylinder, the balance and the pH meter.</p>' +
    '<table class="datat"><tr><th></th><th>Buffer 1</th><th>Buffer 2</th></tr><tr><th>Assigned pH</th><td>4.75</td><td>4.75</td></tr>' +
    '<tr><th>Volume of 0.83 M HC₂H₃O₂ (mL)</th>' + cell('d1acid') + cell('d2acid') + '</tr><tr><th>Mass of NaC₂H₃O₂ (g)</th>' + cell('d1mass') + '<td class="na">N/A</td></tr>' +
    '<tr><th>Volume of 0.50 M NaOH (mL)</th><td class="na">N/A</td>' + cell('d2naoh') + '</tr><tr><th>Actual pH</th>' + cell('d1ph') + cell('d2ph') + '</tr></table>' +
    '<h2>Calculations</h2><p>1. Calculate your percent error using the assigned pH and your actual pH for both buffers.</p><div class="eq">% error = |actual − assigned| ÷ assigned × 100</div>' +
    '<table class="datat" style="margin-top:.5rem"><tr><th>Percent error (%)</th>' + cell('e1') + cell('e2') + '</tr></table>' +
    '<p><button type="button" class="btn primary" id="checkData">Check my data</button> <button type="button" class="btn" id="printBtn">Print my report</button></p><div class="fb" id="dataFb" aria-live="polite"></div></div>' +
    /* ---- analysis ---- */
    '<div class="pane" data-pane="ana" hidden><h2>Analysis</h2>' +
    '<div class="q"><label>2. If either percent error is greater than 5 %, provide a reasonable source of error and explain precisely how the error would affect the actual pH.</label>' + ta('a2', 4) + '</div>' +
    '<div class="q"><label>3. A different lab group attempts to make a buffer with an acid and a salt. They choose HCl and NaCl. Explain why their attempt will not produce a solution that is resistant to pH change. Justify your answer using net-ionic equations.</label>' + ta('a3', 4) + '</div>' +
    '<div class="q"><label>4. Choose the beaker that best represents the particulate diagram for Buffer 1. Explain your reasoning, referencing the Henderson-Hasselbalch equation.</label><p class="how">● = C₂H₃O₂⁻ &nbsp; ●○ = HC₂H₃O₂</p><div class="pd">' +
    [['A', 4, 2, 3], ['B', 2, 4, 5], ['C', 3, 3, 2]].map((b) => '<label><input type="radio" name="a4pick" value="' + b[0] + '"' + (saved.a4pick === b[0] ? ' checked' : '') + '>' + particles(b[1], b[2], b[3]) + 'Beaker ' + b[0] + '</label>').join('') + '</div>' + ta('a4', 4) + '</div>' +
    '<div class="q"><label>5. It is observed that Buffer 2 changes more significantly than Buffer 1 upon the addition of strong acid. Explain this observation.</label>' + ta('a5', 4) + '</div></div>';

  /* ---- tabs and saving ---- */
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { root.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b === t))); root.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== t.dataset.tab; }); return; }
    const c = e.target.closest('[data-check]'); if (c) checkPre(c.dataset.check);
    if (e.target.id === 'checkData') checkData(); if (e.target.id === 'printBtn') window.print();
  });
  root.addEventListener('input', (e) => { const k = e.target.dataset.save; if (k) { saved[k] = e.target.value; save(); } if (e.target.name === 'a4pick') { saved.a4pick = e.target.value; save(); } });

  /* ---- pre-lab checks: right / wrong + a hint that gets more specific each try ---- */
  const tries = {};
  const PRE = {
    q1: { lo: 10.5, hi: 10.9, hints: ['Compare the target pH with the pKₐ. What does that tell you about the ratio [A⁻]/[HA]?', 'pH = pKₐ means moles of salt = moles of acid. How many moles of citric acid are in 50.0 mL of 1.0 M?', 'Multiply those moles by the molar mass of NaH₂C₆H₅O₇ (add it up from the periodic table: about 214 g/mol).'],
      slips: [[0.045, 0.055, 'That is the number of moles. The question asks for grams: multiply by the molar mass.'], [9.4, 9.8, 'Check the molar mass: you need the SALT, NaH₂C₆H₅O₇, not citric acid.']] },
    q4: { lo: 3.3, hi: 3.5, hints: ['Find pKₐ = −log(1.76 × 10⁻⁵). How does it compare with 4.75? What must [A⁻]/[HA] be?', 'How many moles of HC₂H₃O₂ are in 50.0 mL of 0.83 M? You need (almost exactly) the same moles of C₂H₃O₂⁻.', 'Convert moles of NaC₂H₃O₂ to grams with its molar mass, 82.03 g/mol.'],
      slips: [[0.039, 0.044, 'That is moles of sodium acetate. Convert to grams with 82.03 g/mol.'], [6.6, 7.0, 'That is twice too much. Use 50.0 mL = 0.0500 L when you find the moles of acid.'], [5.5, 5.8, 'Check the molar mass: the lab uses anhydrous NaC₂H₃O₂, 82.03 g/mol (not the trihydrate).']] },
    q5: { lo: 41.0, hi: 41.9, hints: ['NaOH does not add acetate directly: it <b>converts</b> acid into it. OH⁻ + HC₂H₃O₂ → C₂H₃O₂⁻ + H₂O.', 'For pH = pKₐ you need [A⁻] = [HA], so what fraction of the 0.0415 mol of acid must be converted?', 'Moles of NaOH needed ÷ 0.50 M gives liters. Convert to mL.'],
      slips: [[82, 84, 'That much NaOH would neutralize ALL of the acid, leaving no HC₂H₃O₂ for the buffer. You only want to convert half.'], [0.040, 0.043, 'That looks like liters. The question asks for mL.'], [20, 21.5, 'That is a number of millimoles, not a volume. Divide the moles of NaOH by 0.50 M.']] }
  };
  function checkPre(id) {
    const v = num(saved[id]), fb = root.querySelector('[data-fb="' + id + '"]'), d = PRE[id];
    if (!isFinite(v)) { fb.className = 'fb no'; fb.textContent = 'Type a number first.'; return; }
    if (v >= d.lo && v <= d.hi) { fb.className = 'fb ok'; fb.textContent = '✔ Correct. Use this value in the lab.'; return; }
    const slip = d.slips.find((s) => v >= s[0] && v <= s[1]); tries[id] = (tries[id] || 0) + 1;
    fb.className = 'fb hint'; fb.innerHTML = '✘ Not yet. ' + (slip ? slip[2] : 'Hint: ' + d.hints[Math.min(d.hints.length, tries[id]) - 1]);
  }

  /* ---- the data check: does the notebook match what really happened on the bench? ---- */
  function mark(id, ok, msg) { const inp = root.querySelector('[data-save="' + id + '"]'), f = root.querySelector('[data-cfb="' + id + '"]'); inp.classList.toggle('ok', ok === true); inp.classList.toggle('no', ok === false); f.className = 'cellfb' + (ok ? ' ok' : ''); f.textContent = msg || ''; return ok === true; }
  function checkData() {
    const t = Lab.truth(), out = []; let good = 0, n = 0;
    const one = (id, truth, tol, what, emptyMsg) => {
      n++; const v = num(saved[id]);
      if (!isFinite(v)) return mark(id, false, 'empty');
      if (truth == null || truth <= 0) return mark(id, false, emptyMsg);
      const ok = Math.abs(v - truth) <= tol; if (ok) good++; return mark(id, ok, ok ? '✔ matches the bench' : what);
    };
    one('d1acid', t.b1.acid, 0.25, 're-read the cylinder (bottom of the meniscus)', 'no acid in the Buffer 1 beaker yet');
    one('d2acid', t.b2.acid, 0.25, 're-read the cylinder (bottom of the meniscus)', 'no acid in the Buffer 2 beaker yet');
    one('d1mass', t.b1.solid, 0.015, 'does not match the mass you added. Did you tare?', 'no solid in the Buffer 1 beaker yet');
    one('d2naoh', t.b2.naoh, 0.3, 're-read the cylinder (bottom of the meniscus)', 'no NaOH in the Buffer 2 beaker yet');
    one('d1ph', t.b1.pH, 0.025, 'does not match your last stable reading', 'no stable pH reading yet: stir, then wait for “reading stable”');
    one('d2ph', t.b2.pH, 0.025, 'does not match your last stable reading', 'no stable pH reading yet: stir, then wait for “reading stable”');
    for (const [e, p] of [['e1', 'd1ph'], ['e2', 'd2ph']]) { n++; const v = num(saved[e]), ph = num(saved[p]); if (!isFinite(v)) mark(e, false, 'empty'); else if (!isFinite(ph)) mark(e, false, 'enter the pH first'); else { const ok = Math.abs(v - C.pctError(ph)) <= 0.06; if (ok) good++; mark(e, ok, ok ? '✔' : '|actual − 4.75| ÷ 4.75 × 100'); } }
    for (const [k, name] of [['b1', 'Buffer 1'], ['b2', 'Buffer 2']]) { const b = t[k]; if (b.pH != null) { const pe = C.pctError(b.pH); out.push(name + ': measured pH ' + b.pH.toFixed(2) + ', ' + pe.toFixed(1) + ' % from the target' + (pe <= 1 ? ' (excellent).' : pe <= 5 ? ' (within 5 %).' : ' (more than 5 %: think about what went wrong for analysis question 2).')); } }
    const fb = document.getElementById('dataFb'); fb.className = 'fb ' + (good === n ? 'ok' : 'hint'); fb.innerHTML = (good === n ? '✔ Every entry matches what happened on your bench.' : good + ' of ' + n + ' entries check out. Fix the ones outlined in red.') + (out.length ? '<br>' + out.join('<br>') : '');
  }

  /* ---- the procedure check marks follow the bench ---- */
  let lastSync = 0;
  function sync() {
    const now = Date.now(); if (now - lastSync < 300) return; lastSync = now; const t = Lab.truth();
    const done = { b1: [t.b1.acid >= 40, t.flags.weighed || t.b1.solid > 0, t.b1.solid > 0 && t.b1.undissolved <= 0 && t.b1.mixed, t.b1.pH != null && t.b1.solid > 0], b2: [t.b2.acid >= 40, t.flags.naohMeasured || t.b2.naoh > 0, t.b2.naoh > 0 && t.b2.mixed, t.b2.pH != null && t.b2.naoh > 0] };
    for (const k of ['b1', 'b2']) root.querySelectorAll('.steps[data-k="' + k + '"] li').forEach((li, i) => li.classList.toggle('done', !!done[k][i]));
  }
  window.BufNotebook = { sync, checkData, checkPre };
})();
