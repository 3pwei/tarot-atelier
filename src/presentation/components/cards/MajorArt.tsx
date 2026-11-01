import type { ReactElement } from "react";
import {
  Ground,
  Hatch,
  INK,
  Moon,
  PAPER_LIGHT,
  Rays,
  STAMP,
  polar,
  starPoints,
} from "./inkKit";

/**
 * Original line illustrations for the 22 major arcana, drawn as printed ink
 * on kraft paper. Each scene uses the art window (about x 34–166, y 60–220)
 * and keeps to the card's traditional emblem so it stays recognisable.
 */

const Fool = () => (
  <g>
    <circle cx={140} cy={80} r={12} />
    <Rays cx={140} cy={80} from={16} to={22} count={12} width={0.9} />
    <path d="M34 214 L34 170 Q60 160 86 168 L102 178 L108 214 Z" fill={INK} />
    <path d="M108 214 L116 214" />
    <line x1={74} y1={120} x2={116} y2={84} strokeWidth={1.6} />
    <path d="M114 86 q10 -6 14 4 q-2 12 -14 8 z" fill={INK} />
    {Array.from({ length: 5 }, (_, index) => {
      const [x, y] = polar(
        66,
        146,
        6,
        -Math.PI / 2 + (index * 2 * Math.PI) / 5,
      );
      return <circle key={index} cx={x} cy={y} r={4.4} fill={PAPER_LIGHT} />;
    })}
    <circle cx={66} cy={146} r={3} fill={STAMP} stroke="none" />
    <path d="M66 156 Q64 170 70 184" strokeWidth={1} />
    <path d="M67 170 q-8 -2 -9 -8 q7 0 9 8 z" fill={INK} />
    <path d="M56 200 q10 -14 24 -4" strokeWidth={0.8} />
  </g>
);

const Magician = () => (
  <g>
    <path
      d="M78 76 c0 -12 20 -12 22 0 c2 12 22 12 22 0 c0 -12 -20 -12 -22 0 c-2 12 -22 12 -22 0 z"
      strokeWidth={1.6}
    />
    <line x1={100} y1={92} x2={100} y2={160} strokeWidth={2.2} />
    <circle cx={100} cy={90} r={3} fill={INK} />
    <path d="M40 176 H160 M44 176 V214 M156 176 V214" strokeWidth={1.6} />
    <Hatch x={46} y={178} width={108} height={10} gap={5} />
    <g strokeWidth={1.2}>
      <line x1={54} y1={172} x2={62} y2={150} />
      <path d="M76 158 h14 q0 12 -7 14 q-7 -2 -7 -14 z" />
      <path d="M110 172 l3 -24 l3 24 M106 166 h14" />
      <circle cx={140} cy={164} r={8} />
      <polygon
        points={starPoints(140, 164, 6, 2.4, 5)}
        fill={INK}
        stroke="none"
      />
    </g>
  </g>
);

const HighPriestess = () => (
  <g>
    <rect x={42} y={70} width={20} height={142} fill={INK} />
    <rect x={138} y={70} width={20} height={142} />
    <text
      x={52}
      y={108}
      fill={PAPER_LIGHT}
      stroke="none"
      fontSize={14}
      textAnchor="middle"
      fontFamily="Georgia, serif"
    >
      B
    </text>
    <text
      x={148}
      y={108}
      fill={INK}
      stroke="none"
      fontSize={14}
      textAnchor="middle"
      fontFamily="Georgia, serif"
    >
      J
    </text>
    <path d="M62 76 Q100 96 138 76" />
    <path d="M62 86 Q100 106 138 86" strokeWidth={0.7} />
    <circle cx={100} cy={128} r={16} />
    <Moon cx={100} cy={128} r={10} />
    <path d="M70 200 Q100 186 130 200" strokeWidth={1.2} />
    <Moon cx={100} cy={198} r={7} facing={-1} />
  </g>
);

