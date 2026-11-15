"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import {
  flightStyle,
  planFlight,
  type FlightFrame,
  type ScreenBox,
} from "@/presentation/components/draw/dealMotion";

/** Name of the keyframes in draw-experience.css that carry a dealt card. */
const DEAL_FLIGHT = "deal-flight";

interface DealFlightOptions {
  /** True while dealt cards are on their way. */
  readonly active: boolean;
  readonly root: RefObject<HTMLElement | null>;
  /** The top of the deck when dealing began. */
  readonly deck: ScreenBox | null;
  /** The frame of the position a card lands in. */
  readonly frameOf: (slotId: string) => FlightFrame;
  /** Called once a position's main card has touched down. */
  readonly onLanded: (slotId: string) => void;
}

/**
 * Measures each dealt card where it will land, writes its flight as custom
 * properties and only then lets the CSS keyframes start. Measuring before the
 * animation applies keeps the landing point exact.
 */
export function useDealFlights({
  active,
  root,
  deck,
  frameOf,
  onLanded,
}: DealFlightOptions) {
  const latest = useRef({ frameOf, onLanded });
  useLayoutEffect(() => {
    latest.current = { frameOf, onLanded };
  });

  useLayoutEffect(() => {
    const host = root.current;
    if (!active || !host || !deck) return;
    const cards = [
      ...host.querySelectorAll<HTMLElement>("[data-flight='pending']"),
    ];
    const listeners = cards.map((card) => {
      const slotId = card.closest<HTMLElement>("[data-slot]")?.dataset.slot;
      const role = card.dataset.drawCard === "jumper" ? "jumper" : "primary";
      const frame = slotId
        ? latest.current.frameOf(slotId)
        : { rotation: 0, scale: 1 };
      const path = planFlight(
        deck,
        card.getBoundingClientRect(),
        card.offsetWidth,
        frame,
        role,
      );
      for (const [name, value] of Object.entries(flightStyle(path))) {
        card.style.setProperty(name, value);
      }
      card.dataset.flightPlanned = "true";

      const landed = (event: AnimationEvent) => {
        // Animations inside the card bubble up here too.
        if (event.target !== card || event.animationName !== DEAL_FLIGHT) {
          return;
        }
        if (role === "primary" && slotId) latest.current.onLanded(slotId);
      };
      card.addEventListener("animationend", landed);
      return () => card.removeEventListener("animationend", landed);
    });
    return () => listeners.forEach((remove) => remove());
  }, [active, root, deck]);
}
