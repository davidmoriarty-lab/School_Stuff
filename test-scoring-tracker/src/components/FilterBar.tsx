"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "./ui";

export type Filter = { name: string; label: string; value: string; options: { value: string; label: string }[] };

/** A row of dropdowns that write their choice into the page's URL (so the view can be reloaded or bookmarked). */
export function FilterBar({ filters }: { filters: Filter[] }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();

  const set = (name: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value); else next.delete(name);
    router.replace(`${path}?${next.toString()}`, { scroll: false });
  };

  return (
    <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      {filters.map((f) => (
        <label key={f.name} className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">{f.label}</span>
          <Select value={f.value} onChange={(e) => set(f.name, e.target.value)} className="w-52">
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </label>
      ))}
    </div>
  );
}
