import Link from "next/link";
import { FileCheck2, CalendarCheck, Printer, ClipboardCheck, ScanLine } from "lucide-react";
import { sqlite } from "@/lib/db";
import { correctionsFor } from "@/lib/corrections";
import { yearSummaries } from "@/lib/yearSummary";
import { PageHeader, Card, CardHeader, EmptyState, Badge, buttonClass } from "@/components/ui";
import { FilterBar } from "@/components/FilterBar";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ test?: string; period?: string; ycourse?: string; yperiod?: string }> }) {
  const sp = await searchParams;
  const tests = sqlite
    .prepare("SELECT DISTINCT t.id, t.name, t.kind FROM test t JOIN response r ON r.test_id = t.id WHERE t.kind = 'standard' ORDER BY t.id DESC")
    .all() as { id: number; name: string; kind: string }[];
  const sections = sqlite.prepare("SELECT id, name FROM section ORDER BY name").all() as { id: number; name: string }[];

  const testId = tests.some((t) => t.id === Number(sp.test)) ? Number(sp.test) : tests[0]?.id ?? null;
  const sectionId = sections.some((s) => s.id === Number(sp.period)) ? Number(sp.period) : sections[0]?.id ?? null;
  const list = testId && sectionId ? correctionsFor(testId, { sectionId }) : [];
  const needing = list.filter((s) => s.missedCount > 0);

  // End-of-year summaries: one course at a time, one class period at a time.
  const yCourses = sqlite
    .prepare("SELECT DISTINCT c.id, c.name FROM course c JOIN test t ON t.course_id = c.id JOIN response r ON r.test_id = t.id ORDER BY c.name")
    .all() as { id: number; name: string }[];
  const yCourseId = yCourses.some((c) => c.id === Number(sp.ycourse)) ? Number(sp.ycourse) : yCourses[0]?.id ?? null;
  const ySectionId = sections.some((x) => x.id === Number(sp.yperiod)) ? Number(sp.yperiod) : sections[0]?.id ?? null;
  const year = yCourseId && ySectionId ? yearSummaries(yCourseId, { sectionId: ySectionId }) : [];

  return (
    <>
      <PageHeader title="Reports & PDFs" subtitle="Everything you can print or share with students." />

      <Card className="mb-6">
        <CardHeader
          title="Test correction sheets"
          description="Each student gets only the questions they missed, the reason they gave, and space to redo them."
          actions={<span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><FileCheck2 className="size-5" /></span>}
        />
        {tests.length === 0 ? (
          <EmptyState
            icon={ScanLine}
            title="No scanned tests yet"
            description="Correction sheets are built from scanned scoring sheets. Scan some sheets first."
            action={<Link href="/scan" className={buttonClass("primary")}><ScanLine className="size-4" /> Scan sheets</Link>}
          />
        ) : (
          <div className="px-5 py-4">
            <div className="-mx-1 -mt-2">
              <FilterBar
                filters={[
                  { name: "test", label: "Test", value: String(testId), options: tests.map((t) => ({ value: String(t.id), label: t.name })) },
                  { name: "period", label: "Class period", value: sectionId ? String(sectionId) : "", options: sections.map((s) => ({ value: String(s.id), label: s.name })) },
                ]}
              />
            </div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                <b>{needing.length}</b> of {list.length} scanned student{list.length === 1 ? "" : "s"} missed at least one point.
              </p>
              {needing.length > 0 && (
                <a href={`/api/corrections/pdf?testId=${testId}&sectionId=${sectionId}`} className={buttonClass("primary")}>
                  <Printer className="size-4" /> Print all {needing.length} sheets
                </a>
              )}
            </div>
            {list.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No scanned results for this test in this class period yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                      <th className="px-4 py-2 font-medium">Student</th><th className="px-3 py-2 font-medium">Missed points</th><th className="px-3 py-2 font-medium">Questions to correct</th><th className="px-4 py-2 text-right font-medium">Sheet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((s) => (
                      <tr key={s.studentId} className="border-b border-slate-100 text-slate-700">
                        <td className="px-4 py-2 font-medium text-slate-900">{s.name}</td>
                        <td className="px-3 py-2 tabular-nums">{s.missedCount === 0 ? <Badge tone="green">None</Badge> : s.missedCount}</td>
                        <td className="px-3 py-2 text-slate-500">{s.questions.map((q) => q.number).join(", ") || "–"}</td>
                        <td className="px-4 py-2 text-right">
                          {s.missedCount > 0 ? <a href={`/api/corrections/pdf?testId=${testId}&studentId=${s.studentId}`} className="text-xs font-medium text-brand-600 hover:underline">PDF</a> : <span className="text-xs text-slate-300">–</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <CardHeader
          title="End-of-year summaries"
          description="One PDF per student: overall score, each test, how they did in every unit versus their class, the topics to focus on, strengths and their most common mistakes."
          actions={<span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><CalendarCheck className="size-5" /></span>}
        />
        {yCourses.length === 0 ? (
          <EmptyState icon={ScanLine} title="No scanned results yet" description="Summaries are built from everything you have scanned during the year." action={<Link href="/scan" className={buttonClass("primary")}><ScanLine className="size-4" /> Scan sheets</Link>} />
        ) : (
          <div className="px-5 py-4">
            <div className="-mx-1 -mt-2">
              <FilterBar
                filters={[
                  { name: "ycourse", label: "Course", value: String(yCourseId), options: yCourses.map((c) => ({ value: String(c.id), label: c.name })) },
                  { name: "yperiod", label: "Class period", value: ySectionId ? String(ySectionId) : "", options: sections.map((x) => ({ value: String(x.id), label: x.name })) },
                ]}
              />
            </div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600"><b>{year.length}</b> student{year.length === 1 ? "" : "s"} with scanned results in this class period.</p>
              {year.length > 0 && (
                <a href={`/api/year/pdf?courseId=${yCourseId}&sectionId=${ySectionId}`} className={buttonClass("primary")}>
                  <Printer className="size-4" /> Print all {year.length} summaries
                </a>
              )}
            </div>
            {year.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No scanned results for this course in this class period yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                      <th className="px-4 py-2 font-medium">Student</th><th className="px-3 py-2 text-right font-medium">Tests</th><th className="px-3 py-2 text-right font-medium">Overall</th><th className="px-3 py-2 font-medium">Weakest topics</th><th className="px-4 py-2 text-right font-medium">Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {year.map((y) => (
                      <tr key={y.studentId} className="border-b border-slate-100 text-slate-700">
                        <td className="px-4 py-2 font-medium text-slate-900">{y.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{y.tests.length}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{Math.round(y.overall.raw)}%</td>
                        <td className="px-3 py-2 text-slate-500">{y.weak.slice(0, 3).map((t) => t.code).join(", ") || "–"}</td>
                        <td className="px-4 py-2 text-right"><a href={`/api/year/pdf?courseId=${yCourseId}&studentId=${y.studentId}`} className="text-xs font-medium text-brand-600 hover:underline">PDF</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        {[
          { icon: Printer, title: "Scoring sheets", text: "Individualized sheets with name and QR code for a class period.", note: "Open any test and use Scoring sheets.", href: "/tests", cta: "Go to tests" },
          { icon: ClipboardCheck, title: "Midterm summaries", text: "FRQ, MCQ and combined score for each student, one page each.", note: "Built from the Midterm tab.", href: "/midterm", cta: "Open midterm" },
        ].map(({ icon: Icon, title, text, note, href, cta }) => (
          <Card key={title} className="flex flex-col p-5">
            <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Icon className="size-5" /></div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 flex-1 text-sm text-slate-500">{text}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">{note}</span>
              <Link href={href} className={buttonClass("secondary", "sm")}>{cta}</Link>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
