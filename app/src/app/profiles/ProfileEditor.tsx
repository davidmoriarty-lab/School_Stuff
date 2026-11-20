"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Printer, Trash2 } from "lucide-react";
import { Button, Card, CardHeader, Input, inputClass } from "@/components/ui";
import { saveProfileAction } from "@/lib/profileActions";
import { fmtShort, todayStr } from "@/lib/dates";
import type { Profile, ProfileRow } from "@/lib/profiles";
import type { ProfileFields, StudentField, StudentTag } from "@/lib/settings";

const Area = ({ label, hint, value, onChange, rows = 3 }: { label: string; hint?: string; value: string; onChange: (v: string) => void; rows?: number }) => (
  <label className="block"><span className="text-sm font-medium text-slate-800">{label}</span>{hint && <span className="ml-2 text-xs text-slate-400">{hint}</span>}
    <textarea className={inputClass + " mt-1 w-full"} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} /></label>
);

export function ProfileEditor({ row, tags, fields, show }: { row: ProfileRow; tags: StudentTag[]; fields: StudentField[]; show: ProfileFields }) {
  const [p, setP] = useState<Profile>(row.profile);
  const [status, setStatus] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [entry, setEntry] = useState("");
  const ref = useRef(p); ref.current = p;
  const save = useCallback(async () => {
    setStatus("saving");
    try { await saveProfileAction(row.id, ref.current); setStatus("saved"); } catch { setStatus("error"); }
  }, [row.id]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setStatus("dirty");
    const t = setTimeout(save, 800);
    return () => clearTimeout(t);
  }, [p, save]);
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));

  const display = p.preferred || row.first;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/profiles?section=${row.sectionId}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="size-4" /> {row.sectionName}</Link>
        <span className="text-xs text-slate-400">{status === "saving" ? "Saving…" : status === "dirty" ? "Unsaved…" : status === "error" ? <span className="text-red-600">Could not save</span> : "Saved"}</span>
        <Link href={`/students/${row.id}`} className="ml-auto text-sm text-slate-500 hover:text-brand-600">Test results →</Link>
        <Link href={`/profiles/print?section=${row.sectionId}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><Printer className="size-4" /> Sub roster</Link>
      </div>
      <Card className="mb-5 p-5">
        <h1 className="text-2xl font-semibold text-slate-900">{display} {row.last}</h1>
        <div className="text-sm text-slate-500">Roster name: {row.first} {row.last} · {row.sectionName}</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-medium text-slate-600">Preferred first name<Input className="mt-1" placeholder={row.first} value={p.preferred} onChange={(e) => set({ preferred: e.target.value })} /></label>
          {show.pronouns && <label className="text-xs font-medium text-slate-600">Pronouns<Input className="mt-1" value={p.pronouns} onChange={(e) => set({ pronouns: e.target.value })} /></label>}
          {show.pronunciation && <label className="text-xs font-medium text-slate-600">How to say the name<Input className="mt-1" placeholder="for example: Sah-OR-see" value={p.pronunciation} onChange={(e) => set({ pronunciation: e.target.value })} /></label>}
        </div>
        <p className="mt-2 text-xs text-slate-400">The preferred name is used on seating charts, the random picker and the substitute roster.</p>
        {tags.length > 0 && (
          <div className="mt-4">
            <div className="mb-1 text-xs font-medium text-slate-600">Flags</div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => {
                const on = p.tags.includes(t.id);
                return <button key={t.id} onClick={() => set({ tags: on ? p.tags.filter((x) => x !== t.id) : [...p.tags, t.id] })}
                  className={"rounded-full border px-3 py-1 text-xs font-medium " + (on ? "border-transparent text-white" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50")} style={on ? { background: t.color } : undefined}>{t.label}</button>;
              })}
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <Card className="space-y-4 p-5">
          <Area label="For a substitute" hint="Prints on the sub roster" value={p.sub} onChange={(v) => set({ sub: v })} rows={2} />
          {show.accommodations && <Area label="Accommodations" value={p.accommodations} onChange={(v) => set({ accommodations: v })} />}
          {show.medical && <Area label="Health / medical" value={p.medical} onChange={(v) => set({ medical: v })} rows={2} />}
          {show.guardian && <Area label="Guardian contact" value={p.guardian} onChange={(v) => set({ guardian: v })} rows={2} />}
          {show.strengths && <Area label="Strengths & interests" value={p.strengths} onChange={(v) => set({ strengths: v })} rows={2} />}
          {fields.filter((f) => f.label.trim()).map((f) => f.long
            ? <Area key={f.id} label={f.label} value={p.custom[f.id] ?? ""} onChange={(v) => set({ custom: { ...p.custom, [f.id]: v } })} />
            : <label key={f.id} className="block text-sm font-medium text-slate-800">{f.label}<Input className="mt-1" value={p.custom[f.id] ?? ""} onChange={(e) => set({ custom: { ...p.custom, [f.id]: e.target.value } })} /></label>)}
          <Area label="Private notes" hint="Never printed unless you choose to" value={p.notes} onChange={(v) => set({ notes: v })} rows={4} />
        </Card>

        <Card>
          <CardHeader title="Notes over time" description="A dated log: conversations, concerns, wins" />
          <div className="space-y-3 p-4">
            <div className="flex gap-2">
              <Input placeholder="Add a note and press Enter" value={entry} onChange={(e) => setEntry(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && entry.trim()) { set({ log: [{ id: Math.random().toString(36).slice(2, 8), date: todayStr(), text: entry.trim() }, ...p.log] }); setEntry(""); } }} />
              <Button onClick={() => { if (entry.trim()) { set({ log: [{ id: Math.random().toString(36).slice(2, 8), date: todayStr(), text: entry.trim() }, ...p.log] }); setEntry(""); } }}><Plus className="size-4" /> Add</Button>
            </div>
            <ul className="divide-y divide-slate-100">
              {p.log.map((l) => (
                <li key={l.id} className="flex items-start gap-3 py-2 text-sm">
                  <span className="w-16 shrink-0 text-xs text-slate-400">{fmtShort(l.date)}</span>
                  <span className="flex-1 whitespace-pre-wrap text-slate-800">{l.text}</span>
                  <button className="rounded p-1 text-red-400 hover:bg-red-50" onClick={() => set({ log: p.log.filter((x) => x.id !== l.id) })} aria-label="Delete note"><Trash2 className="size-3.5" /></button>
                </li>
              ))}
              {p.log.length === 0 && <li className="py-3 text-sm text-slate-400">No notes yet.</li>}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
