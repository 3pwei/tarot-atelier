import { expect, test, type Page } from "@playwright/test";
import { answerReadings } from "./support/readingEndpoint";
import {
  askMainQuestion,
  deckPile,
  openChapter,
  openReading,
  pickAll,
  reveal,
} from "./support/spreadTable";

// Deals and burns eight cards before reading; software-rendered CI browsers need headroom.
test.describe.configure({ timeout: 120_000 });

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, "facing pages are for wide screens");
});

/** Neither the window nor the open book scrolls up and down. */
async function expectNoVerticalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const document = window.document.documentElement;
    const pages = [...window.document.querySelectorAll(".book-page")];
    return [
      document.scrollHeight - window.innerHeight,
      ...pages.map((element) => element.scrollHeight - element.clientHeight),
    ];
  });
  for (const extra of overflow) expect(extra).toBeLessThanOrEqual(1);
}

test("a chapter sets its table on the left page and its notes on the right, never scrolled", async ({
  page,
}) => {
  await openChapter(page, "five-card");
  const board = await page.locator(".spread-board").boundingBox();
  const notes = await page.locator(".draw-table__notes").boundingBox();
  if (!board || !notes) throw new Error("the table is not laid out");
  expect(board.x + board.width).toBeLessThan(notes.x);
  await expect(page.getByText("我現在真正的處境是什麼？")).toBeVisible();
  await expectNoVerticalScroll(page);

  // Arranging puts the question away for the library and the editor.
  await page.getByRole("button", { name: "編輯牌陣" }).click();
  await page
    .locator("[data-slot][data-index='2'] .spread-slot__handle")
    .click();
  await expect(page.getByLabel(/^短名/u)).toBeVisible();
  await expect(page.getByRole("textbox", { name: /^主問題/u })).toHaveCount(0);
  await expectNoVerticalScroll(page);
});

test("Card Reading turns a leaf to the reading, which runs on to the next spread", async ({
  page,
}) => {
  // The sample reading, which is long enough to run on past one spread.
  await answerReadings(page, {
    kind: "refusal",
    status: 429,
    reason: "daily-limit",
  });
  await openChapter(page, "circle");
  await askMainQuestion(page, "這段時間的方向？");
  await deckPile(page).click();
  await pickAll(page, 8);
  for (let index = 1; index <= 8; index += 1) await reveal(page, index);
  await expect(page.getByText("牌陣已完成")).toBeVisible();

  await openReading(page);
  await expect(
    page.getByRole("heading", { name: "Card Reading" }),
  ).toBeFocused();
  await expect(page.locator(".spread-board")).toHaveCount(0);
  await page.getByRole("button", { name: "產生解讀" }).click();
  await expect(page.getByText("範例解牌，不是 AI")).toBeVisible();
  await expectNoVerticalScroll(page);

  // Eight positions of the sample do not fit one spread: the rest is a leaf
  // turn away.
  await page.getByRole("button", { name: "下一頁" }).click();
  await expect(page.getByRole("button", { name: "上一頁" })).toBeVisible();
  await expectNoVerticalScroll(page);

  await page.getByRole("button", { name: "回到牌陣" }).click();
  await expect(page.locator(".spread-board")).toBeVisible();
  await expect(page.getByRole("button", { name: "看解讀" })).toBeVisible();
});
