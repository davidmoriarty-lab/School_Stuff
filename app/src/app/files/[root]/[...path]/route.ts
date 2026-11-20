import fs from "node:fs";
import path from "node:path";
import { MIME, isRoot, resolveSafe } from "@/lib/library";

export const dynamic = "force-dynamic";

/** Serves one file from the Library. Relative links inside class pages (images, scripts) keep working. */
export async function GET(req: Request, ctx: { params: Promise<{ root: string; path: string[] }> }) {
  const { root, path: parts } = await ctx.params;
  if (!isRoot(root)) return new Response("Not found", { status: 404 });
  const rel = parts.join("/");
  const full = resolveSafe(root, rel);
  if (!full) return new Response("Not found", { status: 404 });
  let target = full;
  try {
    if (fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
    const body = fs.readFileSync(target);
    const ext = path.extname(target).slice(1).toLowerCase();
    const headers: Record<string, string> = { "Content-Type": MIME[ext] ?? "application/octet-stream", "X-Content-Type-Options": "nosniff" };
    if (new URL(req.url).searchParams.get("download")) headers["Content-Disposition"] = `attachment; filename="${path.basename(target)}"`;
    // Files that other teachers sent you run in a locked-down sandbox: they cannot reach the rest of the app.
    if (root === "mine") headers["Content-Security-Policy"] = "sandbox allow-scripts allow-modals allow-popups allow-forms allow-downloads";
    return new Response(body, { headers });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
