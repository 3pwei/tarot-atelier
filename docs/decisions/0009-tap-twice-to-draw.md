# ADR 0009: Tap twice to draw, from a wheel that shows more of each card

- Status: Accepted
- Date: 2026-11-24
- Amends: [ADR 0005](0005-wash-and-choose-on-the-table.md) (laying out the wheel, choosing a card)

## Context

The owner found the wheel hard to use: too little of each card showed to tap it, and the cards towards either edge were hardest of all. Measured on a 375 px phone, a card showed about 425 px² that a finger could reach, and the outermost cards on the table only 2–4 px²: only 55% of a card's height rose above the table's edge, neighbours sat 13 px apart, and the arc curved so tightly that the outer cards sank below the edge. Pulling a lifted card forward to draw it was also harder than it needed to be.

## Decision

- **Show more of every card.** 85% of a card's height rises above the table's bottom edge (`VISIBLE_SHARE`, was 55%). Neighbours sit 20 px or 18% of a card's width apart along the rim (was 13 px or 12%).
- **A flatter arc.** The wheel's radius is 1.6× the table's width, at least 420 px (was 0.85×, at least 260 px), so the outermost cards on the table still show at least half of themselves. A test pins this.
- **Tap, then tap again.** The first tap lifts a card a fifth of its height, as before; a second tap anywhere over the lifted card draws it into the next empty position. Tapping another card lifts that one instead. Pulling a card forward no longer draws it, so there is one way to draw. A sideways drag still turns the wheel, and the keyboard still uses Enter twice.

Of the options shown to the owner, this one (C) gives the most room per card; the other (B) kept the spacing narrow to show more cards at once.

## Consequences

- On that phone a card now shows about 1,145 px² (2.7×); 18 cards are on screen at once instead of 25, so the wheel is turned a little more often.
- The perf scenario `wheel-pull` becomes `wheel-draw`: a tap on the lifted card. The pull's flaky miss in the desktop run goes with it.
- E2E and unit tests cover tapping twice, tapping another card, and an upward drag that no longer draws.
