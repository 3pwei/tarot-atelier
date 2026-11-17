"use client";

import { useMemo, type CSSProperties } from "react";
import { ProceduralBack } from "@/presentation/components/cards/ProceduralBack";
import {
  PILE_CENTER,
  seededRandom,
  VORTEX_CLIMB_MS,
  VORTEX_COMETS_PER_TIER,
  VORTEX_TIERS,
  VORTEX_TILT,
  vortexCards,
  vortexSparks,
} from "@/presentation/components/draw/tableVortex";

interface TableVortexProps {
  /** Card width as a percentage of the table's width, as on the positions. */
  readonly cardWidth: number;
  /** A new value gives the cards new tilts and the sparks new places. */
  readonly seed: number;
  /** True once the person has let go and the vortex closes into the pile. */
  readonly gathering: boolean;
  readonly backUrl?: string;
}

/** Faint outlines per tier, each a little inside the one before. */
const RINGS_PER_TIER = [1.08, 0.86] as const;

/** A point of light already partway round its ring when the vortex opens. */
function cometDelay(comet: number, turnMs: number) {
  return {
    "--orbit-delay": `${-(turnMs * (comet + 0.5)) / VORTEX_COMETS_PER_TIER}ms`,
  };
}

/**
 * Cards circling upward in a funnel of golden light while the deck is held.
 * One after another they leave the pile at full size, shrinking as they
 * climb, and join their ring at its near side; each ring is an ellipse they
 * ride facing the viewer, smaller and dimmer on the far side. Cards still
 * waiting lie in the pile. Letting go closes the funnel into the pile.
 */
export function TableVortex({
  cardWidth,
  seed,
  gathering,
  backUrl,
}: TableVortexProps) {
  const cards = useMemo(
    () => vortexCards(seededRandom(seed), cardWidth),
    [seed, cardWidth],
  );
  const sparks = useMemo(() => vortexSparks(seededRandom(seed + 1)), [seed]);

  return (
    <div
      className="table-vortex"
      data-gathering={gathering || undefined}
      style={{ "--climb-duration": `${VORTEX_CLIMB_MS}ms` } as CSSProperties}
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
              style={cometDelay(comet, tier.turnMs) as CSSProperties}
            >
              <span className="table-vortex__comet" />
            </span>
          ))}
          {cards
            .filter((card) => card.tier === tierIndex)
            .map((card) => (
              <span
                key={card.launchMs}
                className="table-vortex__lift"
                style={
                  {
                    "--launch-delay": `${card.launchMs}ms`,
                    "--orbit-delay": `${card.launchMs + VORTEX_CLIMB_MS}ms`,
                    "--climb-from": PILE_CENTER.y - tier.y,
                    "--air-scale": card.airScale,
                    "--card-tilt": `${card.tilt}deg`,
                  } as CSSProperties
                }
              >
                <span className="table-vortex__orbit">
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
