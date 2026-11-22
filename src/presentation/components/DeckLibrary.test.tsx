import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { registerBuiltInDecks } from "@/application/use-cases/createDeckLibrary";
import { createTestServices } from "@/composition/testing/createTestServices";
import { phaseOneTestDeck } from "@/domain/deck/testing/testDeck";
import { InMemoryDeckRegistry } from "@/infrastructure/decks/inMemoryDeckRegistry";
import { DeckLibrary } from "@/presentation/components/DeckLibrary";
import { AtelierServicesProvider } from "@/presentation/services/atelierServices";

function renderLibrary(
  registry = registerBuiltInDecks(new InMemoryDeckRegistry()),
) {
  return render(
    <AtelierServicesProvider services={createTestServices({ registry })}>
      <DeckLibrary />
    </AtelierServicesProvider>,
  );
}

describe("DeckLibrary", () => {
  it("browses all 78 standard tarot definitions", () => {
    renderLibrary();

    expect(screen.getAllByTestId("catalog-card")).toHaveLength(78);
    expect(screen.getByText("78 張定義")).toBeInTheDocument();
  });

  it("names the only deck instead of offering a choice", () => {
    renderLibrary();

    expect(screen.queryByLabelText("目前牌組")).not.toBeInTheDocument();
    expect(screen.getByText("工坊標準塔羅")).toBeInTheDocument();
  });

  it("switches between registered decks and exposes an explicit art fallback", () => {
    const registry = registerBuiltInDecks(new InMemoryDeckRegistry());
    registry.register(phaseOneTestDeck);
    renderLibrary(registry);

    fireEvent.change(screen.getByLabelText("目前牌組"), {
      target: { value: phaseOneTestDeck.id },
    });

    expect(screen.getAllByTestId("catalog-card")).toHaveLength(3);
    expect(screen.getAllByLabelText("卡圖素材缺失").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "逆位" })).toBeDisabled();
  });

  it("shows the card back without changing stable identity", () => {
    renderLibrary();
    const stableId = screen.getByText(/ID · atelier-standard.major.00/u);

    fireEvent.click(screen.getByRole("button", { name: "牌背" }));

    expect(screen.getByLabelText("星盤牌背")).toBeInTheDocument();
    expect(stableId).toBeInTheDocument();
  });
});
