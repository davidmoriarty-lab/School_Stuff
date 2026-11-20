"use client";
import { useEffect, useRef, useState } from "react";
import { Maximize2, Pause, Play, Printer, RotateCcw, Shuffle, Users } from "lucide-react";
import { Button, Card, CardHeader, Input, Select } from "@/components/ui";
import type { Student } from "@/lib/seating";

type Sec = { id: number; name: string };
const shuffle = <T,>(a: T[]) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

export function Tools({ sections, students }: { sections: Sec[]; students: Student[] }) {
  const [secId, setSecId] = useState<number | "">(sections[0]?.id ?? "");
  const roster = students.filter((s) => s.sectionId === secId);
  return (
    <div className="space-y-5">
      <Card className="p-4">
        <label className="flex items-center gap-3 text-sm font-medium text-slate-800">Class
          <Select className="!w-64" value={secId} onChange={(e) => setSecId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Choose a class…</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <span className="text-xs font-normal text-slate-500">{roster.length} students</span>
        </label>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Picker key={String(secId)} roster={roster} />
        <Groups key={"g" + secId} roster={roster} />
      </div>
      <Timer />
    </div>
  );
}

function Picker({ roster }: { roster: Student[] }) {
  const [shown, setShown] = useState("");
  const [used, setUsed] = useState<number[]>([]);
  const [rolling, setRolling] = useState(false);
  const [noRepeat, setNoRepeat] = useState(true);
  function pick() {
    const pool = noRepeat ? roster.filter((s) => !used.includes(s.id)) : roster;
    if (!pool.length) { setUsed([]); setShown("Everyone has gone! Starting over."); return; }
    setRolling(true);
    let n = 0;
    const t = setInterval(() => {
      setShown(pool[Math.floor(Math.random() * pool.length)].first);
      if (++n > 14) {
        clearInterval(t);
        const w = pool[Math.floor(Math.random() * pool.length)];
        setShown(`${w.first} ${w.last}`); setUsed((u) => [...u, w.id]); setRolling(false);
      }
    }, 70);
  }
  return (
    <Card>
      <CardHeader title="Random student" description="Cold-call without favorites" />
      <div className="px-5 py-6 text-center">
        <div className={"flex min-h-20 items-center justify-center text-4xl font-bold tracking-tight " + (rolling ? "text-slate-400" : "text-brand-700")}>{shown || "?"}</div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={pick} disabled={!roster.length || rolling}><Shuffle className="size-4" /> Pick a student</Button>
          <Button variant="secondary" onClick={() => { setUsed([]); setShown(""); }}><RotateCcw className="size-4" /> Reset</Button>
          <label className="flex items-center gap-1.5 text-xs text-slate-600"><input type="checkbox" className="accent-[var(--color-brand-600)]" checked={noRepeat} onChange={(e) => setNoRepeat(e.target.checked)} /> No repeats ({used.length}/{roster.length} called)</label>
        </div>
      </div>
    </Card>
  );
}

function Groups({ roster }: { roster: Student[] }) {
  const [size, setSize] = useState(4);
  const [groups, setGroups] = useState<Student[][]>([]);
  function make() {
    const s = shuffle(roster);
    const count = Math.max(1, Math.round(s.length / Math.max(1, size)));
    const g: Student[][] = Array.from({ length: count }, () => []);
    s.forEach((st, i) => g[i % count].push(st));
    setGroups(g);
  }
  return (
    <Card>
      <CardHeader title="Group maker" description="Random groups of about the size you choose" actions={groups.length > 0 && <Button variant="ghost" size="sm" onClick={() => window.print()}><Printer className="size-4" /> Print</Button>} />
      <div className="px-5 py-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">Group size<Input className="!w-20" type="number" min={2} max={12} value={size} onChange={(e) => setSize(Number(e.target.value))} /></label>
          <Button onClick={make} disabled={!roster.length}><Users className="size-4" /> Make groups</Button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {groups.map((g, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-2.5 text-sm"><div className="mb-1 text-xs font-semibold uppercase text-brand-700">Group {i + 1}</div>{g.map((s) => <div key={s.id}>{s.first} {s.last}</div>)}</div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function Timer() {
  const [secs, setSecs] = useState(300);
  const [left, setLeft] = useState(300);
  const [running, setRunning] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((l) => (l <= 1 ? 0 : l - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => {
    if (running && left === 0) {
      setRunning(false);
      try {
        const ctx = new AudioContext();
        [0, 0.35, 0.7].forEach((d) => { const o = ctx.createOscillator(); o.frequency.value = 880; o.connect(ctx.destination); o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.25); });
      } catch { /* no sound available */ }
    }
  }, [left, running]);
  const set = (s: number) => { setSecs(s); setLeft(s); setRunning(false); };
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  return (
    <Card>
      <CardHeader title="Timer" description="Countdown with a beep at zero" />
      <div ref={box} className="bg-white px-5 py-6 text-center">
        <div className={"text-7xl font-bold tabular-nums tracking-tight " + (left === 0 ? "text-red-600" : "text-slate-900")}>{mm}:{ss}</div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {[1, 2, 3, 5, 10, 15, 20].map((m) => <button key={m} onClick={() => set(m * 60)} className={"rounded-full border px-3 py-1 text-xs font-medium " + (secs === m * 60 ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>{m} min</button>)}
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button onClick={() => { if (left === 0) setLeft(secs); setRunning((r) => !r); }}>{running ? <><Pause className="size-4" /> Pause</> : <><Play className="size-4" /> Start</>}</Button>
          <Button variant="secondary" onClick={() => { setLeft(secs); setRunning(false); }}><RotateCcw className="size-4" /> Reset</Button>
          <Button variant="secondary" onClick={() => box.current?.requestFullscreen?.()}><Maximize2 className="size-4" /> Full screen</Button>
        </div>
      </div>
    </Card>
  );
}
