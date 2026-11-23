# ADR 0008: Every visit starts from a fresh table

- Status: Accepted
- Date: 2026-11-20

## Context

Since Phase 03 the table (layout, questions, draws and reveals) was saved to local storage and restored on every reload with 「已載入上次的牌陣。」. Once the reading history existed (ADR 0006), a reload that brought back the last round read as if that result still applied, which misled people.

## Decision

- A reload, like any visit, starts from the library's first template with no main question, no cards and a full pile. Nothing about the table is restored.
- The table is no longer stored at all. The session snapshot (format v2 and its migrations), the unfinished-round recovery and the 250 ms save loop are removed.
- The old `tarot-atelier:spread-session` value is cleared on load (`RetiredTableStorage`), so an earlier copy does not stay on the device.
- No warning before reloading or closing the tab. The owner chose this.

## Consequences

- A finished round is kept in the reading history; a layout worth keeping is saved to the template library. A layout being edited and not yet saved is lost on reload.
- `collectDrawnInstances` and `roundKeyOf` live in `domain/spread/round.ts`, shared by the dealer, the reading session and the history.
