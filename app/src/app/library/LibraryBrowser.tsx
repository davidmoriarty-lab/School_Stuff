"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download, ExternalLink, File, FileImage, FileSpreadsheet, FileText, Folder, FolderPlus, Globe, Pin, PinOff, Presentation, Printer, Trash2, Upload,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button, Card, EmptyState } from "@/components/ui";
import { togglePin } from "@/lib/libraryActions";
import { PREVIEWABLE, filesUrl, type Entry, type RootKey } from "@/lib/libraryShared";
import type { Pin as PinT } from "@/lib/settings";

type E = Entry & { root: RootKey };
const icon = (e: Entry) => {
  if (e.isDir) return Folder;
  if (["html", "htm"].includes(e.ext)) return Globe;
  if (["png", "jpg", "jpeg", "gif", "svg"].includes(e.ext)) return FileImage;
  if (["xlsx", "xls", "csv"].includes(e.ext)) return FileSpreadsheet;
  if (["pptx", "ppt"].includes(e.ext)) return Presentation;
  if (["pdf", "docx", "doc", "txt", "md"].includes(e.ext)) return FileText;
  return File;
};
const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const TYPES: [string, string, string[]][] = [
  ["all", "All", []], ["pages", "Web pages", ["html", "htm"]], ["docs", "Documents", ["pdf", "docx", "doc", "txt", "md"]],
  ["slides", "Slides", ["pptx", "ppt"]], ["sheets", "Spreadsheets", ["xlsx", "xls", "csv"]], ["images", "Images", ["png", "jpg", "jpeg", "gif", "svg"]],
];

export function LibraryBrowser({ entries, root, path, searching, view, pins }: { entries: E[]; root: RootKey; path: string; searching: boolean; view: string; pins: PinT[] }) {
  const router = useRouter();
  const [type, setType] = useState("all");
  const [preview, setPreview] = useState<E | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const exts = TYPES.find((t) => t[0] === type)?.[2] ?? [];
  const shown = entries.filter((e) => e.isDir || !exts.length || exts.includes(e.ext));
  const isPinned = (e: E) => pins.some((p) => p.root === e.root && p.path === e.rel);

  async function post(fd: FormData) {
    setBusy(true);
    await fetch("/api/library/upload", { method: "POST", body: fd });
    setBusy(false);
    router.refresh();
  }
  function upload(files: FileList | null) {
    if (!files?.length) return;
    const fd = new FormData();
    fd.set("op", "upload"); fd.set("path", path);
    Array.from(files).forEach((f) => fd.append("files", f));
    post(fd);
  }
  function newFolder() {
    const name = window.prompt("Folder name");
    if (!name) return;
    const fd = new FormData(); fd.set("op", "mkdir"); fd.set("path", path); fd.set("name", name); post(fd);
  }
  function del(e: E) {
    if (!window.confirm(`Delete "${e.name}"? This cannot be undone.`)) return;
    const fd = new FormData(); fd.set("op", "delete"); fd.set("path", path); fd.set("target", e.rel); post(fd);
  }
  function print(e: E) {
    try { frame.current?.contentWindow?.print(); } catch { window.open(filesUrl(e.root, e.rel), "_blank"); }
  }

  const Actions = ({ e }: { e: E }) => (
    <div className="flex shrink-0 items-center gap-0.5">
      {PREVIEWABLE.has(e.ext) && <Button variant="ghost" size="sm" onClick={() => setPreview(e)}>Preview</Button>}
      <a className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Open in new tab" href={filesUrl(e.root, e.rel)} target="_blank"><ExternalLink className="size-4" /></a>
      <a className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Download" href={filesUrl(e.root, e.rel, true)}><Download className="size-4" /></a>
      <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title={isPinned(e) ? "Unpin" : "Pin to Today"} onClick={async () => { await togglePin(e.root, e.rel, e.name); router.refresh(); }}>
        {isPinned(e) ? <PinOff className="size-4 text-brand-600" /> : <Pin className="size-4" />}
      </button>
      {e.root === "mine" && <button className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Delete" onClick={() => del(e)}><Trash2 className="size-4" /></button>}
    </div>
  );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {TYPES.map(([k, label]) => (
            <button key={k} onClick={() => setType(k)} className={"rounded-full border px-3 py-1 text-xs font-medium " + (type === k ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>{label}</button>
          ))}
        </div>
        {root === "mine" && !searching && (
          <div className="ml-auto flex gap-2">
            <input ref={fileInput} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
            <Button variant="secondary" size="sm" disabled={busy} onClick={newFolder}><FolderPlus className="size-3.5" /> New folder</Button>
            <Button size="sm" disabled={busy} onClick={() => fileInput.current?.click()}><Upload className="size-3.5" /> Add files</Button>
          </div>
        )}
      </div>

      <Card>
        {shown.length === 0 ? (
          <EmptyState icon={Folder} title={searching ? "No files match" : "This folder is empty"}
            description={root === "mine" ? "Use Add files to put your worksheets, tests and slides here." : "Nothing here."} />
        ) : view === "grid" ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((e) => {
              const I = icon(e);
              return (
                <div key={e.root + e.rel} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start gap-2.5">
                    <I className="mt-0.5 size-5 shrink-0 text-brand-600" />
                    <div className="min-w-0 flex-1">
                      {e.isDir ? <Link href={`/library?root=${e.root}&path=${encodeURIComponent(e.rel)}`} className="block truncate text-sm font-medium text-slate-900 hover:text-brand-600">{e.name}</Link>
                        : <div className="truncate text-sm font-medium text-slate-900" title={e.name}>{e.name}</div>}
                      {searching && <div className="truncate text-xs text-slate-400">{e.rel}</div>}
                      {!e.isDir && <div className="text-xs text-slate-500">{e.ext.toUpperCase()} · {size(e.size)}</div>}
                    </div>
                  </div>
                  {!e.isDir && <div className="mt-2"><Actions e={e} /></div>}
                </div>
              );
            })}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {shown.map((e) => {
              const I = icon(e);
              return (
                <li key={e.root + e.rel} className="flex items-center gap-3 px-4 py-2.5">
                  <I className="size-4 shrink-0 text-brand-600" />
                  <div className="min-w-0 flex-1">
                    {e.isDir ? <Link href={`/library?root=${e.root}&path=${encodeURIComponent(e.rel)}`} className="block truncate text-sm font-medium text-slate-900 hover:text-brand-600">{e.name}</Link>
                      : <span className="block truncate text-sm text-slate-800" title={e.name}>{e.name}</span>}
                    {searching && <span className="block truncate text-xs text-slate-400">{e.rel}</span>}
                  </div>
                  {!e.isDir && <span className="hidden text-xs text-slate-400 sm:block">{size(e.size)}</span>}
                  {e.isDir ? (e.root === "mine" && <button className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Delete folder" onClick={() => del(e)}><Trash2 className="size-4" /></button>) : <Actions e={e} />}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal open={!!preview} onClose={() => setPreview(null)} wide title={preview?.name ?? ""}
        footer={preview && <>
          <Button variant="secondary" onClick={() => print(preview)}><Printer className="size-4" /> Print</Button>
          <a className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700" href={filesUrl(preview.root, preview.rel)} target="_blank"><ExternalLink className="size-4" /> Open full page</a>
        </>}>
        {preview && <iframe ref={frame} title={preview.name} src={filesUrl(preview.root, preview.rel)} className="h-[65vh] w-full rounded-lg border border-slate-200 bg-white" />}
      </Modal>
    </>
  );
}
