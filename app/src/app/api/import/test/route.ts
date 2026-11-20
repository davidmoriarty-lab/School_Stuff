import { NextRequest } from "next/server";
import { parseTestWorkbook, commitParsedTest } from "@/lib/importTest";

export const dynamic = "force-dynamic";

/**
 * POST multipart: file (the filled-in workbook) and mode = "preview" | "commit".
 * Preview checks the file and describes what would be created; commit creates the test.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const mode = form.get("mode") === "commit" ? "commit" : "preview";
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Choose an Excel file first." }, { status: 400 });

  const result = parseTestWorkbook(Buffer.from(await file.arrayBuffer()));

  if (mode === "commit") {
    if (result.errors.length || !result.test) return Response.json({ ...result, error: "Fix the errors first." }, { status: 422 });
    return Response.json({ ok: true, testId: commitParsedTest(result.test), warnings: result.warnings });
  }
  return Response.json(result);
}
