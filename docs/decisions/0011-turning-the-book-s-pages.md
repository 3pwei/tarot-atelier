# ADR 0011: Turning the book's pages

- Status: Accepted
- Date: 2026-11-25
- Builds on: [ADR 0010](0010-the-site-is-a-book.md), [ADR 0004](0004-css-motion-on-every-device.md)

## Context

ADR 0010 made the site a book whose pages simply faded into one another. The owner approved, on prototypes, how the pages should move: the cover opening with a golden light, a page curling from its corner when turned, many pages riffling past when the reader jumps far, and a paper sound. A drag-to-turn gesture was prototyped too; the owner asked for it to be dropped, keeping a tap.

## Decision

- **Which turn.** `planTurn` decides from the reading order (cover, frontispiece, contents, then the contents' own order): the cover has its own opening scene; neighbours turn one page; anything further riffles; the frontispiece and the contents do not turn on a wide screen, where they face each other. Only the reader's own moves turn the page (a tap, a key, the browser's back button); a link opened or a lost chapter replaced simply appears.
- **One page: a diagonal curl, as CSS keyframes.** `curl.ts` computes the fold for a page's size once, as keyframes for eleven layers (the part lying flat and the part folded over, each a window and the page turned back inside it; light and shade along the fold on each part and on the page below; the paper's edge). Only `transform` and `opacity` change, so the motion stays within ADR 0004; script computes geometry only. The keyframes for the current page size are in the stylesheet before any turn, so a turn never waits on parsing them.
- **The leaf is a still copy.** It shows the page leaving (forward) or arriving (back) as a static face: the front matter whole, a chapter or appendix by its heading only, never a second live table. Its back is the paper with the front's ink faintly showing through. It is `inert` and `aria-hidden`, and the real page underneath has the focus once it lands.
- **A chapter's table waits for the leaf.** While a leaf turns, a chapter, the codex or the records lie underneath as their heading; the live page mounts once the leaf has landed. Mounting the table is the costliest frame of a turn (it was already the costliest frame of a fade), so it no longer happens while the leaf moves.
- **Many pages: fake them.** A riffle turns the real leaf, then seven opaque blank sheets one after another, each a single `rotateY`. Nothing is ever see-through, and the cost does not grow with the number of pages skipped.
- **Opening.** The scene starts exactly where the cover page laid the closed book out (measured as it is tapped), so nothing jumps: light leaks from the pages, the cover swings open, six blank leaves riffle past, and the camera leans in. On a phone it stops with the frontispiece edge to edge; on a wide screen the open book stays on the desk. The real pages wait underneath; the scene fades off them.
- **Sound is off by default.** A `PageSound` port, implemented with Web Audio in infrastructure (synthesised noise, no audio files), plays a rustle for a turn and chopped flicks for a riffle. The switch is on the contents page; the choice is stored versioned under `tarot-atelier:sound`.
- **Less motion.** With `prefers-reduced-motion`, nothing turns or opens: pages swap with a 150 ms fade.

## Measurements

`pnpm perf` adds `book-opening`, `page-turn` and `page-riffle`. Measured with the CPU throttled 4× in a container whose Chrome composites in software (no GPU), so these are a floor rather than what a phone shows:

|                       | Phone 375          | Desktop 1280       |
| --------------------- | ------------------ | ------------------ |
| Opening               | 38 fps, p95 83 ms  | 30 fps, p95 67 ms  |
| One page turned       | 42 fps, p95 33 ms  | 24 fps, p95 200 ms |
| Riffle (seven sheets) | 22 fps, p95 183 ms | 19 fps, p95 283 ms |

The other scenarios (home, vortex, wheel, burn, table) are unchanged from the book shell. Three choices got the opening there from a worst frame near 900 ms: the camera is inverted (the book is laid out at its final size and starts scaled down, so nothing is rasterised larger than the screen), the desk and the glow stay outside the camera, and each leaf is only visible during its own part of the riffle, with blank sheets painted on one face. A turn's first frame builds the leaf; a curl in the same frames as a table mounting was worse, hence the table waiting for the leaf.

## Consequences

- Turns take 0.5 s (one page), 0.9 s (riffle) and 2 s (opening); E2E waits for the new page as before.
- The leaf's heading face means a chapter's back shows only its heading as it turns.
- Follow-up: a lighter desktop leaf and riffle (smaller windows, fewer sheets) if they are felt to stutter on real machines with a GPU.
