import { describe, expect, it } from "vitest";
import { BUILT_IN_TEMPLATES } from "@/domain/spread/templates";
import {
  cardsOverlap,
  LARGEST_SLOT_WIDTH_CQW,
  LAYOUT_SLOT_WIDTH_CQW,
  overlappingPairs,
  slotWidthFor,
  STANDARD_SLOT_WIDTH_CQW,
} from "@/presentation/components/spread/boardGeometry";

function template(id: string) {
  const found = BUILT_IN_TEMPLATES.find((item) => item.id === id);
  if (!found) throw new Error(`no built-in template ${id}`);
  return found;
}

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
    "makes no new overlaps in the built-in %s spread at its card size",
    (_, spread) => {
      const before = overlappingPairs(spread.positions, LAYOUT_SLOT_WIDTH_CQW);
      const now = overlappingPairs(
        spread.positions,
        slotWidthFor(spread.positions),
      );
      expect(now.filter((pair) => !before.includes(pair))).toEqual([]);
    },
  );
});

describe("slotWidthFor", () => {
  it("enlarges cards 1.5 times when the spread has room", () => {
    expect(slotWidthFor(template("three-card").positions)).toBe(
      LARGEST_SLOT_WIDTH_CQW,
    );
    expect(LARGEST_SLOT_WIDTH_CQW).toBe(STANDARD_SLOT_WIDTH_CQW * 1.5);
  });

  it("shrinks cards just enough when the spread has no room for 1.5 times", () => {
    const cross = template("five-card").positions;
    const width = slotWidthFor(cross);
    expect(width).toBeLessThan(LARGEST_SLOT_WIDTH_CQW);
    expect(width).toBeGreaterThanOrEqual(STANDARD_SLOT_WIDTH_CQW);
    expect(slotWidthFor(cross)).toBe(width);
  });

  it("never goes below the standard size, even for a crowded layout", () => {
    const stacked = [
      { x: 0.5, y: 0.5, rotation: 0 },
      { x: 0.53, y: 0.5, rotation: 0 },
    ];
    expect(slotWidthFor(stacked)).toBeGreaterThanOrEqual(
      STANDARD_SLOT_WIDTH_CQW,
    );
  });

  it("keeps a single card at the largest size", () => {
    expect(slotWidthFor([{ x: 0.5, y: 0.5, rotation: 0 }])).toBe(
      LARGEST_SLOT_WIDTH_CQW,
    );
  });
});
