import { expect, test, type Locator, type Page } from "@playwright/test";

// Each test deals and burns several cards; software-rendered CI browsers need headroom.
test.describe.configure({ timeout: 90_000 });

/** Allowed gap between a landed card's centre and its position's centre. */
const LANDING_TOLERANCE_PX = 2;

function slot(page: Page, index: number): Locator {
  return page.locator(`[data-slot][data-index='${index}']`);
}

function handle(page: Page, index: number): Locator {
  return slot(page, index).getByRole("button", {
    name: new RegExp(`^牌位 ${index}：`, "u"),
  });
}

async function center(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("element is not visible");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function relativePosition(page: Page, index: number) {
  return slot(page, index).evaluate((element) => ({
    x: Number.parseFloat(element.style.getPropertyValue("--x")),
    y: Number.parseFloat(element.style.getPropertyValue("--y")),
  }));
}

/** Drags with a mouse on desktop and a real touch sequence on mobile. */
async function dragBy(
  page: Page,
  target: Locator,
  dx: number,
  dy: number,
  isMobile: boolean,
) {
  const start = await center(target);
  const steps = 8;
  if (!isMobile) {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + dx, start.y + dy, { steps });
    await page.mouse.up();
    return;
  }
  const client = await page.context().newCDPSession(page);
  const touch = async (
    type: "touchStart" | "touchMove" | "touchEnd",
    x: number,
    y: number,
  ) =>
    client.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y }],
    });
  await touch("touchStart", start.x, start.y);
  for (let step = 1; step <= steps; step += 1) {
    await touch(
      "touchMove",
      start.x + (dx * step) / steps,
      start.y + (dy * step) / steps,
    );
  }
  await touch("touchEnd", start.x + dx, start.y + dy);
}

async function drawAndReveal(page: Page, index: number) {
  await page
    .getByRole("button", { name: `從牌堆為牌位 ${index} 抽牌` })
    .click();
  const cards = slot(page, index).locator("[data-draw-card]");
  await expect(cards.first()).toHaveAttribute("data-reveal-state", "sealed");
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

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("準備好了，請洗牌")).toBeVisible();
  await page.locator(".spread-board").scrollIntoViewIfNeeded();
});

test("cards land exactly on moved, rotated positions of a zoomed table", async ({
  page,
  isMobile,
}) => {
  const before = await relativePosition(page, 3);
  await dragBy(page, slot(page, 3), -30, -40, isMobile);
  const after = await relativePosition(page, 3);
  expect(after.x).toBeLessThan(before.x);
  expect(after.y).toBeLessThan(before.y);

  await handle(page, 2).click();
  await page.getByLabel("旋轉（度）").fill("45");
  await page.getByRole("button", { name: "完成" }).click();
  await page.getByRole("button", { name: "放大牌桌" }).click();
  await expect(
    page.getByRole("button", { name: /縮放 1.25 倍/u }),
  ).toBeVisible();

  await page.getByRole("button", { name: "洗牌", exact: true }).click();
  for (const index of [1, 2, 3]) {
    await drawAndReveal(page, index);
    const card = await center(
      slot(page, index).locator("[data-draw-card='primary'] .drawn-card__body"),
    );
    const target = await center(slot(page, index));
    expect(Math.abs(card.x - target.x)).toBeLessThanOrEqual(
      LANDING_TOLERANCE_PX,
    );
    expect(Math.abs(card.y - target.y)).toBeLessThanOrEqual(
      LANDING_TOLERANCE_PX,
    );
  }
  await expect(page.getByText("牌陣已完成")).toBeVisible();

  // Moving a drawn position keeps its card: no redraw.
  const remaining = await page
    .locator(".draw-status > span")
    .last()
    .textContent();
  const drawnName = await page
    .getByRole("button", { name: /^牌位 1 主牌：/u })
    .getAttribute("aria-label");
  await handle(page, 1).focus();
  await page.keyboard.press("Shift+ArrowDown");
  await expect(
    page.getByRole("button", { name: drawnName ?? "" }),
  ).toBeVisible();
  await expect(page.locator(".draw-status > span").last()).toHaveText(
    remaining ?? "",
  );
  expect(await relativePosition(page, 1)).toMatchObject({ y: 0.55 });
});

