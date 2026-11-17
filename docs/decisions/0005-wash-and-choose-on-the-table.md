# ADR 0005: Shuffle in a vortex and choose cards on the table

- Status: Accepted
- Date: 2026-11-16
- Supersedes: one-click dealing of every position from the top of the pile (Phase 03)

## Context

The owner wanted the draw to feel like a reader's ritual rather than a button: competing sites shuffle while a button is held. Dealing every position from the top of the pile with one click left the person no part in choosing.

## Decision

- **One table for everything.** The deck, its shuffle, the cards to choose from and the reveal all happen on the cloth itself; nothing opens in a separate area. The pack lies in the middle of the table, the only control for shuffling; there is no separate shuffle button. Once every position has its card the rest of the deck leaves the table.
- **The table steps back while drawing.** From the first shuffle until every position has its card and every card has landed, the table is shown at 70% (`tableZoom`), so the pile, the vortex and the wheel have room; then it comes close again for the reveal. Position frames and numbers only show while arranging; in play the table shows cards alone (a focused position still shows its number for keyboard users). The classic three positions sit further apart.
- **One deck, one card size on the table.** The pile, the wheel and the cards on their way to a position are exactly as large as the positions' cards at the current zoom. In the air the cards stay close to that size (65–95%, a little smaller towards the tip). The pile's edge is drawn in dark violet slices with a faint gold line, not a light edge.
- **Hold to shuffle in a vortex.** Holding the pack, or the space bar on it, sends its cards one after another off the top and up into a whirl: twenty cards over a second and a half, and the pack thins slice by slice until its last card has gone. There are four rings, wide at the top and narrow at the bottom, each turning faster than the one above; the widest reach past the table's edges, where cards are clipped and come back round. Every card strays from its ring's path, size and angle, flips over every two laps to show a plain gold front (never a card's face), and every other card trails a short glowing streak. The positions step back meanwhile. A tap or Enter shuffles one round. The order is decided when the shuffle completes, so how long the deck was held never predicts the cards.
- **Letting go drops a loose heap, then the wheel rises.** The cards fall in a loose, askew heap low on the table (0.32 s), which slides off the bottom edge (0.24 s); the wheel, laid out out of sight meanwhile, then rises from the bottom edge and opens out.
- **Only cheap motion.** Every animation is a transform or opacity of something painted once. Rings are ellipses traced by two swings a quarter turn apart (squashing a rotating circle made Chrome redraw it every frame: 15 fps instead of 60 on a throttled desktop). Flips are a squeeze across rather than a 3D turn, the gold front and its glow are painted once, the streak is a fixed image, and no flying card has a shadow (a 3D tumble with glowing cards ran at 24 fps). Cards in the air use a half-size back (`back-small.webp`).
- **Lay every remaining card on a wheel** along the bottom edge of the table, face down, in fixed slots. The cards are full size, so only the upper part of the arc shows above the edge, and a sideways drag turns the wheel on every screen. The table clips rather than scrolls, so focusing a card half below the edge never slides the table. Positions near the bottom are covered while choosing and appear again once the wheel is put away.
- **Choose by sliding forward, then pulling.** A tap slides a card a little forward with a gold edge, without covering its neighbours, so it is clear which card is chosen; pulling it forward draws it. Keyboard and assistive technology use Enter: once to choose, again to draw. Cards go to the empty positions in number order.
- **The jumper stays**, at the fixed `rare` rate and never shown: it is the card next to the chosen one, by the same rule in the domain (`jumperNeighbourIndex`) and in the fan (`jumperSlot`), so the card seen leaving is the card drawn.
- **No cutting the deck**, and no reshuffle until every position has its card; clearing the table still starts over.

## Consequences

- One pre-rendered card back is shared by every card in the air and on the wheel. Turning the wheel moves one layer and only the chosen card re-renders; `pnpm perf` measures holding, laying out, turning and pulling.
- `drawSeries` and the deal stagger are gone.
- E2E tests choose cards from the keyboard. A pointer test covers the pull itself.
