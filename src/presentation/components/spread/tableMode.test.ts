import { describe, expect, it } from "vitest";
import { tableAbilities } from "@/presentation/components/spread/tableMode";

describe("tableAbilities", () => {
  it("plays but never arranges in play mode", () => {
    expect(tableAbilities("play", false)).toEqual({
      canArrange: false,
      canPlay: true,
      canToggleArrange: true,
    });
  });

  it("arranges but never plays in arrange mode", () => {
    expect(tableAbilities("arrange", false)).toEqual({
      canArrange: true,
      canPlay: false,
      canToggleArrange: true,
    });
  });

  it("freezes the layout and the mode while the deck shuffles or cards fly", () => {
    expect(tableAbilities("play", true)).toMatchObject({
      canArrange: false,
      canToggleArrange: false,
    });
    expect(tableAbilities("arrange", true).canArrange).toBe(false);
  });
});
