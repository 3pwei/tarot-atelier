import { expect, test } from "@playwright/test";

test("foundation page is honest and has no horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /鋪開你的牌桌/u }),
  ).toBeVisible();
  await expect(page.getByLabel("靜態牌桌預覽，尚未啟用抽牌功能")).toBeVisible();
  await expect(page.getByRole("button", { name: /抽牌/u })).toHaveCount(0);

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});
