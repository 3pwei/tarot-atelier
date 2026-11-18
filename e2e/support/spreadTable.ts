import { expect, type Locator, type Page } from "@playwright/test";

/** Shared steps for specs that play the spread table. */

export function slot(page: Page, index: number): Locator {
  return page.locator(`[data-slot][data-index='${index}']`);
}

/** The pack in the middle of the table, which shuffles while held. */
export function deckPile(page: Page): Locator {
  return page.getByRole("button", { name: /^(按住牌堆洗牌|牌堆：)/u });
}

/** Waits until the wheel has risen from the bottom edge and stands still. */
export async function wheelRisen(page: Page) {
  await expect(fannedDeck(page)).toBeVisible();
  await expect
    .poll(() =>
      fannedDeck(page).evaluate((wheel) => wheel.getAnimations().length),
    )
    .toBe(0);
}

export function fannedDeck(page: Page): Locator {
  return page.getByRole("group", { name: /^扇形牌堆/u });
}

/** Chooses the first card left in the fan from the keyboard: lift, then draw. */
export async function chooseFirstCard(page: Page) {
  const card = fannedDeck(page).locator("[data-fan-slot]").first();
  await card.focus();
  await page.keyboard.press("Enter");
  await expect(card).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Enter");
}

/**
 * After a shuffle, chooses a card for each of `count` empty positions and
 * waits until they are on the table.
 */
export async function pickAll(page: Page, count: number) {
  await expect(fannedDeck(page)).toBeVisible({ timeout: 15_000 });
  for (let picked = 1; picked <= count; picked += 1) {
    await expect(
      page.getByText(`請選第 ${picked} 張（共 ${count} 張）`, { exact: false }),
    ).toBeVisible();
    await chooseFirstCard(page);
  }
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

/** Dealing needs a main question; asks one and waits until play can start. */
export async function askMainQuestion(
  page: Page,
  question = "這段時間的方向？",
) {
  await expect(page.getByText("請先輸入這次想問的主問題")).toBeVisible();
  await page.getByRole("textbox", { name: /^主問題/u }).fill(question);
  await expect(page.getByText("準備好了，按住牌桌洗牌")).toBeVisible();
}

/**
 * Zooms the table in as a trackpad pinch does (ctrl + wheel), around its
 * centre. There are no zoom buttons; phones pinch with two fingers.
 */
export async function zoomTableIn(page: Page, pinches = 1) {
  const board = page.locator(".spread-board");
  for (let pinch = 0; pinch < pinches; pinch += 1) {
    await board.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      element.dispatchEvent(
        new WheelEvent("wheel", {
          ctrlKey: true,
          deltaY: -100,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
  }
  await expect(board).toHaveAttribute("data-zoomed", "true");
}
