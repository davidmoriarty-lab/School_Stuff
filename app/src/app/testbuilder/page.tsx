import { getSettings, listItems } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import { normalizeExam, totalPoints, type Exam } from "@/lib/questions";
import { ExamList } from "./ExamList";

export const dynamic = "force-dynamic";

export default function TestBuilder() {
  const s = getSettings();
  const items = listItems("exam").map((e) => {
    const x = normalizeExam(e.data as Partial<Exam>);
    return { uid: e.uid, title: e.title, course: x.course, unit: x.unit, questions: x.items.filter((i) => i.kind === "question").length, points: totalPoints(x), versions: x.options.versions, updatedAt: e.updatedAt };
  });
  return (
    <>
      <PageHeader title="Test builder" subtitle="Build quizzes and tests from your question bank. Make versions A to D with shuffled questions and choices, each with its own answer key." />
      <ExamList items={items} courses={s.courses} />
    </>
  );
}
