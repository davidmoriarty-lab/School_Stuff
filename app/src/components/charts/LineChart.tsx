"use client";

import { useMemo, useState } from "react";
import { Table2, LineChart as LineIcon } from "lucide-react";
import { INK, type Shape } from "@/lib/chartColors";

export type ChartSeries = {
  id: string;
  label: string;
  color: string;
  shape?: Shape;
  values: (number | null)[];
  dashed?: boolean;
  /** Set false to keep a series out of the legend (a "dashed = class average" note covers it instead). */
  inLegend?: boolean;
  /** Optional per-point sample size shown in the tooltip, e.g. how many points the % is based on. */
  counts?: number[];
};

const W = 720, H = 300, M = { l: 44, r: 118, t: 14, b: 62 };
const PW = W - M.l - M.r, PH = H - M.t - M.b;

function Marker({ shape, x, y, color }: { shape: Shape; x: number; y: number; color: string }) {
  const common = { fill: color, stroke: INK.surface, strokeWidth: 2 };
  if (shape === "square") return <rect x={x - 4.5} y={y - 4.5} width={9} height={9} rx={1.5} {...common} />;
  if (shape === "diamond") return <rect x={x - 4.5} y={y - 4.5} width={9} height={9} rx={1} transform={`rotate(45 ${x} ${y})`} {...common} />;
  if (shape === "triangle") return <polygon points={`${x},${y - 5.5} ${x + 5.5},${y + 4.5} ${x - 5.5},${y + 4.5}`} {...common} />;
  return <circle cx={x} cy={y} r={4.5} {...common} />;
}

const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/** Percent line chart over a list of tests. Hover shows every series at that test. */
export function LineChart({ title, xLabels, series, empty = "No data to show yet." }: { title: string; xLabels: string[]; series: ChartSeries[]; empty?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const n = xLabels.length;
  const x = (i: number) => M.l + (n <= 1 ? PW / 2 : (i / (n - 1)) * PW);
  const y = (v: number) => M.t + PH - (v / 100) * PH;

  const hasData = series.some((s) => s.values.some((v) => v != null));

  // End-of-line labels for up to 4 series, nudged apart so they never overlap.
  const labels = useMemo(() => {
    const solid = series.filter((s) => !s.dashed);
    if (solid.length > 4) return [];
    const ends = solid
      .map((s) => { const i = s.values.map((v) => v != null).lastIndexOf(true); return i < 0 ? null : { s, i, y: y(s.values[i]!) }; })
      .filter((e): e is { s: ChartSeries; i: number; y: number } => !!e)
      .sort((a, b) => a.y - b.y);
    for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 13) ends[k].y = ends[k - 1].y + 13;
    return ends;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, n]);

  if (!hasData) return <p className="px-5 py-10 text-center text-sm text-slate-500">{empty}</p>;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-1 pb-2">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Legend">
          {series.filter((s) => s.inLegend !== false).map((s) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <svg width="22" height="10" aria-hidden><line x1="0" y1="5" x2="22" y2="5" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "4 3" : undefined} />{!s.dashed && <Marker shape={s.shape ?? "circle"} x={11} y={5} color={s.color} />}</svg>
              {s.label}
            </li>
          ))}
          {series.some((s) => s.inLegend === false) && (
            <li className="flex items-center gap-1.5 text-slate-500">
              <svg width="22" height="10" aria-hidden><line x1="0" y1="5" x2="22" y2="5" stroke={INK.context} strokeWidth="2" strokeDasharray="4 3" /></svg>
              Dashed = class average
            </li>
          )}
        </ul>
        <button onClick={() => setTable(!table)} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">
          {table ? <LineIcon className="size-3.5" /> : <Table2 className="size-3.5" />} {table ? "Chart" : "Table"}
        </button>
      </div>

      {table ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500"><th className="py-1.5 pr-3 font-medium">Test</th>{series.map((s) => <th key={s.id} className="px-2 py-1.5 font-medium">{s.label}</th>)}</tr></thead>
            <tbody>
              {xLabels.map((l, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3 text-slate-700">{l}</td>
                  {series.map((s) => <td key={s.id} className="px-2 py-1.5 tabular-nums text-slate-700">{s.values[i] == null ? "–" : `${Math.round(s.values[i]!)}%`}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label={title}
            onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const px = ((e.clientX - r.left) / r.width) * W;
              let best = 0, bd = Infinity;
              for (let i = 0; i < n; i++) { const d = Math.abs(x(i) - px); if (d < bd) { bd = d; best = i; } }
              setHover(best);
            }}
          >
            {[0, 25, 50, 75, 100].map((g) => (
              <g key={g}>
                <line x1={M.l} x2={W - M.r} y1={y(g)} y2={y(g)} stroke={g === 0 ? INK.axis : INK.grid} strokeWidth={1} />
                <text x={M.l - 8} y={y(g) + 4} textAnchor="end" fontSize="11" fill={INK.muted}>{g}%</text>
              </g>
            ))}
            {xLabels.map((l, i) => (
              <text key={i} x={x(i)} y={H - M.b + 16} fontSize="11" fill={INK.secondary} textAnchor={n > 5 ? "end" : "middle"} transform={n > 5 ? `rotate(-30 ${x(i)} ${H - M.b + 16})` : undefined}>
                {short(l, n > 5 ? 16 : 22)}
              </text>
            ))}

            {hover != null && <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={M.t + PH} stroke={INK.axis} strokeWidth={1} strokeDasharray="3 3" />}

            {series.map((s) => {
              const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)] as const));
              const path = pts.filter((p): p is readonly [number, number] => !!p).map((p, k) => `${k ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
              return (
                <g key={s.id}>
                  <path d={path} fill="none" stroke={s.color} strokeWidth={s.dashed ? 1.75 : 2.25} strokeDasharray={s.dashed ? "5 4" : undefined} strokeLinejoin="round" strokeLinecap="round" />
                  {!s.dashed && pts.map((p, i) => p && <Marker key={i} shape={s.shape ?? "circle"} x={p[0]} y={p[1]} color={s.color} />)}
                  {hover != null && s.dashed && pts[hover] && <circle cx={pts[hover]![0]} cy={pts[hover]![1]} r={3.5} fill={s.color} stroke={INK.surface} strokeWidth={2} />}
                </g>
              );
            })}

            {labels.map(({ s, i, y: ly }) => (
              <text key={s.id} x={x(i) + 12} y={ly + 4} fontSize="11.5" fill={INK.primary} fontWeight={600}>{short(s.label, 17)}</text>
            ))}
          </svg>

          {hover != null && (
            <div
              className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
              style={{ left: `${(x(hover) / W) * 100}%`, transform: hover > n / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
            >
              <div className="mb-1 font-semibold text-slate-900">{xLabels[hover]}</div>
              {series.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-4 py-0.5">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="inline-block h-0.5 w-3" style={{ background: s.color, opacity: s.dashed ? 0.6 : 1 }} />{s.label}
                  </span>
                  <span className="tabular-nums text-slate-900">
                    {s.values[hover] == null ? "–" : `${Math.round(s.values[hover]!)}%`}
                    {s.counts?.[hover] ? <span className="ml-1 text-slate-400">({s.counts[hover]} pts)</span> : null}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
