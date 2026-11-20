import { getSettings, listItems } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import type { Bell, SubPlan } from "@/lib/subplan";
import { SubPlanList } from "./SubPlanList";

export const dynamic = "force-dynamic";

export default function SubPlans() {
  getSettings();
  const bells = listItems("bell").map((b) => ({ uid: b.uid, title: b.title, data: { rows: [], note: "", ...(b.data as Partial<Bell>) } as Bell }));
  const items = listItems("subplan").map((i) => {
    const d = i.data as Partial<SubPlan>;
    return { uid: i.uid, title: i.title, date: d.date ?? "", bell: bells.find((b) => b.uid === d.bellId)?.title ?? "", updatedAt: i.updatedAt };
  });
  return (
    <>
      <PageHeader title="Sub plans" subtitle="Build the plan for a day you are out: pick the bell schedule, say what each class is doing, add procedures, print. Rosters print separately from Student profiles." />
      <SubPlanList items={items} bells={bells} />
    </>
  );
}
