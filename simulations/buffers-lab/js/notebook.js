/* notebook.js: the right-hand panel. It shows the objective and the procedure, and ticks each
 * step as the student does it on the bench. The questions and the data table are on the paper
 * lab sheet (Buffers_Lab_Student_Sheet.pdf), not here.
 *
 * The ticks come from what is really on the bench (BufferLab.truth()). When all 8 steps are
 * ticked the lab is complete, and scorm.js tells the learning system.
 */
(function () {
  'use strict';
  const Lab = window.BufferLab, SC = window.BufScorm, root = document.getElementById('notebook');

  const STEPS = {
    b1: [['Using a graduated cylinder, obtain <b>50.0 mL</b> of 0.83 M HC₂H₃O₂ and pour it into the Buffer 1 beaker.', 'Drag the acid bottle onto a cylinder and hold to pour. Finish with the dropper. Then drag the cylinder onto the beaker.'],
      ['Mass out the grams of solid NaC₂H₃O₂ you calculated in the pre-lab (question 4).', 'Drag the weigh boat onto the balance, press TARE, load the scoop at the jar, then drag the scoop over the boat.'],
      ['Add the solid to the beaker and stir until it has completely dissolved.', 'Drag the weigh boat onto the beaker, then drag the stirring rod into the beaker.'],
      ['Measure the pH with the pH meter and record it on your lab sheet.', 'Drag the pH probe into the beaker and wait for “reading stable”.']],
    b2: [['Using a graduated cylinder, obtain <b>50.0 mL</b> of 0.83 M HC₂H₃O₂ and pour it into the Buffer 2 beaker.', 'Same as before, into the second beaker.'],
      ['Measure out the volume of 0.50 M NaOH you calculated in the pre-lab (question 5).', 'Use a clean, empty cylinder. Drag the NaOH bottle onto it.'],
      ['Add the NaOH to the beaker and stir.', 'Drag the cylinder onto the beaker, then stir with the rod.'],
      ['Measure the pH with the pH meter and record it on your lab sheet.', 'Rinse the probe in distilled water first, then drag it into the beaker.']]
  };
  const stepList = (k) => '<ol class="steps" data-k="' + k + '">' + STEPS[k].map((s, i) => '<li data-i="' + i + '"><span class="ck">✔</span><span>' + (i + 1) + '. ' + s[0] + '<span class="how">' + s[1] + '</span></span></li>').join('') + '</ol>';

  root.innerHTML = '<div class="pane"><h2>Objective</h2><p>Use two different methods to prepare buffered solutions with the exact same pH. Both buffers have a target pH of <b>4.75</b>. Acetic acid has K<sub>a</sub> = 1.76 × 10⁻⁵.</p>' +
    '<p class="sheetnote">📄 Do the pre-lab on your <b>lab sheet</b> first. Record every volume, mass and pH on the sheet as you go: read them from the cylinder, the balance and the pH meter.</p>' +
    '<p class="safety">Safety: goggles on at all times · rinse skin with water if any solution touches it · when diluting acids, always add acid to water.</p>' +
    '<h2>Buffer 1: acetic acid + sodium acetate</h2>' + stepList('b1') + '<h2>Buffer 2: acetic acid + sodium hydroxide</h2>' + stepList('b2') +
    '<div class="donebox" id="doneBox" role="status" aria-live="polite"></div>' +
    '<p class="how">The check marks show a step was done, not that it was done accurately. Accuracy shows up in your pH.</p>' +
    '<h2>Going further (optional)</h2><p>Add 1.00 mL of 1.0 M HCl to each finished buffer, stir, and measure the pH again. Which buffer changes more? This helps with analysis question 5.</p></div>';

  /* ---- the procedure check marks follow the bench ---- */
  let lastSync = 0, stepsDone = -1;
  function sync() {
    const now = Date.now(); if (now - lastSync < 300) return; lastSync = now; const t = Lab.truth();
    const done = { b1: [t.b1.acid >= 40, t.flags.weighed || t.b1.solid > 0, t.b1.solid > 0 && t.b1.undissolved <= 0 && t.b1.mixed, t.b1.pH != null && t.b1.solid > 0], b2: [t.b2.acid >= 40, t.flags.naohMeasured || t.b2.naoh > 0, t.b2.naoh > 0 && t.b2.mixed, t.b2.pH != null && t.b2.naoh > 0] };
    for (const k of ['b1', 'b2']) root.querySelectorAll('.steps[data-k="' + k + '"] li').forEach((li, i) => li.classList.toggle('done', !!done[k][i]));
    const n = done.b1.concat(done.b2).filter(Boolean).length; if (n === stepsDone) return; stepsDone = n;
    const complete = SC ? SC.report(n) : n >= 8, box = document.getElementById('doneBox');
    box.className = 'donebox' + (complete ? ' on' : '');
    box.innerHTML = complete ? '<b>✔ Lab complete!</b> Both buffers are made and measured.' + (SC && SC.connected ? ' Your completion has been reported to your class.' : '') + ' Make sure both pH values are on your lab sheet, then finish the calculations and analysis.' : '';
  }
  window.BufNotebook = { sync };
})();
