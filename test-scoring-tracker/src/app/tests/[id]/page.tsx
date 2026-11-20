import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, Plus, Trash2, X, Printer, ListChecks, ChevronRight, Copy, Split, Info } from "lucide-react";
import { db } from "@/lib/db";
import { test, section, course } from "@/lib/schema";
import { loadTemplate, loadCurriculum, sheetOptionsFor, type PointT } from "@/lib/template";
import { layoutSheet } from "@/lib/sheetLayout";
import {
  addQuestion, deleteQuestion, addPart, updatePart, deletePart, splitIntoParts, addPoints, updatePoint, deletePoint,
  addReason, updateReason, deleteReason, copyReasons, deleteTest, setCurve, setTestKind,
} from "@/lib/actions";
import { PageHeader, Card, CardHeader, Button, Input, Select, Badge, EmptyState, buttonClass } from "@/components/ui";
import { AutoSaveInput, AutoSaveText } from "@/components/AutoSave";
import { TopicPickerHost, TopicField } from "@/components/TopicPicker";
import { AddQuestionForm } from "@/components/AddQuestionForm";
import { MAX_POINTS_PER_PART } from "@/lib/limits";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { CurveForm } from "@/components/CurveForm";
import { TestKindForm } from "@/components/TestKindForm";
import { parseCurve, curveLabel } from "@/lib/curve";

export const dynamic = "force-dynamic";

