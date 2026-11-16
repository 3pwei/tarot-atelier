# ADR 0005: Wash the deck and choose cards on the table

- Status: Accepted
- Date: 2026-11-16
- Supersedes: one-click dealing of every position from the top of the pile (Phase 03)

## Context

The owner wanted the draw to feel like a reader's ritual rather than a button: competing sites shuffle while a button is held. Dealing every position from the top of the pile with one click left the person no part in choosing.

## Decision

- **One table for everything.** The deck, its shuffle, the cards to choose from and the reveal all happen on the cloth itself; nothing opens in a separate area. The pack lies in the table's bottom right corner.
- **Hold to wash.** Holding the deck, the 「洗牌」 button or the space bar washes the cards face down across the whole table, the positions stepping back; letting go sweeps them into one pile in the middle. A tap or Enter washes one round. Two dozen cards stand in for the deck, which keeps it light. The order is decided when the shuffle completes, so how long the deck was held never predicts the cards.
- **Lay every remaining card on a wheel** along the bottom edge of the table, face down, in fixed slots. On a wide table the whole arc fits; on a phone part of it shows and a sideways drag turns the wheel. Positions near the bottom are covered while choosing and appear again once the wheel is put away.
- **Choose by sliding forward, then pulling.** A tap slides a card a little forward with a gold edge, without covering its neighbours, so it is clear which card is chosen; pulling it forward draws it. Keyboard and assistive technology use Enter: once to choose, again to draw. Cards go to the empty positions in number order.
- **The jumper stays**, at the fixed `rare` rate and never shown: it is the card next to the chosen one, by the same rule in the domain (`jumperNeighbourIndex`) and in the fan (`jumperSlot`), so the card seen leaving is the card drawn.
- **No cutting the deck**, and no reshuffle until every position has its card; clearing the table still starts over.

## Consequences

- One pre-rendered card back is shared by every washed and laid-out card. Turning the wheel moves one layer and only the chosen card re-renders; `pnpm perf` measures washing, laying out, turning and pulling.
- `drawSeries` and the deal stagger are gone.
- E2E tests choose cards from the keyboard. A pointer test covers the pull itself.
