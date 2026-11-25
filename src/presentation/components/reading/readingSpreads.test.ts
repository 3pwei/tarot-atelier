import { describe, expect, it } from "vitest";
import {
  spreadCount,
  spreadWithin,
} from "@/presentation/components/reading/readingSpreads";

describe("spreadCount", () => {
  const spread = 1000;
  const gap = 100;

  it("counts one spread for a reading that fits its two columns", () => {
    expect(spreadCount(1000, spread, gap)).toBe(1);
    expect(spreadCount(400, spread, gap)).toBe(1);
  });

  it("counts each spread its columns run on to", () => {
    // Two more columns of 450 (and their gaps) make a second spread.
    expect(spreadCount(1000 + 100 + 450, spread, gap)).toBe(2);
    expect(spreadCount(2100, spread, gap)).toBe(2);
    expect(spreadCount(2100 + 100 + 450, spread, gap)).toBe(3);
  });

  it("never makes a spread of a rounding pixel", () => {
    expect(spreadCount(1001, spread, gap)).toBe(1);
  });

  it("counts one spread before the pages are laid out", () => {
    expect(spreadCount(0, 0, gap)).toBe(1);
  });
});

describe("spreadWithin", () => {
  it("keeps a page inside a reading that got shorter", () => {
    expect(spreadWithin(3, 2)).toBe(1);
    expect(spreadWithin(-1, 2)).toBe(0);
    expect(spreadWithin(1, 2)).toBe(1);
  });
});
