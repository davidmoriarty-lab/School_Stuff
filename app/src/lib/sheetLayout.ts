import type { QuestionT } from "./template";
import { MAX_POINTS_PER_PART } from "./limits";
import { wrapLines } from "./textMeasure";

// US Letter, in PDF points (origin bottom-left). The scanner reuses this same layout to know where
// each bubble sits, so everything here is deterministic and positions are bubble CENTERS.
export const PAGE = { w: 612, h: 792, margin: 40, headerH: 66 };
export const OTHER_REASON = "Other";
export const BUBBLE_R = 4.5;

// Solid black squares in the four corners. The scanner finds these to straighten the photo and
// map the layout onto it. Inset is kept inside the area most printers can reach.
export const CORNER_MARK = { size: 12, inset: 24 };
export const cornerMarks = (): { x: number; y: number; size: number }[] => {
  const { size, inset } = CORNER_MARK;
  const left = inset, right = PAGE.w - inset - size, bottom = inset, top = PAGE.h - inset - size;
  return [
    { x: left, y: top, size }, { x: right, y: top, size },
    { x: left, y: bottom, size }, { x: right, y: bottom, size },
  ];
};

type RGB = [number, number, number];
export const COLORS = {
  ink: [0.1, 0.1, 0.12] as RGB,
  muted: [0.4, 0.42, 0.47] as RGB,
  band: [0.9, 0.92, 0.97] as RGB,
  chip: [0.87, 0.88, 0.91] as RGB,
  panel: [0.955, 0.96, 0.975] as RGB,
  rule: [0.78, 0.8, 0.84] as RGB,
  box: [0.45, 0.47, 0.52] as RGB,
};

export type Bubble = {
  pointId: number;
  kind: "full" | "missed" | "reason";
  reasonId: number | null; // null for "Other" and for full/missed
  label: string;
  cx: number;
  cy: number;
  r: number;
};
export type Label = { text: string; x: number; y: number; size: number; bold?: boolean; color?: RGB };
export type Rect = { x: number; y: number; w: number; h: number; fill?: RGB; stroke?: RGB; width?: number };
export type Line = { x1: number; y1: number; x2: number; y2: number; color?: RGB; width?: number };
export type SheetPage = { bubbles: Bubble[]; labels: Label[]; rects: Rect[]; lines: Line[] };

const BOX_L = PAGE.margin;
const BOX_W = PAGE.w - 2 * PAGE.margin;
const BOX_R = BOX_L + BOX_W;
const INNER_L = BOX_L + 8;
const INNER_W = BOX_W - 16;

const QHEAD = 18; // question title band
const PARTHEAD = 13;
const REASON_ROW = 12;

// "Wide" point block: one point across the full width (two-column reasons).
const POINT_ROW = 20;
const PANEL_PAD_TOP = 3;
const PANEL_PAD_BOTTOM = 3;
const POINT_GAP = 5;

// "Narrow" point block: used when a part has several points, which sit side by side as boxes.
const NARROW_HEAD = 36; // line 1: tag + note, line 2: the two main bubbles
const NARROW_PANEL_HEAD = 12;
const NARROW_GAP = 8; // between boxes
const NARROW_MAX_COLS = MAX_POINTS_PER_PART;

type PointT = QuestionT["parts"][number]["points"][number];

function trunc(s: string, n: number) {
  return s.length > n ? s.slice(0, Math.max(1, n - 3)) + "..." : s;
}

const reasonOptions = (pt: PointT) => [
  ...pt.reasons.map((r) => ({ id: r.id as number | null, text: r.text })),
  { id: null as number | null, text: OTHER_REASON },
];

// Long reasons wrap onto up to three lines instead of being cut off. A one-line reason is 12pt tall, as before.
const REASON_SIZE = 7.5;
const LINE_H = 9;
const ITEM_GAP = 3;
type Opt = { id: number | null; text: string; lines: string[] };
const itemH = (o: Opt) => o.lines.length * LINE_H + ITEM_GAP;
const WIDE_TEXT_W = (BOX_W - 38) / 2 - 18 - 10; // half the panel, minus the bubble and a right margin
const narrowTextW = (cw: number) => cw - 22 - 8;

