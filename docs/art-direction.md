# Art direction and asset register

## Foundation palette

| Token       | Value     | Purpose                       |
| ----------- | --------- | ----------------------------- |
| Midnight    | `#080914` | Primary background            |
| Gilded gold | `#E6C57A` | Emphasis, borders, focus cues |
| Moon white  | `#F4EDE0` | Primary readable text         |
| Star purple | `#7254A3` | Atmospheric depth             |

The visual language combines midnight lacquer, restrained gold foil, moonlit typography, radial celestial geometry, and soft purple atmosphere. Decorative effects must never reduce form readability or obscure focus.

## Retired placeholders

The Phase 00 brand mark and stardust field were removed in Phase 09, when the
home page became the book. No third-party tarot illustration is included.

## Phase 01 procedural card system

The 78 built-in card definitions render with repository-authored CSS frames,
geometric orbits, typographic symbols, and suit marks. This system is a
recognizable engineering and interaction placeholder, not a claim of 78
finished card illustrations. The test deck (`src/domain/deck/testing`, used
by tests only and never shown on the site) contains one intentional
`missing://` reference to verify the explicit artwork fallback.

## Phase 02 procedural SVG card art

Phase 02 replaces the CSS frames with repository-authored inline SVG, drawn in
code under `src/presentation/components/cards/`:

- **Back**: an eight-point star inside a 32-ray sunburst, a ring of twelve
  points, mirrored finials and a deterministic star field. It is symmetric
  under a half turn, so a reversed back looks identical.
- **Face**: kraft paper printed in dark-brown ink (`#2a1b10`) with an oxblood
  stamp red (`#9b3322`) for numerals and accents. The paper is a CSS
  background (`.card-artwork--kraft`) built from two SVG noise tiles, for
  speckle and faint fibres, over a warm gradient. It is rasterised once and
  shared by every card. The SVG adds a printed double rule, corner brackets,
  diamond-tipped rules and a darkened edge.
  - Major arcana: one original line illustration per card
    (`MajorArt.tsx`), built around its traditional emblem (the Fool's cliff
    and white rose, the High Priestess's pillars B and J, the Tower struck by
    lightning, and so on), with woodcut-style hatching.
  - Numbered minor cards lay out one ink suit emblem per pip (wand, chalice,
    sword, pentacle); aces add a rayed ring; court cards pair a large emblem
    with a star, helm or crown mark.

All colours in these SVGs are literal values (`cardPalette.ts`, `inkKit.tsx`),
because the card back is rasterised for the burn reveal, where CSS variables do not
resolve. These remain procedural identification art, not finished
illustrations; no third-party artwork, font glyph art or traced imagery is used.

| Asset                         | Author                                      | License / source                           | Status                  |
| ----------------------------- | ------------------------------------------- | ------------------------------------------ | ----------------------- |
| Procedural SVG card back/face | Tarot Atelier project, authored in code     | Original project asset; no external source | Phase 02 procedural art |
| Burn reveal (canvas)          | Tarot Atelier project, generated at runtime | Original; no texture files                 | Phase 02 effect         |

## Motion

Motion begins subtly and must respect `prefers-reduced-motion`. Scene effects are decorative, skip-safe, pointer-inert, and separable from future asynchronous interpretation tasks.

## Phase 09 the magic book

The site opens as an old spell book lying on a candle-lit desk. The light
comes from beyond the top-left corner (the side a right hand writes away
from), so every shadow falls softly to the lower right. The candle itself is
never drawn.

The painted surfaces are SVG under `art/book/`, published as WebP under
`public/book/` by `pnpm book-art`; the site never runs their SVG filters, so
pages turn without repainting them.

| Asset                                              | Author                                                             | License / source                                         | Status                                          |
| -------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- | ----------------------------------------------- |
| `art/book/cover.svg`                               | Tarot Atelier project, drawn in code for this repository           | Original project asset                                   | Phase 09 art                                    |
| Milespapa mark on the cover                        | Milespapa (the site owner); traced from the owner's own logo image | Owner's brand, used with permission                      | Replace with the original vector when available |
| `art/book/frontispiece.svg`                        | Tarot Atelier project, drawn in code for this repository           | Original project asset                                   | Phase 09 art                                    |
| `art/book/desk-portrait.svg`, `desk-landscape.svg` | Tarot Atelier project, generated in code for this repository       | Original project asset                                   | Phase 09 art                                    |
| Pinyon Script                                      | The PinyonScript Project Authors (Sorkin Type; Nicole Fally)       | SIL Open Font License 1.1, `@fontsource/pinyon-script`   | Phase 09 font                                   |
| IM Fell English                                    | Igino Marini (Google Fonts release)                                | SIL Open Font License 1.1, `@fontsource/im-fell-english` | Phase 09 font                                   |
| 芫荽 Iansui                                        | The Iansui Project Authors (But Ko), from Fontworks Klee One       | SIL Open Font License 1.1, `@fontsource/iansui`          | Phase 09 font                                   |
