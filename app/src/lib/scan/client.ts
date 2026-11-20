"use client";

import jsQR from "jsqr";
import * as P from "./pipeline";

export type PointInfo = {
  id: number;
  tag: string;
  question: number;
  description: string;
  topic: { code: string; title: string } | null;
  reasons: { id: number; text: string }[];
};

type LayoutResponse = {
  test: { id: number; name: string };
  student: { id: number; name: string; period: string } | null;
  page: { w: number; h: number };
  pageMarks: P.Pt[];
  pages: { bubbles: (P.LayoutBubble & { label: string })[] }[];
  points: PointInfo[];
};

export type Scanned = {
  studentId: number;
  testId: number;
  pageNumber: number;
  pageCount: number;
  studentName: string;
  period: string;
  testName: string;
  points: PointInfo[]; // only the points on this page, in order
  bubbles: (P.LayoutBubble & { label: string })[];
  readings: P.BubbleReading[];
  results: P.PointResult[];
  warped: P.Gray;
  alignment: number;
  pageSize: { w: number; h: number };
  /** A stable fingerprint of where the sheet sits in the frame, used to wait for it to hold still. */
  fingerprint: string;
};

export type AnalyzeResult =
  | { ok: true; scanned: Scanned }
  | { ok: false; error: "no-sheet" | "no-qr" | "unknown" | "misaligned"; message: string };

const MAX_SIDE = 2560;

/** Copy an image/video frame into a canvas no larger than MAX_SIDE on its long edge. */
export function frameToCanvas(src: CanvasImageSource, sw: number, sh: number, canvas = document.createElement("canvas")) {
  const k = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  canvas.width = Math.round(sw * k);
  canvas.height = Math.round(sh * k);
  canvas.getContext("2d", { willReadFrequently: true })!.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas;
}

const decodeQr: P.QrDecoder = (data, w, h) => jsQR(data, w, h, { inversionAttempts: "dontInvert" })?.data ?? null;

export async function analyzeCanvas(canvas: HTMLCanvasElement): Promise<AnalyzeResult> {
  const { width: w, height: h } = canvas;
  const rgba = canvas.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, w, h).data;
  const gray = P.rgbaToGray(rgba, w, h);

  const loc = P.locateSheet(rgba, gray, decodeQr);
  if (!loc.ok) {
    return loc.error === "no-sheet"
      ? { ok: false, error: "no-sheet", message: "Place a scoring sheet flat under the camera so all four black corner squares are visible." }
      : { ok: false, error: "no-qr", message: "Found the sheet but couldn't read its QR code. Flatten the page and hold it still." };
  }
  const { payload, marks } = loc.value;
  const fingerprint = `${payload.studentId}|${payload.testId}|${payload.page}|` + marks.map((m) => `${Math.round(m.x / 10)},${Math.round(m.y / 10)}`).join(";");

  const res = await fetch(`/api/tests/${payload.testId}/layout?studentId=${payload.studentId}`);
  if (!res.ok) return { ok: false, error: "unknown", message: "This sheet is for a test that isn't in this app." };
  const layout = (await res.json()) as LayoutResponse;
  const page = layout.pages[payload.page - 1];
  if (!layout.student || !page) return { ok: false, error: "unknown", message: "This sheet's student or page isn't in this app (was it printed from a different copy?)." };

  const warped = P.warpPage(gray, marks, layout.pageMarks, layout.page.w, layout.page.h);
  const { readings, alignment } = P.readBubbles(warped, page.bubbles, layout.page.h);
  if (alignment < 0.6) {
    return { ok: false, error: "misaligned", message: "Couldn't line the sheet up with the test template. Flatten the page and make sure all four corner squares are visible. If this test was edited after the sheets were printed, the sheets are out of date and need reprinting." };
  }
  const results = P.interpret(readings);
  const onPage = new Set(page.bubbles.map((b) => b.pointId));

  return {
    ok: true,
    scanned: {
      studentId: payload.studentId,
      testId: payload.testId,
      pageNumber: payload.page,
      pageCount: layout.pages.length,
      studentName: layout.student.name,
      period: layout.student.period,
      testName: layout.test.name,
      points: layout.points.filter((p) => onPage.has(p.id)),
      bubbles: page.bubbles,
      readings,
      results,
      warped,
      alignment,
      pageSize: layout.page,
      fingerprint,
    },
  };
}

/** Paint the straightened page into a canvas, optionally with colored rings on the bubbles that were read as filled. */
export function drawWarped(canvas: HTMLCanvasElement, s: Scanned, overlay: boolean, highlight?: Set<number>) {
  const { warped } = s;
  canvas.width = warped.w;
  canvas.height = warped.h;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(warped.w, warped.h);
  for (let i = 0, j = 0; i < warped.data.length; i++, j += 4) {
    img.data[j] = img.data[j + 1] = img.data[j + 2] = warped.data[i];
    img.data[j + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  if (!overlay) return;
  const S = P.WARP_SCALE;
  for (const r of s.readings) {
    const x = r.cx * S, y = (s.pageSize.h - r.cy) * S;
    if (highlight?.has(r.pointId)) {
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r.r * S + 4, 0, Math.PI * 2); ctx.stroke();
    }
    if (r.score >= P.FILLED) {
      ctx.strokeStyle = r.kind === "full" ? "#16a34a" : "#dc2626";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, r.r * S + 2, 0, Math.PI * 2); ctx.stroke();
    }
  }
}

/** Bounding box (in straightened-picture pixels) of everything belonging to one point. */
export function pointRect(s: Scanned, pointId: number) {
  const S = P.WARP_SCALE;
  const bs = s.bubbles.filter((b) => b.pointId === pointId);
  if (!bs.length) return null;
  const top = Math.max(...bs.map((b) => b.cy)) + 16, bottom = Math.min(...bs.map((b) => b.cy)) - 10;
  return { x: 30 * S, y: (s.pageSize.h - top) * S, w: (s.pageSize.w - 60) * S, h: (top - bottom) * S };
}
