"use client";

import { useMemo, useState } from "react";
import { registerBuiltInDecks } from "@/application/use-cases/createDeckLibrary";
import type { CardDefinition, Orientation } from "@/domain/deck/types";
import { InMemoryDeckRegistry } from "@/infrastructure/decks/inMemoryDeckRegistry";
import { CardArtwork } from "@/presentation/components/CardArtwork";

type CardFilter = "all" | "major" | "wands" | "cups" | "swords" | "pentacles";

const filters: readonly { readonly id: CardFilter; readonly label: string }[] =
  [
    { id: "all", label: "全部" },
    { id: "major", label: "大牌" },
    { id: "wands", label: "權杖" },
    { id: "cups", label: "聖杯" },
    { id: "swords", label: "寶劍" },
    { id: "pentacles", label: "錢幣" },
  ];

function matchesFilter(card: CardDefinition, filter: CardFilter): boolean {
  if (filter === "all") return true;
  if (filter === "major") return card.category === "major";
  return card.suit === filter;
}

export function DeckLibrary() {
  const registry = useMemo(
    () => registerBuiltInDecks(new InMemoryDeckRegistry()),
    [],
  );
  const initialDeck = registry.getSelected();
  const [deckId, setDeckId] = useState(initialDeck.id);
  const [cardId, setCardId] = useState(initialDeck.cards[0]?.id ?? "");
  const [filter, setFilter] = useState<CardFilter>("all");
  const [side, setSide] = useState<"face" | "back">("face");
  const [orientation, setOrientation] = useState<Orientation>("upright");

  const deck = registry.get(deckId) ?? initialDeck;
  const selectedCard = deck.getCard(cardId) ?? deck.cards[0];
  const visibleCards = deck.cards.filter((card) => matchesFilter(card, filter));

  function selectDeck(nextDeckId: string) {
    registry.select(nextDeckId);
    const nextDeck = registry.getSelected();
    setDeckId(nextDeck.id);
    setCardId(nextDeck.cards[0]?.id ?? "");
    setFilter("all");
    setSide("face");
    setOrientation("upright");
  }

  function selectCard(nextCardId: string) {
    setCardId(nextCardId);
    setSide("face");
    setOrientation("upright");
  }

  if (!selectedCard) {
    return <p role="status">這副牌組沒有可顯示的卡牌。</p>;
  }

  return (
    <div className="deck-library">
      <div className="deck-toolbar">
        <label className="deck-select-label" htmlFor="deck-select">
          <span>目前牌組</span>
          <select
            id="deck-select"
            value={deck.id}
            onChange={(event) => selectDeck(event.target.value)}
          >
            {registry.list().map((registeredDeck) => (
              <option key={registeredDeck.id} value={registeredDeck.id}>
                {registeredDeck.manifest.name.zhHant}（
                {registeredDeck.cards.length} 張）
              </option>
            ))}
          </select>
        </label>
        <div className="deck-meta" aria-live="polite">
          <span>{deck.manifest.artist}</span>
          <span>
            {deck.manifest.supportsReversals ? "支援正逆位" : "僅正位"}
          </span>
          <span>{deck.manifest.license}</span>
        </div>
      </div>

      <div className="deck-library__layout">
        <aside className="card-inspector" aria-label="單卡檢視">
          <div className="card-inspector__visual">
            <CardArtwork
              card={selectedCard}
              side={side}
              orientation={orientation}
            />
          </div>
          <div className="segmented-control" aria-label="牌面或牌背">
            <button
              type="button"
              aria-pressed={side === "face"}
              onClick={() => setSide("face")}
            >
              牌面
            </button>
            <button
              type="button"
              aria-pressed={side === "back"}
              onClick={() => setSide("back")}
            >
              牌背
            </button>
          </div>
          <div className="segmented-control" aria-label="卡牌方向">
            <button
              type="button"
              aria-pressed={orientation === "upright"}
              onClick={() => setOrientation("upright")}
            >
              正位
            </button>
            <button
              type="button"
              aria-pressed={orientation === "reversed"}
              disabled={!deck.manifest.supportsReversals}
              title={
                deck.manifest.supportsReversals ? undefined : "此牌組已關閉逆位"
              }
              onClick={() => setOrientation("reversed")}
            >
              逆位
            </button>
          </div>
          <div className="card-inspector__copy">
            <p className="card-kicker">
              {selectedCard.category === "major"
                ? "大阿爾克那"
                : (selectedCard.suit ?? "自製牌")}
            </p>
            <h3>{selectedCard.name.zhHant}</h3>
            <p className="card-english">{selectedCard.name.en}</p>
            <div className="keyword-list" aria-label="關鍵字">
              {selectedCard.keywords.map((keyword) => (
                <span key={keyword}>{keyword}</span>
              ))}
            </div>
            <dl className="meaning-list">
              <div>
                <dt>正位</dt>
                <dd>{selectedCard.uprightMeaning}</dd>
              </div>
              <div
                className={
                  !deck.manifest.supportsReversals ? "is-disabled" : ""
                }
              >
                <dt>逆位</dt>
                <dd>
                  {deck.manifest.supportsReversals
                    ? selectedCard.reversedMeaning
                    : "此牌組已在 manifest 關閉逆位。"}
                </dd>
              </div>
            </dl>
            <code className="stable-id">ID · {selectedCard.id}</code>
          </div>
        </aside>

        <section className="card-catalog" aria-labelledby="catalog-title">
          <div className="card-catalog__header">
            <div>
              <p className="eyebrow">Deck registry</p>
              <h3 id="catalog-title">卡牌庫</h3>
            </div>
            <span>{visibleCards.length} 張定義</span>
          </div>
          {deck.id === "atelier-standard-tarot" && (
            <div className="filter-bar" aria-label="卡牌分類">
              {filters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
          <div className="card-grid">
            {visibleCards.map((card) => (
              <button
                className="catalog-card"
                data-testid="catalog-card"
                type="button"
                key={card.id}
                aria-pressed={selectedCard.id === card.id}
                onClick={() => selectCard(card.id)}
              >
                <CardArtwork
                  card={card}
                  side="face"
                  orientation="upright"
                  compact
                />
                <span className="catalog-card__name">{card.name.zhHant}</span>
                <span className="catalog-card__english">{card.name.en}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
