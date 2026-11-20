import type { CardInstance, Orientation } from "@/domain/deck/types";
import type { ReadingResult } from "@/domain/reading/types";
import { collectDrawnInstances, roundKeyOf } from "@/domain/spread/round";
import { assignDraw, createSpread } from "@/domain/spread/spread";
import type { Spread } from "@/domain/spread/types";

/** The device keeps the newest readings; a new one replaces the oldest. */
export const MAX_HISTORY_RECORDS = 10;

export interface RecordedCard {
  readonly cardId: string;
  readonly orientation: Orientation;
}

/** A position as it was when the round was read; it never changes. */
export interface RecordedPosition {
  readonly index: number;
  readonly question: string;
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly primary: RecordedCard;
  readonly jumper?: RecordedCard;
}

/**
 * One finished round: every position drawn and revealed. `roundKey` names
 * the round's draws, so the same round is never recorded twice.
 */
export interface ReadingRecord {
  readonly id: string;
  readonly roundKey: string;
  /** ISO 8601 time the last card was revealed. */
  readonly recordedAt: string;
  readonly deckId: string;
  /** The template's name at the time, kept even if the template is deleted. */
  readonly spreadName?: string;
  readonly mainQuestion: string;
  /** Sorted by `index`, exactly 1..n. */
  readonly positions: readonly RecordedPosition[];
  /** Added once a reading is generated for this round. */
  readonly reading?: ReadingResult;
}

/** Newest first, at most `MAX_HISTORY_RECORDS` long. */
export type ReadingHistory = readonly ReadingRecord[];

export const EMPTY_HISTORY: ReadingHistory = Object.freeze([]);

/** Every position is drawn and every card on the table has been revealed. */
export function isRoundRevealed(
  spread: Spread,
  revealedInstanceIds: ReadonlySet<string>,
): boolean {
  return (
    roundKeyOf(spread) !== undefined &&
    collectDrawnInstances(spread).every((card) =>
      revealedInstanceIds.has(card.instanceId),
    )
  );
}

function recordedCard(instance: CardInstance): RecordedCard {
  return { cardId: instance.cardId, orientation: instance.orientation };
}

/** The record for a fully drawn spread, or `undefined` if it is unfinished. */
export function recordRound(options: {
  readonly id: string;
  readonly spread: Spread;
  readonly deckId: string;
  readonly spreadName?: string;
  readonly recordedAt: Date;
}): ReadingRecord | undefined {
  const { spread } = options;
  const roundKey = roundKeyOf(spread);
  if (!roundKey) return undefined;
  const positions = spread.positions.flatMap((position) => {
    const result = position.drawResult;
    if (!result) return [];
    const recorded: RecordedPosition = {
      index: position.index,
      question: position.question,
      x: position.x,
      y: position.y,
      rotation: position.rotation,
      primary: recordedCard(result.primary),
      ...(result.jumper ? { jumper: recordedCard(result.jumper) } : {}),
    };
    return [recorded];
  });
  return {
    id: options.id,
    roundKey,
    recordedAt: options.recordedAt.toISOString(),
    deckId: options.deckId,
    ...(options.spreadName ? { spreadName: options.spreadName } : {}),
    mainQuestion: spread.mainQuestion.trim(),
    positions,
  };
}

/**
 * Puts `record` first and drops the oldest beyond the limit. A round that is
 * already recorded leaves the history unchanged (the same array).
 */
export function addRecord(
  history: ReadingHistory,
  record: ReadingRecord,
): ReadingHistory {
  if (history.some((entry) => entry.roundKey === record.roundKey)) {
    return history;
  }
  return [record, ...history].slice(0, MAX_HISTORY_RECORDS);
}

/**
 * Stores the reading generated for a recorded round, with the main question
 * it answered. Regenerating replaces the earlier reading. Unknown rounds
 * leave the history unchanged (the same array).
 */
export function attachReading(
  history: ReadingHistory,
  roundKey: string,
  answered: { readonly mainQuestion: string; readonly reading: ReadingResult },
): ReadingHistory {
  if (!history.some((entry) => entry.roundKey === roundKey)) return history;
  return history.map((entry) =>
    entry.roundKey === roundKey
      ? {
          ...entry,
          mainQuestion: answered.mainQuestion.trim(),
          reading: answered.reading,
        }
      : entry,
  );
}

export function removeRecord(
  history: ReadingHistory,
  id: string,
): ReadingHistory {
  return history.filter((entry) => entry.id !== id);
}

/**
 * The record laid out as a spread again, so it can be read with the same
 * questions and cards. Instances are named after the record, since the
 * original draws' instance IDs are not kept. A record that no longer
 * forms a valid spread gives `undefined`.
 */
export function recordedSpread(record: ReadingRecord): Spread | undefined {
  const instance = (index: number, role: string, card: RecordedCard) => ({
    instanceId: `${record.deckId}:record-${record.id}-${index}:${role}`,
    deckId: record.deckId,
    cardId: card.cardId,
    orientation: card.orientation,
  });
  let spread = createSpread({
    id: `record-${record.id}`,
    mainQuestion: record.mainQuestion,
    positions: record.positions.map((position) => ({
      id: `position-${position.index}`,
      question: position.question,
      x: position.x,
      y: position.y,
      rotation: position.rotation,
    })),
  });
  for (const position of record.positions) {
    const draw = {
      primary: instance(position.index, "primary", position.primary),
      ...(position.jumper
        ? { jumper: instance(position.index, "jumper", position.jumper) }
        : {}),
      drawnAt: record.recordedAt,
    };
    const placed = assignDraw(spread, `position-${position.index}`, draw);
    if (!placed.ok) return undefined;
    spread = placed.spread;
  }
  return spread;
}
