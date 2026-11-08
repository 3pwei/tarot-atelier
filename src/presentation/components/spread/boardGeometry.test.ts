import { describe, expect, it } from "vitest";
import { BUILT_IN_TEMPLATES } from "@/domain/spread/templates";
import {
  cardsOverlap,
  overlappingPairs,
  SLOT_WIDTH_CQW,
} from "@/presentation/components/spread/boardGeometry";

/** The card width before cards were enlarged (2026-11-08). */
const PREVIOUS_SLOT_WIDTH_CQW = 11;

describe("board geometry", () => {
  it("tells overlapping cards from cards side by side", () => {
    const centre = { x: 0.5, y: 0.5, rotation: 0 };
    expect(cardsOverlap(centre, { x: 0.52, y: 0.5, rotation: 0 }, 14)).toBe(
      true,
    );
    expect(cardsOverlap(centre, { x: 0.8, y: 0.5, rotation: 0 }, 14)).toBe(
      false,
    );
  });

  it("accounts for rotation", () => {
    // Side by side upright, but a quarter turn reaches across.
    const left = { x: 0.4, y: 0.5, rotation: 0 };
    const right = { x: 0.52, y: 0.5, rotation: 0 };
    expect(cardsOverlap(left, right, 10)).toBe(false);
    expect(cardsOverlap(left, { ...right, rotation: 90 }, 10)).toBe(true);
  });

  it.each(BUILT_IN_TEMPLATES.map((template) => [template.name, template]))(
    "makes no new overlaps in the built-in %s spread at the current card size",
    (_, template) => {
      const before = overlappingPairs(
        template.positions,
        PREVIOUS_SLOT_WIDTH_CQW,
      );
      const now = overlappingPairs(template.positions, SLOT_WIDTH_CQW);
      expect(now.filter((pair) => !before.includes(pair))).toEqual([]);
    },
  );
});
