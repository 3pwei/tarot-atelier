# ADR 0011: Turning the book's pages

- Status: Accepted
- Date: 2026-11-25
- Builds on: [ADR 0010](0010-the-site-is-a-book.md), [ADR 0004](0004-css-motion-on-every-device.md)

## Context

ADR 0010 made the site a book whose pages simply faded into one another. The owner approved, on prototypes, how the pages should move: the cover opening with a golden light, a page curling from its corner when turned, many pages riffling past when the reader jumps far, and a paper sound. A drag-to-turn gesture was prototyped too; the owner asked for it to be dropped, keeping a tap.

## Decision

- **Which turn.** `planTurn` decides from the reading order (cover, frontispiece, contents, then the contents' own order): the cover has its own opening scene; neighbours turn one page; anything further riffles; the frontispiece and the contents do not turn on a wide screen, where they face each other. Only the reader's own moves turn the page (a tap, a key, the browser's back button); a link opened or a lost chapter replaced simply appears.
- **One page: a diagonal curl, as CSS keyframes.** `curl.ts` computes the fold for a page's size once, as keyframes for eleven layers (the part lying flat and the part folded over, each a window and the page turned back inside it; light and shade along the fold on each part and on the page below; the paper's edge). Only `transform` and `opacity` change, so the motion stays within ADR 0004; script computes geometry only. The keyframes for the current page size are in the stylesheet before any turn, so a turn never waits on parsing them.
- **The leaf is a still copy.** It shows the page leaving (forward) or arriving (back) as a static face, laid out exactly like the live page (padding, the sound switch, the lit entry, the torn edge), so nothing shifts when it gives way. The front matter is drawn whole; a chapter or the appendix is plain blank paper, so its title appears only on the page the turn ends at (the owner's call), and there is never a second live table. On a phone the leaf's back is paper with the front's ink faintly showing through; with facing pages it is the left page it becomes or was. It is `inert` and `aria-hidden`, and the real page has the focus once the turn ends.
- **The page being left is never touched while the leaf turns.** It stays mounted and unrestyled underneath (the book's `data-arrival` changes only when a turn ends), the page the leaf uncovers is printed under the leaf, and the new place mounts once the leaf has landed. The turn is a layer of its own, and the blank paper under and on the leaf is light to paint (no grain, one soft shade). Measured on a desktop in software rendering, the first frame of a turn fell from 284 ms to about 67 ms (117 ms to 50 ms on a phone): swapping and repainting the page underneath, and painting full blank pages, had cost most of it. Mounting a chapter's table is the costliest frame of a turn, so it happens after the leaf has stopped.
- **Facing pages: the leaf lands on the left.** With facing pages the turn may draw across the whole open book, so the leaf ends lying on the left page, not cut off at the spine. Turning back, the page arriving on the left lies under the leaf as it lifts. A chapter or the appendix spans both pages, and keeps the spine's shade down its middle, as two facing pages do.
- **A turn ends when its animations do.** The new place is shown once every animation of the leaf (or of the opening scene) has finished, not after a fixed time: a slow machine builds a desktop leaf's first frame late, and a timer cut the turn off halfway. If the animations never report, the turn lands anyway `TURN_GRACE_MS` (1.5 s) after it should have ended.
- **Many pages: fake them.** A riffle turns the real leaf, then seven opaque blank sheets one after another, each a single `rotateY`. Nothing is ever see-through, and the cost does not grow with the number of pages skipped.
- **Opening.** The scene starts exactly where the cover page laid the closed book out (measured as it is tapped) and ends exactly on the live pages beneath it (measured as it mounts): light leaks from the pages, the cover swings open, one leaf turns over to the frontispiece (the owner first asked for a riffle, then for a single page), and the camera leans in. The book is laid out at its final size and starts squeezed onto the closed one, each axis on its own, as a cover and an open page differ in shape. Its pages are still copies of the live ones, so on a phone it stops with the frontispiece page exactly where the real one lies, and on a wide screen the open book stays on the desk, contents and all; the scene then fades off the real pages.
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

- Turns take 0.5 s (one page), 0.9 s (riffle) and 2 s (opening), or longer when the first frame is late; E2E waits for the new page as before.
- While pages turn, a chapter or the appendix is blank paper; its title and table appear together once the turn ends.
- Follow-up: a lighter desktop leaf and riffle (smaller windows, fewer sheets) if they are felt to stutter on real machines with a GPU.
