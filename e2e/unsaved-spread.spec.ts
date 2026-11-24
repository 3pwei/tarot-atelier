import { expect, test, type Page } from "@playwright/test";
import { askMainQuestion, slot, openChapter } from "./support/spreadTable";

/** Leaving the editor with layout changes that are not in the library. */

function handle(page: Page, index: number) {
  return slot(page, index).getByRole("button", {
    name: new RegExp(`^牌位 ${index}：`, "u"),
  });
}

function slotX(page: Page, index: number) {
  return slot(page, index).evaluate((element) =>
    Number.parseFloat(element.style.getPropertyValue("--x")),
  );
}

async function nudgeRight(page: Page, index: number) {
  await handle(page, index).focus();
  await page.keyboard.press("ArrowRight");
}

const unsavedDialog = (page: Page) =>
  page.getByRole("alertdialog", { name: "牌陣還沒儲存" });

test.beforeEach(async ({ page }) => {
  await openChapter(page);
  await askMainQuestion(page);
  await page.locator(".spread-board").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "編輯牌陣" }).click();
});

test("leaving without changes asks nothing", async ({ page }) => {
  await page.getByRole("button", { name: "結束編輯" }).click();

  await expect(unsavedDialog(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "編輯牌陣" })).toBeVisible();
});

test("cancelling keeps editing with the changes in place", async ({ page }) => {
  const before = await slotX(page, 1);
  await nudgeRight(page, 1);
  await page.getByRole("button", { name: "結束編輯" }).click();

  const dialog = unsavedDialog(page);
  await expect(dialog).toContainText("牌陣庫裡的「經典三張」");
  // Cancel holds the focus, so Enter alone never discards the changes.
  await expect(dialog.getByRole("button", { name: "取消" })).toBeFocused();
  await dialog.getByRole("button", { name: "取消" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "結束編輯" })).toBeVisible();
  expect(await slotX(page, 1)).toBeCloseTo(before + 0.01, 5);
});

test("leaving anyway restores the library's version", async ({ page }) => {
  const before = await slotX(page, 1);
  await nudgeRight(page, 1);
  await page.getByRole("button", { name: "＋ 新增牌位" }).click();
  await expect(page.locator("[data-slot]")).toHaveCount(4);

  await page.getByRole("button", { name: "結束編輯" }).click();
  await unsavedDialog(page).getByRole("button", { name: "確定離開" }).click();

  await expect(page.locator("[data-slot]")).toHaveCount(3);
  expect(await slotX(page, 1)).toBeCloseTo(before, 5);
  await expect(
    page.getByText("已還原成牌陣庫裡的「經典三張」。"),
  ).toBeAttached();
  await expect(page.getByRole("textbox", { name: /^主問題/u })).not.toHaveValue(
    "",
  );
  await expect(page.getByRole("button", { name: "編輯牌陣" })).toBeVisible();
});

test("leaving right after saving asks nothing", async ({ page }) => {
  await nudgeRight(page, 1);
  await page.getByRole("button", { name: "儲存目前牌陣" }).click();
  await page.getByLabel("牌陣名稱").fill("挪過的三張");
  await page.getByRole("button", { name: "儲存", exact: true }).click();
  await expect(
    page.getByText("已把目前牌陣存成「挪過的三張」。"),
  ).toBeAttached();

  await page.getByRole("button", { name: "結束編輯" }).click();

  await expect(unsavedDialog(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "編輯牌陣" })).toBeVisible();
});

test("a blank table returns to how it was when editing began", async ({
  page,
}) => {
  await page.getByRole("button", { name: "空白牌桌" }).click();
  await page.getByRole("button", { name: "＋ 新增牌位" }).click();
  await expect(page.locator("[data-slot]")).toHaveCount(1);

  await page.getByRole("button", { name: "結束編輯" }).click();
  const dialog = unsavedDialog(page);
  await expect(dialog).toContainText("開始編輯前的牌陣");
  await dialog.getByRole("button", { name: "確定離開" }).click();

  await expect(page.locator("[data-slot]")).toHaveCount(0);
});
