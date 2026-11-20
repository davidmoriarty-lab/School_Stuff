import { NextResponse } from "next/server";
import { previewPack, validatePack } from "@/lib/share";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try { return NextResponse.json(previewPack(validatePack(await req.json()))); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }
}
