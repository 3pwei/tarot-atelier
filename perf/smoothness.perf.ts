import { expect, test, type Page } from "@playwright/test";
import {
  askMainQuestion,
  chooseFirstCard,
  fannedDeck,
  reveal,
  slot,
} from "../e2e/support/spreadTable";
import { measure, preparePage, trackScriptKilobytes } from "./support/probe";

/**
 * Measures, does not judge: each scenario prints a `PERF {…}` line to compare
 * before and after a change on the same machine. Machines differ too much for
 * fixed thresholds.
 */
test.describe.configure({ mode: "serial", timeout: 180_000 });

const IDLE_MS = 4_000;
const SCROLL_STEPS = 24;
const SCROLL_STEP_PAUSE_MS = 120;
const GESTURE_STEPS = 40;
const HOLD_MS = 2_000;
/** Long enough for the fan's opening slide to finish. */
const FAN_SETTLE_MS = 1_200;
/** Long enough for a chosen card to land. */
const FLIGHT_SETTLE_MS = 1_200;

async function openHome(page: Page) {
  await preparePage(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

test("home page at rest and scrolling", async ({ page }, testInfo) => {
  const scriptKilobytes = trackScriptKilobytes(page, testInfo);
  await openHome(page);
  await measure(page, testInfo, "home-idle", () =>
    page.waitForTimeout(IDLE_MS),
  );
  await measure(page, testInfo, "home-scroll", () => scrollToBottom(page));
  await scriptKilobytes();
});

test("hold to shuffle, fan out, choose cards and burn reveal", async ({
  page,
}, testInfo) => {
  await openHome(page);
  await askMainQuestion(page);
  await page.locator(".spread-board").scrollIntoViewIfNeeded();
  const deck = page.getByRole("button", { name: "按住牌堆洗牌" });
  const box = await deck.boundingBox();
  if (!box) throw new Error("the deck is not visible");

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await measure(page, testInfo, "hold-shuffle", () =>
    page.waitForTimeout(HOLD_MS),
  );
  // Letting go finishes the riffle and fans out every remaining card.
  await measure(page, testInfo, "fan-open", async () => {
    await page.mouse.up();
    await expect(fannedDeck(page)).toBeVisible();
    await page.waitForTimeout(FAN_SETTLE_MS);
  });

  const scroller = page.locator(".card-fan__scroller");
  await scroller.hover();
  await measure(page, testInfo, "fan-scroll", async () => {
    for (let step = 0; step < SCROLL_STEPS / 2; step += 1) {
      await page.mouse.wheel(step < SCROLL_STEPS / 4 ? 160 : -160, 0);
      await page.waitForTimeout(SCROLL_STEP_PAUSE_MS);
    }
  });

  const card = fannedDeck(page).locator("[data-fan-slot]").nth(30);
  await card.scrollIntoViewIfNeeded();
  await card.focus();
  await page.keyboard.press("Enter");
  const lifted = await card.boundingBox();
  if (!lifted) throw new Error("the lifted card is not visible");
  await measure(page, testInfo, "fan-pull", async () => {
    const x = lifted.x + lifted.width / 2;
    const y = lifted.y + lifted.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 10, y - 140, { steps: GESTURE_STEPS });
    await page.mouse.up();
    await page.waitForTimeout(FLIGHT_SETTLE_MS);
  });

  await chooseFirstCard(page);
  await chooseFirstCard(page);
  await expect(page.getByText("點擊卡牌，以火焰逐一揭示牌面")).toBeVisible({
    timeout: 15_000,
  });
  await measure(page, testInfo, "burn-reveal", () => reveal(page, 1));
});

test("drag a position and pan a zoomed table", async ({ page }, testInfo) => {
  await openHome(page);
  await askMainQuestion(page);
  const board = page.locator(".spread-board");
  await board.scrollIntoViewIfNeeded();

  await page.getByRole("button", { name: "編輯牌陣" }).click();
  await measure(page, testInfo, "table-drag", () =>
    dragFrom(page, slot(page, 3), -60, -50),
  );
  await page.getByRole("button", { name: "完成編輯" }).click();
  // The drag is not saved; leaving restores the layout.
  await page
    .getByRole("alertdialog", { name: "牌陣還沒儲存" })
    .getByRole("button", { name: "確定離開" })
    .click();

  await page.getByRole("button", { name: "放大牌桌" }).click();
  await page.getByRole("button", { name: "放大牌桌" }).click();
  const box = await board.boundingBox();
  if (!box) throw new Error("the spread board is not visible");
  // A corner of the cloth, away from the positions in the middle.
  const start = { x: box.x + box.width * 0.06, y: box.y + box.height * 0.9 };
  await measure(page, testInfo, "table-pan", () =>
    dragPoint(page, start, 80, -60),
  );
});

async function scrollToBottom(page: Page) {
  for (let step = 0; step < SCROLL_STEPS; step += 1) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(SCROLL_STEP_PAUSE_MS);
  }
}

async function dragFrom(
  page: Page,
  target: ReturnType<typeof slot>,
  dx: number,
  dy: number,
) {
  const box = await target.boundingBox();
  if (!box) throw new Error("the position to drag is not visible");
  await dragPoint(
    page,
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    dx,
    dy,
  );
  await expect(target).toBeVisible();
}

async function dragPoint(
  page: Page,
  start: { x: number; y: number },
  dx: number,
  dy: number,
) {
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  // Leave the drag threshold at once so a slow step never reads as a long press.
  await page.mouse.move(start.x + Math.sign(dx) * 10, start.y);
  await page.mouse.move(start.x + dx, start.y + dy, { steps: GESTURE_STEPS });
  await page.mouse.up();
}
