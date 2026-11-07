# 0002: Pre-written readings first, server boundary as a shared contract

- **Status:** accepted (Phase 04, 2026-11-07)

## Context

Phase 04 adds readings. The site is a static export served by Cloudflare Pages, so there is no server to keep an API key. A live LLM costs money for every reading and needs abuse limits. The owner also wants every reading to work with no credentials.

## Decision

1. **Readings come from pre-written content in Phase 04.** The content is versioned JSON in the repository and composed in the browser (plan C):
   - The 22 major arcana are fully written for each of the six tones.
   - The 56 minor arcana have core content that tone templates voice.

   It costs nothing per reading, cannot be abused into a bill and works offline. The UI labels it 「範例解牌，不是 AI」.

2. **The server boundary is a shared contract, not a route yet.** The Zod request and result schemas in `application/reading/readingSchemas.ts` are the boundary. The browser validates with them before calling a provider and after it answers, and a future server will use the same schemas. No API route is added, because `output: "export"` cannot serve one.
3. **Providers sit behind the `ReadingProvider` port**, which names no vendor and carries no key. Live AI later is one more implementation with `source: "ai"`.
4. **Readings stay in memory.** They are not part of the persisted spread snapshot, which stays at version 2.

## Consequences

- No reading leaves the device, and nothing is logged.
- Adding AI later needs:
  - a server, such as a Cloudflare Pages Function or Worker, that holds the key;
  - per-user and daily limits plus a provider budget cap;
  - a privacy notice for questions sent to a third party.

  The panel, requester and schemas stay as they are.

- Content changes are data changes: tests check coverage, lengths, placeholders and forbidden phrases, so editing a JSON file cannot silently break readings.
- Pre-written text links to the player's question through templates rather than reading it. That is a deliberate limit of this phase, stated in the UI.
