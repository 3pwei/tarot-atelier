import type { CardDefinition, DeckManifest } from "@/domain/deck/types";

export class Deck {
  readonly manifest: DeckManifest;
  readonly cards: readonly CardDefinition[];
  readonly #cardsById: ReadonlyMap<string, CardDefinition>;

  constructor(manifest: DeckManifest) {
    this.manifest = manifest;
    this.cards = Object.freeze([...manifest.cards]);
    this.#cardsById = new Map(this.cards.map((card) => [card.id, card]));
  }

  get id(): string {
    return this.manifest.id;
  }

  getCard(cardId: string): CardDefinition | undefined {
    return this.#cardsById.get(cardId);
  }

  hasCard(cardId: string): boolean {
    return this.#cardsById.has(cardId);
  }
}
