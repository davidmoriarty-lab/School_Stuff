import { NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { midtermData } from "@/lib/midterm";
import { curveLabel } from "@/lib/curve";
import { clean, safeFile } from "@/lib/pdfUtil";

export const dynamic = "force-dynamic";

const INK = rgb(0.1, 0.1, 0.12), MUTED = rgb(0.4, 0.42, 0.47), BAND = rgb(0.9, 0.92, 0.97), RULE = rgb(0.78, 0.8, 0.84);
const pct = (v: number | null) => (v == null ? "-" : `${Math.round(v)}%`);

/** One-page midterm summary per student: FRQ points, MCQ points, combined (and curved) score. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const testId = Number(q.get("testId"));
  const studentId = Number(q.get("studentId")) || null;
  const sectionId = Number(q.get("sectionId")) || null;
  if (!studentId && !sectionId) return new Response("Choose a class period or a student", { status: 400 });
  const data = midtermData(testId, { studentId, sectionId });
  if (!data || !data.students.length) return new Response("Midterm or students not found", { status: 404 });
  const { test, students } = data;

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 612, H = 792, M = 56;

  for (const s of students) {
    const page = pdf.addPage([W, H]);
    let y = H - M;
    const text = (t: string, x: number, size = 11, f = font, color = INK) => page.drawText(clean(t), { x, y, size, font: f, color });

    text("Midterm Summary", M, 22, bold); y -= 22;
    text(`${test.name}`, M, 12, font, MUTED); y -= 34;
    text(s.name, M, 16, bold); y -= 16;
    text(s.period, M, 11, font, MUTED); y -= 30;

    const section = (title: string, big: string, sub: string) => {
      page.drawRectangle({ x: M, y: y - 8, width: W - 2 * M, height: 26, color: BAND });
      text(title, M + 10, 11, bold);
      y -= 34;
      text(big, M + 10, 24, bold);
      text(sub, M + 10 + bold.widthOfTextAtSize(clean(big), 24) + 12, 11, font, MUTED);
      y -= 30;
    };

    // FRQ
    section("Free response (FRQ)", `${s.frqEarned} / ${test.frqTotal}`, s.frqScored === 0 ? "not scored yet" : `${pct((s.frqEarned / test.frqTotal) * 100)}${s.frqComplete ? "" : "  (some points not scanned)"}`);
    const cols = 4, colW = (W - 2 * M) / cols;
    s.byQuestion.forEach((qq, i) => {
      const cx = M + 10 + (i % cols) * colW, cy = y - Math.floor(i / cols) * 18;
      page.drawText(clean(`Question ${qq.number}:`), { x: cx, y: cy, size: 10, font, color: MUTED });
      page.drawText(`${qq.earned} / ${qq.total}`, { x: cx + 62, y: cy, size: 10, font: bold, color: INK });
    });
    y -= Math.ceil(s.byQuestion.length / cols) * 18 + 22;

    // MCQ
    if (test.mcqTotal > 0) {
      section("Multiple choice (MCQ)", s.mcq == null ? "-" : `${s.mcq} / ${test.mcqTotal}`, s.mcq == null ? "not entered yet" : pct((s.mcq / test.mcqTotal) * 100));
    }

    // Combined
    section("Combined score", s.raw == null ? "-" : `${s.combined} / ${test.total}`, s.raw == null ? "" : `${pct(s.raw)} raw`);
    if (test.curve.type !== "none" && s.curved != null) {
      page.drawLine({ start: { x: M, y: y + 4 }, end: { x: W - M, y: y + 4 }, thickness: 0.7, color: RULE });
      y -= 14;
      text(`${curveLabel(test.curve)}:`, M + 10, 11, font, MUTED);
      text(`${pct(s.curved)}`, M + 10 + font.widthOfTextAtSize(clean(`${curveLabel(test.curve)}:`), 11) + 10, 18, bold);
      y -= 24;
    }
    if (!s.complete) {
      y -= 8;
      text("This summary is incomplete: " + [!s.frqComplete ? "not every FRQ point has been scanned" : "", test.mcqTotal > 0 && s.mcq == null ? "the MCQ score has not been entered" : ""].filter(Boolean).join(" and ") + ".", M, 9, font, MUTED);
    }
  }

  const name = studentId ? students[0].name : `${test.name} summaries`;
  return new Response(Buffer.from(await pdf.save()), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${safeFile(name)}.pdf"` },
  });
}
