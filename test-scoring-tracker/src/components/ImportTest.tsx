"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, Copy, Check, AlertCircle, AlertTriangle, Loader2, FileSpreadsheet } from "lucide-react";
import type { ParseResult } from "@/lib/importTest";
import { Card, CardHeader, Button, Badge, Select, buttonClass } from "./ui";

const PROMPT = `I'm attaching a test (PDF) and an Excel import template for my scoring app. Please fill in the template so I can import the test.

- Read the "Instructions" sheet first and follow it exactly. Do not rename sheets, reorder columns, or change the header row.
- On "Test Info", fill in the Test Name (leave the Course as it is).
- On "Questions", add ONE ROW PER POINT, following the answer key's point values. A part (or a question with no parts) can have at most 3 points, so split anything bigger into parts A, B, C.
- For Topic, use only codes from the "Topic Reference" sheet, and keep the column as Text.
- For each point, give 2 to 5 realistic common wrong answers (short phrases, under 50 characters) in the Reason 1-6 columns. If several points share a mistake, you can instead list it once on the "Reasons" sheet (one reason per row). Do not add an "Other" reason.
- Return the finished file as an .xlsx.`;

type Preview = ParseResult & { error?: string };

export function ImportTest({ courses }: { courses: { id: number; name: string }[] }) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? 0);
  const [copied, setCopied] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"check" | "create" | null>(null);
  const [fail, setFail] = useState<string | null>(null);

  const send = async (f: File, mode: "preview" | "commit") => {
    const fd = new FormData();
    fd.set("file", f);
    fd.set("mode", mode);
    const res = await fetch("/api/import/test", { method: "POST", body: fd });
    return { res, json: await res.json() };
  };

  const check = async (f: File | undefined) => {
    setPreview(null);
    setFail(null);
    setFile(f ?? null);
    if (!f) return;
    setBusy("check");
    try {
      const { json } = await send(f, "preview");
      setPreview(json as Preview);
    } catch {
      setFail("Couldn't check the file. Try again.");
    } finally { setBusy(null); }
  };

  const create = async () => {
    if (!file) return;
    setBusy("create");
    setFail(null);
    try {
      const { res, json } = await send(file, "commit");
      if (!res.ok) { setFail(json.error ?? "Couldn't create the test."); return; }
      router.push(`/tests/${json.testId}`);
    } catch {
      setFail("Couldn't create the test. Try again.");
    } finally { setBusy(null); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(PROMPT); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };

  const t = preview?.test;
  const canCreate = !!t && !preview?.errors.length && busy === null;

  return (
    <Card>
      <CardHeader title="Import a test from Excel" description="Let Claude build the template from a test PDF, then upload it here." />
      <div className="divide-y divide-slate-100">
        <section className="px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900"><span className="mr-2 text-brand-600">1</span>Download the template</h3>
          <p className="mt-1 text-xs text-slate-500">It is pre-filled with the course&apos;s name and topic codes so Claude can tag each point.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select value={courseId} onChange={(e) => setCourseId(Number(e.target.value))} className="max-w-56" aria-label="Course">
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <a href={`/api/templates/test?courseId=${courseId}`} className={buttonClass("secondary")}>
              <Download className="size-4" /> Download template
            </a>
          </div>
        </section>

        <section className="px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900"><span className="mr-2 text-brand-600">2</span>Give it to Claude with your test PDF</h3>
          <p className="mt-1 text-xs text-slate-500">Attach both files and paste this message.</p>
          <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">{PROMPT}</pre>
          <Button variant="secondary" size="sm" className="mt-2" onClick={copy}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copied" : "Copy message"}
          </Button>
        </section>

        <section className="px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900"><span className="mr-2 text-brand-600">3</span>Upload the finished file</h3>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className={buttonClass("secondary") + " cursor-pointer"}>
              <Upload className="size-4" /> {file ? "Choose a different file" : "Choose Excel file"}
              <input type="file" accept=".xlsx,.xlsm" className="hidden" onChange={(e) => { void check(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {file && <span className="flex items-center gap-1.5 text-sm text-slate-600"><FileSpreadsheet className="size-4" /> {file.name}</span>}
            {busy === "check" && <Loader2 className="size-4 animate-spin text-slate-400" />}
          </div>
          {fail && <p className="mt-3 text-sm text-red-600">{fail}</p>}

          {preview && (
            <div className="mt-4 space-y-3">
              {preview.error && <p className="text-sm text-red-600">{preview.error}</p>}

              {preview.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-red-800"><AlertCircle className="size-4" /> Fix these, then upload again</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-6 text-sm text-red-800">{preview.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
              )}
              {preview.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800"><AlertTriangle className="size-4" /> Worth a look (you can still import)</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-6 text-sm text-amber-800">{preview.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
              )}

              {t && (
                <div className="rounded-lg border border-slate-200">
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
                    <span className="text-sm font-semibold text-slate-900">{t.testName}</span>
                    <span className="text-sm text-slate-500">in {t.courseName}</span>
                    <Badge tone="brand">{preview.stats.questions} questions</Badge>
                    <Badge tone="brand">{preview.stats.points} points</Badge>
                    <Badge tone={preview.stats.topicsMatched === preview.stats.points ? "green" : "amber"}>
                      {preview.stats.topicsMatched}/{preview.stats.points} tagged
                    </Badge>
                  </div>
                  <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto text-sm">
                    {t.questions.map((q) => (
                      <li key={q.number} className="px-4 py-2">
                        <span className="font-medium text-slate-800">Question {q.number}</span>
                        <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                          {q.parts.map((p) => (
                            <li key={p.label}>
                              {p.label ? `Part ${p.label}: ` : ""}{p.points.length} point{p.points.length === 1 ? "" : "s"}
                              {p.points.map((pt, i) => (
                                <span key={i} className="ml-2 text-slate-400">
                                  [{pt.topicCode || "no topic"} · {pt.reasons.length} reason{pt.reasons.length === 1 ? "" : "s"}]
                                </span>
                              ))}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button onClick={create} disabled={!canCreate}>
                {busy === "create" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Create test
              </Button>
            </div>
          )}
        </section>
      </div>
    </Card>
  );
}
