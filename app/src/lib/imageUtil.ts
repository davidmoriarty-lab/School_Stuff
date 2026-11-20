// Turns a picture (pasted, dropped or chosen) into a compact data URL that can live inside a worksheet.
// Big photos are scaled down so a worksheet file stays small; transparent PNGs stay PNG.
export const MAX_IMAGE_SIDE = 1200;

export async function imageToDataUrl(file: Blob, max = MAX_IMAGE_SIDE): Promise<{ src: string; w: number; h: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new window.Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("That file is not a picture the browser can read."));
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d")!;
    if (file.type !== "image/png") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(img, 0, 0, w, h);
    let src = c.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.85);
    // A very large PNG (for example a full-screen screenshot) is saved as JPEG instead to keep the file small.
    if (file.type === "image/png" && src.length > 900_000) src = c.toDataURL("image/jpeg", 0.85);
    return { src, w, h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const isImageFile = (f: File | Blob) => f.type.startsWith("image/");
