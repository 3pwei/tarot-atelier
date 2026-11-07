import type { Orientation } from "@/domain/deck/types";

/** Version of the request and result formats exchanged with a provider. */
export const READING_SCHEMA_VERSION = "1.0.0" as const;

export interface ReadingCardRef {
  readonly id: string;
  readonly orientation: Orientation;
}

/** One position as a provider sees it; the jumper never adds a position. */
export interface ReadingPositionRequest {
  readonly index: number;
  readonly question: string;
  readonly x: number;
  readonly y: number;
  readonly primary: ReadingCardRef;
  readonly jumper?: ReadingCardRef;
}

export interface ReadingRequest {
  readonly schemaVersion: typeof READING_SCHEMA_VERSION;
  readonly deckId: string;
  readonly mainQuestion?: string;
  /** Sorted by `index`, exactly 1..n. */
  readonly positions: readonly ReadingPositionRequest[];
}

/**
 * How a card was read. `neutral` means it was drawn reversed but the deck has
 * no reversed meaning for it, so the reading stays with its core symbolism.
 */
export type MeaningMode = "upright" | "reversed" | "neutral";

export interface CardReading {
  readonly cardId: string;
  readonly cardName: string;
  readonly orientation: Orientation;
  readonly meaningMode: MeaningMode;
  /** What the card stands for, independent of the question. */
  readonly symbolism: string;
  /** What it suggests for this position's question. */
  readonly interpretation: string;
}

export interface PositionReading {
  readonly index: number;
  readonly question: string;
  readonly primary: CardReading;
  /** The jumper's added message for this same position. */
  readonly jumper?: CardReading;
}

export type SensitiveTopic = "health" | "legal" | "financial";

/** Where a result came from; the UI labels anything that is not live AI. */
export type ReadingSource = "prewritten" | "ai";

export interface ReadingResult {
  readonly schemaVersion: typeof READING_SCHEMA_VERSION;
  readonly deckId: string;
  readonly source: ReadingSource;
  readonly positions: readonly PositionReading[];
  /** How the cards relate to each other across the spread. */
  readonly synthesis: string;
  readonly reflectionQuestions: readonly string[];
  /** Practical, non-directive ideas to consider. */
  readonly suggestions: readonly string[];
  /** Topics that call for a qualified professional rather than cards. */
  readonly sensitiveTopics: readonly SensitiveTopic[];
}
