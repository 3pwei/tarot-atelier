import { expect, type Locator, type Page } from "@playwright/test";

/** Shared steps for specs that play the spread table. */

export function slot(page: Page, index: number): Locator {
  return page.locator(`[data-slot][data-index='${index}']`);
}

/** One deck click deals every empty position. */
export async function dealAll(page: Page, count: number) {
  await page
    .getByRole("button", { name: `從牌堆發牌到 ${count} 個牌位` })
    .click();
  await expect(page.getByText("點擊卡牌，以火焰逐一揭示牌面")).toBeVisible({
    timeout: 15_000,
  });
}

export async function reveal(page: Page, index: number) {
  const cards = slot(page, index).locator("[data-draw-card]");
  const count = await cards.count();
  for (const role of count === 2 ? ["主牌", "跳牌"] : ["主牌"]) {
    const card = page.getByRole("button", {
      name: `以火焰揭示牌位 ${index} ${role}`,
    });
    // Cards can only be lit once they have landed.
    await expect(card).toHaveAttribute("aria-disabled", "false");
    await card.focus();
    await page.keyboard.press("Enter");
  }
  await expect(
    slot(page, index).locator("[data-reveal-state='revealed']"),
  ).toHaveCount(count, { timeout: 20_000 });
}
