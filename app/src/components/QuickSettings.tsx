"use client";
// The little gear button on a page. It opens a pop-up with just that page's options, so pages stay uncluttered.
// Values are saved into settings.prefs[page][key].
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Modal } from "./Modal";
import { Button, Input, Select } from "./ui";
import { saveSettingsAction } from "@/lib/storeActions";
import type { Settings } from "@/lib/settings";

export type QField =
  | { key: string; label: string; kind: "bool"; def: boolean; hint?: string }
  | { key: string; label: string; kind: "select"; def: string; options: [string, string][]; hint?: string }
  | { key: string; label: string; kind: "number"; def: number; min?: number; max?: number; hint?: string }
  | { key: string; label: string; kind: "text"; def: string; hint?: string };

export function QuickSettings({
  page, title, fields, prefs, label = "Options",
}: { page: string; title: string; fields: QField[]; prefs: Settings["prefs"]; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initial = () => Object.fromEntries(fields.map((f) => [f.key, prefs[page]?.[f.key] ?? f.def]));
  const [vals, setVals] = useState<Record<string, string | number | boolean>>(initial);

  async function save() {
    await saveSettingsAction({ prefs: { ...prefs, [page]: { ...(prefs[page] ?? {}), ...vals } } });
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => { setVals(initial()); setOpen(true); }}>
        <SlidersHorizontal className="size-3.5" /> {label}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></>}
      >
        <div className="space-y-4">
          {fields.map((f) => (
            <label key={f.key} className="block">
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-800">{f.label}</span>
                {f.kind === "bool" && (
                  <input type="checkbox" className="size-4 accent-[var(--color-brand-600)]" checked={Boolean(vals[f.key])}
                    onChange={(e) => setVals({ ...vals, [f.key]: e.target.checked })} />
                )}
              </span>
              {f.hint && <span className="block text-xs text-slate-500">{f.hint}</span>}
              {f.kind === "select" && (
                <Select className="mt-1" value={String(vals[f.key])} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}>
                  {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              )}
              {f.kind === "number" && (
                <Input className="mt-1" type="number" min={f.min} max={f.max} value={Number(vals[f.key])}
                  onChange={(e) => setVals({ ...vals, [f.key]: Number(e.target.value) })} />
              )}
              {f.kind === "text" && (
                <Input className="mt-1" value={String(vals[f.key])} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
              )}
            </label>
          ))}
        </div>
      </Modal>
    </>
  );
}
