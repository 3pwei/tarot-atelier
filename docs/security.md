# Security baseline

- No external AI, database, analytics, upload, or paid service is connected in Phase 00.
- Future API credentials belong only in server environment variables and must never use a `NEXT_PUBLIC_` prefix.
- Do not log full tarot questions, secrets, or private uploaded content.
- Treat uploads as hostile: verify signature/MIME, dimensions, size, count, and schema; never execute content or inject user text as HTML.
- Keep interpretation requests and animation timelines independent so failure or cancellation preserves the spread.
- Provide explicit empty, loading, retry, network failure, and no-key demo states in the phase that introduces each capability.
- Tarot interpretation is for entertainment and reflection. High-risk medical, legal, and financial requests require uncertainty and professional-help guidance, never deterministic advice.
