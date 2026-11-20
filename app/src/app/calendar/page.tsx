import { getSettings, listItems } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import { QuickSettings } from "@/components/QuickSettings";
import { pad, todayStr } from "@/lib/dates";
import type { Guide } from "@/lib/pacing";
import { CalendarView, type CalEvent } from "./CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const s = getSettings();
  const t = todayStr();
  const m = (await searchParams).m;
  const ym = m && /^\d{4}-\d{2}$/.test(m) ? m : t.slice(0, 7);
  const events: CalEvent[] = listItems("event").map((e) => ({ uid: e.uid, title: e.title, ...(e.data as Omit<CalEvent, "uid" | "title">) }));
  const lessons = listItems("lesson").filter((l) => l.data.date).map((l) => ({ uid: l.uid, title: l.title || "Lesson", date: String(l.data.date) }));
  const todos = listItems("todo").filter((x) => x.data.due && !x.data.done).map((x) => ({ uid: x.uid, title: x.title, date: String(x.data.due) }));
  const units = listItems("pacing").flatMap((p) => (p.data as Guide).units?.map((u) => ({ title: `${u.title}`, start: u.start, end: u.end, color: u.color })) ?? []).filter((u) => u.start);
  const [y, mo] = ym.split("-").map(Number);
  const prev = mo === 1 ? `${y - 1}-12` : `${y}-${pad(mo - 1)}`, next = mo === 12 ? `${y + 1}-01` : `${y}-${pad(mo + 1)}`;
  return (
    <>
      <PageHeader title="Calendar" subtitle="Tests, labs, due dates and school events. Click a day to add something."
        actions={<QuickSettings page="calendar" title="Calendar options" prefs={s.prefs} fields={[
          { key: "weekStart", label: "Week starts on", kind: "select", def: "0", options: [["0", "Sunday"], ["1", "Monday"]] },
          { key: "showWeekends", label: "Show weekends", kind: "bool", def: true },
          { key: "showLessons", label: "Show lesson plans", kind: "bool", def: true },
          { key: "showTodos", label: "Show to-do due dates", kind: "bool", def: true },
          { key: "showUnits", label: "Show pacing guide units", kind: "bool", def: true },
        ]} />} />
      <CalendarView ym={ym} prev={prev} next={next} today={t} events={events} lessons={lessons} todos={todos} units={units} eventTypes={s.eventTypes} courses={s.courses}
        prefs={{ weekStart: Number(s.prefs.calendar?.weekStart ?? 0) as 0 | 1, showWeekends: (s.prefs.calendar?.showWeekends ?? true) as boolean, showLessons: (s.prefs.calendar?.showLessons ?? true) as boolean, showTodos: (s.prefs.calendar?.showTodos ?? true) as boolean, showUnits: (s.prefs.calendar?.showUnits ?? true) as boolean }}
        header={s.print.headerText} />
    </>
  );
}
