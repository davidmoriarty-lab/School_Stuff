"use client";

import { useRef, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type Action = (formData: FormData) => void | Promise<void>;

/**
 * A delete button that asks first. Clicking it opens a confirmation window; nothing is deleted until the person
 * clicks the red button inside it. The window starts focused on Cancel, so pressing Enter by accident is safe.
 */
export function ConfirmDelete({
  action, fields, title, message, confirmLabel = "Delete", triggerClassName, triggerLabel, formClassName, children,
}: {
  action: Action;
  fields: Record<string, string | number>;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  triggerClassName?: string;
  triggerLabel?: string;
  formClassName?: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();

  return (
    <form action={action} className={formClassName} onSubmit={close}>
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="button" className={triggerClassName} aria-label={triggerLabel} onClick={() => dialog.current?.showModal()}>
        {children}
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => { if (e.target === dialog.current) close(); }}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-[2px]"
      >
        <div className="flex items-start gap-3 p-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"><AlertTriangle className="size-5" /></span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-3">
          <button type="button" autoFocus onClick={close} className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700">
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </form>
  );
}
