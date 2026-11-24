import { describe, expect, it } from "vitest";
import { BUILT_IN_TEMPLATES } from "@/domain/spread/templates";
import {
  createInitialState,
  createSpreadReducer,
} from "@/presentation/components/spread/spreadState";

function counter() {
  let next = 0;
  return () => `id-${(next += 1)}`;
}

describe("hydrate", () => {
  const reduce = createSpreadReducer(counter());
  const start = createInitialState(counter());

  it("starts from the chapter's spread when one is named", () => {
    const state = reduce(start, {
      type: "hydrate",
      library: BUILT_IN_TEMPLATES,
      templateId: "five-card",
    });
    expect(state.spread.templateId).toBe("five-card");
    expect(state.spread.positions).toHaveLength(5);
  });

  it("starts from the library's first spread when none is named", () => {
    const state = reduce(start, {
      type: "hydrate",
      library: BUILT_IN_TEMPLATES,
    });
    expect(state.spread.templateId).toBe(BUILT_IN_TEMPLATES[0]!.id);
  });

  it("falls back to the first spread when the named one was deleted", () => {
    const state = reduce(start, {
      type: "hydrate",
      library: BUILT_IN_TEMPLATES,
      templateId: "no-longer-here",
    });
    expect(state.spread.templateId).toBe(BUILT_IN_TEMPLATES[0]!.id);
  });
});

describe("clear", () => {
  it("starts the chapter's spread again, not the library's first", () => {
    const reduce = createSpreadReducer(counter());
    const hydrated = reduce(createInitialState(counter()), {
      type: "hydrate",
      library: BUILT_IN_TEMPLATES,
      templateId: "circle",
    });
    const cleared = reduce(hydrated, { type: "clear" });
    expect(cleared.spread.templateId).toBe("circle");
    expect(cleared.notice?.text).toBe("已清除本次牌陣，重新從「圓環」開始。");
  });

  it("starts the library's first spread outside a chapter", () => {
    const reduce = createSpreadReducer(counter());
    const hydrated = reduce(createInitialState(counter()), {
      type: "hydrate",
      library: BUILT_IN_TEMPLATES,
    });
    const cleared = reduce(hydrated, { type: "clear" });
    expect(cleared.spread.templateId).toBe(BUILT_IN_TEMPLATES[0]!.id);
  });
});
