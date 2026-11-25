import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReadingSpread } from "@/presentation/components/reading/ReadingSpread";

/** Lays the reading's flow out `spreads` spreads wide, each 1000px. */
function flowOf(spreads: number) {
  const spread = 1000;
  const gap = 100;
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(spread);
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(
    spreads * spread + (spreads - 1) * gap,
  );
  const computed = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
    const style = computed(element);
    style.columnGap = `${gap}px`;
    return style;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

function renderSpread(page: number, onPage = vi.fn()) {
  render(
    <ReadingSpread page={page} onPage={onPage}>
      <p>解讀</p>
    </ReadingSpread>,
  );
  return onPage;
}

describe("ReadingSpread", () => {
  it("offers no page turn for a reading that fits one spread", () => {
    flowOf(1);
    renderSpread(0);
    expect(screen.queryByRole("button", { name: "下一頁" })).toBeNull();
    expect(screen.queryByRole("button", { name: "上一頁" })).toBeNull();
  });

  it("turns on to the next spread of a long reading", () => {
    flowOf(2);
    const onPage = renderSpread(0);
    expect(screen.queryByRole("button", { name: "上一頁" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "下一頁" }));
    expect(onPage).toHaveBeenCalledWith(1);
  });

  it("turns back from the last spread, with nothing further to turn to", () => {
    flowOf(2);
    const onPage = renderSpread(1);
    expect(screen.queryByRole("button", { name: "下一頁" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "上一頁" }));
    expect(onPage).toHaveBeenCalledWith(0);
  });

  it("shows the last spread when the reading has grown shorter", () => {
    flowOf(2);
    renderSpread(5);
    const flow = document.querySelector<HTMLElement>(".reading-spread__flow");
    expect(flow?.style.getPropertyValue("--reading-spread")).toBe("1");
  });

  it("moves the focus to a spread turned to, named by its number", () => {
    flowOf(2);
    const { rerender } = render(
      <ReadingSpread page={0} onPage={vi.fn()}>
        <p>解讀</p>
      </ReadingSpread>,
    );
    expect(document.body).toHaveFocus();
    rerender(
      <ReadingSpread page={1} onPage={vi.fn()}>
        <p>解讀</p>
      </ReadingSpread>,
    );
    expect(
      screen.getByRole("group", { name: "解讀 第 2／2 頁" }),
    ).toHaveFocus();
  });
});
