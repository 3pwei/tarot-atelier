# ADR 0005: Hold to shuffle and choose cards from a fanned deck

- Status: Accepted
- Date: 2026-11-16
- Supersedes: one-click dealing of every position from the top of the pile (Phase 03)

## Context

The owner wanted the draw to feel like a reader's ritual rather than a button: competing sites shuffle while a button is held. Dealing every position from the top of the pile with one click left the person no part in choosing.

## Decision

- **Hold to shuffle.** The deck, the 「洗牌」 button and the space bar shuffle for as long as they are held. Letting go finishes the riffle in progress; a tap or Enter shuffles one round. The order is decided when the shuffle completes, so how long the deck was held never predicts the cards.
- **Fan out every remaining card**, face down, in fixed slots along an arc that scrolls sideways.
- **Choose by pulling.** A tap lifts a card; pulling it up and out draws it. Keyboard and assistive technology use Enter: once to lift, again to draw. Cards go to the empty positions in number order.
- **The jumper stays**, at the fixed `rare` rate and never shown: it is the card next to the chosen one, by the same rule in the domain (`jumperNeighbourIndex`) and in the fan (`jumperSlot`), so the card seen leaving is the card drawn.
- **No cutting the deck**, and no reshuffle until every position has its card; clearing the table still starts over.

## Consequences

- One pre-rendered card back is shared by all 78 fanned cards, and only the touched card re-renders or moves; `pnpm perf` measures holding, opening, scrolling and pulling.
- `drawSeries` and the deal stagger are gone.
- E2E tests choose cards from the keyboard. A pointer test covers the pull itself.
