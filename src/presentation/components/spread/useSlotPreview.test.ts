import { describe, expect, it } from "vitest";
import {
  angleLabel,
  clampToTable,
  previewTranslate,
} from "@/presentation/components/spread/useSlotPreview";

describe("previewTranslate", () => {
  it("offsets by the distance in field pixels", () => {
    expect(
      previewTranslate(
        { x: 0.5, y: 0.5 },
        { x: 0.25, y: 0.75 },
        { width: 800, height: 400 },
      ),
    ).toBe("-200px 100px");
  });

  it("is no offset when the point has not moved", () => {
    expect(
      previewTranslate(
        { x: 0.3, y: 0.6 },
        { x: 0.3, y: 0.6 },
        { width: 800, height: 400 },
      ),
    ).toBe("0px 0px");
  });
});

describe("clampToTable", () => {
  it("keeps a dragged point on the table, as the spread will", () => {
    expect(clampToTable({ x: -0.2, y: 1.4 })).toEqual({ x: 0, y: 1 });
  });
});

describe("angleLabel", () => {
  it("shows the angle the position will keep", () => {
    expect(angleLabel(-90)).toBe("270°");
    expect(angleLabel(45.4)).toBe("45°");
  });
});
