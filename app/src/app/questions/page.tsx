import { getSettings, listItems } from "@/lib/store";
import { getUnitSuggestions } from "@/lib/units";
import { normalizeQuestion, type Question } from "@/lib/questions";
import { PageHeader } from "@/components/ui";
import { QuestionBank } from "./QuestionBank";

export const dynamic = "force-dynamic";

export default function Questions() {
  const s = getSettings();
  const items = listItems("question").map((i) => ({ uid: i.uid, q: normalizeQuestion(i.data as Partial<Question>), updatedAt: i.updatedAt }));
  return (
    <>
      <PageHeader title="Question bank" subtitle="Every question you write, of any kind, organized by course and unit. Build tests from it in the Test builder." />
      <QuestionBank items={items} courses={s.courses} units={getUnitSuggestions()} />
    </>
  );
}
