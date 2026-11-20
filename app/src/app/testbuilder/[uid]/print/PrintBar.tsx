"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

export function PrintBar({ uid, versions, selected, mode }: { uid: string; versions: number; selected: string[]; mode: string }) {
  const router = useRouter();
  const letters = "ABCD".slice(0, versions).split("");
  const go = (v: string[], m: string) => router.replace(`/testbuilder/${uid}/print?v=${v.join(",")}&mode=${m}`);
  return (
    <div className="no-print sticky top-0 z-10 mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      <Link href={`/testbuilder/${uid}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="size-4" /> Back to the test</Link>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-xs font-medium text-slate-500">Versions</span>
        {letters.map((l) => (
          <label key={l} className="flex items-center gap-1 text-slate-700"><input type="checkbox" className="accent-[var(--color-brand-600)]" checked={selected.includes(l)}
            onChange={() => { const n = selected.includes(l) ? selected.filter((x) => x !== l) : [...selected, l].sort(); if (n.length) go(n, mode); }} />{l}</label>
        ))}
      </div>
      <div className="flex gap-1">
        {([["student", "Student copies"], ["key", "Answer keys"], ["both", "Copies, then keys"]] as const).map(([m, l]) => (
          <button key={m} onClick={() => go(selected, m)} className={"rounded-lg px-3 py-1.5 text-sm font-medium " + (mode === m ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100")}>{l}</button>
        ))}
      </div>
      <button onClick={() => window.print()} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"><Printer className="size-4" /> Print</button>
    </div>
  );
}
