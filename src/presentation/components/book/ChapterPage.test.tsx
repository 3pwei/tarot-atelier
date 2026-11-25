import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestServices } from "@/composition/testing/createTestServices";
import { chapter } from "@/presentation/components/book/bookPlace";
import { ChapterPage } from "@/presentation/components/book/ChapterPage";
import type { ContentsEntry } from "@/presentation/components/book/contents";
import type { TurnDirection } from "@/presentation/components/book/turning/turnPlan";
import type { LeafPrints } from "@/presentation/components/book/turning/usePageTurns";
import {
  openReading,
  ready,
  revealAll,
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

/**
 * A chapter on facing pages in a book whose leaf turns land when `land` is
 * called, recording each turn's direction.
 */
function renderChapter() {
  const turns: TurnDirection[] = [];
  const prints: LeafPrints[] = [];
  let landLeaf: (() => void) | undefined;

  function Book() {
    const [leafTurning, setLeafTurning] = useState(false);
    landLeaf = () => setLeafTurning(false);
    return (
      <ChapterPage
        entry={ENTRY}
        templateId="three-card"
        layout="facing-pages"
        turnLeaf={(direction, printed) => {
          turns.push(direction);
          prints.push(printed);
          setLeafTurning(true);
        }}
        leafTurning={leafTurning}
        onBack={vi.fn()}
      />
    );
  }

  render(
    <AtelierServicesProvider services={createTestServices()}>
      <Book />
    </AtelierServicesProvider>,
  );
  const land = () => act(() => landLeaf?.());
  return { turns, prints, land };
}

async function finishTable() {
  await ready();
  await shuffleAndPick();
  revealAll(3);
  await screen.findByText("牌陣已完成", undefined, { timeout: 5000 });
}

// Each test plays a whole round on the table first.
describe("ChapterPage on facing pages", { timeout: 15_000 }, () => {
  it("turns a leaf forward to the reading, and shows it once the leaf lands", async () => {
    const { turns, land } = renderChapter();
    await finishTable();
    openReading();

    expect(turns).toEqual(["forward"]);
    // The table stays until the leaf has landed over it.
    expect(screen.queryByRole("heading", { name: "Card Reading" })).toBeNull();
    land();
    expect(screen.getByRole("heading", { name: "Card Reading" })).toHaveFocus();
    expect(screen.getByText(/The Three Cards · Card Reading/u)).toBeVisible();
  });

  it("turns a leaf back from the reading to the cards", async () => {
    const { turns, land } = renderChapter();
    await finishTable();
    openReading();
    land();

    fireEvent.click(screen.getByRole("button", { name: "回到牌陣" }));
    expect(turns).toEqual(["forward", "back"]);
    land();
    expect(screen.queryByRole("heading", { name: "Card Reading" })).toBeNull();
    expect(
      screen.getByRole("heading", { name: "The Three Cards" }),
    ).toHaveFocus();
  });

  it("prints the pages on the leaf: the reading drawn still, the table cloned", async () => {
    const { prints, land } = renderChapter();
    await finishTable();
    openReading();
    land();
    fireEvent.click(screen.getByRole("button", { name: "回到牌陣" }));

    const [toReading, toCards] = prints;
    // The reading's page, whole: running head, title and reading.
    const { container: reading } = render(<>{toReading?.arriving}</>);
    expect(reading).toHaveTextContent("The Three Cards · Card Reading");
    expect(reading).toHaveTextContent("塔羅解讀僅供娛樂");
    // The live table is cloned as it is left, and that copy turns back.
    const { container: table } = render(<>{toCards?.arriving}</>);
    expect(table.querySelector(".cloned-page .draw-experience")).not.toBeNull();
    expect(table).toHaveTextContent("牌陣已完成");
    expect(toReading?.leaving).toBeDefined();
  });
});
