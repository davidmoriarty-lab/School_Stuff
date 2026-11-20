import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { clearSearchCache, resolveSafe } from "@/lib/library";

export const dynamic = "force-dynamic";

const safeName = (n: string) => n.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/^\.+/, "_").slice(0, 200);

/** Upload files, make a folder, or delete something inside "My files". */
export async function POST(req: Request) {
  const f = await req.formData();
  const op = String(f.get("op") ?? "upload");
  const dirRel = String(f.get("path") ?? "");
  const dir = resolveSafe("mine", dirRel);
  if (!dir) return NextResponse.json({ error: "Bad folder" }, { status: 400 });
  fs.mkdirSync(dir, { recursive: true });

  if (op === "upload") {
    let n = 0;
    for (const v of f.getAll("files")) {
      if (typeof v === "string") continue;
      fs.writeFileSync(path.join(dir, safeName(v.name)), Buffer.from(await v.arrayBuffer()));
      n++;
    }
    clearSearchCache();
    return NextResponse.json({ ok: true, count: n });
  }
  if (op === "mkdir") {
    const name = safeName(String(f.get("name") ?? "").trim());
    if (!name) return NextResponse.json({ error: "Name needed" }, { status: 400 });
    fs.mkdirSync(path.join(dir, name), { recursive: true });
    clearSearchCache();
    return NextResponse.json({ ok: true });
  }
  if (op === "delete") {
    const target = resolveSafe("mine", String(f.get("target") ?? ""));
    if (!target || target === path.resolve(dir, ".") && !dirRel) return NextResponse.json({ error: "Bad target" }, { status: 400 });
    fs.rmSync(target, { recursive: true, force: true });
    clearSearchCache();
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown operation" }, { status: 400 });
}
