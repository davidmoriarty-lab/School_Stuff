/* explain.js: "The math" card and the caption under the bench. For each stage of the titration
 * it writes out the method a student would use, with this experiment's numbers in it. */
(function (root) {
  'use strict';
  const C = root.Chem || require('./chem.js');
  const f = (v, d) => v.toFixed(d === undefined ? 2 : d).replace('-', '−');
  const sci = (v) => { if (v === 0) return '0'; const e = Math.floor(Math.log10(Math.abs(v))); return (v / Math.pow(10, e)).toFixed(2) + ' × 10' + sup(e); };
  const sup = (n) => String(n).split('').map(c => ({ '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }[c])).join('');
  const eqn = (s) => '<span class="eqn">' + s + '</span>';
  const p = (s) => '<p>' + s + '</p>';

  /* Stage name, a one-line caption and the worked calculation (HTML). */
  function explain(exp, vT, mix, secret) {
    const A = C.REAGENTS[exp.analyte], T = C.REAGENTS[exp.titrant];
    const acid = A.type === 'acid';                           // is the sample an acid (titrated with base)?
    const reg = C.region(exp, vT), eq = C.equivalencePoints(exp), pk = C.pKaSequence(exp);
    const nA = exp.Ca * exp.Va, nT = exp.Ct * vT, V = exp.Va + vT;
    const ion = acid ? 'OH⁻' : 'H₃O⁺', ownIon = acid ? 'H₃O⁺' : 'OH⁻';
    const out = { stage: '', caption: '', html: '' };
    const check = '<p class="ans">pH = ' + f(mix.pH) + '</p>';
    const pFrom = (x) => acid ? -Math.log10(x) : 14 + Math.log10(x);     // pH from [own ion] of the sample side
    const pAfter = (x) => acid ? 14 + Math.log10(x) : -Math.log10(x);    // pH from excess titrant ion

    if (secret) {
      out.stage = 'Mystery sample';
      out.caption = 'Add ' + T.formula + ' until the indicator <b>just</b> changes color and stays changed. That is the endpoint.';
      out.html = '<h4>Finding an unknown concentration</h4>' +
        p('At the equivalence point, moles of ' + T.formula + ' added = moles of ' + A.formula + ' in the flask' + (eq.length > 1 ? ' (times the number of protons transferred)' : '') + '.') +
        eqn('M<sub>flask</sub> × V<sub>flask</sub> = M<sub>buret</sub> × V<sub>added</sub>') +
        eqn('M<sub>flask</sub> = ' + f(exp.Ct, 3) + ' M × V<sub>added</sub> ÷ ' + f(exp.Va) + ' mL') +
        p('V<sub>added</sub> = final buret reading − starting buret reading. Read the buret to 0.01 mL, then enter your answer in the lab report.');
      return out;
    }

    /* ----- strong acid or strong base in the flask ----- */
    if (A.strong) {
      const left = nA - nT;
      const table = '<table><tr><th></th><th>' + ownIon + '</th><th>' + ion + '</th></tr><tr><td>before (mmol)</td><td>' + f(nA, 3) + '</td><td>' + f(nT, 3) + '</td></tr><tr><td>change</td><td>−' + f(Math.min(nA, nT), 3) + '</td><td>−' + f(Math.min(nA, nT), 3) + '</td></tr><tr><td>after</td><td>' + f(Math.max(0, left), 3) + '</td><td>' + f(Math.max(0, -left), 3) + '</td></tr></table>';
      if (reg.region === 'start') {
        out.stage = 'Before any titrant';
        out.caption = A.formula + ' is a strong ' + A.type + ': every formula unit has ionized, so [' + ownIon + '] equals its concentration.';
        out.html = '<h4>Strong ' + A.type + ' alone</h4>' + p('It ionizes completely, so [' + ownIon + '] = ' + f(exp.Ca, 3) + ' M.') +
          eqn(acid ? 'pH = −log(' + f(exp.Ca, 3) + ') = ' + f(-Math.log10(exp.Ca)) : 'pOH = −log(' + f(exp.Ca, 3) + ') = ' + f(-Math.log10(exp.Ca)) + ' &nbsp;→&nbsp; pH = 14.00 − pOH = ' + f(14 + Math.log10(exp.Ca))) + check;
      } else if (reg.region === 'equivalence') {
        out.stage = 'Equivalence point';
        out.caption = '<b>Equivalence point.</b> Moles of ' + ion + ' added equal the moles of ' + ownIon + ' that were in the flask. Only water and spectator ions are left, so pH = 7.';
        out.html = '<h4>Equivalence point</h4>' + eqn('H₃O⁺ + OH⁻ → 2 H₂O') + table + p('Neither is left over. The flask holds only Na⁺, Cl⁻ and water: a neutral salt solution.') + check;
      } else if (left > 0) {
        out.stage = 'Before the equivalence point';
        out.caption = 'Each ' + ion + ' added removes one ' + ownIon + '. There is still ' + ownIon + ' left over, so the pH changes slowly.';
        const c = left / V;
        out.html = '<h4>Before equivalence: ' + ownIon + ' left over</h4>' + eqn('H₃O⁺ + OH⁻ → 2 H₂O') + table +
          eqn('[' + ownIon + '] = ' + f(left, 3) + ' mmol ÷ ' + f(V) + ' mL = ' + sci(c) + ' M') +
          eqn(acid ? 'pH = −log[H₃O⁺] = ' + f(-Math.log10(c)) : 'pOH = ' + f(-Math.log10(c)) + ' &nbsp;→&nbsp; pH = ' + f(14 + Math.log10(c))) + check;
      } else {
        out.stage = 'After the equivalence point';
        out.caption = 'All the ' + ownIon + ' is gone. Every extra drop now just adds ' + ion + ', so the titrant controls the pH.';
        const c = -left / V;
        out.html = '<h4>After equivalence: excess ' + ion + '</h4>' + table +
          eqn('[' + ion + '] = ' + f(-left, 3) + ' mmol ÷ ' + f(V) + ' mL = ' + sci(c) + ' M') +
          eqn(acid ? 'pOH = ' + f(-Math.log10(c)) + ' &nbsp;→&nbsp; pH = ' + f(14 + Math.log10(c)) : 'pH = −log[H₃O⁺] = ' + f(-Math.log10(c))) + check;
      }
      return out;
    }

    /* ----- weak acid or weak base in the flask ----- */
    const mono = eq.length === 1;
    const k = Math.min(reg.k, eq.length - 1);
    // the conjugate pair in play: for an acid, forms[as + k] (acid) and forms[as + k + 1] (base)
    const iAcid = acid ? A.as + k : A.as - k - 1, HA = A.forms[iAcid], Ab = A.forms[iAcid + 1];
    const Ka = A.Ka[iAcid], pKa = -Math.log10(Ka), Kb = C.KW / Ka;
    const from = acid ? HA : Ab, to = acid ? Ab : HA;         // what the titrant converts, and into what
    const rxn = from + ' + ' + ion + ' → ' + to + ' + H₂O';
    const prev = k ? eq[k - 1] : 0, done = (exp.Ct * (vT - prev)), stepN = nA;   // mmol converted in this step
    // close enough: the worked answer stands; otherwise say what the full calculation gives
    const finish = (approx) => Math.abs(approx - mix.pH) > 0.03 ? exact(approx) + check : '';
    const exact = (approx) => Math.abs(approx - mix.pH) > 0.03 ? p('<small>That is the usual classroom estimate. Solving the full equilibrium gives pH ' + f(mix.pH) + '.</small>') : '';

    if (reg.region === 'start') {
      out.stage = 'Before any titrant';
      if (acid) {
        const x = Math.sqrt(Ka * exp.Ca);
        out.caption = A.formula + ' is a weak acid: only about ' + f(100 * mix.species[1 + 1 + 1].mmol / nA, 1) + '% of its molecules have ionized. Most are still intact.';
        out.html = '<h4>Weak acid alone</h4>' + eqn(HA + ' + H₂O ⇌ H₃O⁺ + ' + Ab + ' &nbsp;&nbsp; K<sub>a</sub> = ' + sci(Ka)) +
          eqn('K<sub>a</sub> = x² ÷ (' + f(exp.Ca, 3) + ' − x) &nbsp;→&nbsp; x ≈ √(K<sub>a</sub> × ' + f(exp.Ca, 3) + ') = ' + sci(x) + ' M') +
          eqn('pH = −log x = ' + f(-Math.log10(x))) + finish(-Math.log10(x));
      } else {
        const KbB = C.KW / A.Ka[A.as - 1], x = Math.sqrt(KbB * exp.Ca);
        out.caption = A.formula + ' is a weak base: only a small fraction has taken a proton from water to make OH⁻.';
        out.html = '<h4>Weak base alone</h4>' + eqn(Ab + ' + H₂O ⇌ ' + HA + ' + OH⁻ &nbsp;&nbsp; K<sub>b</sub> = ' + sci(KbB)) +
          eqn('x ≈ √(K<sub>b</sub> × ' + f(exp.Ca, 3) + ') = ' + sci(x) + ' M = [OH⁻]') +
          eqn('pOH = ' + f(-Math.log10(x)) + ' &nbsp;→&nbsp; pH = ' + f(14 + Math.log10(x))) + finish(14 + Math.log10(x));
      }
      return out;
    }
    if (reg.region === 'after') {
      const excess = nT - eq[eq.length - 1] * exp.Ct, c = excess / V;
      out.stage = 'After the ' + (mono ? '' : 'last ') + 'equivalence point';
      out.caption = 'All of the ' + A.formula + ' has reacted. Extra ' + ion + ' now builds up, so the titrant controls the pH.';
      out.html = '<h4>After equivalence: excess ' + ion + '</h4>' +
        eqn('excess ' + ion + ' = ' + f(nT, 3) + ' − ' + f(eq[eq.length - 1] * exp.Ct, 3) + ' = ' + f(excess, 3) + ' mmol') +
        eqn('[' + ion + '] = ' + f(excess, 3) + ' ÷ ' + f(V) + ' mL = ' + sci(c) + ' M') +
        eqn(acid ? 'pOH = ' + f(-Math.log10(c)) + ' &nbsp;→&nbsp; pH = ' + f(14 + Math.log10(c)) : 'pH = −log[H₃O⁺] = ' + f(-Math.log10(c))) + finish(pAfter(c));
      return out;
    }
    const nth = mono ? '' : ['first ', 'second ', 'third '][k];
    if (reg.region === 'equivalence') {
      const conc = nA / V;
      out.stage = (mono ? '' : ['First ', 'Second ', 'Third '][k]) + (mono ? 'Equivalence point' : 'equivalence point');
      const last = k === eq.length - 1;
      if (last && mono) {
        // only the conjugate is left; it reacts with water
        if (acid) {
          const x = Math.sqrt(Kb * conc);
          out.caption = '<b>Equivalence point.</b> All the ' + HA + ' has become ' + Ab + ', which is a weak base. That is why the pH here is <b>above 7</b>.';
          out.html = '<h4>Equivalence point: only the conjugate base is left</h4>' + eqn('[' + Ab + '] = ' + f(nA, 3) + ' mmol ÷ ' + f(V) + ' mL = ' + f(conc, 4) + ' M') +
            eqn(Ab + ' + H₂O ⇌ ' + HA + ' + OH⁻ &nbsp;&nbsp; K<sub>b</sub> = K<sub>w</sub> ÷ K<sub>a</sub> = ' + sci(Kb)) +
            eqn('[OH⁻] ≈ √(K<sub>b</sub> × ' + f(conc, 4) + ') = ' + sci(x) + ' M') + eqn('pOH = ' + f(-Math.log10(x)) + ' &nbsp;→&nbsp; pH = ' + f(14 + Math.log10(x))) + finish(14 + Math.log10(x));
        } else {
          const x = Math.sqrt(Ka * conc);
          out.caption = '<b>Equivalence point.</b> All the ' + Ab + ' has become ' + HA + ', which is a weak acid. That is why the pH here is <b>below 7</b>.';
          out.html = '<h4>Equivalence point: only the conjugate acid is left</h4>' + eqn('[' + HA + '] = ' + f(nA, 3) + ' mmol ÷ ' + f(V) + ' mL = ' + f(conc, 4) + ' M') +
            eqn(HA + ' + H₂O ⇌ ' + Ab + ' + H₃O⁺ &nbsp;&nbsp; K<sub>a</sub> = K<sub>w</sub> ÷ K<sub>b</sub> = ' + sci(Ka)) +
            eqn('[H₃O⁺] ≈ √(K<sub>a</sub> × ' + f(conc, 4) + ') = ' + sci(x) + ' M') + eqn('pH = ' + f(-Math.log10(x))) + finish(-Math.log10(x));
        }
      } else {
        // an in-between form that can both give and take a proton
        const mid = A.forms[acid ? A.as + k + 1 : A.as - k - 1];
        const pk2 = pk[k + 1];
        out.caption = '<b>' + out.stage + '.</b> Almost everything is now ' + mid + '.' + (pk2 !== undefined ? ' It can give or take a proton, so the pH sits half-way between the two pK<sub>a</sub> values.' : '');
        out.html = '<h4>' + out.stage + '</h4>' + p('Moles of ' + ion + ' added = ' + (k + 1) + ' × moles of ' + A.formula + '. Nearly all of it is now ' + mid + '.') +
          (pk2 !== undefined ? eqn('pH ≈ (pK<sub>a' + (acid ? k + 1 : pk.length - k) + '</sub> + pK<sub>a' + (acid ? k + 2 : pk.length - k - 1) + '</sub>) ÷ 2 = (' + f(pk[k]) + ' + ' + f(pk2) + ') ÷ 2 = ' + f((pk[k] + pk2) / 2)) + finish((pk[k] + pk2) / 2)
            : p('The last form is a weak ' + (acid ? 'base' : 'acid') + ', so the solution is ' + (acid ? 'basic' : 'acidic') + '.') + check);
      }
      return out;
    }
    // before an equivalence point: a buffer of the conjugate pair
    const nTo = done, nFrom = stepN - done;
    const table = '<table><tr><th></th><th>' + from + '</th><th>' + ion + '</th><th>' + to + '</th></tr><tr><td>before (mmol)</td><td>' + f(stepN, 3) + '</td><td>' + f(done, 3) + '</td><td>0</td></tr><tr><td>change</td><td>−' + f(done, 3) + '</td><td>−' + f(done, 3) + '</td><td>+' + f(done, 3) + '</td></tr><tr><td>after</td><td>' + f(nFrom, 3) + '</td><td>0</td><td>' + f(nTo, 3) + '</td></tr></table>';
    const nBase = acid ? nTo : nFrom, nAc = acid ? nFrom : nTo, hh = pKa + Math.log10(nBase / nAc);
    if (reg.region === 'half') {
      out.stage = 'Half-equivalence point' + (mono ? '' : ' (' + nth.trim() + ' step)');
      out.caption = '<b>Half-way to equivalence.</b> Exactly half of the ' + from + ' has been converted, so [' + HA + '] = [' + Ab + '] and <b>pH = pK<sub>a</sub> = ' + f(pKa) + '</b>.';
      out.html = '<h4>Half-equivalence point</h4>' + eqn(rxn) + table + p('The two amounts are equal, so their ratio is 1 and log(1) = 0.') +
        eqn('pH = pK<sub>a</sub> + log(1) = pK<sub>a</sub> = ' + f(pKa)) + finish(pKa);
    } else {
      out.stage = 'Buffer region' + (mono ? '' : ' (' + nth.trim() + ' step)');
      out.caption = '<b>Buffer region.</b> The flask holds both ' + HA + ' and ' + Ab + '. Each ' + ion + ' added is used up converting ' + from + ' to ' + to + ', so the pH barely moves.';
      out.html = '<h4>Before equivalence: a buffer</h4>' + eqn(rxn) + table +
        eqn('pH = pK<sub>a</sub> + log(mol ' + Ab + ' ÷ mol ' + HA + ')') +
        eqn('pH = ' + f(pKa) + ' + log(' + f(nBase, 3) + ' ÷ ' + f(nAc, 3) + ') = ' + f(hh)) + finish(hh);
    }
    return out;
  }

  const api = { explain };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Explain = api;
})(typeof self !== 'undefined' ? self : this);
