import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { sqlite } from "@/lib/db";
import { loadTemplate, sheetOptionsFor } from "@/lib/template";
import { layoutSheet } from "@/lib/sheetLayout";

export const dynamic = "force-dynamic";

type Incoming = {
  studentId: number;
  testId: number;
  page: number;
  results: { pointId: number; status: "earned" | "missed" | "unknown"; reasonId: number | null; other: boolean }[];
  image?: string; // JPEG data URL of the straightened page
};

/** Save one scanned sheet page: its image and the result for every point on it. Re-scanning replaces. */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Incoming;
  const { studentId, testId, page } = body;

  const student = sqlite.prepare("SELECT id FROM student WHERE id = ?").get(studentId);
  const test = sqlite.prepare("SELECT id FROM test WHERE id = ?").get(testId);
  if (!student || !test) return Response.json({ error: "Unknown student or test" }, { status: 404 });

  const layout = layoutSheet(loadTemplate(testId), sheetOptionsFor(testId))[page - 1];
  if (!layout) return Response.json({ error: "Unknown page" }, { status: 400 });
  const onPage = new Set(layout.bubbles.map((b) => b.pointId));
  const reasonOk = sqlite.prepare("SELECT 1 FROM reason WHERE id = ? AND point_id = ?");

  const results = body.results.filter((r) => onPage.has(r.pointId));
  if (!results.length) return Response.json({ error: "No results for this page" }, { status: 400 });

  let imageFile: string | null = null;
  const m = body.image && /^data:image\/jpeg;base64,(.+)$/.exec(body.image);
  if (m) {
    const dir = path.join(process.cwd(), "data", "scans");
    fs.mkdirSync(dir, { recursive: true });
    imageFile = `T${testId}-S${studentId}-P${page}.jpg`;
    fs.writeFileSync(path.join(dir, imageFile), Buffer.from(m[1], "base64"));
  }

  const save = sqlite.transaction(() => {
    const scan = sqlite
      .prepare(
        `INSERT INTO scan (student_id, test_id, page, image_file) VALUES (?,?,?,?)
         ON CONFLICT(student_id, test_id, page) DO UPDATE SET image_file = excluded.image_file, scanned_at = datetime('now')
         RETURNING id`,
      )
      .get(studentId, testId, page, imageFile) as { id: number };
    const upsert = sqlite.prepare(
      `INSERT INTO response (student_id, test_id, point_id, status, reason_id, is_other) VALUES (?,?,?,?,?,?)
       ON CONFLICT(student_id, point_id) DO UPDATE SET status = excluded.status, reason_id = excluded.reason_id,
         is_other = excluded.is_other, scanned_at = datetime('now')`,
    );
    for (const r of results) {
      const validReason = r.status === "missed" && r.reasonId != null && reasonOk.get(r.reasonId, r.pointId) ? r.reasonId : null;
      upsert.run(studentId, testId, r.pointId, r.status, validReason, r.status === "missed" && r.other ? 1 : 0);
    }
    return scan.id;
  });

  return Response.json({ ok: true, scanId: save(), saved: results.length });
}
