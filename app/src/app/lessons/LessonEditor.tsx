"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Link2, Plus, Printer, Trash2 } from "lucide-react";
import { Button, Card, CardHeader, Input, Select, inputClass } from "@/components/ui";
import { saveItemAction } from "@/lib/storeActions";
import type { LessonSection } from "@/lib/settings";

type Attach = { kind: "worksheet" | "link"; ref: string; label: string };
type Lesson = { course: string; unit: string; date: string; duration: number; periods: string; sections: Record<string, string>; attachments: Attach[] };

export function LessonEditor({ uid, initialTitle, initial, sections, courses, worksheets, unitSuggestions }: {
  unitSuggestions: string[]; uid: string; initialTitle: string; initial: Partial<Lesson>; sections: LessonSection[]; courses: string[]; worksheets: { uid: string; title: string }[];
}) {
  const [title, setTitle] = useState(initialTitle);
  const [d, setD] = useState<Lesson>({ course: "", unit: "", date: "", duration: 50, periods: "", sections: {}, attachments: [], ...initial });
  const [status, setStatus] = useState<"saved" | "saving" | "dirty">("saved");
  const ref = useRef({ title, d }); ref.current = { title, d };
  const save = useCallback(async () => {
    setStatus("saving");
    await saveItemAction({ uid, kind: "lesson", title: ref.current.title, data: ref.current.d });
    setStatus("saved");
  }, [uid]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setStatus("dirty");
    const t = setTimeout(save, 900);
    return () => clearTimeout(t);
  }, [title, d, save]);

  const set = (p: Partial<Lesson>) => setD((x) => ({ ...x, ...p }));
  const setAttach = (i: number, p: Partial<Attach>) => set({ attachments: d.attachments.map((a, j) => (j === i ? { ...a, ...p } : a)) });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/lessons" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="size-4" /> All lesson plans</Link>
        <span className="text-xs text-slate-400">{status === "saving" ? "Saving…" : status === "dirty" ? "Unsaved…" : "Saved"}</span>
        <Link href={`/lessons/${uid}/print`} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700" onClick={save}><Printer className="size-4" /> Print</Link>
      </div>
      <Card className="mb-5 p-5">
        <Input className="!border-0 !px-0 text-2xl font-semibold !shadow-none" placeholder="Lesson title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="text-xs font-medium text-slate-600">Course<Select className="mt-1" value={d.course} onChange={(e) => set({ course: e.target.value })}><option value="">(none)</option>{courses.map((c) => <option key={c}>{c}</option>)}</Select></label>
          <label className="text-xs font-medium text-slate-600">Unit<Input className="mt-1" list="lesson-units" value={d.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="Unit 5" /><datalist id="lesson-units">{unitSuggestions.map((u) => <option key={u} value={u} />)}</datalist></label>
          <label className="text-xs font-medium text-slate-600">Date<Input className="mt-1" type="date" value={d.date} onChange={(e) => set({ date: e.target.value })} /></label>
          <label className="text-xs font-medium text-slate-600">Minutes<Input className="mt-1" type="number" min={5} value={d.duration} onChange={(e) => set({ duration: Number(e.target.value) })} /></label>
        </div>
        <label className="mt-3 block text-xs font-medium text-slate-600">Periods / classes<Input className="mt-1" placeholder="Periods 1, 3, 5" value={d.periods} onChange={(e) => set({ periods: e.target.value })} /></label>
      </Card>

      <div className="space-y-4">
        {sections.map((s) => (
          <Card key={s.id}>
            <CardHeader title={s.label} />
            <div className="p-3"><textarea className={inputClass + " w-full"} rows={4} value={d.sections[s.id] ?? ""} onChange={(e) => set({ sections: { ...d.sections, [s.id]: e.target.value } })} /></div>
          </Card>
        ))}
        <Card>
          <CardHeader title="Attachments" description="Link a worksheet from the builder, or any web address or file path" />
          <div className="space-y-2 p-3">
            {d.attachments.map((a, i) => (
              <div key={i} className="flex gap-2">
                <Select className="!w-36" value={a.kind} onChange={(e) => setAttach(i, { kind: e.target.value as Attach["kind"], ref: "" })}><option value="worksheet">Worksheet</option><option value="link">Link / file</option></Select>
                {a.kind === "worksheet"
                  ? <Select value={a.ref} onChange={(e) => setAttach(i, { ref: e.target.value, label: worksheets.find((w) => w.uid === e.target.value)?.title ?? "" })}><option value="">Choose…</option>{worksheets.map((w) => <option key={w.uid} value={w.uid}>{w.title}</option>)}</Select>
                  : <><Input placeholder="Label" value={a.label} onChange={(e) => setAttach(i, { label: e.target.value })} /><Input placeholder="https://… or a library path" value={a.ref} onChange={(e) => setAttach(i, { ref: e.target.value })} /></>}
                <Button variant="danger" size="sm" onClick={() => set({ attachments: d.attachments.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => set({ attachments: [...d.attachments, { kind: "worksheet", ref: "", label: "" }] })}><Plus className="size-3.5" /> <Link2 className="size-3.5" /> Add attachment</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
