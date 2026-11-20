"use client";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

export function PrintBar({ uid, mode }: { uid: string; mode: string }) {
  return (
    <div className="no-print sticky top-0 z-10 mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      <Link href={`/worksheets/${uid}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="size-4" /> Back to editor</Link>
      <div className="mx-2 flex gap-1">
        {([["student", "Student copy"], ["key", "Answer key"], ["both", "Both"]] as const).map(([m, l]) => (
          <Link key={m} href={`/worksheets/${uid}/print?mode=${m}`} className={"rounded-lg px-3 py-1.5 text-sm font-medium " + (mode === m ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100")}>{l}</Link>
        ))}
      </div>
      <button onClick={() => window.print()} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"><Printer className="size-4" /> Print</button>
    </div>
  );
}
