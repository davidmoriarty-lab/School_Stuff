// The parts of the Library that are safe to use in the browser (no disk access).
export type RootKey = "class" | "mine";
export type Entry = { name: string; rel: string; isDir: boolean; size: number; mtime: number; ext: string };
export const ROOT_LABEL: Record<RootKey, string> = { class: "Class materials", mine: "My files" };
export const PREVIEWABLE = new Set(["html", "htm", "pdf", "png", "jpg", "jpeg", "gif", "svg", "txt", "md", "csv"]);
export const filesUrl = (root: RootKey, rel: string, download = false) =>
  `/files/${root}/${rel.split("/").map(encodeURIComponent).join("/")}${download ? "?download=1" : ""}`;
