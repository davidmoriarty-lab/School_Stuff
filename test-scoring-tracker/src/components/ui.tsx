import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export function PageHeader({
  title, subtitle, actions, back,
}: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <header className="mb-6">
      {back && <div className="mb-2 text-sm">{back}</div>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Card({ className, ...p }: ComponentProps<"section">) {
  return <section className={cx("rounded-xl border border-slate-200 bg-white shadow-sm", className)} {...p} />;
}

export function CardHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap";
const btnVariants = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
  secondary: "border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100",
  danger: "text-red-600 hover:bg-red-50",
} as const;
const btnSizes = { sm: "px-2.5 py-1.5 text-xs", md: "px-3.5 py-2 text-sm" } as const;

export function buttonClass(variant: keyof typeof btnVariants = "primary", size: keyof typeof btnSizes = "md") {
  return cx(btnBase, btnVariants[variant], btnSizes[size]);
}

export function Button({
  variant = "primary", size = "md", className, ...p
}: ComponentProps<"button"> & { variant?: keyof typeof btnVariants; size?: keyof typeof btnSizes }) {
  return <button className={cx(buttonClass(variant, size), className)} {...p} />;
}

export const inputClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

// Fill the available width unless the caller sets its own width.
const widthClass = (c?: string) => (c && /(^|\s)(w-|flex-1)/.test(c) ? "" : "w-full");

export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input className={cx(inputClass, widthClass(className), className)} {...p} />;
}

export function Select({ className, ...p }: ComponentProps<"select">) {
  return <select className={cx(inputClass, widthClass(className), "pr-8", className)} {...p} />;
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "brand" | "green" | "amber" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    brand: "bg-brand-50 text-brand-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function EmptyState({
  icon: Icon, title, description, action,
}: { icon: LucideIcon; title: string; description: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Icon className="size-5" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, icon: Icon, hint }: { label: string; value: ReactNode; icon: LucideIcon; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        <Icon className="size-4 text-slate-400" />
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

export function ComingSoon({ phase }: { phase?: string }) {
  return <Badge tone="amber">{phase ?? "Coming soon"}</Badge>;
}
