# Tarot Atelier agent instructions

These rules apply to the whole repository.

## Before changing code

1. Fetch the latest remote state and inspect the default branch, open pull requests, repository files, this file, and current tests.
2. Work from the latest `master` on a `feature/phase-XX-slug` branch. Never push directly to `master`, force-push, or merge a pull request without explicit user approval.
3. Preserve the phase scope. Do not present placeholders, mock services, or unfinished interactions as production features.

## Architecture

- Dependencies point inward: `presentation` and `infrastructure` may depend on `application` and `domain`; `application` may depend on `domain`; `domain` must remain framework-free.
- External APIs, persistence, scene registries, deck registries, and interpretation providers must sit behind application ports.
- Zustand is only for client interaction state. Domain state and business rules remain pure TypeScript.
- Use React DOM and CSS 3D transforms for accessible interaction. GSAP owns timelines. Three/R3F is reserved for isolated, lazy-loaded visual effects with a reduced-motion fallback.
- Avoid `any`, hidden side effects, duplicated rules, large components, and magic values.

## Quality and safety

- Run `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build` before delivery. Run `pnpm test:e2e` when E2E coverage exists.
- Keep keyboard, touch, pointer, mobile, reduced-motion, loading, empty, and error states in scope.
- Keep API keys server-only. Never log full user questions, secrets, or uploaded private content.
- Treat every image as untrusted input. Validate real file type, size, and count; never execute or inject uploaded content.
- Only use art with recorded authorship and license. Clearly label placeholder art.
- Tarot interpretation is for entertainment and reflection; never make deterministic medical, legal, or financial claims.

## Delivery

Use Conventional Commits. Every pull request must document changes, decisions, visual evidence, commands actually run, risks, and rollback steps. Leave the pull request open for user review.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
