const TICKS = Array.from({ length: 72 }, (_, index) => {
  const angle = (index * Math.PI) / 36;
  const inner = index % 6 === 0 ? 168 : 176;
  return {
    x1: 200 + Math.cos(angle) * inner,
    y1: 200 + Math.sin(angle) * inner,
    x2: 200 + Math.cos(angle) * 184,
    y2: 200 + Math.sin(angle) * 184,
  };
});

const SIGILS = Array.from({ length: 12 }, (_, index) => {
  const angle = (index * Math.PI) / 6 - Math.PI / 2;
  return { x: 200 + Math.cos(angle) * 152, y: 200 + Math.sin(angle) * 152 };
});

/** A faint engraved astrolabe under the altar, purely decorative. */
export function TableOrnament() {
  return (
    <svg
      className="table-ornament"
      viewBox="0 0 400 400"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor">
        <circle cx={200} cy={200} r={190} strokeWidth={0.8} />
        <circle cx={200} cy={200} r={184} strokeWidth={0.4} />
        <circle
          cx={200}
          cy={200}
          r={138}
          strokeWidth={0.5}
          strokeDasharray="1 5"
        />
        <circle cx={200} cy={200} r={96} strokeWidth={0.6} />
        <ellipse cx={200} cy={200} rx={190} ry={64} strokeWidth={0.4} />
        <ellipse cx={200} cy={200} rx={64} ry={190} strokeWidth={0.4} />
        {TICKS.map((tick, index) => (
          <line
            key={index}
            x1={tick.x1.toFixed(1)}
            y1={tick.y1.toFixed(1)}
            x2={tick.x2.toFixed(1)}
            y2={tick.y2.toFixed(1)}
            strokeWidth={0.5}
          />
        ))}
      </g>
      <g fill="currentColor">
        {SIGILS.map((sigil, index) => (
          <circle
            key={index}
            cx={sigil.x.toFixed(1)}
            cy={sigil.y.toFixed(1)}
            r={2}
          />
        ))}
      </g>
    </svg>
  );
}
