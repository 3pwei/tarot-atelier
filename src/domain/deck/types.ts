export const DECK_SCHEMA_VERSION = "1.0.0" as const;

export type Orientation = "upright" | "reversed";

export type CardCategory = "major" | "minor" | "oracle" | "custom";

export type TarotSuit = "wands" | "cups" | "swords" | "pentacles";

export type TarotRank =
  | "ace"
  | "two"
  | "three"
  | "four"
  | "five"
  | "six"
  | "seven"
  | "eight"
  | "nine"
  | "ten"
  | "page"
  | "knight"
  | "queen"
  | "king";

export interface LocalizedName {
  readonly zhHant: string;
  readonly en: string;
}

export interface CardArtwork {
  readonly face: string;
  readonly back: string;
}

export interface CardDefinition {
  readonly id: string;
  readonly name: LocalizedName;
  readonly artwork: CardArtwork;
  readonly keywords: readonly string[];
  readonly uprightMeaning: string;
  readonly reversedMeaning: string;
  readonly category: CardCategory;
  readonly sequence: number;
  readonly suit?: TarotSuit;
  readonly rank?: TarotRank;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface DeckManifest {
  readonly schemaVersion: typeof DECK_SCHEMA_VERSION;
  readonly id: string;
  readonly name: LocalizedName;
  readonly artist: string;
  readonly license: string;
  readonly cards: readonly CardDefinition[];
  readonly supportsReversals: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface CardInstance {
  readonly instanceId: string;
  readonly deckId: string;
  readonly cardId: string;
  readonly orientation: Orientation;
}
