import { NextResponse } from "next/server";
import { applyPack, validatePack, type Choice } from "@/lib/share";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const b = (await req.json()) as { pack: unknown; choices: Choice[] };
    return NextResponse.json(applyPack(validatePack(b.pack), b.choices ?? []));
  } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }
}
