/**
 * Downscale an image file to a compact JPEG data URL that fits inside a
 * request_messages.image_url text column (validated server-side).
 */
export async function fileToImageDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please pick an image file");
  const bitmap = await createImageBitmap(file);

  // Try progressively smaller outputs until under the server limit.
  for (const [maxDim, quality] of [[1200, 0.75], [900, 0.65], [700, 0.55]] as const) {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process the image");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= 1_500_000) return url;
  }
  throw new Error("Screenshot is too large — try cropping it first");
}
