import { expect, test } from "@playwright/test";

test("deck library exposes 78 definitions and has no horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /鋪開你的牌桌/u }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "卡牌庫" })).toBeVisible();
  await expect(page.getByText("78 張定義")).toBeVisible();
  await expect(page.getByTestId("catalog-card")).toHaveCount(78);

  await page.getByLabel("目前牌組").selectOption("phase-one-test-deck");
  await expect(page.getByText("3 張定義")).toBeVisible();
  await expect(page.getByLabel("卡圖素材缺失").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "逆位" })).toBeDisabled();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("draw experience supports keyboard shuffle, draw, and reveal", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "洗牌", exact: true }).click();

  const pile = page.getByRole("button", { name: "從牌堆抽一張牌" });
  await expect(pile).toBeEnabled();
  await pile.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");

  await expect(page.getByText("牌面已揭示")).toBeVisible();
  const drawnCards = page.locator("[data-draw-card]");
  const drawnCount = await drawnCards.count();
  expect(drawnCount).toBeGreaterThanOrEqual(1);
  expect(drawnCount).toBeLessThanOrEqual(2);
  await expect(
    page.getByRole("button", { name: "洗牌", exact: true }),
  ).toBeEnabled();
});
