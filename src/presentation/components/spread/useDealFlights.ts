"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import {
  flightStyle,
  planFlight,
  type FlightFrame,
  type FlightRole,
  type ScreenBox,
} from "@/presentation/components/draw/dealMotion";

/** A chosen card, or its jumper, flying from the fan to its position. */
export interface Flight {
  readonly positionId: string;
  readonly role: FlightRole;
  /** Where it left the fan, on screen. */
  readonly origin: ScreenBox;
}

interface DealFlightOptions {
  readonly flights: readonly Flight[];
  readonly root: RefObject<HTMLElement | null>;
  /** The frame of the position a card lands in. */
  readonly frameOf: (positionId: string) => FlightFrame;
}

function landingCard(host: HTMLElement, flight: Flight): HTMLElement | null {
  return host.querySelector<HTMLElement>(
    `[data-slot="${flight.positionId}"] [data-flight="pending"][data-draw-card="${flight.role}"]:not([data-flight-planned])`,
  );
}

/**
 * Measures each newly chosen card where it will land, writes its flight as
 * custom properties and only then lets the CSS keyframes start. Measuring
 * before the animation applies keeps the landing point exact.
 */
export function useDealFlights({ flights, root, frameOf }: DealFlightOptions) {
  const latestFrame = useRef(frameOf);
  useLayoutEffect(() => {
    latestFrame.current = frameOf;
  });

  useLayoutEffect(() => {
    const host = root.current;
    if (!host) return;
    for (const flight of flights) {
      const card = landingCard(host, flight);
      if (!card) continue;
      const path = planFlight(
        flight.origin,
        card.getBoundingClientRect(),
        card.offsetWidth,
        latestFrame.current(flight.positionId),
        flight.role,
      );
      for (const [name, value] of Object.entries(flightStyle(path))) {
        card.style.setProperty(name, value);
      }
      card.dataset.flightPlanned = "true";
    }
  }, [flights, root]);
}
