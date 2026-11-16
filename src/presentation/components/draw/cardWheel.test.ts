import { describe, expect, it } from "vitest";
import {
  CARD_SPACING_PX,
  cardAngle,
  clampTurn,
  turnByDrag,
  turnToShow,
  wheelLayout,
} from "@/presentation/components/draw/cardWheel";

const desktop = wheelLayout({ width: 1100, height: 733, count: 78 });
const phone = wheelLayout({ width: 340, height: 227, count: 78 });

describe("wheelLayout", () => {
  it("fits the whole deck on a wide table, so the wheel never turns", () => {
    expect(desktop.maxTurn).toBe(0);
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

  it("lays the arc's top card along the bottom edge, fully on the table", () => {
    const topCardCentre = phone.centerY - phone.radius;

    expect(topCardCentre + phone.cardHeight / 2).toBeLessThanOrEqual(227);
    expect(topCardCentre - phone.cardHeight / 2).toBeGreaterThan(
      227 - phone.cardHeight * 1.2,
    );
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
    expect(turnByDrag(desktop, 0, 300)).toBe(0);
  });
});
