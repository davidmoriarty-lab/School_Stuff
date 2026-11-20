// Scanner vision pipeline. Pure functions on pixel arrays (no DOM, no imports), so the same code runs
// in the browser and in Node tests.
//
//   1. locateSheet : find the four black corner squares + the QR code in a photo
//   2. warpPage    : straighten the page into a fixed-size picture (2 px per PDF point)
//   3. readBubbles : measure how dark each bubble is at the positions the sheet layout says
//   4. interpret   : turn bubble darkness into earned / missed / needs-review for each point

export type Gray = { data: Uint8ClampedArray; w: number; h: number };
export type Pt = { x: number; y: number };
export type Mark = { x: number; y: number; size: number };
export type Rect = { x: number; y: number; w: number; h: number };

export type LayoutBubble = {
  pointId: number;
  kind: "full" | "missed" | "reason";
  reasonId: number | null;
  cx: number;
  cy: number;
  r: number;
};

/** Pixels per PDF point in the straightened page picture. */
export const WARP_SCALE = 2;

export function rgbaToGray(rgba: ArrayLike<number>, w: number, h: number): Gray {
  const data = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < data.length; i++, j += 4) {
    data[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
  }
  return { data, w, h };
}

/** Box-average downscale by an integer factor. */
function downscale(g: Gray, factor: number): Gray {
  if (factor <= 1) return g;
  const w = Math.floor(g.w / factor), h = Math.floor(g.h / factor);
  const out = new Uint8ClampedArray(w * h);
  const area = factor * factor;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let dy = 0; dy < factor; dy++) {
        const row = (y * factor + dy) * g.w + x * factor;
        for (let dx = 0; dx < factor; dx++) sum += g.data[row + dx];
      }
      out[y * w + x] = sum / area;
    }
  }
  return { data: out, w, h };
}

function otsu(g: Gray): number {
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < g.data.length; i++) hist[g.data[i]]++;
  const total = g.data.length;
  let sumAll = 0;
  for (let i = 0; i < 256; i++) sumAll += i * hist[i];
  let wB = 0, sumB = 0, best = 0, thresh = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sumAll - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; thresh = t; }
  }
  return thresh;
}

// ---------------------------------------------------------------------------------------------
// 1. Locate the sheet
// ---------------------------------------------------------------------------------------------

/**
 * Find the four solid black corner squares. Returns them in clockwise order as seen in the photo
 * (top-left, top-right, bottom-right, bottom-left of the PHOTO, not necessarily of the page).
 */
