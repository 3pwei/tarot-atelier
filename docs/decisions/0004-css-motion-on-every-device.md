# ADR 0004: Lightweight CSS motion on every device

- Status: Accepted
- Date: 2026-11-16
- Supersedes: the GSAP and Three/R3F parts of [ADR 0001](0001-layered-foundation.md)

## Context

Players reported the site running roughly on many computers and on budget phones. Measured on the production build with a throttled CPU (`pnpm perf`), the main costs were a full-screen WebGL ring behind the hero that rendered every frame, GSAP timelines that moved cards from the main thread, and a burn reveal computed at the screen's full pixel density. Choosing the motion level by CPU core count did not help: budget phones report eight cores and most computers have weak integrated graphics.

## Decision

- Every device gets the same lightweight motion: CSS keyframes on `transform` and `opacity`, which the browser runs on its compositor. Script only computes geometry and timing.
- The hero ring and three.js are removed. GSAP is removed with the last timeline.
- The burn reveal renders one canvas pixel per CSS pixel on every screen.
- `prefers-reduced-motion` still skips transitional motion.
- There is no motion setting for players; the owner chose one level for everyone.

## Consequences

The JavaScript a visitor downloads shrinks by about a megabyte and motion no longer depends on a busy main thread. The deal flight is a three-point arc instead of a continuous curve, and the lift shadow during flight is gone. A future effect, such as picking cards by hand, starts from the same rule and is measured with `pnpm perf` before it ships.
