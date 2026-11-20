import { expect, test } from "@playwright/test";
import { answerReadings } from "./support/readingEndpoint";
import {
  askMainQuestion,
  deckPile,
  pickAll,
  reveal,
} from "./support/spreadTable";

// Deals and burns three cards; software-rendered CI browsers need headroom.
test.describe.configure({ timeout: 90_000 });

const evidence = process.env.HISTORY_EVIDENCE_DIR;

test("keeps a finished round with its reading, and deletes it on request", async ({
  page,
}, testInfo) => {
  await answerReadings(page, { kind: "reading" });
  await page.goto("/");
  await askMainQuestion(page, "這份新工作適合我嗎？");
  await page.locator(".spread-board").scrollIntoViewIfNeeded();
  await deckPile(page).click();
  await pickAll(page, 3);
  for (const index of [1, 2, 3]) await reveal(page, index);
  await expect(page.getByText("牌陣已完成")).toBeVisible();
  await page
    .locator(".reading-panel")
    .getByRole("button", { name: "產生解讀" })
    .click();
  await expect(page.getByText("AI 解讀", { exact: true })).toBeVisible();

  // It survives a reload, and the restored table does not add it again.
  await page.reload();
  await expect(page.getByText("已載入上次的牌陣。")).toBeVisible();
  await page.getByRole("button", { name: "歷史紀錄" }).click();
  const panel = page.getByRole("dialog", { name: /歷史紀錄/u });
  const entries = panel.getByRole("listitem");
  await expect(entries).toHaveCount(1);
  await expect(entries.first()).toContainText("這份新工作適合我嗎？");
  await expect(entries.first()).toContainText("已解讀");
  await expect(entries.first().locator(".card-artwork img")).toHaveCount(3);
  if (evidence) {
    await page.screenshot({
      path: `${evidence}/${testInfo.project.name}-list.png`,
    });
  }

  await entries.first().getByRole("button").click();
  const article = panel.getByRole("article");
  await expect(article.locator(".history-position")).toHaveCount(3);
  await expect(article.getByText("AI 解讀", { exact: true })).toBeVisible();
  await expect(article.getByText(/僅供娛樂與自我反思/u)).toBeVisible();
  if (evidence) {
    await page.screenshot({
      path: `${evidence}/${testInfo.project.name}-detail.png`,
    });
  }

  await panel.getByRole("button", { name: "刪除這筆" }).click();
  await expect(panel.getByRole("alert")).toContainText("確定刪除這筆紀錄？");
  await panel.getByRole("button", { name: "刪除", exact: true }).click();
  await expect(panel.getByText(/還沒有紀錄/u)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await page.reload();
  await expect(page.getByText("已載入上次的牌陣。")).toBeVisible();
  await page.getByRole("button", { name: "歷史紀錄" }).click();
  await expect(page.getByText(/還沒有紀錄/u)).toBeVisible();
});
