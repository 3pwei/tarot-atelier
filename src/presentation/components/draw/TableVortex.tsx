"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type RefObject,
} from "react";
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
  /** A new value scatters the cards and sparks differently. */
  readonly seed: number;
  /** True once the person has let go: the cards settle, swirl and leave. */
  readonly gathering: boolean;
  /** A small pre-rendered back for cards in the air. */
  readonly backUrl?: string;
}

function CardBack({ backUrl }: { readonly backUrl?: string }) {
  return backUrl ? (
    // A static export serves files as they are; next/image adds nothing.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="table-vortex__back"
      src={backUrl}
      alt=""
      draggable={false}
      decoding="sync"
    />
  ) : (
    <ProceduralBack label="" />
  );
}

/**
 * Cards whirling upward over the table while the deck is held. One after
 * another they leave the top of the pack and climb to the near side of their
 * ring, then circle on a path of their own, flipping over now and then to
 * show a plain gold front. Letting go brings every card down flat onto the table, where they
 * swirl round its middle, then drop in a loose heap low on the table, which
 * slides away; see ADR 0005 for why the flips are flat.
 */
export function TableVortex({ seed, gathering, backUrl }: TableVortexProps) {
  const cards = useMemo(() => vortexCards(seededRandom(seed)), [seed]);
  const sparks = useMemo(() => vortexSparks(seededRandom(seed + 1)), [seed]);
  const root = useRef<HTMLDivElement>(null);
  useSettleStarts(root, gathering);

  return (
    <div
      ref={root}
      className="table-vortex"
      data-gathering={gathering || undefined}
      style={{ "--climb-duration": `${VORTEX_CLIMB_MS}ms` } as CSSProperties}
      aria-hidden="true"
    >
      <div className="table-vortex__whirl">
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
                      "--roll": `${card.roll}deg`,
                      "--tip": card.tip,
                      "--flip-phase": card.flipPhase,
                    } as CSSProperties
                  }
                >
                  <span className="table-vortex__orbit">
                    <span
                      className="table-vortex__card"
                      data-heap-from={card.launchMs}
                    >
                      <span className="table-vortex__face">
                        <span className="table-vortex__flip">
                          <CardBack backUrl={backUrl} />
                          <span className="table-vortex__front" />
                        </span>
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
      {gathering && (
        <div className="table-vortex__settle">
          {cards.map((card) => (
            <span
              key={card.launchMs}
              className="table-vortex__heap-move"
              style={
                {
                  "--heap-shift-x": card.heapShiftX,
                  "--heap-shift-y": card.heapShiftY,
                } as CSSProperties
              }
            >
              <span
                className="table-vortex__swirl"
                style={{ "--swirl": `${card.swirl}deg` } as CSSProperties}
              >
                <span
                  className="table-vortex__spot"
                  data-settle-to={card.launchMs}
                  style={
                    {
                      "--spot-x": card.spotX,
                      "--spot-y": card.spotY,
                    } as CSSProperties
                  }
                >
                  <span
                    className="table-vortex__laid"
                    style={
                      {
                        "--spot-roll": `${card.spotRoll}deg`,
                        "--heap-turn": `${card.heapTurn}deg`,
                      } as CSSProperties
                    }
                  >
                    <CardBack backUrl={backUrl} />
                  </span>
                </span>
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Each card comes down from where it is when the deck is let go: one
 * measurement per card, written before the first paint, so the keyframes
 * run from there without a jump. Cards still in the pack start from it.
 */
function useSettleStarts(
  root: RefObject<HTMLDivElement | null>,
  gathering: boolean,
) {
  useLayoutEffect(() => {
    const host = root.current;
    if (!gathering || !host) return;
    const table = host.getBoundingClientRect();
    if (table.width === 0) return;
    // In percent of the table's width, from its middle: the spot's own units.
    const unit = table.width / 100;
    for (const spot of host.querySelectorAll<HTMLElement>("[data-settle-to]")) {
      const from = host.querySelector<HTMLElement>(
        `[data-heap-from="${spot.dataset.settleTo}"]`,
      );
      if (!from) continue;
      const box = from.getBoundingClientRect();
      // The narrower side of an upright, turned or flipping card.
      const width = Math.min(box.width, box.height / 1.5);
      const laid = spot.firstElementChild as HTMLElement | null;
      spot.style.setProperty(
        "--from-x",
        String(
          (box.left + box.width / 2 - table.left - table.width / 2) / unit,
        ),
      );
      spot.style.setProperty(
        "--from-y",
        String(
          (box.top + box.height / 2 - table.top - table.height / 2) / unit,
        ),
      );
      spot.style.setProperty(
        "--from-scale",
        String(width / Math.max(1, laid?.offsetWidth ?? 1)),
      );
    }
  }, [root, gathering]);
}
