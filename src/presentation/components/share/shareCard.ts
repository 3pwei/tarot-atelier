import type { Deck } from "@/domain/deck/deck";
import type { Orientation } from "@/domain/deck/types";
import type {
  ReadingRecord,
  RecordedCard,
} from "@/domain/history/readingHistory";
import { summarizeText } from "@/domain/share/shareRecord";
import {
  ORIENTATION_LABELS,
  ROLE_LABELS,
} from "@/presentation/components/cards/cardLabels";
import { recordedCardName } from "@/presentation/components/history/RecordedCardFace";
import { HISTORY_COPY } from "@/presentation/components/history/historyLabels";
import { catalogThumbnailUrl } from "@/presentation/components/library/prerenderedArt";
import { READING_COPY } from "@/presentation/components/reading/readingLabels";
import { SHARE_COPY } from "@/presentation/components/share/shareLabels";

/** The image keeps the reading short; the copied text carries all of it. */
export const SHARE_SUMMARY_CHARACTERS = 100;

export interface SharedCard {
  readonly name: string;
  readonly orientation: Orientation;
  /** The pre-rendered face, when the deck has one. */
  readonly faceUrl?: string;
}

export interface SharedPosition {
  readonly index: number;
  /** The position's short name; empty when it has none. */
  readonly positionName: string;
  /** Empty when the player chose to hide their questions. */
  readonly question: string;
  readonly primary: SharedCard;
  readonly jumper?: SharedCard;
}

/** Everything the share image and text show, already in display words. */
export interface ShareCard {
  readonly mainQuestion: string;
  readonly spreadName: string;
  readonly positions: readonly SharedPosition[];
  readonly synthesis?: string;
  readonly summary?: string;
  readonly siteUrl: string;
  readonly recordedAt: string;
}

function sharedCard(deck: Deck | undefined, card: RecordedCard): SharedCard {
  const faceUrl = deck ? catalogThumbnailUrl(deck.id, card.cardId) : undefined;
  return {
    name: recordedCardName(deck, card),
    orientation: card.orientation,
    ...(faceUrl ? { faceUrl } : {}),
  };
}

/** Builds the share card from a record whose questions are already decided. */
export function buildShareCard(options: {
  readonly record: ReadingRecord;
  readonly deck: Deck | undefined;
  readonly siteUrl: string;
}): ShareCard {
  const { record, deck } = options;
  const synthesis = record.reading?.synthesis;
  return {
    mainQuestion: record.mainQuestion,
    spreadName: record.spreadName ?? HISTORY_COPY.customSpread,
    positions: record.positions.map((position) => ({
      index: position.index,
      positionName: position.name,
      question: position.question,
      primary: sharedCard(deck, position.primary),
      ...(position.jumper ? { jumper: sharedCard(deck, position.jumper) } : {}),
    })),
    ...(synthesis
      ? {
          synthesis,
          summary: summarizeText(synthesis, SHARE_SUMMARY_CHARACTERS),
        }
      : {}),
    siteUrl: options.siteUrl,
    recordedAt: record.recordedAt,
  };
}

/** The position's short name and question, whichever it has, on one line. */
export function positionCaption(position: SharedPosition): string {
  return [position.positionName, position.question]
    .filter((part) => part.length > 0)
    .join("｜");
}

/** A card's name with its orientation, as read aloud on the table. */
export function cardLabel(card: SharedCard): string {
  return `${card.name}（${ORIENTATION_LABELS[card.orientation]}）`;
}

/** The plain text that goes with the image, or is copied on its own. */
export function shareText(card: ShareCard): string {
  const lines = [`${SHARE_COPY.brand}・${card.spreadName}`];
  if (card.mainQuestion)
    lines.push(`${SHARE_COPY.mainQuestion}${card.mainQuestion}`);
  lines.push("");
  for (const position of card.positions) {
    const caption = positionCaption(position);
    const heading = caption
      ? `${position.index}. ${caption}`
      : `${position.index}.`;
    const jumper = position.jumper
      ? `＋${ROLE_LABELS.jumper} ${cardLabel(position.jumper)}`
      : "";
    if (caption) {
      lines.push(heading, `   ${cardLabel(position.primary)}${jumper}`);
    } else {
      lines.push(`${heading} ${cardLabel(position.primary)}${jumper}`);
    }
  }
  if (card.synthesis) {
    lines.push("", READING_COPY.synthesis, card.synthesis);
  }
  lines.push("", SHARE_COPY.disclaimer, card.siteUrl);
  return lines.join("\n");
}

const pad = (value: number) => String(value).padStart(2, "0");

/** `tarot-atelier-20261120-0210.png`, in the player's local time. */
export function shareFileName(recordedAt: string): string {
  const at = new Date(recordedAt);
  const date = `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}`;
  return `tarot-atelier-${date}-${pad(at.getHours())}${pad(at.getMinutes())}.png`;
}
