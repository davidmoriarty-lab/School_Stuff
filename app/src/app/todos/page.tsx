import { getSettings, listItems } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import { QuickSettings } from "@/components/QuickSettings";
import { todayStr } from "@/lib/dates";
import { TodoApp, type Todo } from "./TodoApp";

export const dynamic = "force-dynamic";

export default function Todos() {
  const s = getSettings();
  const todos: Todo[] = listItems("todo").map((t) => ({ uid: t.uid, title: t.title, done: false, list: "", priority: 0, ...(t.data as object) }) as Todo);
  return (
    <>
      <PageHeader title="To-do list" subtitle="Everything you need to get done, by list or by due date."
        actions={<QuickSettings page="todo" title="To-do options" prefs={s.prefs} fields={[
          { key: "group", label: "Group tasks by", kind: "select", def: "list", options: [["list", "List"], ["due", "Due date"], ["none", "Nothing (one list)"]] },
          { key: "showDone", label: "Show completed tasks", kind: "bool", def: false },
        ]} />} />
      <TodoApp initial={todos} lists={s.todoLists} today={todayStr()} group={String(s.prefs.todo?.group ?? "list")} showDoneDefault={Boolean(s.prefs.todo?.showDone ?? false)} />
    </>
  );
}
