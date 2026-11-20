import { NextRequest } from "next/server";
import { eq, asc } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { test, student, section } from "@/lib/schema";
import { loadTemplate, sheetOptionsFor } from "@/lib/template";
import { layoutSheet, PAGE, COLORS, cornerMarks } from "@/lib/sheetLayout";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const testId = Number(id);
  const sectionId = Number(req.nextUrl.searchParams.get("sectionId"));

  const t = db.select().from(test).where(eq(test.id, testId)).get();
  const sec = db.select().from(section).where(eq(section.id, sectionId)).get();
  if (!t || !sec) return new Response("Test or section not found", { status: 404 });

  const students = db.select().from(student).where(eq(student.sectionId, sectionId)).orderBy(asc(student.lastName), asc(student.firstName)).all();
  const sheetPages = layoutSheet(loadTemplate(testId), sheetOptionsFor(testId));
  const isMidterm = t.kind === "midterm";

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const s of students) {
    for (let pi = 0; pi < sheetPages.length; pi++) {
      const sp = sheetPages[pi];
      const page = pdf.addPage([PAGE.w, PAGE.h]);

      // The QR carries IDs only, never the student's name.
      const payload = `S${s.id}|T${testId}|P${pi + 1}`;
      const png = await QRCode.toBuffer(payload, { margin: 1, width: 240, errorCorrectionLevel: "M" });
      const img = await pdf.embedPng(png);
      const QR = 58;
      page.drawImage(img, { x: PAGE.w - PAGE.margin - QR, y: PAGE.h - PAGE.margin - QR, width: QR, height: QR });

      const top = PAGE.h - PAGE.margin;
      const c = (v: readonly number[]) => rgb(v[0], v[1], v[2]);
      const name = `${s.lastName}, ${s.firstName}`;
      page.drawText(name, { x: PAGE.margin, y: top - 11, size: 12, font: bold });
      page.drawText(`${t.name}  |  ${sec.name}  |  Page ${pi + 1} of ${sheetPages.length}`, {
        x: PAGE.margin + bold.widthOfTextAtSize(name, 12) + 10, y: top - 11, size: 8.5, font, color: c(COLORS.muted),
      });

      // Compact how-to box
      const bx = PAGE.margin, bw = PAGE.w - 2 * PAGE.margin - QR - 8, bh = 34, by = top - 18 - bh;
      page.drawRectangle({ x: bx, y: by, width: bw, height: bh, color: c(COLORS.panel), borderColor: c(COLORS.rule), borderWidth: 0.7 });
      page.drawText(isMidterm ? "TEACHER GRADING SHEET.   Fill in Earned if the student earned the point, otherwise fill in Missed." : "Earned it?  Fill in Full credit only.      Missed it?  Fill in Missed it, then ONE reason in the shaded box.", {
        x: bx + 8, y: by + bh - 13, size: 7.5, font: bold,
      });
      const t2 = "Fill bubbles in completely:";
      page.drawText(t2, { x: bx + 8, y: by + 8, size: 7.5, font });
      const ex = bx + 8 + font.widthOfTextAtSize(t2, 7.5) + 9;
      page.drawCircle({ x: ex, y: by + 10.2, size: 3.8, color: rgb(0, 0, 0), borderColor: rgb(0, 0, 0), borderWidth: 1 });
      page.drawText("good", { x: ex + 7, y: by + 8, size: 7.5, font, color: c(COLORS.muted) });
      page.drawCircle({ x: ex + 38, y: by + 10.2, size: 3.8, borderColor: rgb(0, 0, 0), borderWidth: 1 });
      page.drawText("not filled", { x: ex + 45, y: by + 8, size: 7.5, font, color: c(COLORS.muted) });
      page.drawText("Do not mark the QR code or black corner squares.", { x: ex + 100, y: by + 8, size: 7.5, font, color: c(COLORS.muted) });

      for (const m of cornerMarks()) {
        page.drawRectangle({ x: m.x, y: m.y, width: m.size, height: m.size, color: rgb(0, 0, 0) });
      }

      for (const r of sp.rects) {
        page.drawRectangle({
          x: r.x, y: r.y, width: r.w, height: r.h,
          color: r.fill ? c(r.fill) : undefined,
          borderColor: r.stroke ? c(r.stroke) : undefined,
          borderWidth: r.stroke ? r.width ?? 0.8 : 0,
        });
      }
      for (const l of sp.lines) {
        page.drawLine({ start: { x: l.x1, y: l.y1 }, end: { x: l.x2, y: l.y2 }, thickness: l.width ?? 0.8, color: c(l.color ?? COLORS.rule) });
      }
      for (const l of sp.labels) {
        page.drawText(l.text.replace(/[^ -~]/g, "?"), { x: l.x, y: l.y, size: l.size, font: l.bold ? bold : font, color: c(l.color ?? COLORS.ink) });
      }
      for (const b of sp.bubbles) {
        page.drawCircle({ x: b.cx, y: b.cy, size: b.r, color: rgb(1, 1, 1), borderColor: rgb(0, 0, 0), borderWidth: 1 });
      }
    }
    // For double-sided printing: if this student's sheet has an odd number of pages, add a blank back page so the
    // next student starts on a fresh front side instead of on the back of this student's last page.
    if (sheetPages.length % 2 === 1 && s !== students[students.length - 1]) pdf.addPage([PAGE.w, PAGE.h]);
  }

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${`${t.name} - ${sec.name} scoring sheets.pdf`.replace(/[^\w .-]/g, "")}"`,
    },
  });
}
