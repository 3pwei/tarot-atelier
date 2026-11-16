import { expect, test, type Page } from "@playwright/test";
import {
  askMainQuestion,
  dealAll,
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

test("shuffle, deal and burn reveal", async ({ page }, testInfo) => {
  await openHome(page);
  await askMainQuestion(page);
  await page.locator(".spread-board").scrollIntoViewIfNeeded();
  await measure(page, testInfo, "shuffle-and-deal", async () => {
    await page.getByRole("button", { name: "洗牌", exact: true }).click();
    await dealAll(page, 3);
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
