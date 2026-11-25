# ADR 0012: Positions have short names

- Status: Accepted
- Date: 2026-11-25

## Context

The book shows each spread as a chapter with little text. A position's question ("這件事的過去與起因是什麼？") is too long to sit under a card, so the owner asked for short names (過去／現在／未來) that can. The rules were settled with the owner: at most four characters, and a position may have none.

## Decision

- **A name is part of a position.** `SpreadPosition.name` and `TemplatePosition.name` are strings of at most `MAX_POSITION_NAME_LENGTH` (4) characters, on one line; empty means the position is known by its number alone. A name is never needed to draw. Typing keeps inner spaces, and saving trims.
- **Built-ins ship with names.** 經典三張: 過去、現在、未來. 單張指引: 指引. 五張十字: 現況、阻礙、發展、目標、根源. 圓環: 核心、追求、放下、他人、未見、資源、留意、走向.
- **Stored formats move up a version, with explicit upgrades.**
  - Template library v2 → v3. A built-in's position gets its shipped name when its question is still the shipped one in the same place; every other position starts unnamed. The upgrades now run step by step on the stored data before it is read, so a v1 library goes through both.
  - Reading history v1 → v2. Recorded positions gain an empty name; old rounds stay as they were.
  - Reading request and result 1.1.0 → 1.2.0. A request may name each position. 1.1.0 is still read as 1.2.0, because the shapes are otherwise the same and readings kept in the history were written as 1.1.0.
- **Where a name shows.** Under its position on the table, in the position list, in the history, and on the share card and text (also when questions are hidden, as a name is part of the spread, not the player's words). The AI prompt receives it, and the pre-written readings read a position's role from its name first, then from its question.

## Consequences

- Rounds recorded before this have no names; they show numbers as before.
- On a phone, the five-card cross is tight while arranging: the names of positions 1 and 4 touch the positions below them. The book-styled table (next change) lays the chapter out again.
