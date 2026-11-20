// Sub plans and bell schedules.
//  * A bell schedule is a named list of time slots ("Period 1  8:00 to 8:50  Honors Chemistry").
//  * A sub plan has a date, picks a bell schedule, and is an ordered list of sections (blocks) the teacher can
//    add, reorder, hide and print. The "day" section holds one row per slot with notes on what each class is doing.
// Rosters are deliberately not part of a sub plan; print those from Student profiles.

export type BellRow = { id: string; label: string; start: string; end: string; course: string };
export type Bell = { rows: BellRow[]; note: string; isDefault?: boolean };

export type DayRow = { id: string; label: string; start: string; end: string; course: string; plan: string; materials: string; worksheet: string; copies: string };

export type SubType = "info" | "day" | "text" | "checklist" | "materials" | "contacts" | "lines";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SubBlock = { id: string; type: SubType; title: string; hidden?: boolean; props: Record<string, any> };
export type SubPlan = { date: string; bellId: string; blocks: SubBlock[] };

export const uid = () => Math.random().toString(36).slice(2, 9);

export const TYPE_LABEL: Record<SubType, string> = {
  info: "Teacher & room info", day: "Day schedule", text: "Notes", checklist: "Checklist", materials: "Materials & copies", contacts: "Contacts", lines: "Space for the sub to write",
};

export function minutes(start: string, end: string) {
  const m = (t: string) => { const [h, mi] = t.split(":").map(Number); return Number.isFinite(h) ? h * 60 + (mi || 0) : NaN; };
  const d = m(end) - m(start);
  return Number.isFinite(d) && d > 0 ? d : 0;
}
export function fmtTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** Rebuild the day's rows from a bell schedule, keeping any notes already written for a slot. */
export function syncRows(bell: Bell, existing: DayRow[]): DayRow[] {
  const used = new Set<string>();
  return bell.rows.map((r) => {
    // Match a slot by its id first; failing that by its name ("Period 1"), so notes survive a switch between schedules.
    const old = existing.find((e) => e.id === r.id && !used.has(e.id))
      ?? existing.find((e) => !used.has(e.id) && e.label.trim().toLowerCase() === r.label.trim().toLowerCase());
    if (old) used.add(old.id);
    return { plan: "", materials: "", worksheet: "", copies: "", ...old, id: r.id, label: r.label, start: r.start, end: r.end, course: old?.course || r.course };
  });
}

export function makeBlock(type: SubType, title?: string, props: SubBlock["props"] = {}): SubBlock {
  const base: Record<SubType, SubBlock["props"]> = {
    info: { teacher: "", room: "", phone: "", buddy: "", office: "", extra: "" },
    day: { rows: [] as DayRow[] },
    text: { body: "" },
    checklist: { items: [] as string[] },
    materials: { items: [] as { kind: "worksheet" | "link"; ref: string; label: string; copies: string }[] },
    contacts: { rows: [] as { name: string; role: string; where: string }[] },
    lines: { count: 6 },
  };
  return { id: uid(), type, title: title ?? TYPE_LABEL[type], props: { ...base[type], ...props } };
}

/** Ready-made sections to add. The text is a starting point for you to edit, not a claim about your school's rules. */
export const PRESETS: { id: string; label: string; make: () => SubBlock }[] = [
  { id: "attendance", label: "Attendance", make: () => makeBlock("text", "Attendance", { body: "How and when to take attendance, and where to send the record:\n" }) },
  { id: "behavior", label: "Behavior & expectations", make: () => makeBlock("text", "Behavior & expectations", { body: "Class expectations, how to handle issues, and who to call for help:\n" }) },
  { id: "passes", label: "Bathroom & hall passes", make: () => makeBlock("text", "Bathroom & hall passes", { body: "Where the pass is and how many students may be out at once:\n" }) },
  { id: "emergency", label: "Emergency & fire drill", make: () => makeBlock("text", "Emergency & fire drill", { body: "Exit route, meeting spot, and what to bring (roster or attendance):\n" }) },
  { id: "tech", label: "Technology", make: () => makeBlock("text", "Technology", { body: "Projector, computer log-in, and where to find the slides:\n" }) },
  { id: "early", label: "Early finishers", make: () => makeBlock("text", "Early finishers", { body: "What students can do if they finish early:\n" }) },
  { id: "helpers", label: "Helpful students", make: () => makeBlock("contacts", "Helpful students", { rows: [{ name: "", role: "", where: "" }] }) },
  { id: "where", label: "Where to find things", make: () => makeBlock("text", "Where to find things", { body: "Supplies, copies, lab equipment, lesson materials:\n" }) },
  { id: "dismiss", label: "Dismissal", make: () => makeBlock("text", "Dismissal", { body: "How students are dismissed at the end of class and the day:\n" }) },
  { id: "checklist", label: "Checklist", make: () => makeBlock("checklist", "Before you leave", { items: ["Straighten desks", "Collect the work", "Leave a note for me"] }) },
  { id: "contacts", label: "Contacts", make: () => makeBlock("contacts", "Who to call", { rows: [{ name: "", role: "Neighbor teacher", where: "Room" }, { name: "", role: "Office", where: "Ext." }] }) },
  { id: "materials", label: "Materials & copies", make: () => makeBlock("materials", "Materials & copies") },
  { id: "report", label: "Notes back to me", make: () => makeBlock("lines", "Notes for me (sub fills out)", { count: 8 }) },
  { id: "custom", label: "Blank notes section", make: () => makeBlock("text", "Notes", { body: "" }) },
];

export function defaultBlocks(): SubBlock[] {
  return [
    makeBlock("info"), makeBlock("day"),
    ...["attendance", "behavior", "emergency", "early"].map((id) => PRESETS.find((p) => p.id === id)!.make()),
    PRESETS.find((p) => p.id === "report")!.make(),
  ];
}
