"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ReadingRequester } from "@/application/use-cases/requestReading";
import type { DeckRegistry } from "@/domain/deck/deckRegistry";
import {
  recordedSpread,
  type ReadingRecord,
} from "@/domain/history/readingHistory";
import type { ReadingResult, ReadingSource } from "@/domain/reading/types";
import { createSpread } from "@/domain/spread/spread";
import {
  useReadingSession,
  type ReadingSession,
} from "@/presentation/components/reading/useReadingSession";

/** What reading a recorded round needs: the table's own reading service. */
export interface RecordReadingServices {
  readonly requester: ReadingRequester;
  readonly source: ReadingSource;
  readonly createRequestId: () => string;
}

/** A spread with no positions: nothing to read until a record is chosen. */
const NO_SPREAD = createSpread({ id: "no-record", positions: [] });

/**
 * Reads a recorded round again with its own questions and cards. Each new
 * reading is handed to `onReading` once, to replace the record's reading.
 * Switching to another record drops a reading still running.
 */
export function useRecordReading(options: {
  readonly record: ReadingRecord | undefined;
  readonly registry: DeckRegistry;
  readonly services: RecordReadingServices;
  readonly onReading: (record: ReadingRecord, reading: ReadingResult) => void;
}): ReadingSession {
  const { record, registry, services, onReading } = options;
  // Replacing the reading keeps the round, so a reading in progress or just
  // shown is not dropped (see `useReadingSession`).
  const spread = useMemo(
    () => (record ? recordedSpread(record) : undefined) ?? NO_SPREAD,
    [record],
  );
  const session = useReadingSession({
    spread,
    registry,
    requester: services.requester,
    createRequestId: services.createRequestId,
  });

  const handled = useRef<string>(undefined);
  const { state } = session;
  useEffect(() => {
    if (state.status !== "ready" || handled.current === state.requestId) return;
    handled.current = state.requestId;
    if (record) onReading(record, state.result);
  }, [state, record, onReading]);

  return session;
}
