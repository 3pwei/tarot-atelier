import type { Page, Route } from "@playwright/test";
import { READINGS_ROUTE } from "../../src/application/reading/readingEndpoint";
import type {
  ReadingRequest,
  ReadingResult,
} from "../../src/domain/reading/types";

/** A minimal AI reading that answers `request` position by position. */
function aiReadingFor(request: ReadingRequest): ReadingResult {
  const card = (id: string, orientation: "upright" | "reversed") => ({
    cardId: id,
    cardName: "測試牌",
    orientation,
    meaningMode: orientation,
    symbolism: "測試用的象徵。",
    interpretation: "這是模擬的 AI 解讀。",
  });
  return {
    schemaVersion: request.schemaVersion,
    deckId: request.deckId,
    source: "ai",
    positions: request.positions.map((position) => ({
      index: position.index,
      question: position.question,
      primary: card(position.primary.id, position.primary.orientation),
      ...(position.jumper
        ? { jumper: card(position.jumper.id, position.jumper.orientation) }
        : {}),
    })),
    synthesis: "模擬的 AI 全局關聯。",
    reflectionQuestions: ["模擬的反思問題？"],
    suggestions: ["可以考慮模擬的做法。"],
    sensitiveTopics: [],
  };
}

export type EndpointAnswer =
  | { readonly kind: "reading" }
  | {
      readonly kind: "refusal";
      readonly status: number;
      readonly reason: string;
    };

/**
 * Stands in for the Cloudflare reading endpoint, which `next dev` does not
 * serve. Returns the request bodies it received.
 */
export async function answerReadings(
  page: Page,
  answer: EndpointAnswer,
): Promise<ReadingRequest[]> {
  const received: ReadingRequest[] = [];
  await page.route(`**/${READINGS_ROUTE}`, async (route: Route) => {
    const request = route.request().postDataJSON() as ReadingRequest;
    received.push(request);
    await (answer.kind === "reading"
      ? route.fulfill({ json: { result: aiReadingFor(request) } })
      : route.fulfill({
          status: answer.status,
          json: { reason: answer.reason },
        }));
  });
  return received;
}
