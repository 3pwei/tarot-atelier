import { describe, expect, it } from "vitest";
import {
  CARD_ASPECT,
  cardGrid,
  columnsFor,
  wrapText,
} from "@/presentation/components/share/shareImageLayout";

const area = { x: 80, y: 300, width: 920, height: 640 };

describe("share image card grid", () => {
  it.each([
    [1, 1],
    [3, 3],
    [4, 4],
    [5, 3],
    [6, 3],
    [8, 4],
    [12, 4],
  ])("puts %i cards in %i columns", (count, columns) => {
    expect(columnsFor(count)).toBe(columns);
  });

  it("keeps the 2:3 face and fits every card inside the area", () => {
    for (const count of [1, 3, 5, 8, 12]) {
      const grid = cardGrid({ count, area, gap: 28, captionHeight: 76 });
      expect(grid.faces).toHaveLength(count);
      expect(grid.cardHeight).toBe(Math.floor(grid.cardWidth * CARD_ASPECT));
      for (const face of grid.faces) {
        expect(face.x).toBeGreaterThanOrEqual(area.x);
        expect(face.x + face.width).toBeLessThanOrEqual(area.x + area.width);
        expect(face.y).toBeGreaterThanOrEqual(area.y);
        expect(face.y + face.height + 76).toBeLessThanOrEqual(
          area.y + area.height + 0.5,
        );
      }
    }
  });

  it("centres a short last row", () => {
    const grid = cardGrid({ count: 5, area, gap: 28, captionHeight: 76 });
    const [, , , fourth, fifth] = grid.faces;
    const centre = area.x + area.width / 2;
    expect(((fourth?.x ?? 0) + (fifth?.x ?? 0) + grid.cardWidth) / 2).toBe(
      centre,
    );
  });
});

describe("wrapping text by character", () => {
  const measure = (text: string) => Array.from(text).length * 10;

  it("breaks Chinese text without spaces at the width", () => {
    expect(
      wrapText({ text: "一二三四五六七", maxWidth: 30, maxLines: 5, measure }),
    ).toEqual(["一二三", "四五六", "七"]);
  });

  it("ends the last allowed line with an ellipsis", () => {
    expect(
      wrapText({ text: "一二三四五六七", maxWidth: 30, maxLines: 2, measure }),
    ).toEqual(["一二三", "四五…"]);
  });

  it("starts a new line at a line break", () => {
    expect(
      wrapText({ text: "一\n二", maxWidth: 100, maxLines: 5, measure }),
    ).toEqual(["一", "二"]);
  });
});
