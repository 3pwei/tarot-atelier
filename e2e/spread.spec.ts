import { expect, test, type Locator, type Page } from "@playwright/test";
import { dealAll, reveal, slot } from "./support/spreadTable";

// Each test deals and burns several cards; software-rendered CI browsers need headroom.
test.describe.configure({ timeout: 90_000 });

/** Allowed gap between a landed card's centre and its position's centre. */
const LANDING_TOLERANCE_PX = 2;

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

/** Pages whose timers Playwright already controls; install only once each. */
const pagesWithClock = new WeakSet<Page>();

/**
 * How far ahead the paused clock is set. Playwright refuses to pause in the
 * past, and each protocol call takes time on slow machines.
 */
const PAUSE_LEAD_MS = 1_000;

/**
 * Runs `action` while the page's timers are paused, then resumes them even if
 * the action fails. Use it for gestures that must not race a timer: on slow
 * machines a single input step can take longer than the long-press delay.
 */
async function withPageTimersPaused(page: Page, action: () => Promise<void>) {
  if (!pagesWithClock.has(page)) {
    await page.clock.install();
    pagesWithClock.add(page);
  }
  await page.clock.pauseAt(Date.now() + PAUSE_LEAD_MS);
  try {
    await action();
  } finally {
    await page.clock.resume();
  }
}

/**
 * Drags with a mouse on desktop and a real touch sequence on mobile.
 * A drag tests moving, so the long-press timer is held off; rotating by long
 * press has its own test that deliberately holds still.
 */
async function dragBy(
  page: Page,
  target: Locator,
  dx: number,
  dy: number,
  isMobile: boolean,
) {
  await withPageTimersPaused(page, () =>
    dragWithInput(page, target, dx, dy, isMobile),
  );
}

async function dragWithInput(
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

/** Moving and rotating positions needs arrange mode. */
async function arrange(page: Page) {
  await page.getByRole("button", { name: "編輯牌陣" }).click();
}

async function finishArranging(page: Page) {
  await page.getByRole("button", { name: "完成編輯" }).click();
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
  await arrange(page);
  const before = await relativePosition(page, 3);
  await dragBy(page, slot(page, 3), -30, -40, isMobile);
  const after = await relativePosition(page, 3);
  expect(after.x).toBeLessThan(before.x);
  expect(after.y).toBeLessThan(before.y);

  await handle(page, 2).click();
  await page.getByLabel("旋轉（度）").fill("45");
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await finishArranging(page);
  await page.getByRole("button", { name: "放大牌桌" }).click();
  await expect(
    page.getByRole("button", { name: /縮放 1.25 倍/u }),
  ).toBeVisible();

  await page.getByRole("button", { name: "洗牌", exact: true }).click();
  await dealAll(page, 3);
  for (const index of [3, 1, 2]) {
    await reveal(page, index);
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
  await arrange(page);
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
  await arrange(page);
  await page.getByRole("button", { name: "空白牌桌" }).click();
  await expect(
    page.getByText("請按「編輯牌陣」新增至少一個牌位"),
  ).toBeVisible();

  const add = page.getByRole("button", { name: "＋ 新增牌位" });
  for (let count = 1; count <= 12; count += 1) await add.click();
  await expect(page.locator("[data-slot]")).toHaveCount(12);
  await add.click();
  await expect(page.locator("[data-slot]")).toHaveCount(12);
  await expect(page.getByText(/牌位最多 12 個/u)).toBeVisible();

  await expect(
    page.getByText("請按「編輯牌陣」為牌位 1 設定問題"),
  ).toBeVisible();
  for (let index = 1; index <= 12; index += 1) {
    await handle(page, index).focus();
    await page.keyboard.press("Enter");
    await page.getByLabel(/這個牌位的問題/u).fill(`第 ${index} 個問題`);
  }
  await finishArranging(page);
  await expect(
    page.getByRole("button", { name: "洗牌", exact: true }),
  ).toBeEnabled();

  await arrange(page);
  await handle(page, 12).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "刪除牌位" }).click();
  await expect(page.getByText("已移除牌位 12。")).toBeVisible();
  await expect(page.locator("[data-slot]")).toHaveCount(11);
});

