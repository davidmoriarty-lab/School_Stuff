import Link from "next/link";
import { BarChart3, Users, Target, ListChecks, ScanLine } from "lucide-react";
import { sqlite } from "@/lib/db";
import { loadRows, classAnalytics, unitScores, orderTests, rawPct, type Row } from "@/lib/analytics";
import { applyCurve, curveLabel } from "@/lib/curve";
import { SERIES } from "@/lib/chartColors";
import { PageHeader, Card, CardHeader, Stat, EmptyState, Badge, buttonClass } from "@/components/ui";
import { FilterBar } from "@/components/FilterBar";
import { HBars, GroupedBars } from "@/components/charts/Bars";
import { LineChart } from "@/components/charts/LineChart";

export const dynamic = "force-dynamic";

type SP = { course?: string; period?: string; test?: string; compare?: string; scores?: string };
const pctText = (v: number | null) => (v == null ? "–" : `${Math.round(v)}%`);

export default async function ClassesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const all = loadRows();
  const courses = sqlite.prepare("SELECT id, name FROM course ORDER BY name").all() as { id: number; name: string }[];
  const sections = sqlite.prepare("SELECT id, name FROM section ORDER BY name").all() as { id: number; name: string }[];

  // Default to the course with the most scanned results.
  const counts = new Map<number, number>();
  for (const r of all) counts.set(r.courseId, (counts.get(r.courseId) ?? 0) + 1);
  const defaultCourse = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? courses[0]?.id ?? null;
  const courseId = courses.some((c) => c.id === Number(sp.course)) ? Number(sp.course) : defaultCourse;
  const sectionId = sections.some((s) => s.id === Number(sp.period)) ? Number(sp.period) : null;
  const compareId = sections.some((s) => s.id === Number(sp.compare)) && Number(sp.compare) !== sectionId ? Number(sp.compare) : null;

  const courseRows = all.filter((r) => r.courseId === courseId);
  const tests = orderTests(courseRows);
  const testId = tests.some((t) => t.id === Number(sp.test)) ? Number(sp.test) : null;

  const mode = sp.scores === "curved" ? "curved" : "raw";
  const d = classAnalytics(all, { courseId, sectionId, testId }, mode);
  const periodName = sections.find((s) => s.id === sectionId)?.name ?? "All periods";
  const testName = tests.find((t) => t.id === testId)?.name ?? "All tests";

  const filterBar = (
    <FilterBar
      filters={[
        { name: "course", label: "Course", value: String(courseId ?? ""), options: courses.map((c) => ({ value: String(c.id), label: c.name })) },
        { name: "period", label: "Class period", value: sectionId ? String(sectionId) : "", options: [{ value: "", label: "All periods" }, ...sections.map((s) => ({ value: String(s.id), label: s.name }))] },
        { name: "test", label: "Test", value: testId ? String(testId) : "", options: [{ value: "", label: "All tests (whole year)" }, ...tests.map((t) => ({ value: String(t.id), label: t.name }))] },
        { name: "compare", label: "Compare with", value: compareId ? String(compareId) : "", options: [{ value: "", label: "No comparison" }, ...sections.filter((s) => s.id !== sectionId).map((s) => ({ value: String(s.id), label: s.name }))] },
        { name: "scores", label: "Scores", value: mode, options: [{ value: "raw", label: "Raw scores" }, { value: "curved", label: "Curved scores" }] },
      ]}
    />
  );

  if (!all.length) {
    return (
      <>
        <PageHeader title="Classes" subtitle="Class-level patterns across tests and the whole year." />
        <Card>
          <EmptyState
            icon={BarChart3}
            title="No scanned results yet"
            description="Once you scan and save scoring sheets, the most-missed questions, weakest topics and common reasons show up here."
            action={<Link href="/scan" className={buttonClass("primary")}><ScanLine className="size-4" /> Scan sheets</Link>}
          />
        </Card>
      </>
    );
  }

  const names = new Map((sqlite.prepare("SELECT id, first_name, last_name FROM student").all() as { id: number; first_name: string; last_name: string }[]).map((s) => [s.id, `${s.last_name}, ${s.first_name}`]));
  const gradebook = (() => {
    if (!testId) return [];
    const by = new Map<number, Row[]>();
    for (const r of d.rows) (by.get(r.studentId) ?? by.set(r.studentId, []).get(r.studentId)!).push(r);
    return [...by].map(([id, rs]) => {
      const raw = rawPct(rs);
      return { id, name: names.get(id) ?? "?", earned: rs.filter((r) => r.status === "earned").length, answered: rs.length, total: rs[0].testTotal, raw, curve: rs[0].curve, curved: applyCurve(raw, rs[0].curve) };
    }).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const top = d.points.slice(0, 10);
  const maxReason = d.reasons.reduce((s, r) => s + r.n, 0);

  // Compare periods (needs a specific period A)
  const A = sectionId ? unitScores(all, sectionId, { courseId, testId }, mode) : null;
  const B = compareId ? unitScores(all, compareId, { courseId, testId }, mode) : null;
  const aName = sectionId ? periodName : "";
  const bName = sections.find((s) => s.id === compareId)?.name ?? "";
  const unitKeys = A && B ? [...new Map([...A.units, ...B.units].map((u) => [u.key, u])).values()].sort((x, y) => (x.num ?? 99) - (y.num ?? 99)) : [];

  return (
    <>
      <PageHeader
        title="Classes"
        subtitle={<>{periodName} · {testName}{testId ? "" : " (whole year)"} · <b>{mode === "curved" ? "Curved scores" : "Raw scores"}</b></>}
      />
      {filterBar}

      {d.rows.length === 0 ? (
        <Card><EmptyState icon={BarChart3} title="No results for these filters" description="Try a different period or test." /></Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Average score" value={pctText(d.kpis.avg)} icon={Target} hint={`${d.kpis.answered} points scored`} />
            <Stat label="Students" value={d.kpis.students} icon={Users} hint={`${d.kpis.tests} test${d.kpis.tests === 1 ? "" : "s"}`} />
            <Stat label="Most-missed point" value={d.points[0] ? `${Math.round(d.points[0].missedPct)}% missed` : "–"} icon={ListChecks} hint={d.points[0] ? `${d.points[0].tag} · ${d.points[0].testName}` : undefined} />
            <Stat
              label="Weakest topic"
              value={<span className="text-xl">{d.kpis.weakest ? d.kpis.weakest.code : "–"}</span>}
              icon={BarChart3}
              hint={d.kpis.weakest ? `${d.kpis.weakest.title} · ${Math.round(d.kpis.weakest.correctPct)}% correct` : "Tag points with topics to see this"}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader
                title={testId ? "Most-missed points on this test" : "Most-missed points across all tests"}
                description="Share of students who missed the point, with the most common reason students gave."
              />
              <HBars
                rows={top.map((p) => ({
                  key: String(p.pointId),
                  label: <>{p.tag}{p.description ? <span className="font-normal text-slate-500"> · {p.description}</span> : null}</>,
                  sub: <>{testId ? "" : `${p.testName} · `}{p.topReason ? `Top reason: ${p.topReason} (${p.topReasonN})` : "No reasons recorded"}</>,
                  value: p.missedPct,
                  valueLabel: `${Math.round(p.missedPct)}%`,
                  title: `${p.missed} of ${p.answered} students missed this point${p.topic ? ` · ${p.topic}` : ""}`,
                }))}
              />
            </Card>

            <Card>
              <CardHeader title="Weakest topics" description="Percent of points answered correctly, lowest first." />
              <HBars
                empty="No points are tagged with a topic yet."
                rows={d.topics.slice(0, 10).map((t) => ({
                  key: t.key,
                  label: <><span className="font-mono text-xs text-slate-500">{t.code}</span> {t.title}</>,
                  sub: t.unitNum != null ? `Unit ${t.unitNum} · ${t.answered} points scored` : `${t.answered} points scored`,
                  value: t.correctPct,
                  valueLabel: `${Math.round(t.correctPct)}%`,
                }))}
              />
            </Card>

            <Card>
              <CardHeader title="Why points get missed" description="Reasons students chose, across everything shown." />
              <HBars
                empty="No missed points yet."
                rows={d.reasons.slice(0, 8).map((r) => ({
                  key: r.reason,
                  label: r.reason,
                  value: maxReason ? (r.n / maxReason) * 100 : 0,
                  valueLabel: `${r.n}`,
                  title: `${r.n} of ${maxReason} missed points (${Math.round((r.n / maxReason) * 100)}%)`,
                }))}
              />
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader title="Class average by test" description={`${periodName}. Percent of points earned.`} />
              <div className="px-5 pb-4 pt-3">
                <LineChart
                  title="Class average by test"
                  xLabels={d.trend.map((t) => t.name)}
                  series={[{ id: "avg", label: periodName, color: SERIES[0], values: d.trend.map((t) => t.correctPct), counts: d.trend.map((t) => t.students) }]}
                  empty="Scan more than one test to see a trend."
                />
              </div>
            </Card>
          </div>

          {sectionId && compareId && A && B ? (
            <Card>
              <CardHeader title={`${aName} vs ${bName}`} description={`Percent correct by unit · ${testName}. Overall: ${pctText(A.overall)} vs ${pctText(B.overall)}.`} />
              <GroupedBars
                aLabel={aName}
                bLabel={bName}
                rows={[
                  { key: "overall", label: "Overall", a: A.overall, b: B.overall, nA: A.answered, nB: B.answered },
                  ...unitKeys.map((u) => {
                    const a = A.units.find((x) => x.key === u.key), b = B.units.find((x) => x.key === u.key);
                    return { key: u.key, label: u.num != null ? `Unit ${u.num}: ${u.title}` : u.title, a: a?.correctPct ?? null, b: b?.correctPct ?? null, nA: a?.answered ?? 0, nB: b?.answered ?? 0 };
                  }),
                ]}
              />
            </Card>
          ) : (
            <Card className="px-5 py-4 text-sm text-slate-500">
              To compare two class periods side by side, choose a specific <b>Class period</b> and a <b>Compare with</b> period above.
            </Card>
          )}

          {gradebook.length > 0 && (
            <Card>
              <CardHeader
                title={`Scores on ${testName}`}
                description={gradebook[0].curve.type === "none" ? "No curve is set on this test." : `${curveLabel(gradebook[0].curve)} applied. Both raw and curved scores are shown.`}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                      <th className="px-5 py-2 font-medium">Student</th>
                      <th className="px-3 py-2 text-right font-medium">Points</th>
                      <th className="px-3 py-2 text-right font-medium">Raw</th>
                      {gradebook[0].curve.type !== "none" && <th className="px-5 py-2 text-right font-medium">Curved</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {gradebook.map((g) => (
                      <tr key={g.id} className="border-b border-slate-100 text-slate-700">
                        <td className="px-5 py-2 font-medium">
                          <Link href={`/students/${g.id}`} className="hover:text-brand-600 hover:underline">{g.name}</Link>
                          {g.answered < g.total && <span className="ml-2 text-xs font-normal text-amber-700">{g.answered} of {g.total} scored</span>}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{g.earned}/{g.total}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{Math.round(g.raw)}%</td>
                        {g.curve.type !== "none" && <td className="px-5 py-2 text-right font-semibold tabular-nums text-slate-900">{Math.round(g.curved)}%</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Card>
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                All points ({d.points.length})
                <Badge>table</Badge>
              </summary>
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                      <th className="px-5 py-2 font-medium">Point</th><th className="px-3 py-2 font-medium">Test</th><th className="px-3 py-2 font-medium">Topic</th>
                      <th className="px-3 py-2 text-right font-medium">Scored</th><th className="px-3 py-2 text-right font-medium">Missed</th><th className="px-5 py-2 font-medium">Top reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.points.map((p) => (
                      <tr key={p.pointId} className="border-b border-slate-100 text-slate-700">
                        <td className="px-5 py-2 font-medium">{p.tag}</td><td className="px-3 py-2">{p.testName}</td><td className="px-3 py-2">{p.topic ?? "–"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{p.answered}</td><td className="px-3 py-2 text-right tabular-nums">{Math.round(p.missedPct)}%</td><td className="px-5 py-2">{p.topReason ?? "–"}</td>
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
