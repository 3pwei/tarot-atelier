import {
  createCardInstance,
  isJumperTriggered,
  jumperNeighbourIndex,
  shuffleCardIds,
  type DrawResult,
  type DrawState,
  type JumperMode,
  type RandomSource,
} from "@/domain/deck/draw";
import type { CardInstance } from "@/domain/deck/types";

/**
 * One physical draw pile, as an immutable value. Every step returns a new
 * pile, so the UI can hold it in a reducer and animation only mirrors it.
 * Seeded random sources are for tests and reproducible demos only; nothing
 * here is cryptographic randomness.
 */
export interface DrawPile {
  readonly deckId: string;
  readonly supportsReversals: boolean;
  readonly jumperMode: JumperMode;
  readonly reversedProbability: number;
  /** The cards still in the pile, top first, in their current order. */
  readonly remainingCardIds: readonly string[];
  readonly state: DrawState;
  /** Draws so far, counting earlier sessions, so instance IDs never repeat. */
  readonly drawNumber: number;
}

export type DrawPileAction =
  "shuffle" | "complete shuffle" | "draw" | "reveal" | "continue drawing";

export type DrawPileIssue =
  | { readonly code: "duplicate-card-ids" }
  | { readonly code: "invalid-previous-draw-count"; readonly value: number }
  | { readonly code: "invalid-reversed-probability"; readonly value: number }
  | {
      readonly code: "invalid-transition";
      readonly from: DrawState;
      readonly action: DrawPileAction;
    }
  | { readonly code: "empty-pile" }
  | {
      readonly code: "index-out-of-range";
      readonly index: number;
      readonly remaining: number;
    };

export type DrawPileStep<Value> =
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly issue: DrawPileIssue };

export interface DrawPileOptions {
  readonly deckId: string;
  readonly cardIds: readonly string[];
  readonly supportsReversals: boolean;
  readonly jumperMode: JumperMode;
  /** Chance of a reversed card where the deck supports reversals. */
  readonly reversedProbability?: number;
  /**
   * Cards already on the table. They stay out of the pile, and numbering
   * continues after them so instance IDs never repeat.
   */
  readonly alreadyDrawnCardIds?: readonly string[];
  readonly previousDrawCount?: number;
}

export interface DrawnFromPile {
  readonly pile: DrawPile;
  readonly result: DrawResult;
}

const DEFAULT_REVERSED_PROBABILITY = 0.5;

export function createDrawPile(
  options: DrawPileOptions,
): DrawPileStep<DrawPile> {
  if (new Set(options.cardIds).size !== options.cardIds.length) {
    return failed({ code: "duplicate-card-ids" });
  }
  const previousDrawCount = options.previousDrawCount ?? 0;
  if (!Number.isInteger(previousDrawCount) || previousDrawCount < 0) {
    return failed({
      code: "invalid-previous-draw-count",
      value: previousDrawCount,
    });
  }
  const reversedProbability =
    options.reversedProbability ?? DEFAULT_REVERSED_PROBABILITY;
  if (
    !Number.isFinite(reversedProbability) ||
    reversedProbability < 0 ||
    reversedProbability > 1
  ) {
    return failed({
      code: "invalid-reversed-probability",
      value: reversedProbability,
    });
  }
  const alreadyDrawn = new Set(options.alreadyDrawnCardIds ?? []);
  return succeeded({
    deckId: options.deckId,
    supportsReversals: options.supportsReversals,
    jumperMode: options.jumperMode,
    reversedProbability,
    remainingCardIds: options.cardIds.filter((id) => !alreadyDrawn.has(id)),
    state: "idle",
    drawNumber: previousDrawCount,
  });
}

/** Starts washing the pile: from a fresh pile, or between rounds. */
export function beginShuffle(pile: DrawPile): DrawPileStep<DrawPile> {
  if (pile.state !== "idle" && pile.state !== "revealed") {
    return invalid(pile, "shuffle");
  }
  return succeeded({ ...pile, state: "shuffling" });
}

/**
 * The order is decided here, when the person lets go of the deck, so how
 * long they held it never predicts the cards.
 */
