import { expect, test, type Page } from "@playwright/test";
import { openChapter } from "./support/spreadTable";

/** A contents entry, found by the title it shows. */
function entry(page: Page, title: string) {
  return page.getByRole("button", { name: new RegExp(`^${title}，`, "u") });
}

test("the book opens from its cover to the frontispiece and the contents", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打開魔法書" }).click();
  await expect(
    page.getByRole("img", { name: /巫師站在高塔上/u }),
  ).toBeVisible();
  await expect(page.getByText("僅供娛樂與自我反思")).toBeVisible();

  // On a phone the contents is the next page; on a desk they face each other.
  if (isMobile) await page.getByRole("button", { name: "翻到目錄" }).click();
  await expect(entry(page, "The Three Cards")).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("a contents entry glows on the first tap and turns on the second", async ({
  page,
}) => {
  await page.goto("/#contents");
  const cross = entry(page, "The Cross");
  await cross.click();
  await expect(cross).toHaveAttribute("data-lit", "true");
  await expect(page).toHaveURL(/#contents$/u);

  await cross.click();
  await expect(page.getByRole("heading", { name: "The Cross" })).toBeFocused();
  await expect(page).toHaveURL(/#spread-five-card$/u);
  await expect(page.locator("[data-slot]")).toHaveCount(5);
});

test("Enter on a contents entry turns at once", async ({ page }) => {
  await page.goto("/#contents");
  await entry(page, "The Circle").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "The Circle" })).toBeVisible();
  await expect(page.locator("[data-slot]")).toHaveCount(8);
});

test("Back and the browser's back button both return to the contents", async ({
  page,
}) => {
  await page.goto("/#contents");
  const single = entry(page, "The Single Card");
  await single.click();
  await single.click();
  await expect(page.locator("[data-slot]")).toHaveCount(1);

  await page.goBack();
  await expect(entry(page, "The Single Card")).toBeVisible();
  await page.goForward();
  await expect(page.locator("[data-slot]")).toHaveCount(1);

  await page.getByRole("button", { name: "回到目錄" }).click();
  await expect(page).toHaveURL(/#contents$/u);
  await expect(entry(page, "The Single Card")).toBeVisible();
});

test("leaving a chapter with cards face down asks first", async ({ page }) => {
  await openChapter(page);
  await page.getByRole("button", { name: "編輯牌陣" }).click();
  await page.getByRole("button", { name: "回到目錄" }).click();

  const question = page.getByRole("alertdialog", { name: "離開這一章？" });
  await expect(question).toBeVisible();
  await question.getByRole("button", { name: "取消" }).click();
  await expect(page).toHaveURL(/#spread-three-card$/u);
});

test("a spread saved in a chapter becomes a chapter of its own", async ({
  page,
}) => {
  await openChapter(page);
  await page.getByRole("button", { name: "編輯牌陣" }).click();
  await page.getByRole("button", { name: "儲存目前牌陣" }).click();
  await page.getByLabel("牌陣名稱").fill("我的三張");
  await page.getByRole("button", { name: "儲存", exact: true }).click();
  await page.getByRole("button", { name: "結束編輯" }).click();

  await page.getByRole("button", { name: "回到目錄" }).click();
  await expect(entry(page, "我的三張")).toBeVisible();
});

test("opening the cover plays, then the frontispiece takes the focus", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打開魔法書" }).click();
  await expect(page.locator(".opening")).toBeAttached();
  await expect(page.locator(".opening")).toHaveCount(0, { timeout: 5_000 });
  await expect(
    page.getByRole("img", { name: /巫師站在高塔上/u }),
  ).toBeVisible();
});

test("a turning leaf never blocks the page's buttons", async ({ page }) => {
  await page.goto("/#contents");
  const codex = entry(page, "The Codex");
  await codex.click();
  await codex.click();
  await expect(page.locator(".page-turn__sheet")).toHaveCount(7);
  await expect(page.locator(".page-turn")).toHaveCount(0);
  // The first click after landing reaches the page, not a leftover layer.
  await page.getByRole("button", { name: "回到目錄" }).click();
  await expect(entry(page, "The Codex")).toBeVisible();
});

test("a chapter opened from a link turns its leaf back to the contents", async ({
  page,
}) => {
  await page.goto("/#spread-three-card");
  await expect(page.locator("[data-slot]")).toHaveCount(3);
  await page.getByRole("button", { name: "回到目錄" }).click();
  await expect(page.locator(".page-turn")).toBeAttached();
  await expect(entry(page, "The Three Cards")).toBeVisible();
});

test("with less motion, pages swap with no opening and no leaf", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "打開魔法書" }).click();
  await expect(page.locator(".opening")).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: /巫師站在高塔上/u }),
  ).toBeVisible();
  await page.goto("/#contents");
  const single = entry(page, "The Single Card");
  await single.click();
  await single.click();
  await expect(page.locator(".page-turn")).toHaveCount(0);
  await expect(page.locator("[data-slot]")).toHaveCount(1);
});

test("the page sound is off until turned on, and stays on after a reload", async ({
  page,
}) => {
  await page.goto("/#contents");
  const toggle = page.getByRole("button", { name: "翻頁聲" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: "翻頁聲" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