test("custom spreads need questions and stop at twelve positions", async ({
  page,
}) => {
  await page.getByRole("button", { name: "完全自訂" }).click();
  await expect(page.getByText("請先新增至少一個牌位")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "洗牌", exact: true }),
  ).toBeDisabled();

  const add = page.getByRole("button", { name: "＋ 新增牌位" });
  for (let count = 1; count <= 12; count += 1) await add.click();
  await expect(page.locator("[data-slot]")).toHaveCount(12);
  await add.click();
  await expect(page.locator("[data-slot]")).toHaveCount(12);
  await expect(page.getByText(/牌位最多 12 個/u)).toBeVisible();

  await expect(page.getByText("請先為牌位 1 設定問題")).toBeVisible();
  for (let index = 1; index <= 12; index += 1) {
    await handle(page, index).focus();
    await page.keyboard.press("Enter");
    await page.getByLabel(/這個牌位的問題/u).fill(`第 ${index} 個問題`);
  }
  await expect(
    page.getByRole("button", { name: "洗牌", exact: true }),
  ).toBeEnabled();

  await handle(page, 12).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "刪除牌位" }).click();
  await expect(page.getByText("已移除牌位 12。")).toBeVisible();
  await expect(page.locator("[data-slot]")).toHaveCount(11);
});

test("keyboard and numeric keypad move a position", async ({ page }) => {
  const before = await relativePosition(page, 1);
  await handle(page, 1).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Numpad2");
  await page.keyboard.press("]");
  const after = await relativePosition(page, 1);
  expect(after.x).toBeCloseTo(before.x + 0.01, 5);
  expect(after.y).toBeCloseTo(before.y + 0.01, 5);
  await expect(slot(page, 1)).toHaveAttribute("style", /--rot: 15deg/u);
});

test("the spread survives a page reload", async ({ page }) => {
  await page.getByLabel(/主問題/u).fill("下個月的方向");
  await page.getByRole("button", { name: "五張十字" }).click();
  await page.getByRole("button", { name: "洗牌", exact: true }).click();
  await drawAndReveal(page, 1);
  await page.waitForTimeout(400);

  await page.reload();
  await expect(page.getByText("已載入上次的牌陣。")).toBeVisible();
  await expect(page.getByLabel(/主問題/u)).toHaveValue("下個月的方向");
  await expect(page.locator("[data-slot]")).toHaveCount(5);
  await expect(
    slot(page, 1).locator("[data-reveal-state='revealed']").first(),
  ).toBeVisible();
  await expect(page.getByText("準備好了，請洗牌")).toBeVisible();

  await page.getByRole("button", { name: "清除本次牌陣" }).click();
  await page.getByRole("button", { name: "確定清除" }).click();
  await expect(page.locator("[data-slot]")).toHaveCount(3);
  await expect(page.locator("[data-draw-card]")).toHaveCount(0);
});

test("corrupted saved data falls back to a working table", async ({ page }) => {
  await page.evaluate(() =>
    window.localStorage.setItem(
      "tarot-atelier:spread-session",
      '{"schemaVersion":1,"session":{"deckId":"atelier-standard-tarot","spread":{"positions":"x"}}}',
    ),
  );
  await page.reload();
  await expect(
    page.getByText("本機儲存的牌陣無法讀取，已重新開始。"),
  ).toBeVisible();
  await expect(page.locator("[data-slot]")).toHaveCount(3);
});

test("the table fits the viewport without horizontal scrolling", async ({
  page,
}) => {
  await page.getByRole("button", { name: "圓環" }).click();
  await expect(page.locator("[data-slot]")).toHaveCount(8);
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

  const board = await page.locator(".spread-board").boundingBox();
  for (let index = 1; index <= 8; index += 1) {
    const box = await slot(page, index).boundingBox();
    expect(box && board).toBeTruthy();
    if (!box || !board) continue;
    expect(box.x).toBeGreaterThanOrEqual(board.x);
    expect(box.x + box.width).toBeLessThanOrEqual(board.x + board.width);
    expect(box.y).toBeGreaterThanOrEqual(board.y);
    expect(box.y + box.height).toBeLessThanOrEqual(board.y + board.height);
  }
});
