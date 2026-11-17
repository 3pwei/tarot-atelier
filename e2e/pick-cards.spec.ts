import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  askMainQuestion,
  deckPile,
  fannedDeck,
  slot,
  wheelRisen,
} from "./support/spreadTable";

/** Hold the pack in the middle to wash, then choose cards from the wheel by pulling them. */

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

test("the deck lies in the middle of the table, with no separate shuffle button", async ({
  page,
}) => {
  const board = await page.locator(".spread-board").boundingBox();
  if (!board) throw new Error("the table is not visible");
  const deck = await centreOf(deckPile(page));
  expect(Math.abs(deck.x - (board.x + board.width / 2))).toBeLessThan(
    board.width * 0.05,
  );
  expect(Math.abs(deck.y - (board.y + board.height / 2))).toBeLessThan(
    board.height * 0.08,
  );
  await expect(
    page.getByRole("button", { name: "洗牌", exact: true }),
  ).toHaveCount(0);
});

test("holding the deck lifts its cards into a vortex of cards as large as the positions", async ({
  page,
}) => {
  const at = await centreOf(deckPile(page));
  const slotWidth = (await slot(page, 1).boundingBox())?.width ?? 0;
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  const card = page.locator(".table-vortex__card").first();
  await expect(card).toBeVisible();
  // Each card swings across its ring and, inside that, up and down.
  expect(
    await card.evaluate(
      (node) =>
        `${getComputedStyle(node.parentElement!).animationName} ${getComputedStyle(node).animationName}`,
    ),
  ).toBe("vortex-across vortex-bob");
  // Same deck, same card size: in the air as on the table.
  const cardWidth = await page
    .locator(".table-vortex__card")
    .first()
    .evaluate((node) => (node as HTMLElement).offsetWidth);
  expect(Math.abs(cardWidth - slotWidth)).toBeLessThanOrEqual(2);
  await page.mouse.up();
  await expect(fannedDeck(page)).toBeVisible();
  const wheelCardWidth = await fannedDeck(page)
    .locator("[data-fan-slot]")
    .first()
    .evaluate((node) => (node as HTMLElement).offsetWidth);
  expect(Math.abs(wheelCardWidth - slotWidth)).toBeLessThanOrEqual(2);
});

test("a touch on the pack does not lift or enlarge its top card", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "touch only");
  const pile = deckPile(page);
  const top = pile.locator("[data-deck-top]");
  const before = await top.evaluate((node) => getComputedStyle(node).transform);
  await pile.tap();
  await expect(fannedDeck(page)).toBeVisible();
  // The pack is back once the spread is cleared; a finger leaves no hover.
  await page.getByRole("button", { name: "清除本次牌陣" }).click();
  expect(
    await page
      .locator("[data-deck-top]")
      .evaluate((node) => getComputedStyle(node).transform),
  ).toBe(before);
  expect(
    await page
      .locator(".table-deck")
      .evaluate((node) => getComputedStyle(node).userSelect),
  ).toBe("none");
});

test("cards lift off the pile a few at a time until twenty are in the air", async ({
  page,
}) => {
  const pile = await centreOf(deckPile(page));
  await page.mouse.move(pile.x, pile.y);
  await page.mouse.down();
  // A card is in the air once its climb from the pile has begun.
  const airborne = () =>
    page
      .locator(".table-vortex__lift")
      .evaluateAll(
        (lifts) =>
          lifts.filter((lift) =>
            lift
              .getAnimations()
              .some(
                (climb) =>
                  (climb.effect?.getComputedTiming().progress ?? 0) > 0,
              ),
          ).length,
      );
  await expect(page.locator(".table-vortex__card")).toHaveCount(20);
  await expect(page.locator(".table-vortex__firefly")).toHaveCount(8);
  const early = await airborne();
  expect(early).toBeLessThan(20);
  // Climbing cards show only their backs, and the lights wait for a full whirl.
  const shown = (selector: string) =>
    page
      .locator(selector)
      .evaluateAll((nodes) =>
        nodes.some((node) => Number(getComputedStyle(node).opacity) > 0),
      );
  expect(await shown(".table-vortex__front")).toBe(false);
  expect(await shown(".table-vortex__firefly-path")).toBe(false);
  await expect.poll(airborne, { timeout: 8_000 }).toBe(20);
  await expect
    .poll(() => shown(".table-vortex__firefly-path"), { timeout: 8_000 })
    .toBe(true);
  await page.mouse.up();
  await expect(fannedDeck(page)).toBeVisible();
});

