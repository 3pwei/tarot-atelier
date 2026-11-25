"use client";

import { useId, useState } from "react";
import { STANDARD_DECK_ID } from "@/domain/deck/builtinDecks";
import type { CardDefinition, Orientation } from "@/domain/deck/types";
import { BookFloatButton } from "@/presentation/components/book/BookFloatButton";
import type { PageLayout } from "@/presentation/components/book/pageLayout";
import { CardArtwork } from "@/presentation/components/CardArtwork";
import {
  CARD_SECTIONS,
  inSection,
  type CardSection,
} from "@/presentation/components/codex/cardFilters";
import { CODEX_COPY } from "@/presentation/components/codex/codexCopy";
import { CatalogCardArt } from "@/presentation/components/library/CatalogCardArt";
import { useAtelierServices } from "@/presentation/services/atelierServices";

type CardSide = "face" | "back";

/**
 * Every card of the deck, printed on the codex's pages: the card being read
 * on the left, with its meanings; the deck, a section at a time, on the
 * right. On a phone the two follow one another.
 */
export function Codex({ layout }: { readonly layout: PageLayout }) {
  const { registry } = useAtelierServices();
  const decks = registry.list();
  const initialDeck = registry.getSelected();
  const [deckId, setDeckId] = useState(initialDeck.id);
  const [cardId, setCardId] = useState(initialDeck.cards[0]?.id ?? "");
  const [section, setSection] = useState<CardSection>("major");
  const [side, setSide] = useState<CardSide>("face");
  const [orientation, setOrientation] = useState<Orientation>("upright");
  const catalogTitleId = useId();

  const deck = registry.get(deckId) ?? initialDeck;
  const card = deck.getCard(cardId) ?? deck.cards[0];
  // Only the standard deck is divided into the arcana and the four suits.
  const sectioned = deck.id === STANDARD_DECK_ID;
  const shown = sectioned
    ? deck.cards.filter((candidate) => inSection(candidate, section))
    : deck.cards;
  const reversible = deck.manifest.supportsReversals;

  const chooseDeck = (nextDeckId: string) => {
    registry.select(nextDeckId);
    const next = registry.getSelected();
    setDeckId(next.id);
    setCardId(next.cards[0]?.id ?? "");
    setSection("major");
    setSide("face");
    setOrientation("upright");
  };

  const chooseCard = (next: CardDefinition) => {
    setCardId(next.id);
    setSide("face");
    setOrientation("upright");
  };

  if (!card) return <p role="status">{CODEX_COPY.emptyDeck}</p>;

  return (
    <div className="codex paper-surface" data-layout={layout}>
      <section className="codex__card" aria-label={CODEX_COPY.cardLabel}>
        <div className="codex__card-body">
          <div className="codex__art">
            <CardArtwork card={card} side={side} orientation={orientation} />
          </div>
          <div className="codex__copy">
            <h2 className="codex__name">{card.name.zhHant}</h2>
            <p className="codex__english">
              <span lang="en">{card.name.en}</span> · {kindOf(card)}
            </p>
            <p className="codex__keywords" aria-label={CODEX_COPY.keywords}>
              {card.keywords.join(" · ")}
            </p>
            <dl className="codex__meanings">
              <div>
                <dt>{CODEX_COPY.upright}</dt>
                <dd>{card.uprightMeaning}</dd>
              </div>
              <div data-unavailable={!reversible || undefined}>
                <dt>{CODEX_COPY.reversed}</dt>
                <dd>
                  {reversible ? card.reversedMeaning : CODEX_COPY.noReversals}
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="codex__toggles">
          <div role="group" aria-label={CODEX_COPY.sideLabel}>
            <BookFloatButton
              label={CODEX_COPY.faceLabel}
              pressed={side === "face"}
              onPress={() => setSide("face")}
            >
              <span lang="en">{CODEX_COPY.face}</span>
            </BookFloatButton>
            <BookFloatButton
              label={CODEX_COPY.backLabel}
              pressed={side === "back"}
              onPress={() => setSide("back")}
            >
              <span lang="en">{CODEX_COPY.back}</span>
            </BookFloatButton>
          </div>
          <div role="group" aria-label={CODEX_COPY.orientationLabel}>
            <BookFloatButton
              label={CODEX_COPY.upright}
              pressed={orientation === "upright"}
              onPress={() => setOrientation("upright")}
            >
              <span lang="en">{CODEX_COPY.uprightEnglish}</span>
            </BookFloatButton>
            <BookFloatButton
              label={CODEX_COPY.reversed}
              pressed={orientation === "reversed"}
              disabled={!reversible}
              onPress={() => setOrientation("reversed")}
            >
              <span lang="en">{CODEX_COPY.reversedEnglish}</span>
            </BookFloatButton>
          </div>
        </div>
      </section>

      <section className="codex__catalog" aria-labelledby={catalogTitleId}>
        <h2 id={catalogTitleId} className="sr-only">
          {CODEX_COPY.catalogTitle}
        </h2>
        {decks.length > 1 && (
          <label className="codex__deck field">
            <span>{CODEX_COPY.deckLabel}</span>
            <select
              value={deck.id}
              onChange={(event) => chooseDeck(event.target.value)}
            >
              {decks.map((registered) => (
                <option key={registered.id} value={registered.id}>
                  {registered.manifest.name.zhHant}（{registered.cards.length}{" "}
                  張）
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="codex__tabs">
          {sectioned &&
            CARD_SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="codex__tab"
                aria-pressed={section === item.id}
                onClick={() => setSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          <span className="codex__count">{CODEX_COPY.count(shown.length)}</span>
        </div>
        <div className="codex__grid-frame">
          <div className="codex__grid">
            {shown.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                className="codex__thumb"
                data-testid="catalog-card"
                data-card-id={candidate.id}
                aria-label={`${candidate.name.zhHant} ${candidate.name.en}`}
                aria-pressed={card.id === candidate.id}
                onClick={() => chooseCard(candidate)}
              >
                <CatalogCardArt deckId={deck.id} card={candidate} />
              </button>
            ))}
          </div>
        </div>
        <p className="codex__credit">
          {deck.manifest.name.zhHant} · {deck.manifest.artist} ·{" "}
          {reversible ? CODEX_COPY.reversible : CODEX_COPY.uprightOnly} ·{" "}
          {deck.manifest.license}
        </p>
      </section>
    </div>
  );
}

/** What kind of card it is: the major arcana, a suit, or a deck's own. */
function kindOf(card: CardDefinition): string {
  if (card.category === "major") return CODEX_COPY.majorArcana;
  const suit = CARD_SECTIONS.find((item) => item.id === card.suit);
  return suit ? suit.label : CODEX_COPY.ownCard;
}
