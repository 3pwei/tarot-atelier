import { expect, test } from "@playwright/test";
import { answerReadings } from "./support/readingEndpoint";
import {
  askMainQuestion,
  deckPile,
  openReading,
  pickAll,
  reveal,
  openChapter,
  readingPanel,
} from "./support/spreadTable";

// Deals and burns three cards; software-rendered CI browsers need headroom.
test.describe.configure({ timeout: 90_000 });

const evidence = process.env.SHARE_EVIDENCE_DIR;

test("paints a share image of the finished table and downloads it where sharing files is unsupported", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    // The headless browser's share support varies; the fallback is under test.
    Object.defineProperty(navigator, "canShare", { value: undefined });
  });
  await answerReadings(page, { kind: "reading" });
  await openChapter(page);
  await askMainQuestion(page, "這份新工作適合我嗎？");
  await page.locator(".spread-board").scrollIntoViewIfNeeded();
  await deckPile(page).click();
  await pickAll(page, 3);
  for (const index of [1, 2, 3]) await reveal(page, index);
  await expect(page.getByText("牌陣已完成")).toBeVisible();
  await openReading(page);
  const panel = readingPanel(page);
  await panel.getByRole("button", { name: "產生解讀" }).click();
  await expect(panel.getByText("AI 解讀", { exact: true })).toBeVisible();

  await panel.getByRole("button", { name: "分享", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "分享這次的牌" });
  const preview = dialog.getByAltText("要分享的圖卡預覽");
  await expect(preview).toBeVisible();
  const size = await preview.evaluate((image: HTMLImageElement) => [
    image.naturalWidth,
    image.naturalHeight,
  ]);
  expect(size).toEqual([1080, 1350]);
  if (evidence) {
    await page.screenshot({
      path: `${evidence}/${testInfo.project.name}-sheet.png`,
    });
  }

  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "分享圖卡" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^tarot-atelier-\d{8}-\d{4}\.png$/u);
  await expect(dialog.getByText("已下載圖卡。")).toBeVisible();
  if (evidence) {
    await file.saveAs(`${evidence}/${testInfo.project.name}-image.png`);
  }

  // Hiding the questions paints a new image without them.
  await dialog.getByRole("checkbox", { name: "隱藏我寫的問題" }).check();
  await expect(preview).toBeVisible();
  if (evidence) {
    const hidden = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "分享圖卡" }).click();
    await (
      await hidden
    ).saveAs(`${evidence}/${testInfo.project.name}-image-hidden.png`);
  }

  await dialog.getByRole("button", { name: "關閉" }).click();
  await expect(dialog).toBeHidden();
});
