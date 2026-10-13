// Phone photos weigh several megabytes; a cover is shrunk on the phone before it is stored or uploaded.

export const COVER_MAX_PX = 1600;

/** Target size keeping the proportions, never enlarging. */
export function fitWithin(w: number, h: number, max = COVER_MAX_PX) {
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

/** JPEG copy of an image file, at most COVER_MAX_PX on its longer side. Falls back to the original file. */
export async function shrinkImage(file: File, quality = 0.82): Promise<File> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { w, h } = fitWithin(bmp.width, bmp.height);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
