import { NextRequest } from "next/server";
import { sqlite } from "@/lib/db";
import { buildTestTemplate } from "@/lib/importTest";

export const dynamic = "force-dynamic";

/** Download the test-import workbook, pre-filled for one course (its name and its topic codes). */
export async function GET(req: NextRequest) {
  const courseId = Number(req.nextUrl.searchParams.get("courseId")) || null;
  const course = courseId ? (sqlite.prepare("SELECT name FROM course WHERE id = ?").get(courseId) as { name: string } | undefined) : undefined;
  const file = `Test Import Template${course ? ` - ${course.name}` : ""}.xlsx`.replace(/[^\w .-]/g, "");
  return new Response(new Uint8Array(buildTestTemplate(courseId)), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${file}"`,
    },
  });
}
