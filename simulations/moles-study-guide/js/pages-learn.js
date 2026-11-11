/* pages-learn.js: the seven topic pages (5.1 to 5.7). Every topic has the same shape:
 * Learn it, The method, Worked examples, Watch out!, Practice, Quick check. */
(function (root) {
  'use strict';
  const C = root.MolesChem, S = root.MolesSteps, P = root.MolesProblems, Dg = root.MolesDiagrams, UI = root.MolesUI, W = root.MolesWidgets, TD = root.MolesTest, D = root.MolesData;
  const T = S.T, fm = C.fmtFormula, $ = UI.$, $$ = UI.$$, Store = UI.Store;

  /* ---------- building blocks ---------- */
  const big = (h) => '<div class="big"><b>BIG IDEA</b><p>' + T(h) + '</p></div>';
  const method = (title, steps) => '<div class="method"><b>' + title + '</b><ol>' + steps.map((s) => '<li>' + T(s) + '</li>').join('') + '</ol></div>';
  const watch = (items) => '<div class="watchgrid">' + items.map((w) => '<div class="watch"><h4>' + w[0] + '</h4><p>' + T(w[1]) + '</p></div>').join('') + '</div>';
  const flips = (items) => '<div class="flips">' + items.map((f) => '<button type="button" class="flip" aria-pressed="false"><span class="ff">' + f[0] + '</span><span class="fh">' + (f[1] || 'Tap to flip') + '</span><span class="fb">' + T(f[2]) + '</span></button>').join('') + '</div>';
  const widget = (name, extra) => '<div data-w="' + name + '"' + (extra || '') + '></div>';
  const card = (h) => '<div class="card">' + h + '</div>';
  const sec = (id, title, html, mount, keys) => ({ id, title, html, mount, keys: keys || '' });
  const SECTION_LABEL = { learn: 'Learn it', method: 'The method', examples: 'Worked examples', watch: 'Watch out!', practice: 'Practice', check: 'Quick check' };

  /* Worked examples: pill tabs, each a stepper; "another one" builds a fresh random problem of the same kind. */
  function examplesSec(topic, items, intro) {
    return sec('examples', 'Worked examples', (intro ? '<p>' + T(intro) + '</p>' : '') + '<p class="note">Press <b>Next step</b> to reveal one step at a time. Try to predict each step before you reveal it. When you have the idea, use <b>Try a fresh one</b>.</p><div class="exs"></div>', (el) => {
      UI.pills($('.exs', el), items.map((it) => ({ key: it.key, label: it.label })), (key, panel) => {
        const it = items.find((x) => x.key === key); let prob = P.example(key);
        const box = document.createElement('div'); panel.appendChild(box);
        const show = (p, id) => UI.stepper(box, p, { id });
        show(prob, 'ex:' + topic + ':' + key);
        if (it.gen) { const row = document.createElement('div'); row.innerHTML = '<button type="button" class="btn">Try a fresh one like this ↻</button> <span class="note"></span>'; panel.appendChild(row);
          $('button', row).addEventListener('click', () => { const p = P.generate(it.gen); $('.note', row).textContent = 'New problem generated. Same steps, new numbers.'; show(p, null); }); }
      });
    }, 'worked example step by step solution');
  }

  /* Practice: a random-problem card plus every problem from the packet. */
  function practiceSec(topic, skills) {
    const packet = P.PACKET[topic] ? P.PACKET[topic].length : 0;
    return sec('practice', 'Practice', '<p>Type your answer and press <b>Check</b>. Stuck? <b>Hint</b> gives you the plan first, then the setup, and never the arithmetic until you ask for the full solution. We count a problem as <i>right</i> only if you get it on your first try without opening the solution.</p>' +
      '<h3>Unlimited practice (new numbers every time)</h3><div class="gen"></div>' + (packet ? '<h3>The problems from your notes packet</h3><p class="note">These are the same problems as in your packet, with every step worked out.</p><div class="packet"></div>' : ''), (el) => {
      const gen = $('.gen', el);
      const mount = (sk) => { const box = document.createElement('div'); gen.querySelector('.genbox') ? gen.querySelector('.genbox').remove() : null; box.className = 'genbox'; gen.appendChild(box); UI.problemCard(box, P.generate(sk), { regen: () => P.generate(sk) }); };
      if (skills.length > 1) { const pl = document.createElement('div'); gen.appendChild(pl); UI.pills(pl, skills.map((s) => ({ key: s, label: P.SKILLS[s].label })), (k, panel) => { panel.innerHTML = ''; const b = document.createElement('div'); panel.appendChild(b); UI.problemCard(b, P.generate(k), { regen: () => P.generate(k) }); }); }
      else mount(skills[0]);
      const pk = $('.packet', el); if (!pk) return;
      P.PACKET[topic].forEach((mk, i) => {
        const probTemp = mk(), d = document.createElement('details'); d.className = 'card'; d.style.padding = '.5rem .9rem';
        d.innerHTML = '<summary style="cursor:pointer;font-weight:600"><span class="pc-num">#' + (i + 1) + '</span> ' + probTemp.statement.replace(/<small>.*?<\/small>/g, '') + '</summary><div class="inner" style="margin-top:.6rem"></div>';
        let mounted = false; d.addEventListener('toggle', () => { if (d.open && !mounted) { mounted = true; UI.problemCard($('.inner', d), probTemp, { num: '#' + (i + 1) }); } });
        pk.appendChild(d);
      });
    }, 'practice problems hint check answer');
  }

  /* Quick check: the packet's two questions, then as many fresh questions from the bank as you want. */
  function checkSec(topic) {
    return sec('check', 'Quick check', '<div class="qc"></div><h3>Want more?</h3><p>Every click pulls new questions from the bank: conceptual ones, and calculations with the common wrong answers as choices.</p><div class="qm"></div><div class="pc-actions"><button class="btn primary" data-a="more">Give me 3 more</button></div>', (el) => {
      TD.QUICK[topic].forEach((q) => { const b = document.createElement('div'); b.style.margin = '.7rem 0'; $('.qc', el).appendChild(b); UI.mc(b, Object.assign({ topic }, q), { id: q.id }); });
      const qm = $('.qm', el), seen = new Set();
      $('[data-a=more]', el).addEventListener('click', () => {
        const qs = root.MolesBank.forTopic(topic, 3, seen);
        qs.forEach((q) => { const b = document.createElement('div'); b.style.margin = '.7rem 0'; qm.appendChild(b); UI.mc(b, q, { id: 'bank' + topic, num: 'Bank' }); });
        if (qs.length) qm.lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }, 'quick check multiple choice questions');
  }

  const secsWithDefaults = (learn, methodHtml, examples, watchItems, topic, skills, methodMount) => [
    sec('learn', 'Learn it', learn.html, learn.mount, learn.keys),
    sec('method', 'The method', methodHtml, methodMount, 'steps method procedure'),
    examples,
    sec('watch', 'Watch out!', '<p>These are the mistakes that cost the most points. Read them before you practice.</p>' + watch(watchItems), null, 'common mistakes errors misconceptions'),
    practiceSec(topic, skills), checkSec(topic)
  ];

  /* ============================================================================== */
  /*  5.1 The mole and Avogadro's number                                             */
  /* ============================================================================== */
  const years = D.NA / 3.156e7, universe = years / 1.38e10;
  const T51 = {
    id: '5.1', short: 'The mole', title: 'The Mole and Avogadro’s Number', subtitle: 'Counting by the mole · 6.022 × 10²³ · atoms, molecules and formula units',
    build() {
      return secsWithDefaults({
        html: big('Atoms and molecules are far too small to count one at a time, so chemists count them in huge groups called <b>moles</b>. <b>1 mole = 6.022 × 10²³ particles</b>, just as 1 dozen = 12. A mole is a <b>number</b>, not a mass.') +
          '<h3>How big is a mole?</h3>' + Dg.countingLadder() +
          card('<b>Try to count a mole.</b> At one particle per second, you would need <b>' + C.fmtSci(years, 2).html + ' years</b>. The universe is only about 1.4 × 10<sup>10</sup> years old, so that is roughly <b>' + C.fmtSci(universe, 1).html.replace('<sup>6</sup>', '<sup>6</sup>') + '</b> times the age of the universe. That is why we count in moles and do not count one at a time.') +
          '<h3>What is a “particle”?</h3><p>It depends on the substance. Learn the three words and which substances use them:</p>' + Dg.particleTypes() +
          '<div class="card"><b>Rule of thumb:</b> one element alone (Al, Mg, He) = <b>atoms</b>. Only nonmetals (H₂O, CO₂, N₂) = <b>molecules</b>. A metal plus nonmetals, or an ammonium compound (NaCl, CaCl₂, NH₄Cl) = <b>formula units</b>.</div>' +
          '<h3>Game: atom, molecule or formula unit?</h3>' + widget('sortGame') +
          '<h3>Same number, different mass</h3><p>A mole of anything has the same <i>number</i> of particles. Click a row to see what that many particles weigh.</p>' + widget('balance') +
          '<h3>How many atoms are in a mole of molecules?</h3><p>The subscripts count atoms in <i>one</i> molecule, so they also count moles of atoms in one <i>mole</i> of molecules. Try it:</p>' + widget('atomCounter') +
          '<h3>Vocabulary: tap a card, then say it in your own words</h3>' + flips([['Mole', 'what is it, and what does it measure?', 'The SI unit for amount of substance: <b>6.022 × 10²³ particles</b> of anything. It measures <i>how many</i>, the way a dozen does.'], ['Avogadro’s number', 'value and meaning', '<b>6.022 × 10²³</b> particles per mole: the number of particles in 1 mole.'], ['Particle', 'three kinds', '<b>Atoms</b> (single elements), <b>molecules</b> (covalent compounds and diatomic elements) and <b>formula units</b> (ionic compounds).']]),
        keys: 'mole avogadro number 6.022 particle atom molecule formula unit dozen counting scientific notation'
      }, method('How to convert between particles and moles', ['Decide what the particles are: <b>atoms</b>, <b>molecules</b> or <b>formula units</b>.', 'Write {k|1 mol = 6.022 × 10²³ particles} as a fraction so the unit you start with cancels.', '<b>Moles → particles:</b> multiply by 6.022 × 10²³. &nbsp; <b>Particles → moles:</b> divide by 6.022 × 10²³.', 'Round to the sig figs of the data and write the unit.']) +
        '<h3>Calculator corner: the EE key</h3><p>Scientific notation on a calculator trips up almost everyone. Try it:</p>' + widget('eeDemo'),
      examplesSec('5.1', [{ key: 'mg', label: 'Moles → atoms', gen: 'p1' }, { key: 'co2', label: 'Particles → moles (sci. notation)', gen: 'p1' }, { key: 'o2atoms', label: 'Atoms inside a molecule', gen: 'p1' }]),
      [['A mole is not a mass', 'A mole is a <b>number</b>. One mole of helium and one mole of iron have the <i>same number</i> of atoms but very different masses. The mole itself does not tell you how heavy something is.'],
        ['Atoms vs. molecules', '1 mol of O₂ is 6.022 × 10²³ <b>molecules</b>, but each molecule has <b>2 atoms</b>, so it has 1.204 × 10²⁴ <b>atoms</b>. Always ask: <i>what is the particle?</i>'],
        ['Multiply or divide?', 'Moles → particles: <b>multiply</b> (the answer is a HUGE number). Particles → moles: <b>divide</b> (the answer is a normal-sized number). If your moles answer is 10²⁰, you multiplied by mistake.'],
        ['The EE key', 'Type 3.4 × 10²⁶ as <kbd>3.4</kbd><kbd>EE</kbd><kbd>26</kbd>. If you type ×10^26 and then ÷ 6.022, the calculator only divides the 10²⁶ part wrongly. Use the demo above to see the difference.']],
      '5.1', ['p1']);
    }
  };

  /* ============================================================================== */
  /*  5.2 Molar mass                                                                 */
  /* ============================================================================== */
  const T52 = {
    id: '5.2', short: 'Molar mass', title: 'Molar Mass', subtitle: 'Grams per mole · add the atomic masses · subscripts and parentheses',
    build() {
      return secsWithDefaults({
        html: big('The <b>molar mass</b> of a substance is the mass of <b>1 mole</b> of it, in <b>g/mol</b>. For a compound, add up the atomic masses of <b>every atom</b> in the formula. Molar mass is the bridge between grams and moles.') +
          '<h3>One number, two jobs</h3><div class="grid2"><div class="card" style="display:flex;gap:1rem;align-items:center">' + W.tile('Mg') + '<div><b>1 atom</b> of Mg has a mass of <b>24.31 amu</b>.</div></div><div class="card" style="display:flex;gap:1rem;align-items:center">' + W.tile('Mg') + '<div><b>1 mole</b> of Mg atoms has a mass of <b>24.31 g</b>.</div></div></div><p class="note">The number on the periodic table is the same. Only the unit changes: amu for one atom, g/mol for a mole of atoms.</p>' +
          '<h3>Breaking a formula into atoms</h3><p>A subscript multiplies the atom <i>just before it</i>. A subscript outside <b>parentheses</b> multiplies <b>everything inside</b>.</p>' + '<div class="grid2"><div class="card">' + Dg.atomGroups({ formula: 'Mg(OH)2' }) + '</div><div class="card">' + Dg.atomGroups({ formula: 'Al2(SO4)3' }) + '</div></div>' +
          '<h3>The seven diatomic elements</h3><p>These elements are never found alone: they come in pairs. When one is written as an element, use <b>2 × its atomic mass</b>.</p><div class="chips" style="gap:.5rem">' + ['H2', 'N2', 'O2', 'F2', 'Cl2', 'Br2', 'I2'].map((f) => '<span class="chip" style="cursor:default;font-size:1.1rem">' + fm(f) + '</span>').join('') + '</div><p class="note">Memory trick: <b>H</b>ave <b>N</b>o <b>F</b>ear <b>O</b>f <b>I</b>ce <b>Cl</b>old <b>Br</b>ew.</p>' +
          '<h3>Try it: the molar mass builder</h3>' + widget('tool_mm') +
          '<h3>Lab corner: weighing a mole</h3>' + card('A student weighs out exactly <b>1 mole</b> of each of three substances: <b>18.02 g</b> of water, <b>58.44 g</b> of table salt (NaCl) and <b>55.85 g</b> of iron.<br><br><b>(a)</b> Which sample contains the most particles? &nbsp; <b>(b)</b> Why are the three masses different?' + '<details style="margin-top:.5rem"><summary class="linkbtn">Show the answer</summary><p><b>(a)</b> None: each one is 1 mole, so each has 6.022 × 10²³ particles.<br><b>(b)</b> The particles have different masses. A mole of heavy particles has a greater mass than a mole of light ones.</p></details>') +
          '<h3>Vocabulary</h3>' + flips([['Molar mass', 'what does it measure? what unit?', 'The mass of <b>one mole</b> of a substance, in grams per mole (g/mol). Example: H₂O is 18.02 g/mol.'], ['Diatomic element', 'name the seven', 'An element found as <b>two bonded atoms</b>: H₂, N₂, O₂, F₂, Cl₂, Br₂, I₂. Example: O₂ = 2 × 16.00 = 32.00 g/mol.']]),
        keys: 'molar mass g/mol atomic mass parentheses subscript diatomic periodic table formula mass'
      }, method('How to find a molar mass', ['<b>List</b> each element in the formula and <b>count</b> its atoms. A subscript outside parentheses multiplies everything inside: in Mg(OH)₂ there are 2 O and 2 H.', '<b>Multiply</b> each count by the atomic mass (to 0.01 g/mol).', '<b>Add</b> the results. Round to 0.01 and write the unit g/mol.']),
      examplesSec('5.2', [{ key: 'al2so4', label: 'Al₂(SO₄)₃ (parentheses)', gen: 'mm' }, { key: 'mgoh', label: 'Mg(OH)₂', gen: 'mm' }, { key: 'nh4', label: '(NH₄)₃PO₄ (a lot of atoms)', gen: 'mm' }, { key: 'n2', label: 'N₂ (diatomic)', gen: 'mm' }]),
      [['Count what is inside the parentheses', 'Mg(OH)₂ is 24.31 + <b>2</b>(16.00) + <b>2</b>(1.01) = 58.33, <b>not</b> 24.31 + 16.00 + 1.01. The 2 outside multiplies BOTH the O and the H.'],
        ['Diatomic elements', '14.01 is the atomic mass of nitrogen. <b>N₂</b> is 2 × 14.01 = <b>28.02</b> g/mol. Check the formula: does the element have a subscript?'],
        ['Atomic number is not atomic mass', 'The whole number on the periodic table (like 12 for carbon) is the <b>atomic number</b>. You want the <b>decimal</b> (12.01).'],
        ['Rounding and units', 'Do not round the atomic masses in the middle. Add everything, then round once to 0.01. The unit is <b>g/mol</b>, not just g.']],
      '5.2', ['mm']);
    }
  };

  /* ============================================================================== */
  /*  5.3 Mole conversions                                                           */
  /* ============================================================================== */
  const T53 = {
    id: '5.3', short: 'Mole conversions', title: 'Mole Conversions', subtitle: 'Particles · moles · grams · the mole map',
    build() {
      return secsWithDefaults({
        html: big('You can <b>never</b> go straight from particles to grams. <b>Every conversion goes through moles.</b> The mole map shows which factor to use for each arrow: Avogadro’s number for particles, molar mass for grams.') +
          '<h3>The mole map</h3><p>Click two boxes to see the path between them.</p>' + widget('mapExplorer') +
          '<h3>Conversion factors are fractions that equal 1</h3>' + card('Because <b>1 mol of H₂O = 18.02 g</b>, you can write it two ways:<div class="chain"><span class="frac k"><span class="num">1 mol H₂O</span><span class="den">18.02 g H₂O</span></span><span class="or">or</span><span class="frac k"><span class="num">18.02 g H₂O</span><span class="den">1 mol H₂O</span></span></div>Multiplying by either one does not change the amount (it is like multiplying by 1). It only changes the <b>unit</b>. Pick the one that makes the unit you <b>start with</b> cancel: that unit must go on the <b>bottom</b>.') +
          '<h3>Drill: which way up?</h3>' + widget('factorDrill') +
          '<h3>One element inside a compound</h3><p>When a question asks about <i>one element</i> inside a compound (like the copper in Cu₂O₃), the <b>subscript</b> is a mole ratio.</p><div class="grid2"><div class="card">' + Dg.atomGroups({ formula: 'Cu2O3' }) + '<p>1 mol Cu₂O₃ contains <span class="r n">2 mol Cu</span>.</p></div><div class="card">' + Dg.atomGroups({ formula: 'CaCl2' }) + '<p>1 mol CaCl₂ contains <span class="r n">2 mol Cl</span>.</p></div></div>',
        keys: 'mole map conversion factor dimensional analysis unit cancel grams particles moles molar mass avogadro subscript ratio element inside compound'
      }, method('Steps', ['Write the <b>given</b> quantity with its unit.', 'Find the <b>path</b> on the mole map. Grams or particles go to moles first, then on to the answer.', 'Set up each factor as a <b>fraction</b> so the unit you want to remove cancels.', 'Calculate, round to the sig figs of the data, and label the answer with the unit <b>and the substance</b>.']),
      examplesSec('5.3', [{ key: 'h2o', label: 'g → molecules', gen: 'conv' }, { key: 'co2g', label: 'molecules → g', gen: 'conv' }, { key: 'cf4', label: 'g → mol', gen: 'conv' }, { key: 'cu', label: 'Element inside: Cu atoms', gen: 'inside' }, { key: 'glu', label: 'Element inside: grams of O', gen: 'inside' }, { key: 'cacl2', label: 'Hard: g CaCl₂ → g Cl', gen: 'inside' }]),
      [['Multiplying when you should divide', 'To go <b>to moles</b> you divide by molar mass (or by 6.022 × 10²³). To go <b>from moles</b> you multiply. Let the units decide: the unit you start with goes on the bottom.'],
        ['Skipping moles', 'Grams → molecules needs <b>two</b> factors (grams → moles → molecules). A one-step answer is almost always wrong.'],
        ['Element inside a compound', 'Use the <b>subscript</b> as a mole ratio (2 mol Cu per 1 mol Cu₂O₃). Cu₂O, CuO and Cu₂O₃ with the same moles give different numbers of copper, so read the subscript carefully.'],
        ['Name the substance in every unit', 'Write <b>mol CaCl₂</b> and <b>mol Cl</b>, not just “mol”. When the substance changes, a mole-ratio factor is needed, and the units tell you so.'],
        ['Sig figs and keeping digits', 'Keep all digits in the calculator until the end, then round to the sig figs of your <b>given</b> number.']],
      '5.3', ['conv', 'inside']);
    }
  };

  /* ============================================================================== */
  /*  5.4 Volume of a gas at STP                                                     */
  /* ============================================================================== */
  const T54 = {
    id: '5.4', short: 'Gas volume at STP', title: 'Volume of a Gas at STP', subtitle: '22.4 L/mol · 0 °C and 1 atm · moles, grams and particles',
    build() {
      return secsWithDefaults({
        html: big('At <b>STP</b> (standard temperature and pressure: <b>0 °C and 1 atm</b>), 1 mole of <i>any</i> gas takes up <b>22.4 L</b>. That adds one more arrow to the mole map: moles ↔ liters of gas.') +
          '<h3>Same volume, same number, different mass</h3>' + Dg.stpBoxes() +
          '<h3>How big is 22.4 L?</h3>' + Dg.basketballs() + '<p class="note">A cube about 28 cm on each side. About three basketballs of gas holds one whole mole, 6.022 × 10²³ molecules.</p>' +
          '<h3>The map with liters added</h3>' + Dg.moleMap({ path: ['L', 'mol', 'part'] }) +
          '<h3>Game: can I use 22.4 L/mol?</h3>' + widget('canIUse') +
          card('<b>Why only at STP?</b> Gas molecules spread out more when the gas is warmer, so a mole takes up more room. At 25 °C and 1 atm, 1 mol of gas is about <b>24.5 L</b>. You will learn why in the Gases unit. For now: <b>22.4 L/mol means 0 °C, 1 atm, and a gas.</b>') +
          '<h3>Vocabulary</h3>' + flips([['STP', 'what do the letters stand for?', '<b>S</b>tandard <b>T</b>emperature and <b>P</b>ressure: <b>0 °C</b> (273 K) and <b>1 atm</b>.'], ['Molar volume', 'how much space does 1 mol of gas fill?', '<b>22.4 L</b> per mole at STP, the same for every gas.']]),
        keys: 'STP 22.4 L molar volume gas liters standard temperature pressure 0 C 1 atm'
      }, method('Steps', ['Moles ↔ liters: use <b>1 mol = 22.4 L</b> (STP only, gases only).', 'If the given is grams or particles, go to <b>moles first</b> with the molar mass or Avogadro’s number.', 'Then use 22.4 L/mol, or go on to grams or particles for the answer.']),
      examplesSec('5.4', [{ key: 'o2g', label: 'g → L', gen: 'stp' }, { key: 'xe', label: 'g → L (xenon)', gen: 'stp' }, { key: 'nh3L', label: 'L → molecules', gen: 'stp' }, { key: 'co2L', label: 'L → grams', gen: 'stp' }]),
      [['22.4 L/mol is for gases at STP only', 'Not for liquids, not for solids, and not for gases at 25 °C. A mole of liquid water is only about 18 mL.'],
        ['Carry your unrounded value forward', 'When a problem has two parts (like #9 and #10), reuse the mole value from the first part. Do not re-round in the middle.'],
        ['One quantity, two answers', 'For “molecules and grams of 0.12 L CO₂”, find moles <b>once</b>, then branch: × 6.022 × 10²³ for molecules and × molar mass for grams.'],
        ['Use the right molar mass', 'The molar mass of N₂ is 28.02, not 14.01. Check whether the gas is diatomic.']],
      '5.4', ['stp']);
    }
  };

  /* ============================================================================== */
  /*  5.5 Percent composition                                                        */
  /* ============================================================================== */
  const T55 = {
    id: '5.5', short: 'Percent composition', title: 'Percent Composition', subtitle: 'Part ÷ whole × 100 · mass percent of each element',
    build() {
      return secsWithDefaults({
        html: big('Percent composition tells you what part of a compound’s <b>mass</b> comes from each element. The percents of all the elements add up to <b>100 %</b>.') +
          '<h3>Part ÷ whole × 100</h3>' + card('<div class="chain"><span class="term"><b>% element</b> =</span><span class="frac"><span class="num">' + S.N('mass of that element in 1 mol') + '</span><span class="den">' + S.K('molar mass of the compound') + '</span></span><span class="times">× 100</span></div>The <b>part</b> uses <i>all</i> the atoms of the element (atomic mass × subscript). The <b>whole</b> is the molar mass of the compound.') +
          '<h3>Explore: see the composition of any compound</h3>' + widget('composition') +
          '<h3>Why H₂O₂ has more oxygen than H₂O</h3><div class="grid2"><div class="card"><b>H₂O</b>' + Dg.pctBar({ rows: C.composition('H2O').rows.map((r) => ({ el: r.el, pct: r.pct })) }) + '</div><div class="card"><b>H₂O₂</b>' + Dg.pctBar({ rows: C.composition('H2O2').rows.map((r) => ({ el: r.el, pct: r.pct })) }) + '</div></div><p class="note">Same two elements, different ratio, different percent.</p>' +
          '<h3>Using a percent to find a mass</h3>' + card('A 50.0 g sample that is <b>20.0 % hydrogen</b> contains 0.200 × 50.0 g = <b>10.0 g</b> of hydrogen. Percent means “grams in every 100 g”.'),
        keys: 'percent composition mass percent part whole element percent by mass'
      }, method('How to find percent composition', ['Find the <b>molar mass</b> of the compound (the whole).', 'For each element, find its mass in 1 mole of the compound (<b>atomic mass × subscript</b>): the part.', '<b>% element = (mass of element in 1 mol ÷ molar mass of compound) × 100.</b>', 'Check that the percents add to <b>100</b> (within rounding).']),
      examplesSec('5.5', [{ key: 'caco3', label: 'CaCO₃ (worked example)', gen: 'pct' }, { key: 'nh42s', label: '(NH₄)₂S (parentheses)', gen: 'pct' }, { key: 'nh4no3', label: 'NH₄NO₃ (two nitrogens)', gen: 'pct' }]),
      [['Use all the atoms of the element', 'Using the mass of <b>one</b> atom instead of all the atoms is the most common error. In (NH₄)₃PO₄ there are <b>3</b> N and <b>12</b> H. In NH₄NO₃ there are <b>two</b> N atoms, one in each ion.'],
        ['The whole is the compound', 'Always divide by the <b>molar mass of the whole compound</b>, never by the mass of the other elements.'],
        ['Totals can be 99.99 or 100.01', 'Rounding each percent can make the total a hair off 100. That is not a mistake.'],
        ['Check it adds to 100', 'If your percents add to 90 or 110, an atom was missed or counted twice. Go back and recount.']],
      '5.5', ['pct']);
    }
  };

  /* ============================================================================== */
  /*  5.6 Empirical and molecular formulas                                           */
  /* ============================================================================== */
  const T56 = {
    id: '5.6', short: 'Empirical & molecular', title: 'Empirical and Molecular Formulas', subtitle: 'Simplest whole-number ratio · percent → grams → moles → ratio',
    build() {
      const fam = [['CH2O', 'formaldehyde', 1], ['C2H4O2', 'acetic acid', 2], ['C6H12O6', 'glucose', 6]];
      return secsWithDefaults({
        html: big('The <b>empirical formula</b> is the simplest whole-number ratio of atoms in a compound. The <b>molecular formula</b> is the actual number of each atom, and it is a whole-number multiple of the empirical formula: <b>molecular = n × empirical</b>, where <b>n = molar mass ÷ empirical formula mass</b>.') +
          '<h3>Three different compounds, one empirical formula</h3><div class="grid2">' + fam.map((f) => '<div class="card"><b>' + fm(f[0]) + '</b> <small>' + f[1] + ', molar mass ' + C.molarMass(f[0]).toFixed(2) + ' g/mol</small>' + Dg.empVsMol({ unit: 'CH2O', n: f[2], pairs: [{ el: 'C', n: 1 }, { el: 'H', n: 2 }, { el: 'O', n: 1 }] }) + '</div>').join('') + '</div>' +
          '<h3>The recipe</h3>' + Dg.empPipeline({ pct: true, molecular: true }) + '<p class="note">Moles, not grams, because atoms combine in whole-number ratios of <i>atoms</i>, and moles count atoms.</p>' +
          '<h3>What if the ratio has a decimal?</h3><div class="tablewrap">' + S.tbl(['If a ratio ends in…', 'Multiply everything by'], [['.5 (like 1.5 or 10.5)', S.N('2')], ['.33 or .67 (like 1.33)', S.N('3')], ['.25 or .75 (like 1.25)', S.N('4')], ['.2, .4, .6 or .8', S.N('5')], ['within about 0.1 of a whole number (3.96, 10.97)', 'nothing: just <b>round</b>']]) + '</div><p>Try your own ratio:</p>' + widget('ratioFixer') +
          '<h3>Vocabulary</h3>' + flips([['Empirical formula', 'what is it?', 'The <b>simplest whole-number ratio</b> of atoms in a compound. CH₂O.'], ['Molecular formula', 'what is it?', 'The <b>actual number</b> of each atom in one molecule: n × the empirical formula. C₆H₁₂O₆.']]),
        keys: 'empirical formula molecular formula ratio moles percent grams whole number multiply n smallest'
      }, method('Steps', ['Change each <b>percent to grams</b> (assume a 100 g sample), or use the grams given.', 'Change each <b>mass to moles</b> (÷ atomic mass).', '<b>Divide every mole value by the smallest.</b> These are the subscripts.', 'If a result is near x.5, <b>multiply all by 2</b> (near x.33 or x.67, by 3). Do <b>not</b> round 1.5 up to 2.', '<b>Molecular formula:</b> n = molar mass ÷ empirical mass; multiply every subscript by n.']),
      examplesSec('5.6', [{ key: 'glucose', label: 'Percents → both formulas', gen: 'molf' }, { key: 'thio', label: 'Grams → empirical (×2)', gen: 'emp' }, { key: 'meth', label: '3.96 is really 4', gen: 'emp' }, { key: 'propene', label: 'Empirical + M → molecular', gen: 'molf' }, { key: 'hard', label: 'Hard: four elements', gen: 'molf' }]),
      [['Rounding 1.5 up to 2', 'A ratio of 1 : 1.5 is really 2 : 3. <b>Multiply</b> by 2; do not round. Rounding changes the compound.'],
        ['Dividing by the largest', 'Divide every mole value by the <b>smallest</b>, so that the smallest becomes exactly 1.'],
        ['Skipping percent → grams', 'You cannot divide a percent by an atomic mass. Assume 100 g first, so 40.0 % becomes 40.0 g.'],
        ['Forgetting n', 'If the question gives a <b>molar mass</b>, the empirical formula is only halfway. Find n = molar mass ÷ empirical mass and multiply the subscripts.'],
        ['How close to whole is close enough?', 'Within about <b>0.1</b> of a whole number you can round (3.96 → 4, 10.97 → 11). If it is near .5 or .33, multiply instead.']],
      '5.6', ['emp', 'molf']);
    }
  };

  /* ============================================================================== */
  /*  5.7 Hydrates                                                                   */
  /* ============================================================================== */
  const T57 = {
    id: '5.7', short: 'Hydrates', title: 'Hydrates', subtitle: 'Water in the crystal · heating · the formula and the name',
    build() {
      return secsWithDefaults({
        html: big('A <b>hydrate</b> is an ionic compound with a fixed number of <b>water molecules built into its crystal</b>, such as CuSO₄·5H₂O. Heating drives the water off and leaves the <b>anhydrous</b> (“without water”) salt. The mass lost is the mass of water, so you can compare moles of water to moles of salt.') +
          '<h3>What is happening?</h3>' + Dg.hydrateIdea({ salt: 'CuSO4' }) +
          '<h3>Do the experiment</h3><p>Heat the crucible, then use the data to find the formula.</p>' + widget('hydrateLab') +
          '<h3>Prefixes for the number of waters</h3><div class="tablewrap">' + S.tbl(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((x) => x), [D.PREFIX.map((p) => p + '-')]) + '</div>' +
          card('<b>Naming:</b> name the salt first (with its Roman numeral if the metal needs one), then the prefix + <b>hydrate</b>.<br>CuSO₄·5H₂O → <b>copper(II) sulfate pentahydrate</b>.<br>CoCl₂·6H₂O → <b>cobalt(II) chloride hexahydrate</b>.') +
          '<h3>Vocabulary</h3>' + flips([['Hydrate', 'what is it?', 'An ionic compound with water molecules <b>built into the crystal</b>: salt·xH₂O.'], ['Anhydrous', 'what does it mean?', '“Without water”: the salt left after the water has been heated off.']]),
        keys: 'hydrate anhydrous water of crystallization crucible heating copper sulfate pentahydrate prefix name formula'
      }, method('How to find the formula of a hydrate', ['<b>Mass of water</b> = mass of hydrate − mass of anhydrous salt.', 'Change both to <b>moles</b>: water ÷ 18.02 g/mol, salt ÷ its molar mass.', '<b>x</b> = moles of H₂O ÷ moles of salt. Round to the nearest whole number.', 'Write the formula <b>salt·xH₂O</b> and the name: salt name + prefix + “hydrate”.']),
      examplesSec('5.7', [{ key: 'cacl2hyd', label: 'CaCl₂ (worked example)', gen: 'hyd' }, { key: 'mono', label: 'x = 0.995 → mono', gen: 'hyd' }, { key: 'pctHyd', label: 'From % water', gen: 'hyd' }, { key: 'cruc', label: 'Crucible data + % water', gen: 'hyd' }]),
      [['Compare moles, not grams', 'Dividing the <b>grams</b> of water by the grams of salt is the classic error. Water is only 18.02 g/mol, so convert both masses to moles first.'],
        ['The salt’s molar mass has no water in it', 'Use the molar mass of the <b>anhydrous</b> salt (CuSO₄ = 159.61), not the hydrate.'],
        ['Stopped heating early?', 'Water left in the crucible means the mass lost is too small, so x comes out <b>too low</b>. Heat until the mass stops changing.'],
        ['x should be a whole number', 'If you get 4.2, something is off: reheat and re-weigh, or check the arithmetic. Round only when it is within about 0.15 of a whole number.'],
        ['Roman numerals in the name', 'Copper and cobalt need one: copper(II) sulfate, cobalt(II) chloride. Use the nomenclature rules for the salt first.']],
      '5.7', ['hyd']);
    }
  };

  const TOPICS = [T51, T52, T53, T54, T55, T56, T57];

  /* ---------- rendering a topic ---------- */
  function topicPage(id) {
    const t = TOPICS.find((x) => x.id === id), i = TOPICS.indexOf(t);
    const secs = t.build();
    const prev = TOPICS[i - 1], next = TOPICS[i + 1];
    const html = '<article class="topic" data-topic="' + t.id + '"><header class="t-head"><span class="t-num">' + t.id + '</span><div><h1>' + t.title + '</h1><p>' + t.subtitle + '</p></div></header>' +
      '<nav class="t-sub" aria-label="In this topic">' + secs.map((s) => '<a href="#/t/' + t.id + '/' + s.id + '" data-s="' + s.id + '">' + SECTION_LABEL[s.id] + '</a>').join('') + '</nav>' +
      secs.map((s) => '<section class="sec" id="s-' + s.id + '"><h2><span class="tick" aria-hidden="true">' + ({ learn: '1', method: '2', examples: '3', watch: '!', practice: '4', check: '5' }[s.id]) + '</span>' + SECTION_LABEL[s.id] + '</h2>' + s.html + '</section>').join('') +
      '<footer class="t-foot">' + (prev ? '<a href="#/t/' + prev.id + '"><small>◀ Previous</small>' + prev.id + ' ' + prev.short + '</a>' : '<a href="#/map"><small>◀ Previous</small>The Mole Map</a>') + (next ? '<a class="next" href="#/t/' + next.id + '"><small>Next ▶</small>' + next.id + ' ' + next.short + '</a>' : '<a class="next" href="#/practice"><small>Next ▶</small>Practice problems</a>') + '</footer></article>';
    return { title: t.id + ' ' + t.title, html, mount(el) {
      secs.forEach((s) => { const e = document.getElementById('s-' + s.id); if (s.mount) s.mount(e); });
      $$('[data-w]', el).forEach((w) => { const f = W[w.dataset.w]; if (f) f(w); });
    } };
  }
  function searchItems() {
    const out = [];
    TOPICS.forEach((t) => { const secs = t.build(); secs.forEach((s) => out.push({ title: t.id + ' ' + t.title + ': ' + SECTION_LABEL[s.id], keys: (s.keys || '') + ' ' + t.subtitle, href: '#/t/' + t.id + '/' + s.id, where: 'Topic ' + t.id })); });
    return out;
  }

  root.MolesLearn = { TOPICS, topicPage, searchItems, mountWidgets: (el) => $$('[data-w]', el).forEach((w) => { const f = W[w.dataset.w]; if (f && !w.dataset.m) { w.dataset.m = 1; f(w); } }) };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.MolesLearn;
})(typeof self !== 'undefined' ? self : this);
