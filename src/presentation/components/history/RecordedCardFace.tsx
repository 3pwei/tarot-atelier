import type { Deck } from "@/domain/deck/deck";
import type { RecordedCard } from "@/domain/history/readingHistory";
import { CatalogCardArt } from "@/presentation/components/library/CatalogCardArt";
import { HISTORY_COPY } from "@/presentation/components/history/historyLabels";

/**
 * A recorded card's face. A deck can change after the round was recorded,
 * so a card it no longer holds is named as missing instead of failing.
 */
export function RecordedCardFace({
  deck,
  card,
}: Readonly<{ deck: Deck | undefined; card: RecordedCard }>) {
  const definition = deck?.getCard(card.cardId);
  if (!deck || !definition) {
    return (
      <div className="card-artwork card-artwork--compact history-card-missing">
        <span>{HISTORY_COPY.missingCard}</span>
      </div>
    );
  }
  return (
    <CatalogCardArt
      deckId={deck.id}
      card={definition}
      orientation={card.orientation}
    />
  );
}

/** The card's name, or the missing-card note when the deck lacks it. */
export function recordedCardName(
  deck: Deck | undefined,
  card: RecordedCard,
): string {
  return deck?.getCard(card.cardId)?.name.zhHant ?? HISTORY_COPY.missingCard;
}
