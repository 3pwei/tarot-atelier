import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeckLibrary } from "@/presentation/components/DeckLibrary";

describe("DeckLibrary", () => {
  it("browses all 78 standard tarot definitions", () => {
    render(<DeckLibrary />);

    expect(screen.getAllByTestId("catalog-card")).toHaveLength(78);
    expect(screen.getByText("78 張定義")).toBeInTheDocument();
  });

  it("switches to the test deck and exposes an explicit art fallback", () => {
    render(<DeckLibrary />);

    fireEvent.change(screen.getByLabelText("目前牌組"), {
      target: { value: "phase-one-test-deck" },
    });

    expect(screen.getAllByTestId("catalog-card")).toHaveLength(3);
    expect(screen.getAllByLabelText("卡圖素材缺失").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "逆位" })).toBeDisabled();
  });

  it("shows the card back without changing stable identity", () => {
    render(<DeckLibrary />);
    const stableId = screen.getByText(/ID · atelier-standard.major.00/u);

    fireEvent.click(screen.getByRole("button", { name: "牌背" }));

    expect(screen.getByLabelText("星盤牌背")).toBeInTheDocument();
    expect(stableId).toBeInTheDocument();
  });
});
