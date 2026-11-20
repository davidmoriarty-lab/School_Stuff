import { notFound } from "next/navigation";
import { getItem, getSettings, listItems } from "@/lib/store";
import { defaultBlocks, type Bell, type SubPlan } from "@/lib/subplan";
import { SubPlanEditor } from "../SubPlanEditor";

export const dynamic = "force-dynamic";

export default async function SubPlanPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const item = getItem(uid);
  if (!item || item.kind !== "subplan") notFound();
  const s = getSettings();
  const d = item.data as Partial<SubPlan>;
  const initial: SubPlan = { date: d.date ?? "", bellId: d.bellId ?? "", blocks: d.blocks?.length ? d.blocks : defaultBlocks() };
  const bells = listItems("bell").map((b) => ({ uid: b.uid, title: b.title, data: { rows: [], note: "", ...(b.data as Partial<Bell>) } as Bell }));
  const worksheets = listItems("worksheet").map((w) => ({ uid: w.uid, title: w.title }));
  return <SubPlanEditor uid={uid} initialTitle={item.title} initial={initial} bells={bells} worksheets={worksheets} courses={s.courses} teacher={s.teacherName} />;
}
