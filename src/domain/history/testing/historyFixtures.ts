import type { DrawResult } from "@/domain/deck/draw";
import type { ReadingResult } from "@/domain/reading/types";
import { assignDraw, createSpread } from "@/domain/spread/spread";
import type { Spread } from "@/domain/spread/types";

export const FIXTURE_DECK_ID = "atelier-standard-tarot";

/** A draw whose `round` makes it a different round from the same cards. */
export function fixtureDraw(options: {
  readonly drawNumber: number;
  readonly cardId: string;
  readonly reversed?: boolean;
  readonly jumperCardId?: string;
  readonly round?: number;
}): DrawResult {
  const instance = (role: string, cardId: string) => ({
    instanceId: `${FIXTURE_DECK_ID}:draw-${options.drawNumber}:${role}`,
    deckId: FIXTURE_DECK_ID,
    cardId,
    orientation: options.reversed
      ? ("reversed" as const)
      : ("upright" as const),
  });
  const minute = String(options.round ?? 0).padStart(2, "0");
  return {
    primary: instance("primary", options.cardId),
    ...(options.jumperCardId
      ? { jumper: instance("jumper", options.jumperCardId) }
      : {}),
    drawnAt: `2026-11-20T02:${minute}:00.000Z`,
  };
}

/** A spread of `questions.length` positions, the first `draws` drawn. */
export function fixtureSpread(options: {
  readonly questions: readonly string[];
  readonly draws: readonly DrawResult[];
  readonly mainQuestion?: string;
}): Spread {
  let spread = createSpread({
    id: "spread",
    mainQuestion: options.mainQuestion ?? "",
    positions: options.questions.map((question, order) => ({
      id: `p${order + 1}`,
      question,
      x: 0.2 + order * 0.3,
      y: 0.5,
    })),
  });
  options.draws.forEach((draw, order) => {
    const update = assignDraw(spread, `p${order + 1}`, draw);
    if (!update.ok) throw new Error(`Fixture draw failed: ${update.code}`);
    spread = update.spread;
  });
  return spread;
}

/** A minimal valid reading for a one-position spread. */
export function fixtureReading(synthesis = "整體的提醒。"): ReadingResult {
  const card = {
    cardId: "atelier-standard.major.17",
    cardName: "星星",
    orientation: "upright" as const,
    meaningMode: "upright" as const,
    symbolism: "希望。",
    interpretation: "保持期待。",
  };
  return {
    schemaVersion: "1.1.0",
    deckId: FIXTURE_DECK_ID,
    source: "prewritten",
    positions: [{ index: 1, question: "現在的我", primary: card }],
    synthesis,
    reflectionQuestions: ["你在期待什麼？"],
    suggestions: ["寫下一件小事。"],
    sensitiveTopics: [],
  };
}
