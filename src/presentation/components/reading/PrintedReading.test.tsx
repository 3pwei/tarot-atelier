import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  READING_SCHEMA_VERSION,
  type CardReading,
  type ReadingResult,
} from "@/domain/reading/types";
import { PrintedReading } from "@/presentation/components/reading/PrintedReading";

const card = (
  cardName: string,
  meaningMode: CardReading["meaningMode"],
): CardReading => ({
  cardId: cardName,
  cardName,
  orientation: meaningMode === "reversed" ? "reversed" : "upright",
  meaningMode,
  symbolism: `${cardName}的象徵。`,
  interpretation: `${cardName}在這裡的意思。`,
});

const RESULT: ReadingResult = {
  schemaVersion: READING_SCHEMA_VERSION,
  deckId: "standard",
  source: "ai",
  positions: [
    { index: 1, question: "核心是什麼？", primary: card("皇后", "reversed") },
    {
      index: 2,
      question: "下一步？",
      primary: card("聖杯三", "upright"),
      jumper: card("權杖一", "upright"),
    },
  ],
  synthesis: "整體來看。",
  reflectionQuestions: ["想想看？"],
  suggestions: ["可以試試。"],
  sensitiveTopics: [],
};

function renderReading() {
  render(
    <PrintedReading result={RESULT} positionNames={new Map([[1, "核心"]])} />,
  );
}

describe("PrintedReading", () => {
  it("heads each position with its short name, card and orientation", () => {
    renderReading();
    expect(
      screen.getByRole("heading", { name: "牌位 1：核心皇后逆位" }),
    ).toBeInTheDocument();
    // A position without a short name is headed by its card alone.
    expect(
      screen.getByRole("heading", { name: "牌位 2：聖杯三正位" }),
    ).toBeInTheDocument();
  });

  it("prints a card's symbolism and its meaning here as one paragraph", () => {
    renderReading();
    expect(
      screen.getByText("皇后的象徵。皇后在這裡的意思。"),
    ).toBeInTheDocument();
  });

  it("adds the jumper's message after its position's card", () => {
    renderReading();
    expect(
      screen.getByText(/^跳牌補充・權杖一（正位）：權杖一在這裡的意思。$/u),
    ).toHaveClass("printed-reading__jumper");
  });

  it("ends with the spread as a whole, every part open", () => {
    renderReading();
    for (const heading of ["全局關聯", "反思問題", "可以考慮的做法"])
      expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    expect(screen.getByText("想想看？")).toBeVisible();
    expect(screen.getByText("可以試試。")).toBeVisible();
  });
});
