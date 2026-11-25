# ADR 0014: A chapter lies on facing pages, and its reading on the pages after

- Status: Accepted
- Date: 2026-11-25

## Context

On a wide screen a chapter was one tall page across both halves of the open book: the table, its notes and the reading under it scrolled up and down. The owner asked for no vertical scrolling on a desktop. The table goes on one page and the information on the other, the reading goes on the next pages, and the text is set closer so a reading fits a spread. They approved the mock-up, and chose that a reading too long for one spread turns on with `Next ›`, with the text kept at 14px. Phones stay as they are.

## Decision

- **Layout is chosen by the book.** `TableLayout` is `single-page` or `facing-pages`. `AtelierBook` already knows whether the book shows facing pages (`useFacingPages`), so it passes the layout through `ChapterPage` to `DrawExperience`. The table never reads the screen itself.
- **One DOM, two arrangements.** `DrawExperience` renders the play (toolbar, stage and hint) and the notes (question, notice, spread library, questions and the `Card Reading` cue) as two groups.
  - With `single-page`, both groups are `display: contents`, and `order` keeps the phone's sequence (`draw/table-layout.css`).
  - With `facing-pages`, the chapter page is a two-column grid (`book.css`). The play sits on the left under the title; the notes sit on the right.
  - Neither page scrolls. The board fills the left page as far as its 3:2 shape allows; the stage is a size container.
- **Arranging takes the notes page.** On facing pages, the main question is put away while a layout is edited. The spread library and position editor are set close: chips and the save action on one line, the four placement numbers in one row. With both, the page still fits at 1280×720.
- **The reading is a leaf turn away.** On facing pages, `Card Reading ›` asks the chapter to `turnLeaf("forward")`. This is a new `usePageTurns` turn whose `from` and `to` are the same place. Its promise settles when the leaf lands, and only then does the chapter show the reading.
  - The running head reads "… · Card Reading" and offers `‹ The Cards` (回到牌陣), which turns back.
  - Focus goes to the title after each turn, as after any turn. Under reduced motion, the reading swaps at once.
- **Long readings run on.** The reading is laid out in two CSS columns (`column-fill: auto`) inside a window of one spread. `ReadingSpread` counts the spreads its columns run to (`spreadCount`, measured by `ResizeObserver` and `MutationObserver`) and shows one spread at a time with `‹ Previous` / `Next ›`.
  - Each of these is a leaf turn too.
  - The spread turned to takes the focus and is named "解讀 第 n／m 頁".
- **The reading is printed, not panelled.** `ReadingPanel` takes `layout: { kind: "pages", heading }`. It wears `.paper-surface`, leads with the page's own title, and passes `display="open"` to `ReadingSections`, so every section is open (`section[data-open]` with an `h3`, not `details`).
  - `reading-pages.css` sets it in the page's ink at 14px. The AI/sample badge and the disclaimer stay visible.
  - The panel under the table on a phone is unchanged (`display="collapsible"`).
- **`SpreadSetup` is gone.** Its question field and library moved into the notes group, which both layouts share.

## Consequences

- A three-card reading fits one spread at 1280×800; the eight-card circle takes two.
- On a desktop the board grew from about 406 to about 500px wide at 1280×800, since the stage no longer keeps the plate's side padding.
- Tests drive the table through shared steps in `src/presentation/components/testing/playTable.ts`. E2E specs find reading sections as `.reading-section`, which can be a `details` or an open `section`.
- Follow-ups, outside this change:
  - The circle's built-in layout overlaps its cards at the current card size on every screen.
  - Its lowest short name can fall below the board.
  - `history.spec.ts` sometimes fails to reopen the records after a reload, on the base branch too.
