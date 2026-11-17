"use client";

import { useMemo, type CSSProperties } from "react";
import { ProceduralBack } from "@/presentation/components/cards/ProceduralBack";
import {
  seededRandom,
  VORTEX_COMETS_PER_TIER,
  VORTEX_TIERS,
  VORTEX_TILT,
  vortexCards,
  vortexSparks,
} from "@/presentation/components/draw/tableVortex";

interface TableVortexProps {
  /** A new value gives the cards new tilts and the sparks new places. */
  readonly seed: number;
  /** True once the person has let go and the vortex closes into the pile. */
  readonly gathering: boolean;
  readonly backUrl?: string;
}

/** Faint outlines per tier, each a little inside the one before. */
const RINGS_PER_TIER = [1.08, 0.86] as const;

/**
 * Times into a turn for something on a ring: across goes from the left edge,
 * and up and down runs a quarter turn behind, so together they trace the
 * ellipse (sideways and up-and-down are two half-turn swings).
 */
function orbitDelays(offsetMs: number, turnMs: number) {
  return {
    "--orbit-delay": `${-offsetMs}ms`,
    "--bob-delay": `${-(offsetMs + turnMs / 4)}ms`,
  };
}

/**
 * Cards circling upward in a funnel of golden light while the deck is held.
 * Each tier is an ellipse; cards and points of light ride it, facing the
 * viewer, the cards shrinking and dimming on the far side. Letting go closes
 * the whole funnel into the pile in the middle.
 */
export function TableVortex({ seed, gathering, backUrl }: TableVortexProps) {
  const cards = useMemo(() => vortexCards(seededRandom(seed)), [seed]);
  const sparks = useMemo(() => vortexSparks(seededRandom(seed + 1)), [seed]);

  return (
    <div
      className="table-vortex"
      data-gathering={gathering || undefined}
      aria-hidden="true"
    >
      {VORTEX_TIERS.map((tier, tierIndex) => (
        <div
          key={tierIndex}
          className="table-vortex__tier"
          style={
            {
              "--tier-y": tier.y,
              "--tier-radius": tier.radius,
              "--tier-turn": `${tier.turnMs}ms`,
              "--vortex-tilt": VORTEX_TILT,
            } as CSSProperties
          }
        >
          {RINGS_PER_TIER.map((scale) => (
            <span
              key={scale}
              className="table-vortex__ring"
              style={{ "--ring-scale": scale } as CSSProperties}
            />
          ))}
          {Array.from({ length: VORTEX_COMETS_PER_TIER }, (_, comet) => (
            <span
              key={comet}
              className="table-vortex__orbit"
              style={
                orbitDelays(
                  (tier.turnMs * (comet + 0.5)) / VORTEX_COMETS_PER_TIER,
                  tier.turnMs,
                ) as CSSProperties
              }
            >
              <span className="table-vortex__comet" />
            </span>
          ))}
          {cards
            .filter((card) => card.tier === tierIndex)
            .map((card, place) => (
              <span
                key={place}
                className="table-vortex__orbit"
                style={
                  {
                    ...orbitDelays(card.offsetMs, tier.turnMs),
                    "--card-tilt": `${card.tilt}deg`,
                  } as CSSProperties
                }
              >
                <span className="table-vortex__card">
                  <span className="table-vortex__face">
                    {backUrl ? (
                      // A static export serves files as they are; next/image adds nothing.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={backUrl} alt="" draggable={false} />
                    ) : (
                      <ProceduralBack label="" />
                    )}
                  </span>
                </span>
              </span>
            ))}
        </div>
      ))}
      {sparks.map((spark, index) => (
        <span
          key={index}
          className="table-vortex__spark"
          style={
            {
              "--spark-x": spark.x,
              "--spark-y": spark.y,
              "--spark-phase": spark.phase,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
