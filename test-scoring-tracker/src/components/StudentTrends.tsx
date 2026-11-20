"use client";

import { useMemo, useState } from "react";
import type { StudentData } from "@/lib/analytics";
import { SERIES, SHAPES, INK, type Shape } from "@/lib/chartColors";
import { Card, CardHeader } from "./ui";
import { LineChart, type ChartSeries } from "./charts/LineChart";

const UNIT_9 = { color: "#475569", shape: "diamond" as Shape }; // a ninth unit never reuses a hue; it gets a neutral + its own marker

const mean = (v: (number | null)[]) => {
  const x = v.filter((n): n is number => n != null);
  return x.length ? x.reduce((a, b) => a + b, 0) / x.length : 101;
};

function Chip({ on, onClick, color, children, title }: { on: boolean; onClick: () => void; color?: string; children: React.ReactNode; title?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      title={title}
      className={"inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors " + (on ? "border-slate-300 bg-white text-slate-900 shadow-sm" : "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200")}
    >
      {color && <span className="inline-block size-2.5 rounded-full" style={{ background: on ? color : INK.axis }} />}
      {children}
    </button>
  );
}

export function StudentTrends({ data }: { data: StudentData }) {
  const [testSel, setTestSel] = useState<Set<number>>(() => new Set(data.tests.map((t) => t.id)));
  const [mode, setMode] = useState<"units" | "topics">("units");
  const [showClass, setShowClass] = useState(true);

  // Default to the (up to) four weakest units so the chart starts readable.
  const [unitSel, setUnitSel] = useState<Set<number>>(() => {
    const ranked = [...data.units].sort((a, b) => mean(a.student) - mean(b.student));
    return new Set(ranked.slice(0, 4).map((u) => u.num));
  });
  // A topic keeps the color slot it was given when selected until it is removed, so other lines never repaint.
  const [topicSlots, setTopicSlots] = useState<Record<string, number>>({});

  const idx = data.tests.map((t, i) => (testSel.has(t.id) ? i : -1)).filter((i) => i >= 0);
  const pick = <T,>(arr: T[]) => idx.map((i) => arr[i]);
  const xLabels = pick(data.tests.map((t) => t.name));

  const toggleTopic = (code: string) =>
    setTopicSlots((prev) => {
      if (code in prev) { const { [code]: _drop, ...rest } = prev; void _drop; return rest; }
      const used = new Set(Object.values(prev));
      const free = SERIES.findIndex((_, s) => !used.has(s));
      return free < 0 ? prev : { ...prev, [code]: free };
    });

  const unitStyle = (num: number) => (num >= 1 && num <= 8 ? { color: SERIES[num - 1], shape: SHAPES[num - 1] } : UNIT_9);

  const overall: ChartSeries[] = [
    { id: "me", label: "This student", color: SERIES[0], values: pick(data.overall.student), counts: pick(data.overall.n) },
    ...(showClass ? [{ id: "cls", label: "Class average", color: INK.context, dashed: true, values: pick(data.overall.cls) } as ChartSeries] : []),
  ];

  const detail = useMemo<ChartSeries[]>(() => {
    const out: ChartSeries[] = [];
    if (mode === "units") {
      for (const u of data.units.filter((u) => unitSel.has(u.num))) {
        const st = unitStyle(u.num);
        out.push({ id: `u${u.num}`, label: `Unit ${u.num}`, color: st.color, shape: st.shape, values: pick(u.student), counts: pick(u.n) });
        if (showClass) out.push({ id: `u${u.num}c`, label: `Unit ${u.num} class avg`, color: st.color, dashed: true, inLegend: false, values: pick(u.cls) });
      }
    } else {
      for (const t of data.topics.filter((t) => t.code in topicSlots)) {
        const slot = topicSlots[t.code];
        out.push({ id: `t${t.code}`, label: t.code, color: SERIES[slot], shape: SHAPES[slot], values: pick(t.student), counts: pick(t.n) });
        if (showClass) out.push({ id: `t${t.code}c`, label: `${t.code} class avg`, color: SERIES[slot], dashed: true, inLegend: false, values: pick(t.cls) });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, unitSel, topicSlots, showClass, testSel, data]);

  const flip = <T,>(set: Set<T>, v: T) => { const n = new Set(set); if (n.has(v)) n.delete(v); else n.add(v); return n; };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Which tests to include" description="Turn tests off to narrow every chart below." />
        <div className="flex flex-wrap items-center gap-2 px-5 py-4">
          {data.tests.map((t) => (
            <Chip key={t.id} on={testSel.has(t.id)} onClick={() => setTestSel(flip(testSel, t.id))}>{t.name}</Chip>
          ))}
          <button className="ml-2 text-xs font-medium text-brand-600 hover:underline" onClick={() => setTestSel(new Set(data.tests.map((t) => t.id)))}>All</button>
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={showClass} onChange={(e) => setShowClass(e.target.checked)} className="size-4 accent-brand-600" />
            Show class average
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader title="Overall score by test" description="Percent of points earned. The dashed line is the class average." />
        <div className="px-5 pb-4 pt-3">
          <LineChart title="Overall score by test" xLabels={xLabels} series={overall} empty="Turn at least one test on above." />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Trend by unit and topic"
          description="Pulls from every test that has questions in the unit or topic, even mixed tests like midterms."
          actions={
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-xs font-medium">
              {(["units", "topics"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={"px-3 py-1.5 capitalize " + (mode === m ? "bg-brand-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>{m}</button>
              ))}
            </div>
          }
        />
        <div className="max-h-44 overflow-y-auto border-b border-slate-100 px-5 py-3">
          {mode === "units" ? (
            <div className="flex flex-wrap gap-2">
              {data.units.map((u) => (
                <Chip key={u.num} on={unitSel.has(u.num)} color={unitStyle(u.num).color} title={u.title} onClick={() => setUnitSel(flip(unitSel, u.num))}>
                  Unit {u.num}
                </Chip>
              ))}
              {data.units.length === 0 && <span className="text-sm text-slate-500">No points are tagged with units yet.</span>}
            </div>
          ) : (
            <div className="space-y-2">
              {Array.from(new Set(data.topics.map((t) => t.unitNum))).map((un) => (
                <div key={un} className="flex flex-wrap items-center gap-2">
                  <span className="w-14 shrink-0 text-xs font-semibold text-slate-500">Unit {un}</span>
                  {data.topics.filter((t) => t.unitNum === un).map((t) => (
                    <Chip key={t.code} on={t.code in topicSlots} color={t.code in topicSlots ? SERIES[topicSlots[t.code]] : undefined} title={t.title} onClick={() => toggleTopic(t.code)}>
                      {t.code}
                    </Chip>
                  ))}
                </div>
              ))}
              {data.topics.length === 0 && <span className="text-sm text-slate-500">No points are tagged with topics yet.</span>}
              {Object.keys(topicSlots).length >= SERIES.length && <p className="text-xs text-amber-700">Eight topics is the most that can be compared at once.</p>}
            </div>
          )}
        </div>
        <div className="px-5 pb-4 pt-3">
          <LineChart
            title={`Trend by ${mode === "units" ? "unit" : "topic"}`}
            xLabels={xLabels}
            series={detail}
            empty={mode === "units" ? "Choose one or more units above." : "Choose one or more topics above to compare them."}
          />
        </div>
      </Card>
    </div>
  );
}