export function findCornerMarks(gray: Gray): Mark[] | null {
  const f = Math.max(1, Math.floor(Math.max(gray.w, gray.h) / 1100));
  const g = downscale(gray, f);
  const { w, h } = g;
  const thresh = Math.min(otsu(g), 130);
  const dark = new Uint8Array(w * h);
  for (let i = 0; i < dark.length; i++) dark[i] = g.data[i] < thresh ? 1 : 0;

  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  const cands: Mark[] = [];
  const maxSize = 0.12 * Math.min(w, h);

  for (let start = 0; start < dark.length; start++) {
    if (!dark[start] || seen[start]) continue;
    let sp = 0, count = 0, minx = w, maxx = 0, miny = h, maxy = 0, sx = 0, sy = 0;
    stack[sp++] = start;
    seen[start] = 1;
    while (sp) {
      const p = stack[--sp];
      const x = p % w, y = (p - x) / w;
      count++; sx += x; sy += y;
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
      if (x > 0 && dark[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack[sp++] = p - 1; }
      if (x < w - 1 && dark[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack[sp++] = p + 1; }
      if (y > 0 && dark[p - w] && !seen[p - w]) { seen[p - w] = 1; stack[sp++] = p - w; }
      if (y < h - 1 && dark[p + w] && !seen[p + w]) { seen[p + w] = 1; stack[sp++] = p + w; }
    }
    const bw = maxx - minx + 1, bh = maxy - miny + 1;
    const size = (bw + bh) / 2;
    if (size < 4 || size > maxSize) continue;
    const aspect = bw / bh;
    if (aspect < 0.7 || aspect > 1.4) continue;
    if (count / (bw * bh) < 0.82) continue;
    if (minx < 2 || miny < 2 || maxx > w - 3 || maxy > h - 3) continue;

    // The square must sit in clear white paper: the ring around it has to be bright.
    const pad = Math.max(2, Math.round(size * 0.6));
    let ringDark = 0, ringN = 0;
    for (let x = minx - pad; x <= maxx + pad; x++) {
      for (const y of [miny - pad, maxy + pad]) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        ringN++; if (dark[y * w + x]) ringDark++;
      }
    }
    for (let y = miny - pad; y <= maxy + pad; y++) {
      for (const x of [minx - pad, maxx + pad]) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        ringN++; if (dark[y * w + x]) ringDark++;
      }
    }
    if (ringN === 0 || ringDark / ringN > 0.08) continue;
    cands.push({ x: sx / count, y: sy / count, size });
  }
  if (cands.length < 4) return null;

  // Take the candidate closest to each photo corner.
  const corners: Pt[] = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
  const picked: Mark[] = [];
  for (const c of corners) {
    let best: Mark | null = null, bd = Infinity;
    for (const m of cands) {
      const d = (m.x - c.x) ** 2 + (m.y - c.y) ** 2;
      if (d < bd) { bd = d; best = m; }
    }
    if (!best || picked.includes(best)) return null;
    picked.push(best);
  }
  const sizes = picked.map((m) => m.size);
  if (Math.max(...sizes) / Math.min(...sizes) > 1.6) return null;
  const area = Math.abs(
    picked.reduce((s, p, i) => { const q = picked[(i + 1) % 4]; return s + (p.x * q.y - q.x * p.y); }, 0) / 2,
  );
  if (area < 0.06 * w * h) return null;

  // Refine each centre at full resolution using a darkness-weighted centroid.
  return picked.map((m) => {
    const cx = m.x * f + f / 2, cy = m.y * f + f / 2, half = Math.ceil(m.size * f * 1.1);
    let sw = 0, sxx = 0, syy = 0;
    for (let y = Math.max(0, Math.floor(cy - half)); y <= Math.min(gray.h - 1, Math.ceil(cy + half)); y++) {
      for (let x = Math.max(0, Math.floor(cx - half)); x <= Math.min(gray.w - 1, Math.ceil(cx + half)); x++) {
        const wgt = thresh - gray.data[y * gray.w + x];
        if (wgt > 0) { sw += wgt; sxx += wgt * x; syy += wgt * y; }
      }
    }
    return sw > 0 ? { x: sxx / sw, y: syy / sw, size: m.size * f } : { x: cx, y: cy, size: m.size * f };
  });
}

/** Regions of the photo (one per mark) where the QR code could be, given any page rotation. */
export function qrSearchRegions(marks: Mark[], w: number, h: number): Rect[] {
  const cx = marks.reduce((s, m) => s + m.x, 0) / 4, cy = marks.reduce((s, m) => s + m.y, 0) / 4;
  return marks.map((m) => {
    const ex = m.x + 0.62 * (cx - m.x), ey = m.y + 0.62 * (cy - m.y);
    const padX = Math.abs(cx - m.x) * 0.1, padY = Math.abs(cy - m.y) * 0.1;
    const x0 = Math.max(0, Math.floor(Math.min(m.x, ex) - padX)), y0 = Math.max(0, Math.floor(Math.min(m.y, ey) - padY));
    const x1 = Math.min(w, Math.ceil(Math.max(m.x, ex) + padX)), y1 = Math.min(h, Math.ceil(Math.max(m.y, ey) + padY));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  });
}

export function cropRgba(rgba: ArrayLike<number>, w: number, r: Rect): Uint8ClampedArray {
  const out = new Uint8ClampedArray(r.w * r.h * 4);
  for (let y = 0; y < r.h; y++) {
    const src = ((r.y + y) * w + r.x) * 4;
    for (let i = 0; i < r.w * 4; i++) out[y * r.w * 4 + i] = rgba[src + i];
  }
  return out;
}

/** Bilinear upscale of an RGBA crop, to help decode a small QR code. */
export function upscaleRgba(src: Uint8ClampedArray, w: number, h: number, f: number): Uint8ClampedArray {
  const W = w * f, H = h * f;
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    const sy = Math.min(h - 1.001, Math.max(0, (y + 0.5) / f - 0.5)), y0 = Math.floor(sy), fy = sy - y0;
    for (let x = 0; x < W; x++) {
      const sx = Math.min(w - 1.001, Math.max(0, (x + 0.5) / f - 0.5)), x0 = Math.floor(sx), fx = sx - x0;
      const i = (y0 * w + x0) * 4, o = (y * W + x) * 4;
      for (let c = 0; c < 4; c++) {
        out[o + c] = src[i + c] * (1 - fx) * (1 - fy) + src[i + 4 + c] * fx * (1 - fy) + src[i + w * 4 + c] * (1 - fx) * fy + src[i + w * 4 + 4 + c] * fx * fy;
      }
    }
  }
  return out;
}