test("keyboard and numeric keypad move a position", async ({ page }) => {
  await arrange(page);
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
  await arrange(page);
  await page.getByRole("button", { name: "五張十字", exact: true }).click();
  await finishArranging(page);
  await page.getByRole("button", { name: "洗牌", exact: true }).click();
  await dealAll(page, 5);
  await reveal(page, 1);
  await page.waitForTimeout(400);

  await page.reload();
  await expect(page.getByText("已載入上次的牌陣。")).toBeVisible();
  await expect(page.getByLabel(/主問題/u)).toHaveValue("下個月的方向");
  await expect(page.locator("[data-slot]")).toHaveCount(5);
  await expect(
    slot(page, 1).locator("[data-reveal-state='revealed']").first(),
  ).toBeVisible();
  await expect(
    slot(page, 2).locator("[data-reveal-state='sealed']").first(),
  ).toBeVisible();
  await expect(page.getByText("點擊卡牌，以火焰逐一揭示牌面")).toBeVisible();

  await arrange(page);
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
  await page.getByRole("button", { name: "圓環", exact: true }).click();
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

test("named templates are saved, deleted and restored across reloads", async ({
  page,
}) => {
  await arrange(page);
  await handle(page, 2).click();
  await slot(page, 2)
    .getByRole("button", { name: "牌位 2 順時針轉 45°" })
    .click();
  await expect(slot(page, 2)).toHaveAttribute("style", /--rot: 45deg/u);
  await page.getByRole("button", { name: "完成", exact: true }).click();

  await page.getByRole("button", { name: "儲存目前牌陣" }).click();
  await page.getByLabel("牌陣名稱").fill("斜放三張");
  await page.getByRole("button", { name: "儲存", exact: true }).click();
  await expect(page.getByText("已把目前牌陣存成「斜放三張」。")).toBeVisible();

  await page.getByRole("button", { name: "刪除牌陣「經典三張」" }).click();
  await page.getByRole("button", { name: "刪除", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "經典三張", exact: true }),
  ).toHaveCount(0);
  await page.waitForTimeout(400);

  await page.reload();
  await expect(page.getByText("已載入上次的牌陣。")).toBeVisible();
  await arrange(page);
  await expect(
    page.getByRole("button", { name: "經典三張", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "空白牌桌" }).click();
  await expect(page.locator("[data-slot]")).toHaveCount(0);
  await page.getByRole("button", { name: "斜放三張", exact: true }).click();
  await expect(page.locator("[data-slot]")).toHaveCount(3);
  await expect(slot(page, 2)).toHaveAttribute("style", /--rot: 45deg/u);

  await page.getByRole("button", { name: "還原預設範例" }).click();
  await expect(
    page.getByRole("button", { name: "經典三張", exact: true }),
  ).toBeVisible();
});

async function rotationOf(page: Page, index: number) {
  return slot(page, index).evaluate((element) =>
    Number.parseFloat(element.style.getPropertyValue("--rot")),
  );
}

/** Sweeps a pointer a quarter turn clockwise around `center`. */
async function sweep(
  page: Page,
  center: { x: number; y: number },
  start: { x: number; y: number },
  options: { isMobile: boolean; holdMs: number },
) {
  const radius = Math.hypot(start.x - center.x, start.y - center.y);
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
  const steps = 12;
  const at = (step: number) => {
    const angle = startAngle + (Math.PI / 2) * (step / steps);
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
  };

  if (!options.isMobile) {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.waitForTimeout(options.holdMs);
    for (let step = 1; step <= steps; step += 1) {
      const point = at(step);
      await page.mouse.move(point.x, point.y);
    }
    await page.mouse.up();
    return;
  }
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [start],
  });
  await page.waitForTimeout(options.holdMs);
  for (let step = 1; step <= steps; step += 1) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [at(step)],
    });
  }
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

test("press and hold, then drag, rotates a position around its centre", async ({
  page,
  isMobile,
}) => {
  await arrange(page);
  await page.getByRole("button", { name: "放大牌桌" }).click();
  await page.getByRole("button", { name: "放大牌桌" }).click();
  const target = slot(page, 2);
  const before = await relativePosition(page, 2);
  const box = await target.boundingBox();
  if (!box) throw new Error("slot 2 is not visible");
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  // Hold on the card, then sweep a quarter turn: it rotates, it does not move.
  await sweep(
    page,
    center,
    { x: center.x + box.width * 0.35, y: center.y },
    { isMobile, holdMs: 700 },
  );
  expect(await rotationOf(page, 2)).toBe(90);
  expect(await relativePosition(page, 2)).toEqual(before);
  await expect(target).not.toHaveAttribute("data-rotating", "true");

  // The turning-arrow handle rotates straight away, without holding.
  await handle(page, 2).click();
  const knob = target.getByRole("button", { name: "牌位 2 順時針轉 45°" });
  const knobBox = await knob.boundingBox();
  if (!knobBox) throw new Error("rotate handle is not visible");
  await sweep(
    page,
    center,
    { x: knobBox.x + knobBox.width / 2, y: knobBox.y + knobBox.height / 2 },
    { isMobile, holdMs: 0 },
  );
  expect(await rotationOf(page, 2)).toBe(180);
  expect(await relativePosition(page, 2)).toEqual(before);
});

test("during play, dragging or holding a position never moves or rotates it", async ({
  page,
  isMobile,
}) => {
  const target = slot(page, 2);
  const before = await relativePosition(page, 2);
  await dragBy(page, target, -40, -30, isMobile);
  const box = await target.boundingBox();
  if (!box) throw new Error("slot 2 is not visible");
  const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await sweep(
    page,
    middle,
    { x: middle.x + box.width * 0.35, y: middle.y },
    { isMobile, holdMs: 700 },
  );

  expect(await relativePosition(page, 2)).toEqual(before);
  expect(await rotationOf(page, 2)).toBe(0);
  await expect(page.getByRole("button", { name: /順時針轉 45°/u })).toHaveCount(
    0,
  );

  await arrange(page);
  await expect(page.locator(".spread-board")).toHaveAttribute(
    "data-arranging",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "洗牌", exact: true }),
  ).toBeDisabled();
  await finishArranging(page);
  await expect(
    page.getByRole("button", { name: "洗牌", exact: true }),
  ).toBeEnabled();
});

test("a revealed card opens large and fits the screen", async ({ page }) => {
  await page.getByRole("button", { name: "洗牌", exact: true }).click();
  await dealAll(page, 3);
  await reveal(page, 1);

  await page
    .getByRole("button", { name: /^牌位 1 主牌：.+點擊放大$/u })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("牌位 1 · 主牌")).toBeVisible();

  const viewport = page.viewportSize();
  const card = await dialog.locator(".card-viewer__card").boundingBox();
  if (!viewport || !card) throw new Error("the enlarged card is not visible");
  expect(card.x).toBeGreaterThanOrEqual(0);
  expect(card.x + card.width).toBeLessThanOrEqual(viewport.width);
  expect(card.width).toBeGreaterThan(150);

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
