import Link from "next/link";
import { ClipboardCheck, Printer, FileText, AlertTriangle, CheckCircle2, Settings2 } from "lucide-react";
import { sqlite } from "@/lib/db";
import { listMidterms, midtermData } from "@/lib/midterm";
import { curveLabel } from "@/lib/curve";
import { setMcqScore, setMcqTotal } from "@/lib/actions";
import { PageHeader, Card, CardHeader, Stat, EmptyState, Badge, buttonClass } from "@/components/ui";
import { FilterBar } from "@/components/FilterBar";
import { AutoSaveInput } from "@/components/AutoSave";

export const dynamic = "force-dynamic";

const pctText = (v: number | null) => (v == null ? "–" : `${Math.round(v)}%`);

export default async function MidtermPage({ searchParams }: { searchParams: Promise<{ test?: string; period?: string }> }) {
  const sp = await searchParams;
  const midterms = listMidterms();
  const sections = sqlite.prepare("SELECT id, name FROM section ORDER BY name").all() as { id: number; name: string }[];

  if (!midterms.length) {
    return (
      <>
        <PageHeader title="Midterm scoring" subtitle="Teacher-graded FRQ packet plus in-person multiple choice, combined into one score." />
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title="No midterm yet"
            description="Build the midterm's free-response questions like any test, then set its Test type to Midterm. Its scoring sheet will have Earned / Missed bubbles only."
            action={<Link href="/tests" className={buttonClass("primary")}><FileText className="size-4" /> Go to tests</Link>}
          />
        </Card>
      </>
    );
  }

  const testId = midterms.some((m) => m.id === Number(sp.test)) ? Number(sp.test) : midterms[0].id;
  const sectionId = sections.some((s) => s.id === Number(sp.period)) ? Number(sp.period) : sections[0]?.id ?? null;
  const data = midtermData(testId, { sectionId })!;
  const t = data.test;
  const scanned = data.students.filter((s) => s.frqScored > 0).length;
  const done = data.students.filter((s) => s.complete).length;
  const avg = (key: "raw" | "curved") => {
    const v = data.students.map((s) => s[key]).filter((x): x is number => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };

  return (
    <>
      <PageHeader
        title="Midterm scoring"
        subtitle="Scan the free-response grading sheets, type in the multiple-choice scores, and the app combines them."
        actions={
          sectionId ? (
            <>
              <a href={`/api/tests/${testId}/pdf?sectionId=${sectionId}`} className={buttonClass("secondary")}><Printer className="size-4" /> Grading sheets</a>
              <a href={`/api/midterm/pdf?testId=${testId}&sectionId=${sectionId}`} className={buttonClass("primary")}><Printer className="size-4" /> Student summaries</a>
            </>
          ) : undefined
        }
      />

      <FilterBar
        filters={[
          { name: "test", label: "Midterm", value: String(testId), options: midterms.map((m) => ({ value: String(m.id), label: `${m.name} (${m.course})` })) },
          { name: "period", label: "Class period", value: sectionId ? String(sectionId) : "", options: sections.map((s) => ({ value: String(s.id), label: s.name })) },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="FRQ points" value={t.frqTotal} icon={ClipboardCheck} hint="From the questions you built" />
        <Stat label="MCQ points" value={t.mcqTotal} icon={ClipboardCheck} hint="Set below" />
        <Stat label="Scored" value={`${done}/${data.students.length}`} icon={CheckCircle2} hint={`${scanned} FRQ sheets scanned`} />
        <Stat label="Class average" value={pctText(avg(t.curve.type === "none" ? "raw" : "curved"))} icon={ClipboardCheck} hint={t.curve.type === "none" ? "No curve" : `${curveLabel(t.curve)} applied`} />
      </div>

      <div className="mb-6 grid gap-5 md:grid-cols-3">
        {[
          { n: 1, title: "Print and grade", text: "Print the grading sheets, grade each packet yourself, and fill in Earned or Missed for each point." },
          { n: 2, title: "Scan", text: "Scan each sheet on the Scan page. It reads the bubbles; there is nothing to type for the FRQ." },
          { n: 3, title: "Type MCQ scores", text: "Enter each student's multiple-choice score in the table below." },
        ].map((s) => (
          <Card key={s.n} className="flex gap-3 p-4">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">{s.n}</span>
            <span><span className="block text-sm font-medium text-slate-900">{s.title}</span><span className="block text-xs text-slate-500">{s.text}</span></span>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Scores" description="FRQ comes from the scanned grading sheet. Type each student's MCQ score; it saves when you click away." />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3 text-sm text-slate-700">
          <span className="inline-flex items-center gap-2">
            Multiple choice is out of
            <AutoSaveInput action={setMcqTotal} fields={{ testId }} name="mcqTotal" type="number" min={0} max={500} defaultValue={String(t.mcqTotal)} aria-label="MCQ points" className="w-20 py-1" />
            points
          </span>
          <Link href={`/tests/${testId}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline"><Settings2 className="size-3.5" /> Questions, curve ({curveLabel(t.curve)})</Link>
        </div>
        {data.students.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="No students in this period" description="Pick another class period, or add students on the Rosters page." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                  <th className="px-5 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">FRQ</th>
                  <th className="px-3 py-2 font-medium">MCQ (out of {t.mcqTotal})</th>
                  <th className="px-3 py-2 text-right font-medium">Combined</th>
                  <th className="px-3 py-2 text-right font-medium">Raw</th>
                  {t.curve.type !== "none" && <th className="px-3 py-2 text-right font-medium">Curved</th>}
                  <th className="px-5 py-2 text-right font-medium">Summary</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => (
                  <tr key={s.studentId} className="border-b border-slate-100 text-slate-700">
                    <td className="px-5 py-2 font-medium text-slate-900">{s.name}</td>
                    <td className="px-3 py-2">
                      {s.frqScored === 0 ? (
                        <Badge tone="amber">Not scanned</Badge>
                      ) : (
                        <span className="tabular-nums">
                          {s.frqEarned}/{t.frqTotal}
                          {!s.frqComplete && <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="size-3" /> {s.frqScored} of {t.frqTotal} scored</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <AutoSaveInput
                        action={setMcqScore}
                        fields={{ testId, studentId: s.studentId }}
                        name="score"
                        type="number"
                        min={0}
                        max={t.mcqTotal || undefined}
                        step="0.5"
                        defaultValue={s.mcq == null ? "" : String(s.mcq)}
                        aria-label={`MCQ score for ${s.name}`}
                        className="w-24 py-1.5"
                      />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.raw == null ? "–" : `${s.combined}/${t.total}`}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{pctText(s.raw)}</td>
                    {t.curve.type !== "none" && <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{pctText(s.curved)}</td>}
                    <td className="px-5 py-2 text-right">
                      <a href={`/api/midterm/pdf?testId=${testId}&studentId=${s.studentId}`} className="text-xs font-medium text-brand-600 hover:underline">PDF</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
