import Link from "next/link";
import { CalendarDays, ListChecks, BookOpen, Route, FolderOpen, PencilRuler, LayoutGrid, Pin, Clock } from "lucide-react";
import { getSettings, listItems } from "@/lib/store";
import { addDays, fmtLong, fmtShort, todayStr } from "@/lib/dates";
import { PageHeader, Card, CardHeader, Badge, buttonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

type Ev = { date: string; endDate?: string; time?: string; type: string };
type Todo = { done: boolean; due?: string; list: string; priority: number };
type Lesson = { date?: string; course?: string };
type Pacing = { course?: string; units: { title: string; start: string; end: string }[] };

export default function Today() {
  const s = getSettings();
  const today = todayStr();
  const week = addDays(today, 7);
  const color = (t: string) => s.eventTypes.find((e) => e.id === t)?.color ?? "#2563eb";

  const events = listItems("event").filter((e) => {
    const d = e.data as Ev;
    return d.date <= week && (d.endDate ?? d.date) >= today;
  }).sort((a, b) => (a.data as Ev).date.localeCompare((b.data as Ev).date) || ((a.data as Ev).time ?? "").localeCompare((b.data as Ev).time ?? ""));
  const todayEvents = events.filter((e) => (e.data as Ev).date <= today);
  const upcoming = events.filter((e) => (e.data as Ev).date > today);

  const todos = listItems("todo").filter((t) => !(t.data as Todo).done).sort((a, b) => {
    const da = (a.data as Todo).due ?? "9999", db = (b.data as Todo).due ?? "9999";
    return da.localeCompare(db) || (b.data as Todo).priority - (a.data as Todo).priority;
  }).slice(0, 8);
  const lessons = listItems("lesson").filter((l) => (l.data as Lesson).date === today);
  const recent = [...listItems("worksheet"), ...listItems("lesson")].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  const currentUnits = listItems("pacing").flatMap((p) => {
    const d = p.data as Pacing;
    const u = d.units?.find((x) => x.start <= today && today <= x.end);
    return u ? [{ guide: p.title, course: d.course, unit: u }] : [];
  });

  return (
    <>
      <PageHeader
        title={s.teacherName ? `Hello, ${s.teacherName}` : "Today"}
        subtitle={fmtLong(today) + (s.schoolYear ? ` · ${s.schoolYear}` : "")}
        actions={<>
          {s.modules.todo && <Link href="/todos" className={buttonClass("secondary")}><ListChecks className="size-4" /> To-dos</Link>}
          {s.modules.calendar && <Link href="/calendar" className={buttonClass("primary")}><CalendarDays className="size-4" /> Calendar</Link>}
        </>}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {s.dashboard.today && (
          <Card>
            <CardHeader title="Today" description="Events and lessons scheduled for today" />
            <ul className="divide-y divide-slate-100">
              {todayEvents.map((e) => (
                <li key={e.uid} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="size-2.5 rounded-full" style={{ background: color((e.data as Ev).type) }} />
                  <span className="font-medium text-slate-900">{e.title}</span>
                  {(e.data as Ev).time && <span className="text-slate-500">{(e.data as Ev).time}</span>}
                </li>
              ))}
              {lessons.map((l) => (
                <li key={l.uid} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <BookOpen className="size-4 text-brand-600" />
                  <Link href={`/lessons/${l.uid}`} className="font-medium text-slate-900 hover:text-brand-600">{l.title || "Untitled lesson"}</Link>
                  <Badge tone="brand">lesson</Badge>
                </li>
              ))}
              {!todayEvents.length && !lessons.length && <li className="px-5 py-6 text-sm text-slate-500">Nothing scheduled today.</li>}
            </ul>
          </Card>
        )}
        {s.dashboard.todos && s.modules.todo && (
          <Card>
            <CardHeader title="To-do" description="Next up, soonest due first" actions={<Link href="/todos" className="text-xs text-brand-600">All →</Link>} />
            <ul className="divide-y divide-slate-100">
              {todos.map((t) => {
                const d = t.data as Todo;
                const late = d.due && d.due < today;
                return (
                  <li key={t.uid} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <span className="flex-1 text-slate-800">{t.title}</span>
                    {d.due && <span className={late ? "font-medium text-red-600" : "text-slate-500"}>{late ? "overdue · " : ""}{fmtShort(d.due)}</span>}
                  </li>
                );
              })}
              {!todos.length && <li className="px-5 py-6 text-sm text-slate-500">All caught up.</li>}
            </ul>
          </Card>
        )}
        {s.dashboard.upcoming && (
          <Card>
            <CardHeader title="Next 7 days" />
            <ul className="divide-y divide-slate-100">
              {upcoming.map((e) => (
                <li key={e.uid} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <span className="size-2.5 rounded-full" style={{ background: color((e.data as Ev).type) }} />
                  <span className="flex-1 text-slate-800">{e.title}</span>
                  <span className="text-slate-500">{fmtShort((e.data as Ev).date)}</span>
                </li>
              ))}
              {!upcoming.length && <li className="px-5 py-6 text-sm text-slate-500">Nothing coming up this week.</li>}
            </ul>
          </Card>
        )}
        {s.dashboard.pacing && s.modules.pacing && (
          <Card>
            <CardHeader title="Where we are in the pacing guide" actions={<Link href="/pacing" className="text-xs text-brand-600">Guides →</Link>} />
            <ul className="divide-y divide-slate-100">
              {currentUnits.map((c, i) => (
                <li key={i} className="px-5 py-3 text-sm">
                  <div className="font-medium text-slate-900">{c.unit.title}</div>
                  <div className="text-xs text-slate-500">{c.course || c.guide} · {fmtShort(c.unit.start)} to {fmtShort(c.unit.end)}</div>
                </li>
              ))}
              {!currentUnits.length && <li className="px-5 py-6 text-sm text-slate-500">No unit is scheduled for today.</li>}
            </ul>
          </Card>
        )}
        {s.dashboard.pinned && s.modules.library && (
          <Card>
            <CardHeader title="Pinned files" description="Pin files from the Library for one-click access" />
            <ul className="divide-y divide-slate-100">
              {s.pins.map((p) => (
                <li key={p.root + p.path} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <Pin className="size-3.5 text-slate-400" />
                  <a href={`/files/${p.root}/${p.path.split("/").map(encodeURIComponent).join("/")}`} target="_blank" className="text-slate-800 hover:text-brand-600">{p.name}</a>
                </li>
              ))}
              {!s.pins.length && <li className="px-5 py-6 text-sm text-slate-500">Nothing pinned yet.</li>}
            </ul>
          </Card>
        )}
        {s.dashboard.recent && (
          <Card>
            <CardHeader title="Recently edited" />
            <ul className="divide-y divide-slate-100">
              {recent.map((r) => (
                <li key={r.uid} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  {r.kind === "worksheet" ? <PencilRuler className="size-4 text-slate-400" /> : <BookOpen className="size-4 text-slate-400" />}
                  <Link href={r.kind === "worksheet" ? `/worksheets/${r.uid}` : `/lessons/${r.uid}`} className="flex-1 text-slate-800 hover:text-brand-600">{r.title || "Untitled"}</Link>
                  <Clock className="size-3 text-slate-300" />
                  <span className="text-xs text-slate-400">{fmtShort(r.updatedAt.slice(0, 10))}</span>
                </li>
              ))}
              {!recent.length && <li className="px-5 py-6 text-sm text-slate-500">Worksheets and lesson plans you edit will show up here.</li>}
            </ul>
          </Card>
        )}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {s.modules.worksheets && <Link href="/worksheets" className={buttonClass("secondary")}><PencilRuler className="size-4" /> New worksheet</Link>}
        {s.modules.lessons && <Link href="/lessons" className={buttonClass("secondary")}><BookOpen className="size-4" /> New lesson plan</Link>}
        {s.modules.seating && <Link href="/seating" className={buttonClass("secondary")}><LayoutGrid className="size-4" /> Seating charts</Link>}
        {s.modules.library && <Link href="/library" className={buttonClass("secondary")}><FolderOpen className="size-4" /> Library</Link>}
        {s.modules.pacing && <Link href="/pacing" className={buttonClass("secondary")}><Route className="size-4" /> Pacing guides</Link>}
      </div>
    </>
  );
}
