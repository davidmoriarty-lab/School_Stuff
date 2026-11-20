import { notFound } from "next/navigation";
import { getItem, getSettings } from "@/lib/store";
import { getUnitSuggestions } from "@/lib/units";
import { normalizeQuestion, type Question } from "@/lib/questions";
import { QuestionPage } from "../QuestionPage";

export const dynamic = "force-dynamic";

export default async function EditQuestion({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const item = getItem(uid);
  if (!item || item.kind !== "question") notFound();
  const s = getSettings();
  return <QuestionPage uid={uid} initial={normalizeQuestion(item.data as Partial<Question>)} courses={s.courses} units={getUnitSuggestions()} />;
}
