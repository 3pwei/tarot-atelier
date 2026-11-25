import { expect, test } from "@playwright/test";
import { hideDevOverlay } from "./support/devOverlay";
import { answerReadings } from "./support/readingEndpoint";
import {
  askMainQuestion,
  deckPile,
  openReading,
  openRecord,
  openRecords,
  pickAll,
  recordList,
  reveal,
  openChapter,
} from "./support/spreadTable";

// Deals and burns three cards; software-rendered CI browsers need headroom.
test.describe.configure({ timeout: 90_000 });

const evidence = process.env.HISTORY_EVIDENCE_DIR;

test("keeps a finished round with its reading, and deletes it on request", async ({
  page,
}, testInfo) => {
  await answerReadings(page, { kind: "reading" });
  await openChapter(page);
  await askMainQuestion(page, "這份新工作適合我嗎？");
  await page.locator(".spread-board").scrollIntoViewIfNeeded();
  await deckPile(page).click();
  await pickAll(page, 3);
  for (const index of [1, 2, 3]) await reveal(page, index);
  await expect(page.getByText("牌陣已完成")).toBeVisible();
  await openReading(page);
  await expect(page.getByText("AI 解讀", { exact: true })).toBeVisible();

  // It survives a reload, which starts the table afresh.
  await page.reload();
  await expect(page.locator("[data-draw-card]")).toHaveCount(0);
  await openRecords(page);
  const entries = recordList(page).getByRole("listitem");
  await expect(entries).toHaveCount(1);
  await expect(entries.first()).toContainText("這份新工作適合我嗎？");
  await expect(entries.first()).toContainText("已解讀");
  if (evidence) {
    await page.screenshot({
      path: `${evidence}/${testInfo.project.name}-list.png`,
    });
  }

  await openRecord(page, "這份新工作適合我嗎？");
  const article = page.getByRole("article");
  await expect(article.locator(".record__position")).toHaveCount(3);
  await expect(article.locator(".card-artwork img")).toHaveCount(3);
  await expect(article.getByText("AI 解讀", { exact: true })).toBeVisible();
  await expect(article.getByText(/僅供娛樂與自我反思/u)).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  if (evidence) {
    await page.screenshot({
      path: `${evidence}/${testInfo.project.name}-detail.png`,
    });
  }

  await page.getByRole("button", { name: "刪除這筆" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "確定刪除這筆紀錄？" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "刪除", exact: true }).click();
  await expect(page.getByText(/還沒有紀錄/u)).toBeVisible();

  await page.reload();
  await openRecords(page);
  await expect(page.getByText(/還沒有紀錄/u)).toBeVisible();
});

test("reads a recorded round again from the history", async ({
  page,
}, testInfo) => {
  await answerReadings(page, { kind: "reading" });
  await openChapter(page);
  await askMainQuestion(page, "這份新工作適合我嗎？");
  await page.locator(".spread-board").scrollIntoViewIfNeeded();
  await deckPile(page).click();
  await pickAll(page, 3);
  for (const index of [1, 2, 3]) await reveal(page, index);
  await expect(page.getByText("牌陣已完成")).toBeVisible();

  await hideDevOverlay(page);
  await openRecords(page);
  await openRecord(page, "這份新工作適合我嗎？");
  await expect(page.getByText("這次沒有產生解讀。")).toBeVisible();
  await page.getByRole("button", { name: "產生解讀" }).click();

  const article = page.getByRole("article");
  await expect(article.getByText("AI 解讀", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "重新解讀" })).toBeEnabled();
  if (evidence) {
    await page.screenshot({
      path: `${evidence}/${testInfo.project.name}-reread.png`,
    });
  }
  // A phone turns back to the list; facing pages show it all along.
  const toList = page.getByRole("button", { name: "回到紀錄列表" });
  if (await toList.isVisible()) await toList.click();
  await expect(recordList(page).getByRole("listitem").first()).toContainText(
    "已解讀",
  );
});
