/* art.js: the picture of every part, drawn as SVG, and the route food follows inside each organ.
 *
 * One grid cell is 100 x 100 drawing units. A tube opening is always centred on the middle of a
 * cell edge (y = 50 inside that cell) and always has the same widths, so that any two tract parts
 * placed opening-to-opening join without a seam.
 */
(function (root) {
  'use strict';

  const C = {
    line: '#9c4038', wall: '#f2a79d', wallDark: '#e28b80', lumen: '#fde7df',
    colonLine: '#8d4a3a', colonWall: '#e0a288', colonLumen: '#f8e2d3'
  };

  /* a tube along path d: dark outline, wall, then the hollow middle (lumen) */
  function tube(d, o) {
    o = o || {};
    const w = o.w || 44, line = o.line || C.line, wall = o.wall || C.wall, lumen = o.lumen || C.lumen;
    const p = (stroke, width, extra) => '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + width + '" stroke-linejoin="round" ' + (extra || '') + '/>';
    return p(line, w) + p(wall, w - 6) + (o.texture || '') + p(lumen, o.lumenW || 18);
  }
  const stripes = (d, w, dash, color, op) => '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + w + '" stroke-dasharray="' + dash + '" stroke-linejoin="round" opacity="' + op + '"/>';

  const SMALL_D = 'M0 50 H50 V150 H110 V50 H170 V150 H230 V50 H290 V150 H350 V50 H400';
  const LARGE_D = 'M36 50 H62 V148 H238 V50 H264';
  const circles = (pts, r, fill, stroke, sw) => pts.map(p => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (p[2] || r) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (sw || 2.5) + '"/>').join('');

  const DRAW = {
    mouth: () =>
      tube('M125 112 V150 H200') +
      '<path d="M22 48 Q22 18 52 18 H138 Q168 18 168 48 V108 Q168 138 138 138 H52 Q22 138 22 108 Z" fill="' + C.wall + '" stroke="' + C.line + '" stroke-width="3"/>' +
      '<path d="M40 16.5 V96 Q40 122 66 122 H124 Q150 122 150 96 V16.5 Z" fill="' + C.lumen + '"/>' +
      '<path d="M125 108 V150 H200" fill="none" stroke="' + C.lumen + '" stroke-width="18" stroke-linejoin="round"/>' +
      '<ellipse cx="80" cy="113" rx="34" ry="11" fill="#e96f7c" stroke="#b9485a" stroke-width="2"/>' +
      '<g class="jaw jaw-l">' + [30, 50, 70].map(y => '<rect x="38" y="' + y + '" width="30" height="15" rx="5" fill="#fff" stroke="#c9b9a8" stroke-width="2"/>').join('') + '</g>' +
      '<g class="jaw jaw-r">' + [30, 50, 70].map(y => '<rect x="122" y="' + y + '" width="30" height="15" rx="5" fill="#fff" stroke="#c9b9a8" stroke-width="2"/>').join('') + '</g>' +
      '<ellipse cx="31" cy="19" rx="19" ry="10" fill="#d8474f" stroke="#9c2c36" stroke-width="2.5"/>' +
      '<ellipse cx="159" cy="19" rx="19" ry="10" fill="#d8474f" stroke="#9c2c36" stroke-width="2.5"/>',

    esophagus: () => tube('M0 50 H200', { texture: stripes('M8 50 H192', 38, '4 16', C.wallDark, 0.55) }),

    stomach: () =>
      '<path d="M0 28 H70 C120 10 228 10 262 28 H300 V72 H272 C276 150 230 192 150 192 C70 192 26 150 32 72 H0 Z" fill="' + C.wall + '" stroke="' + C.line + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M0 41 H74 C122 26 222 26 256 41 H300 V59 H258 C262 138 220 178 150 178 C80 178 40 138 46 59 H0 Z" fill="' + C.lumen + '"/>' +
      '<path d="M52 118 C64 152 96 178 150 178 C204 178 238 152 250 118 Q150 104 52 118 Z" fill="#f6d77a" opacity="0.9"/>' +
      '<path d="M76 70 q14 10 28 0 M128 62 q14 10 28 0 M182 68 q14 10 28 0" fill="none" stroke="' + C.wallDark + '" stroke-width="3" stroke-linecap="round" opacity="0.7"/>' +
      '<path d="M0 28 V72 M300 28 V72" stroke="' + C.wall + '" stroke-width="4"/>' +
      '<path d="M0 41 V59 M300 41 V59" stroke="' + C.lumen + '" stroke-width="5"/>',

    small: () => tube(SMALL_D, { texture: stripes(SMALL_D, 24, '2 5', C.wallDark, 0.8), lumenW: 16 }),

    large: () =>
      tube('M0 50 H40') + tube('M260 50 H300') +
      '<path d="' + LARGE_D + '" fill="none" stroke="' + C.colonLine + '" stroke-width="60" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<path d="' + LARGE_D + '" fill="none" stroke="' + C.colonWall + '" stroke-width="54" stroke-linejoin="round" stroke-linecap="round"/>' +
      stripes(LARGE_D, 54, '3 23', C.colonLine, 0.3) +
      '<path d="M0 50 H62 V148 H238 V50 H300" fill="none" stroke="' + C.colonLumen + '" stroke-width="26" stroke-linejoin="round"/>' +
      '<path d="M0 50 H30 M270 50 H300" fill="none" stroke="' + C.lumen + '" stroke-width="18"/>',

    anus: () =>
      tube('M0 50 H66') +
      '<path d="M52 28 Q84 30 92 42 Q78 44 66 41 Z M52 72 Q84 70 92 58 Q78 56 66 59 Z" fill="#c8605a" stroke="' + C.line + '" stroke-width="2.5" stroke-linejoin="round"/>',

    salivary: () =>
      circles([[36, 44], [54, 32], [68, 48], [58, 66], [38, 66], [26, 56], [50, 50, 15]], 13, '#f08a96', '#b34a5a'),

    chief: () => [[30, 36], [60, 30], [74, 54], [56, 72], [28, 66], [47, 52]].map(p =>
      '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="17" ry="14" fill="#c99be6" stroke="#7c46a8" stroke-width="2.5"/><circle cx="' + (p[0] + 3) + '" cy="' + (p[1] + 2) + '" r="5" fill="#7c46a8"/>').join(''),

    parietal: () => [[28, 28], [50, 24], [72, 30], [22, 50], [42, 46], [62, 50], [78, 54], [32, 70], [54, 72], [72, 74]].map(p =>
      '<path d="M' + p[0] + ' ' + (p[1] - 11) + ' l10 16 q-10 6 -20 0 Z" fill="#f7b267" stroke="#b96a1c" stroke-width="2.5" stroke-linejoin="round"/><circle cx="' + p[0] + '" cy="' + (p[1] + 2) + '" r="2.6" fill="#b96a1c"/>').join(''),

    liver: () =>
      '<path d="M12 58 C8 24 62 12 122 14 C166 15 192 30 190 48 C188 62 152 70 112 78 C70 88 16 92 12 58 Z" fill="#a14d3d" stroke="#6b2a20" stroke-width="3"/>' +
      '<path d="M112 16 C104 36 108 58 112 78" fill="none" stroke="#6b2a20" stroke-width="2.5" opacity="0.7"/>' +
      '<path d="M30 42 C50 28 80 26 96 28" fill="none" stroke="#c97a68" stroke-width="5" stroke-linecap="round" opacity="0.8"/>',

    gallbladder: () =>
      '<path d="M50 14 C74 14 78 50 67 68 C61 80 55 84 50 90 C45 84 39 80 33 68 C22 50 26 14 50 14 Z" fill="#86ad45" stroke="#4d6e1e" stroke-width="3"/>' +
      '<path d="M40 30 C36 42 38 54 42 62" fill="none" stroke="#b6d47c" stroke-width="5" stroke-linecap="round"/>',

    pancreas: () =>
      '<path d="M14 52 C10 30 40 24 60 34 C80 22 100 30 118 36 C140 28 170 36 186 46 C198 54 186 68 170 64 C150 74 128 68 112 70 C90 82 70 74 54 76 C30 86 16 72 14 52 Z" fill="#f2c868" stroke="#b08226" stroke-width="3"/>' +
      circles([[36, 52], [58, 56], [80, 48], [102, 54], [126, 50], [150, 52], [170, 52]], 4, '#d9a53c', 'none', 0),

    capillaries: () =>
      '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M50 94 V62 M50 62 C40 46 24 40 16 16 M50 62 C56 42 50 26 50 8 M50 62 C62 48 78 40 84 16" stroke="#d2413a" stroke-width="6"/>' +
      '<path d="M30 42 C22 44 14 50 8 62 M22 26 C30 22 34 16 34 8 M52 34 C60 30 66 22 66 10 M72 38 C82 42 88 50 92 62 M44 76 C36 78 28 84 24 92 M56 76 C64 78 72 84 76 92" stroke="#e2625b" stroke-width="3.5"/>' +
      '</g>',

    lymph: () =>
      '<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke="#7fa9d0">' +
      '<path d="M50 94 C50 78 44 70 46 58 M46 58 C34 46 26 34 22 12 M46 58 C58 46 68 36 78 14" stroke-width="9"/>' +
      '<path d="M32 38 C22 40 14 46 10 58 M66 40 C76 44 84 52 90 64" stroke-width="6"/></g>' +
      circles([[46, 58, 9], [28, 30, 7], [70, 30, 7], [50, 82, 7], [16, 52, 5], [86, 56, 5]], 6, '#cfe2f3', '#7fa9d0', 2.5)
  };

  /* ---------- the route food takes inside each tract organ ---------- */

  function along(pts, f) {
    let total = 0; const len = [];
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); len.push(l); total += l; }
    let d = Math.max(0, Math.min(1, f)) * total;
    for (let i = 0; i < len.length; i++) {
      if (d <= len[i] || i === len.length - 1) { const k = len[i] ? d / len[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; }
      d -= len[i];
    }
    return pts[pts.length - 1];
  }
  const LINES = {
    esophagus: [[0, 50], [200, 50]],
    small: [[0, 50], [50, 50], [50, 150], [110, 150], [110, 50], [170, 50], [170, 150], [230, 150], [230, 50], [290, 50], [290, 150], [350, 150], [350, 50], [400, 50]],
    large: [[0, 50], [62, 50], [62, 148], [238, 148], [238, 50], [300, 50]],
    anus: [[0, 50], [84, 50]]
  };
  const MOUTH_IN = [[95, -60], [95, 78]], MOUTH_OUT = [[95, 78], [125, 108], [125, 150], [200, 150]];
  const CHEW_FROM = 0.22, CHEW_TO = 0.72;

  /* position of the food, in the part's own units, when it is fraction f of the way through */
  function route(type, f) {
    if (type === 'mouth') {
      if (f < CHEW_FROM) return along(MOUTH_IN, f / CHEW_FROM);
      if (f < CHEW_TO) return [95, 78];
      return along(MOUTH_OUT, (f - CHEW_TO) / (1 - CHEW_TO));
    }
    if (type === 'stomach') {
      if (f < 0.15) return along([[0, 50], [60, 50], [105, 122]], f / 0.15);
      if (f < 0.85) { const a = Math.PI + (f - 0.15) / 0.7 * Math.PI * 5; return [150 + 45 * Math.cos(a), 122 - 26 * Math.sin(a)]; }
      return along([[195, 122], [250, 62], [300, 50]], (f - 0.85) / 0.15);
    }
    return along(LINES[type], f);
  }

  const size = (D, type) => [D.PARTS[type].w * 100, D.PARTS[type].h * 100];
  /* a part as SVG markup, to be placed inside a <g> */
  const draw = type => DRAW[type]();
  /* a stand-alone picture for the tray */
  function icon(D, type) {
    const [w, h] = size(D, type);
    return '<svg viewBox="-4 -4 ' + (w + 8) + ' ' + (h + 8) + '" aria-hidden="true">' + draw(type) + '</svg>';
  }

  root.DigestArt = { C, draw, icon, route, CHEW_FROM, CHEW_TO };
})(typeof self !== 'undefined' ? self : this);
