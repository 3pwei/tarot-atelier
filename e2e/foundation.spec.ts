import { expect, test } from "@playwright/test";
import {
  askMainQuestion,
  deckPile,
  openChapter,
  pickAll,
} from "./support/spreadTable";

test("the codex shows every card a section at a time, printed on the page", async ({
  page,
}) => {
  await page.goto("/#codex");

  await expect(
    page.getByRole("heading", { name: "The Codex of Cards" }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "單卡檢視" })).toBeVisible();
  let total = 0;
  for (const section of ["大牌", "權杖", "聖杯", "寶劍", "錢幣"]) {
    await page.getByRole("button", { name: section, exact: true }).click();
    total += await page.getByTestId("catalog-card").count();
  }
  expect(total).toBe(78);

  // Test decks stay out of the site: the only deck is named, not offered.
  await expect(page.getByLabel("目前牌組")).toHaveCount(0);
  await expect(page.getByText(/工坊標準塔羅/u)).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("draw experience supports keyboard shuffle, choosing, and burn reveal", async ({
  page,
}) => {
  // Burns three or more cards in turn.
  test.slow();
  await openChapter(page);
  await askMainQuestion(page);
  // Holding the space bar on the deck shuffles until it is let go.
  const deck = page.getByRole("button", { name: "按住牌堆洗牌" });
  await deck.focus();
  await page.keyboard.down(" ");
  await expect(page.getByText("洗牌中，放開後收牌攤開")).toBeVisible();
  await page.keyboard.up(" ");

  await pickAll(page, 3);
  const drawnCards = page.locator("[data-draw-card]");
  const drawnCount = await drawnCards.count();
  expect(drawnCount).toBeGreaterThanOrEqual(3);
  expect(drawnCount).toBeLessThanOrEqual(6);
  // Every position has its card: the rest of the deck leaves the table.
  await expect(deckPile(page)).toBeHidden();

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
  await openChapter(page);
  await askMainQuestion(page);
  await deckPile(page).click();
  await pickAll(page, 3);

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
