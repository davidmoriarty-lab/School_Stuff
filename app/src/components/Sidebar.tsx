"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sun, FileText, Users, Library, ScanLine, GraduationCap, BarChart3, ClipboardCheck, Printer, FlaskConical,
  CalendarDays, ListChecks, Contact, ClipboardList, AlarmClock, HelpCircle, FileCheck2, BookOpen, Route, FolderOpen, PencilRuler, LayoutGrid, Wrench, Share2, Settings, Gauge,
} from "lucide-react";
import type { ModuleKey } from "@/lib/settings";

type Item = { href: string; label: string; icon: typeof Sun; module?: ModuleKey };
const groups: { label: string; items: Item[] }[] = [
  { label: "Today", items: [{ href: "/", label: "Today", icon: Sun }] },
  {
    label: "Plan",
    items: [
      { href: "/calendar", label: "Calendar", icon: CalendarDays, module: "calendar" },
      { href: "/todos", label: "To-do list", icon: ListChecks, module: "todo" },
      { href: "/lessons", label: "Lesson plans", icon: BookOpen, module: "lessons" },
      { href: "/pacing", label: "Pacing guides", icon: Route, module: "pacing" },
      { href: "/subplans", label: "Sub plans", icon: ClipboardList, module: "subplans" },
      { href: "/bell-schedules", label: "Bell schedules", icon: AlarmClock, module: "subplans" },
    ],
  },
  {
    label: "Materials",
    items: [
      { href: "/library", label: "Library", icon: FolderOpen, module: "library" },
      { href: "/worksheets", label: "Worksheet builder", icon: PencilRuler, module: "worksheets" },
      { href: "/questions", label: "Question bank", icon: HelpCircle, module: "questions" },
      { href: "/testbuilder", label: "Test builder", icon: FileCheck2, module: "questions" },
    ],
  },
  {
    label: "Classroom",
    items: [
      { href: "/profiles", label: "Student profiles", icon: Contact, module: "profiles" },
      { href: "/seating", label: "Seating charts", icon: LayoutGrid, module: "seating" },
      { href: "/tools", label: "Classroom tools", icon: Wrench, module: "tools" },
    ],
  },
  {
    label: "Gradebook",
    items: [
      { href: "/gradebook", label: "Overview", icon: Gauge, module: "gradebook" },
      { href: "/tests", label: "Tests & templates", icon: FileText, module: "gradebook" },
      { href: "/curriculum", label: "Curriculum", icon: Library, module: "gradebook" },
      { href: "/rosters", label: "Rosters", icon: Users, module: "gradebook" },
      { href: "/scan", label: "Scan sheets", icon: ScanLine, module: "gradebook" },
      { href: "/midterm", label: "Midterm scoring", icon: ClipboardCheck, module: "gradebook" },
      { href: "/students", label: "Students", icon: GraduationCap, module: "gradebook" },
      { href: "/classes", label: "Classes", icon: BarChart3, module: "gradebook" },
      { href: "/reports", label: "Reports & PDFs", icon: Printer, module: "gradebook" },
    ],
  },
  { label: "More", items: [{ href: "/share", label: "Share packages", icon: Share2, module: "share" }, { href: "/settings", label: "Settings", icon: Settings }] },
];

function visible(modules: Record<ModuleKey, boolean>) {
  return groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.module || modules[i.module]) }))
    .filter((g) => g.items.length);
}

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

export function Sidebar({ appName, modules }: { appName: string; modules: Record<ModuleKey, boolean> }) {
  const pathname = usePathname();
  return (
    <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <FlaskConical className="size-4" />
        </span>
        <span className="text-sm font-semibold leading-tight text-slate-900">{appName}</span>
      </Link>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        {visible(modules).map((g) => (
          <div key={g.label}>
            <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.label}</div>
            <ul className="space-y-0.5">
              {g.items.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors " +
                      (isActive(pathname, href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
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
export function MobileNav({ modules }: { modules: Record<ModuleKey, boolean> }) {
  const pathname = usePathname();
  const items = visible(modules).flatMap((g) => g.items);
  return (
    <nav className="no-print flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden">
      {items.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={"whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium " + (isActive(pathname, href) ? "bg-brand-50 text-brand-700" : "text-slate-600")}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