const wrapOpts = (pt: PointT, width: number): Opt[] => reasonOptions(pt).map((o) => ({ ...o, lines: wrapLines(o.text, REASON_SIZE, width) }));
const optsWide = (pt: PointT) => wrapOpts(pt, WIDE_TEXT_W);
const optsNarrow = (pt: PointT, cw: number) => wrapOpts(pt, narrowTextW(cw));

/** Split reasons into two columns (read down the left, then the right) with about the same number of lines each. */
function splitColumns(opts: Opt[]): [Opt[], Opt[]] {
  const total = opts.reduce((n, o) => n + o.lines.length, 0);
  const target = Math.ceil(total / 2);
  const a: Opt[] = [];
  let used = 0;
  for (const o of opts) {
    if (a.length === 0 || used + o.lines.length <= target) { a.push(o); used += o.lines.length; } else break;
  }
  return [a, opts.slice(a.length)];
}
const colH = (c: Opt[]) => c.reduce((s, o) => s + itemH(o), 0);

const widePanelHeight = (pt: PointT) => {
  const [a, b] = splitColumns(optsWide(pt));
  return PANEL_PAD_TOP + Math.max(colH(a), colH(b)) + PANEL_PAD_BOTTOM;
};
const wideHeight = (pt: PointT) => POINT_ROW + 1 + widePanelHeight(pt) + POINT_GAP;

const narrowPanelHeight = (pt: PointT, cw: number) => NARROW_PANEL_HEAD + colH(optsNarrow(pt, cw)) + 3;
const narrowHeight = (pt: PointT, compact: boolean, cw: number) => (compact ? NARROW_HEAD + 4 : NARROW_HEAD + narrowPanelHeight(pt, cw) + 6);
const cwOf = (cols: number) => (INNER_W - NARROW_GAP * (cols - 1)) / cols;

/** How a part's points are arranged: one full-width block each, or side-by-side boxes in rows. */
function arrange(points: PointT[], compact = false): { narrow: boolean; cols: number; rows: PointT[][] } {
  if (compact) {
    const cols = Math.min(NARROW_MAX_COLS, Math.max(1, points.length));
    const rows: PointT[][] = [];
    for (let i = 0; i < points.length; i += cols) rows.push(points.slice(i, i + cols));
    return { narrow: true, cols, rows };
  }
  if (points.length <= 1) return { narrow: false, cols: 1, rows: points.map((p) => [p]) };
  const cols = Math.min(NARROW_MAX_COLS, points.length);
  const rows: PointT[][] = [];
  for (let i = 0; i < points.length; i += cols) rows.push(points.slice(i, i + cols));
  return { narrow: true, cols, rows };
}
const rowHeight = (row: PointT[], narrow: boolean, compact: boolean, cw: number) => (narrow ? Math.max(...row.map((p) => narrowHeight(p, compact, cw))) : wideHeight(row[0]));

