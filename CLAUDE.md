# Tarot Atelier project rules

These rules apply to the whole repository.

## Per-phase workflow

Every phase or change follows the same steps:

1. **Sync.** Fetch the latest remote state. Read the default branch, open pull requests, this file and the current tests.
2. **Branch.** Work from the latest `master` on a `feature/phase-XX-slug` branch (`fix/…` or `chore/…` for work outside a phase). Never push directly to `master`, force-push, or merge a pull request without the owner's explicit approval.
3. **Reconnoitre and propose.** Before writing code, survey the relevant code and send a plan: what will change, open decisions with a recommendation, and how it will be tested. Wait for approval before implementing.
4. **Implement within scope.** Keep to the phase scope. Never present placeholders, mock services or unfinished interactions as production features.
5. **Verify for real.** Run the quality checks below and report only what actually ran and passed.
6. **Deliver.** Open a pull request and leave it open for review.

## Architecture

- Dependencies point inward: `presentation` and `infrastructure` may depend on `application` and `domain`; `application` may depend on `domain`; `domain` stays framework-free. ESLint enforces this.
- External APIs, persistence, scene registries, deck registries and interpretation providers sit behind application ports.
- Zustand is only for client interaction state. Domain state and business rules stay in pure TypeScript.
- Use React DOM and CSS 3D transforms for accessible interaction. GSAP owns timelines. Three/R3F is reserved for isolated, lazy-loaded visual effects with a reduced-motion fallback.
- Avoid `any`, hidden side effects, duplicated rules, large components and magic values.
- The site is a static export (`output: "export"`). Anything that needs a server is a deployment decision, not a code-only change.

## Next.js version

This project runs a recent Next.js whose APIs and conventions may differ from what you remember. Before writing Next.js code, read the matching guide in `node_modules/next/dist/docs/` and heed deprecation notices. `agentRules` is disabled in `next.config.ts`, so `next dev` does not generate an `AGENTS.md`; this section replaces that generated note.

## Quality and safety

- Run `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build` (`pnpm check`) before delivery. Run `pnpm test:e2e` when E2E coverage exists.
- Keep keyboard, touch, pointer, mobile, reduced-motion, loading, empty and error states in scope.
- Keep API keys server-only. Never log full user questions, secrets or uploaded private content.
- Treat every image as untrusted input. Validate real file type, size and count; never execute or inject uploaded content.
- Only use art with recorded authorship and license. Clearly label placeholder art.
- Tarot interpretation is for entertainment and reflection; never make deterministic medical, legal or financial claims.

## Product rules

- The jumper (second card) rate is fixed at the domain `rare` rate. Players cannot change it, and the probability is never shown in the UI.
- Card faces are printed on kraft paper.

## Delivery

Use Conventional Commits. Every pull request documents changes, decisions, visual evidence, commands actually run, risks and rollback steps.
