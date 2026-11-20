"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, Users, Library, ScanLine, GraduationCap, BarChart3, ClipboardCheck, Printer, FlaskConical,
} from "lucide-react";

const groups = [
  {
    label: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Set up",
    items: [
      { href: "/tests", label: "Tests & templates", icon: FileText },
      { href: "/curriculum", label: "Curriculum", icon: Library },
      { href: "/rosters", label: "Rosters", icon: Users },
    ],
  },
  {
    label: "Score",
    items: [
      { href: "/scan", label: "Scan sheets", icon: ScanLine },
      { href: "/midterm", label: "Midterm scoring", icon: ClipboardCheck },
    ],
  },
  {
    label: "Analyze",
    items: [
      { href: "/students", label: "Students", icon: GraduationCap },
      { href: "/classes", label: "Classes", icon: BarChart3 },
      { href: "/reports", label: "Reports & PDFs", icon: Printer },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <FlaskConical className="size-4" />
        </span>
        <span className="text-sm font-semibold leading-tight text-slate-900">
          Test Scoring
          <span className="block text-xs font-normal text-slate-500">Tracker</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.label}</div>
            <ul className="space-y-0.5">
              {g.items.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors " +
                      (active(href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
                    }
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

/** Compact top bar shown on narrow screens in place of the sidebar. */
export function MobileNav() {
  const pathname = usePathname();
  const items = groups.flatMap((g) => g.items);
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden">
      {items.map(({ href, label }) => {
        const on = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={"whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium " + (on ? "bg-brand-50 text-brand-700" : "text-slate-600")}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
