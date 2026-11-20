"use client";
import { Printer } from "lucide-react";

/** A button that opens the browser's print dialog. */
export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="no-print inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700">
      <Printer className="size-4" /> {label}
    </button>
  );
}
