# Phase 01 deck engine

## Identity and boundaries

- `DeckManifest` is the portable input format; schema `1.0.0` accepts 1–200 cards.
- `Deck` is an immutable, validated collection indexed by stable card ID.
- `CardInstance` stores only `deckId`, `cardId`, `instanceId`, and orientation. Artwork and translated names are resolved through the registry when displayed.
- `DeckRegistry` is the domain contract. The current `InMemoryDeckRegistry` is an infrastructure implementation and can later be replaced without changing drawing rules.
- `shuffleCardIds` shuffles IDs only. It never knows card names or asset paths.

## Validation

The runtime parser rejects unsupported schema versions, malformed stable IDs, duplicate card IDs, empty decks, decks over 200 cards, missing face/back declarations, invalid minor-arcana suit/rank values, and unsafe asset protocols.

An asset declaration can still become unavailable at runtime. The UI keeps the stable card identity and renders an explicit `素材待補` fallback. `missing://` is reserved for intentionally exercising this fallback in tests and previews.

JSON Schema: [`deck-manifest.schema.json`](./deck-manifest.schema.json)

Minimal example: [`public/decks/examples/minimal-deck.json`](../public/decks/examples/minimal-deck.json)

## Built-in art status

The standard deck contains complete definitions for 22 major and 56 minor arcana. Phase 01 visuals are original procedural frames, typographic symbols, and suit marks. They are deliberately not presented as 78 finished illustrations.
