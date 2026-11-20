"use server";
import { revalidatePath } from "next/cache";
import { saveProfile, type Profile } from "./profiles";

export async function saveProfileAction(studentId: number, profile: Profile) {
  if (!Number.isInteger(studentId)) throw new Error("Bad student");
  saveProfile(studentId, profile);
  revalidatePath("/profiles", "layout");
}
