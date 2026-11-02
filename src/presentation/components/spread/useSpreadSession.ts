"use client";

import { useEffect, useMemo, useReducer, useRef, type Dispatch } from "react";
import type { SpreadSessionStorage } from "@/application/ports/spreadSessionStorage";
import {
  clearSpreadSession,
  restoreSpreadSession,
  saveSpreadSession,
} from "@/application/use-cases/spreadSession";
import type { Deck } from "@/domain/deck/deck";
import {
  createHydrationIds,
  createInitialState,
  createSpreadReducer,
  type SpreadAction,
  type SpreadUiState,
} from "@/presentation/components/spread/spreadState";

/** Coalesces drag and typing bursts into one write. */
const SAVE_DELAY_MS = 250;

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
  /** Bumps whenever the spread is restored or cleared, so the pile resets. */
  readonly generation: number;
  readonly clear: () => void;
}

export function useSpreadSession(
  deck: Deck,
  storage: SpreadSessionStorage,
  createId: () => string = createClientId,
): SpreadSessionHandle {
  const reducer = useMemo(() => createSpreadReducer(createId), [createId]);
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialState(createHydrationIds()),
  );
  const status: SessionStatus = state.hydrated ? "ready" : "loading";
  const warnedAboutStorage = useRef(false);

  // Storage only exists in the browser, so restore after hydration.
  useEffect(() => {
    const restored = restoreSpreadSession(storage, deck);
    if (restored.status === "restored") {
      dispatch({
        type: "hydrate",
        restored: restored.session,
        notice: "已載入上次的牌陣。",
      });
    } else {
      dispatch({
        type: "hydrate",
        notice:
          restored.status === "discarded"
            ? "本機儲存的牌陣無法讀取，已重新開始。"
            : undefined,
      });
    }
  }, [deck, storage]);

  useEffect(() => {
    if (status !== "ready") return;
    const save = () =>
      saveSpreadSession(storage, {
        deckId: deck.id,
        spread: state.spread,
        revealedInstanceIds: [...state.revealedInstanceIds],
      });
    // A reload right after an edit must not lose it.
    window.addEventListener("pagehide", save);
    const timer = setTimeout(() => {
      window.removeEventListener("pagehide", save);
      const saved = save();
      if (saved.ok) {
        warnedAboutStorage.current = false;
      } else if (saved.reason === "storage" && !warnedAboutStorage.current) {
        warnedAboutStorage.current = true;
        dispatch({
          type: "announce",
          text: "瀏覽器無法儲存牌陣，重新整理後將不會保留。",
        });
      }
    }, SAVE_DELAY_MS);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", save);
    };
  }, [deck.id, state.spread, state.revealedInstanceIds, status, storage]);

  const clear = () => {
    clearSpreadSession(storage);
    dispatch({ type: "clear" });
  };

  return { state, dispatch, status, generation: state.generation, clear };
}
