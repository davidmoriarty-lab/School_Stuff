"use client";
import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Download, Plus, Trash2 } from "lucide-react";
import { Button, Card, CardHeader, Input, Select } from "@/components/ui";
import { saveSettingsAction } from "@/lib/storeActions";
import { ACCENTS, MODULES, type Settings } from "@/lib/settings";

const Row = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <div className="grid gap-1.5 px-5 py-3 sm:grid-cols-[14rem_1fr] sm:items-center">
    <div><div className="text-sm font-medium text-slate-800">{label}</div>{hint && <div className="text-xs text-slate-500">{hint}</div>}</div>
    <div>{children}</div>
  </div>
);

/** Edits a list of short text lines (courses, to-do lists). */
function StringList({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      {items.map((v, i) => (
        <div key={i} className="flex gap-2">
          <Input value={v} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <Button variant="danger" size="sm" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="size-4" /></Button>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={() => onChange([...items, ""])}><Plus className="size-3.5" /> {placeholder}</Button>
    </div>
  );
}

export function SettingsForm({ initial, backups }: { initial: Settings; backups: { name: string; size: number }[] }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Changes are collected and saved together a moment after the last keystroke, so quick edits never overwrite each other.
  const pending = useRef<Partial<Settings>>({});
  function update(patch: Partial<Settings>) {
    setS((cur) => ({ ...cur, ...patch }));
    setSaved(false);
    pending.current = { ...pending.current, ...patch };
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const send = pending.current;
      pending.current = {};
      await saveSettingsAction(send);
      setSaved(true);
      router.refresh();
    }, 500);
  }
  // Patches are merged on the server one top-level key at a time, so send whole groups.
  const upd = <K extends keyof Settings>(k: K, v: Settings[K]) => update({ [k]: v } as Partial<Settings>);

  return (
    <div className="space-y-6">
      <div className="no-print sticky top-0 z-10 -mt-2 flex h-6 items-center justify-end text-xs text-slate-500">
        {saved && <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="size-3.5" /> Saved</span>}
      </div>

      <Card>
        <CardHeader title="General" />
        <Row label="App name" hint="Shown in the sidebar and browser tab"><Input value={s.appName} onChange={(e) => upd("appName", e.target.value)} /></Row>
        <Row label="Your name" hint="Used in greetings and on shared packages"><Input value={s.teacherName} onChange={(e) => upd("teacherName", e.target.value)} /></Row>
        <Row label="School year"><Input placeholder="2026-2027" value={s.schoolYear} onChange={(e) => upd("schoolYear", e.target.value)} /></Row>
        <Row label="First day of school"><Input type="date" value={s.schoolStart} onChange={(e) => upd("schoolStart", e.target.value)} /></Row>
        <Row label="Last day of school"><Input type="date" value={s.schoolEnd} onChange={(e) => upd("schoolEnd", e.target.value)} /></Row>
      </Card>

      <Card>
        <CardHeader title="Appearance" />
        <Row label="Accent color" hint="Recolors buttons, highlights and links">
          <div className="flex flex-wrap items-center gap-2">
            {ACCENTS.map((a) => (
              <button key={a.hex} title={a.name} onClick={() => upd("accent", a.hex)}
                className={"size-7 rounded-full border-2 " + (s.accent === a.hex ? "border-slate-900" : "border-white shadow")} style={{ background: a.hex }} />
            ))}
            <input type="color" value={s.accent} onChange={(e) => upd("accent", e.target.value)} className="size-7 cursor-pointer rounded border border-slate-300" aria-label="Custom color" />
          </div>
        </Row>
        <Row label="Theme" hint="Dark mode flips the page colors"><Select value={s.theme} onChange={(e) => upd("theme", e.target.value as Settings["theme"])}><option value="light">Light</option><option value="dark">Dark</option></Select></Row>
        <Row label="Text size"><Select value={s.fontScale} onChange={(e) => upd("fontScale", e.target.value as Settings["fontScale"])}><option value="small">Small</option><option value="normal">Normal</option><option value="large">Large</option><option value="xl">Extra large</option></Select></Row>
        <Row label="Spacing"><Select value={s.density} onChange={(e) => upd("density", e.target.value as Settings["density"])}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></Select></Row>
      </Card>

      <Card>
        <CardHeader title="Sections of the app" description="Turn off anything you do not use. It disappears from the sidebar (your data is kept)." />
        <div className="grid gap-x-6 sm:grid-cols-2">
          {MODULES.map((m) => (
            <label key={m.key} className="flex items-start gap-3 px-5 py-2.5">
              <input type="checkbox" className="mt-1 size-4 accent-[var(--color-brand-600)]" checked={s.modules[m.key]}
                onChange={(e) => upd("modules", { ...s.modules, [m.key]: e.target.checked })} />
              <span><span className="block text-sm font-medium text-slate-800">{m.label}</span><span className="block text-xs text-slate-500">{m.hint}</span></span>
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Today page" description="Choose which boxes show on the Today page" />
        <div className="grid gap-x-6 sm:grid-cols-3">
          {(Object.keys(s.dashboard) as (keyof Settings["dashboard"])[]).map((k) => (
            <label key={k} className="flex items-center gap-2.5 px-5 py-2 text-sm text-slate-800">
              <input type="checkbox" className="size-4 accent-[var(--color-brand-600)]" checked={s.dashboard[k]} onChange={(e) => upd("dashboard", { ...s.dashboard, [k]: e.target.checked })} />
              {{ today: "Today", todos: "To-do", upcoming: "Next 7 days", pinned: "Pinned files", pacing: "Pacing guide", recent: "Recently edited" }[k]}
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Courses" description="Used in lesson plans, pacing guides and worksheets" />
        <div className="px-5 py-4"><StringList items={s.courses} onChange={(v) => upd("courses", v)} placeholder="Add course" /></div>
      </Card>

      <Card>
        <CardHeader title="Class periods" description="Your daily schedule (used by seating charts and tools)" />
        <div className="space-y-2 px-5 py-4">
          {s.periods.map((p, i) => (
            <div key={i} className="flex flex-wrap gap-2">
              <Input className="w-44" value={p.name} onChange={(e) => upd("periods", s.periods.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <Input className="w-32" type="time" value={p.start} onChange={(e) => upd("periods", s.periods.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
              <Input className="w-32" type="time" value={p.end} onChange={(e) => upd("periods", s.periods.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} />
              <Button variant="danger" size="sm" onClick={() => upd("periods", s.periods.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="size-4" /></Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => upd("periods", [...s.periods, { name: `Period ${s.periods.length + 1}`, start: "", end: "" }])}><Plus className="size-3.5" /> Add period</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Calendar event types" description="Names and colors for the calendar" />
        <div className="space-y-2 px-5 py-4">
          {s.eventTypes.map((t, i) => (
            <div key={t.id} className="flex gap-2">
              <input type="color" value={t.color} className="h-9 w-10 cursor-pointer rounded border border-slate-300" onChange={(e) => upd("eventTypes", s.eventTypes.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))} />
              <Input value={t.label} onChange={(e) => upd("eventTypes", s.eventTypes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <Button variant="danger" size="sm" disabled={s.eventTypes.length <= 1} onClick={() => upd("eventTypes", s.eventTypes.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="size-4" /></Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => upd("eventTypes", [...s.eventTypes, { id: "t" + Date.now().toString(36), label: "New type", color: "#0891b2" }])}><Plus className="size-3.5" /> Add type</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="To-do lists" description="Categories for your tasks" />
        <div className="px-5 py-4"><StringList items={s.todoLists} onChange={(v) => upd("todoLists", v)} placeholder="Add list" /></div>
      </Card>

      <Card>
        <CardHeader title="Lesson plan template" description="Choose and rename the boxes every lesson plan has. Add your own." />
        <div className="space-y-2 px-5 py-4">
          {s.lessonSections.map((sec, i) => {
            const set = (patch: Partial<typeof sec>) => upd("lessonSections", s.lessonSections.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            const move = (d: number) => {
              const a = [...s.lessonSections]; const k = i + d;
              if (k < 0 || k >= a.length) return;
              [a[i], a[k]] = [a[k], a[i]]; upd("lessonSections", a);
            };
            return (
              <div key={sec.id} className="flex items-center gap-2">
                <input type="checkbox" className="size-4 accent-[var(--color-brand-600)]" checked={sec.enabled} onChange={(e) => set({ enabled: e.target.checked })} aria-label="Show" />
                <Input value={sec.label} onChange={(e) => set({ label: e.target.value })} />
                <Button variant="ghost" size="sm" onClick={() => move(-1)} aria-label="Up"><ArrowUp className="size-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => move(1)} aria-label="Down"><ArrowDown className="size-4" /></Button>
                <Button variant="danger" size="sm" onClick={() => upd("lessonSections", s.lessonSections.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="size-4" /></Button>
              </div>
            );
          })}
          <Button variant="secondary" size="sm" onClick={() => upd("lessonSections", [...s.lessonSections, { id: "c" + Date.now().toString(36), label: "New section", enabled: true }])}><Plus className="size-3.5" /> Add section</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Printing" />
        <Row label="Paper size"><Select value={s.print.paper} onChange={(e) => upd("print", { ...s.print, paper: e.target.value as "letter" | "a4" })}><option value="letter">Letter (8.5 × 11 in)</option><option value="a4">A4</option></Select></Row>
        <Row label="Header text" hint="Printed at the top of lesson plans, pacing guides and calendars"><Input value={s.print.headerText} onChange={(e) => upd("print", { ...s.print, headerText: e.target.value })} /></Row>
        <Row label="Footer text"><Input value={s.print.footerText} onChange={(e) => upd("print", { ...s.print, footerText: e.target.value })} /></Row>
        <Row label="Print the date"><input type="checkbox" className="size-4 accent-[var(--color-brand-600)]" checked={s.print.showDate} onChange={(e) => upd("print", { ...s.print, showDate: e.target.checked })} /></Row>
      </Card>

      <Card>
        <CardHeader title="Backups" description="Your data lives in the data folder next to the app. A copy is saved automatically once a day (last 14 kept)." />
        <div className="space-y-3 px-5 py-4 text-sm">
          <a href="/api/backup" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50"><Download className="size-4" /> Download a backup now</a>
          <p className="text-xs text-slate-500">To restore: close the app, then copy a file from <code>data/backups</code> over <code>data/scoring.db</code>, and start the app again.</p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {backups.slice(0, 6).map((b) => <li key={b.name} className="flex justify-between px-3 py-1.5 text-xs text-slate-600"><span>{b.name}</span><span>{(b.size / 1024).toFixed(0)} KB</span></li>)}
            {!backups.length && <li className="px-3 py-2 text-xs text-slate-500">No automatic backups yet.</li>}
          </ul>
        </div>
      </Card>
    </div>
  );
}
