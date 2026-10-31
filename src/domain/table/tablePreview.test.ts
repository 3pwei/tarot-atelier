import { describe, expect, it } from "vitest";
import { createEmptyTablePreview } from "./tablePreview";

describe("createEmptyTablePreview", () => {
  it("never advertises unfinished interaction", () => {
    expect(createEmptyTablePreview()).toEqual({
      status: "empty",
      cardCount: 0,
      isInteractive: false,
    });
  });
});
