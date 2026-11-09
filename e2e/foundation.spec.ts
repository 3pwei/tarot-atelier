import { expect, test } from "@playwright/test";
import { askMainQuestion } from "./support/spreadTable";

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

test("draw experience supports keyboard shuffle, dealing, and burn reveal", async ({
  page,
}) => {
  // Burns three or more cards in turn.
  test.slow();
  await page.goto("/");
  await askMainQuestion(page);
  await page.getByRole("button", { name: "洗牌", exact: true }).click();

  const pile = page.getByRole("button", { name: "從牌堆發牌到 3 個牌位" });
  await expect(pile).toBeEnabled();
  await pile.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");

  await expect(page.getByText("點擊卡牌，以火焰逐一揭示牌面")).toBeVisible({
    timeout: 10_000,
  });
  const drawnCards = page.locator("[data-draw-card]");
  const drawnCount = await drawnCards.count();
  expect(drawnCount).toBeGreaterThanOrEqual(3);
  expect(drawnCount).toBeLessThanOrEqual(6);
  await expect(
    page.getByRole("button", { name: "洗牌", exact: true }),
  ).toBeDisabled();

  const sealed = page.getByRole("button", { name: /^以火焰揭示牌位/u });
  for (let left = drawnCount; left > 0; left -= 1) {
    const card = sealed.first();
    await expect(card).toHaveAttribute("aria-disabled", "false");
    await card.focus();
    await page.keyboard.press("Enter");
    await expect(sealed).toHaveCount(left - 1, { timeout: 20_000 });
  }

  await expect(page.getByText("牌陣已完成")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("[data-reveal-state='revealed']")).toHaveCount(
    drawnCount,
  );
});

test("pointer reveal burns away the card back from the touched point", async ({
  page,
}) => {
  await page.goto("/");
  await askMainQuestion(page);
  await page.getByRole("button", { name: "洗牌", exact: true }).click();
  await page.getByRole("button", { name: "從牌堆發牌到 3 個牌位" }).click();

  const card = page.getByRole("button", { name: "以火焰揭示牌位 1 主牌" });
  await expect(card).toHaveAttribute("aria-disabled", "false");
  // Light it away from the number badge that sits on the top-left corner.
  const box = await card.boundingBox();
  await card.click({
    position: { x: (box?.width ?? 60) * 0.65, y: (box?.height ?? 90) * 0.7 },
  });

  await expect(page.locator("[data-burn-reveal]").first()).toBeAttached();
  await expect(
    page.locator("[data-index='1'] [data-draw-card='primary']"),
  ).toHaveAttribute("data-reveal-state", "revealed", { timeout: 10_000 });
  await expect(
    page.getByRole("button", {
      name: /^牌位 1 主牌：.+，(正位|逆位)，點擊放大$/u,
    }),
  ).toBeVisible();
});
