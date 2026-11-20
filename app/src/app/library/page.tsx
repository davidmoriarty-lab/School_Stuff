import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { ROOT_LABEL, isRoot, listDir, searchFiles, type RootKey } from "@/lib/library";
import { getSettings } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import { QuickSettings } from "@/components/QuickSettings";
import { LibraryBrowser } from "./LibraryBrowser";

export const dynamic = "force-dynamic";
type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function LibraryPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const root: RootKey = isRoot(one(sp.root)) ? (one(sp.root) as RootKey) : "class";
  const rel = one(sp.path).replace(/^\/+|\/+$/g, "");
  const q = one(sp.q).trim();
  const s = getSettings();
  const view = (s.prefs.library?.view as string) ?? "list";

  const entries = q
    ? searchFiles(q).map(({ root: r, e }) => ({ ...e, root: r }))
    : listDir(root, rel).map((e) => ({ ...e, root }));
  const crumbs = rel ? rel.split("/") : [];

  return (
    <>
      <PageHeader
        title="Library"
        subtitle="Every worksheet, test, packet and simulation in one place. Preview, print or pin anything."
        actions={<QuickSettings page="library" title="Library options" prefs={s.prefs} fields={[
          { key: "view", label: "Show files as", kind: "select", def: "list", options: [["list", "List"], ["grid", "Cards"]] },
        ]} />}
      />
      <form className="mb-4 flex flex-wrap items-center gap-2" action="/library">
        <input type="hidden" name="root" value={root} />
        <input name="q" defaultValue={q} placeholder="Search all files by name (for example: stoichiometry packet)" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        <button className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700">Search</button>
        {q && <Link href={`/library?root=${root}`} className="text-sm text-slate-500 hover:text-brand-600">Clear</Link>}
      </form>
      {!q && (
        <div className="mb-4 flex flex-wrap items-center gap-1 text-sm">
          {(["class", "mine"] as RootKey[]).map((r) => (
            <Link key={r} href={`/library?root=${r}`} className={"rounded-lg px-3 py-1.5 font-medium " + (r === root ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100")}>{ROOT_LABEL[r]}</Link>
          ))}
          <span className="mx-2 h-4 w-px bg-slate-200" />
          <Link href={`/library?root=${root}`} className="inline-flex items-center gap-1 text-slate-500 hover:text-brand-600"><Home className="size-3.5" /></Link>
          {crumbs.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <ChevronRight className="size-3.5 text-slate-300" />
              <Link href={`/library?root=${root}&path=${encodeURIComponent(crumbs.slice(0, i + 1).join("/"))}`} className="text-slate-600 hover:text-brand-600">{c}</Link>
            </span>
          ))}
        </div>
      )}
      {q && <p className="mb-3 text-sm text-slate-500">{entries.length} result{entries.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;{entries.length >= 200 ? " (showing the first 200)" : ""}</p>}
      <LibraryBrowser entries={entries} root={root} path={rel} searching={Boolean(q)} view={view} pins={s.pins} />
    </>
  );
}
