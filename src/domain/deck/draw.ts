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

export interface DrawExperienceOptions {
  readonly deckId: string;
  readonly cardIds: readonly string[];
  readonly supportsReversals: boolean;
  readonly random?: RandomSource;
  readonly jumperMode?: JumperMode;
  readonly reversedProbability?: number;
  readonly now?: () => Date;
}

export class InvalidDrawTransitionError extends Error {
  constructor(from: DrawState, action: string) {
    super(`Cannot ${action} while draw experience is ${from}`);
    this.name = "InvalidDrawTransitionError";
  }
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

export function isJumperTriggered(
  mode: JumperMode,
  remainingCount: number,
  random: RandomSource = Math.random,
): boolean {
  if (remainingCount < 2 || mode === "off") return false;
  return sample(random) < JUMPER_PROBABILITIES[mode];
}

/**
 * Owns one physical draw pile. UI animation mirrors, but never mutates, this
 * state machine. Seeded RandomSource implementations are for tests and
 * reproducible demos only; this class does not provide cryptographic randomness.
 */
export class DrawExperience {
  readonly #deckId: string;
  readonly #originalCardIds: readonly string[];
  readonly #supportsReversals: boolean;
  readonly #random: RandomSource;
  readonly #jumperMode: JumperMode;
  readonly #reversedProbability: number;
  readonly #now: () => Date;
  #remainingCardIds: string[];
  #state: DrawState = "idle";
  #drawNumber = 0;

  constructor(options: DrawExperienceOptions) {
    const uniqueIds = new Set(options.cardIds);
    if (uniqueIds.size !== options.cardIds.length) {
      throw new Error("Draw pile card IDs must be unique");
    }

    this.#deckId = options.deckId;
    this.#originalCardIds = Object.freeze([...options.cardIds]);
    this.#remainingCardIds = [...options.cardIds];
    this.#supportsReversals = options.supportsReversals;
    this.#random = options.random ?? Math.random;
    this.#jumperMode = options.jumperMode ?? "rare";
    this.#reversedProbability = options.reversedProbability ?? 0.5;
    this.#now = options.now ?? (() => new Date());
    assertProbability(this.#reversedProbability, "reversedProbability");
  }

  get state(): DrawState {
    return this.#state;
  }

  get remainingCount(): number {
    return this.#remainingCardIds.length;
  }

  beginShuffle(): void {
    if (this.#state !== "idle" && this.#state !== "revealed") {
      throw new InvalidDrawTransitionError(this.#state, "shuffle");
    }

    this.#state = "shuffling";
    this.#remainingCardIds = [
      ...shuffleCardIds(this.#remainingCardIds, this.#random),
    ];
  }

  completeShuffle(): void {
    if (this.#state !== "shuffling") {
      throw new InvalidDrawTransitionError(this.#state, "complete shuffle");
    }
    this.#state = "ready";
  }

  draw(): DrawResult | undefined {
    if (this.#state !== "ready") {
      throw new InvalidDrawTransitionError(this.#state, "draw");
    }
    if (this.#remainingCardIds.length === 0) return undefined;

    this.#state = "drawing";
    this.#drawNumber += 1;
    const shouldDrawJumper = isJumperTriggered(
      this.#jumperMode,
      this.#remainingCardIds.length,
      this.#random,
    );
    const primaryId = this.#remainingCardIds.shift() as string;
    const jumperId = shouldDrawJumper
      ? this.#remainingCardIds.shift()
      : undefined;

    const result: DrawResult = {
      primary: this.#createInstance(primaryId, "primary"),
      ...(jumperId ? { jumper: this.#createInstance(jumperId, "jumper") } : {}),
      drawnAt: this.#now().toISOString(),
    };

    return Object.freeze(result);
  }

  reveal(): void {
    if (this.#state !== "drawing") {
      throw new InvalidDrawTransitionError(this.#state, "reveal");
    }
    this.#state = "revealed";
  }

  reset(): void {
    if (this.#state === "shuffling" || this.#state === "drawing") {
      throw new InvalidDrawTransitionError(this.#state, "reset");
    }
    this.#remainingCardIds = [...this.#originalCardIds];
    this.#state = "idle";
    this.#drawNumber = 0;
  }

  #createInstance(cardId: string, role: "primary" | "jumper"): CardInstance {
    return createCardInstance({
      instanceId: `${this.#deckId}:draw-${this.#drawNumber}:${role}`,
      deckId: this.#deckId,
      cardId,
      supportsReversals: this.#supportsReversals,
      random: this.#random,
      reversedProbability: this.#reversedProbability,
    });
  }
}
