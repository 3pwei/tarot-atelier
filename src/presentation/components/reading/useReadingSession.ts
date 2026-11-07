"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { ReadingRequester } from "@/application/use-cases/requestReading";
import type { DeckRegistry } from "@/domain/deck/deckRegistry";
import {
  buildReadingRequest,
  type ReadingRequestBuild,
} from "@/domain/reading/buildReadingRequest";
import type { Spread } from "@/domain/spread/types";
import {
  fingerprintOf,
  initialReadingState,
  isStale,
  readingReducer,
  type ReadingState,
} from "@/presentation/components/reading/readingSession";

export interface ReadingSession {
  readonly build: ReadingRequestBuild;
  readonly state: ReadingState;
  /** The shown reading or failure belongs to an older spread. */
  readonly stale: boolean;
  readonly generate: () => void;
  /** Tries the failed attempt again with the same request ID. */
  readonly retry: () => void;
  readonly cancel: () => void;
}

export function useReadingSession(options: {
  readonly spread: Spread;
  readonly registry: DeckRegistry;
  readonly requester: ReadingRequester;
  readonly createRequestId: () => string;
}): ReadingSession {
  const { spread, registry, requester, createRequestId } = options;
  const [state, dispatch] = useReducer(readingReducer, initialReadingState);
  const controller = useRef<AbortController | null>(null);

  const build = useMemo(
    () => buildReadingRequest(spread, registry),
    [spread, registry],
  );
  const fingerprint = build.ok ? fingerprintOf(build.request) : undefined;

  const run = useCallback(
    (requestId: string) => {
      if (!build.ok) return;
      controller.current?.abort();
      const attempt = new AbortController();
      controller.current = attempt;
      dispatch({
        type: "requested",
        requestId,
        fingerprint: fingerprintOf(build.request),
      });
      void requester
        .request(requestId, build.request, attempt.signal)
        .then((outcome) => dispatch({ type: "answered", requestId, outcome }));
    },
    [build, requester],
  );

  const generate = useCallback(
    () => run(createRequestId()),
    [run, createRequestId],
  );

  const retry = useCallback(() => {
    const sameRequest =
      state.status === "failed" && state.fingerprint === fingerprint;
    run(sameRequest ? state.requestId : createRequestId());
  }, [state, fingerprint, run, createRequestId]);

  const cancel = useCallback(() => controller.current?.abort(), []);

  // Leaving the table must not leave a reading running.
  useEffect(() => () => controller.current?.abort(), []);

  return {
    build,
    state,
    stale: isStale(state, fingerprint),
    generate,
    retry,
    cancel,
  };
}
