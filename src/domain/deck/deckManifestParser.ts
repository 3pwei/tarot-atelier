import { Deck } from "@/domain/deck/deck";
import {
  DECK_SCHEMA_VERSION,
  type CardCategory,
  type CardDefinition,
  type DeckManifest,
  type LocalizedName,
  type TarotRank,
  type TarotSuit,
} from "@/domain/deck/types";

const MINIMUM_DECK_SIZE = 1;
const MAXIMUM_DECK_SIZE = 200;
const STABLE_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,127}$/u;
const ASSET_REFERENCE_PATTERN =
  /^(?:\/(?!\/)|https:\/\/|procedural:\/\/|missing:\/\/)/u;
const CATEGORIES = new Set<CardCategory>([
  "major",
  "minor",
  "oracle",
  "custom",
]);
const SUITS = new Set<TarotSuit>(["wands", "cups", "swords", "pentacles"]);
const RANKS = new Set<TarotRank>([
  "ace",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "page",
  "knight",
  "queen",
  "king",
]);

export class DeckManifestError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Deck manifest validation failed: ${issues.join("; ")}`);
    this.name = "DeckManifestError";
    this.issues = issues;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: string[],
): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(`${path}.${key} must be a non-empty string`);
    return "";
  }
  return value.trim();
}

function readLocalizedName(
  value: unknown,
  path: string,
  issues: string[],
): LocalizedName {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return { zhHant: "", en: "" };
  }
  return {
    zhHant: readRequiredString(value, "zhHant", path, issues),
    en: readRequiredString(value, "en", path, issues),
  };
}

function readAssetReference(
  value: unknown,
  path: string,
  issues: string[],
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(`${path} is required`);
    return "";
  }
  const reference = value.trim();
  if (!ASSET_REFERENCE_PATTERN.test(reference)) {
    issues.push(
      `${path} must use a root-relative, HTTPS, procedural, or missing reference`,
    );
  }
  return reference;
}

function readCard(
  value: unknown,
  index: number,
  issues: string[],
): CardDefinition | undefined {
  const path = `cards[${index}]`;
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return undefined;
  }

  const id = readRequiredString(value, "id", path, issues);
  if (id && !STABLE_ID_PATTERN.test(id)) {
    issues.push(`${path}.id is not a stable id`);
  }

  const artworkValue = value.artwork;
  if (!isRecord(artworkValue)) {
    issues.push(`${path}.artwork must be an object`);
  }
  const artwork = isRecord(artworkValue)
    ? {
        face: readAssetReference(
          artworkValue.face,
          `${path}.artwork.face`,
          issues,
        ),
        back: readAssetReference(
          artworkValue.back,
          `${path}.artwork.back`,
          issues,
        ),
      }
    : { face: "", back: "" };

  const keywordValue = value.keywords;
  const keywords = Array.isArray(keywordValue)
    ? keywordValue.filter(
        (keyword): keyword is string =>
          typeof keyword === "string" && keyword.trim().length > 0,
      )
    : [];
  if (!Array.isArray(keywordValue) || keywords.length !== keywordValue.length) {
    issues.push(`${path}.keywords must contain only non-empty strings`);
  }

  const category = value.category;
  if (
    typeof category !== "string" ||
    !CATEGORIES.has(category as CardCategory)
  ) {
    issues.push(`${path}.category is invalid`);
  }

  const sequence = value.sequence;
  if (!Number.isInteger(sequence) || (sequence as number) < 0) {
    issues.push(`${path}.sequence must be a non-negative integer`);
  }

  const suit = value.suit;
  if (
    suit !== undefined &&
    (typeof suit !== "string" || !SUITS.has(suit as TarotSuit))
  ) {
    issues.push(`${path}.suit is invalid`);
  }
  const rank = value.rank;
  if (
    rank !== undefined &&
    (typeof rank !== "string" || !RANKS.has(rank as TarotRank))
  ) {
    issues.push(`${path}.rank is invalid`);
  }
  if (category === "minor" && (suit === undefined || rank === undefined)) {
    issues.push(`${path} minor cards require suit and rank`);
  }

  const metadata = value.metadata;
  if (metadata !== undefined && !isRecord(metadata)) {
    issues.push(`${path}.metadata must be an object when provided`);
  }

  return {
    id,
    name: readLocalizedName(value.name, `${path}.name`, issues),
    artwork,
    keywords,
    uprightMeaning: readRequiredString(value, "uprightMeaning", path, issues),
    reversedMeaning: readRequiredString(value, "reversedMeaning", path, issues),
    category: category as CardCategory,
    sequence: sequence as number,
    ...(suit === undefined ? {} : { suit: suit as TarotSuit }),
    ...(rank === undefined ? {} : { rank: rank as TarotRank }),
    ...(isRecord(metadata) ? { metadata } : {}),
  };
}

export function parseDeckManifest(input: unknown): Deck {
  const issues: string[] = [];
  if (!isRecord(input)) {
    throw new DeckManifestError(["manifest must be an object"]);
  }

  const schemaVersion = input.schemaVersion;
  if (schemaVersion !== DECK_SCHEMA_VERSION) {
    issues.push(
      `schemaVersion must be ${DECK_SCHEMA_VERSION}; received ${String(schemaVersion)}`,
    );
  }

  const id = readRequiredString(input, "id", "manifest", issues);
  if (id && !STABLE_ID_PATTERN.test(id)) {
    issues.push("manifest.id is not a stable id");
  }

  const cardValues = input.cards;
  if (!Array.isArray(cardValues)) {
    issues.push("manifest.cards must be an array");
  }
  const cards = Array.isArray(cardValues)
    ? cardValues
        .map((card, index) => readCard(card, index, issues))
        .filter((card): card is CardDefinition => card !== undefined)
    : [];

  if (cards.length < MINIMUM_DECK_SIZE || cards.length > MAXIMUM_DECK_SIZE) {
    issues.push(
      `manifest.cards must contain ${MINIMUM_DECK_SIZE} to ${MAXIMUM_DECK_SIZE} cards`,
    );
  }

  const cardIds = new Set<string>();
  cards.forEach((card) => {
    if (cardIds.has(card.id)) {
      issues.push(`duplicate card id: ${card.id}`);
    }
    cardIds.add(card.id);
  });

  const supportsReversals = input.supportsReversals;
  if (typeof supportsReversals !== "boolean") {
    issues.push("manifest.supportsReversals must be a boolean");
  }

  const metadata = input.metadata;
  if (metadata !== undefined && !isRecord(metadata)) {
    issues.push("manifest.metadata must be an object when provided");
  }

  const manifest: DeckManifest = {
    schemaVersion: DECK_SCHEMA_VERSION,
    id,
    name: readLocalizedName(input.name, "manifest.name", issues),
    artist: readRequiredString(input, "artist", "manifest", issues),
    license: readRequiredString(input, "license", "manifest", issues),
    cards,
    supportsReversals: supportsReversals as boolean,
    ...(isRecord(metadata) ? { metadata } : {}),
  };

  if (issues.length > 0) {
    throw new DeckManifestError(issues);
  }

  return new Deck(Object.freeze(manifest));
}
