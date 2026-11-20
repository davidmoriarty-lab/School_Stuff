"use server";
// Server actions: the small set of "save" operations the browser can call.
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { ITEM_KINDS, deleteItem, getItem, saveItem, saveSettingsPatch, type ItemKind } from "./store";
import type { Settings } from "./settings";

export async function saveItemAction(input: { uid?: string; kind: ItemKind; title: string; data: unknown }) {
  if (!ITEM_KINDS.includes(input.kind)) throw new Error("Unknown item kind");
  return saveItem(input);
}

export async function deleteItemAction(uid: string) {
  deleteItem(uid);
}

export async function duplicateItemAction(uid: string) {
  const it = getItem(uid);
  if (!it) return null;
  return saveItem({ uid: randomUUID(), kind: it.kind, title: it.title + " (copy)", data: it.data });
}

export async function saveSettingsAction(patch: Partial<Settings>) {
  saveSettingsPatch(patch);
  revalidatePath("/", "layout");
}
