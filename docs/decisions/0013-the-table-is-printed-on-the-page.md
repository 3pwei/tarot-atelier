# ADR 0013: The chapter's table is printed on the page

- Status: Accepted
- Date: 2026-11-25

## Context

ADR 0010 left the table on a dark plate inside each chapter until it was redrawn. The owner approved a mock-up of the table printed on the page itself: the main question as a line to write on, raised lettering for the controls, a line of ink under the table saying what to do, the questions as footnotes, and the reading behind "Card Reading" once every card is revealed. Shuffling, the wheel, drawing and burning stay exactly as they are.

## Decision

- **The table is drawn in the page's ink.** Its own styles read `--table-ink`, `--table-ink-soft` and two lines mixed from them, set from the book's ink in one place (`draw-table.css`). The cloth, its gradients, the velvet noise and the dark plate are gone; the cards keep their own faces and backs.
- **Shared controls take their colours from the surface they sit on.** `controls.css` gives buttons and fields colour tokens: the night sky by default (`:root, .night-surface`), and a `.paper-surface` the table puts on. Dialogs stay night-coloured because they sit outside the table; the reading panel declares `.night-surface`, as it keeps its look until the reading pages are drawn.
- **Less text on the page.**
  - The status bar and the remaining count are gone. What the table waits for is one line under it, and the count is read aloud only, as the pack's thickness shows it.
  - The main question's label and count are read aloud, not printed; the count appears once the question nears its limit.
  - The play hint and the footer are gone; arranging keeps its instructions.
  - The history button left the chapter: the records are an appendix of the book.
- **Controls are raised lettering.** `Edit`/`Done` and `Anew ↻` use `BookFloatButton`, which gained `disabled`. Their accessible names stay Chinese (編輯牌陣, 結束編輯, 清除本次牌陣), like `Back`.
- **The reading opens on request.** Once every card is revealed, `Card Reading ›` (看解讀) opens the reading panel for that round; a new round closes it again.
- **Frames are printed faintly in play**, with their short names under them, so the spread shows where its cards will fall; arranging inks them in.
- **The table fits the screen beside the page around it.** The board's height allowance is `--table-screen-margin`, which the chapter sets to leave room for the running head, title, question and controls. On a phone the stage bleeds to the page's edges, as the plate did, so positions do not crowd the pack.

## Consequences

- On a desktop the table is smaller than on the plate, and its frame rate rose (`hold-vortex` 36 → 59 fps, `wheel-turn` 52 → 60 at 4× throttle).
- E2E specs open the reading with `openReading` and the records with `openRecords`.
- The codex keeps the dark plate (`.book-plate`) until its pages are drawn; the reading panel keeps its look until the reading pages are.