test("a quick tap still floats every card down to the table, without swirling", async ({
  page,
}) => {
  await deckPile(page).click();
  const settled = page.locator(".table-vortex__settle .table-vortex__laid");
  await expect(settled).toHaveCount(20);
  // The circling lights belong to the air, not to the table.
  await expect(page.locator(".table-vortex__firefly").first()).toBeHidden();
  expect(
    await page
      .locator(".table-vortex__spot")
      .first()
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe("settle-land");
  await expect(page.locator(".table-vortex__swirl")).toHaveCount(0);
  await expect(fannedDeck(page)).toBeVisible();
});

test("starting over from the laid-out wheel needs no confirmation", async ({
  page,
}) => {
  await deckPile(page).click();
  await expect(fannedDeck(page)).toBeVisible();
  await page.getByRole("button", { name: "清除本次牌陣" }).click();
  await expect(fannedDeck(page)).toHaveCount(0);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(deckPile(page)).toBeVisible();
});

test("holding the deck keeps shuffling until it is let go", async ({
  page,
}) => {
  const deck = page.getByRole("button", { name: "按住牌堆洗牌" });
  const at = await centreOf(deck);
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  // Longer than one full round: still shuffling while held.
  await page.waitForTimeout(2_000);
  await expect(page.getByText("洗牌中，放開後收牌攤開")).toBeVisible();
  await expect(fannedDeck(page)).toHaveCount(0);

  await page.mouse.up();
  await expect(fannedDeck(page)).toBeVisible();
  await expect(fannedDeck(page).locator("[data-fan-slot]")).toHaveCount(78);
});

type Point = { readonly x: number; readonly y: number };

/** A point on the table, as shares of its width and height. */
async function onTable(page: Page, share: Point): Promise<Point> {
  const box = await page.locator(".spread-board").boundingBox();
  if (!box) throw new Error("the table is not visible");
  return { x: box.x + box.width * share.x, y: box.y + box.height * share.y };
}

/** Presses the table with one finger or the mouse, holds, and lets go. */
async function pressTable(
  page: Page,
  at: Point,
  holdMs: number,
  isMobile: boolean,
  whileHeld: () => Promise<void> = async () => undefined,
) {
  if (!isMobile) {
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.waitForTimeout(holdMs);
    await whileHeld();
    await page.mouse.up();
    return;
  }
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [at],
  });
  await page.waitForTimeout(holdMs);
  await whileHeld();
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

test("holding anywhere on the table shuffles, not only the pack", async ({
  page,
  isMobile,
}) => {
  const corner = await onTable(page, { x: 0.08, y: 0.12 });
  await pressTable(page, corner, 1_500, isMobile, async () => {
    await expect(page.getByText("洗牌中，放開後收牌攤開")).toBeVisible();
  });

  await expect(fannedDeck(page)).toBeVisible();
  await expect(fannedDeck(page).locator("[data-fan-slot]")).toHaveCount(78);
});

test("pressing a position before the shuffle shuffles instead of selecting it", async ({
  page,
  isMobile,
}) => {
  await pressTable(page, await centreOf(slot(page, 1)), 300, isMobile);

  await expect(fannedDeck(page)).toBeVisible();
  await expect(slot(page, 1)).not.toHaveAttribute("data-selected");
});

test("two fingers still pinch the table before the shuffle", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "only touch screens pinch with two fingers");
  const client = await page.context().newCDPSession(page);
  // Across the pack, where a pinch is most likely to start.
  const middle = await onTable(page, { x: 0.5, y: 0.45 });
  const fingers = (gap: number) => [
    { x: middle.x - gap, y: middle.y, id: 1 },
    { x: middle.x + gap, y: middle.y, id: 2 },
  ];
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: fingers(30),
  });
  for (let gap = 40; gap <= 120; gap += 10) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: fingers(gap),
    });
  }
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });

  await expect(page.locator(".spread-board")).toHaveAttribute(
    "data-zoomed",
    "true",
  );
  await expect(page.getByText("準備好了，按住牌桌洗牌")).toBeVisible();
  await expect(fannedDeck(page)).toHaveCount(0);
});

test("a lifted card pulled up and out goes to the next position", async ({
  page,
}) => {
  await deckPile(page).click();
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
  // No reshuffle until every position has its card: the pack is on the wheel.
  await expect(deckPile(page)).toHaveCount(0);
});

test("a sideways drag turns the wheel on a narrow table", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "the whole deck fits on a wide table");
  await deckPile(page).click();
  // A drag is aimed at where the wheel ends up, so it has to have risen.
  await wheelRisen(page);
  const wheel = page.locator(".card-wheel__wheel");
  const board = await page.locator(".spread-board").boundingBox();
  if (!board) throw new Error("the table is not visible");
  const start = {
    x: board.x + board.width / 2,
    y: board.y + board.height - 16,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 120, start.y, { steps: 10 });
  await page.mouse.up();

  const turn = await wheel.evaluate((element) =>
    Number.parseFloat(element.style.getPropertyValue("--wheel-turn")),
  );
  expect(turn).toBeGreaterThan(0);
  // A drag that turns the wheel draws nothing.
  await expect(slot(page, 1).locator("[data-draw-card]")).toHaveCount(0);
});
