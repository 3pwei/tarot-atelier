import type { CardInstance, Orientation } from "@/domain/deck/types";

export type RandomSource = () => number;

export function shuffleCardIds(
  cardIds: readonly string[],
  random: RandomSource = Math.random,
): readonly string[] {
  const shuffled = [...cardIds];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
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
}): CardInstance {
  const random = options.random ?? Math.random;
  const orientation: Orientation =
    options.supportsReversals && random() >= 0.5 ? "reversed" : "upright";

  return Object.freeze({
    instanceId: options.instanceId,
    deckId: options.deckId,
    cardId: options.cardId,
    orientation,
  });
}
