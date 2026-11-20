import Link from "next/link";
import { FileText, Users, GraduationCap, ScanLine, ArrowRight, Plus, Upload, Printer } from "lucide-react";
import { sqlite } from "@/lib/db";
import { PageHeader, Card, CardHeader, Stat, EmptyState, buttonClass, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

const count = (sql: string) => (sqlite.prepare(sql).get() as { n: number }).n;

export default function Dashboard() {
  const tests = count("SELECT COUNT(*) n FROM test");
  const sections = count("SELECT COUNT(*) n FROM section");
  const students = count("SELECT COUNT(*) n FROM student");
  const recent = sqlite
    .prepare(
      `SELECT t.id, t.name, c.name course,
              (SELECT COUNT(*) FROM point p JOIN part pa ON pa.id = p.part_id JOIN question q ON q.id = pa.question_id WHERE q.test_id = t.id) points
       FROM test t JOIN course c ON c.id = t.course_id ORDER BY t.id DESC LIMIT 5`,
    )
    .all() as { id: number; name: string; course: string; points: number }[];

  const steps = [
    { done: tests > 0, title: "Build a test template", text: "Add questions, points and common wrong-answer reasons.", href: "/tests", icon: FileText },
    { done: students > 0, title: "Import your rosters", text: "Upload an Excel file with names and class periods.", href: "/rosters", icon: Upload },
    { done: false, title: "Print scoring sheets", text: "Generate a PDF per class period, one page per student.", href: "/tests", icon: Printer },
    { done: false, title: "Scan completed sheets", text: "Use the document camera to capture results.", href: "/scan", icon: ScanLine },
  ];

  return (
    <>
      <PageHeader
        title="Gradebook overview"
        subtitle="Student self-scoring and error tracking for summative tests."
        actions={
          <Link href="/tests" className={buttonClass("primary")}>
            <Plus className="size-4" /> New test
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Tests" value={tests} icon={FileText} hint="Templates in your library" />
        <Stat label="Class periods" value={sections} icon={Users} />
        <Stat label="Students" value={students} icon={GraduationCap} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Getting started" description="The usual order for a new test." />
          <ol className="divide-y divide-slate-100">
            {steps.map((s, i) => (
              <li key={s.title}>
                <Link href={s.href} className="group flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
                  <span
                    className={
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold " +
                      (s.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")
                    }
                  >
                    {s.done ? "✓" : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900">{s.title}</span>
                    <span className="block text-xs text-slate-500">{s.text}</span>
                  </span>
                  <ArrowRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </Link>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Recent tests" actions={<Link href="/tests" className="text-xs font-medium text-brand-600 hover:underline">View all</Link>} />
          {recent.length === 0 ? (
            <EmptyState icon={FileText} title="No tests yet" description="Create your first test template to get started." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((t) => (
                <li key={t.id}>
                  <Link href={`/tests/${t.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">{t.name}</span>
                      <span className="block truncate text-xs text-slate-500">{t.course}</span>
                    </span>
                    <Badge tone="brand">{t.points} pts</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
