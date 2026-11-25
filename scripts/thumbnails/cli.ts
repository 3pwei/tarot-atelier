/**
 * Renders the library's card faces and the card back into small WebP images.
 *
 *   pnpm thumbnails
 *
 * It clears the manifest so the library draws its SVG art, builds the site,
 * opens it in Chrome and captures each standard card. Set
 * THUMBNAIL_BROWSER_CHANNEL=chrome to use an installed Chrome instead of
 * Playwright's own browser. Commit the images and the manifest afterwards.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";
import { pngToWebp } from "../images/webp.ts";
import { startExportServer } from "../site/exportServer.ts";
import { run } from "../site/process.ts";
import { site } from "../site/siteConfig.ts";
import {
  artworkSourceHash,
  BACK_FILE_NAME,
  BACK_SMALL_FILE_NAME,
  BACK_SMALL_SCALE,
  CAPTURE_CSS_WIDTH,
  CAPTURE_PIXEL_RATIO,
  emptyManifest,
  MANIFEST_PATH,
  THUMBNAIL_PUBLIC_DIR,
  thumbnailFileName,
  WEBP_QUALITY,
  type ThumbnailManifest,
} from "./catalogThumbnails.ts";

const CAPTURE_PORT = 4320;
/** The card's own 1px border stays in CSS, so the capture leaves it out. */
const BORDER_PX = 1;

function writeManifest(manifest: ThumbnailManifest) {
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

/** Lays the grid out at the capture width so every face has the same size. */
async function fixCatalogWidth(page: Page) {
  await page.addStyleTag({
    content: `.card-grid { grid-template-columns: repeat(4, calc(${CAPTURE_CSS_WIDTH}px + 0.9rem)) !important; }
      .catalog-card, .catalog-card[aria-pressed="true"] { transform: none !important; transition: none !important; }`,
  });
}

/** The top card of the deck, drawn at the capture width and at half of it. */
async function captureBack(
  page: Page,
  outputDir: string,
): Promise<{ readonly back: string; readonly backSmall: string }> {
  // Captured at rest: no hover tilt, riffle or edge depth of the pack.
  await page.addStyleTag({
    content: `.deck-stack { --deck-card-width: ${CAPTURE_CSS_WIDTH}px !important; }
      .deck-stack__pile, .deck-stack__card { transform: none !important; transition: none !important; animation: none !important; }
      .deck-stack__pile { box-shadow: none !important; }`,
  });
  const back = page.locator("[data-deck-top]");
  await back.scrollIntoViewIfNeeded();
  const box = await back.boundingBox();
  if (!box) throw new Error("The deck's top card is not visible.");
  const png = await page.screenshot({ clip: box });
  writeFileSync(path.join(outputDir, BACK_FILE_NAME), await toWebp(page, png));
  writeFileSync(
    path.join(outputDir, BACK_SMALL_FILE_NAME),
    await toWebp(page, png, BACK_SMALL_SCALE),
  );
  return { back: BACK_FILE_NAME, backSmall: BACK_SMALL_FILE_NAME };
}

function toWebp(page: Page, png: Buffer, scale = 1): Promise<Buffer> {
  return pngToWebp(page, png, WEBP_QUALITY, scale);
}

async function capture(page: Page, outputDir: string) {
  const cards: Record<string, string> = {};
  let size = { width: 0, height: 0 };
  const ids = await page
    .locator(".catalog-card[data-card-id]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-card-id") ?? ""),
    );
  for (const id of ids) {
    const art = page.locator(
      `.catalog-card[data-card-id="${id}"] .card-artwork`,
    );
    await art.scrollIntoViewIfNeeded();
    const box = await art.boundingBox();
    if (!box) throw new Error(`Card ${id} is not visible in the library.`);
    const png = await page.screenshot({
      clip: {
        x: box.x + BORDER_PX,
        y: box.y + BORDER_PX,
        width: box.width - BORDER_PX * 2,
        height: box.height - BORDER_PX * 2,
      },
    });
    const file = thumbnailFileName(id);
    writeFileSync(path.join(outputDir, file), await toWebp(page, png));
    cards[id] = file;
    size = {
      width: Math.round((box.width - BORDER_PX * 2) * CAPTURE_PIXEL_RATIO),
      height: Math.round((box.height - BORDER_PX * 2) * CAPTURE_PIXEL_RATIO),
    };
  }
  return { cards, size };
}

async function main() {
  const outputDir = path.join("public", THUMBNAIL_PUBLIC_DIR);
  writeManifest(emptyManifest());
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });
  run("pnpm", ["build"]);

  const server = await startExportServer(site.exportDir, CAPTURE_PORT);
  const browser = await chromium.launch({
    channel: process.env.THUMBNAIL_BROWSER_CHANNEL,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
      deviceScaleFactor: CAPTURE_PIXEL_RATIO,
      reducedMotion: "reduce",
    });
    await page.goto(`http://127.0.0.1:${CAPTURE_PORT}/`);
    await page.evaluate(() => document.fonts.ready);
    await fixCatalogWidth(page);
    await page.mouse.move(0, 0);
    const { cards, size } = await capture(page, outputDir);
    const backs = await captureBack(page, outputDir);
    writeManifest({
      ...emptyManifest(),
      sourceHash: artworkSourceHash((file) => readFileSync(file, "utf8")),
      ...size,
      cards,
      ...backs,
    });
    console.log(
      `Captured ${Object.keys(cards).length} thumbnails into ${outputDir}.`,
    );
  } finally {
    await browser.close();
    server.close();
  }
}

await main();
