"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Contact, Printer } from "lucide-react";
import { Card, EmptyState, Input, Select, buttonClass } from "@/components/ui";
import type { ProfileRow } from "@/lib/profiles";
import type { StudentTag } from "@/lib/settings";

export function ProfilesList({ rows, sections, tags, initialSection }: { rows: ProfileRow[]; sections: { id: number; name: string }[]; tags: StudentTag[]; initialSection: string }) {
  const [section, setSection] = useState(initialSection);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [onlyNotes, setOnlyNotes] = useState(false);
  const needle = q.trim().toLowerCase();
  const shown = useMemo(() => rows.filter((r) => {
    const p = r.profile;
    if (section && String(r.sectionId) !== section) return false;
    if (tag && !p.tags.includes(tag)) return false;
    if (onlyNotes && !(p.notes || p.sub || p.log.length)) return false;
    return !needle || `${r.first} ${r.last} ${p.preferred} ${p.notes} ${p.sub}`.toLowerCase().includes(needle);
  }), [rows, section, tag, onlyNotes, needle]);

  if (rows.length === 0) return <Card><EmptyState icon={Contact} title="No students yet" description="Import a roster under Gradebook → Rosters. Every student on it gets a profile automatically." action={<Link href="/rosters" className={buttonClass("primary")}>Go to rosters</Link>} /></Card>;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input className="!w-56" placeholder="Search by name or note" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select className="!w-52" value={section} onChange={(e) => setSection(e.target.value)}><option value="">All classes</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <Select className="!w-44" value={tag} onChange={(e) => setTag(e.target.value)}><option value="">Any flag</option>{tags.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</Select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600"><input type="checkbox" className="accent-[var(--color-brand-600)]" checked={onlyNotes} onChange={(e) => setOnlyNotes(e.target.checked)} /> Has notes</label>
        <Link href={`/profiles/print?sections=${section || "all"}`} className={buttonClass("primary") + " ml-auto"}><Printer className="size-4" /> Print {section ? "this class" : "all classes"}</Link>
      </div>
      <Card>
        <ul className="divide-y divide-slate-100">
          {shown.map((r) => {
            const p = r.profile;
            const show = p.sub || p.notes;
            return (
              <li key={r.id}>
                <Link href={`/profiles/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900">
                      {p.preferred && p.preferred !== r.first ? <>{p.preferred} <span className="font-normal text-slate-500">({r.first})</span></> : r.first} {r.last}
                      {p.pronouns && <span className="ml-2 text-xs font-normal text-slate-400">{p.pronouns}</span>}
                    </div>
                    {show && <div className="truncate text-xs text-slate-500">{show}</div>}
                  </div>
                  <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                    {p.tags.map((id) => { const t = tags.find((x) => x.id === id); return t ? <span key={id} className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ background: t.color }}>{t.label}</span> : null; })}
                  </div>
                  <span className="w-28 truncate text-right text-xs text-slate-400">{r.sectionName}</span>
                </Link>
              </li>
            );
          })}
          {shown.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-500">No students match.</li>}
        </ul>
      </Card>
      <p className="mt-2 text-xs text-slate-400">{shown.length} of {rows.length} students. Profiles stay on this computer and are never included in a share package.</p>
    </>
  );
}
