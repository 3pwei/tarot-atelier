import {
  atelierStandardDeck,
  phaseOneTestDeck,
} from "@/domain/deck/builtinDecks";
import type { Deck } from "@/domain/deck/deck";
import type { DeckRegistry } from "@/domain/deck/deckRegistry";
import type { DrawResult } from "@/domain/deck/draw";
import type { Orientation } from "@/domain/deck/types";
import { assignDraw, createSpread } from "@/domain/spread/spread";
import type { Spread } from "@/domain/spread/types";

/** A read-only registry over the given decks, for tests. */
export function registryOf(...decks: readonly Deck[]): DeckRegistry {
  const byId = new Map(decks.map((deck) => [deck.id, deck]));
  const [first] = decks;
  return {
    register: () => {
      throw new Error("read-only test registry");
    },
    list: () => decks,
    get: (deckId) => byId.get(deckId),
    select: () => {},
    getSelected: () => {
      if (!first) throw new Error("empty test registry");
      return first;
    },
  };
}

export const standardRegistry = registryOf(
  atelierStandardDeck,
  phaseOneTestDeck,
);

export interface DrawSpec {
  readonly card: string;
  readonly orientation?: Orientation;
  readonly jumper?: {
    readonly card: string;
    readonly orientation?: Orientation;
  };
  readonly deckId?: string;
}

export function drawOf(spec: DrawSpec): DrawResult {
  const deckId = spec.deckId ?? atelierStandardDeck.id;
  return {
    primary: {
      instanceId: `${deckId}:${spec.card}`,
      deckId,
      cardId: spec.card,
      orientation: spec.orientation ?? "upright",
    },
    ...(spec.jumper
      ? {
          jumper: {
            instanceId: `${deckId}:${spec.jumper.card}`,
            deckId,
            cardId: spec.jumper.card,
            orientation: spec.jumper.orientation ?? "upright",
          },
        }
      : {}),
    drawnAt: "2026-11-07T00:00:00.000Z",
  };
}

export interface PositionSpec {
  readonly question: string;
  readonly draw?: DrawSpec;
}

/** A spread whose positions are listed in index order 1..n. */
export function spreadOf(
  positions: readonly PositionSpec[],
  mainQuestion = "",
): Spread {
  let spread = createSpread({
    id: "spread",
    mainQuestion,
    positions: positions.map((position, order) => ({
      id: `p${order + 1}`,
      question: position.question,
      x: (order + 1) / (positions.length + 1),
      y: 0.5,
    })),
  });
  positions.forEach((position, order) => {
    if (!position.draw) return;
    const update = assignDraw(spread, `p${order + 1}`, drawOf(position.draw));
    if (!update.ok) throw new Error(update.code);
    spread = update.spread;
  });
  return spread;
}

export const MAJOR = (numeral: number) =>
  `atelier-standard.major.${numeral.toString().padStart(2, "0")}`;
