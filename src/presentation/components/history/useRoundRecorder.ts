import { useCallback, useEffect, useRef } from "react";
import type { ReadingResult } from "@/domain/reading/types";
import {
  attachReading,
  isRoundRevealed,
  recordRound,
  type ReadingRecord,
} from "@/domain/history/readingHistory";
import { roundKeyOf } from "@/domain/spread/round";
import type { Spread } from "@/domain/spread/types";
import type { ReadingHistoryHandle } from "@/presentation/components/history/useReadingHistory";
import type { ReadingSession } from "@/presentation/components/reading/useReadingSession";

interface RoundRecorderOptions {
  readonly spread: Spread;
  readonly revealedInstanceIds: ReadonlySet<string>;
  readonly deckId: string;
  readonly spreadName?: string;
  readonly reading: Pick<ReadingSession, "state" | "stale">;
  readonly history: Pick<ReadingHistoryHandle, "add" | "attach">;
  readonly createId: () => string;
  readonly now: () => Date;
}

/**
 * Keeps the reading history in step with the table: a round is recorded when
 * its last card is opened here, and the reading generated for it is attached
 * to that record. Also builds the record to share the table as it is now.
 */
export function useRoundRecorder({
  spread,
  revealedInstanceIds,
  deckId,
  spreadName,
  reading,
  history,
  createId,
  now,
}: RoundRecorderOptions): {
  readonly recordToShare: () => ReadingRecord | undefined;
} {
  const roundKey = roundKeyOf(spread);
  const roundRevealed = isRoundRevealed(spread, revealedInstanceIds);
  const currentReading = answeredReading(reading);
  const { add, attach } = history;

  const recordNow = useCallback(
    () =>
      recordRound({
        id: createId(),
        spread,
        deckId,
        ...(spreadName ? { spreadName } : {}),
        recordedAt: now(),
      }),
    [createId, spread, deckId, spreadName, now],
  );

  // A table restored already finished arrives with a new round key, so it is
  // not recorded again and a deleted record stays deleted.
  const previousRound = useRef({ roundKey, roundRevealed });
  useEffect(() => {
    const previous = previousRound.current;
    previousRound.current = { roundKey, roundRevealed };
    const justFinished =
      roundRevealed &&
      !previous.roundRevealed &&
      previous.roundKey === roundKey;
    if (!justFinished) return;
    const record = recordNow();
    if (record) add(record);
  }, [roundKey, roundRevealed, recordNow, add]);

  useEffect(() => {
    if (!currentReading || !roundKey) return;
    attach(roundKey, {
      mainQuestion: spread.mainQuestion,
      reading: currentReading,
    });
  }, [currentReading, roundKey, spread.mainQuestion, attach]);

  // The reading is shared only if it still answers these cards and questions.
  const recordToShare = useCallback(() => {
    const record = recordNow();
    if (!record || !currentReading) return record;
    const [withReading] = attachReading([record], record.roundKey, {
      mainQuestion: spread.mainQuestion,
      reading: currentReading,
    });
    return withReading;
  }, [recordNow, currentReading, spread.mainQuestion]);

  return { recordToShare };
}

/** The reading on screen, if it was generated for the table as it is now. */
function answeredReading(
  reading: Pick<ReadingSession, "state" | "stale">,
): ReadingResult | undefined {
  return reading.state.status === "ready" && !reading.stale
    ? reading.state.result
    : undefined;
}
