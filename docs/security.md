# Security baseline

- AI readings (Phase 05) go through this site's own Pages Function to Cloudflare Workers AI, on the free allocation only. No analytics, upload or paid service is connected.
- What leaves the device for an AI reading: the deck, the drawn cards and the main and position questions. The panel says so before generating. The endpoint stores none of it; D1 keeps only daily counters keyed by a salted hash of the visitor's address and the day, deleted after two days.
- Server logs carry outcomes, configuration problems and token counts, never questions or reading text. Tests assert this.
- The endpoint refuses other origins, bodies over 16 KB, unknown decks and cards, and every answer that fails the result schema, does not answer the request or states certainty.
- The prompt keeps player text out of the instructions and passes it as JSON data, so a question cannot change the model's rules or the output format.
- Future API credentials belong only in server environment variables and must never use a `NEXT_PUBLIC_` prefix.
- Do not log full tarot questions, secrets, or private uploaded content.
- Treat uploads as hostile: verify signature/MIME, dimensions, size, count, and schema; never execute content or inject user text as HTML.
- Keep interpretation requests and animation timelines independent so failure or cancellation preserves the spread.
- Provide explicit empty, loading, retry, network failure, and no-key demo states in the phase that introduces each capability.
- Validate reading requests and results with the shared Zod schemas at every boundary; refuse unknown fields so a request can never carry a key or extra data.
- AI readings call the project's own endpoint, never a vendor from the browser. Limits: 5 per visitor and 150 for the site per day, plus the provider's free allocation. If the Cloudflare account ever moves to a paid plan, the site limit is what caps spending.
- Tarot interpretation is for entertainment and reflection. High-risk medical, legal, and financial requests require uncertainty and professional-help guidance, never deterministic advice.
