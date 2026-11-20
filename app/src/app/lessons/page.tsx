import { getSettings, listItems } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import { SimpleList } from "@/components/SimpleList";

export const dynamic = "force-dynamic";

export default function Lessons() {
  const s = getSettings();
  const items = listItems("lesson").map((l) => ({ uid: l.uid, title: l.title, updatedAt: l.updatedAt, meta: [l.data.course, l.data.unit, l.data.date].filter(Boolean).join(" · ") }));
  return (
    <>
      <PageHeader title="Lesson plans" subtitle="Your template (the boxes on each plan) is set under Settings → Lesson plan template." />
      <SimpleList kind="lesson" base="/lessons" items={items} courses={s.courses} noun="lesson plan" />
    </>
  );
}
