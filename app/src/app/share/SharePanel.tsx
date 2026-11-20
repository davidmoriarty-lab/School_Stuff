"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, PackageOpen, ShieldCheck, Upload } from "lucide-react";
import { Badge, Button, Card, CardHeader, Input, Select } from "@/components/ui";

type It = { uid: string; title: string; kind: string; course: string; unit: string };
type Prev = { name: string; from: string; createdAt: string; fileCount: number; items: { uid: string; kind: string; title: string; status: string; label: string }[] };
type Mode = "update" | "copy" | "skip";
const STATUS: Record<string, { text: string; tone: "green" | "slate" | "amber" | "brand" }> = {
  new: { text: "New to you", tone: "green" }, same: { text: "Identical", tone: "slate" }, "pack-newer": { text: "Newer version in package", tone: "brand" }, "here-newer": { text: "Yours is newer", tone: "amber" },
};
const defaultMode = (s: string): Mode => (s === "new" || s === "pack-newer" ? "update" : "skip");

export function SharePanel({ items, files, teacher, courseOrder }: { items: It[]; files: string[]; teacher: string; courseOrder: string[] }) {
  const router = useRouter();
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [pickFiles, setPickFiles] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [courseF, setCourseF] = useState("");
  const [kindF, setKindF] = useState("");
  const [msg, setMsg] = useState("");
  const [pack, setPack] = useState<unknown>(null);
  const [prev, setPrev] = useState<Prev | null>(null);
  const [modes, setModes] = useState<Record<string, Mode>>({});
  const [result, setResult] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const toggle = (s: Set<string>, set: (x: Set<string>) => void, k: string) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); set(n); };

  async function exportPack() {
    setMsg("Building package…");
    const res = await fetch("/api/share/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uids: [...pick], files: [...pickFiles], name }) });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (name.replace(/[^\w\- ]+/g, "").trim() || "package") + ".classpack";
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg(`Saved ${pick.size} item${pick.size === 1 ? "" : "s"}${pickFiles.size ? ` and ${pickFiles.size} file${pickFiles.size === 1 ? "" : "s"}` : ""} to your Downloads folder. Send that file to your colleague.`);
  }

  async function loadFile(f: File | undefined) {
    if (!f) return;
    setResult(""); setPrev(null);
    let json: unknown;
    try { json = JSON.parse(await f.text()); } catch { setResult("That file could not be read as a class package."); return; }
    const res = await fetch("/api/share/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(json) });
    const data = await res.json();
    if (!res.ok) { setResult(data.error ?? "Could not read the package."); return; }
    setPack(json); setPrev(data);
    setModes(Object.fromEntries((data as Prev).items.map((i) => [i.uid, defaultMode(i.status)])));
  }

  async function apply() {
    const res = await fetch("/api/share/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pack, choices: Object.entries(modes).map(([uid, mode]) => ({ uid, mode })) }) });
    const d = await res.json();
    if (!res.ok) { setResult(d.error ?? "Import failed."); return; }
    setResult(`Done: ${d.added} added, ${d.updated} updated, ${d.copied} copied${d.files ? `, ${d.files} file${d.files === 1 ? "" : "s"} placed in Library → My files → Imported` : ""}.`);
    setPrev(null); setPack(null); router.refresh();
  }

  const kinds = [...new Set(items.map((i) => i.kind))];
  const courses = [...new Set(items.map((i) => i.course))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  function rank(c: string) { const i = courseOrder.indexOf(c); return c === "" ? 9999 : i === -1 ? 5000 : i; }
  const needle = q.trim().toLowerCase();
  const shown = items.filter((i) => (!courseF || i.course === courseF) && (!kindF || i.kind === kindF) && (!needle || `${i.title} ${i.course} ${i.unit} ${i.kind}`.toLowerCase().includes(needle)));
  const shownFiles = files.filter((f) => (!courseF) && (!needle || f.toLowerCase().includes(needle)));
  // course -> unit -> items, with courses in your Settings order and units in natural order (Unit 2 before Unit 10)
  const grouped = [...new Set(shown.map((i) => i.course))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).map((course) => ({
    course,
    units: [...new Set(shown.filter((i) => i.course === course).map((i) => i.unit))]
      .sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b, undefined, { numeric: true })))
      .map((unit) => ({ unit, items: shown.filter((i) => i.course === course && i.unit === unit) })),
  }));
  const allIn = (its: It[]) => its.length > 0 && its.every((i) => pick.has(i.uid));
  const setMany = (uids: string[], on: boolean) => setPick((cur) => { const n = new Set(cur); uids.forEach((u) => (on ? n.add(u) : n.delete(u))); return n; });
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader title="Make a package" description="Find what to send, tick it, then create the package. Student names never go in a package." />
        <div className="space-y-4 px-5 py-4">
          {items.length === 0 && files.length === 0 && <p className="text-sm text-slate-500">Nothing to share yet. Create a worksheet, lesson plan, pacing guide or seating layout first.</p>}
          {(items.length > 0 || files.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              <Input className="!w-48 !py-1.5" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
              <Select className="!w-44 !py-1.5" value={courseF} onChange={(e) => setCourseF(e.target.value)}>
                <option value="">All courses</option>{courses.map((c) => <option key={c} value={c}>{c || "No course"}</option>)}
              </Select>
              <Select className="!w-40 !py-1.5" value={kindF} onChange={(e) => setKindF(e.target.value)}>
                <option value="">All types</option>{kinds.map((k) => <option key={k}>{k}</option>)}
              </Select>
              <Button variant="secondary" size="sm" onClick={() => setMany(shown.map((i) => i.uid), true)}>Select all shown</Button>
              <Button variant="ghost" size="sm" onClick={() => { setPick(new Set()); setPickFiles(new Set()); }}>Clear</Button>
              <span className="ml-auto text-xs text-slate-500">{pick.size + pickFiles.size} selected</span>
            </div>
          )}
          {grouped.map(({ course, units }) => (
            <div key={course} className="rounded-lg border border-slate-200">
              <label className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
                <input type="checkbox" className="accent-[var(--color-brand-600)]" checked={allIn(units.flatMap((u) => u.items))} onChange={(e) => setMany(units.flatMap((u) => u.items).map((i) => i.uid), e.target.checked)} />
                {course || "No course"} <span className="font-normal text-slate-500">({units.reduce((n, u) => n + u.items.length, 0)})</span>
              </label>
              {units.map(({ unit, items: its }) => (
                <div key={unit} className="px-3 py-2">
                  <label className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <input type="checkbox" className="accent-[var(--color-brand-600)]" checked={allIn(its)} onChange={(e) => setMany(its.map((i) => i.uid), e.target.checked)} />
                    {unit || "Not in a unit"} <span className="font-normal normal-case text-slate-400">tick to share this whole unit</span>
                  </label>
                  {its.map((i) => (
                    <label key={i.uid} className="flex items-center gap-2 py-0.5 pl-5 text-sm text-slate-800">
                      <input type="checkbox" className="accent-[var(--color-brand-600)]" checked={pick.has(i.uid)} onChange={() => toggle(pick, setPick, i.uid)} />
                      <span className="min-w-0 flex-1 truncate">{i.title}</span><Badge>{i.kind}</Badge>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          ))}
          {items.length > 0 && grouped.length === 0 && <p className="text-sm text-slate-500">Nothing matches those filters.</p>}
          {shownFiles.length > 0 && !kindF && (
            <div className="rounded-lg border border-slate-200">
              <label className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
                <input type="checkbox" className="accent-[var(--color-brand-600)]" checked={shownFiles.every((f) => pickFiles.has(f))} onChange={(e) => setPickFiles((cur) => { const n = new Set(cur); shownFiles.forEach((f) => (e.target.checked ? n.add(f) : n.delete(f))); return n; })} />
                My files <span className="font-normal text-slate-500">({shownFiles.length})</span>
              </label>
              <div className="max-h-40 overflow-y-auto px-3 py-2">{shownFiles.map((f) => <label key={f} className="flex items-center gap-2 py-0.5 text-sm text-slate-800"><input type="checkbox" className="accent-[var(--color-brand-600)]" checked={pickFiles.has(f)} onChange={() => toggle(pickFiles, setPickFiles, f)} /><span className="truncate">{f}</span></label>)}</div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Input className="!w-56" placeholder="Package name (e.g. Unit 5 materials)" value={name} onChange={(e) => setName(e.target.value)} />
            <Button disabled={!pick.size && !pickFiles.size} onClick={exportPack}><Download className="size-4" /> Create package</Button>
          </div>
          {msg && <p className="text-sm text-emerald-700">{msg}</p>}
          <p className="text-xs text-slate-500">Sub plans can contain names you typed yourself (for example helpful students). Check them before sharing.</p>
          <p className="flex items-start gap-1.5 text-xs text-slate-500"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" /> The package is signed &ldquo;from {teacher || "a colleague"}&rdquo;. Set your name under Settings.</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Open a package" description="Import a .classpack file someone sent you" />
        <div className="space-y-4 px-5 py-4">
          <input ref={input} type="file" accept=".classpack,application/json" hidden onChange={(e) => { loadFile(e.target.files?.[0]); e.target.value = ""; }} />
          <Button variant="secondary" onClick={() => input.current?.click()}><Upload className="size-4" /> Choose a package file</Button>
          {prev && (
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 p-3 text-sm"><div className="font-medium text-slate-900"><PackageOpen className="mr-1.5 inline size-4" />{prev.name}</div><div className="text-xs text-slate-500">From {prev.from} · {new Date(prev.createdAt).toLocaleDateString()}{prev.fileCount ? ` · ${prev.fileCount} files` : ""}</div></div>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {prev.items.map((i) => (
                  <li key={i.uid} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1"><div className="truncate font-medium text-slate-900">{i.title || "Untitled"}</div><div className="text-xs text-slate-500">{i.label}</div></div>
                    <Badge tone={STATUS[i.status]?.tone}>{STATUS[i.status]?.text}</Badge>
                    <Select className="!w-44 !py-1 text-xs" value={modes[i.uid]} onChange={(e) => setModes({ ...modes, [i.uid]: e.target.value as Mode })}>
                      <option value="update">{i.status === "new" ? "Import" : "Replace mine"}</option><option value="copy">Add as a copy</option><option value="skip">Skip</option>
                    </Select>
                  </li>
                ))}
              </ul>
              {prev.fileCount > 0 && <p className="text-xs text-slate-500">Files go into Library → My files → Imported. They open in a safe sandbox.</p>}
              <p className="text-xs text-slate-500">A backup of your data is saved first if anything is replaced.</p>
              <Button onClick={apply}>Apply</Button>
            </div>
          )}
          {result && <p className="text-sm text-slate-700">{result}</p>}
        </div>
      </Card>
    </div>
  );
}