export function completeShuffle(
  pile: DrawPile,
  random: RandomSource,
): DrawPileStep<DrawPile> {
  if (pile.state !== "shuffling") return invalid(pile, "complete shuffle");
  return succeeded({
    ...pile,
    remainingCardIds: shuffleCardIds(pile.remainingCardIds, random),
    state: "ready",
  });
}

/**
 * Draws the card the person chose: the one at `index` in the pile's current
 * order, 0 being the top. A jumper is the card lying next to it, as if it
 * slipped out with the chosen one. The pile is then `drawing` until the card
 * is revealed.
 */
export function drawAt(
  pile: DrawPile,
  index: number,
  collaborators: { readonly random: RandomSource; readonly now: () => Date },
): DrawPileStep<DrawnFromPile> {
  if (pile.state !== "ready") return invalid(pile, "draw");
  const remaining = pile.remainingCardIds.length;
  if (remaining === 0) return failed({ code: "empty-pile" });
  if (!Number.isInteger(index) || index < 0 || index >= remaining) {
    return failed({ code: "index-out-of-range", index, remaining });
  }

  const { random, now } = collaborators;
  const drawNumber = pile.drawNumber + 1;
  const primaryId = pile.remainingCardIds[index] as string;
  const jumperId = isJumperTriggered(pile.jumperMode, remaining, random)
    ? pile.remainingCardIds[jumperNeighbourIndex(index, remaining)]
    : undefined;
  const instance = (cardId: string, role: "primary" | "jumper") =>
    instanceOf(pile, { cardId, role, drawNumber, random });

  const result: DrawResult = Object.freeze({
    primary: instance(primaryId, "primary"),
    ...(jumperId ? { jumper: instance(jumperId, "jumper") } : {}),
    drawnAt: now().toISOString(),
  });
  return succeeded({
    pile: {
      ...pile,
      remainingCardIds: pile.remainingCardIds.filter(
        (id) => id !== primaryId && id !== jumperId,
      ),
      state: "drawing",
      drawNumber,
    },
    result,
  });
}

/** The drawn card has been laid down and shown. */
export function reveal(pile: DrawPile): DrawPileStep<DrawPile> {
  if (pile.state !== "drawing") return invalid(pile, "reveal");
  return succeeded({ ...pile, state: "revealed" });
}

/**
 * Readies the next choice from the same shuffled pile, the way a reader
 * lays out a spread without reshuffling between positions.
 */
export function continueDrawing(pile: DrawPile): DrawPileStep<DrawPile> {
  if (pile.state !== "revealed") return invalid(pile, "continue drawing");
  return succeeded({ ...pile, state: "ready" });
}

/** Says what went wrong in words a developer can act on. */
export function describeDrawPileIssue(issue: DrawPileIssue): string {
  switch (issue.code) {
    case "duplicate-card-ids":
      return "A draw pile's card IDs must be unique; check the deck manifest.";
    case "invalid-previous-draw-count":
      return `previousDrawCount must be a non-negative integer, got ${issue.value}.`;
    case "invalid-reversed-probability":
      return `reversedProbability must be between 0 and 1, got ${issue.value}.`;
    case "invalid-transition":
      return `Cannot ${issue.action} while the draw pile is ${issue.from}.`;
    case "empty-pile":
      return "The draw pile is empty.";
    case "index-out-of-range":
      return `index must be an integer from 0 to ${issue.remaining - 1}, got ${issue.index}.`;
  }
}

function instanceOf(
  pile: DrawPile,
  draw: {
    readonly cardId: string;
    readonly role: "primary" | "jumper";
    readonly drawNumber: number;
    readonly random: RandomSource;
  },
): CardInstance {
  return createCardInstance({
    instanceId: `${pile.deckId}:draw-${draw.drawNumber}:${draw.role}`,
    deckId: pile.deckId,
    cardId: draw.cardId,
    supportsReversals: pile.supportsReversals,
    random: draw.random,
    reversedProbability: pile.reversedProbability,
  });
}

function succeeded<Value>(value: Value): DrawPileStep<Value> {
  return { ok: true, value };
}

function failed<Value>(issue: DrawPileIssue): DrawPileStep<Value> {
  return { ok: false, issue };
}

function invalid<Value>(
  pile: DrawPile,
  action: DrawPileAction,
): DrawPileStep<Value> {
  return failed({ code: "invalid-transition", from: pile.state, action });
}
