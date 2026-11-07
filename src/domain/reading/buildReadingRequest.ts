import type { DrawResult } from "@/domain/deck/draw";
import type { DeckRegistry } from "@/domain/deck/deckRegistry";
import type { CardInstance } from "@/domain/deck/types";
import { validateSpread } from "@/domain/spread/spread";
import type { Spread, SpreadPosition } from "@/domain/spread/types";
import {
  READING_SCHEMA_VERSION,
  type ReadingCardRef,
  type ReadingPositionRequest,
  type ReadingRequest,
} from "@/domain/reading/types";

export type ReadingRequestIssue =
  | { readonly code: "no-positions" }
  | { readonly code: "too-many-positions" }
  | { readonly code: "missing-question"; readonly index: number }
  | { readonly code: "question-too-long"; readonly index: number }
  | { readonly code: "main-question-too-long" }
  | { readonly code: "undrawn-position"; readonly index: number }
  | { readonly code: "mixed-decks" }
  | { readonly code: "unknown-deck"; readonly deckId: string }
  | {
      readonly code: "unknown-card";
      readonly index: number;
      readonly cardId: string;
    };

export type ReadingRequestBuild =
  | { readonly ok: true; readonly request: ReadingRequest }
  | { readonly ok: false; readonly issues: readonly ReadingRequestIssue[] };

function cardsOf(position: SpreadPosition): readonly CardInstance[] {
  const result = position.drawResult;
  if (!result) return [];
  return result.jumper ? [result.primary, result.jumper] : [result.primary];
}

function toCardRef(card: CardInstance): ReadingCardRef {
  return { id: card.cardId, orientation: card.orientation };
}

type DrawnPosition = SpreadPosition & { readonly drawResult: DrawResult };

function isDrawn(position: SpreadPosition): position is DrawnPosition {
  return position.drawResult !== undefined;
}

function toPositionRequest(position: DrawnPosition): ReadingPositionRequest {
  const { primary, jumper } = position.drawResult;
  return {
    index: position.index,
    question: position.question.trim(),
    x: position.x,
    y: position.y,
    primary: toCardRef(primary),
    ...(jumper ? { jumper: toCardRef(jumper) } : {}),
  };
}

function deckIssues(
  positions: readonly SpreadPosition[],
  registry: DeckRegistry,
): { readonly deckId?: string; readonly issues: ReadingRequestIssue[] } {
  const deckIds = new Set(
    positions.flatMap(cardsOf).map((card) => card.deckId),
  );
  if (deckIds.size > 1) return { issues: [{ code: "mixed-decks" }] };
  const [deckId] = deckIds;
  if (!deckId) return { issues: [] };

  const deck = registry.get(deckId);
  if (!deck) return { deckId, issues: [{ code: "unknown-deck", deckId }] };

  const issues: ReadingRequestIssue[] = positions.flatMap((position) =>
    cardsOf(position)
      .filter((card) => !deck.hasCard(card.cardId))
      .map((card) => ({
        code: "unknown-card" as const,
        index: position.index,
        cardId: card.cardId,
      })),
  );
  return { deckId, issues };
}

/**
 * Builds a provider request from the spread and deck models. It never reads
 * what the screen shows; every value comes from the domain.
 */
export function buildReadingRequest(
  spread: Spread,
  registry: DeckRegistry,
): ReadingRequestBuild {
  const positions = [...spread.positions].sort((a, b) => a.index - b.index);
  const issues: ReadingRequestIssue[] = [...validateSpread(spread)];

  for (const position of positions) {
    if (!isDrawn(position)) {
      issues.push({ code: "undrawn-position", index: position.index });
    }
  }

  const decks = deckIssues(positions, registry);
  issues.push(...decks.issues);

  if (issues.length > 0 || !decks.deckId) {
    return { ok: false, issues };
  }

  const mainQuestion = spread.mainQuestion.trim();
  return {
    ok: true,
    request: {
      schemaVersion: READING_SCHEMA_VERSION,
      deckId: decks.deckId,
      ...(mainQuestion ? { mainQuestion } : {}),
      positions: positions.filter(isDrawn).map(toPositionRequest),
    },
  };
}
