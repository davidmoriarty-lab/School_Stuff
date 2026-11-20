import { NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import { sqlite } from "@/lib/db";
import { correctionsFor } from "@/lib/corrections";
import { clean, wrap, safeFile } from "@/lib/pdfUtil";

export const dynamic = "force-dynamic";

const INK = rgb(0.1, 0.1, 0.12), MUTED = rgb(0.4, 0.42, 0.47), BAND = rgb(0.9, 0.92, 0.97), RULE = rgb(0.78, 0.8, 0.84), CHIP = rgb(0.87, 0.88, 0.91);
const W = 612, H = 792, M = 48, BOTTOM = 52, LINE = 19, LINES = 6;

/** Test-correction sheets: for each student, only the questions they missed, with the reason they gave and room to redo them. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const testId = Number(q.get("testId"));
  const studentId = Number(q.get("studentId")) || null;
  const sectionId = Number(q.get("sectionId")) || null;
  if (!studentId && !sectionId) return new Response("Choose a class period or a student", { status: 400 });
  const test = sqlite.prepare("SELECT name FROM test WHERE id = ?").get(testId) as { name: string } | undefined;
  if (!test) return new Response("Test not found", { status: 404 });

  const all = correctionsFor(testId, { studentId, sectionId });
  const students = studentId ? all : all.filter((s) => s.missedCount > 0);
  if (!students.length) return new Response("Nothing to correct: no missed points were found.", { status: 404 });

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const s of students) {
    let page!: PDFPage;
    let y = 0;
    let pageNo = 0;
    const newPage = () => {
      page = pdf.addPage([W, H]);
      pageNo++;
      y = H - M;
      page.drawText(clean(s.name), { x: M, y: y - 10, size: 14, font: bold, color: INK });
      const sub = clean(`Test Corrections  |  ${test.name}  |  ${s.period}`);
      page.drawText(sub, { x: M + bold.widthOfTextAtSize(clean(s.name), 14) + 12, y: y - 10, size: 9, font, color: MUTED });
      page.drawText(`Page ${pageNo}`, { x: W - M - 36, y: y - 10, size: 9, font, color: MUTED });
      page.drawLine({ start: { x: M, y: y - 18 }, end: { x: W - M, y: y - 18 }, thickness: 0.8, color: RULE });
      y -= 34;
    };
    newPage();

    // How-to (first page only)
    const how = wrap(font, "For each point you missed, redo the question in the space provided: write the correct answer with your work, and explain your new reasoning in your own words. Use your original test, your notes and your textbook.", 9.5, W - 2 * M - 20);
    const howH = 24 + how.length * 12;
    page!.drawRectangle({ x: M, y: y - howH + 8, width: W - 2 * M, height: howH, color: rgb(0.955, 0.96, 0.975), borderColor: RULE, borderWidth: 0.6 });
    page!.drawText("HOW TO DO YOUR CORRECTIONS", { x: M + 10, y: y - 6, size: 8, font: bold, color: MUTED });
    how.forEach((l, i) => page.drawText(l, { x: M + 10, y: y - 20 - i * 12, size: 9.5, font, color: INK }));
    y -= howH + 12;

    for (const qq of s.questions) {
      const pointBlock = (m: (typeof qq.missed)[number]) => {
        const reasonLines = wrap(font, m.reason, 10, W - 2 * M - 150);
        return { reasonLines, h: 16 + (m.description ? 13 : 0) + (m.topic ? 12 : 0) + reasonLines.length * 13 + 8 + 12 + LINES * LINE + 12 };
      };

      // Keep the question band together with at least its first missed point.
      const first = pointBlock(qq.missed[0]);
      if (y - (24 + first.h) < BOTTOM) newPage();
      page.drawRectangle({ x: M, y: y - 18, width: W - 2 * M, height: 22, color: BAND });
      page.drawText(`Question ${qq.number}`, { x: M + 10, y: y - 12, size: 11.5, font: bold, color: INK });
      const earned = `Points earned: ${qq.earned} of ${qq.total}`;
      page.drawText(earned, { x: W - M - 10 - font.widthOfTextAtSize(earned, 10), y: y - 12, size: 10, font, color: MUTED });
      y -= 30;

      for (const m of qq.missed) {
        const b = pointBlock(m);
        if (y - b.h < BOTTOM) newPage();

        page.drawRectangle({ x: M + 4, y: y - 12, width: 40, height: 16, color: CHIP });
        page.drawText(m.tag, { x: M + 9, y: y - 7, size: 9, font: bold, color: INK });
        if (m.description) page.drawText(clean(m.description), { x: M + 52, y: y - 7, size: 9.5, font, color: INK });
        y -= 20;
        if (m.topic) { page.drawText(clean(`Topic: ${m.topic}`), { x: M + 52, y: y + 2, size: 8.5, font, color: MUTED }); y -= 12; }
        page.drawText("You said you missed it because:", { x: M + 4, y: y - 4, size: 9, font, color: MUTED });
        b.reasonLines.forEach((l, i) => page.drawText(l, { x: M + 150, y: y - 4 - i * 13, size: 10, font: bold, color: INK }));
        y -= b.reasonLines.length * 13 + 8;

        page.drawText("Re-answer the question and explain your new reasoning:", { x: M + 4, y: y - 4, size: 8.5, font: bold, color: MUTED });
        y -= 12;
        for (let i = 0; i < LINES; i++) {
          y -= LINE;
          page.drawLine({ start: { x: M + 4, y }, end: { x: W - M, y }, thickness: 0.5, color: RULE });
        }
        y -= 14;
      }
      y -= 4;
    }
  }

  const name = studentId ? `${students[0].name} corrections` : `${test.name} corrections`;
  return new Response(Buffer.from(await pdf.save()), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${safeFile(name)}.pdf"` },
  });
}
