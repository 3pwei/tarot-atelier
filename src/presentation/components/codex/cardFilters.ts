import type { CardDefinition } from "@/domain/deck/types";

/** One section of the standard deck, as the codex's tabs divide it. */
export type CardSection = "major" | "wands" | "cups" | "swords" | "pentacles";

export const CARD_SECTIONS: readonly {
  readonly id: CardSection;
  readonly label: string;
}[] = Object.freeze([
  { id: "major", label: "大牌" },
  { id: "wands", label: "權杖" },
  { id: "cups", label: "聖杯" },
  { id: "swords", label: "寶劍" },
  { id: "pentacles", label: "錢幣" },
]);

/** Whether a card belongs to a section: the major arcana, or a suit. */
export function inSection(card: CardDefinition, section: CardSection): boolean {
  if (section === "major") return card.category === "major";
  return card.suit === section;
}
