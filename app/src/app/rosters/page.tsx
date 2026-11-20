import Link from "next/link";
import { Upload, Users, Plus, Download, CheckCircle2, ChevronRight } from "lucide-react";
import { sqlite } from "@/lib/db";
import { importRoster, addSection } from "@/lib/actions";
import { PageHeader, Card, CardHeader, Button, Input, Badge, EmptyState, buttonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Rosters({ searchParams }: { searchParams: Promise<{ added?: string; moved?: string; same?: string }> }) {
  const sp = await searchParams;
  const classes = sqlite
    .prepare("SELECT se.id, se.name, COUNT(st.id) students FROM section se LEFT JOIN student st ON st.section_id = se.id GROUP BY se.id ORDER BY se.name")
    .all() as { id: number; name: string; students: number }[];
  const total = classes.reduce((n, c) => n + c.students, 0);

  return (
    <>
      <PageHeader title="Rosters" subtitle="Choose a class to view and edit its students."
        actions={classes.length > 0 ? <Link href="/profiles/print?sections=all" className={buttonClass("secondary")}>Print all rosters</Link> : undefined} />

      {sp.added !== undefined && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0" />
          Roster imported: {sp.added} added, {sp.moved} moved to a different period, {sp.same} already up to date.
        </div>
      )}

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Your classes <span className="ml-1 font-normal text-slate-500">{classes.length} · {total} students</span></h2>
        </div>
        {classes.length === 0 ? (
          <Card>
            <EmptyState icon={Users} title="No classes yet" description="Import an Excel file or add a class period below." />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => (
              <Link key={c.id} href={`/rosters/${c.id}`} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-500 hover:shadow">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Users className="size-5" /></span>
                  <ChevronRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </div>
                <div className="mt-4 text-base font-semibold text-slate-900">{c.name}</div>
                <div className="mt-1"><Badge tone="brand">{c.students} student{c.students === 1 ? "" : "s"}</Badge></div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader
            title="Import roster"
            description={<>Columns: <b>Last Name</b>, <b>First Name</b>, <b>Class Period</b>. Re-importing is safe: matching names are updated, new names are added, and nobody is removed.</>}
            actions={<a href="/api/templates/roster" className={buttonClass("secondary", "sm")}><Download className="size-3.5" /> Template</a>}
          />
          <form action={importRoster} className="flex flex-wrap items-center gap-3 px-5 py-4">
            <input
              type="file"
              name="file"
              accept=".xlsx,.xls,.csv"
              required
              className="text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50"
            />
            <Button><Upload className="size-4" /> Import</Button>
          </form>
        </Card>
        <Card>
          <CardHeader title="Add a class period" description="For an empty class you will fill by hand." />
          <form action={addSection} className="flex items-center gap-2 px-5 py-4">
            <Input name="name" placeholder="e.g. 3rd Period" required className="max-w-56" />
            <Button variant="secondary"><Plus className="size-4" /> Add period</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
