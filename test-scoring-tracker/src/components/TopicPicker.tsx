"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { BookOpen, Check, Search, X, ChevronDown } from "lucide-react";
import type { UnitT } from "@/lib/template";

type Pick = (topicId: number | null) => void;
type Ctx = { units: UnitT[]; open: (current: number | null, onPick: Pick) => void };
const PickerCtx = createContext<Ctx | null>(null);

/** Wrap a page once; every TopicField inside shares this single curriculum modal. */
export function TopicPickerHost({ units, courseName, children }: { units: UnitT[]; courseName: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const [onPick, setOnPick] = useState<Pick | null>(null);
  const [query, setQuery] = useState("");
  const [unitId, setUnitId] = useState<number | null>(null);

  const open = (cur: number | null, cb: Pick) => {
    setCurrent(cur);
    setOnPick(() => cb);
    setQuery("");
    const owner = units.find((u) => u.topics.some((t) => t.id === cur));
    setUnitId(owner?.id ?? units[0]?.id ?? null);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();
  const pick = (id: number | null) => { onPick?.(id); close(); };

  const q = query.trim().toLowerCase();
  const results = useMemo(
    () => (q ? units.flatMap((u) => u.topics.filter((t) => `${t.code} ${t.title} ${u.title}`.toLowerCase().includes(q)).map((t) => ({ u, t }))) : []),
    [q, units],
  );
  const active = units.find((u) => u.id === unitId);

  return (
    <PickerCtx.Provider value={{ units, open }}>
      {children}
      <dialog
        ref={dialog}
        onClick={(e) => { if (e.target === dialog.current) close(); }}
        className="m-auto w-[min(56rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-[2px]"
      >
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><BookOpen className="size-4" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-slate-900">Choose a unit and topic</h2>
              <p className="text-xs text-slate-500">{courseName} curriculum</p>
            </div>
            <button onClick={close} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="size-4" /></button>
          </div>

          {units.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-slate-500">
              No units are set up for {courseName} yet.{" "}
              <Link href="/curriculum" className="font-medium text-brand-600 hover:underline">Build its curriculum</Link>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-100 px-5 py-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search topics, e.g. net ionic, buffer, 4.3"
                    className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>
              <div className="flex min-h-0 flex-1">
                {!q && (
                  <ul className="w-64 shrink-0 overflow-y-auto border-r border-slate-100 p-2">
                    {units.map((u) => (
                      <li key={u.id}>
                        <button
                          onClick={() => setUnitId(u.id)}
                          className={"flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm " + (u.id === unitId ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-50")}
                        >
                          <span className="mt-px font-semibold">{u.number}</span>
                          <span className="leading-snug">{u.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <ul className="min-w-0 flex-1 overflow-y-auto p-2">
                  {q
                    ? results.length === 0
                      ? <li className="px-3 py-8 text-center text-sm text-slate-500">No topics match.</li>
                      : results.map(({ u, t }) => <TopicRow key={t.id} code={t.code} title={t.title} sub={`Unit ${u.number}: ${u.title}`} on={t.id === current} onClick={() => pick(t.id)} />)
                    : active?.topics.length
                      ? active.topics.map((t) => <TopicRow key={t.id} code={t.code} title={t.title} on={t.id === current} onClick={() => pick(t.id)} />)
                      : <li className="px-3 py-8 text-center text-sm text-slate-500">This unit has no topics yet.</li>}
                </ul>
              </div>
            </>
          )}

          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
            <Link href="/curriculum" className="text-xs text-slate-500 hover:text-brand-600">Edit curriculum</Link>
            <div className="flex gap-2">
              <button onClick={() => pick(null)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100">No topic</button>
              <button onClick={close} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      </dialog>
    </PickerCtx.Provider>
  );
}

function TopicRow({ code, title, sub, on, onClick }: { code: string; title: string; sub?: string; on: boolean; onClick: () => void }) {
  return (
    <li>
      <button onClick={onClick} className={"flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm " + (on ? "bg-brand-50" : "hover:bg-slate-50")}>
        <span className="w-10 shrink-0 font-mono text-xs font-semibold text-brand-700">{code}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-slate-900">{title}</span>
          {sub && <span className="block text-xs text-slate-500">{sub}</span>}
        </span>
        {on && <Check className="size-4 text-brand-600" />}
      </button>
    </li>
  );
}

/** A form field: shows the chosen topic and opens the curriculum modal. Submits as `topicId`. */
export function TopicField({
  defaultValue = null, name = "topicId", className = "", save,
}: {
  defaultValue?: number | null; name?: string; className?: string;
  /** When given, the choice is saved immediately through this server action instead of waiting for a form submit. */
  save?: { action: (f: FormData) => void | Promise<void>; fields: Record<string, string | number> };
}) {
  const ctx = useContext(PickerCtx);
  const [, startTransition] = useTransition();
  const choose = (id: number | null) => {
    setValue(id);
    if (!save) return;
    const fd = new FormData();
    Object.entries(save.fields).forEach(([k, v]) => fd.set(k, String(v)));
    fd.set(name, id == null ? "" : String(id));
    startTransition(() => { void save.action(fd); });
  };
  const [value, setValue] = useState<number | null>(defaultValue);
  useEffect(() => setValue(defaultValue), [defaultValue]);
  const found = ctx?.units.flatMap((u) => u.topics.map((t) => ({ ...t, unit: u }))).find((t) => t.id === value);

  return (
    <>
      <input type="hidden" name={name} value={value ?? ""} />
      <button
        type="button"
        onClick={() => ctx?.open(value, choose)}
        title={found ? `Unit ${found.unit.number}: ${found.unit.title}` : "Choose a unit and topic"}
        className={
          "inline-flex max-w-72 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm shadow-sm transition-colors " +
          (found ? "border-brand-100 bg-brand-50 text-brand-700 hover:bg-brand-100" : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50") + " " + className
        }
      >
        {found ? (
          <span className="truncate"><b className="font-semibold">{found.code}</b> {found.title}</span>
        ) : (
          <span>Choose topic…</span>
        )}
        <ChevronDown className="size-3.5 shrink-0 opacity-60" />
      </button>
    </>
  );
}
