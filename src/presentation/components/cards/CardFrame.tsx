import { useId } from "react";
import { CARD_VIEWBOX, cardPalette as c } from "./cardPalette";

/** React ids contain characters that are awkward inside `url(#…)`. */
export function useSvgId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export function FoilGradient({ id }: Readonly<{ id: string }>) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={c.foilLight} />
      <stop offset="0.28" stopColor={c.foil} />
      <stop offset="0.5" stopColor={c.foilDeep} />
      <stop offset="0.72" stopColor={c.foil} />
      <stop offset="1" stopColor={c.foilMid} />
    </linearGradient>
  );
}

function Corner({
  transform,
  foil,
}: Readonly<{ transform: string; foil: string }>) {
  return (
    <g transform={transform} fill="none" stroke={foil} strokeLinecap="round">
      <path d="M14 30 C14 20 20 14 30 14" strokeWidth={1.2} />
      <path d="M14 44 C14 26 26 14 44 14" strokeWidth={0.6} opacity={0.7} />
      <path d="M22 22 L28 28" strokeWidth={0.8} />
      <circle cx={21} cy={21} r={2.2} fill={foil} stroke="none" />
      <circle cx={33} cy={14} r={1} fill={foil} stroke="none" />
      <circle cx={14} cy={33} r={1} fill={foil} stroke="none" />
    </g>
  );
}

/**
 * Double gilt border with filigree corners. Symmetric under a half turn so a
 * reversed card keeps the same silhouette.
 */
export function CardFrame({ foil }: Readonly<{ foil: string }>) {
  const { width: w, height: h } = CARD_VIEWBOX;
  return (
    <g>
      <rect
        x={6}
        y={6}
        width={w - 12}
        height={h - 12}
        rx={9}
        fill="none"
        stroke={foil}
        strokeWidth={2.4}
      />
      <rect
        x={11.5}
        y={11.5}
        width={w - 23}
        height={h - 23}
        rx={6}
        fill="none"
        stroke={foil}
        strokeWidth={0.7}
        opacity={0.8}
      />
      <Corner foil={foil} transform="" />
      <Corner foil={foil} transform={`translate(${w} 0) scale(-1 1)`} />
      <Corner foil={foil} transform={`translate(0 ${h}) scale(1 -1)`} />
      <Corner foil={foil} transform={`translate(${w} ${h}) scale(-1 -1)`} />
    </g>
  );
}
