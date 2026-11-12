/* glass.js: draws every piece of equipment as SVG, all at the same scale (16 px = 1 cm).
 * Each function returns SVG text for one item, drawn with (0,0) at the middle of its base and
 * "up" as negative y. lab.js places the items on the bench and redraws them when something changes.
 */
(function (root) {
  'use strict';
  const GL = '#5a7286', LIQ = 'rgba(120,190,235,.50)', LIQ2 = 'rgba(120,190,235,.75)';
  const f = (n) => (Math.round(n * 100) / 100);

  /* ---- graduated cylinders ---- */
  const CYL = {
    50: { cap: 50, w: 34, h: 320, y0: -22, ppm: 4.16, baseW: 84, num: 10, mid: 5, max: 57 },
    100: { cap: 100, w: 44, h: 400, y0: -24, ppm: 2.9, baseW: 96, num: 10, mid: 5, max: 112 }
  };
  const cylLevel = (cap, vol) => CYL[cap].y0 - vol * CYL[cap].ppm;        // y of the bottom of the meniscus
  function cylinder(cap, vol) {
    const c = CYL[cap], w = c.w / 2, top = -c.h, yl = cylLevel(cap, vol); let s = '';
    s += '<path d="M' + (-c.baseW / 2) + ' 0 L' + (-c.baseW / 2 + 8) + ' -12 L' + (c.baseW / 2 - 8) + ' -12 L' + (c.baseW / 2) + ' 0 Z" fill="#dfe9f1" stroke="' + GL + '" stroke-width="1.5"/>';
    if (vol > 0.02) s += '<path d="M' + (-w + 1.5) + ' ' + (c.y0 + 4) + ' L' + (-w + 1.5) + ' ' + f(yl - 2.2) + ' Q0 ' + f(yl + 2.2) + ' ' + (w - 1.5) + ' ' + f(yl - 2.2) + ' L' + (w - 1.5) + ' ' + (c.y0 + 4) + ' Z" fill="' + LIQ + '"/><path d="M' + (-w + 1.5) + ' ' + f(yl - 2.2) + ' Q0 ' + f(yl + 2.2) + ' ' + (w - 1.5) + ' ' + f(yl - 2.2) + '" fill="none" stroke="' + LIQ2 + '" stroke-width="1.2"/>';
    // the tube, with a pouring lip on the left
    s += '<path d="M' + (-w) + ' -12 L' + (-w) + ' ' + (top + 8) + ' Q' + (-w - 1) + ' ' + (top + 1) + ' ' + (-w - 8) + ' ' + (top - 3) + ' M' + (-w - 8) + ' ' + (top - 3) + ' L' + (w + 2) + ' ' + top + ' Q' + (w) + ' ' + (top + 4) + ' ' + w + ' ' + (top + 9) + ' L' + w + ' -12" fill="rgba(255,255,255,.22)" stroke="' + GL + '" stroke-width="1.6"/>';
    s += '<path d="M' + (-w + 5) + ' -16 L' + (-w + 5) + ' ' + (top + 14) + '" stroke="rgba(255,255,255,.8)" stroke-width="2.5" stroke-linecap="round"/>';
    for (let v = (cap === 50 ? 5 : 10); v <= cap; v++) {
      const y = f(c.y0 - v * c.ppm), big = v % c.num === 0, mid = v % c.mid === 0;
      s += '<path d="M' + (w - (big ? 20 : mid ? 14 : 8)) + ' ' + y + ' L' + (w - 1) + ' ' + y + '" stroke="#1d3344" stroke-width="' + (big ? 1 : .6) + '"/>';
      if (big) s += '<text x="' + (w - 22) + '" y="' + (y + 3) + '" font-size="8" text-anchor="end" fill="#1d3344">' + v + '</text>';
    }
    s += '<text x="0" y="' + (top + 26) + '" font-size="7" text-anchor="middle" fill="#1d3344">' + cap + ' mL</text><text x="0" y="' + (top + 35) + '" font-size="5.5" text-anchor="middle" fill="#1d3344">TD 20°C</text>';
    return s;
  }
  /* the magnified, eye-level view of the meniscus */
  function zoomCylinder(cap, vol) {
    const c = CYL[cap], span = cap === 50 ? 6 : 10, ppm = 130 / span, W = 220, H = 300, mid = H / 2 + 10;
    const center = Math.max(span - (cap === 50 ? 4 : 8), Math.min(cap + 2 - span * 0.2, vol)), y = (v) => mid - (v - center) * ppm;
    const xl = 50, xr = 170; let s = '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#f4f8fb"/>';
    const yl = y(vol), dip = 7;
    if (vol > 0.02) s += '<path d="M' + xl + ' ' + H + ' L' + xl + ' ' + f(yl - dip) + ' C' + (xl + 22) + ' ' + f(yl + dip * .35) + ' ' + (xr - 22) + ' ' + f(yl + dip * .35) + ' ' + xr + ' ' + f(yl - dip) + ' L' + xr + ' ' + H + ' Z" fill="' + LIQ + '"/><path d="M' + xl + ' ' + f(yl - dip) + ' C' + (xl + 22) + ' ' + f(yl + dip * .35) + ' ' + (xr - 22) + ' ' + f(yl + dip * .35) + ' ' + xr + ' ' + f(yl - dip) + '" fill="none" stroke="#2f7fb5" stroke-width="2"/>';
    s += '<path d="M' + xl + ' 0 L' + xl + ' ' + H + ' M' + xr + ' 0 L' + xr + ' ' + H + '" stroke="' + GL + '" stroke-width="3"/>';
    const lo = Math.floor(center - span * 1.3), hi = Math.ceil(center + span * 1.3);
    for (let v = Math.max(cap === 50 ? 5 : 10, lo); v <= Math.min(cap, hi); v++) {
      const yy = f(y(v)), big = v % c.num === 0, md = v % c.mid === 0; if (yy < 2 || yy > H - 2) continue;
      s += '<path d="M' + (xr - (big ? 62 : md ? 46 : 30)) + ' ' + yy + ' L' + (xr - 2) + ' ' + yy + '" stroke="#1d3344" stroke-width="' + (big ? 2 : 1.2) + '"/>';
      if (big || (cap === 50 && md)) s += '<text x="' + (xr - (big ? 68 : 52)) + '" y="' + (yy + 5) + '" font-size="' + (big ? 16 : 12) + '" text-anchor="end" fill="#1d3344">' + v + '</text>';
    }
    if (vol > 0.02 && yl > 4 && yl < H - 4) s += '<path d="M' + (xr + 6) + ' ' + f(yl) + ' l12 -6 v12 z" fill="#c2410c"/><text x="' + (xr + 22) + '" y="' + f(yl + 4) + '" font-size="10" fill="#c2410c">read</text><text x="' + (xr + 22) + '" y="' + f(yl + 15) + '" font-size="10" fill="#c2410c">here</text>';
    return s;
  }

  /* ---- beakers ---- */
  const BK = { 250: { w: 112, h: 150, ppm: 0.44, y0: -5, marks: [50, 100, 150, 200], max: 300 }, 100: { w: 64, h: 80, ppm: 0.62, y0: -4, marks: [], max: 110 } };
  const beakerLevel = (cap, vol) => BK[cap].y0 - vol * BK[cap].ppm;
  function beaker(cap, mix, o) {
    o = o || {}; const b = BK[cap], w = b.w / 2, top = -b.h, vol = mix.vol, yl = beakerLevel(cap, vol); let s = '';
    if (vol > 0.5) s += '<path d="M' + (-w + 3) + ' ' + f(yl) + ' L' + (w - 3) + ' ' + f(yl) + ' L' + (w - 3) + ' -9 Q' + (w - 3) + ' -3 ' + (w - 10) + ' -3 L' + (-w + 10) + ' -3 Q' + (-w + 3) + ' -3 ' + (-w + 3) + ' -9 Z" fill="' + LIQ + '"/><path d="M' + (-w + 3) + ' ' + f(yl) + ' L' + (w - 3) + ' ' + f(yl) + '" stroke="' + LIQ2 + '" stroke-width="1.3"/>';
    if (mix.solid > 0.005) { const r = Math.min(w - 12, 6 + Math.sqrt(mix.solid) * 13), hh = Math.min(26, 3 + Math.sqrt(mix.solid) * 6); s += '<path d="M' + (-r) + ' -4 Q' + (-r * .5) + ' ' + f(-4 - hh) + ' 0 ' + f(-4 - hh) + ' Q' + (r * .5) + ' ' + f(-4 - hh) + ' ' + r + ' -4 Z" fill="#fbfbf7" stroke="#b9bdb2" stroke-width=".8"/>'; }
    if (o.swirl) s += '<path d="M' + (-w + 16) + ' ' + f(yl + 10) + ' q' + (w * .5) + ' 9 ' + (w - 16) + ' 0 q' + (w * .25) + ' -8 ' + (w * .5 - 8) + ' 2" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="1.6" stroke-linecap="round" class="swirl"/>';
    s += '<path d="M' + (-w - 7) + ' ' + (top - 2) + ' Q' + (-w) + ' ' + (top + 2) + ' ' + (-w) + ' ' + (top + 10) + ' L' + (-w) + ' -10 Q' + (-w) + ' 0 ' + (-w + 10) + ' 0 L' + (w - 10) + ' 0 Q' + w + ' 0 ' + w + ' -10 L' + w + ' ' + (top + 8) + ' Q' + w + ' ' + (top + 2) + ' ' + (w + 4) + ' ' + top + '" fill="rgba(255,255,255,.18)" stroke="' + GL + '" stroke-width="1.7"/>';
    s += '<path d="M' + (-w + 6) + ' -14 L' + (-w + 6) + ' ' + (top + 16) + '" stroke="rgba(255,255,255,.8)" stroke-width="3" stroke-linecap="round"/>';
    for (const m of b.marks) { const y = f(b.y0 - m * b.ppm); s += '<path d="M' + (w - 26) + ' ' + y + ' L' + (w - 8) + ' ' + y + '" stroke="#1d3344" stroke-width=".8"/><text x="' + (w - 29) + '" y="' + (y + 3) + '" font-size="7.5" text-anchor="end" fill="#1d3344">' + m + '</text>'; }
    if (cap === 250) s += '<text x="' + (-w + 14) + '" y="' + (top + 30) + '" font-size="7" fill="#1d3344">250 mL</text><text x="' + (-w + 14) + '" y="' + (top + 39) + '" font-size="5.5" fill="#1d3344">± 5 %</text>';
    if (o.label) s += '<rect x="-36" y="-64" width="72" height="20" rx="3" fill="#fffbe6" stroke="#b59b3a" stroke-width=".8"/><text x="0" y="-50" font-size="11" font-weight="700" text-anchor="middle" fill="#3b3209">' + o.label + '</text>';
    return s;
  }

  /* ---- stock bottles, jar ---- */
  function bottle(o) {
    const w = 40, h = 150; let s = '';
    s += '<path d="M' + (-w) + ' -6 Q' + (-w) + ' 0 ' + (-w + 6) + ' 0 L' + (w - 6) + ' 0 Q' + w + ' 0 ' + w + ' -6 L' + w + ' -100 Q' + w + ' -116 ' + 15 + ' -124 L15 -136 L-15 -136 L-15 -124 Q' + (-w) + ' -116 ' + (-w) + ' -100 Z" fill="' + (o.glass || 'rgba(255,255,255,.35)') + '" stroke="' + GL + '" stroke-width="1.7"/>';
    s += '<path d="M' + (-w + 3) + ' -8 L' + (w - 3) + ' -8 L' + (w - 3) + ' ' + f(-8 - 86 * o.frac) + ' L' + (-w + 3) + ' ' + f(-8 - 86 * o.frac) + ' Z" fill="' + LIQ + '"/>';
    s += '<rect x="-17" y="' + (-h) + '" width="34" height="16" rx="3" fill="' + (o.cap || '#27425a') + '"/>';
    s += '<rect x="' + (-w + 5) + '" y="-88" width="' + (2 * w - 10) + '" height="62" rx="2" fill="#fff" stroke="#8a97a3" stroke-width=".8"/><rect x="' + (-w + 5) + '" y="-88" width="' + (2 * w - 10) + '" height="9" fill="' + (o.band || '#c2410c') + '"/>';
    s += '<text x="0" y="-65" font-size="12" font-weight="700" text-anchor="middle" fill="#111">' + o.l1 + '</text><text x="0" y="-51" font-size="10.5" font-weight="700" text-anchor="middle" fill="#111">' + o.l2 + '</text><text x="0" y="-38" font-size="7" text-anchor="middle" fill="#333">' + o.l3 + '</text><text x="0" y="-30" font-size="6" text-anchor="middle" fill="#a11">' + (o.l4 || '') + '</text>';
    return s;
  }
  function jar(frac) {
    let s = '<path d="M-42 -6 Q-42 0 -36 0 L36 0 Q42 0 42 -6 L42 -84 L-42 -84 Z" fill="rgba(255,255,255,.55)" stroke="' + GL + '" stroke-width="1.7"/>';
    s += '<path d="M-39 -4 L39 -4 L39 ' + f(-4 - 60 * frac) + ' Q0 ' + f(-10 - 60 * frac) + ' -39 ' + f(-4 - 60 * frac) + ' Z" fill="#fbfbf7" stroke="#c9ccc2" stroke-width=".6"/>';
    s += '<rect x="-45" y="-100" width="90" height="17" rx="3" fill="#1f5f8b"/>';
    s += '<rect x="-37" y="-70" width="74" height="52" rx="2" fill="#fff" stroke="#8a97a3" stroke-width=".8"/><rect x="-37" y="-70" width="74" height="8" fill="#1f5f8b"/><text x="0" y="-51" font-size="9" font-weight="700" text-anchor="middle" fill="#111">Sodium acetate</text><text x="0" y="-40" font-size="9.5" font-weight="700" text-anchor="middle" fill="#111">NaC₂H₃O₂</text><text x="0" y="-30" font-size="6.5" text-anchor="middle" fill="#333">anhydrous · 82.03 g/mol</text><text x="0" y="-22" font-size="6" text-anchor="middle" fill="#333">50.0 g</text>';
    return s;
  }
  function dropBottle() {
    return '<path d="M-20 -5 Q-20 0 -15 0 L15 0 Q20 0 20 -5 L20 -56 Q20 -64 8 -68 L8 -76 L-8 -76 L-8 -68 Q-20 -64 -20 -56 Z" fill="rgba(255,255,255,.4)" stroke="' + GL + '" stroke-width="1.6"/><path d="M-17 -6 L17 -6 L17 -44 L-17 -44 Z" fill="' + LIQ + '"/><path d="M-7 -76 L-7 -84 Q0 -100 7 -84 L7 -76 Z" fill="#7a1f1f"/><rect x="-17" y="-50" width="34" height="34" fill="#fff" stroke="#8a97a3" stroke-width=".7"/><rect x="-17" y="-50" width="34" height="6" fill="#b91c1c"/><text x="0" y="-33" font-size="9" font-weight="700" text-anchor="middle" fill="#111">1.0 M</text><text x="0" y="-22" font-size="10" font-weight="700" text-anchor="middle" fill="#111">HCl</text>';
  }

  /* ---- balance, weigh boat ---- */
  function balance(text, on) {
    let s = '<path d="M-92 0 L92 0 L84 -46 L-84 -46 Z" fill="#e8edf1" stroke="#6b7c8a" stroke-width="1.6"/><rect x="-88" y="-3" width="176" height="6" rx="2" fill="#4b5a67"/>';
    s += '<rect x="-12" y="-58" width="24" height="12" fill="#9aa8b3"/><rect x="-62" y="-64" width="124" height="7" rx="3" fill="#cfd8de" stroke="#6b7c8a" stroke-width="1.2"/>';
    s += '<rect x="-56" y="-38" width="78" height="28" rx="3" fill="#0d1b12" stroke="#33414c"/><text x="14" y="-17" font-size="20" font-family="ui-monospace,Menlo,Consolas,monospace" text-anchor="end" fill="#7dfc9a" id="balText">' + text + '</text><text x="17" y="-15" font-size="0" fill="#7dfc9a"></text>';
    s += '<g data-act="tare" class="btn3d" tabindex="0" role="button" aria-label="Tare the balance"><rect x="32" y="-38" width="44" height="13" rx="3" fill="#1f5f8b"/><text x="54" y="-28.5" font-size="8.5" font-weight="700" text-anchor="middle" fill="#fff">TARE</text></g>';
    s += '<text x="54" y="-13" font-size="6.5" text-anchor="middle" fill="#33414c">max 200 g</text><text x="54" y="-6" font-size="6.5" text-anchor="middle" fill="#33414c">d = 0.01 g</text>';
    return s;
  }
  function boat(g) {
    let s = '<path d="M-32 -13 L32 -13 L24 0 L-24 0 Z" fill="rgba(255,255,255,.85)" stroke="#8494a1" stroke-width="1.3"/>';
    if (g > 0.004) { const r = Math.min(22, 4 + Math.sqrt(g) * 9), hh = Math.min(16, 2 + Math.sqrt(g) * 6); s += '<path d="M' + (-r) + ' -2 Q' + (-r * .4) + ' ' + f(-2 - hh) + ' 0 ' + f(-2 - hh) + ' Q' + (r * .4) + ' ' + f(-2 - hh) + ' ' + r + ' -2 Z" fill="#fbfbf7" stroke="#b9bdb2" stroke-width=".8"/>'; }
    return s;
  }

  /* ---- hand tools ---- */
  function scoop(g) {
    let s = '<path d="M-55 -6 L20 -7 Q52 -9 55 -3 Q52 2 20 -1 L-55 -2 Z" fill="#c9d2d9" stroke="#6b7c8a" stroke-width="1.2"/><rect x="-55" y="-8" width="34" height="8" rx="3" fill="#27425a"/>';
    if (g > 0.004) { const r = Math.min(14, 3 + Math.sqrt(g) * 7); s += '<path d="M' + (38 - r) + ' -5 Q38 ' + f(-6 - r * .9) + ' ' + (38 + r) + ' -5 Z" fill="#fbfbf7" stroke="#b9bdb2" stroke-width=".7"/>'; }
    return s;
  }
  function dropper(vol) {   // tip at (0,0); holds up to 3 mL
    let s = '';
    if (vol > 0.01) s += '<path d="M-1.2 -2 L-3.2 -40 L-3.2 ' + f(-40 - vol * 9) + ' L3.2 ' + f(-40 - vol * 9) + ' L3.2 -40 L1.2 -2 Z" fill="' + LIQ2 + '"/>';
    s += '<path d="M-1.6 0 L-4 -40 L-4 -84 L4 -84 L4 -40 L1.6 0 Z" fill="rgba(255,255,255,.3)" stroke="' + GL + '" stroke-width="1.2"/><path d="M-6 -84 Q-12 -104 0 -116 Q12 -104 6 -84 Z" fill="#b4532a" stroke="#7a3413" stroke-width="1"/>';
    return s;
  }
  const rod = () => '<rect x="-75" y="-5" width="150" height="5" rx="2.5" fill="rgba(225,240,250,.95)" stroke="' + GL + '" stroke-width="1.4"/>';
  function probe() {  // tip at (0,0)
    return '<rect x="-5" y="-96" width="10" height="92" rx="2" fill="rgba(255,255,255,.55)" stroke="' + GL + '" stroke-width="1.2"/><circle cx="0" cy="-5" r="6" fill="rgba(200,230,250,.9)" stroke="' + GL + '" stroke-width="1.2"/><rect x="-7" y="-128" width="14" height="34" rx="3" fill="#27425a"/><path d="M-2 -90 L-2 -14 M2 -90 L2 -30" stroke="#8a97a3" stroke-width=".8"/>';
  }
  function meter(text, sub) {
    return '<rect x="-56" y="-84" width="112" height="84" rx="8" fill="#27425a" stroke="#14273a" stroke-width="1.5"/><rect x="-46" y="-74" width="92" height="40" rx="4" fill="#0d1b12"/><text x="38" y="-45" font-size="26" font-family="ui-monospace,Menlo,Consolas,monospace" text-anchor="end" fill="#7dfc9a" id="phText">' + text + '</text><text x="-40" y="-64" font-size="8" fill="#7dfc9a">pH</text><text x="0" y="-18" font-size="8" text-anchor="middle" fill="#cfe1ee" id="phSub">' + sub + '</text><text x="0" y="-7" font-size="6.5" text-anchor="middle" fill="#9fb6c8">calibrated: 4.00 · 7.00 · 10.00</text>';
  }
  function sink() {
    return '<path d="M-84 -66 L84 -66 L84 0 L-84 0 Z" fill="#aab6bf" stroke="#5c6b77" stroke-width="1.6"/><path d="M-72 -58 L72 -58 L64 -8 L-64 -8 Z" fill="#7d8b96"/><circle cx="0" cy="-16" r="6" fill="#39454e"/><path d="M40 -66 L40 -104 Q40 -120 20 -120 L8 -120 L8 -110" fill="none" stroke="#6b7c8a" stroke-width="7" stroke-linecap="round"/><text x="0" y="-36" font-size="10" font-weight="700" text-anchor="middle" fill="#eef3f6">SINK / WASTE</text>';
  }
  const stand = () => '<rect x="-16" y="-34" width="32" height="34" rx="3" fill="#d7dee4" stroke="#6b7c8a" stroke-width="1.2"/>';

  root.BufGlass = { CYL, BK, cylLevel, beakerLevel, cylinder, zoomCylinder, beaker, bottle, jar, dropBottle, balance, boat, scoop, dropper, rod, probe, meter, sink, stand };
})(typeof self !== 'undefined' ? self : this);
