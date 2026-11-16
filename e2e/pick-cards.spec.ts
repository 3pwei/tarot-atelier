import { expect, test, type Locator, type Page } from "@playwright/test";
import { askMainQuestion, fannedDeck, slot } from "./support/spreadTable";

/** Hold to shuffle, then choose cards from the fanned deck by pulling them. */

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await askMainQuestion(page);
  await page.locator(".spread-board").scrollIntoViewIfNeeded();
});

async function centreOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("the element is not visible");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Lifts a card from the keyboard; a second Enter would draw it. */
async function lift(page: Page, card: Locator) {
  await card.focus();
  await page.keyboard.press("Enter");
  await expect(card).toHaveAttribute("aria-pressed", "true");
}

/** Pulls a lifted card up by `distance` pixels and lets go. */
async function pull(page: Page, card: Locator, distance: number) {
  const start = await centreOf(card);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x, start.y - distance, { steps: 8 });
  await page.mouse.up();
}

test("holding the deck keeps shuffling until it is let go", async ({
  page,
}) => {
  const deck = page.getByRole("button", { name: "按住牌堆洗牌" });
  const at = await centreOf(deck);
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  // Longer than one full round: still shuffling while held.
  await page.waitForTimeout(2_000);
  await expect(page.getByText("洗牌中，放開後攤開牌")).toBeVisible();
  await expect(fannedDeck(page)).toHaveCount(0);

  await page.mouse.up();
  await expect(fannedDeck(page)).toBeVisible();
  await expect(fannedDeck(page).locator("[data-fan-slot]")).toHaveCount(78);
});

test("a lifted card pulled up and out goes to the next position", async ({
  page,
}) => {
  await page.getByRole("button", { name: "洗牌", exact: true }).click();
  const card = fannedDeck(page).locator('[data-fan-slot="39"]');
  await card.scrollIntoViewIfNeeded();

  // A short pull is not enough: the card settles back, still lifted.
  await lift(page, card);
  await pull(page, card, 20);
  await expect(card).toHaveAttribute("aria-pressed", "true");
  await expect(slot(page, 1).locator("[data-draw-card]")).toHaveCount(0);

  await pull(page, card, 110);
  await expect(card).toHaveCount(0);
  await expect(slot(page, 1).locator("[data-draw-card]")).not.toHaveCount(0);
  await expect(slot(page, 2).locator("[data-draw-card]")).toHaveCount(0);
  await expect(page.getByText(/^請選第 2 張（共 3 張）/u)).toBeVisible();
  // No reshuffle until every position has its card.
  await expect(
    page.getByRole("button", { name: "洗牌", exact: true }),
  ).toBeDisabled();
});
