import { NextResponse } from "next/server";
import { buildPack } from "@/lib/share";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = (await req.json()) as { uids?: string[]; files?: string[]; name?: string };
  const pack = buildPack(b.uids ?? [], b.files ?? [], String(b.name ?? ""));
  const fname = (pack.name.replace(/[^\w\- ]+/g, "").trim() || "package") + ".classpack";
  return new NextResponse(JSON.stringify(pack), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${fname}"` } });
}
