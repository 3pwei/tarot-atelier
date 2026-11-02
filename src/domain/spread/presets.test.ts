import { describe, expect, it } from "vitest";
import {
  createSpreadFromPreset,
  SPREAD_PRESETS,
} from "@/domain/spread/presets";
import { isSpreadReady } from "@/domain/spread/spread";
import { MAX_SPREAD_POSITIONS } from "@/domain/spread/types";

function counter() {
  let next = 0;
  return () => `id-${(next += 1)}`;
}

describe("spread presets", () => {
  it.each([
    ["three-card", 3],
    ["five-card", 5],
    ["circle", 8],
  ] as const)("%s has %i ready-to-draw positions", (presetId, count) => {
    const spread = createSpreadFromPreset({ presetId, createId: counter() });

    expect(spread.positions).toHaveLength(count);
    expect(spread.positions.map((p) => p.index)).toEqual(
      Array.from({ length: count }, (_, order) => order + 1),
    );
    expect(isSpreadReady(spread)).toBe(true);
  });

  it("starts the custom mode empty", () => {
    const spread = createSpreadFromPreset({
      presetId: "custom",
      createId: counter(),
    });
    expect(spread.positions).toHaveLength(0);
    expect(isSpreadReady(spread)).toBe(false);
  });

  it("keeps every preset within the table and the position limit", () => {
    for (const preset of SPREAD_PRESETS) {
      expect(preset.positions.length).toBeLessThanOrEqual(MAX_SPREAD_POSITIONS);
      for (const position of preset.positions) {
        expect(position.x).toBeGreaterThanOrEqual(0);
        expect(position.x).toBeLessThanOrEqual(1);
        expect(position.y).toBeGreaterThanOrEqual(0);
        expect(position.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it("uses fresh, unique IDs for the spread and every position", () => {
    const spread = createSpreadFromPreset({
      presetId: "circle",
      createId: counter(),
    });
    const ids = [spread.id, ...spread.positions.map((p) => p.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
