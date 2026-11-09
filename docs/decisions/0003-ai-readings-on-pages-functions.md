# 0003: AI readings through a Pages Function, falling back to pre-written readings

- **Status:** accepted (Phase 05, 2026-11-07)

## Context

Phase 04 shipped pre-written readings and a `ReadingProvider` port ready for live AI ([ADR 0002](./0002-reading-provider-boundary.md)). The owner chose:

- Cloudflare Workers AI's free allocation (10,000 Neurons a day), with no paid plan;
- automatic fallback to pre-written readings when the allocation is used up or the AI fails;
- one "generate" button, no choice between AI and samples;
- the `@cf/google/gemma-4-26b-a4b-it` model (Qwen3 is scheduled for deprecation on 2026-11-20);
- 5 AI readings per visitor per day and 150 for the whole site.

The site is a static export, so the key-holding code needs a server.

## Decision

1. **A Cloudflare Pages Function serves `POST /tarot/api/v1/readings`.** Its source lives in this repository (`src/server/`). The site scripts bundle it into one file at `functions/tarot/api/v1/readings.js`:
   - `pnpm preview:build` places it at this repository's root, so every PR preview runs the real endpoint;
   - `pnpm release:stage` places it in `milespapa-games`, so it ships with the same deploy PR as the front end, when the owner decides.

   Same origin as the site: no CORS, and the endpoint refuses other origins.

2. **The browser asks AI first and falls back.** `FallbackReadingProvider` wraps `HttpReadingProvider` and `PrewrittenReadingProvider`. A fallback reading is labelled 「範例解牌，不是 AI」 and records why (`fallback.reason`: `visitor-limit`, `daily-limit` or `unavailable`). The reading format moved to 1.1.0 for that field.
3. **The server checks everything before an answer reaches a player** (`serveReading`): the request schema and the deck's cards, the daily limits, then the AI answer's shape, that it answers the request position by position, and the forbidden certainty phrases. Anything that fails becomes a fallback.
4. **The model writes only interpretations.** Card names and symbolism come from the deck and the pre-written content, so it cannot rename or invent a card. Player text goes into the prompt as JSON data, never into the instructions.
5. **Limits live in D1.** One atomic upsert per counter only counts while under the limit. Visitors are a salted SHA-256 of the address and the day, so no address is stored and keys cannot be linked across days. The schema is versioned (`USAGE_MIGRATIONS`) and migrated on cold start.
6. **The model, limits and secrets are Pages settings**, read and defaulted in `src/server/readingEndpointConfig.ts`. Changing the model needs no release.

## Consequences

- milespapa-games now holds a built function as well as static files. Its rules and check need a matching change, made in that repository with the first AI release.
- Previews and production need one-time Cloudflare setup (bindings and a secret). Without it the endpoint answers 503 and every reading falls back; nothing breaks.
- Questions are sent to Cloudflare Workers AI. Nothing is stored, and logs carry only outcomes and token counts. The panel's notice about this was removed by owner decision on 2026-11-09; see `security.md`.
- `next dev` has no Functions. E2E answers the endpoint with a stand-in; unit tests cover the server with a fake model and D1 on Node's SQLite.
