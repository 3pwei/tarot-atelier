import { expect, test, type Page } from "@playwright/test";
import { measure, preparePage } from "./support/probe";

/**
 * The book's page turns, on the production build with a throttled CPU.
 * Measures, does not judge: compare the `PERF {…}` lines before and after.
 */
test.describe.configure({ mode: "serial", timeout: 120_000 });

/** Long enough for the opening (about two seconds) and a riffle to finish. */
const OPENING_MS = 2_600;
const SINGLE_MS = 800;
const RIFFLE_MS = 1_300;

function entry(page: Page, title: string) {
  return page.getByRole("button", { name: new RegExp(`^${title}，`, "u") });
}

/** A first tap lights an entry; the second turns to it. */
async function turnToEntry(page: Page, title: string) {
  await entry(page, title).click();
  await entry(page, title).click();
}

test("open the book, turn a page and riffle", async ({ page }, testInfo) => {
  await preparePage(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await measure(page, testInfo, "book-opening", async () => {
    await page.getByRole("button", { name: "打開魔法書" }).click();
    await page.waitForTimeout(OPENING_MS);
  });

  await page.goto("/#contents");
  await expect(entry(page, "The Three Cards")).toBeVisible();
  await measure(page, testInfo, "page-turn", async () => {
    await turnToEntry(page, "The Three Cards");
    await page.waitForTimeout(SINGLE_MS);
  });

  await page.goto("/#contents");
  await expect(entry(page, "The Codex")).toBeVisible();
  await measure(page, testInfo, "page-riffle", async () => {
    await turnToEntry(page, "The Codex");
    await page.waitForTimeout(RIFFLE_MS);
  });
});
