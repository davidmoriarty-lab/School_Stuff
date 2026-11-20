import { Route } from "lucide-react";
import { getSettings, listItems } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import { SimpleList } from "@/components/SimpleList";
import { fmtShort } from "@/lib/dates";
import type { Guide } from "@/lib/pacing";

export const dynamic = "force-dynamic";

export default function Pacing() {
  const s = getSettings();
  const items = listItems("pacing").map((g) => {
    const d = g.data as Guide;
    const n = d.units?.length ?? 0;
    return { uid: g.uid, title: g.title, updatedAt: g.updatedAt, meta: `${d.course || "No course"} · ${n} unit${n === 1 ? "" : "s"}${n && d.units[n - 1].end ? ` · ends ${fmtShort(d.units[n - 1].end)}` : ""}` };
  });
  return (
    <>
      <PageHeader title="Pacing guides" subtitle="Plan your units for the year. Enter how many school days each unit needs and the dates fill in." />
      <SimpleList kind="pacing" base="/pacing" items={items} courses={s.courses} noun="pacing guide" icon={Route} />
    </>
  );
}
