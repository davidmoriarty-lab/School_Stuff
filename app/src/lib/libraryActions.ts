"use server";
import { revalidatePath } from "next/cache";
import { getSettings, saveSettingsPatch } from "./store";

export async function togglePin(root: string, rel: string, name: string) {
  const s = getSettings();
  const has = s.pins.some((p) => p.root === root && p.path === rel);
  saveSettingsPatch({ pins: has ? s.pins.filter((p) => !(p.root === root && p.path === rel)) : [...s.pins, { root, path: rel, name }] });
  revalidatePath("/", "layout");
}
