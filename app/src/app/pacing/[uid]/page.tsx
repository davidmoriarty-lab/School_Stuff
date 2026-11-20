import { notFound } from "next/navigation";
import { getItem, getSettings, listItems } from "@/lib/store";
import { PacingEditor } from "../PacingEditor";

export const dynamic = "force-dynamic";

export default async function PacingGuide({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const item = getItem(uid);
  if (!item || item.kind !== "pacing") notFound();
  const s = getSettings();
  const noSchool = listItems("event").filter((e) => e.data.type === "noschool").flatMap((e) => {
    const out: string[] = [];
    let d = String(e.data.date);
    const end = String(e.data.endDate || e.data.date);
    for (let i = 0; i < 400 && d <= end; i++) { out.push(d); const x = new Date(d + "T00:00:00"); x.setDate(x.getDate() + 1); d = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; }
    return out;
  });
  return <PacingEditor uid={uid} initialTitle={item.title} initial={item.data} courses={s.courses} noSchool={noSchool} />;
}
