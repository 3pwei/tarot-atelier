import { describe, expect, it } from "vitest";
import {
  CARD_SPACING_PX,
  CARD_SPACING_SHARE,
  cardAngle,
  NUDGE_SHARE,
  VISIBLE_SHARE,
  clampTurn,
  turnByDrag,
  turnToShow,
  wheelLayout,
} from "@/presentation/components/draw/cardWheel";

/** Cards as wide as the positions: 14% of the table. */
const desktop = wheelLayout({
  width: 1100,
  height: 733,
  count: 78,
  cardWidth: 154,
});
const phone = wheelLayout({
  width: 340,
  height: 227,
  count: 78,
  cardWidth: 48,
});
const fewCards = wheelLayout({
  width: 1100,
  height: 733,
  count: 12,
  cardWidth: 154,
});

describe("wheelLayout", () => {
  it("draws its cards exactly as large as the positions' cards", () => {
    expect(desktop.cardWidth).toBe(154);
    expect(desktop.cardHeight).toBe(231);
  });

  it("fits a short arc whole, so the wheel never turns", () => {
    expect(fewCards.maxTurn).toBe(0);
  });

  it("turns on a wide table too once full-size cards no longer fit", () => {
    expect(desktop.maxTurn).toBeGreaterThan(0);
  });

  it("slides a chosen card forward by a share of its height", () => {
    expect(desktop.nudge).toBeCloseTo(desktop.cardHeight * NUDGE_SHARE);
    // A chosen card stands out by at least a fifth of its height.
    expect(NUDGE_SHARE).toBeGreaterThanOrEqual(0.2);
  });

  it("lets a narrow table turn the wheel to reach every card", () => {
    expect(phone.maxTurn).toBeGreaterThan(0);
    const lastCard = cardAngle(phone, 77, 78);
    expect(turnToShow(phone, 77, 78)).toBeCloseTo(-phone.maxTurn);
    expect(lastCard + turnToShow(phone, 77, 78)).toBeGreaterThan(0);
  });

  it("keeps neighbouring cards a fingertip apart along the rim", () => {
    const rim = (phone.step * Math.PI * phone.radius) / 180;

    expect(rim).toBeCloseTo(CARD_SPACING_PX);
  });

  it("lets larger cards show a little more of themselves", () => {
    const rim = (desktop.step * Math.PI * desktop.radius) / 180;

    expect(rim).toBeCloseTo(desktop.cardWidth * CARD_SPACING_SHARE);
  });

  it("shows the upper part of the arc's top card above the bottom edge", () => {
    for (const [layout, height] of [
      [phone, 227],
      [desktop, 733],
    ] as const) {
      const topEdge = layout.centerY - layout.radius - layout.cardHeight / 2;
      expect(height - topEdge).toBeCloseTo(layout.cardHeight * VISIBLE_SHARE);
    }
  });
});

describe("turning the wheel", () => {
  it("puts the middle card at the top before turning", () => {
    expect(cardAngle(phone, 0, 3)).toBeCloseTo(-phone.step);
    expect(cardAngle(phone, 1, 3)).toBe(0);
  });

  it("follows a sideways drag and stops at either end", () => {
    expect(turnByDrag(phone, 0, 0)).toBe(0);
    expect(turnByDrag(phone, 0, 50)).toBeGreaterThan(0);
    expect(turnByDrag(phone, 0, 100_000)).toBe(phone.maxTurn);
    expect(clampTurn(phone, -1_000)).toBe(-phone.maxTurn);
  });

  it("does not turn a wheel that already shows every card", () => {
    expect(turnByDrag(fewCards, 0, 300)).toBe(0);
  });
});
