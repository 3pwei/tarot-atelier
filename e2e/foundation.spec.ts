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
