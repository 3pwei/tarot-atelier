import type {
  InterpretOptions,
  ReadingProvider,
} from "@/application/ports/readingProvider";
import {
  READING_SCHEMA_VERSION,
  type CardReading,
  type ReadingRequest,
  type ReadingResult,
} from "@/domain/reading/types";

export const REQUEST_ID = "6f1c2b9e-3d4a-4b8f-9c2e-1a2b3c4d5e6f";
export const OTHER_REQUEST_ID = "0a9b8c7d-6e5f-4a3b-8c1d-0e9f8a7b6c5d";

export const validRequest: ReadingRequest = {
  schemaVersion: READING_SCHEMA_VERSION,
  deckId: "atelier-standard-tarot",
  positions: [
    {
      index: 1,
      question: "現況？",
      x: 0.3,
      y: 0.5,
      primary: { id: "atelier-standard.major.17", orientation: "upright" },
    },
    {
      index: 2,
      question: "下一步？",
      x: 0.7,
      y: 0.5,
      primary: { id: "atelier-standard.major.16", orientation: "reversed" },
      jumper: { id: "atelier-standard.cups.three", orientation: "upright" },
    },
  ],
};

function cardReading(
  id: string,
  orientation: "upright" | "reversed",
): CardReading {
  return {
    cardId: id,
    cardName: id,
    orientation,
    meaningMode: orientation,
    symbolism: "象徵",
    interpretation: "解讀",
  };
}

/** A minimal valid answer to `request`. */
export function resultFor(request: ReadingRequest): ReadingResult {
  return {
    schemaVersion: READING_SCHEMA_VERSION,
    deckId: request.deckId,
    source: "prewritten",
    positions: request.positions.map((position) => ({
      index: position.index,
      question: position.question,
      primary: cardReading(position.primary.id, position.primary.orientation),
      ...(position.jumper
        ? {
            jumper: cardReading(
              position.jumper.id,
              position.jumper.orientation,
            ),
          }
        : {}),
    })),
    synthesis: "整體",
    reflectionQuestions: ["你怎麼看？"],
    suggestions: ["可以考慮先休息。"],
    sensitiveTopics: [],
  };
}

/** A provider that answers with `answer(request)` and counts its calls. */
export function fakeProvider(
  answer: (
    request: ReadingRequest,
    options?: InterpretOptions,
  ) => Promise<unknown>,
) {
  const calls: ReadingRequest[] = [];
  const provider: ReadingProvider = {
    id: "fake",
    source: "prewritten",
    interpret: async (request, options) => {
      calls.push(request);
      return (await answer(request, options)) as ReadingResult;
    },
  };
  return { provider, calls };
}

export function abortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}
