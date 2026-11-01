import { CardFrame, FoilGradient, useSvgId } from "./CardFrame";
import { CARD_VIEWBOX, cardPalette as c } from "./cardPalette";

const CX = CARD_VIEWBOX.width / 2;
const CY = CARD_VIEWBOX.height / 2;

function polar(radius: number, angle: number): [number, number] {
  return [CX + Math.cos(angle) * radius, CY + Math.sin(angle) * radius];
}

function starPoints(points: number, outer: number, inner: number): string {
  return Array.from({ length: points * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const [x, y] = polar(radius, -Math.PI / 2 + (index * Math.PI) / points);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

const RAYS = Array.from({ length: 32 }, (_, index) => {
  const angle = (index * Math.PI) / 16;
  const outer = index % 2 === 0 ? 80 : 70;
  const [x1, y1] = polar(60, angle);
  const [x2, y2] = polar(outer, angle);
  return { x1, y1, x2, y2, long: index % 2 === 0 };
});

const RING_DOTS = Array.from({ length: 12 }, (_, index) =>
  polar(47, (index * Math.PI) / 6 + Math.PI / 12),
);

/** Deterministic star field, mirrored by a half turn to stay symmetric. */
const STARS = (() => {
  const half: { x: number; y: number; r: number }[] = [];
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  while (half.length < 26) {
    const x = 22 + next() * 156;
    const y = 22 + next() * 128;
    if (Math.hypot(x - CX, y - CY) < 92) continue;
    half.push({ x, y, r: 0.4 + next() * 0.9 });
  }
  return [
    ...half,
    ...half.map((star) => ({
      x: CARD_VIEWBOX.width - star.x,
      y: CARD_VIEWBOX.height - star.y,
      r: star.r,
    })),
  ];
})();

function Finial({ y, flip }: Readonly<{ y: number; flip: boolean }>) {
  return (
    <g transform={`translate(${CX} ${y}) scale(1 ${flip ? -1 : 1})`}>
      <path d="M-30 0 H-9 M9 0 H30" strokeWidth={0.7} fill="none" />
      <path d="M0 -8 L5 0 L0 8 L-5 0 Z" strokeWidth={0.9} fill="none" />
      <circle cx={0} cy={0} r={1.6} stroke="none" />
      <circle cx={-34} cy={0} r={1.1} stroke="none" />
      <circle cx={34} cy={0} r={1.1} stroke="none" />
      <path d="M0 14 V24" strokeWidth={0.6} />
    </g>
  );
}

export function ProceduralBack({
  label = "星盤牌背",
}: Readonly<{ label?: string }>) {
  const foil = useSvgId("foil");
  const field = useSvgId("field");
  const halo = useSvgId("halo");
  const { width: w, height: h } = CARD_VIEWBOX;
  const foilFill = `url(#${foil})`;

  return (
    <svg
      className="procedural-svg procedural-svg--back"
      viewBox={`0 0 ${w} ${h}`}
      xmlns="http://www.w3.org/2000/svg"
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true })}
      data-card-back-svg
    >
      <defs>
        <FoilGradient id={foil} />
        <radialGradient id={field} cx="0.5" cy="0.5" r="0.75">
          <stop offset="0" stopColor={c.plum} />
          <stop offset="0.55" stopColor={c.night} />
          <stop offset="1" stopColor={c.ink} />
        </radialGradient>
        <radialGradient id={halo} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={c.foil} stopOpacity={0.32} />
          <stop offset="1" stopColor={c.foil} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={w} height={h} rx={12} fill={`url(#${field})`} />
      <g fill={c.foilLight}>
        {STARS.map((star, index) => (
          <circle
            key={index}
            cx={star.x.toFixed(2)}
            cy={star.y.toFixed(2)}
            r={star.r.toFixed(2)}
            opacity={0.35 + star.r * 0.4}
          />
        ))}
      </g>
      <circle cx={CX} cy={CY} r={86} fill={`url(#${halo})`} />
      <g stroke={foilFill} fill={foilFill}>
        {RAYS.map((ray, index) => (
          <line
            key={index}
            x1={ray.x1.toFixed(2)}
            y1={ray.y1.toFixed(2)}
            x2={ray.x2.toFixed(2)}
            y2={ray.y2.toFixed(2)}
            strokeWidth={ray.long ? 1.1 : 0.6}
          />
        ))}
        <circle cx={CX} cy={CY} r={56} fill="none" strokeWidth={1.4} />
        <circle cx={CX} cy={CY} r={52} fill="none" strokeWidth={0.5} />
        <circle cx={CX} cy={CY} r={38} fill="none" strokeWidth={0.8} />
        {RING_DOTS.map(([x, y], index) => (
          <circle
            key={index}
            cx={x.toFixed(2)}
            cy={y.toFixed(2)}
            r={1.5}
            stroke="none"
          />
        ))}
        <polygon points={starPoints(8, 30, 11)} fill="none" strokeWidth={1} />
        <polygon points={starPoints(4, 22, 6)} stroke="none" />
        <circle cx={CX} cy={CY} r={4.2} fill={c.night} strokeWidth={1.2} />
        <Finial y={42} flip={false} />
        <Finial y={h - 42} flip />
      </g>
      <CardFrame foil={foilFill} />
    </svg>
  );
}