/** Lay out a test's questions onto as many pages as needed. */
export function layoutSheet(template: QuestionT[], opts: { reasons?: boolean } = {}): SheetPage[] {
  // Without reasons (teacher-graded sheets) each point is just a small Earned / Missed box.
  const compact = opts.reasons === false;
  const pages: SheetPage[] = [];
  const top = PAGE.h - PAGE.margin - PAGE.headerH;
  const bottom = PAGE.margin;
  let page: SheetPage = { bubbles: [], labels: [], rects: [], lines: [] };
  let y = top;
  pages.push(page);

  const newPage = () => {
    page = { bubbles: [], labels: [], rects: [], lines: [] };
    pages.push(page);
    y = top;
  };

  for (const q of template) {
    const total = q.parts.reduce((n, p) => n + p.points.length, 0);
    const fullH =
      QHEAD +
      q.parts.reduce((h, p) => {
        const a = arrange(p.points, compact);
        return h + (p.label ? PARTHEAD : 0) + a.rows.reduce((s, row) => s + rowHeight(row, a.narrow, compact, cwOf(compact ? NARROW_MAX_COLS : a.cols)), 0);
      }, 0) +
      4;
    // Keep small questions together; let big ones flow so pages do not end half empty.
    if (y - fullH < bottom && y !== top && fullH <= 0.4 * (top - bottom)) newPage();

    let segTop = y;
    const header = (cont: boolean) => {
      page.rects.push({ x: BOX_L, y: y - QHEAD, w: BOX_W, h: QHEAD, fill: COLORS.band });
      page.labels.push({ text: `Question ${q.number}${cont ? " (continued)" : ""}`, x: BOX_L + 8, y: y - 13, size: 10, bold: true });
      if (!cont) page.labels.push({ text: `${total} point${total === 1 ? "" : "s"}`, x: BOX_R - 54, y: y - 13, size: 8, color: COLORS.muted });
      y -= QHEAD;
    };
    const closeBox = () => {
      page.rects.push({ x: BOX_L, y, w: BOX_W, h: segTop - y, stroke: COLORS.box, width: 0.9 });
    };
    const breakPage = () => {
      y -= 2;
      closeBox();
      newPage();
      segTop = y;
      header(true);
    };

    // A full-width point: tag, note and both main bubbles on one row, reasons in two columns below.
    const drawWide = (pt: PointT, tag: string, h: number, isLast: boolean) => {
      const cy = y - POINT_ROW / 2;
      page.rects.push({ x: BOX_L + 8, y: cy - 7, w: 36, h: 14, fill: COLORS.chip });
      page.labels.push({ text: tag, x: BOX_L + 12, y: cy - 3, size: 8, bold: true });
      if (pt.description) page.labels.push({ text: trunc(pt.description, 40), x: BOX_L + 50, y: cy - 3, size: 7.5, color: COLORS.muted });

      const fullCx = BOX_R - 300;
      const missedCx = BOX_R - 205;
      page.bubbles.push({ pointId: pt.id, kind: "full", reasonId: null, label: "Full credit", cx: fullCx, cy, r: BUBBLE_R });
      page.labels.push({ text: "Full credit", x: fullCx + 8, y: cy - 3, size: 8.5, bold: true });
      page.bubbles.push({ pointId: pt.id, kind: "missed", reasonId: null, label: "Missed it", cx: missedCx, cy, r: BUBBLE_R });
      page.labels.push({ text: "Missed it", x: missedCx + 8, y: cy - 3, size: 8.5, bold: true });
      page.labels.push({ text: "-> then fill ONE reason below", x: missedCx + 52, y: cy - 2.8, size: 7, color: COLORS.muted });

      const panelTop = y - POINT_ROW - 1;
      const panelH = widePanelHeight(pt);
      const panelL = BOX_L + 30;
      const panelW = BOX_W - 38;
      page.rects.push({ x: panelL, y: panelTop - panelH, w: panelW, h: panelH, fill: COLORS.panel });
      page.lines.push({ x1: BOX_L + 18, y1: cy - 8, x2: BOX_L + 18, y2: panelTop - 8, color: COLORS.rule, width: 1 });
      page.lines.push({ x1: BOX_L + 18, y1: panelTop - 8, x2: panelL, y2: panelTop - 8, color: COLORS.rule, width: 1 });

      const colW = panelW / 2;
      splitColumns(optsWide(pt)).forEach((col, ci) => {
        let yy = panelTop - PANEL_PAD_TOP;
        for (const o of col) {
          const ry = yy - REASON_ROW / 2;
          const bx = panelL + 10 + ci * colW;
          page.bubbles.push({ pointId: pt.id, kind: "reason", reasonId: o.id, label: o.text, cx: bx, cy: ry, r: BUBBLE_R - 0.5 });
          o.lines.forEach((ln, li) => page.labels.push({ text: ln, x: bx + 8, y: ry - 2.8 - li * LINE_H, size: REASON_SIZE }));
          yy -= itemH(o);
        }
      });
      if (!isLast) page.lines.push({ x1: BOX_L + 8, y1: y - h + 2.5, x2: BOX_R - 8, y2: y - h + 2.5, color: COLORS.rule, width: 0.5 });
    };

    // A narrow boxed point (several side by side): tag + note, the two bubbles, then reasons in one column.
    const drawNarrow = (pt: PointT, tag: string, bx: number, cw: number, h: number) => {
      page.rects.push({ x: bx, y: y - (h - 4), w: cw, h: h - 4, stroke: COLORS.rule, width: 0.8 });

      const cy1 = y - 11;
      page.rects.push({ x: bx + 6, y: cy1 - 7, w: 36, h: 14, fill: COLORS.chip });
      page.labels.push({ text: tag, x: bx + 10, y: cy1 - 3, size: 8, bold: true });
      if (pt.description) {
        page.labels.push({ text: trunc(pt.description, Math.floor((cw - 52) / 3.3)), x: bx + 46, y: cy1 - 2.5, size: 7, color: COLORS.muted });
      }

      const cy2 = y - 28;
      const fullCx = bx + 14;
      const missedCx = bx + cw * 0.52;
      page.bubbles.push({ pointId: pt.id, kind: "full", reasonId: null, label: "Full credit", cx: fullCx, cy: cy2, r: BUBBLE_R });
      page.labels.push({ text: compact ? "Earned" : "Full credit", x: fullCx + 8, y: cy2 - 3, size: 8.5, bold: true });
      page.bubbles.push({ pointId: pt.id, kind: "missed", reasonId: null, label: "Missed it", cx: missedCx, cy: cy2, r: BUBBLE_R });
      page.labels.push({ text: compact ? "Missed" : "Missed it", x: missedCx + 8, y: cy2 - 3, size: 8.5, bold: true });

      if (compact) return;

      const panelTop = y - NARROW_HEAD;
      const panelH = narrowPanelHeight(pt, cw);
      page.rects.push({ x: bx + 5, y: panelTop - panelH, w: cw - 10, h: panelH, fill: COLORS.panel });
      page.labels.push({ text: "If missed, fill ONE:", x: bx + 10, y: panelTop - 9, size: 7, bold: true, color: COLORS.muted });
      let yy = panelTop - NARROW_PANEL_HEAD;
      for (const o of optsNarrow(pt, cw)) {
        const ry = yy - REASON_ROW / 2;
        page.bubbles.push({ pointId: pt.id, kind: "reason", reasonId: o.id, label: o.text, cx: bx + 14, cy: ry, r: BUBBLE_R - 0.5 });
        o.lines.forEach((ln, li) => page.labels.push({ text: ln, x: bx + 22, y: ry - 2.8 - li * LINE_H, size: REASON_SIZE }));
        yy -= itemH(o);
      }
    };

    header(false);
    const lastPart = q.parts[q.parts.length - 1];

    for (const p of q.parts) {
      const a = arrange(p.points, compact);
      if (p.label) {
        const first = a.rows[0];
        if (y - PARTHEAD - (first ? rowHeight(first, a.narrow, compact, cwOf(compact ? NARROW_MAX_COLS : a.cols)) : 0) < bottom) breakPage();
        const n = p.points.length;
        page.labels.push({ text: `Part ${p.label}`, x: BOX_L + 8, y: y - 10, size: 8.5, bold: true, color: COLORS.muted });
        if (n > 1) page.labels.push({ text: `${n} points`, x: BOX_L + 48, y: y - 10, size: 7.5, color: COLORS.muted });
        y -= PARTHEAD;
      }

      a.rows.forEach((row, ri) => {
        const h = rowHeight(row, a.narrow, compact, cwOf(compact ? NARROW_MAX_COLS : a.cols));
        if (y - h < bottom) breakPage();
        if (a.narrow) {
          const colCount = compact ? NARROW_MAX_COLS : a.cols; // teacher sheets keep every box one-third width
          const colW = (INNER_W - NARROW_GAP * (colCount - 1)) / colCount;
          row.forEach((pt, i) => drawNarrow(pt, `${q.number}${p.label}.${pt.position}`, INNER_L + i * (colW + NARROW_GAP), colW, h));
        } else {
          const pt = row[0];
          drawWide(pt, `${q.number}${p.label}.${pt.position}`, h, p === lastPart && ri === a.rows.length - 1);
        }
        y -= h;
      });
    }
    y -= 2;
    closeBox();
    y -= 8;
  }
  return pages;
}
