/**
 * Small drawing helpers for the printed-ink card art. Everything is plain SVG
 * geometry so the illustrations stay crisp at any card size.
 */

export const INK = "#2a1b10";
export const STAMP = "#9b3322";
export const PAPER_LIGHT = "#e6cfa6";

export function polar(cx: number, cy: number, radius: number, angle: number) {
  return [
    cx + Math.cos(angle) * radius,
    cy + Math.sin(angle) * radius,
  ] as const;
}

export function starPoints(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points: number,
  rotation = -Math.PI / 2,
): string {
  return Array.from({ length: points * 2 }, (_, index) => {
    const [x, y] = polar(
      cx,
      cy,
      index % 2 === 0 ? outer : inner,
      rotation + (index * Math.PI) / points,
    );
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export function Rays({
  cx,
  cy,
  from,
  to,
  count,
  alternate = 0,
  width = 1.1,
}: Readonly<{
  cx: number;
  cy: number;
  from: number;
  to: number;
  count: number;
  /** Extra length added to every other ray. */
  alternate?: number;
  width?: number;
}>) {
  return (
    <g strokeWidth={width}>
      {Array.from({ length: count }, (_, index) => {
        const angle = (index * 2 * Math.PI) / count;
        const [x1, y1] = polar(cx, cy, from, angle);
        const [x2, y2] = polar(cx, cy, to + (index % 2 ? 0 : alternate), angle);
        return (
          <line
            key={index}
            x1={x1.toFixed(1)}
            y1={y1.toFixed(1)}
            x2={x2.toFixed(1)}
            y2={y2.toFixed(1)}
          />
        );
      })}
    </g>
  );
}

/** Parallel diagonal strokes inside a rectangle, like woodcut shading. */
export function Hatch({
  x,
  y,
  width,
  height,
  gap = 4,
}: Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
  gap?: number;
}>) {
  const lines = [];
  for (let offset = -height; offset < width; offset += gap) {
    const x1 = Math.max(x, x + offset);
    const y1 = y + Math.max(0, -offset);
    const x2 = Math.min(x + width, x + offset + height);
    const y2 = y + Math.min(height, width - offset);
    lines.push(
      <line
        key={offset}
        x1={x1.toFixed(1)}
        y1={y1.toFixed(1)}
        x2={x2.toFixed(1)}
        y2={y2.toFixed(1)}
      />,
    );
  }
  return <g strokeWidth={0.6}>{lines}</g>;
}

/** Ground line with short tufts, used under standing scenes. */
export function Ground({
  y,
  from = 40,
  to = 160,
}: Readonly<{ y: number; from?: number; to?: number }>) {
  const tufts = [];
  for (let x = from + 6; x < to - 4; x += 13) {
    tufts.push(
      <path
        key={x}
        d={`M${x} ${y} l2 -4 M${x + 3} ${y} l1 -3`}
        strokeWidth={0.7}
      />,
    );
  }
  return (
    <g>
      <line x1={from} y1={y} x2={to} y2={y} strokeWidth={1.2} />
      {tufts}
    </g>
  );
}

export function Moon({
  cx,
  cy,
  r,
  facing = 1,
}: Readonly<{ cx: number; cy: number; r: number; facing?: 1 | -1 }>) {
  // Outer half-circle on the left, shallower inner arc back to the top:
  // a crescent opening to the right, mirrored around cx when facing is -1.
  const inner = r * 1.35;
  return (
    <path
      d={`M${cx} ${cy - r} A${r} ${r} 0 0 0 ${cx} ${cy + r} A${inner} ${inner} 0 0 1 ${cx} ${cy - r} Z`}
      transform={
        facing === -1 ? `translate(${2 * cx} 0) scale(-1 1)` : undefined
      }
      fill={INK}
      stroke="none"
    />
  );
}
