import Link from "next/link";
import { ChevronRight, Plus, Trash2, BookOpen } from "lucide-react";
import { db } from "@/lib/db";
import { course } from "@/lib/schema";
import { loadCurriculum } from "@/lib/template";
import { addCourse, addUnit, updateUnit, deleteUnit, addTopic, updateTopic, deleteTopic } from "@/lib/actions";
import { PageHeader, Card, Button, Input, Badge, EmptyState, buttonClass } from "@/components/ui";
import { AutoSaveInput } from "@/components/AutoSave";
import { ConfirmDelete } from "@/components/ConfirmDelete";

export const dynamic = "force-dynamic";

export default async function CurriculumPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const courses = db.select().from(course).all();
  const wanted = Number((await searchParams).course);
  const current = courses.find((c) => c.id === wanted) ?? courses.find((c) => c.name === "AP Chemistry") ?? courses[0];
  const units = current ? loadCurriculum(current.id) : [];

  return (
    <>
      <PageHeader
        title="Curriculum"
        subtitle="Outline each course's units and topics. These are the choices you pick from when tagging points on a test."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {courses.map((c) => (
          <Link
            key={c.id}
            href={`/curriculum?course=${c.id}`}
            className={
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
              (c.id === current?.id ? "bg-brand-600 text-white shadow-sm" : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50")
            }
          >
            {c.name}
          </Link>
        ))}
        <form action={addCourse} className="flex items-center gap-1.5">
          <Input name="name" placeholder="New course…" required className="w-44 py-1.5" />
          <Button variant="secondary" size="sm"><Plus className="size-4" /> Add course</Button>
        </form>
      </div>

      {!current ? (
        <Card><EmptyState icon={BookOpen} title="Add a course" description="Create a course above, then outline its units and topics." /></Card>
      ) : (
        <div className="space-y-3">
          {units.length === 0 && (
            <Card>
              <EmptyState icon={BookOpen} title={`No units in ${current.name} yet`} description="Add a unit below, then add the topics inside it." />
            </Card>
          )}

          {units.map((u) => (
            <Card key={u.id} className="overflow-hidden">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  <ChevronRight className="size-4 text-slate-400 transition-transform group-open:rotate-90" />
                  <span className="flex size-7 items-center justify-center rounded-md bg-brand-50 text-sm font-semibold text-brand-700">{u.number}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{u.title}</span>
                  <Badge>{u.topics.length} topics</Badge>
                </summary>

                <div className="space-y-2 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
                  <div className="flex items-center gap-2 pb-2">
                    <span className="w-16 text-xs font-medium text-slate-500">Unit title</span>
                    <AutoSaveInput action={updateUnit} fields={{ unitId: u.id }} name="title" defaultValue={u.title} className="w-full max-w-lg" />
                    <ConfirmDelete
                      action={deleteUnit}
                      fields={{ unitId: u.id }}
                      title={`Delete Unit ${u.number}?`}
                      message={`"${u.title}" and its ${u.topics.length} topic${u.topics.length === 1 ? "" : "s"} will be permanently deleted. Test points tagged with those topics will lose their tag.`}
                      confirmLabel="Delete unit"
                      triggerClassName={buttonClass("danger", "sm")}
                    >
                      <Trash2 className="size-3.5" /> Delete unit
                    </ConfirmDelete>
                  </div>

                  {u.topics.map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <AutoSaveInput action={updateTopic} fields={{ topicId: t.id }} name="code" defaultValue={t.code} aria-label="Topic number" className="w-20 font-mono text-xs" />
                      <AutoSaveInput action={updateTopic} fields={{ topicId: t.id }} name="title" defaultValue={t.title} aria-label="Topic title" className="w-full max-w-lg" />
                      <ConfirmDelete
                        action={deleteTopic}
                        fields={{ topicId: t.id }}
                        title={`Delete topic ${t.code}?`}
                        message={`"${t.title}" will be permanently deleted. Test points tagged with it will lose their tag.`}
                        confirmLabel="Delete topic"
                        triggerClassName="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        triggerLabel="Delete topic"
                      >
                        <Trash2 className="size-4" />
                      </ConfirmDelete>
                    </div>
                  ))}

                  <form action={addTopic} className="flex items-center gap-2 pt-2">
                    <input type="hidden" name="unitId" value={u.id} />
                    <Input name="code" placeholder={`${u.number}.${u.topics.length + 1}`} className="w-20 font-mono text-xs" />
                    <Input name="title" placeholder="New topic title" required className="w-full max-w-lg" />
                    <Button variant="secondary" size="sm"><Plus className="size-4" /> Add topic</Button>
                  </form>
                </div>
              </details>
            </Card>
          ))}

          <Card>
            <form action={addUnit} className="flex flex-wrap items-center gap-2 px-5 py-4">
              <input type="hidden" name="courseId" value={current.id} />
              <span className="mr-1 text-sm font-medium text-slate-700">New unit</span>
              <Input name="number" type="number" min={1} placeholder={`#${units.length + 1}`} className="w-20" />
              <Input name="title" placeholder="Unit title, e.g. Atomic Structure and Properties" required className="w-full max-w-md" />
              <Button><Plus className="size-4" /> Add unit</Button>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
