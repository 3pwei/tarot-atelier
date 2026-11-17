# ADR 0005: Shuffle in a vortex and choose cards on the table

- Status: Accepted
- Date: 2026-11-16
- Supersedes: one-click dealing of every position from the top of the pile (Phase 03)

## Context

The owner wanted the draw to feel like a reader's ritual rather than a button: competing sites shuffle while a button is held. Dealing every position from the top of the pile with one click left the person no part in choosing.

## Decision

- **One table for everything.** The deck, its shuffle, the cards to choose from and the reveal all happen on the cloth itself; nothing opens in a separate area. The pack lies in the middle of the table, the only control for shuffling; there is no separate shuffle button. Once every position has its card the rest of the deck leaves the table.
- **One deck, one card size on the table.** The pile, the wheel and the cards on their way to a position are exactly as large as the positions' cards, so a card never grows or shrinks between the wheel and its position. In the air the cards take the size that suits the vortex.
- **Hold to shuffle in a vortex.** Holding the pack, or the space bar on it, lifts its cards one after another into a funnel of golden light over the table: twenty cards leave the pile over a second and a half, more and more of them, each shrinking as it climbs to the near side of its ring. There are four elliptical rings, wide at the top and narrow at the bottom; each turns faster than the one above and its cards look smaller (9.5% of the table's width at the top, 5% at the tip), whatever the spread's card size, so the vortex never covers the table. Points of light race round the rings and sparks drift by. Cards face the viewer and shrink and dim on the far side. The positions step back meanwhile. Letting go closes the funnel into the pile in a third of a second. A tap or Enter shuffles one round. The order is decided when the shuffle completes, so how long the deck was held never predicts the cards.
- **Rings are ellipses, never squashed circles.** Each card traces its ellipse with two swings a quarter turn apart, sideways on one element and up and down on the one inside it, both starting at the near side where the card joins the ring. A first version flattened rotating circles with a vertical scale; Chrome redrew every flattened layer on every frame, and holding the deck ran at 15 fps on a throttled desktop instead of 60.
- **Lay every remaining card on a wheel** along the bottom edge of the table, face down, in fixed slots. The cards are full size, so only the upper part of the arc shows above the edge, and a sideways drag turns the wheel on every screen. The table clips rather than scrolls, so focusing a card half below the edge never slides the table. Positions near the bottom are covered while choosing and appear again once the wheel is put away.
- **Choose by sliding forward, then pulling.** A tap slides a card a little forward with a gold edge, without covering its neighbours, so it is clear which card is chosen; pulling it forward draws it. Keyboard and assistive technology use Enter: once to choose, again to draw. Cards go to the empty positions in number order.
- **The jumper stays**, at the fixed `rare` rate and never shown: it is the card next to the chosen one, by the same rule in the domain (`jumperNeighbourIndex`) and in the fan (`jumperSlot`), so the card seen leaving is the card drawn.
- **No cutting the deck**, and no reshuffle until every position has its card; clearing the table still starts over.

## Consequences

- One pre-rendered card back is shared by every card in the air and on the wheel. Turning the wheel moves one layer and only the chosen card re-renders; `pnpm perf` measures holding, laying out, turning and pulling.
- `drawSeries` and the deal stagger are gone.
- E2E tests choose cards from the keyboard. A pointer test covers the pull itself.
