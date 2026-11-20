"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { QuestionForm } from "@/components/questions/QuestionForm";
import { deleteItemAction, duplicateItemAction, saveItemAction } from "@/lib/storeActions";
import { questionSummary, type Question } from "@/lib/questions";

export function QuestionPage({ uid, initial, courses, units }: { uid: string; initial: Question; courses: string[]; units: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [status, setStatus] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const ref = useRef(q); ref.current = q;
  const save = useCallback(async () => {
    setStatus("saving");
    try { await saveItemAction({ uid, kind: "question", title: questionSummary(ref.current, 90), data: ref.current }); setStatus("saved"); } catch { setStatus("error"); }
  }, [uid]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setStatus("dirty");
    const t = setTimeout(save, 900);
    return () => clearTimeout(t);
  }, [q, save]);
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/questions" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="size-4" /> Question bank</Link>
        <span className="text-xs text-slate-400">{status === "saving" ? "Saving…" : status === "dirty" ? "Unsaved…" : status === "error" ? <span className="text-red-600">Could not save. Try a smaller picture.</span> : "Saved"}</span>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={async () => { await save(); const id = await duplicateItemAction(uid); if (id) router.push(`/questions/${id}`); }}><Copy className="size-4" /> Duplicate</Button>
          <Button variant="danger" size="sm" onClick={async () => { if (window.confirm("Delete this question?")) { await deleteItemAction(uid); router.push("/questions"); } }}><Trash2 className="size-4" /> Delete</Button>
        </div>
      </div>
      <QuestionForm q={q} onChange={setQ} courses={courses} unitSuggestions={units} />
    </div>
  );
}
