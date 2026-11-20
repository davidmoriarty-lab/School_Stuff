import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, Plus, Trash2, Users } from "lucide-react";
import { db } from "@/lib/db";
import { section, student } from "@/lib/schema";
import { renameSection, deleteSection, addStudent, updateStudent, deleteStudent } from "@/lib/actions";
import { PageHeader, Card, CardHeader, Button, Input, Badge, EmptyState, buttonClass } from "@/components/ui";
import { AutoSaveInput, AutoSaveSelect } from "@/components/AutoSave";
import { ConfirmDelete } from "@/components/ConfirmDelete";

export const dynamic = "force-dynamic";

export default async function ClassRoster({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const cls = db.select().from(section).where(eq(section.id, id)).get();
  if (!cls) notFound();
  const sections = db.select().from(section).all();
  const list = db
    .select()
    .from(student)
    .where(eq(student.sectionId, id))
    .all()
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));

  return (
    <>
      <PageHeader
        back={<Link href="/rosters" className="inline-flex items-center gap-1 text-slate-500 hover:text-brand-600"><ArrowLeft className="size-4" /> All classes</Link>}
        title={
          <span className="flex items-center gap-3">
            <AutoSaveInput action={renameSection} fields={{ sectionId: cls.id }} name="name" defaultValue={cls.name} aria-label="Class period name" className="w-64 text-lg font-semibold" />
            <Badge tone="brand">{list.length} student{list.length === 1 ? "" : "s"}</Badge>
          </span>
        }
        subtitle="Edit names inline, change a student's period, or remove them. Changes save as soon as you click away."
        actions={<>
          <Link href={`/profiles?section=${cls.id}`} className={buttonClass("secondary")}>Student profiles</Link>
          <ConfirmDelete
            action={deleteSection}
            fields={{ sectionId: cls.id }}
            title={`Delete ${cls.name}?`}
            message={`This permanently deletes the class and its ${list.length} student${list.length === 1 ? "" : "s"}, along with all of their scanned results. To keep a student, move them to another class first.`}
            confirmLabel="Delete class"
            triggerClassName={buttonClass("danger", "sm")}
          >
            <Trash2 className="size-3.5" /> Delete class
          </ConfirmDelete>
        </>}
      />

      <Card>
        <CardHeader title="Add a student" />
        <form action={addStudent} className="flex flex-wrap items-center gap-2 px-5 py-4">
          <input type="hidden" name="sectionId" value={cls.id} />
          <Input name="lastName" placeholder="Last name" className="w-56" />
          <Input name="firstName" placeholder="First name" className="w-56" />
          <Button><Plus className="size-4" /> Add student</Button>
        </form>
      </Card>

      <Card className="mt-5">
        <div className="grid grid-cols-[1fr_1fr_11rem_2.5rem] items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-2 text-xs font-medium text-slate-500">
          <span>Last name</span><span>First name</span><span>Class period</span><span />
        </div>
        {list.length === 0 ? (
          <EmptyState icon={Users} title="No students in this class" description="Add a student above, or import a roster from the Rosters page." />
        ) : (
          <div className="divide-y divide-slate-100">
            {list.map((x) => (
              <div key={x.id} className="grid grid-cols-[1fr_1fr_11rem_2.5rem] items-center gap-2 px-5 py-2">
                <AutoSaveInput action={updateStudent} fields={{ studentId: x.id }} name="lastName" defaultValue={x.lastName} aria-label="Last name" placeholder="Last" className="w-full min-w-0 py-1.5" />
                <AutoSaveInput action={updateStudent} fields={{ studentId: x.id }} name="firstName" defaultValue={x.firstName} aria-label="First name" placeholder="First" className="w-full min-w-0 py-1.5" />
                <AutoSaveSelect action={updateStudent} fields={{ studentId: x.id }} name="sectionId" defaultValue={x.sectionId} className="w-full py-1.5">
                  {sections.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </AutoSaveSelect>
                <ConfirmDelete
                  action={deleteStudent}
                  fields={{ studentId: x.id }}
                  title={`Remove ${x.firstName} ${x.lastName}?`}
                  message="This student and all of their scanned results will be permanently deleted. To keep them, move them to another class instead."
                  confirmLabel="Remove student"
                  triggerClassName="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  triggerLabel="Remove student"
                >
                  <Trash2 className="size-4" />
                </ConfirmDelete>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
