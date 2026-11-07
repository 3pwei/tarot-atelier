# Security baseline

- No external AI, database, analytics, upload, or paid service is connected. Readings in Phase 04 are composed in the browser from pre-written content; no question or reading leaves the device.
- Future API credentials belong only in server environment variables and must never use a `NEXT_PUBLIC_` prefix.
- Do not log full tarot questions, secrets, or private uploaded content.
- Treat uploads as hostile: verify signature/MIME, dimensions, size, count, and schema; never execute content or inject user text as HTML.
- Keep interpretation requests and animation timelines independent so failure or cancellation preserves the spread.
- Provide explicit empty, loading, retry, network failure, and no-key demo states in the phase that introduces each capability.
- Validate reading requests and results with the shared Zod schemas at every boundary; refuse unknown fields so a request can never carry a key or extra data.
- An AI reading provider, when added, must call the project's own server, never a vendor from the browser, and must ship with per-user and daily limits and a provider budget cap.
- Tarot interpretation is for entertainment and reflection. High-risk medical, legal, and financial requests require uncertainty and professional-help guidance, never deterministic advice.
