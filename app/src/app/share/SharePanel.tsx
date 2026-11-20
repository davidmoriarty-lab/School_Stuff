"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, PackageOpen, ShieldCheck, Upload } from "lucide-react";
import { Badge, Button, Card, CardHeader, Input, Select } from "@/components/ui";

type It = { uid: string; title: string; kind: string };
type Prev = { name: string; from: string; createdAt: string; fileCount: number; items: { uid: string; kind: string; title: string; status: string; label: string }[] };
type Mode = "update" | "copy" | "skip";
const STATUS: Record<string, { text: string; tone: "green" | "slate" | "amber" | "brand" }> = {
  new: { text: "New to you", tone: "green" }, same: { text: "Identical", tone: "slate" }, "pack-newer": { text: "Newer version in package", tone: "brand" }, "here-newer": { text: "Yours is newer", tone: "amber" },
};
const defaultMode = (s: string): Mode => (s === "new" || s === "pack-newer" ? "update" : "skip");

export function SharePanel({ items, files, teacher }: { items: It[]; files: string[]; teacher: string }) {
  const router = useRouter();
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [pickFiles, setPickFiles] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
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
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader title="Make a package" description="Pick what to send. Student names never go in a package." />
        <div className="space-y-4 px-5 py-4">
          {items.length === 0 && files.length === 0 && <p className="text-sm text-slate-500">Nothing to share yet. Create a worksheet, lesson plan, pacing guide or seating layout first.</p>}
          {kinds.map((k) => (
            <div key={k}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{k}s</div>
              {items.filter((i) => i.kind === k).map((i) => (
                <label key={i.uid} className="flex items-center gap-2 py-0.5 text-sm text-slate-800"><input type="checkbox" className="accent-[var(--color-brand-600)]" checked={pick.has(i.uid)} onChange={() => toggle(pick, setPick, i.uid)} />{i.title}</label>
              ))}
            </div>
          ))}
          {files.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">My files</div>
              <div className="max-h-40 overflow-y-auto">{files.map((f) => <label key={f} className="flex items-center gap-2 py-0.5 text-sm text-slate-800"><input type="checkbox" className="accent-[var(--color-brand-600)]" checked={pickFiles.has(f)} onChange={() => toggle(pickFiles, setPickFiles, f)} /><span className="truncate">{f}</span></label>)}</div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Input className="!w-56" placeholder="Package name (e.g. Unit 5 materials)" value={name} onChange={(e) => setName(e.target.value)} />
            <Button disabled={!pick.size && !pickFiles.size} onClick={exportPack}><Download className="size-4" /> Create package</Button>
          </div>
          {msg && <p className="text-sm text-emerald-700">{msg}</p>}
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
