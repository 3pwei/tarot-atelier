/**
 * Renders the book's SVG art into WebP for the site.
 *
 *   pnpm book-art
 *
 * Each SVG is laid on a page with its lettering fonts, captured in Chrome at
 * twice its size and re-encoded as WebP. Set BOOK_ART_BROWSER_CHANNEL=chrome
 * to use an installed Chrome instead of Playwright's own browser. Commit the
 * images afterwards.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { pngToWebp } from "../images/webp.ts";
import {
  BOOK_ART,
  BOOK_ART_FONTS,
  BOOK_ART_PIXEL_RATIO,
  BOOK_ART_PUBLIC_DIR,
  outputPath,
  sourcePath,
} from "./bookArt.ts";

function fontFaces(): string {
  return BOOK_ART_FONTS.map(([family, file]) => {
    const base64 = readFileSync(`node_modules/${file}`).toString("base64");
    return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${base64}) format("woff2")}`;
  }).join("");
}

async function main() {
  mkdirSync(BOOK_ART_PUBLIC_DIR, { recursive: true });
  const browser = await chromium.launch({
    channel: process.env.BOOK_ART_BROWSER_CHANNEL,
  });
  try {
    const faces = fontFaces();
    for (const piece of BOOK_ART) {
      const page = await browser.newPage({
        viewport: { width: piece.width, height: piece.height },
        deviceScaleFactor: BOOK_ART_PIXEL_RATIO,
      });
      const svg = readFileSync(sourcePath(piece), "utf8");
      await page.setContent(
        `<!doctype html><style>${faces}html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`,
      );
      await page.evaluate(() => document.fonts.ready);
      const png = await page.screenshot({
        omitBackground: piece.transparent,
      });
      writeFileSync(
        outputPath(piece),
        await pngToWebp(page, png, piece.quality),
      );
      await page.close();
      console.log(`wrote ${outputPath(piece)}`);
    }
  } finally {
    await browser.close();
  }
}

await main();
