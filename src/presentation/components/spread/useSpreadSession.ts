"use client";

import { useEffect, useMemo, useReducer, useRef, type Dispatch } from "react";
import type {
  RetiredTableStorage,
  SpreadTemplateStorage,
} from "@/application/ports/textStorage";
import {
  loadTemplateLibrary,
  saveTemplateLibrary,
} from "@/application/use-cases/templateLibrary";
import {
  createHydrationIds,
  createInitialState,
  createSpreadReducer,
  type SpreadAction,
  type SpreadUiState,
} from "@/presentation/components/spread/spreadState";

let fallbackCounter = 0;

/** Stable IDs for positions; never derived from user content. */
export function createClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  fallbackCounter += 1;
  return `id-${Date.now().toString(36)}-${fallbackCounter}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export type SessionStatus = "loading" | "ready";

export interface SpreadSessionHandle {
  readonly state: SpreadUiState;
  readonly dispatch: Dispatch<SpreadAction>;
  readonly status: SessionStatus;
  /** Bumps whenever the table is set up or cleared, so the pile resets. */
  readonly generation: number;
  readonly clear: () => void;
}

/**
 * The table for this visit. Every visit, a reload included, starts fresh from
 * `startTemplateId` (the chapter's spread) or else the default template:
 * finished rounds live in the reading history, and saved layouts in the
 * template library, so the table itself is never stored.
 */
export function useSpreadSession(
  templateStorage: SpreadTemplateStorage,
  retiredTableStorage: RetiredTableStorage,
  createId: () => string = createClientId,
  startTemplateId?: string,
): SpreadSessionHandle {
  const reducer = useMemo(() => createSpreadReducer(createId), [createId]);
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialState(createHydrationIds()),
  );
  const status: SessionStatus = state.hydrated ? "ready" : "loading";
  /** The library as loaded; it is only written once the person changes it. */
  const loadedLibrary = useRef<unknown>(null);

  // Storage only exists in the browser, so load the library after hydration.
  useEffect(() => {
    const templates = loadTemplateLibrary(templateStorage);
    loadedLibrary.current = templates.library;
    try {
      // Earlier versions kept the table here; a reload no longer restores it.
      retiredTableStorage.clear();
    } catch {
      // Unreadable storage holds nothing to remove.
    }
    dispatch({
      type: "hydrate",
      library: templates.library,
      ...(startTemplateId ? { templateId: startTemplateId } : {}),
      ...(templates.status === "discarded"
        ? { notice: "本機的牌陣庫無法讀取，已換回預設範例。" }
        : {}),
    });
  }, [templateStorage, retiredTableStorage, startTemplateId]);

  useEffect(() => {
    if (status !== "ready" || state.library === loadedLibrary.current) return;
    loadedLibrary.current = state.library;
    if (!saveTemplateLibrary(templateStorage, state.library).ok) {
      dispatch({
        type: "announce",
        text: "瀏覽器無法儲存牌陣庫，重新整理後將不會保留。",
      });
    }
  }, [state.library, status, templateStorage]);

  const clear = () => dispatch({ type: "clear" });

  return { state, dispatch, status, generation: state.generation, clear };
}
