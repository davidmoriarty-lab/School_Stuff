import fs from "node:fs";
import { makeBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

/** Download a fresh copy of the whole database. */
export async function GET() {
  const file = makeBackup("manual");
  const body = fs.readFileSync(file);
  return new Response(body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="classroom-backup-${new Date().toISOString().slice(0, 10)}.db"`,
    },
  });
}
