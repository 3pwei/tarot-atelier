# ADR 0015: The codex and the records are printed on the book's pages

- Status: Accepted
- Date: 2026-11-25
- Amends: [ADR 0013](./0013-the-table-is-printed-on-the-page.md) (dialogs are no longer night-coloured), [ADR 0014](./0014-a-chapter-on-facing-pages.md) (`TableLayout` is now the book's `PageLayout`; `ReadingSections` is gone)

## Context

The codex and the records were the last parts of the old night-sky UI. The codex was one long scrolling grid of 78 cards inside a plate, and the records opened as a dialog over the book. The owner asked to put both on the book's pages and to stop using the old UI. They approved a mock-up and chose:

- the codex drops its 「全部」 filter, so one section of cards is shown at a time;
- the share and confirm dialogs are restyled as paper in the same change.

## Decision

- **The book's layout is a book concept.** `PageLayout` (`single-page` or `facing-pages`) moved from `draw/tableLayout.ts` to `book/pageLayout.ts`. `BookPage` takes it, and on a spread width with `facing-pages` it sets `data-facing`. That turns on one grid in `book.css`: the running head across both pages, the title and flourish on the left, a body row, the folio. Each place puts its own parts into that grid, so the chapter, the codex and the records share it.
- **The codex is a card and a catalog.** `Codex` replaces `DeckLibrary`.
  - On facing pages the left page shows the chosen card (art, names, keywords, meanings, and Face/Back and Upright/Reversed raised-lettering toggles). The right page shows tabs 大牌／權杖／聖杯／寶劍／錢幣 over a grid of thumbnails. The grid is a size container, so its thumbnails fill the page and nothing scrolls at 1280×720 or 1280×800.
  - On a phone the card is stacked over the catalog.
  - The sections and their labels live in `cardFilters.ts` (`CARD_SECTIONS`). Copy lives in `codexCopy.ts`. A test deck is offered in a select only when there is more than one deck.
- **The records are a contents list and a record.** `RecordsPage` replaces `HistoryDialog`, `HistoryList` and `HistoryDetail`.
  - On facing pages the left page lists the rounds like a contents page (time, question, dotted leader, 已解讀/未解讀), with the newest lit and open. The right page prints that record: its question, its cards with jumpers, Read again / Share / Delete, and the reading set by `PrintedReading`. A long reading turns on with `Next ›`, through `ReadingSpread width="page"`, which flows in one column.
  - Choosing another round on facing pages shows it at once. On a phone, the list turns a leaf to the record, and `‹ The Records` (回到紀錄列表) turns back. Both turns print the arriving page on the leaf, as a chapter does.
  - Deleting one round or clearing them all asks inline on the page (`role="alert"`) rather than in a dialog.
  - Re-reading a stored round keeps using `useRecordReading`; a paused provider disables the actions while it waits.
- **No night-sky UI is left.** The share dialog, confirm dialog and card viewer are `.paper-sheet`s: paper gradients, ink text and `BookFloatButton` actions. The share image is drawn on paper in Iansui and IM Fell. `controls.css` has no night tokens. The old dialog, list, detail, reading-section and reading-panel stylesheets are deleted, with the globals they alone used.
- **`ProfessionalNote`** was pulled out of `ReadingPanel` so the record can print it too.

## Consequences

- E2E specs reach the records through `openRecords` and `openRecord` in `e2e/support/spreadTable.ts`, and the codex by its tabs.
- The codex shows 22 or 14 cards at a time; the total is still 78.
- Follow-ups, outside this change:
  - `--focus-ring` and the drawn-card caption still use night colours.
  - `docs/art-direction.md` still describes the midnight palette.
