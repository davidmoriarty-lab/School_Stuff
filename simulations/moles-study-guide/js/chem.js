/* chem.js: the chemistry of Unit 5. Pure functions, no drawing, so it can be tested in Node.
 *
 *   parseFormula     "Al2(SO4)3", "CuSO4·5H2O" -> atom counts and a tree (for the parentheses pictures)
 *   molarMass, composition, particleWord
 *   sig figs         sigFigs, roundSig, fmtVal (decides when to switch to scientific notation), parseNumber
 *   empirical        percent/grams -> moles -> ratio -> whole numbers (the x.5 and x.33 rules)
 *   hydrate          mass lost on heating -> x -> formula and name
 *
 * Rounding follows the teacher's convention: unrounded values carry through every step and only the
 * final answer is rounded to the sig figs of the data. Atomic masses are to 0.01 g/mol.
 */
(function (root) {
  'use strict';
  const D = root.MolesData || require('./data.js');
  const EL = D.ELEMENTS;

  /* ---------- formulas ---------- */
  const SUB = '₀₁₂₃₄₅₆₇₈₉', SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const unSub = (s) => s.replace(/[₀-₉]/g, (c) => String(SUB.indexOf(c)));
  const toSub = (s) => String(s).replace(/\d/g, (d) => SUB[+d]);
  const toSup = (s) => String(s).replace(/\d/g, (d) => SUP[+d]).replace(/-/g, '⁻');

  function normalize(str) {
    return unSub(String(str || '')).replace(/[\s_]/g, '').replace(/[•∙*.]/g, '·').replace(/\[/g, '(').replace(/\]/g, ')');
  }

  /* Parse a formula. Returns { ok, error, text, counts:{El:n}, order:[El...], parts:[{coef, tree, counts}], water } */
  function parseFormula(input) {
    const text = normalize(input);
    if (!text) return { ok: false, error: 'Type a formula, like H2O or Mg(OH)2.' };
    const segs = text.split('·');
    const res = { ok: true, text, counts: {}, order: [], parts: [], water: 0 };
    for (let k = 0; k < segs.length; k++) {
      let seg = segs[k], coef = 1;
      const m = /^(\d+)(.*)$/.exec(seg);
      if (m) {
        if (k === 0) return { ok: false, error: 'A formula cannot start with a number.' };
        coef = parseInt(m[1], 10); seg = m[2];
      }
      if (!seg) return { ok: false, error: 'Something is missing after the dot.' };
      let i = 0;
      const readNum = () => { let s = ''; while (i < seg.length && /\d/.test(seg[i])) s += seg[i++]; return s ? parseInt(s, 10) : null; };
      const group = (depth) => {
        const kids = [];
        while (i < seg.length) {
          const ch = seg[i];
          if (ch === '(') {
            i++; const inner = group(depth + 1);
            if (inner.error) return inner;
            if (seg[i] !== ')') return { error: 'A parenthesis is not closed.' };
            i++; const n = readNum();
            if (!inner.kids.length) return { error: 'There is nothing inside the parentheses.' };
            kids.push({ type: 'grp', kids: inner.kids, n: n || 1, written: n !== null });
          } else if (ch === ')') {
            if (depth === 0) return { error: 'There is a ) without a matching (.' };
            break;
          } else if (/[A-Z]/.test(ch)) {
            let sym = ch; i++;
            if (i < seg.length && /[a-z]/.test(seg[i])) sym += seg[i++];
            if (!EL[sym]) return { error: '"' + sym + '" is not an element I know. Check your capital letters (Co is cobalt, CO is carbon monoxide).' };
            const n = readNum();
            kids.push({ type: 'el', el: sym, n: n || 1, written: n !== null });
          } else if (/\d/.test(ch)) {
            return { error: 'A number is in the wrong place (subscripts come after the symbol).' };
          } else {
            return { error: 'I do not understand the character "' + ch + '".' };
          }
        }
        return { kids };
      };
      const g = group(0);
      if (g.error) return { ok: false, error: g.error };
      if (i < seg.length) return { ok: false, error: 'There is a ) without a matching (.' };
      const counts = {}, order = [];
      const walk = (kids, mult) => kids.forEach((nd) => {
        if (nd.type === 'el') { if (!(nd.el in counts)) { counts[nd.el] = 0; order.push(nd.el); } counts[nd.el] += nd.n * mult; }
        else walk(nd.kids, mult * nd.n);
      });
      walk(g.kids, 1);
      res.parts.push({ coef, tree: g.kids, counts, order, text: seg });
      for (const el of order) { if (!(el in res.counts)) { res.counts[el] = 0; res.order.push(el); } res.counts[el] += counts[el] * coef; }
    }
    if (res.parts.length > 1) res.water = res.parts.slice(1).reduce((t, p) => t + p.coef, 0);
    return res;
  }

  /* Same atoms, same numbers? (used to mark a typed formula right) */
  function sameFormula(a, b) {
    const x = parseFormula(a), y = parseFormula(b);
    if (!x.ok || !y.ok) return false;
    const kx = Object.keys(x.counts), ky = Object.keys(y.counts);
    return kx.length === ky.length && kx.every((k) => x.counts[k] === y.counts[k]);
  }

  const fmtFormula = (text) => '<span class="fm">' + normalize(text).replace(/([A-Za-z)])(\d+)/g, '$1<sub>$2</sub>') + '</span>';
  const fmtFormulaText = (text) => normalize(text).replace(/([A-Za-z)])(\d+)/g, (m, a, d) => a + toSub(d));

  /* Atom count per element in a formula, as text: Al₂(SO₄)₃ -> "2 Al, 3 S, 12 O" */
  const atomSummary = (f) => f.order.map((e) => f.counts[e] + ' ' + e).join(', ');

  /* ---------- molar mass and composition ---------- */
  function massBreakdown(counts, order) {
    const els = order || Object.keys(counts);
    const rows = els.map((el) => ({ el, n: counts[el], atomic: EL[el].mass, sub: counts[el] * EL[el].mass }));
    return { rows, total: rows.reduce((t, r) => t + r.sub, 0) };
  }
  const molarMass = (formula) => { const f = typeof formula === 'string' ? parseFormula(formula) : formula; return f.ok ? massBreakdown(f.counts, f.order).total : NaN; };

  function composition(formula) {
    const f = typeof formula === 'string' ? parseFormula(formula) : formula;
    const mb = massBreakdown(f.counts, f.order);
    return { rows: mb.rows.map((r) => Object.assign({ pct: r.sub / mb.total * 100 }, r)), total: mb.total };
  }

  /* atoms, molecules or formula units? */
  function particleWord(formula) {
    const f = typeof formula === 'string' ? parseFormula(formula) : formula;
    if (f.parts.length > 1) return 'formula units';
    if (f.order.length === 1) return f.counts[f.order[0]] === 1 ? 'atoms' : 'molecules';
    if (f.order.some((e) => EL[e].metal) || /NH4/.test(f.text)) return 'formula units';
    return 'molecules';
  }
  const particleSingular = (w) => ({ atoms: 'atom', molecules: 'molecule', 'formula units': 'formula unit' }[w]);
  const nameOf = (formula) => D.NAMES[normalize(formula)] || null;

  /* ---------- numbers, sig figs and scientific notation ---------- */
  const SUPMAP = {}; SUP.split('').forEach((c, i) => { SUPMAP[c] = String(i); }); SUPMAP['⁻'] = '-'; SUPMAP['⁺'] = '+';

  /* Read a number the way a student types it: 1.51e24, 1.51 x 10^24, 1.51×10²⁴, 6.022 * 10^23 ... */
  function parseNumber(str) {
    let s = String(str == null ? '' : str).trim();
    if (!s) return NaN;
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]/g, (c) => SUPMAP[c]).replace(/−/g, '-').replace(/,/g, '').replace(/\s+/g, '');
    s = s.replace(/[x×*·]10\^?\(?(-?\d+)\)?$/i, 'e$1');            // "1.5x10^24" or "1.5×1024" (superscript lost) -> 1.5e24
    s = s.replace(/^10\^(-?\d+)$/, '1e$1');                        // a bare "10^24" (the caret is required, so 100 and 108 stay themselves)
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return NaN;
    return parseFloat(s);
  }

  /* How many significant figures does a number, as written, have? */
  function sigFigs(str) {
    let s = String(str).trim().replace(/−/g, '-').replace(/,/g, '');
    s = s.replace(/[x×*·]\s*10.*$/i, '').replace(/e[+-]?\d+$/i, '').replace(/^[+-]/, '').trim();
    if (s.indexOf('.') >= 0) return s.replace('.', '').replace(/^0+/, '').length;
    return s.replace(/^0+/, '').replace(/0+$/, '').length || 1;
  }

  function roundSig(x, sf) {
    if (!isFinite(x) || x === 0) return x;
    const e = Math.floor(Math.log10(Math.abs(x))), f = Math.pow(10, sf - 1 - e);
    return Math.round(+(x * f).toPrecision(12)) / f;
  }
  const roundDp = (x, dp) => { const f = Math.pow(10, dp); return Math.round(+(x * f).toPrecision(12)) / f; };

  /* A value to sf significant figures: { text, html, sci }. Scientific notation is used when the plain
   * form would be misleading (180 to 2 sf), very large or very small. */
  function fmtVal(x, sf) {
    if (x === 0) return { text: '0', html: '0', sci: false };
    const r = roundSig(x, sf), e = Math.floor(Math.log10(Math.abs(r)));
    const intDigits = e >= 0 ? e + 1 : 0;
    const sci = Math.abs(r) >= 1e5 || Math.abs(r) < 1e-3 || intDigits > sf;
    if (sci) {
      const m = (r / Math.pow(10, e)).toFixed(Math.max(0, sf - 1));
      return { sci: true, text: m + ' × 10' + toSup(e), html: m + ' × 10<sup>' + String(e).replace('-', '−') + '</sup>', mant: m, exp: e };
    }
    const dec = Math.max(0, sf - 1 - e), t = r.toFixed(dec);
    return { sci: false, text: t, html: t };
  }
  /* Always scientific, e.g. 6.022 × 10²³ */
  function fmtSci(x, digits) {
    const e = Math.floor(Math.log10(Math.abs(x)));
    const m = (x / Math.pow(10, e)).toFixed(digits === undefined ? 3 : digits);
    return { text: m + ' × 10' + toSup(e), html: m + ' × 10<sup>' + String(e).replace('-', '−') + '</sup>', mant: m, exp: e };
  }
  /* A number shown the way it was written in a problem ("3.4e26" -> 3.4 × 10²⁶, "9.00" stays "9.00") */
  function fmtGiven(str) {
    const s = String(str).trim();
    const m = /^([+-]?[\d.]+)\s*(?:e|[x×*]\s*10\^?)\s*([+-]?\d+)$/i.exec(s);
    if (m) return { text: m[1] + ' × 10' + toSup(parseInt(m[2], 10)), html: m[1] + ' × 10<sup>' + parseInt(m[2], 10) + '</sup>' };
    return { text: s, html: s };
  }
  const fmtFixed = (x, dp) => ({ text: x.toFixed(dp), html: x.toFixed(dp) });

  /* Is a typed answer right?  Within one rounding digit of the key, or within 1.5 %. */
  function closeEnough(user, key, sf) {
    if (!isFinite(user) || !isFinite(key)) return false;
    if (key === 0) return Math.abs(user) < 1e-9;
    const rel = Math.abs(user - key) / Math.abs(key);
    if (rel <= 0.015) return true;
    return sf ? Math.abs(roundSig(user, sf) - roundSig(key, sf)) <= Math.abs(key) * Math.pow(10, -(sf - 1)) * 0.6 : false;
  }

  /* ---------- empirical and molecular formulas ---------- */
  /* items: [{el, grams}]. Returns the whole pipeline so every step can be shown. */
  function empirical(items, opts) {
    opts = opts || {};
    const moles = items.map((it) => it.grams / EL[it.el].mass);
    const min = Math.min.apply(null, moles);
    const ratios = moles.map((m) => m / min);
    let k = 0, final = null;
    const tol = opts.tol || 0.1;
    for (const mult of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const scaled = ratios.map((r) => r * mult);
      if (scaled.every((v) => Math.abs(v - Math.round(v)) <= tol + 1e-9 * v)) { k = mult; final = scaled.map(Math.round); break; }
    }
    // the near-miss rule of thumb a student would use: which multiplier does the decimal part suggest?
    const frac = ratios.map((r) => r - Math.floor(r));
    return { moles, min, ratios, mult: k, final, ok: !!final, frac, items };
  }
  /* Build a formula string like C6H12O6 from [{el, n}] in the order given. */
  const formulaString = (pairs) => pairs.map((p) => p.el + (p.n > 1 ? p.n : '')).join('');

  /* Empirical formula mass and n for a molecular formula. */
  function molecular(empCounts, empOrder, molarMassGiven) {
    const em = massBreakdown(empCounts, empOrder).total;
    const nRaw = molarMassGiven / em, n = Math.round(nRaw);
    return { empMass: em, nRaw, n, ok: n >= 1 && Math.abs(nRaw - n) <= 0.1 * Math.max(1, n) * 0.5 + 0.05 };
  }

  /* ---------- hydrates ---------- */
  const hydratePrefix = (x) => D.PREFIX[x - 1] || null;
  const hydrateName = (salt, x) => { const nm = nameOf(salt); return nm && hydratePrefix(x) ? nm + ' ' + hydratePrefix(x) + 'hydrate' : null; };
  const WATER = 18.02;
  /* Any two of: grams of hydrate, grams of anhydrous salt, grams of water lost, percent water. */
  function hydrate(o) {
    const salt = parseFormula(o.salt), Ms = molarMass(salt), Mw = molarMass('H2O');
    let mH = o.mHyd, mA = o.mAnh, mW = o.mWater;
    if (o.pctWater !== undefined) { mH = 100; mW = o.pctWater; mA = 100 - o.pctWater; }
    if (mW === undefined) mW = mH - mA;
    if (mA === undefined) mA = mH - mW;
    if (mH === undefined) mH = mA + mW;
    const nW = mW / Mw, nS = mA / Ms, xRaw = nW / nS, x = Math.round(xRaw);
    return { salt, Ms, Mw, mH, mA, mW, nW, nS, xRaw, x, ok: x >= 1 && Math.abs(xRaw - x) <= 0.15,
      formula: o.salt + '·' + (x > 1 ? x : '') + 'H2O', name: hydrateName(o.salt, x), pctWater: mW / mH * 100 };
  }

  const api = { parseFormula, sameFormula, normalize, fmtFormula, fmtFormulaText, toSub, toSup, atomSummary, massBreakdown, molarMass, composition, particleWord, particleSingular, nameOf,
    parseNumber, sigFigs, roundSig, roundDp, fmtVal, fmtSci, fmtGiven, fmtFixed, closeEnough, empirical, formulaString, molecular, hydrate, hydratePrefix, hydrateName, WATER };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MolesChem = api;
})(typeof self !== 'undefined' ? self : this);
