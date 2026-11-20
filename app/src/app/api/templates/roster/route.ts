import { buildRosterTemplate } from "@/lib/importTest";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(new Uint8Array(buildRosterTemplate()), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Roster Template.xlsx"',
    },
  });
}
