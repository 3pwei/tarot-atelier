import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestServices } from "@/composition/testing/createTestServices";
import { chapter } from "@/presentation/components/book/bookPlace";
import { ChapterPage } from "@/presentation/components/book/ChapterPage";
import type { ContentsEntry } from "@/presentation/components/book/contents";
import type { TurnDirection } from "@/presentation/components/book/turning/turnPlan";
import {
  openReading,
  ready,
  reveal,
  shuffleAndPick,
} from "@/presentation/components/testing/playTable";
import { AtelierServicesProvider } from "@/presentation/services/atelierServices";

const ENTRY: ContentsEntry = {
  place: chapter("three-card"),
  numeral: "I",
  title: "The Three Cards",
  titleLanguage: "en",
  page: 3,
  section: "spreads",
};

beforeEach(() => {
  // No motion, so the table deals at once.
  vi.stubGlobal(
    "matchMedia",
    vi.fn((media: string) => ({
      matches: true,
      media,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

/** A chapter on facing pages, whose leaf turns land when `land` is called. */
function renderChapter() {
  const turns: TurnDirection[] = [];
  let landing: (() => void) | undefined;
  const turnLeaf = vi.fn((direction: TurnDirection) => {
    turns.push(direction);
    return new Promise<void>((resolve) => {
      landing = resolve;
    });
  });
  render(
    <AtelierServicesProvider services={createTestServices()}>
      <ChapterPage
        entry={ENTRY}
        templateId="three-card"
        layout="facing-pages"
        turnLeaf={turnLeaf}
        onBack={vi.fn()}
      />
    </AtelierServicesProvider>,
  );
  const land = () => act(async () => landing?.());
  return { turns, land };
}

async function finishTable() {
  await ready();
  await shuffleAndPick();
  [1, 2, 3].forEach((index) => reveal(index));
  // Revealing waits for each card to land; a busy test machine is slower.
  await screen.findByText("牌陣已完成", undefined, { timeout: 5000 });
}

describe("ChapterPage on facing pages", () => {
  it("turns a leaf forward to the reading, and shows it once the leaf lands", async () => {
    const { turns, land } = renderChapter();
    await finishTable();
    openReading();

    expect(turns).toEqual(["forward"]);
    // The table stays until the leaf has landed over it.
    expect(screen.queryByRole("heading", { name: "Card Reading" })).toBeNull();
    await land();
    expect(screen.getByRole("heading", { name: "Card Reading" })).toHaveFocus();
    expect(screen.getByText(/The Three Cards · Card Reading/u)).toBeVisible();
  });

  it("turns a leaf back from the reading to the cards", async () => {
    const { turns, land } = renderChapter();
    await finishTable();
    openReading();
    await land();

    fireEvent.click(screen.getByRole("button", { name: "回到牌陣" }));
    expect(turns).toEqual(["forward", "back"]);
    await land();
    expect(screen.queryByRole("heading", { name: "Card Reading" })).toBeNull();
    expect(
      screen.getByRole("heading", { name: "The Three Cards" }),
    ).toHaveFocus();
  });
});
