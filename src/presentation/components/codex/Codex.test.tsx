import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { registerBuiltInDecks } from "@/application/use-cases/createDeckLibrary";
import { createTestServices } from "@/composition/testing/createTestServices";
import { phaseOneTestDeck } from "@/domain/deck/testing/testDeck";
import { InMemoryDeckRegistry } from "@/infrastructure/decks/inMemoryDeckRegistry";
import type { PageLayout } from "@/presentation/components/book/pageLayout";
import { Codex } from "@/presentation/components/codex/Codex";
import { AtelierServicesProvider } from "@/presentation/services/atelierServices";

function renderCodex(
  registry = registerBuiltInDecks(new InMemoryDeckRegistry()),
  layout: PageLayout = "facing-pages",
) {
  return render(
    <AtelierServicesProvider services={createTestServices({ registry })}>
      <Codex layout={layout} />
    </AtelierServicesProvider>,
  );
}

const thumbnails = () => screen.getAllByTestId("catalog-card");
const tab = (name: string) => screen.getByRole("button", { name });

describe("Codex", () => {
  it("shows the standard deck a section at a time, all 78 cards between them", () => {
    renderCodex();

    expect(tab("大牌")).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "全部" })).toBeNull();
    const counts = ["大牌", "權杖", "聖杯", "寶劍", "錢幣"].map((name) => {
      fireEvent.click(tab(name));
      expect(screen.getByText(`${thumbnails().length} 張`)).toBeVisible();
      return thumbnails().length;
    });
    expect(counts).toEqual([22, 14, 14, 14, 14]);
  });

  it("reads the chosen card on the facing page, with both its meanings", () => {
    renderCodex();
    fireEvent.click(tab("權杖"));
    const [first] = thumbnails();
    if (!first) throw new Error("no wands");
    fireEvent.click(first);

    expect(first).toHaveAttribute("aria-pressed", "true");
    const card = screen.getByRole("region", { name: "單卡檢視" });
    expect(within(card).getByRole("heading", { level: 2 })).toHaveTextContent(
      "權杖一",
    );
    expect(within(card).getByText("正位")).toBeVisible();
    expect(within(card).getByText("逆位")).toBeVisible();
  });

  it("names the only deck instead of offering a choice", () => {
    renderCodex();

    expect(screen.queryByLabelText("目前牌組")).not.toBeInTheDocument();
    expect(screen.getByText(/工坊標準塔羅/u)).toBeInTheDocument();
  });

  it("switches between registered decks and exposes an explicit art fallback", () => {
    const registry = registerBuiltInDecks(new InMemoryDeckRegistry());
    registry.register(phaseOneTestDeck);
    renderCodex(registry);

    fireEvent.change(screen.getByLabelText("目前牌組"), {
      target: { value: phaseOneTestDeck.id },
    });

    // A deck of its own is shown whole, without the standard sections.
    expect(screen.queryByRole("button", { name: "大牌" })).toBeNull();
    expect(thumbnails()).toHaveLength(3);
    expect(screen.getAllByLabelText("卡圖素材缺失").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "逆位" })).toBeDisabled();
  });

  it("turns the card over to its back and keeps reading the same card", () => {
    renderCodex();
    fireEvent.click(screen.getByRole("button", { name: "牌背" }));

    expect(screen.getByLabelText("星盤牌背")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "牌背" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      within(screen.getByRole("region", { name: "單卡檢視" })).getByRole(
        "heading",
        { level: 2 },
      ),
    ).toHaveTextContent("愚者");
  });

  it("lays out the same way under one another on a phone", () => {
    const { container } = renderCodex(undefined, "single-page");
    expect(container.querySelector(".codex")).toHaveAttribute(
      "data-layout",
      "single-page",
    );
    expect(thumbnails()).toHaveLength(22);
  });
});
