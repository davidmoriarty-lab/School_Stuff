import type { ReactNode } from "react";
import { BAR, BAR_TRACK, SERIES } from "@/lib/chartColors";

export type BarRow = { key: string; label: ReactNode; sub?: ReactNode; value: number; valueLabel: string; title?: string };

/** Horizontal bars on a 0-100% track. Thin bars, rounded data end, value printed beside each bar. */
export function HBars({ rows, color = BAR, empty = "Nothing to show yet." }: { rows: BarRow[]; color?: string; empty?: string }) {
  if (!rows.length) return <p className="px-5 py-8 text-center text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((r) => (
        <li key={r.key} title={r.title} className="grid grid-cols-[minmax(0,14rem)_1fr_4.5rem] items-center gap-4 px-5 py-2.5 hover:bg-slate-50 sm:grid-cols-[minmax(0,18rem)_1fr_4.5rem]">
          <div className="min-w-0">
            <div className="break-words text-sm font-medium text-slate-800">{r.label}</div>
            {r.sub && <div className="break-words text-xs text-slate-500">{r.sub}</div>}
          </div>
          <div className="h-2.5 rounded-full" style={{ background: BAR_TRACK }} aria-hidden>
            <div className="h-full rounded-r-[4px] rounded-l-full" style={{ width: `${Math.max(1.5, Math.min(100, r.value))}%`, background: color }} />
          </div>
          <div className="text-right text-sm tabular-nums text-slate-900">{r.valueLabel}</div>
        </li>
      ))}
    </ul>
  );
}

export type GroupRow = { key: string; label: ReactNode; a: number | null; b: number | null; nA: number; nB: number };

/** Two bars per category (period A in blue, period B in orange), with a legend and the numbers printed. */
export function GroupedBars({ rows, aLabel, bLabel }: { rows: GroupRow[]; aLabel: string; bLabel: string }) {
  if (!rows.length) return <p className="px-5 py-8 text-center text-sm text-slate-500">No overlapping data to compare yet.</p>;
  const bar = (v: number | null, color: string) => (
    <div className="flex items-center gap-2">
      <div className="h-2.5 flex-1 rounded-full" style={{ background: BAR_TRACK }} aria-hidden>
        {v != null && <div className="h-full rounded-r-[4px] rounded-l-full" style={{ width: `${Math.max(1.5, v)}%`, background: color }} />}
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-slate-900">{v == null ? "–" : `${Math.round(v)}%`}</span>
    </div>
  );
  return (
    <div>
      <ul className="flex gap-5 px-5 pb-1 pt-4 text-xs text-slate-600">
        {[[aLabel, SERIES[0]], [bLabel, SERIES[1]]].map(([l, c]) => (
          <li key={c} className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm" style={{ background: c }} />{l}</li>
        ))}
      </ul>
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => (
          <li key={r.key} className="grid grid-cols-[minmax(0,12rem)_1fr] items-center gap-4 px-5 py-2.5 hover:bg-slate-50 sm:grid-cols-[minmax(0,18rem)_1fr]" title={`${aLabel}: ${r.nA} points · ${bLabel}: ${r.nB} points`}>
            <div className="truncate text-sm font-medium text-slate-800">{r.label}</div>
            <div className="space-y-1.5">{bar(r.a, SERIES[0])}{bar(r.b, SERIES[1])}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
