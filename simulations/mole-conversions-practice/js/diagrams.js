/* diagrams.js: the pictures. Each function returns an HTML string (HTML + inline SVG), themed by CSS variables. */
(function (root) {
  'use strict';
  const C = root.MolesChem, S = root.MolesSteps, D = root.MolesData;
  const EL = D.ELEMENTS, fm = C.fmtFormula;

  /* ---------- atoms ---------- */
  const lum = (hex) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return 0.299 * r + 0.587 * g + 0.114 * b; };
  const atomColor = (el) => D.ATOM_COLOR[el] || (EL[el] && EL[el].metal ? '#8aa0b8' : '#c9a0dc');
  /* A ball with the element symbol, optionally with a count badge. */
  function atom(el, n, o) {
    o = o || {}; const c = atomColor(el), dark = lum(c) > 150;
    return '<span class="atomwrap"><span class="atom' + (o.big ? ' big' : '') + '" style="--c:' + c + ';color:' + (dark ? '#1a2233' : '#fff') + '" title="' + EL[el].name + '">' + el + '</span>' + (n > 1 || o.showOne ? '<span class="cnt">×' + n + '</span>' : '') + '</span>';
  }
  const water = () => '<span class="h2o" title="water, H₂O"><i class="o"></i><i class="h a"></i><i class="h b"></i></span>';

  /* ---------- the mole map (HTML grid so it reflows on phones) ---------- */
  const NODES = { part: ['PARTICLES', 'atoms · molecules · formula units'], mol: ['MOLES', 'the counting unit'], g: ['GRAMS', 'mass on a balance'], L: ['LITERS', 'gas at STP only'], el: ['MOLES of an ELEMENT', 'inside the compound'] };
  const EDGES = {
    'part>mol': ['÷ 6.022 × 10²³', 'pm', 'r'], 'mol>part': ['× 6.022 × 10²³', 'pm', 'l'], 'mol>g': ['× molar mass', 'mg', 'r'], 'g>mol': ['÷ molar mass', 'mg', 'l'],
    'mol>L': ['× 22.4 L/mol', 'ml', 'd'], 'L>mol': ['÷ 22.4 L/mol', 'ml', 'u'], 'mol>el': ['× subscript', 'me', 'u'], 'el>mol': ['÷ subscript', 'me', 'd']
  };
  /* path: ['g','mol','part'] ; the first is given (blue), the last is find (teal), those between are amber. */
  function moleMap(o) {
    o = o || {}; const path = o.path || [], used = {};
    for (let i = 0; i + 1 < path.length; i++) used[path[i] + '>' + path[i + 1]] = true;
    const role = (k) => { const i = path.indexOf(k); return i < 0 ? '' : i === 0 ? ' given' : i === path.length - 1 ? ' find' : ' via'; };
    const edge = (key) => { const e = EDGES[key]; return '<span class="mm-arr ' + e[2] + (used[key] ? ' on' : '') + '" data-e="' + key + '"><span>' + e[0] + '</span><i>' + { r: '→', l: '←', d: '↓', u: '↑' }[e[2]] + '</i></span>'; };
    const node = (k, extra) => '<div class="mm-node n-' + k + role(k) + (extra || '') + '"' + (o.interactive ? ' role="button" tabindex="0" data-n="' + k + '"' : '') + '><b>' + NODES[k][0] + '</b><small>' + (k === 'el' && o.element ? o.element : NODES[k][1]) + '</small></div>';
    const showEl = o.ratio || path.indexOf('el') >= 0;
    return '<div class="mmap' + (o.compact ? ' compact' : '') + (showEl ? ' with-el' : '') + '">' +
      node('part') + '<div class="mm-edge e-pm">' + edge('part>mol') + edge('mol>part') + '</div>' + node('mol') + '<div class="mm-edge e-mg">' + edge('mol>g') + edge('g>mol') + '</div>' + node('g') +
      '<div class="mm-edge e-ml">' + edge('mol>L') + edge('L>mol') + '</div>' + node('L') +
      (showEl ? '<div class="mm-edge e-me">' + edge('mol>el') + '</div>' + node('el') : '') + '</div>';
  }
  function mapPath(d) {
    // nodes come from the builder as units; an element step adds the bridge
    const seq = []; d.nodes.forEach((u) => { const k = u === 'part' ? 'part' : u; if (seq[seq.length - 1] !== k) seq.push(k); });
    let path = seq;
    if (d.ratio) { // insert mol (compound) -> el -> (mol of element is the same hub) : mol>el, then continue from el through mol node
      const i = seq.indexOf('mol'); path = [];
      seq.forEach((k, j) => { path.push(k); });
      const mi = path.indexOf('mol'); path = path.slice(0, mi + 1).concat(['el', 'mol']).concat(path.slice(mi + 1));
    }
    return moleMap({ path, ratio: d.ratio, compact: true, element: d.element ? 'of ' + EL[d.element].name.toLowerCase() : null }) +
      (d.ratio ? '<p class="mm-note">The subscript turns <b>moles of the compound</b> into <b>moles of the element</b>, then you continue along the map.</p>' : '');
  }

  /* ---------- 5.1: how big is a mole? ---------- */
  function countingLadder() {
    const rows = [['a pair', 2], ['a dozen', 12], ['a gross', 144], ['a ream of paper (sheets)', 500], ['a million', 1e6], ['a billion', 1e9], ['a trillion', 1e12], ['a MOLE', 6.022e23]];
    const max = Math.log10(6.022e23);
    return '<div class="ladder">' + rows.map(([n, v]) => {
      const mole = n === 'a MOLE', w = Math.max(3, Math.log10(v) / max * 100);
      return '<div class="lad-row' + (mole ? ' mole' : '') + '"><span class="lad-name">' + n + '</span><span class="lad-bar"><i style="width:' + w + '%"></i></span><span class="lad-val">' + (v < 1e13 ? v.toLocaleString('en-US') : C.fmtSci(v, 3).html) + '</span></div>';
    }).join('') + '<p class="lad-note">Each bar is drawn on a <b>logarithmic</b> scale: every step to the right is a bigger <i>power of ten</i>. A mole is so far right that it would be off the page on a normal scale.</p></div>';
  }

  /* ---------- 5.1: atoms, molecules, formula units ---------- */
  function particleTypes() {
    const sph = (cx, cy, r, c, t) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + c + '" stroke="rgba(20,30,50,.5)" stroke-width="1"/>' + (t ? '<text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" class="svt" fill="' + (lum(c) > 150 ? '#1a2233' : '#fff') + '">' + t + '</text>' : '');
    let al = ''; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) al += sph(30 + c * 26 + (r % 2) * 13, 28 + r * 24, 11, atomColor('Al'), 'Al');
    const h2o = (x, y) => sph(x, y, 11, atomColor('O'), 'O') + sph(x - 15, y + 12, 7, atomColor('H'), 'H') + sph(x + 15, y + 12, 7, atomColor('H'), 'H') + '<line x1="' + x + '" y1="' + y + '" x2="' + (x - 15) + '" y2="' + (y + 12) + '" stroke="#555" stroke-width="2"/><line x1="' + x + '" y1="' + y + '" x2="' + (x + 15) + '" y2="' + (y + 12) + '" stroke="#555" stroke-width="2"/>';
    let nacl = ''; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) nacl += (r + c) % 2 ? sph(28 + c * 25, 26 + r * 25, 10, atomColor('Cl'), 'Cl') : sph(28 + c * 25, 26 + r * 25, 8, atomColor('Na'), 'Na');
    const card = (cls, title, svg, who, ex, word) => '<div class="ptcard ' + cls + '"><svg viewBox="0 0 140 96" role="img" aria-label="' + title + '">' + svg + '</svg><h4>' + title + '</h4><p>' + who + '</p><p class="ptex">' + ex + '</p></div>';
    return '<div class="ptypes">' +
      card('', 'Atoms', al, 'Single elements: metals, noble gases', fm('Al') + ' &nbsp; ' + fm('Mg') + ' &nbsp; ' + fm('He')) +
      card('', 'Molecules', h2o(30, 26) + h2o(80, 22) + h2o(54, 62) + h2o(108, 60), 'Covalent compounds and diatomic elements', fm('H2O') + ' &nbsp; ' + fm('CO2') + ' &nbsp; ' + fm('O2')) +
      card('', 'Formula units', nacl, 'Ionic compounds: a repeating pattern, not a separate molecule', fm('NaCl') + ' &nbsp; ' + fm('CaCl2') + ' &nbsp; ' + fm('MgO')) + '</div>';
  }

  /* ---------- 5.1/5.2: one mole of different things ---------- */
  const BALANCE = ['He', 'H2O', 'NaCl', 'Fe', 'Cu', 'C6H12O6', 'Pb'];
  function massBars(selected) {
    const items = BALANCE.map((f) => ({ f, m: C.molarMass(f), w: C.particleWord(f) })), max = Math.max.apply(null, items.map((i) => i.m));
    return '<div class="mbars" role="list">' + items.map((it) => '<button type="button" role="listitem" class="mb-row' + (it.f === selected ? ' sel' : '') + '" data-f="' + it.f + '"><span class="mb-name">' + fm(it.f) + '<small>' + (C.nameOf(it.f) || '') + '</small></span>' +
      '<span class="mb-parts" aria-hidden="true">' + '<i></i>'.repeat(6) + '</span><span class="mb-bar"><i style="width:' + (it.m / max * 100) + '%"></i></span><span class="mb-mass">' + it.m.toFixed(2) + ' g</span></button>').join('') + '</div>' +
      '<p class="mb-note" id="mbNote">Click a row. Every row holds the <b>same number of particles</b> (6.022 × 10²³). The bars show how much that many particles <b>weigh</b>.</p>';
  }

  /* ---------- 5.2: breaking a formula into atoms (parentheses!) ---------- */
  function treeHTML(kids) {
    return kids.map((k) => k.type === 'el' ? atom(k.el, k.n) : '<span class="ag-group"><span class="ag-in">' + treeHTML(k.kids) + '</span><span class="ag-mult">×' + k.n + '</span></span>').join('');
  }
  function atomGroups(d) {
    const f = C.parseFormula(d.formula);
    const parts = f.parts.map((p, i) => (i ? '<span class="ag-dot">·</span>' + (p.coef > 1 ? '<span class="ag-coef">' + p.coef + '</span>' : '') : '') + (p.text === 'H2O' ? water() : '<span class="ag-part">' + treeHTML(p.tree) + '</span>')).join('');
    const total = f.order.map((e) => '<span class="ag-tot">' + atom(e, 1) + '<b>' + f.counts[e] + '</b></span>').join('');
    return '<div class="ag"><div class="ag-label">' + fm(d.formula) + ' broken into atoms</div><div class="ag-row">' + parts + '</div><div class="ag-label">Total atoms in one formula unit</div><div class="ag-totals">' + total + '</div></div>';
  }

  /* ---------- 5.4: the same volume, the same number, different masses ---------- */
  function stpBoxes() {
    const gases = [{ f: 'He', parts: 1 }, { f: 'N2', parts: 2 }, { f: 'CO2', parts: 3 }];
    const pos = [[24, 24], [70, 30], [108, 20], [36, 62], [88, 66], [118, 54], [56, 44], [20, 84], [100, 90]];
    const ball = (x, y, r, c) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + c + '" stroke="rgba(20,30,50,.45)" stroke-width="1"/>';
    const box = (g, i) => {
      let s = '';
      pos.forEach(([x, y], k) => {
        if (g.parts === 1) s += ball(x, y, 6, atomColor('He'));
        else if (g.parts === 2) s += ball(x - 5, y, 6, atomColor('N')) + ball(x + 5, y, 6, atomColor('N'));
        else s += ball(x - 8, y, 5.5, atomColor('O')) + ball(x, y, 6.5, atomColor('C')) + ball(x + 8, y, 5.5, atomColor('O'));
      });
      return '<div class="stpbox"><svg viewBox="0 0 140 112" role="img" aria-label="22.4 L of ' + g.f + '"><rect x="2" y="2" width="136" height="108" rx="6" class="box"/>' + s + '</svg><b>' + fm(g.f) + '</b><span>22.4 L</span><span>6.022 × 10<sup>23</sup> ' + C.particleWord(g.f) + '</span><span class="mass">' + C.molarMass(g.f).toFixed(2) + ' g</span></div>';
    };
    return '<div class="stpboxes">' + gases.map(box).join('') + '</div><p class="mb-note">Three different gases, the <b>same volume</b>, the <b>same number of molecules</b>, but very different masses. At STP the volume depends only on <i>how many</i> particles there are.</p>';
  }
  function basketballs() {
    return '<div class="bball"><svg viewBox="0 0 330 110" role="img" aria-label="22.4 liters is about three basketballs"><rect x="6" y="14" width="86" height="86" rx="4" class="box"/><text x="49" y="62" text-anchor="middle" class="svt big">22.4 L</text><text x="49" y="78" text-anchor="middle" class="svt">28 cm cube</text>' +
      '<text x="118" y="64" class="svt big">≈</text>' + [0, 1, 2].map((i) => '<g><circle cx="' + (170 + i * 56) + '" cy="58" r="25" fill="#e28a3b" stroke="#6b3a12" stroke-width="2"/><path d="M' + (145 + i * 56) + ' 58h50M' + (170 + i * 56) + ' 33v50" stroke="#6b3a12" stroke-width="1.6" fill="none"/></g>').join('') +
      '<text x="226" y="104" text-anchor="middle" class="svt">about 3 basketballs (7.2 L each)</text></svg></div>';
  }

  /* ---------- 5.5: percent composition ---------- */
  function pctBar(d) {
    const rows = d.rows;
    return '<div class="pctbar" role="img" aria-label="' + rows.map((r) => r.el + ' ' + r.pct.toFixed(1) + ' percent').join(', ') + '">' +
      '<div class="pb-bar">' + rows.map((r) => '<span style="width:' + r.pct + '%;background:' + atomColor(r.el) + ';color:' + (lum(atomColor(r.el)) > 150 ? '#1a2233' : '#fff') + '" title="' + EL[r.el].name + ' ' + r.pct.toFixed(2) + '%">' + (r.pct > 7 ? r.el : '') + '</span>').join('') + '</div>' +
      '<div class="pb-leg">' + rows.map((r) => '<span><i style="background:' + atomColor(r.el) + '"></i>' + r.el + ' ' + r.pct.toFixed(2) + ' %</span>').join('') + '</div></div>';
  }

  /* ---------- 5.6: ratio bars, pipeline, empirical vs molecular ---------- */
  function moleBars(d) {
    const panel = (title, vals, fmtv, cls) => { const mx = Math.max.apply(null, vals); return '<div class="mbp ' + cls + '"><h5>' + title + '</h5>' + d.labels.map((l, i) => '<div class="mbp-row"><span class="mbp-el">' + l + '</span><span class="mbp-bar"><i style="width:' + Math.max(2, vals[i] / mx * 100) + '%"></i></span><span class="mbp-v">' + fmtv(vals[i]) + '</span></div>').join('') + '</div>'; };
    let out = panel('moles of each element', d.moles, (v) => S.moleTxt(v), 'k') + panel('÷ the smallest → ratio', d.ratios, (v) => v.toFixed(2), 'n');
    if (d.mult > 1) out += panel('× ' + d.mult + ' → whole numbers', d.ratios.map((r) => r * d.mult), (v) => String(Math.round(v)), 'f');
    return '<div class="mbpanels">' + out + '</div>';
  }
  function empPipeline(d) {
    const steps = (d.pct ? ['% by mass', 'assume 100 g', 'grams'] : ['grams']).concat(['÷ atomic mass', 'moles', '÷ smallest', 'ratio', '× to clear decimals', 'whole numbers', 'EMPIRICAL formula']);
    if (d.molecular) steps.push('× n', 'MOLECULAR formula');
    const lab = (s) => /formula/.test(s) ? ' end' : /^÷|^×|assume/.test(s) ? ' op' : '';
    return '<div class="pipe">' + steps.map((s) => '<span class="pp' + lab(s) + '">' + s + '</span>').join('<i>→</i>') + '</div>';
  }
  function empVsMol(d) {
    const unit = d.pairs.map((p) => atom(p.el, p.n)).join(''), nShow = Math.min(d.n, 6);
    return '<div class="evm"><div class="evm-unit"><small>empirical unit ' + fm(d.unit) + '</small><div class="evm-atoms">' + unit + '</div></div>' + (d.n > 1 ? '<div class="evm-x">×' + d.n + '</div><div class="evm-rep">' + Array(nShow).fill('<span class="evm-box">' + d.pairs.map((p) => atom(p.el, p.n)).join('') + '</span>').join('') + (d.n > nShow ? '<span class="evm-more">… ×' + d.n + '</span>' : '') + '</div>' : '<div class="evm-x">×1</div>') +
      '<div class="evm-eq">= ' + fm(C.formulaString(d.pairs.map((p) => ({ el: p.el, n: p.n * d.n })))) + '</div></div>';
  }

  /* ---------- 5.7: the hydrate idea ---------- */
  function hydrateIdea(d) {
    return '<div class="hidea"><div class="hi-box hyd"><b>HYDRATE</b><span class="hi-in">' + fm(d.salt) + ' ' + water() + water() + water() + '</span><small>salt + water</small></div><i class="hi-arr">heat<br>→</i>' +
      '<div class="hi-box anh"><b>ANHYDROUS SALT</b><span class="hi-in">' + fm(d.salt) + '</span><small>water gone</small></div><span class="hi-plus">+</span><div class="hi-box stm"><b>WATER LOST</b><span class="hi-in steam">' + water() + water() + water() + '</span><small>escapes as steam</small></div></div>' +
      '<p class="mb-note"><b>mass of hydrate</b> = <b>mass of anhydrous salt</b> + <b>mass of water</b>. The mass that disappears when you heat it is the water.</p>';
  }

  function render(d) {
    if (!d) return '';
    const fn = { mapPath, atomGroups, pctBar, moleBars, empPipeline, empVsMol, hydrateIdea }[d.type];
    return fn ? '<div class="diagram">' + fn(d) + '</div>' : '';
  }

  const api = { atom, water, atomColor, moleMap, mapPath, countingLadder, particleTypes, massBars, atomGroups, stpBoxes, basketballs, pctBar, moleBars, empPipeline, empVsMol, hydrateIdea, render, lum };
  root.MolesDiagrams = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
