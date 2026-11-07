import { expect, test } from "@playwright/test";
import { dealAll, reveal } from "./support/spreadTable";

// Deals and burns three cards before reading; software-rendered CI browsers need headroom.
test.describe.configure({ timeout: 90_000 });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("準備好了，請洗牌")).toBeVisible();
  await page.locator(".spread-board").scrollIntoViewIfNeeded();
});

test("reads a finished spread with no credentials or server, labelled as a sample", async ({
  page,
  baseURL,
}) => {
  // Proves the whole flow runs offline: nothing may leave the site.
  const siteOrigin = new URL(baseURL ?? "http://127.0.0.1").origin;
  const external: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== siteOrigin)
      external.push(request.url());
  });

  const panel = page.locator(".reading-panel");
  await expect(panel.getByText("所有牌翻開後，就能產生解讀。")).toBeVisible();

  await page.getByRole("button", { name: "洗牌", exact: true }).click();
  await dealAll(page, 3);
  for (const index of [1, 2, 3]) await reveal(page, index);
  await expect(page.getByText("牌陣已完成")).toBeVisible();

  await panel.scrollIntoViewIfNeeded();
  await expect(panel.getByText("範例解牌，不是 AI")).toBeVisible();
  await expect(panel.getByText("工坊標準塔羅")).toBeVisible();
  await expect(panel.locator(".reading-summary__positions li")).toHaveCount(3);
  await expect(panel.getByRole("radio", { name: "分析" })).toBeChecked();

  await panel.getByRole("button", { name: "產生範例解讀" }).click();
  const sections = panel.locator("details.reading-section");
  await expect(sections).toHaveCount(3 + 3);
  await expect(sections.first()).toHaveAttribute("open", "");
  await expect(sections.first().getByText("單牌象徵")).toBeVisible();

  const synthesis = panel.locator("details", { hasText: "全局關聯" });
  await expect(synthesis.locator(".reading-section__body")).toBeHidden();
  await synthesis.locator("summary").click();
  await expect(synthesis.locator(".reading-section__body")).toBeVisible();

  await panel.getByText("詼諧", { exact: true }).click();
  await expect(panel.getByText(/牌陣或語氣已改變/u)).toBeVisible();
  await panel.getByRole("button", { name: "重新產生" }).click();
  await expect(panel.getByText(/牌陣或語氣已改變/u)).toBeHidden();

  await expect(panel.getByText(/僅供娛樂與自我反思/u)).toBeVisible();
  expect(external).toEqual([]);
});
