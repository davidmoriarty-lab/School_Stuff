import { notFound } from "next/navigation";
import { getItem, getSettings, listItems } from "@/lib/store";
import { LessonEditor } from "../LessonEditor";
import { getUnitSuggestions } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function Lesson({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const item = getItem(uid);
  if (!item || item.kind !== "lesson") notFound();
  const s = getSettings();
  const worksheets = listItems("worksheet").map((w) => ({ uid: w.uid, title: w.title }));
  return <LessonEditor uid={uid} initialTitle={item.title} initial={item.data} sections={s.lessonSections.filter((x) => x.enabled)} courses={s.courses} worksheets={worksheets} unitSuggestions={getUnitSuggestions()} />;
}