const Empress = () => (
  <g>
    {Array.from({ length: 12 }, (_, index) => {
      const [x, y] = polar(100, 104, 34, Math.PI + (index * Math.PI) / 11);
      return (
        <polygon
          key={index}
          points={starPoints(x, y, 4, 1.6, 5)}
          fill={INK}
          stroke="none"
        />
      );
    })}
    <circle cx={100} cy={130} r={16} strokeWidth={1.8} />
    <path d="M100 146 V170 M90 160 H110" strokeWidth={1.8} />
    {[56, 72, 128, 144].map((x) => (
      <g key={x} strokeWidth={0.9}>
        <line x1={x} y1={214} x2={x} y2={176} />
        {[180, 188, 196].map((y) => (
          <path key={y} d={`M${x} ${y} q-5 -4 -4 -9 M${x} ${y} q5 -4 4 -9`} />
        ))}
      </g>
    ))}
    <Ground y={214} />
  </g>
);

const Emperor = () => (
  <g>
    <rect x={60} y={96} width={80} height={110} />
    <Hatch x={62} y={98} width={76} height={106} gap={6} />
    <path d="M60 96 c-14 0 -14 -18 0 -16 c8 2 6 12 -2 10" strokeWidth={1.4} />
    <path d="M140 96 c14 0 14 -18 0 -16 c-8 2 -6 12 2 10" strokeWidth={1.4} />
    <rect x={84} y={120} width={32} height={86} fill={PAPER_LIGHT} />
    <circle cx={100} cy={142} r={9} fill={PAPER_LIGHT} />
    <path d="M100 151 V196 M92 164 H108" strokeWidth={2} />
    <circle cx={100} cy={138} r={4} fill={INK} />
    <path
      d="M76 70 l8 12 l8 -12 l8 12 l8 -12 l8 12 l8 -12 v14 H76 z"
      fill={INK}
    />
  </g>
);

const Hierophant = () => (
  <g>
    <path d="M100 66 V210" strokeWidth={2.2} />
    <path d="M86 82 H114 M80 96 H120 M74 110 H126" strokeWidth={2.2} />
    <g transform="rotate(-35 100 176)" strokeWidth={1.6}>
      <circle cx={100} cy={146} r={8} />
      <path d="M100 154 V200 M100 190 h8 M100 198 h6" />
    </g>
    <g transform="rotate(35 100 176)" strokeWidth={1.6}>
      <circle cx={100} cy={146} r={8} fill={INK} />
      <path d="M100 154 V200 M100 190 h-8 M100 198 h-6" />
    </g>
  </g>
);

const Lovers = () => (
  <g>
    <circle cx={100} cy={82} r={14} />
    <Rays cx={100} cy={82} from={18} to={26} count={16} width={0.8} />
    <path
      d="M60 104 Q100 84 140 104 Q118 98 100 112 Q82 98 60 104 z"
      fill={INK}
    />
    <line x1={56} y1={214} x2={56} y2={150} strokeWidth={1.6} />
    {[150, 162, 174].map((y) => (
      <path
        key={y}
        d={`M56 ${y} q-10 -4 -12 -12 M56 ${y} q10 -4 12 -12`}
        strokeWidth={1}
      />
    ))}
    <line x1={144} y1={214} x2={144} y2={156} strokeWidth={1.6} />
    <ellipse cx={144} cy={144} rx={18} ry={14} />
    {[
      [136, 142],
      [148, 138],
      [152, 150],
    ].map(([x, y]) => (
      <circle
        key={`${x}-${y}`}
        cx={x}
        cy={y}
        r={2.6}
        fill={STAMP}
        stroke="none"
      />
    ))}
    <path
      d="M90 182 c0 -8 10 -10 10 -2 c0 -8 10 -6 10 2 c0 8 -10 14 -10 18 c0 -4 -10 -10 -10 -18 z"
      fill={STAMP}
      stroke="none"
    />
    <Ground y={214} />
  </g>
);

