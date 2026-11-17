"use client";

import { useMemo, type CSSProperties } from "react";
import { ProceduralBack } from "@/presentation/components/cards/ProceduralBack";
import {
  PILE_CENTER,
  seededRandom,
  VORTEX_CLIMB_MS,
  VORTEX_TIERS,
  VORTEX_TILT,
  vortexCards,
  vortexSparks,
} from "@/presentation/components/draw/tableVortex";

interface TableVortexProps {
  /** Card width as a percentage of the table's width, as on the positions. */
  readonly cardWidth: number;
  /** A new value scatters the cards and sparks differently. */
  readonly seed: number;
  /** True once the person has let go and the vortex closes into the pile. */
  readonly gathering: boolean;
  readonly backUrl?: string;
}

/**
 * Cards whirling upward over the table while the deck is held. One after
 * another they leave the top of the pile and climb, shrinking, to join the
 * funnel at its near side; each then circles on a path of its own, wide at
 * the top and narrow at the bottom, tumbling as it goes and trailing a short
 * glowing streak. Letting go closes the funnel into the pile.
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
                    "--radius-scale": card.radiusScale,
                    "--shift-x": card.shiftX,
                    "--shift-y": card.shiftY,
                    "--pitch": `${card.pitch}deg`,
                    "--roll": `${card.roll}deg`,
                    "--spin-from": `${card.spinFrom}deg`,
                  } as CSSProperties
                }
              >
                <span className="table-vortex__orbit">
                  <span className="table-vortex__card">
                    <span className="table-vortex__trail" />
                    <span className="table-vortex__face">
                      {backUrl ? (
                        // A static export serves files as they are; next/image adds nothing.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={backUrl}
                          alt=""
                          draggable={false}
                          decoding="sync"
                        />
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
