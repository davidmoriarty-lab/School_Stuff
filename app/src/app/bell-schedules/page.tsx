import { getSettings, listItems } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import type { Bell } from "@/lib/subplan";
import { BellEditor } from "./BellEditor";

export const dynamic = "force-dynamic";

export default function BellSchedules() {
  const s = getSettings();
  const bells = listItems("bell").map((b) => ({ uid: b.uid, title: b.title, data: { rows: [], note: "", ...(b.data as Partial<Bell>) } as Bell }));
  return (
    <>
      <PageHeader title="Bell schedules" subtitle="Set up each kind of day (regular, early release, assembly). A sub plan picks one and fills in your classes for you." />
      <BellEditor initial={bells} periods={s.periods} courses={s.courses} />
    </>
  );
}
