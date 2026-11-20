import { notFound } from "next/navigation";
import { getItem, getSettings, listItems } from "@/lib/store";
import { sqlite } from "@/lib/db";
import { getUnitSuggestions } from "@/lib/units";
import { normalizeExam, normalizeQuestion, type Exam, type Question } from "@/lib/questions";
import { ExamEditor } from "../ExamEditor";

export const dynamic = "force-dynamic";

export default async function EditExam({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const item = getItem(uid);
  if (!item || item.kind !== "exam") notFound();
  const s = getSettings();
  const bank = listItems("question").map((i) => ({ uid: i.uid, q: normalizeQuestion(i.data as Partial<Question>), updatedAt: i.updatedAt }));
  const gradeCourses = sqlite.prepare("SELECT id, name FROM course ORDER BY name").all() as { id: number; name: string }[];
  return <ExamEditor uid={uid} initialTitle={item.title} initial={normalizeExam(item.data as Partial<Exam>)} bank={bank} courses={s.courses} units={getUnitSuggestions()} gradeCourses={gradeCourses} />;
}
