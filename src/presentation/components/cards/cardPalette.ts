/**
 * Literal colours for the procedural card SVGs. The card back is serialised
 * into an image for the burn reveal, where CSS custom properties do not
 * resolve, so these stay as plain values rather than `var(--…)` references.
 */
export const cardPalette = {
  foilLight: "#fbeab8",
  foil: "#e6c57a",
  foilMid: "#c9a058",
  foilDeep: "#8a6528",
  ink: "#0b0a1a",
  night: "#120f2a",
  dusk: "#2a1a47",
  plum: "#3b2058",
  moon: "#f4ede0",
  mist: "#a99fbe",
} as const;

export const CARD_VIEWBOX = { width: 200, height: 300 } as const;
