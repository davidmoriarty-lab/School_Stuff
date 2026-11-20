import { NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import { yearSummaries, type YearSummary } from "@/lib/yearSummary";
import { clean, wrap, safeFile } from "@/lib/pdfUtil";

export const dynamic = "force-dynamic";

const INK = rgb(0.1, 0.1, 0.12), MUTED = rgb(0.4, 0.42, 0.47), BAND = rgb(0.9, 0.92, 0.97), RULE = rgb(0.78, 0.8, 0.84), TRACK = rgb(0.93, 0.94, 0.97);
const BLUE = rgb(0.165, 0.47, 0.84), GOOD = rgb(0, 0.39, 0), W = 612, H = 792, M = 48, BOTTOM = 56;
const pct = (v: number | null) => (v == null ? "-" : `${Math.round(v)}%`);

/** End-of-year summary: one PDF per student of how they did across the whole year, and what to work on. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const courseId = Number(q.get("courseId"));
  const studentId = Number(q.get("studentId")) || null;
  const sectionId = Number(q.get("sectionId")) || null;
  if (!courseId || (!studentId && !sectionId)) return new Response("Choose a course and a class period or student", { status: 400 });
  const students = yearSummaries(courseId, { sectionId, studentId });
  if (!students.length) return new Response("No scanned results to summarize.", { status: 404 });

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const s of students) {
    const before = pdf.getPageCount();
    drawStudent(pdf, font, bold, s);
    // When printing a whole class double-sided, give each student an even number of pages so the next
    // student always starts on a front side.
    if (students.length > 1 && (pdf.getPageCount() - before) % 2 === 1) pdf.addPage([W, H]);
  }

  const name = studentId ? `${students[0].name} year summary` : `${students[0].course} year summaries`;
  return new Response(Buffer.from(await pdf.save()), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${safeFile(name)}.pdf"` },
  });
}

function drawStudent(pdf: PDFDocument, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, bold: typeof font, s: YearSummary) {
  let page!: PDFPage;
  let y = 0;
  let pageNo = 0;
  const text = (t: string, x: number, size = 10, f = font, color = INK) => page.drawText(clean(t), { x, y, size, font: f, color });
  const newPage = (first = false) => {
    page = pdf.addPage([W, H]);
    pageNo++;
    y = H - M;
    if (first) {
      text("End-of-Year Summary", M, 22, bold); y -= 20;
      text(`${s.course}`, M, 11, font, MUTED); y -= 30;
      text(s.name, M, 15, bold);
      text(s.period, M + bold.widthOfTextAtSize(clean(s.name), 15) + 12, 10.5, font, MUTED); y -= 22;
    } else {
      text(`${s.name}  |  End-of-Year Summary  (page ${pageNo})`, M, 9, font, MUTED); y -= 22;
    }
  };
  const ensure = (h: number) => { if (y - h < BOTTOM) newPage(); };
  const heading = (t: string, note?: string) => {
    ensure(46);
    page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 20, color: BAND });
    text(t, M + 8, 10.5, bold);
    if (note) text(note, W - M - 8 - font.widthOfTextAtSize(clean(note), 8.5), 8.5, font, MUTED);
    y -= 28;
  };

  newPage(true);

  // ---- headline numbers
  const boxes: [string, string, string?][] = [
    ["Overall score", pct(s.overall.raw), s.overall.curved != null ? `${pct(s.overall.curved)} curved` : undefined],
    ["Class average", pct(s.overall.classRaw)],
    ["Tests", String(s.tests.length)],
    ["Points scored", String(s.overall.answered)],
  ];
  const bw = (W - 2 * M - 3 * 10) / 4;
  boxes.forEach(([label, big, sub], i) => {
    const x = M + i * (bw + 10);
    page.drawRectangle({ x, y: y - 46, width: bw, height: 54, borderColor: RULE, borderWidth: 0.8 });
    page.drawText(label.toUpperCase(), { x: x + 9, y: y - 8, size: 7.5, font: bold, color: MUTED });
    page.drawText(clean(big), { x: x + 9, y: y - 30, size: 20, font: bold, color: INK });
    if (sub) page.drawText(clean(sub), { x: x + 9 + bold.widthOfTextAtSize(clean(big), 20) + 6, y: y - 30, size: 9, font, color: GOOD });
  });
  y -= 70;

  // ---- score by test
  heading("Score by test", s.hasCurve ? "raw / curved" : undefined);
  for (const t of s.tests) {
    ensure(16);
    text(t.name, M + 8, 10);
    const right = W - M - 8;
    const val = s.hasCurve && t.curved != null ? `${pct(t.raw)}  /  ${pct(t.curved)}` : pct(t.raw);
    text(val, right - bold.widthOfTextAtSize(clean(val), 10), 10, bold);
    if (t.classRaw != null) {
      const cls = `class ${pct(t.classRaw)}`;
      text(cls, right - 120 - font.widthOfTextAtSize(clean(cls), 9), 9, font, MUTED);
    }
    y -= 14;
  }
  y -= 8;

  // ---- units
  if (s.units.length) {
    heading("How you did in each unit", "bar = you, tick = class average");
    const trackX = M + 250, trackW = 190;
    for (const u of s.units) {
      ensure(20);
      text(`Unit ${u.num}: ${u.title}`.length > 52 ? `Unit ${u.num}: ${u.title}`.slice(0, 49) + "..." : `Unit ${u.num}: ${u.title}`, M + 8, 9.5);
      page.drawRectangle({ x: trackX, y: y - 1, width: trackW, height: 8, color: TRACK });
      page.drawRectangle({ x: trackX, y: y - 1, width: Math.max(2, (u.pct / 100) * trackW), height: 8, color: BLUE });
      if (u.classPct != null) page.drawRectangle({ x: trackX + (u.classPct / 100) * trackW - 0.75, y: y - 4, width: 1.5, height: 14, color: INK });
      text(pct(u.pct), trackX + trackW + 10, 9.5, bold);
      y -= 16;
    }
    y -= 10;
  }

  // ---- focus topics
  heading("Topics to focus on", "lowest first");
  if (!s.weak.length) {
    text("No topic is below 80%. Keep it up!", M + 8, 10, font, MUTED);
    y -= 22;
  }
  for (const t of s.weak) {
    const lines = wrap(font, `${t.code}  ${t.title}`, 10, 300);
    const detail = t.topReason ? wrap(font, `Most common mistake: ${t.topReason}`, 8.5, W - 2 * M - 24) : [];
    ensure(lines.length * 12 + detail.length * 11 + 10);
    lines.forEach((l, i) => { text(l, M + 8, 10, i === 0 ? bold : font); if (i < lines.length - 1) y -= 12; });
    const val = `${pct(t.pct)}  (${t.earned}/${t.answered})`;
    page.drawText(clean(val), { x: W - M - 8 - bold.widthOfTextAtSize(clean(val), 10), y, size: 10, font: bold, color: INK });
    y -= 12;
    detail.forEach((l) => { text(l, M + 18, 8.5, font, MUTED); y -= 11; });
    y -= 4;
  }
  y -= 6;

  // ---- strengths
  if (s.strong.length) {
    heading("Your strengths");
    for (const t of s.strong) {
      ensure(16);
      text(`${t.code}  ${t.title}`.slice(0, 70), M + 8, 10);
      const val = `${pct(t.pct)}  (${t.earned}/${t.answered})`;
      text(val, W - M - 8 - bold.widthOfTextAtSize(clean(val), 10), 10, bold, GOOD);
      y -= 15;
    }
    y -= 8;
  }

  // ---- common mistakes
  if (s.reasons.length) {
    heading("Mistakes you made most often");
    for (const r of s.reasons) {
      ensure(16);
      text(r.reason.slice(0, 80), M + 8, 10);
      const val = `${r.n} time${r.n === 1 ? "" : "s"}`;
      text(val, W - M - 8 - font.widthOfTextAtSize(val, 10), 10, font, MUTED);
      y -= 15;
    }
  }
}
