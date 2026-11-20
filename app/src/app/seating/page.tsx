import { listItems } from "@/lib/store";
import { getSections } from "@/lib/roster";
import { PageHeader } from "@/components/ui";
import type { Chart } from "@/lib/seating";
import { SeatingList } from "./SeatingList";

export const dynamic = "force-dynamic";

export default function Seating() {
  const sections = getSections();
  const items = listItems("seating").map((i) => {
    const c = i.data as Chart;
    return { uid: i.uid, title: i.title, section: sections.find((s) => s.id === c.sectionId)?.name ?? "", seated: c.objs?.reduce((n, o) => n + o.students.filter((x) => x != null).length, 0) ?? 0, updatedAt: i.updatedAt };
  });
  return (
    <>
      <PageHeader title="Seating charts" subtitle="Design a room, drag desks into place, seat your students and print it." />
      <SeatingList items={items} sections={sections} />
    </>
  );
}
