import { describe, expect, it } from "vitest";
import {
  FLIGHT_MS,
  JUMPER_DELAY_MS,
  RIFFLE_MS,
  SHUFFLE_MS,
  landingDelayMs,
  shuffleFinishDelayMs,
  flightStyle,
  planFlight,
  toLocalOffset,
} from "@/presentation/components/draw/dealMotion";

describe("toLocalOffset", () => {
  it("is the identity on an unrotated, unzoomed table", () => {
    expect(toLocalOffset(30, -12, { rotation: 0, scale: 1 })).toEqual({
      x: 30,
      y: -12,
    });
  });

  it("divides by the table zoom", () => {
    const local = toLocalOffset(100, 50, { rotation: 0, scale: 2 });
    expect(local.x).toBeCloseTo(50);
    expect(local.y).toBeCloseTo(25);
  });

  it("undoes the slot rotation so the card lands on screen as planned", () => {
    // A slot turned 90° clockwise: screen right is the slot's local up.
    const local = toLocalOffset(10, 0, { rotation: 90, scale: 1 });
    expect(local.x).toBeCloseTo(0);
    expect(local.y).toBeCloseTo(-10);

    // Re-applying the frame gives back the screen offset.
    const theta = (35 * Math.PI) / 180;
    const back = toLocalOffset(42, -17, { rotation: 35, scale: 1.5 });
    const screenX = 1.5 * (back.x * Math.cos(theta) - back.y * Math.sin(theta));
    const screenY = 1.5 * (back.x * Math.sin(theta) + back.y * Math.cos(theta));
    expect(screenX).toBeCloseTo(42);
    expect(screenY).toBeCloseTo(-17);
  });
});

describe("planFlight", () => {
  const deck = { left: 0, top: 400, width: 80, height: 120 };
  const landing = { left: 300, top: 100, width: 160, height: 240 };

  it("starts on the deck, measured from the landing point", () => {
    const path = planFlight(
      deck,
      landing,
      160,
      { rotation: 0, scale: 1 },
      "primary",
    );

    expect(path.start).toEqual({ x: -340, y: 240 });
    expect(path.startScale).toBe(0.5);
  });

  it("arcs above the straight line between deck and position", () => {
    const path = planFlight(
      deck,
      landing,
      160,
      { rotation: 0, scale: 1 },
      "primary",
    );

    expect(path.peak.y).toBeLessThan(path.start.y * 0.35);
  });

  it("sends the jumper higher and spinning", () => {
    const frame = { rotation: 0, scale: 1 };
    const primary = planFlight(deck, landing, 160, frame, "primary");
    const jumper = planFlight(deck, landing, 160, frame, "jumper");

    expect(jumper.peak.y).toBeLessThan(primary.peak.y);
    expect(Math.abs(jumper.startRotation)).toBeGreaterThan(180);
  });

  it("leaves the deck upright on screen from a rotated slot", () => {
    const path = planFlight(
      deck,
      landing,
      160,
      { rotation: 30, scale: 1 },
      "primary",
    );

    expect(path.startRotation).toBe(-36);
  });

  it("accounts for the table zoom in the starting size", () => {
    const path = planFlight(
      deck,
      landing,
      160,
      { rotation: 0, scale: 2 },
      "primary",
    );

    expect(path.startScale).toBe(0.25);
  });
});

describe("flightStyle", () => {
  it("writes the path as pixel and degree custom properties", () => {
    const style = flightStyle({
      start: { x: -10, y: 20 },
      peak: { x: -3, y: -40 },
      startScale: 0.5,
      startRotation: -6,
    });

    expect(style).toEqual({
      "--flight-start-x": "-10px",
      "--flight-start-y": "20px",
      "--flight-peak-x": "-3px",
      "--flight-peak-y": "-40px",
      "--flight-start-scale": "0.5",
      "--flight-start-rotate": "-6deg",
      "--flight-peak-rotate": "-2deg",
    });
  });
});

describe("shuffleFinishDelayMs", () => {
  it("still shuffles a full round after a quick tap", () => {
    expect(shuffleFinishDelayMs(0)).toBe(SHUFFLE_MS);
    expect(shuffleFinishDelayMs(200)).toBe(SHUFFLE_MS - 200);
  });

  it("finishes the riffle in progress after a long hold", () => {
    const held = SHUFFLE_MS * 2 + 100;

    expect(shuffleFinishDelayMs(held)).toBe(RIFFLE_MS - (held % RIFFLE_MS));
  });

  it("stops at once when let go exactly between riffles", () => {
    expect(shuffleFinishDelayMs(RIFFLE_MS * 4)).toBe(0);
  });
});

describe("landingDelayMs", () => {
  it("lands the jumper after the chosen card", () => {
    expect(landingDelayMs("primary")).toBe(FLIGHT_MS);
    expect(landingDelayMs("jumper")).toBe(JUMPER_DELAY_MS + FLIGHT_MS);
  });
});
