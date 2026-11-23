import type { CardInstance, Orientation } from "@/domain/deck/types";

export type RandomSource = () => number;

export type DrawState = "idle" | "shuffling" | "ready" | "drawing" | "revealed";

export type JumperMode = "off" | "rare" | "normal" | "chaos";

export const JUMPER_PROBABILITIES = Object.freeze({
  off: 0,
  rare: 0.03,
  normal: 0.08,
  chaos: 0.15,
} satisfies Readonly<Record<JumperMode, number>>);

export interface DrawResult {
  readonly primary: CardInstance;
  readonly jumper?: CardInstance;
  readonly drawnAt: string;
}

function assertProbability(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} must be between 0 and 1`);
  }
}

function sample(random: RandomSource): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("RandomSource must return a value in [0, 1)");
  }
  return value;
}

export function shuffleCardIds(
  cardIds: readonly string[],
  random: RandomSource = Math.random,
): readonly string[] {
  const shuffled = [...cardIds];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(sample(random) * (index + 1));
    [shuffled[index], shuffled[target]] = [
      shuffled[target] as string,
      shuffled[index] as string,
    ];
  }

  return shuffled;
}

export function createCardInstance(options: {
  readonly instanceId: string;
  readonly deckId: string;
  readonly cardId: string;
  readonly supportsReversals: boolean;
  readonly random?: RandomSource;
  readonly reversedProbability?: number;
}): CardInstance {
  const random = options.random ?? Math.random;
  const reversedProbability = options.reversedProbability ?? 0.5;
  assertProbability(reversedProbability, "reversedProbability");
  const orientation: Orientation =
    options.supportsReversals && sample(random) < reversedProbability
      ? "reversed"
      : "upright";

  return Object.freeze({
    instanceId: options.instanceId,
    deckId: options.deckId,
    cardId: options.cardId,
    orientation,
  });
}

/**
 * Which card slips out with the chosen one: the next card in the pile, or the
 * previous one when the chosen card is the last. The fanned deck uses the same
 * rule to show which card leaves with it.
 */
export function jumperNeighbourIndex(index: number, count: number): number {
  return index + 1 < count ? index + 1 : index - 1;
}

export function isJumperTriggered(
  mode: JumperMode,
  remainingCount: number,
  random: RandomSource = Math.random,
): boolean {
  if (remainingCount < 2 || mode === "off") return false;
  return sample(random) < JUMPER_PROBABILITIES[mode];
}
