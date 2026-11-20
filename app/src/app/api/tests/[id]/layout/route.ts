import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { test, student, section } from "@/lib/schema";
import { loadTemplate, loadCurriculum, sheetOptionsFor } from "@/lib/template";
import { layoutSheet, PAGE, cornerMarks } from "@/lib/sheetLayout";

export const dynamic = "force-dynamic";

/**
 * Everything the scanner needs to read one test's sheets: where every bubble is, where the corner
 * marks are, and human-readable info about each point. Optionally includes the student's name.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const testId = Number((await ctx.params).id);
  const t = db.select().from(test).where(eq(test.id, testId)).get();
  if (!t) return Response.json({ error: "Test not found" }, { status: 404 });

  const template = loadTemplate(testId);
  const units = loadCurriculum(t.courseId);
  const topics = new Map(units.flatMap((u) => u.topics.map((tp) => [tp.id, { code: tp.code, title: tp.title }] as const)));

  const pages = layoutSheet(template, sheetOptionsFor(testId)).map((p) => ({ bubbles: p.bubbles }));
  const points = template.flatMap((q) =>
    q.parts.flatMap((p) =>
      p.points.map((pt) => ({
        id: pt.id,
        tag: `${q.number}${p.label}.${pt.position}`,
        question: q.number,
        description: pt.description,
        topic: pt.topicId ? topics.get(pt.topicId) ?? null : null,
        reasons: pt.reasons,
      })),
    ),
  );

  let studentInfo: { id: number; name: string; period: string } | null = null;
  const sid = Number(req.nextUrl.searchParams.get("studentId"));
  if (sid) {
    const s = db.select().from(student).where(eq(student.id, sid)).get();
    if (s) {
      const sec = db.select().from(section).where(eq(section.id, s.sectionId)).get();
      studentInfo = { id: s.id, name: `${s.lastName}, ${s.firstName}`, period: sec?.name ?? "" };
    }
  }

  return Response.json({
    test: { id: t.id, name: t.name },
    student: studentInfo,
    page: { w: PAGE.w, h: PAGE.h },
    // Corner-square centres in clockwise page order: top-left, top-right, bottom-right, bottom-left.
    pageMarks: [0, 1, 3, 2].map((i) => {
      const m = cornerMarks()[i];
      return { x: m.x + m.size / 2, y: m.y + m.size / 2 };
    }),
    pages,
    points,
  });
}
