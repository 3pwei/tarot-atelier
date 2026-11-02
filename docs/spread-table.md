# Phase 03 spread table

## Model

`domain/spread` is pure TypeScript.

- `Spread`: `id`, an optional `templateId` (the template it came from, dropped once positions are added or removed), an optional `mainQuestion` (0–300 characters) and its `positions`, always sorted by `index`.
- `SpreadPosition`: `id`, `index`, `question`, `x`, `y`, `rotation` and an optional `drawResult`.
  - `index` runs exactly `1..n` with no gaps or repeats.
  - `x`/`y` are table-relative centre coordinates in `[0, 1]`, independent of screen size and zoom.
  - `rotation` is whole degrees, normalised to `[0, 360)`.
  - `drawResult` is the Phase 02 `DrawResult`: a primary card plus an optional jumper. Both belong to the same position and number.

Character counts use code points (`Array.from`), so CJK characters and emoji count as one each.

## Rules

| Rule                    | Behaviour                                                                                                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Position count          | 1–12. Adding a 13th is refused and explained.                                                                                                                                                                                    |
| Questions               | Every position needs its own 1–300 character question (after trimming). Shuffling and drawing stay disabled until all are set.                                                                                                   |
| Main question           | Optional, up to 300 characters.                                                                                                                                                                                                  |
| Adding                  | New positions are numbered after the last one and placed on the nearest free spot to the visible table centre.                                                                                                                   |
| Removing                | The gap closes in the existing order (`3, 4, 5 → 2, 3, 4`) and the change is announced. Positions that hold cards cannot be removed.                                                                                             |
| Reordering              | Moving a position to number _k_ shifts the others to keep `1..n`.                                                                                                                                                                |
| Dealing                 | One click on the deck deals every empty position at once, from one shuffled pile. Each draw has its own jumper chance. The person then reveals the cards one by one, in any order. Positions added later are dealt the same way. |
| Moving a drawn position | Allowed. The cards travel with it; nothing is redrawn.                                                                                                                                                                           |
| Applying a template     | Only before the first draw. Afterwards use 「清除本次牌陣」. Saving and deleting templates is always allowed.                                                                                                                    |

The draw machine gained `drawSeries(count)`, which deals several draws from one shuffle in a single step, and `continueDrawing()` (`revealed → ready`) for dealing positions added later. `alreadyDrawnCardIds` and `previousDrawCount` rebuild the pile after a reload without the cards already on the table and without reusing instance IDs.

## Template library

Templates store a layout: each position's question, coordinates and rotation. They never store cards or the main question.

| Built-in | Positions | Layout                                   |
| -------- | --------- | ---------------------------------------- |
| 經典三張 | 3         | Past, present, future in a row           |
| 五張十字 | 5         | Centre, then left, right, top and bottom |
| 圓環     | 8         | Clockwise from twelve o'clock            |

- 「儲存目前牌陣」 saves the table under a 1–30 character name. Saving again under the same name updates that template. The library holds up to 30.
- Every template can be deleted, built-ins included, after an inline confirmation. Deleting never changes the table.
- 「還原預設範例」 appears when a built-in is missing and puts the missing ones back first, keeping saved ones.
- 「空白牌桌」 starts from an empty table. A fresh reading and 「清除本次牌陣」 start from the first template in the library, or a blank table when the library is empty.

The circle uses eight positions because twelve cards on a 3:2 table overlap at readable sizes; blank and saved spreads can still reach twelve.

## Table and interaction

- The table has a fixed 3:2 aspect ratio. Positions map onto an inner area inset by half a card, so a card at `x = 0` or `y = 1` stays fully on the table. Card width is 11% of the table width (container query units).
- **Pointer and touch**: drag a position. A press becomes a drag after 5 px; a drag never also ignites a card or toggles selection.
- **Keyboard**: each position has a numbered handle. Arrow keys or the numeric keypad (8/2/4/6 and diagonals) move 1% of the table, Shift moves 5%, `[` and `]` rotate by 15°, and Enter opens the editor.
- **Rotate button**: the selected position shows a turning-arrow button that rotates it 45° clockwise per tap. The editor has ↺ 45° and ↻ 45° buttons plus an exact degree field. The editor also takes exact horizontal and vertical values (0–100) and degrees.
- **Zoom and pan**: ×1–×2.5 via buttons, ctrl/⌘ + wheel or trackpad pinch, and two-finger pinch on touch. Dragging the empty table pans when zoomed. Zoom is view state only; stored coordinates never change. Until the table is zoomed, vertical swipes on its background still scroll the page.
- **Flight**: dealt cards leave the deck 180 ms apart in number order. The draw timeline plans each curve in screen space and converts it into the landing slot's rotated, zoomed frame (`toLocalOffset`), so a card lands exactly on its position at any rotation or zoom.
- The reading list below the table shows every position in number order with its question and result. It is also the accessible summary of the table.

## Persistence

Both stores go through the `TextStorage` port (`SpreadSessionStorage`, `SpreadTemplateStorage`), implemented by `infrastructure/persistence/LocalStorageTextStorage`.

The current reading lives under `tarot-atelier:spread-session` (`application/use-cases/spreadSession.ts`):

```json
{
  "schemaVersion": 2,
  "savedAt": "2026-11-02T08:00:00.000Z",
  "session": {
    "deckId": "atelier-standard-tarot",
    "spread": {
      "id": "…",
      "templateId": "three-card",
      "mainQuestion": "",
      "positions": ["…"]
    },
    "revealedInstanceIds": ["…"]
  }
}
```

- **Writes** are serialised by the domain and parsed back before they are stored, so an invalid session is never written. Saves are coalesced (250 ms) and flushed on `pagehide`.
- **Reads** validate every field, the `1..n` numbering, coordinate ranges, question lengths, duplicate cards and instance IDs, and then cross-check card IDs and orientations against the deck.
- **Migration**: `parseSpreadSnapshot` upgrades older versions one step at a time through `SPREAD_SNAPSHOT_MIGRATIONS`. v1 → v2 turns the fixed `presetId` into `templateId` (`"custom"` becomes no template). Newer, unversioned or broken data is discarded and removed.
- **Failure**: the table always renders. Unreadable data leads to a fresh three-card spread and the notice 「本機儲存的牌陣無法讀取，已重新開始。」. A blocked or full storage is reported once.
- 「清除本次牌陣」 asks for confirmation, then removes the stored session and starts a fresh spread with a full pile.

The template library lives under `tarot-atelier:spread-templates` (`application/use-cases/templateLibrary.ts`) as `{ "schemaVersion": 1, "templates": [...] }`. Nothing stored means the built-ins. It is written only after the person changes the library, so an emptied library stays empty. Unreadable data is removed and the built-ins return with a notice.

Each browser keeps its own reading and library, so people sharing a link never see each other's data. Questions are stored only in that browser's `localStorage`. Nothing is sent to a server or logged.