export default async function TestEditor({ params }: { params: Promise<{ id: string }> }) {
  const testId = Number((await params).id);
  const t = db.select().from(test).where(eq(test.id, testId)).get();
  if (!t) notFound();
  const template = loadTemplate(testId);
  const sections = db.select().from(section).all();
  const totalPoints = template.reduce((n, q) => n + q.parts.reduce((m, p) => m + p.points.length, 0), 0);
  const units = loadCurriculum(t.courseId);
  const courseName = db.select().from(course).where(eq(course.id, t.courseId)).get()?.name ?? "Course";

  const pointForm = { testId };
  const curve = parseCurve(t.curveType, t.curveValue);
  const sheetPages = template.length ? layoutSheet(template, sheetOptionsFor(testId)).length : 0;

  return (
    <TopicPickerHost units={units} courseName={courseName}>
      <PageHeader
        back={
          <Link href="/tests" className="inline-flex items-center gap-1 text-slate-500 hover:text-brand-600">
            <ArrowLeft className="size-4" /> All tests
          </Link>
        }
        title={t.name}
        subtitle={
          <span className="flex items-center gap-2">
            <Badge tone="brand">{template.length} questions</Badge>
            <Badge tone="brand">{totalPoints} points</Badge>
            {totalPoints > 0 && (
              <Badge>Scoring sheet: {sheetPages} page{sheetPages === 1 ? "" : "s"}</Badge>
            )}
            {t.kind === "midterm" && <Badge tone="amber">Midterm</Badge>}
            {curve.type !== "none" && <Badge tone="green">{curveLabel(curve)}</Badge>}
            <span className="text-slate-400">· {courseName}</span>
          </span>
        }
        actions={
          <ConfirmDelete
            action={deleteTest}
            fields={{ testId }}
            title={`Delete "${t.name}"?`}
            message="This permanently deletes the test with all of its questions, points and reasons, and every scanned result saved for it. This can't be undone."
            confirmLabel="Delete test"
            triggerClassName={buttonClass("danger", "sm")}
          >
            <Trash2 className="size-4" /> Delete test
          </ConfirmDelete>
        }
      />

      <details open={template.length === 0} className="group mb-5 rounded-xl border border-brand-100 bg-brand-50/60">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-brand-700 [&::-webkit-details-marker]:hidden">
          <Info className="size-4" /> How the builder works
          <ChevronRight className="ml-auto size-4 transition-transform group-open:rotate-90" />
        </summary>
        <ol className="space-y-1.5 px-4 pb-4 pl-9 text-sm text-slate-700" style={{ listStyle: "decimal" }}>
          <li><b>Question</b>: one numbered question on the test.</li>
          <li><b>Point</b>: one thing a student can earn credit for. Each point becomes one row on the scoring sheet with &quot;full credit&quot; and &quot;missed it&quot; bubbles.</li>
          <li><b>Parts</b> are optional. Only use them for questions like 1A, 1B, 1C. Each part has its own points.</li>
          <li><b>Reasons</b>: for each point, list the common mistakes. If a student misses the point, they fill in one of these.</li>
          <li><b>Topic</b>: tag each point with its unit and topic so results can be grouped later.</li>
        </ol>
      </details>

      <Card className="mb-6">
        <CardHeader title="Scoring sheets" description="Generate one PDF for a class period: a page per student with name and QR code." />
        <form action={`/api/tests/${testId}/pdf`} method="get" className="flex flex-wrap items-center gap-3 px-5 py-4">
          <Select name="sectionId" required className="max-w-56">
            <option value="">Choose class period…</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Button disabled={!sections.length || !totalPoints}><Printer className="size-4" /> Generate scoring PDFs</Button>
          {!sections.length && (
            <span className="text-sm text-slate-500">
              <Link href="/rosters" className="text-brand-600 hover:underline">Import a roster</Link> first.
            </span>
          )}
        </form>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Test type" description="A midterm uses a teacher-graded free-response sheet plus a typed-in multiple-choice score." />
        <TestKindForm action={setTestKind} testId={testId} initialKind={t.kind === "midterm" ? "midterm" : "standard"} initialMcqTotal={t.mcqTotal} />
      </Card>

      <Card className="mb-6">
        <CardHeader title="Grade curve" description="Applied automatically to scanned results. Raw scores are never changed, and you can switch between raw and curved in the analysis." />
        <CurveForm action={setCurve} testId={testId} initialType={curve.type} initialValue={curve.value} />
      </Card>

      {template.length === 0 && (
        <Card className="mb-5">
          <EmptyState icon={ListChecks} title="Start with your first question" description="Say how many points it is worth below. You can add parts, topics and reasons after." />
        </Card>
      )}

      <div className="space-y-4">
        {template.map((q) => {
          const hasParts = q.parts.length > 1 || q.parts[0]?.label !== "";
          const flat = q.parts.flatMap((p) => p.points);
          const qPoints = flat.length;

          const renderPoint = (pt: PointT, label: string) => {
            const prev = flat[flat.findIndex((x) => x.id === pt.id) - 1];
            return (
              <div key={pt.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-8 min-w-12 items-center justify-center rounded-md bg-slate-100 px-2 text-xs font-semibold text-slate-600">{label}</span>
                  <AutoSaveInput
                    action={updatePoint}
                    fields={{ ...pointForm, pointId: pt.id }}
                    name="description"
                    defaultValue={pt.description}
                    placeholder="What earns this point? (optional note)"
                    aria-label="Point description"
                    className="min-w-48 flex-1"
                  />
                  <TopicField defaultValue={pt.topicId} save={{ action: updatePoint, fields: { ...pointForm, pointId: pt.id } }} />
                  <ConfirmDelete
                    action={deletePoint}
                    fields={{ testId, pointId: pt.id }}
                    title={`Remove point ${label}?`}
                    message="This point, its reasons, and any scanned results for it will be permanently removed."
                    confirmLabel="Remove point"
                    triggerClassName="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    triggerLabel="Remove point"
                  >
                    <Trash2 className="size-4" />
                  </ConfirmDelete>
                </div>

                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  <span className="block text-xs font-medium text-slate-500">If missed, student picks:</span>
                  {pt.reasons.length > 0 && (
                    <ul className="space-y-1.5">
                      {pt.reasons.map((r) => (
                        <li key={r.id} className="flex items-start gap-1">
                          <AutoSaveText
                            action={updateReason}
                            fields={{ testId, reasonId: r.id }}
                            name="text"
                            defaultValue={r.text}
                            aria-label="Reason text"
                            className="flex-1 py-1.5 text-xs"
                          />
                          <ConfirmDelete
                            action={deleteReason}
                            fields={{ testId, reasonId: r.id }}
                            title="Remove this reason?"
                            message={<>&ldquo;{r.text}&rdquo; will be removed from this point. Scans that used it will show &ldquo;No reason chosen&rdquo;.</>}
                            confirmLabel="Remove reason"
                            triggerClassName="rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            triggerLabel="Remove reason"
                          >
                            <X className="size-3.5" />
                          </ConfirmDelete>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>Other (always included)</Badge>
                    <form action={addReason} className="flex items-center gap-1">
                      <input type="hidden" name="testId" value={testId} />
                      <input type="hidden" name="pointId" value={pt.id} />
                      <Input name="text" placeholder="Add a common mistake…" className="w-56 py-1 text-xs" />
                      <Button variant="ghost" size="sm" aria-label="Add reason"><Plus className="size-3.5" /></Button>
                    </form>
                    {pt.reasons.length === 0 && prev && prev.reasons.length > 0 && (
                      <form action={copyReasons}>
                        <input type="hidden" name="testId" value={testId} />
                        <input type="hidden" name="pointId" value={pt.id} />
                        <input type="hidden" name="fromPointId" value={prev.id} />
                        <Button variant="secondary" size="sm"><Copy className="size-3.5" /> Copy from previous point</Button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          };

          const addPointButton = (partId: number, count: number) => (
            <form action={addPoints}>
              <input type="hidden" name="testId" value={testId} />
              <input type="hidden" name="partId" value={partId} />
              <input type="hidden" name="count" value={1} />
              <Button
                variant="secondary"
                size="sm"
                disabled={count >= MAX_POINTS_PER_PART}
                title={count >= MAX_POINTS_PER_PART ? `A part is worth at most ${MAX_POINTS_PER_PART} points. Split it into parts instead.` : undefined}
              >
                <Plus className="size-4" /> Add point
              </Button>
              {count >= MAX_POINTS_PER_PART && <span className="ml-2 text-xs text-slate-400">Max {MAX_POINTS_PER_PART} points per {hasParts ? "part" : "question"}</span>}
            </form>
          );

          return (
            <Card key={q.id} className="overflow-hidden">
              <details open className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  <ChevronRight className="size-4 text-slate-400 transition-transform group-open:rotate-90" />
                  <span className="text-base font-semibold text-slate-900">Question {q.number}</span>
                  <Badge tone="brand">{qPoints} point{qPoints === 1 ? "" : "s"}</Badge>
                  {hasParts && <Badge>{q.parts.length} parts</Badge>}
                </summary>

                <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-5">
                  {q.parts.map((p) => (
                    <div key={p.id} className="space-y-2">
                      {hasParts && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-700">Part</span>
                          <AutoSaveInput action={updatePart} fields={{ testId, partId: p.id }} name="label" defaultValue={p.label} aria-label="Part letter" className="w-16 text-center font-semibold uppercase" />
                          <span className="text-xs text-slate-400">{p.points.length} point{p.points.length === 1 ? "" : "s"}</span>
                          <ConfirmDelete
                            formClassName="ml-auto"
                            action={deletePart}
                            fields={{ testId, partId: p.id }}
                            title={`Remove Part ${p.label}?`}
                            message={`This removes the part with its ${p.points.length} point${p.points.length === 1 ? "" : "s"}, their reasons, and any scanned results for them.`}
                            confirmLabel="Remove part"
                            triggerClassName={buttonClass("danger", "sm")}
                          >
                            <Trash2 className="size-3.5" /> Remove part
                          </ConfirmDelete>
                        </div>
                      )}
                      <div className={hasParts ? "space-y-2 border-l-2 border-brand-100 pl-4" : "space-y-2"}>
                        {p.points.map((pt) => renderPoint(pt, `${q.number}${p.label}.${pt.position}`))}
                        {addPointButton(p.id, p.points.length)}
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
                    {hasParts ? (
                      <form action={addPart}>
                        <input type="hidden" name="testId" value={testId} />
                        <input type="hidden" name="questionId" value={q.id} />
                        <Button variant="secondary" size="sm"><Plus className="size-4" /> Add another part</Button>
                      </form>
                    ) : (
                      <form action={splitIntoParts}>
                        <input type="hidden" name="testId" value={testId} />
                        <input type="hidden" name="questionId" value={q.id} />
                        <Button variant="secondary" size="sm"><Split className="size-4" /> This question has parts (A, B, C…)</Button>
                      </form>
                    )}
                    <ConfirmDelete
                      formClassName="ml-auto"
                      action={deleteQuestion}
                      fields={{ testId, questionId: q.id }}
                      title={`Delete Question ${q.number}?`}
                      message={`This deletes the question with its ${qPoints} point${qPoints === 1 ? "" : "s"}, their reasons, and any scanned results for them. The questions after it are renumbered.`}
                      confirmLabel="Delete question"
                      triggerClassName={buttonClass("danger", "sm")}
                    >
                      <Trash2 className="size-3.5" /> Delete question
                    </ConfirmDelete>
                  </div>
                </div>
              </details>
            </Card>
          );
        })}
      </div>

      <Card className="mt-5">
        <CardHeader title={`Add question ${template.length + 1}`} />
        <AddQuestionForm action={addQuestion} testId={testId} nextNumber={template.length + 1} />
      </Card>
    </TopicPickerHost>
  );
}
