import type { Page } from "@playwright/test";

/**
 * Re-encodes a PNG capture as WebP in the page's own canvas, so no image
 * library is needed. `scale` resizes it on the way.
 */
export async function pngToWebp(
  page: Page,
  png: Buffer,
  quality: number,
  scale = 1,
): Promise<Buffer> {
  const dataUrl = await page.evaluate(
    async ({ base64, quality, scale }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      canvas
        .getContext("2d")
        ?.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/webp", quality);
    },
    { base64: png.toString("base64"), quality, scale },
  );
  const [, base64 = ""] = dataUrl.split(",");
  return Buffer.from(base64, "base64");
}