const Chariot = () => (
  <g>
    <path d="M58 92 Q100 74 142 92" strokeWidth={1.6} />
    {[70, 86, 100, 114, 130].map((x, index) => (
      <polygon
        key={x}
        points={starPoints(x, 90 - (index % 2) * 6, 3.6, 1.4, 5)}
        fill={INK}
        stroke="none"
      />
    ))}
    <line x1={62} y1={92} x2={62} y2={150} />
    <line x1={138} y1={92} x2={138} y2={150} />
    <rect x={56} y={150} width={88} height={34} fill={INK} />
    <path d="M86 160 l14 14 l14 -14" stroke={PAPER_LIGHT} strokeWidth={1.4} />
    <circle cx={70} cy={196} r={14} strokeWidth={1.6} />
    <circle cx={130} cy={196} r={14} strokeWidth={1.6} />
    <Rays cx={70} cy={196} from={0} to={14} count={8} width={0.8} />
    <Rays cx={130} cy={196} from={0} to={14} count={8} width={0.8} />
  </g>
);

const Strength = () => (
  <g>
    <path
      d="M86 74 c0 -10 14 -10 14 0 c0 10 14 10 14 0 c0 -10 -14 -10 -14 0 c0 10 -14 10 -14 0 z"
      strokeWidth={1.4}
    />
    <Rays
      cx={100}
      cy={148}
      from={30}
      to={44}
      count={28}
      alternate={6}
      width={1.2}
    />
    <circle cx={100} cy={148} r={28} fill={PAPER_LIGHT} strokeWidth={1.6} />
    <circle cx={90} cy={142} r={3} fill={INK} />
    <circle cx={110} cy={142} r={3} fill={INK} />
    <path d="M94 158 l6 6 l6 -6 z" fill={INK} />
    <path d="M100 164 v6 M92 170 q8 6 16 0" strokeWidth={1.2} />
  </g>
);

const Hermit = () => (
  <g>
    <path d="M34 214 L84 120 L104 150 L122 128 L166 214 Z" />
    <Hatch x={60} y={170} width={80} height={44} gap={5} />
    <line x1={128} y1={70} x2={128} y2={200} strokeWidth={2} />
    <path d="M86 86 h20 v30 h-20 z" fill={INK} />
    <path d="M90 90 h12 v22 h-12 z" fill={PAPER_LIGHT} stroke="none" />
    <polygon points={starPoints(96, 101, 6, 3, 6)} fill={STAMP} stroke="none" />
    <path d="M86 86 l10 -8 l10 8 M96 78 v-6" strokeWidth={1.2} />
    <Rays cx={96} cy={101} from={20} to={28} count={12} width={0.7} />
  </g>
);

const WheelOfFortune = () => (
  <g>
    <circle cx={100} cy={140} r={56} strokeWidth={1.8} />
    <circle cx={100} cy={140} r={46} />
    <circle cx={100} cy={140} r={18} fill={INK} />
    <Rays cx={100} cy={140} from={18} to={46} count={8} width={1.2} />
    {["T", "A", "R", "O"].map((letter, index) => {
      const [x, y] = polar(100, 140, 51, -Math.PI / 2 + (index * Math.PI) / 2);
      return (
        <text
          key={letter}
          x={x}
          y={y + 3.5}
          fontSize={9}
          textAnchor="middle"
          fill={STAMP}
          stroke="none"
          fontFamily="Georgia, serif"
        >
          {letter}
        </text>
      );
    })}
    <circle cx={100} cy={140} r={5} fill={PAPER_LIGHT} stroke="none" />
  </g>
);

const Justice = () => (
  <g>
    <path d="M100 64 L104 74 L102 184 H98 L96 74 Z" fill={INK} />
    <path d="M86 184 H114 M100 184 V200 M92 204 H108" strokeWidth={2} />
    <line x1={50} y1={112} x2={150} y2={112} strokeWidth={1.6} />
    {[56, 144].map((x) => (
      <g key={x}>
        <path
          d={`M${x} 112 L${x - 16} 150 M${x} 112 L${x + 16} 150`}
          strokeWidth={0.9}
        />
        <path
          d={`M${x - 20} 150 H${x + 20} Q${x} 168 ${x - 20} 150 z`}
          fill={INK}
        />
      </g>
    ))}
  </g>
);

