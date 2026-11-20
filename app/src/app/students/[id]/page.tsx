import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, Target, Users, ListChecks, LineChart as LineIcon, ScanLine } from "lucide-react";
import { db } from "@/lib/db";
import { student, section } from "@/lib/schema";
import { loadRows, studentAnalytics } from "@/lib/analytics";
import { PageHeader, Card, CardHeader, Stat, EmptyState, Badge, buttonClass } from "@/components/ui";
import { HBars } from "@/components/charts/Bars";
import { StudentTrends } from "@/components/StudentTrends";
import { curveLabel } from "@/lib/curve";

export const dynamic = "force-dynamic";

const pctText = (v: number | null) => (v == null ? "–" : `${Math.round(v)}%`);

export default async function StudentProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ scores?: string }> }) {
  const id = Number((await params).id);
  const mode = (await searchParams).scores === "curved" ? "curved" : "raw";
  const s = db.select().from(student).where(eq(student.id, id)).get();
  if (!s) notFound();
  const sec = db.select().from(section).where(eq(section.id, s.sectionId)).get();
  const a = studentAnalytics(loadRows(), s.id, s.sectionId, mode);
  const diff = a.summary.overall != null && a.summary.classAvg != null ? a.summary.overall - a.summary.classAvg : null;
  const missedTotal = a.reasons.reduce((n, r) => n + r.n, 0);

  return (
    <>
      <PageHeader
        back={<Link href="/students" className="inline-flex items-center gap-1 text-slate-500 hover:text-brand-600"><ArrowLeft className="size-4" /> All students</Link>}
        title={`${s.firstName} ${s.lastName}`}
        subtitle={sec?.name}
        actions={
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-sm font-medium">
            {(["raw", "curved"] as const).map((m) => (
              <Link key={m} href={`/students/${s.id}?scores=${m}`} replace scroll={false} className={"px-3.5 py-1.5 capitalize " + (mode === m ? "bg-brand-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>{m} scores</Link>
            ))}
          </div>
        }
      />

      {a.summary.answered === 0 ? (
        <Card>
          <EmptyState
            icon={LineIcon}
            title="No scanned results yet"
            description="Once this student's scoring sheets are scanned and saved, their trends show up here."
            action={<Link href="/scan" className={buttonClass("primary")}><ScanLine className="size-4" /> Scan sheets</Link>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Overall score" value={pctText(a.summary.overall)} icon={Target} hint={diff == null ? undefined : `${diff >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(diff))} pts ${diff >= 0 ? "above" : "below"} class average`} />
            <Stat label="Class average" value={pctText(a.summary.classAvg)} icon={Users} hint={sec?.name} />
            <Stat label="Tests" value={a.summary.tests} icon={ListChecks} />
            <Stat label="Points scored" value={a.summary.answered} icon={ListChecks} />
          </div>

          <Card>
            <CardHeader title="Test scores" description={mode === "curved" ? "Curved scores are used in the charts below." : "Both raw and curved scores are listed. Charts use raw scores."} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                    <th className="px-5 py-2 font-medium">Test</th><th className="px-3 py-2 text-right font-medium">Points</th><th className="px-3 py-2 text-right font-medium">Raw</th><th className="px-3 py-2 font-medium">Curve</th><th className="px-5 py-2 text-right font-medium">Curved</th>
                  </tr>
                </thead>
                <tbody>
                  {a.testScores.map((t) => (
                    <tr key={t.id} className="border-b border-slate-100 text-slate-700">
                      <td className="px-5 py-2 font-medium">{t.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{t.earned}/{t.total}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{Math.round(t.raw)}%</td>
                      <td className="px-3 py-2 text-slate-500">{curveLabel(t.curve)}</td>
                      <td className="px-5 py-2 text-right font-semibold tabular-nums text-slate-900">{t.curve.type === "none" ? "–" : `${Math.round(t.curved)}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <StudentTrends data={a.data} />

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Topics, weakest first" description="Percent of this student's points answered correctly." />
              <HBars
                empty="No points are tagged with a topic yet."
                rows={a.topicScores.slice(0, 10).map((t) => ({
                  key: t.code,
                  label: <><span className="font-mono text-xs text-slate-500">{t.code}</span> {t.title}</>,
                  sub: `${t.answered} point${t.answered === 1 ? "" : "s"} scored`,
                  value: t.correctPct,
                  valueLabel: `${Math.round(t.correctPct)}%`,
                }))}
              />
            </Card>
            <Card>
              <CardHeader title="Why points were missed" description="The reasons this student chose." />
              <HBars
                empty="No missed points."
                rows={a.reasons.slice(0, 8).map((r) => ({ key: r.reason, label: r.reason, value: missedTotal ? (r.n / missedTotal) * 100 : 0, valueLabel: `${r.n}` }))}
              />
            </Card>
          </div>

          <Card>
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                Every point ({a.questions.length})<Badge>table</Badge>
              </summary>
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                      <th className="px-5 py-2 font-medium">Test</th><th className="px-3 py-2 font-medium">Point</th><th className="px-3 py-2 font-medium">Topic</th>
                      <th className="px-3 py-2 font-medium">Result</th><th className="px-5 py-2 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.questions.map((q, i) => (
                      <tr key={i} className="border-b border-slate-100 text-slate-700">
                        <td className="px-5 py-2">{q.testName}</td><td className="px-3 py-2 font-medium">{q.tag}</td><td className="px-3 py-2">{q.topic ?? "–"}</td>
                        <td className="px-3 py-2">{q.status === "earned" ? <Badge tone="green">Earned</Badge> : <Badge tone="brand">Missed</Badge>}</td>
                        <td className="px-5 py-2">{q.reason ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </Card>
        </div>
      )}
    </>
  );
}
