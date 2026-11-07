import { expect, test, type Page } from "@playwright/test";
import { answerReadings, type EndpointAnswer } from "./support/readingEndpoint";
import { dealAll, reveal } from "./support/spreadTable";

// Deals and burns three cards before reading; software-rendered CI browsers need headroom.
test.describe.configure({ timeout: 90_000 });

/** Records requests that leave the site; the reading must not send any. */
function offSiteRequests(page: Page, baseURL: string | undefined): string[] {
  const siteOrigin = new URL(baseURL ?? "http://127.0.0.1").origin;
  const external: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== siteOrigin)
      external.push(request.url());
  });
  return external;
}

async function finishSpread(page: Page, answer: EndpointAnswer) {
  const received = await answerReadings(page, answer);
  await page.goto("/");
  await expect(page.getByText("準備好了，請洗牌")).toBeVisible();
  await page.locator(".spread-board").scrollIntoViewIfNeeded();
  const panel = page.locator(".reading-panel");
  await expect(panel.getByText("所有牌翻開後，就能產生解讀。")).toBeVisible();

  await page.getByPlaceholder("這次占卜想整體看見什麼？").fill("面試結果");
  await page.getByRole("button", { name: "洗牌", exact: true }).click();
  await dealAll(page, 3);
  for (const index of [1, 2, 3]) await reveal(page, index);
  await expect(page.getByText("牌陣已完成")).toBeVisible();
  await panel.scrollIntoViewIfNeeded();
  return { panel, received };
}

test("reads a finished spread with AI through the site's own endpoint", async ({
  page,
  baseURL,
}) => {
  const external = offSiteRequests(page, baseURL);
  const { panel, received } = await finishSpread(page, { kind: "reading" });

  await expect(panel.getByText("AI 解讀", { exact: true })).toBeVisible();
  await expect(panel.getByText(/Cloudflare Workers AI/u)).toBeVisible();
  await expect(panel.getByText("工坊標準塔羅")).toBeVisible();
  await expect(panel.locator(".reading-summary__positions li")).toHaveCount(3);
  await expect(panel.getByRole("radio")).toHaveCount(0);

  await panel.getByRole("button", { name: "產生解讀" }).click();
  const sections = panel.locator("details.reading-section");
  await expect(sections).toHaveCount(3 + 3);
  await expect(sections.first()).toHaveAttribute("open", "");
  await expect(
    sections.first().getByText("這是模擬的 AI 解讀。"),
  ).toBeVisible();

  const synthesis = panel.locator("details", { hasText: "全局關聯" });
  await synthesis.locator("summary").click();
  await expect(synthesis.getByText("模擬的 AI 全局關聯。")).toBeVisible();

  expect(received).toHaveLength(1);
  expect(received[0]).toMatchObject({
    mainQuestion: "面試結果",
    positions: [{ index: 1 }, { index: 2 }, { index: 3 }],
  });
  await expect(panel.getByText(/僅供娛樂與自我反思/u)).toBeVisible();
  expect(external).toEqual([]);
});

test("falls back to a labelled sample when today's AI readings are used up", async ({
  page,
  baseURL,
}) => {
  const external = offSiteRequests(page, baseURL);
  const { panel } = await finishSpread(page, {
    kind: "refusal",
    status: 429,
    reason: "daily-limit",
  });

  await panel.getByRole("button", { name: "產生解讀" }).click();
  await expect(panel.getByText(/今天的 AI 解讀額度已用完/u)).toBeVisible();
  await expect(panel.getByText("範例解牌，不是 AI")).toBeVisible();
  await expect(panel.locator("details.reading-section")).toHaveCount(3 + 3);
  await expect(panel.getByText("單牌象徵").first()).toBeVisible();
  expect(external).toEqual([]);
});

test("falls back to a labelled sample when the AI is unavailable", async ({
  page,
}) => {
  const { panel } = await finishSpread(page, {
    kind: "refusal",
    status: 503,
    reason: "unavailable",
  });

  await panel.getByRole("button", { name: "產生解讀" }).click();
  await expect(panel.getByText(/AI 解讀暫時無法使用/u)).toBeVisible();
  await expect(panel.getByText("範例解牌，不是 AI")).toBeVisible();
});
