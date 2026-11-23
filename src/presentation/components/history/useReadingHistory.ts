"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { ReadingHistoryStorage } from "@/application/ports/textStorage";
import {
  loadReadingHistory,
  saveReadingHistory,
} from "@/application/use-cases/readingHistory";
import {
  addRecord,
  attachReading,
  EMPTY_HISTORY,
  removeRecord,
  type ReadingHistory,
  type ReadingRecord,
} from "@/domain/history/readingHistory";
import type { ReadingResult } from "@/domain/reading/types";

export interface ReadingHistoryHandle {
  readonly history: ReadingHistory;
  readonly add: (record: ReadingRecord) => void;
  readonly attach: (
    roundKey: string,
    answered: {
      readonly mainQuestion: string;
      readonly reading: ReadingResult;
    },
  ) => void;
  readonly remove: (id: string) => void;
  readonly clearAll: () => void;
}

/**
 * The finished rounds kept on this device. Each change is saved at once;
 * `onNotice` hears when storage could not be read or written.
 */
export function useReadingHistory(
  storage: ReadingHistoryStorage,
  onNotice: (text: string) => void,
): ReadingHistoryHandle {
  // The hook owns every change, so the stored value simply replaces state.
  const [history, show] = useReducer(
    (_: ReadingHistory, next: ReadingHistory) => next,
    EMPTY_HISTORY,
  );
  const latest = useRef(history);
  const latestNotice = useRef(onNotice);
  useEffect(() => {
    latestNotice.current = onNotice;
  });

  // Storage only exists in the browser, so load after hydration.
  useEffect(() => {
    const loaded = loadReadingHistory(storage);
    latest.current = loaded.history;
    show(loaded.history);
    if (loaded.status === "discarded") {
      latestNotice.current("本機的歷史紀錄無法讀取，已清空。");
    }
  }, [storage]);

  const update = useCallback(
    (change: (current: ReadingHistory) => ReadingHistory) => {
      const next = change(latest.current);
      if (next === latest.current) return;
      latest.current = next;
      show(next);
      if (!saveReadingHistory(storage, next).ok) {
        latestNotice.current("瀏覽器無法儲存歷史紀錄，重新整理後將不會保留。");
      }
    },
    [storage],
  );

  return {
    history,
    add: useCallback(
      (record) => update((current) => addRecord(current, record)),
      [update],
    ),
    attach: useCallback(
      (roundKey, answered) =>
        update((current) => attachReading(current, roundKey, answered)),
      [update],
    ),
    remove: useCallback(
      (id) => update((current) => removeRecord(current, id)),
      [update],
    ),
    clearAll: useCallback(() => update(() => EMPTY_HISTORY), [update]),
  };
}