const HangedMan = () => (
  <g>
    <path d="M44 70 H156 M60 70 V214 M140 70 V214" strokeWidth={2.4} />
    <Hatch x={44} y={64} width={112} height={6} gap={4} />
    <line x1={100} y1={70} x2={100} y2={90} />
    <path
      d="M100 90 L100 150 M100 104 L118 96 M100 90 L82 104 L100 118"
      strokeWidth={1.8}
    />
    <path d="M86 150 H114 L108 120 H92 Z" fill={INK} />
    <circle cx={100} cy={166} r={10} fill={PAPER_LIGHT} strokeWidth={1.6} />
    <Rays cx={100} cy={166} from={14} to={22} count={14} width={0.8} />
  </g>
);

const Death = () => (
  <g>
    <rect x={42} y={130} width={18} height={84} fill={INK} />
    <rect x={140} y={130} width={18} height={84} fill={INK} />
    <path
      d="M42 130 v-8 h6 v8 M54 130 v-8 h6 v8 M140 130 v-8 h6 v8 M152 130 v-8 h6 v8"
      fill={INK}
    />
    <path d="M60 214 H140" />
    <path d="M68 214 A32 32 0 0 1 132 214" strokeWidth={1.4} />
    <g strokeWidth={0.8}>
      {Array.from({ length: 11 }, (_, index) => {
        const angle = Math.PI + ((index + 0.5) * Math.PI) / 11;
        const [x1, y1] = polar(100, 214, 38, angle);
        const [x2, y2] = polar(100, 214, 48, angle);
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
    <rect
      x={60}
      y={214}
      width={80}
      height={6}
      fill={PAPER_LIGHT}
      stroke="none"
    />
    <path d="M70 70 H130 V118 L100 104 L70 118 Z" fill={INK} />
    <circle cx={100} cy={88} r={10} fill={PAPER_LIGHT} stroke="none" />
    <circle cx={100} cy={88} r={4} fill={INK} stroke="none" />
    {Array.from({ length: 5 }, (_, index) => {
      const [x, y] = polar(
        100,
        88,
        7,
        -Math.PI / 2 + (index * 2 * Math.PI) / 5,
      );
      return (
        <circle
          key={index}
          cx={x}
          cy={y}
          r={3}
          fill={PAPER_LIGHT}
          stroke="none"
        />
      );
    })}
  </g>
);

const Temperance = () => (
  <g>
    <rect x={84} y={70} width={32} height={32} />
    <polygon points="100,74 112,96 88,96" fill={INK} />
    <path d="M52 130 h22 l-4 26 h-14 z" fill={INK} />
    <path d="M126 160 h22 l-4 26 h-14 z" />
    <path d="M70 132 C96 120 110 150 132 162" strokeWidth={1.4} />
    <path d="M72 138 C96 128 108 156 130 166" strokeWidth={0.7} />
    <path d="M40 206 q15 -6 30 0 t30 0 t30 0 t30 0" strokeWidth={1.1} />
    <path d="M40 214 q15 -6 30 0 t30 0 t30 0 t30 0" strokeWidth={0.7} />
    <path d="M140 196 l4 -10 l4 10" strokeWidth={1} />
  </g>
);

const Devil = () => (
  <g>
    <circle cx={100} cy={104} r={34} strokeWidth={1.6} />
    <polygon
      points={starPoints(100, 104, 32, 12.5, 5, Math.PI / 2)}
      fill={INK}
      stroke="none"
    />
    <path d="M72 82 Q60 64 66 56 M128 82 Q140 64 134 56" strokeWidth={2} />
    <rect x={84} y={150} width={32} height={16} fill={INK} />
    <path
      d="M90 166 Q76 186 62 196 M110 166 Q124 186 138 196"
      strokeDasharray="4 2"
      strokeWidth={1.6}
    />
    <circle cx={56} cy={200} r={8} />
    <circle cx={144} cy={200} r={8} />
    <path d="M48 214 H64 M136 214 H152" />
  </g>
);

const Tower = () => (
  <g>
    <path d="M78 214 L84 100 H116 L122 214 Z" />
    <Hatch x={86} y={110} width={30} height={100} gap={5} />
    <rect x={92} y={128} width={8} height={14} fill={INK} />
    <rect x={102} y={168} width={8} height={14} fill={INK} />
    <path d="M118 94 L128 72 L134 82 L144 64 L140 84" fill={INK} />
    <path
      d="M150 62 L132 98 L142 98 L120 136 L126 104 L116 104 L132 62 Z"
      fill={STAMP}
      stroke="none"
    />
    {[
      [54, 120],
      [60, 150],
      [148, 140],
      [140, 176],
      [50, 184],
    ].map(([x, y]) => (
      <path
        key={`${x}-${y}`}
        d={`M${x} ${y} q3 6 0 8 q-3 -2 0 -8 z`}
        fill={INK}
      />
    ))}
    <Ground y={214} />
  </g>
);

const Star = () => (
  <g>
    <polygon
      points={starPoints(100, 96, 30, 9, 8)}
      fill={STAMP}
      stroke="none"
    />
    <polygon
      points={starPoints(100, 96, 18, 6, 8, -Math.PI / 2 + Math.PI / 8)}
      fill={INK}
      stroke="none"
    />
    {Array.from({ length: 7 }, (_, index) => {
      const [x, y] = polar(
        100,
        104,
        58,
        Math.PI + 0.25 + (index * (Math.PI - 0.5)) / 6,
      );
      return (
        <polygon
          key={index}
          points={starPoints(x, y, 6, 2.2, 8)}
          fill={INK}
          stroke="none"
        />
      );
    })}
    <path d="M40 186 q15 -6 30 0 t30 0 t30 0 t30 0" strokeWidth={1.1} />
    <path d="M40 196 q15 -6 30 0 t30 0 t30 0 t30 0" strokeWidth={0.8} />
    <path d="M86 148 h18 l-2 18 q-7 6 -14 0 z" fill={INK} />
    <path d="M104 152 q10 0 8 10" />
    <path d="M90 166 q-4 14 -2 22" strokeWidth={0.9} />
    <Ground y={214} />
  </g>
);

const MoonCard = () => (
  <g>
    <circle cx={100} cy={92} r={26} strokeWidth={1.4} />
    <Moon cx={100} cy={92} r={20} facing={-1} />
    <Rays
      cx={100}
      cy={92}
      from={30}
      to={38}
      count={24}
      alternate={4}
      width={0.8}
    />
    <rect x={38} y={140} width={18} height={60} fill={INK} />
    <rect x={144} y={140} width={18} height={60} fill={INK} />
    <path d="M38 140 l9 -10 l9 10 M144 140 l9 -10 l9 10" fill={INK} />
    <path
      d="M100 214 C86 196 116 184 100 168 C88 156 108 146 100 136"
      strokeWidth={1.2}
      strokeDasharray="3 2"
    />
    {[
      [78, 128],
      [120, 132],
      [90, 150],
    ].map(([x, y]) => (
      <path
        key={`${x}-${y}`}
        d={`M${x} ${y} q3 6 0 8 q-3 -2 0 -8 z`}
        fill={INK}
      />
    ))}
    <path d="M40 214 q15 -6 30 0 t30 0 t30 0 t30 0" strokeWidth={1.1} />
  </g>
);

const Sun = () => (
  <g>
    {Array.from({ length: 16 }, (_, index) => {
      const angle = (index * Math.PI) / 8;
      const [x1, y1] = polar(100, 116, 34, angle);
      const [x2, y2] = polar(100, 116, 54, angle);
      return index % 2 === 0 ? (
        <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={1.6} />
      ) : (
        <path
          key={index}
          d={`M${x1.toFixed(1)} ${y1.toFixed(1)} Q${polar(100, 116, 42, angle + 0.12).join(" ")} ${polar(100, 116, 48, angle).join(" ")}`}
          strokeWidth={1}
        />
      );
    })}
    <circle cx={100} cy={116} r={30} fill={STAMP} stroke="none" />
    <circle cx={91} cy={112} r={2.6} fill={INK} stroke="none" />
    <circle cx={109} cy={112} r={2.6} fill={INK} stroke="none" />
    <path d="M90 126 q10 8 20 0" stroke={INK} strokeWidth={1.4} />
    {[58, 82, 118, 142].map((x) => (
      <g key={x} strokeWidth={1}>
        <line x1={x} y1={214} x2={x} y2={186} />
        <circle cx={x} cy={180} r={6} fill={INK} />
        <Rays cx={x} cy={180} from={7} to={11} count={10} width={0.8} />
      </g>
    ))}
    <Ground y={214} />
  </g>
);

const Judgement = () => (
  <g>
    <path
      d="M40 96 q12 -16 28 -8 q10 -14 26 -4 q14 -12 28 0 q16 -8 26 8 q-30 10 -108 4 z"
      fill={INK}
    />
    <path d="M72 108 L132 150 L136 144 L80 100 Z" fill={INK} />
    <path d="M132 150 l12 -2 l-4 12 z" fill={INK} />
    <path d="M96 118 v26 h22 v-14" strokeWidth={0.9} />
    <path d="M104 124 v14 M98 130 h12" stroke={STAMP} strokeWidth={1.6} />
    <Rays cx={100} cy={96} from={14} to={28} count={10} width={0.7} />
    {[56, 100, 144].map((x) => (
      <g key={x}>
        <rect x={x - 14} y={196} width={28} height={18} fill={INK} />
        <circle cx={x} cy={186} r={6} />
        <path
          d={`M${x - 8} 178 l-4 -10 M${x + 8} 178 l4 -10`}
          strokeWidth={1}
        />
      </g>
    ))}
  </g>
);

const World = () => (
  <g>
    <ellipse cx={100} cy={140} rx={42} ry={62} strokeWidth={1.8} />
    {Array.from({ length: 22 }, (_, index) => {
      const angle = (index * 2 * Math.PI) / 22;
      const x = 100 + Math.cos(angle) * 42;
      const y = 140 + Math.sin(angle) * 62;
      const rotation = (angle * 180) / Math.PI + 90;
      return (
        <ellipse
          key={index}
          cx={x}
          cy={y}
          rx={2.6}
          ry={6}
          transform={`rotate(${rotation.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})`}
          fill={INK}
          stroke="none"
        />
      );
    })}
    <path
      d="M90 78 q10 8 20 0 M90 202 q10 -8 20 0"
      stroke={STAMP}
      strokeWidth={2}
    />
    <polygon points={starPoints(100, 140, 22, 8, 8)} fill={INK} stroke="none" />
    {[
      [46, 74],
      [154, 74],
      [46, 206],
      [154, 206],
    ].map(([x, y]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r={6} />
    ))}
  </g>
);

const MAJOR_ART: readonly (() => ReactElement)[] = [
  Fool,
  Magician,
  HighPriestess,
  Empress,
  Emperor,
  Hierophant,
  Lovers,
  Chariot,
  Strength,
  Hermit,
  WheelOfFortune,
  Justice,
  HangedMan,
  Death,
  Temperance,
  Devil,
  Tower,
  Star,
  MoonCard,
  Sun,
  Judgement,
  World,
];

export const MAJOR_ART_COUNT = MAJOR_ART.length;

export function MajorArt({ numeral }: Readonly<{ numeral: number }>) {
  const Art = MAJOR_ART[numeral];
  return (
    <g
      className="major-art"
      fill="none"
      stroke={INK}
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-major-art={numeral}
    >
      {Art ? <Art /> : <circle cx={100} cy={140} r={30} />}
    </g>
  );
}
