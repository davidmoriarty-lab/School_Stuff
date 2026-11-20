import Link from "next/link";
import { FileText, Plus, BookOpen, ChevronRight } from "lucide-react";
import { sqlite } from "@/lib/db";
import { addCourse, addTest } from "@/lib/actions";
import { PageHeader, Card, CardHeader, Button, Input, Badge, EmptyState } from "@/components/ui";
import { ImportTest } from "@/components/ImportTest";

export const dynamic = "force-dynamic";

type Row = { id: number; course_id: number; name: string; kind: string; questions: number; points: number };

export default function TestsPage() {
  const courses = sqlite.prepare("SELECT id, name FROM course ORDER BY name").all() as { id: number; name: string }[];
  const tests = sqlite
    .prepare(
      `SELECT t.id, t.course_id, t.name, t.kind,
              (SELECT COUNT(*) FROM question q WHERE q.test_id = t.id) questions,
              (SELECT COUNT(*) FROM point p JOIN part pa ON pa.id = p.part_id JOIN question q ON q.id = pa.question_id WHERE q.test_id = t.id) points
       FROM test t ORDER BY t.id`,
    )
    .all() as Row[];

  return (
    <>
      <PageHeader
        title="Tests & templates"
        subtitle="Organized by course. Open a test to edit its questions, points and reason options."
      />

      <div className="space-y-5">
        {courses.length === 0 && (
          <Card>
            <EmptyState icon={BookOpen} title="Add your first course" description="Courses group your tests, for example Honors Chemistry or AP Chemistry." />
          </Card>
        )}

        {courses.map((c) => {
          const list = tests.filter((t) => t.course_id === c.id);
          return (
            <Card key={c.id}>
              <CardHeader title={c.name} description={`${list.length} test${list.length === 1 ? "" : "s"}`} />
              {list.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">No tests in this course yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {list.map((t) => (
                    <li key={t.id}>
                      <Link href={`/tests/${t.id}`} className="group flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                          <FileText className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-900">{t.name}</span>
                          <span className="block text-xs text-slate-500">
                            {t.questions} question{t.questions === 1 ? "" : "s"}
                          </span>
                        </span>
                        {t.kind === "midterm" && <Badge tone="amber">Midterm</Badge>}
                        <Badge tone="brand">{t.points} pts</Badge>
                        <ChevronRight className="size-4 text-slate-300 group-hover:text-brand-600" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <form action={addTest} className="flex gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
                <input type="hidden" name="courseId" value={c.id} />
                <Input name="name" placeholder="New test, e.g. Unit 2 Test" required className="max-w-xs" />
                <Button variant="secondary"><Plus className="size-4" /> Add test</Button>
              </form>
            </Card>
          );
        })}

        {courses.length > 0 && <ImportTest courses={courses} />}

        <Card>
          <form action={addCourse} className="flex flex-wrap items-center gap-2 px-5 py-4">
            <span className="mr-2 text-sm font-medium text-slate-700">New course</span>
            <Input name="name" placeholder="e.g. Honors Chemistry" required className="max-w-xs" />
            <Button><Plus className="size-4" /> Add course</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
