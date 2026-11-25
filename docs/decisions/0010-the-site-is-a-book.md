# ADR 0010: The site is a spell book on a desk

- Status: Accepted
- Date: 2026-11-25

## Context

The owner found the home page asked too much of a first-time visitor: a hero, two paragraphs of explanation and a dense table before anything happened. They asked for the site to guide by pictures instead, and settled on an old spell book: a frontispiece, a contents page, one chapter per spread, and the card library and records as an appendix. The look was settled on mock-ups first (candle light from beyond the top-left, soft shadows, a gilt cover with the milespapa mark, English script titles, Iansui for Chinese).

The owner asked for this in stages. This ADR covers the first: the book's shell and its navigation. The page turn (ADR to follow), the book-styled table, codex and records come next.

## Decision

- **One page, many places.** The site stays one static page. Where the reader is (`BookPlace`: cover, frontispiece, contents, a spread's chapter, codex, records) is client state, mirrored in the URL hash (`#contents`, `#spread-<template id>`, `#codex`, `#records`), so links open at a chapter and the browser's back button walks back through the book. An unknown or stale hash opens the cover; a link to a deleted spread opens the contents.
- **The contents are the spread library.** Every template in the library is a chapter, in library order, so a spread the reader saves becomes a chapter of its own. Built-in spreads get English titles (`BUILT_IN_CHAPTER_TITLES`); the reader's own keep their names. Numerals and page numbers follow from the order.
- **Tap to light, tap again to turn.** A first tap on an entry lights it, a second turns there, so a stray touch never moves the reader. Enter and Space turn at once.
- **Each chapter starts from its spread.** The table takes the chapter's template id and starts from it on every visit, as before (ADR 0008); the in-play spread picker is gone, because the contents choose the spread. Leaving a chapter with cards drawn but not all revealed, or a layout half edited, asks first; a finished round is already in the records.
- **The table and codex keep their look for now**, on a dark plate inside the page, until their chapters are redrawn. The records open the existing history dialog.
- **Painted surfaces are images.** The cover, frontispiece and desk are SVG under `art/book/`, published as WebP by `pnpm book-art`, so the site never runs their SVG filters. The torn page edge is a fixed CSS mask.
- **The book's shadow is a box-shadow, never a filter.** A `drop-shadow` filter on the open book halved the table's frame rate on a 4× throttled desktop (shuffle 31 → 14 fps, wheel 53 → 26, drag 58 → 20), because every moving card re-rasterised the whole book. With a box-shadow the table matches master.
- **Fonts are self-hosted** from `@fontsource` (Pinyon Script, IM Fell English, Iansui; all OFL 1.1), recorded in `docs/art-direction.md`.

## Consequences

- The home page's hero, section headings, footer and their CSS, the Phase 00 mark and stardust field are removed.
- E2E specs open the book at a chapter (`openChapter`); new specs cover the cover, the contents, Back and the browser's back button, the leave check, and a saved spread becoming a chapter.
- On a phone the dark plate bleeds to the paper's edge so the table keeps its width: narrower, the positions crowded the pack and Chrome's touch adjustment caught one finger of a pinch on a position.
- The appendix page numbers are notional (the codex is counted as 80 leaves) until the codex is drawn as pages.
