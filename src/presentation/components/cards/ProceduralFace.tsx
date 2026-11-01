import type { CardDefinition } from "@/domain/deck/types";
import { useSvgId } from "./CardFrame";
import { CARD_VIEWBOX } from "./cardPalette";
import { INK, Rays, STAMP } from "./inkKit";
import { MajorArt } from "./MajorArt";
import { pipLayoutFor, rankLabel, toRoman } from "./pipLayout";
import { CourtMark, SuitGlyph } from "./SuitGlyph";

const CX = CARD_VIEWBOX.width / 2;
const SERIF = "'Iowan Old Style', 'Palatino Linotype', 'Noto Serif TC', serif";

function majorNumeral(card: CardDefinition): number {
  return Number(card.metadata?.numeral ?? card.sequence);
}

function headerLabel(card: CardDefinition): string {
  if (card.category === "major") {
    const numeral = majorNumeral(card);
    return numeral === 0 ? "0" : toRoman(numeral);
  }
  return card.rank ? rankLabel(card.rank) : String(card.sequence);
}

/** A printer's rule: diamond-tipped line used above and below the art. */
function Rule({ y }: Readonly<{ y: number }>) {
  return (
    <g fill={INK} stroke={INK}>
      <line x1={42} y1={y} x2={158} y2={y} strokeWidth={0.7} />
      <path
        d={`M${CX - 5} ${y} L${CX} ${y - 3} L${CX + 5} ${y} L${CX} ${y + 3} Z`}
        stroke="none"
      />
      <circle cx={40} cy={y} r={1.3} stroke="none" />
      <circle cx={160} cy={y} r={1.3} stroke="none" />
    </g>
  );
}

function Corner({ transform }: Readonly<{ transform?: string }>) {
  return (
    <g transform={transform} fill={INK} stroke={INK}>
      <path d="M18 34 V18 H34" fill="none" strokeWidth={1.1} />
      <path d="M22 22 l5 0 l-5 5 z" stroke="none" />
      <circle cx={18} cy={38} r={1} stroke="none" />
      <circle cx={38} cy={18} r={1} stroke="none" />
    </g>
  );
}

function MinorArt({ card }: Readonly<{ card: CardDefinition }>) {
  if (!card.suit || !card.rank) return null;
  const layout = pipLayoutFor(card.rank);

  if (!layout) {
    return (
      <g>
        <CourtMark rank={card.rank} x={CX} y={94} />
        <SuitGlyph suit={card.suit} x={CX} y={152} scale={1.9} />
      </g>
    );
  }

  return (
    <g>
      {card.rank === "ace" && (
        <g stroke={INK} fill="none">
          <circle cx={CX} cy={138} r={50} strokeWidth={0.8} />
          <Rays
            cx={CX}
            cy={138}
            from={54}
            to={64}
            count={36}
            alternate={6}
            width={0.7}
          />
        </g>
      )}
      {layout.positions.map((position, index) => (
        <SuitGlyph
          key={index}
          suit={card.suit!}
          x={position.x}
          y={position.y}
          scale={layout.scale}
        />
      ))}
    </g>
  );
}

/**
 * Kraft-paper face printed in dark ink with an oxblood stamp. The paper
 * texture itself is a CSS background on the card (see `.card-artwork--kraft`)
 * so it is rasterised once rather than per SVG.
 */
export function ProceduralFace({
  card,
  compact = false,
}: Readonly<{ card: CardDefinition; compact?: boolean }>) {
  const edge = useSvgId("kraft-edge");
  const { width: w, height: h } = CARD_VIEWBOX;

  return (
    <svg
      className="procedural-svg procedural-svg--face"
      viewBox={`0 0 ${w} ${h}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${card.name.zhHant}程序式牌面`}
    >
      <defs>
        <radialGradient id={edge} cx="0.5" cy="0.5" r="0.72">
          <stop offset="0.62" stopColor="#5a3416" stopOpacity={0} />
          <stop offset="1" stopColor="#5a3416" stopOpacity={0.34} />
        </radialGradient>
      </defs>
      <rect width={w} height={h} rx={12} fill={`url(#${edge})`} />
      <rect
        x={9}
        y={9}
        width={w - 18}
        height={h - 18}
        rx={6}
        fill="none"
        stroke={INK}
        strokeWidth={1.6}
      />
      <rect
        x={13.5}
        y={13.5}
        width={w - 27}
        height={h - 27}
        rx={4}
        fill="none"
        stroke={INK}
        strokeWidth={0.6}
      />
      <Corner />
      <Corner transform={`translate(${w} 0) scale(-1 1)`} />
      <Corner transform={`translate(0 ${h}) scale(1 -1)`} />
      <Corner transform={`translate(${w} ${h}) scale(-1 -1)`} />

      <text
        x={CX}
        y={36}
        textAnchor="middle"
        dominantBaseline="central"
        fill={STAMP}
        fontSize={13}
        fontWeight={700}
        letterSpacing={2.6}
        fontFamily={SERIF}
      >
        {headerLabel(card)}
      </text>
      <Rule y={50} />

      {card.category === "major" ? (
        <MajorArt numeral={majorNumeral(card)} />
      ) : (
        <MinorArt card={card} />
      )}

      <Rule y={232} />
      <text
        x={CX}
        y={compact ? 258 : 252}
        textAnchor="middle"
        dominantBaseline="central"
        fill={INK}
        fontSize={compact ? 20 : 17}
        fontWeight={600}
        letterSpacing={2.4}
        fontFamily={SERIF}
      >
        {card.name.zhHant}
      </text>
      {!compact && (
        <text
          x={CX}
          y={270}
          textAnchor="middle"
          dominantBaseline="central"
          fill={INK}
          fillOpacity={0.72}
          fontSize={6.6}
          letterSpacing={1.8}
          fontFamily="system-ui, sans-serif"
        >
          {card.name.en.toUpperCase()}
        </text>
      )}
    </svg>
  );
}
