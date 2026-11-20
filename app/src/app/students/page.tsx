import Link from "next/link";
import { GraduationCap, ChevronRight } from "lucide-react";
import { sqlite } from "@/lib/db";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

type Row = { id: number; first_name: string; last_name: string; period: string; answered: number; earned: number; tests: number };

export default function StudentsPage() {
  const rows = sqlite
    .prepare(
      `SELECT s.id, s.first_name, s.last_name, se.name period,
              COUNT(r.id) answered, COALESCE(SUM(r.status = 'earned'), 0) earned, COUNT(DISTINCT r.test_id) tests
       FROM student s JOIN section se ON se.id = s.section_id
       LEFT JOIN response r ON r.student_id = s.id AND r.status IN ('earned','missed')
       GROUP BY s.id ORDER BY se.name, s.last_name, s.first_name`,
    )
    .all() as Row[];
  const periods = [...new Set(rows.map((r) => r.period))];

  return (
    <>
      <PageHeader title="Students" subtitle="Open a student to see score trends by unit and topic." />
      {rows.length === 0 ? (
        <Card><EmptyState icon={GraduationCap} title="No students" description="Import a roster to see students here." action={<Link href="/rosters" className="text-sm font-medium text-brand-600 hover:underline">Go to rosters</Link>} /></Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {periods.map((p) => (
            <Card key={p}>
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <h2 className="text-sm font-semibold text-slate-900">{p}</h2>
                <Badge tone="brand">{rows.filter((r) => r.period === p).length} students</Badge>
              </div>
              <ul className="divide-y divide-slate-100">
                {rows.filter((r) => r.period === p).map((r) => (
                  <li key={r.id}>
                    <Link href={`/students/${r.id}`} className="group flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{r.last_name}, {r.first_name}</span>
                      {r.answered > 0 ? (
                        <>
                          <span className="text-xs text-slate-400">{r.tests} test{r.tests === 1 ? "" : "s"}</span>
                          <span className="w-12 text-right text-sm tabular-nums text-slate-900">{Math.round((r.earned / r.answered) * 100)}%</span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">not scanned yet</span>
                      )}
                      <ChevronRight className="size-4 text-slate-300 group-hover:text-brand-600" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
