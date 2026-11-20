import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { sqlite } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Serve the straightened image saved for a scan. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const row = sqlite.prepare("SELECT image_file FROM scan WHERE id = ?").get(Number((await ctx.params).id)) as
    | { image_file: string | null }
    | undefined;
  if (!row?.image_file) return new Response("Not found", { status: 404 });
  const file = path.join(process.cwd(), "data", "scans", path.basename(row.image_file));
  if (!fs.existsSync(file)) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(file)), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" } });
}
