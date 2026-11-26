import { expect, test, type Page } from "@playwright/test";
import {
  answerReadings,
  MOCK_PRIMARY_INTERPRETATION,
  type EndpointAnswer,
} from "./support/readingEndpoint";
import {
  askMainQuestion,
  deckPile,
  openReading,
  pickAll,
  reveal,
  openChapter,
  readingPanel,
} from "./support/spreadTable";

/** A printed reading's sections: each position, then the spread as a whole. */
const READING_SECTIONS = ".printed-reading__section";

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
  await openChapter(page);
  await askMainQuestion(page, "面試結果");
  await page.locator(".spread-board").scrollIntoViewIfNeeded();
  const panel = readingPanel(page);
  await expect(page.getByRole("button", { name: "看解讀" })).toHaveCount(0);

  await deckPile(page).click();
  await pickAll(page, 3);
  for (const index of [1, 2, 3]) await reveal(page, index);
  await expect(page.getByText("牌陣已完成")).toBeVisible();
  await openReading(page);
  await panel.scrollIntoViewIfNeeded();
  return { panel, received };
}

test("reads a finished spread with AI through the site's own endpoint", async ({
  page,
  baseURL,
}) => {
  const external = offSiteRequests(page, baseURL);
  const { panel, received } = await finishSpread(page, { kind: "reading" });

  await expect(panel.getByRole("radio")).toHaveCount(0);

  await expect(panel.getByText("AI 解讀", { exact: true })).toBeVisible();
  const sections = panel.locator(READING_SECTIONS);
  await expect(sections).toHaveCount(3 + 3);
  // Printed, the card's symbolism and its sentence make one paragraph,
  // and a jumper has a paragraph of its own after it.
  await expect(sections.first().locator("p").first()).toContainText(
    MOCK_PRIMARY_INTERPRETATION,
  );

  const synthesis = sections.filter({ hasText: "全局關聯" });
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

  const notice = panel.getByText(/今天的 AI 解讀額度已用完/u);
  await expect(notice).toBeVisible();
  // Printed in red ink, so a reader does not take the sample for AI.
  await expect(notice).toHaveCSS("color", "rgb(143, 36, 22)");
  await expect(panel.getByText("範例解牌，不是 AI")).toBeVisible();
  const sections = panel.locator(READING_SECTIONS);
  await expect(sections).toHaveCount(3 + 3);
  // The sample reads each card.
  await expect(sections.first().locator("p").first()).not.toBeEmpty();
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

  await expect(panel.getByText(/AI 解讀暫時無法使用/u)).toBeVisible();
  await expect(panel.getByText("範例解牌，不是 AI")).toBeVisible();
});