export type QrDecoder = (rgba: Uint8ClampedArray, w: number, h: number) => string | null;

export type Located = {
  payload: { studentId: number; testId: number; page: number };
  /** Corner marks in PAGE order: top-left, top-right, bottom-right, bottom-left. */
  marks: Mark[];
};

/** Find the QR code and corner marks. Returns an error string if the sheet can't be located. */
export function locateSheet(
  rgba: ArrayLike<number>, gray: Gray, decodeQr: QrDecoder,
): { ok: true; value: Located } | { ok: false; error: string } {
  const marks = findCornerMarks(gray);
  if (!marks) return { ok: false, error: "no-sheet" };

  const regions = qrSearchRegions(marks, gray.w, gray.h);
  for (let k = 0; k < 4; k++) {
    const r = regions[k];
    if (r.w < 20 || r.h < 20) continue;
    const crop = cropRgba(rgba, gray.w, r);
    let text = decodeQr(crop, r.w, r.h);
    // Small or blurry code (page far from the camera): try again enlarged.
    for (const f of [2, 3]) {
      if (text) break;
      text = decodeQr(upscaleRgba(crop, r.w, r.h, f), r.w * f, r.h * f);
    }
    const m = text && /^S(\d+)\|T(\d+)\|P(\d+)$/.exec(text);
    if (!m) continue;
    // The QR code is at the page's top-right. Going clockwise from there: bottom-right, bottom-left, top-left.
    const marksInPageOrder = [marks[(k + 3) % 4], marks[k], marks[(k + 1) % 4], marks[(k + 2) % 4]];
    return {
      ok: true,
      value: { payload: { studentId: Number(m[1]), testId: Number(m[2]), page: Number(m[3]) }, marks: marksInPageOrder },
    };
  }
  return { ok: false, error: "no-qr" };
}

// ---------------------------------------------------------------------------------------------
// 2. Straighten the page
// ---------------------------------------------------------------------------------------------

/** Solve the 3x3 projective transform taking each src point to its dst point (4 point pairs). */
export function solveHomography(src: Pt[], dst: Pt[]): number[] {
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i], { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  const n = 8;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k];
    }
  }
  const h = A.map((row, i) => row[n] / row[i]);
  return [...h, 1];
}

/**
 * Produce an upright picture of the page. `pageMarks` are the corner squares' centres in PDF points
 * (y up), in the same order as `marks` (top-left, top-right, bottom-right, bottom-left).
 */
export function warpPage(gray: Gray, marks: Mark[], pageMarks: Pt[], pageW: number, pageH: number): Gray {
  const S = WARP_SCALE;
  const dst = pageMarks.map((p) => ({ x: p.x * S, y: (pageH - p.y) * S }));
  const H = solveHomography(dst, marks); // warped pixel -> photo pixel
  const W = Math.round(pageW * S), Hh = Math.round(pageH * S);
  const out = new Uint8ClampedArray(W * Hh);
  const { data, w, h } = gray;
  for (let y = 0; y < Hh; y++) {
    for (let x = 0; x < W; x++) {
      const d = H[6] * x + H[7] * y + H[8];
      const u = (H[0] * x + H[1] * y + H[2]) / d, v = (H[3] * x + H[4] * y + H[5]) / d;
      const x0 = Math.floor(u), y0 = Math.floor(v);
      if (x0 < 0 || y0 < 0 || x0 >= w - 1 || y0 >= h - 1) { out[y * W + x] = 255; continue; }
      const fx = u - x0, fy = v - y0, i = y0 * w + x0;
      out[y * W + x] =
        data[i] * (1 - fx) * (1 - fy) + data[i + 1] * fx * (1 - fy) + data[i + w] * (1 - fx) * fy + data[i + w + 1] * fx * fy;
    }
  }
  return { data: out, w: W, h: Hh };
}

// ---------------------------------------------------------------------------------------------
// 3. Read bubbles
// ---------------------------------------------------------------------------------------------

export type BubbleReading = LayoutBubble & { score: number };

