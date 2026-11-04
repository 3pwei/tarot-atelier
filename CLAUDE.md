# Tarot Atelier project rules

These rules apply to the whole repository.

## Per-phase workflow

Every phase or change follows the same steps:

1. **Read and sync.** Read this whole file before any change, the engineering principles below in particular, and hold every plan and review to them. Fetch the latest remote state; read the default branch, open pull requests and the current tests.
2. **Branch.** Work from the latest `master` on a `feature/phase-XX-slug` branch (`fix/…` or `chore/…` for work outside a phase). Never push directly to `master`, force-push, or merge a pull request without the owner's explicit approval.
3. **Reconnoitre and propose.** Before writing code, survey the relevant code and send a plan: what will change, open decisions with a recommendation, and how it will be tested. Wait for approval before implementing.
4. **Implement within scope.** Keep to the phase scope. Never present placeholders, mock services or unfinished interactions as production features.
5. **Verify for real.** Run the quality checks below and report only what actually ran and passed.
6. **Deliver.** Open a pull request and leave it open for review.

## Engineering principles

Every change, including scripts, CI and tests, is designed to be **maintainable, extensible and reusable**, and follows **Clean Code**. A plan names how it meets these; a change that does not is not ready.

### Maintainable（可維護）

- One source of truth. A rule, constant, path or product decision lives in exactly one place and everything else reads it. Duplicated knowledge is a defect even when both copies agree today.
- Names say what something is or does in the domain's words (`position`, `jumper`, `slug`), not how it is implemented. No unexplained abbreviations.
- Small units. A function does one thing at one level of abstraction; a module has one reason to change. Split a component, hook or file when it starts doing two jobs.
- Make invalid states unrepresentable: validate at boundaries and keep data immutable. In domain and application code, return explicit result types for expected failures instead of throwing.
- Comments explain why, never what. Delete dead code instead of leaving it unused or commented out.

### Extensible（可擴充）

- Depend on abstractions at the edges. New providers, decks, storage or hosts plug in behind an existing port or registry without editing their callers.
- Configuration over modification. Values that may differ between environments or games are configuration, read from one place, not literals scattered through code.
- Version every persisted or exchanged format and migrate explicitly.
- Build only what the current phase needs. Leave a clear extension point instead of speculative features.

### Reusable（可重複使用）

- Keep pure logic separate from I/O, frameworks and environment, so it can be called from the UI, a script or a test alike.
- Pass collaborators in (randomness, clocks, storage, command runners) instead of reaching for globals, so units work in any context.
- Shared helpers belong to the layer that owns the concept; never copy a helper to a second place.

### Clean Code

- Readable first: straightforward control flow, early returns, no clever tricks, no hidden side effects.
- No `any`, no magic values, no boolean flag parameters that switch behaviour; use named options or separate functions.
- Every behaviour has a test that names it. Tests are deterministic, independent and fast; inject what is slow or random.
- Leave code cleaner than you found it, within the scope of the change; record larger clean-ups as follow-ups instead of mixing them in.
- Errors tell the reader what went wrong and how to fix it.

## Architecture

- Dependencies point inward: `presentation` and `infrastructure` may depend on `application` and `domain`; `application` may depend on `domain`; `domain` stays framework-free. ESLint enforces this.
- External APIs, persistence, scene registries, deck registries and interpretation providers sit behind application ports.
- Zustand is only for client interaction state. Domain state and business rules stay in pure TypeScript.
- Use React DOM and CSS 3D transforms for accessible interaction. GSAP owns timelines. Three/R3F is reserved for isolated, lazy-loaded visual effects with a reduced-motion fallback.
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

Use Conventional Commits. Every pull request documents changes, decisions, how it meets the engineering principles, visual evidence, commands actually run, risks and rollback steps.
