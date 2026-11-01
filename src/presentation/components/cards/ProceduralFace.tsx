import type { CardDefinition } from "@/domain/deck/types";
import { CardFrame, FoilGradient, useSvgId } from "./CardFrame";
import { CARD_VIEWBOX, cardPalette as c } from "./cardPalette";
import { pipLayoutFor, rankLabel, toRoman } from "./pipLayout";
import { CourtMark, SuitGlyph } from "./SuitGlyph";

const CX = CARD_VIEWBOX.width / 2;
const ART_CY = 138;

const BURST = Array.from({ length: 36 }, (_, index) => {
  const angle = (index * Math.PI) / 18;
  const outer = index % 3 === 0 ? 74 : 62;
  return {
    x1: CX + Math.cos(angle) * 50,
    y1: ART_CY + Math.sin(angle) * 50,
    x2: CX + Math.cos(angle) * outer,
    y2: ART_CY + Math.sin(angle) * outer,
    strong: index % 3 === 0,
  };
});

function headerLabel(card: CardDefinition): string {
  if (card.category === "major") {
    const numeral = Number(card.metadata?.numeral ?? card.sequence);
    return numeral === 0 ? "0" : toRoman(numeral);
  }
  return card.rank ? rankLabel(card.rank) : String(card.sequence);
}

function majorSymbol(card: CardDefinition): string {
  const symbol = card.metadata?.symbol;
  return typeof symbol === "string" ? symbol : "✦";
}

function Burst({ foil }: Readonly<{ foil: string }>) {
  return (
    <g stroke={foil}>
      {BURST.map((ray, index) => (
        <line
          key={index}
          x1={ray.x1.toFixed(2)}
          y1={ray.y1.toFixed(2)}
          x2={ray.x2.toFixed(2)}
          y2={ray.y2.toFixed(2)}
          strokeWidth={ray.strong ? 1.1 : 0.5}
          opacity={ray.strong ? 0.95 : 0.6}
        />
      ))}
    </g>
  );
}

function MajorArt({
  card,
  foil,
}: Readonly<{ card: CardDefinition; foil: string }>) {
  return (
    <g>
      <Burst foil={foil} />
      <circle
        cx={CX}
        cy={ART_CY}
        r={46}
        fill={c.night}
        stroke={foil}
        strokeWidth={1.6}
      />
      <circle
        cx={CX}
        cy={ART_CY}
        r={41}
        fill="none"
        stroke={foil}
        strokeWidth={0.5}
      />
      <text
        x={CX}
        y={ART_CY}
        textAnchor="middle"
        dominantBaseline="central"
        fill={c.foilLight}
        fontSize={44}
        fontFamily="'Iowan Old Style', 'Palatino Linotype', 'Noto Serif TC', serif"
        className="procedural-svg__symbol"
      >
        {majorSymbol(card)}
      </text>
    </g>
  );
}

function MinorArt({
  card,
  foil,
}: Readonly<{ card: CardDefinition; foil: string }>) {
  if (!card.suit || !card.rank) return null;
  const layout = pipLayoutFor(card.rank);
  const isAce = card.rank === "ace";

  return (
    <g fill={foil} stroke={c.foilDeep} strokeWidth={0.4}>
      {isAce && <Burst foil={foil} />}
      {layout ? (
        layout.positions.map((position, index) => (
          <SuitGlyph
            key={index}
            suit={card.suit!}
            x={position.x}
            y={position.y}
            scale={layout.scale}
          />
        ))
      ) : (
        <>
          <CourtMark rank={card.rank} x={CX} y={96} />
          <SuitGlyph suit={card.suit} x={CX} y={150} scale={1.75} />
        </>
      )}
    </g>
  );
}

export function ProceduralFace({
  card,
  compact = false,
}: Readonly<{ card: CardDefinition; compact?: boolean }>) {
  const foil = useSvgId("foil");
  const field = useSvgId("face-field");
  const glow = useSvgId("face-glow");
  const { width: w, height: h } = CARD_VIEWBOX;
  const foilFill = `url(#${foil})`;

  return (
    <svg
      className="procedural-svg procedural-svg--face"
      viewBox={`0 0 ${w} ${h}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${card.name.zhHant}程序式牌面`}
    >
      <defs>
        <FoilGradient id={foil} />
        <linearGradient id={field} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={c.dusk} />
          <stop offset="0.55" stopColor={c.night} />
          <stop offset="1" stopColor={c.plum} />
        </linearGradient>
        <radialGradient id={glow} cx="0.5" cy="0.46" r="0.42">
          <stop offset="0" stopColor={c.foil} stopOpacity={0.26} />
          <stop offset="1" stopColor={c.foil} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={w} height={h} rx={12} fill={`url(#${field})`} />
      <rect
        x={24}
        y={50}
        width={w - 48}
        height={178}
        rx={5}
        fill={`url(#${glow})`}
      />
      <rect
        x={24}
        y={50}
        width={w - 48}
        height={178}
        rx={5}
        fill="none"
        stroke={foilFill}
        strokeWidth={0.6}
        opacity={0.7}
      />
      <text
        x={CX}
        y={36}
        textAnchor="middle"
        dominantBaseline="central"
        fill={c.foil}
        fontSize={12}
        letterSpacing={2.4}
        fontFamily="'Iowan Old Style', 'Palatino Linotype', serif"
      >
        {headerLabel(card)}
      </text>
      {card.category === "major" ? (
        <MajorArt card={card} foil={foilFill} />
      ) : (
        <MinorArt card={card} foil={foilFill} />
      )}
      <g stroke={foilFill} strokeWidth={0.6}>
        <line x1={40} y1={240} x2={160} y2={240} />
        <circle cx={CX} cy={240} r={1.6} fill={c.foil} stroke="none" />
      </g>
      <text
        x={CX}
        y={compact ? 260 : 256}
        textAnchor="middle"
        dominantBaseline="central"
        fill={c.moon}
        fontSize={compact ? 19 : 16}
        letterSpacing={2}
        fontFamily="'Noto Serif TC', 'Iowan Old Style', serif"
      >
        {card.name.zhHant}
      </text>
      {!compact && (
        <text
          x={CX}
          y={272}
          textAnchor="middle"
          dominantBaseline="central"
          fill={c.mist}
          fontSize={6.6}
          letterSpacing={1.6}
          fontFamily="system-ui, sans-serif"
        >
          {card.name.en.toUpperCase()}
        </text>
      )}
      <CardFrame foil={foilFill} />
    </svg>
  );
}
