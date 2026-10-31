# ADR 0001: Layered foundation and isolated effects

- Status: Accepted
- Date: 2026-11-01

## Context

Tarot Atelier needs rich presentation without coupling business rules to UI frameworks or rendering engines.

## Decision

Use inward-facing `domain`, `application`, `infrastructure`, and `presentation` layers. Keep Next.js routing thin. Use DOM/CSS for accessible interaction, GSAP for lazy timelines, and Three/R3F only for isolated decorative effects with static fallback.

## Consequences

Presentation code can change independently from deck and reading rules. Boundary linting adds a small configuration cost but catches architectural drift before review. Decorative 3D may be removed without affecting controls or domain behavior.
