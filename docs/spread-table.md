# Phase 03 spread table

## Model

`domain/spread` is pure TypeScript.

- `Spread`: `id`, `presetId`, an optional `mainQuestion` (0–300 characters) and its `positions`, always sorted by `index`.
- `SpreadPosition`: `id`, `index`, `question`, `x`, `y`, `rotation` and an optional `drawResult`.
  - `index` runs exactly `1..n` with no gaps or repeats.
  - `x`/`y` are table-relative centre coordinates in `[0, 1]`, independent of screen size and zoom.
  - `rotation` is whole degrees, normalised to `[0, 360)`.
  - `drawResult` is the Phase 02 `DrawResult`: a primary card plus an optional jumper. Both belong to the same position and number.

Character counts use code points (`Array.from`), so CJK characters and emoji count as one each.

## Rules

| Rule                    | Behaviour                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Position count          | 1–12. Adding a 13th is refused and explained.                                                                                        |
| Questions               | Every position needs its own 1–300 character question (after trimming). Shuffling and drawing stay disabled until all are set.       |
| Main question           | Optional, up to 300 characters.                                                                                                      |
| Adding                  | New positions are numbered after the last one and placed on the nearest free spot to the visible table centre.                       |
| Removing                | The gap closes in the existing order (`3, 4, 5 → 2, 3, 4`) and the change is announced. Positions that hold cards cannot be removed. |
| Reordering              | Moving a position to number _k_ shifts the others to keep `1..n`.                                                                    |
| Dealing                 | Cards go to the lowest-numbered empty position, from one shuffled pile, without reshuffling between positions.                       |
| Moving a drawn position | Allowed. The cards travel with it; nothing is redrawn.                                                                               |
| Changing preset         | Only before the first draw. Afterwards use 「清除本次牌陣」.                                                                         |

The draw machine gained `continueDrawing()` (`revealed → ready`) so a reader can deal the whole spread from one shuffle. `alreadyDrawnCardIds` and `previousDrawCount` rebuild the pile after a reload without the cards already on the table and without reusing instance IDs.

## Presets

| Preset   | Positions | Layout                                   |
| -------- | --------- | ---------------------------------------- |
| 經典三張 | 3         | Past, present, future in a row           |
| 五張十字 | 5         | Centre, then left, right, top and bottom |
| 圓環     | 8         | Clockwise from twelve o'clock            |
| 完全自訂 | 0         | Empty table                              |

Preset questions are editable starting points. The circle uses eight positions because twelve cards on a 3:2 table overlap at readable sizes; custom spreads can still reach twelve.

## Table and interaction

- The table has a fixed 3:2 aspect ratio. Positions map onto an inner area inset by half a card, so a card at `x = 0` or `y = 1` stays fully on the table. Card width is 11% of the table width (container query units).
- **Pointer and touch**: drag a position. A press becomes a drag after 5 px; a drag never also ignites a card or toggles selection.
- **Keyboard**: each position has a numbered handle. Arrow keys or the numeric keypad (8/2/4/6 and diagonals) move 1% of the table, Shift moves 5%, `[` and `]` rotate by 15°, and Enter opens the editor. The editor also takes exact horizontal and vertical values (0–100) and degrees.
- **Zoom and pan**: ×1–×2.5 via buttons, ctrl/⌘ + wheel or trackpad pinch, and two-finger pinch on touch. Dragging the empty table pans when zoomed. Zoom is view state only; stored coordinates never change. Until the table is zoomed, vertical swipes on its background still scroll the page.
- **Flight**: the draw timeline plans the curve in screen space and converts it into the landing slot's rotated, zoomed frame (`toLocalOffset`), so a card lands exactly on its position at any rotation or zoom.
- The reading list below the table shows every position in number order with its question and result. It is also the accessible summary of the table.

## Persistence

`application/use-cases/spreadSession.ts` reads and writes through the `SpreadSessionStorage` port. `infrastructure/persistence/LocalStorageSpreadSessionStorage` stores one value under `tarot-atelier:spread-session`:

```json
{
  "schemaVersion": 1,
  "savedAt": "2026-11-02T08:00:00.000Z",
  "session": {
    "deckId": "atelier-standard-tarot",
    "spread": {
      "id": "…",
      "presetId": "three-card",
      "mainQuestion": "",
      "positions": ["…"]
    },
    "revealedInstanceIds": ["…"]
  }
}
```

- **Writes** are serialised by the domain and parsed back before they are stored, so an invalid session is never written. Saves are coalesced (250 ms) and flushed on `pagehide`.
- **Reads** validate every field, the `1..n` numbering, coordinate ranges, question lengths, duplicate cards and instance IDs, and then cross-check card IDs and orientations against the deck.
- **Migration**: `parseSpreadSnapshot` upgrades older versions one step at a time through `SPREAD_SNAPSHOT_MIGRATIONS`. Version 1 is the first stored shape, so the registry is empty today; the path is tested with a hypothetical v2/v3. Newer, unversioned or broken data is discarded and removed.
- **Failure**: the table always renders. Unreadable data leads to a fresh three-card spread and the notice 「本機儲存的牌陣無法讀取，已重新開始。」. A blocked or full storage is reported once.
- 「清除本次牌陣」 asks for confirmation, then removes the stored session and starts a fresh three-card spread with a full pile.

Questions are stored only in the browser's `localStorage` on this device. Nothing is sent to a server or logged.