/** 0 = blank paper, 1 = solid dark. */
export function readBubbles(warped: Gray, bubbles: LayoutBubble[], pageH: number): { readings: BubbleReading[]; alignment: number } {
  const S = WARP_SCALE;
  const means: number[] = [];
  for (const b of bubbles) {
    const px = b.cx * S, py = (pageH - b.cy) * S, rr = b.r * S * 0.58;
    let sum = 0, n = 0;
    for (let y = Math.floor(py - rr); y <= Math.ceil(py + rr); y++) {
      for (let x = Math.floor(px - rr); x <= Math.ceil(px + rr); x++) {
        if ((x - px) ** 2 + (y - py) ** 2 > rr * rr || x < 0 || y < 0 || x >= warped.w || y >= warped.h) continue;
        sum += warped.data[y * warped.w + x]; n++;
      }
    }
    means.push(n ? sum / n : 255);
  }
  const sorted = [...means].sort((a, b) => a - b);
  const paper = Math.max(120, sorted[Math.floor(sorted.length * 0.8)] ?? 255);
  const INK = 30;

  // Alignment check: the printed outline of each bubble should be dark where we expect it.
  let hits = 0, total = 0;
  for (const b of bubbles) {
    const px = b.cx * S, py = (pageH - b.cy) * S, R = b.r * S;
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      let darkest = 255;
      for (let dr = -1.6; dr <= 1.6; dr += 0.8) {
        const x = Math.round(px + (R + dr) * Math.cos(ang)), y = Math.round(py + (R + dr) * Math.sin(ang));
        if (x < 0 || y < 0 || x >= warped.w || y >= warped.h) continue;
        darkest = Math.min(darkest, warped.data[y * warped.w + x]);
      }
      total++; if (darkest < paper * 0.65) hits++;
    }
  }

  return {
    readings: bubbles.map((b, i) => ({ ...b, score: Math.max(0, Math.min(1, (paper - means[i]) / (paper - INK))) })),
    alignment: total ? hits / total : 0,
  };
}

// ---------------------------------------------------------------------------------------------
// 4. Interpret
// ---------------------------------------------------------------------------------------------

export const FILLED = 0.4;
export const FAINT = 0.18;

export type PointResult = {
  pointId: number;
  status: "earned" | "missed" | "review";
  /** For missed points: the chosen reason (null for "Other" or when none was chosen). */
  reasonId: number | null;
  other: boolean;
  /** Why this point needs review, or a gentle note for accepted results. */
  note: string | null;
  scores: { full: number; missed: number; reasons: { reasonId: number | null; score: number }[] };
};

export function interpret(readings: BubbleReading[]): PointResult[] {
  const byPoint = new Map<number, BubbleReading[]>();
  for (const r of readings) {
    if (!byPoint.has(r.pointId)) byPoint.set(r.pointId, []);
    byPoint.get(r.pointId)!.push(r);
  }
  const out: PointResult[] = [];
  for (const [pointId, bs] of byPoint) {
    const full = bs.find((b) => b.kind === "full")?.score ?? 0;
    const missed = bs.find((b) => b.kind === "missed")?.score ?? 0;
    const reasons = bs.filter((b) => b.kind === "reason").map((b) => ({ reasonId: b.reasonId, score: b.score }));
    const scores = { full, missed, reasons };
    const base = { pointId, scores };

    const isFull = full >= FILLED, isMissed = missed >= FILLED;
    const picked = reasons.filter((r) => r.score >= FILLED);
    const faintSomething = !isFull && !isMissed && picked.length === 0 && (full >= FAINT || missed >= FAINT || reasons.some((r) => r.score >= FAINT));

    if (isFull && !isMissed && picked.length === 0) {
      out.push({ ...base, status: "earned", reasonId: null, other: false, note: null });
    } else if (isFull) {
      out.push({ ...base, status: "review", reasonId: null, other: false, note: "Full credit AND a missed/reason bubble are filled." });
    } else if (isMissed && picked.length === 1) {
      out.push({ ...base, status: "missed", reasonId: picked[0].reasonId, other: picked[0].reasonId === null, note: null });
    } else if (isMissed && picked.length === 0) {
      out.push({ ...base, status: "missed", reasonId: null, other: false, note: reasons.length ? "Missed, but no reason was chosen." : null });
    } else if (isMissed) {
      out.push({ ...base, status: "review", reasonId: null, other: false, note: "More than one reason is filled." });
    } else if (picked.length === 1) {
      out.push({ ...base, status: "missed", reasonId: picked[0].reasonId, other: picked[0].reasonId === null, note: "Reason chosen but \"Missed it\" was not filled." });
    } else if (picked.length > 1) {
      out.push({ ...base, status: "review", reasonId: null, other: false, note: "More than one reason is filled." });
    } else if (faintSomething) {
      out.push({ ...base, status: "review", reasonId: null, other: false, note: "Only a faint mark was found." });
    } else {
      out.push({ ...base, status: "review", reasonId: null, other: false, note: "Nothing is filled in for this point." });
    }
  }
  return out;
}
