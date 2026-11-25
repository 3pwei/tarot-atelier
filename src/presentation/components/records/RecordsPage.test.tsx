import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { registerBuiltInDecks } from "@/application/use-cases/createDeckLibrary";
import {
  attachReading,
  recordRound,
  type ReadingHistory,
  type ReadingRecord,
} from "@/domain/history/readingHistory";
import {
  FIXTURE_DECK_ID,
  fixtureDraw,
  fixtureReading,
  fixtureSpread,
} from "@/domain/history/testing/historyFixtures";
import { InMemoryDeckRegistry } from "@/infrastructure/decks/inMemoryDeckRegistry";
import { PrewrittenReadingProvider } from "@/infrastructure/reading/prewrittenReadingProvider";
import type { ReadingProvider } from "@/application/ports/readingProvider";
import { MemoryTextStorage } from "@/application/testing/memoryTextStorage";
import { saveReadingHistory } from "@/application/use-cases/readingHistory";
import { createTestServices } from "@/composition/testing/createTestServices";
import { RECORDS } from "@/presentation/components/book/bookPlace";
import type { ContentsEntry } from "@/presentation/components/book/contents";
import type { PageLayout } from "@/presentation/components/book/pageLayout";
import { RecordsPage } from "@/presentation/components/book/RecordsPage";
import type { TurnDirection } from "@/presentation/components/book/turning/turnPlan";
import { fakeShareServices } from "@/presentation/components/share/testing/fakeShareServices";
import { AtelierServicesProvider } from "@/presentation/services/atelierServices";
import { useState } from "react";

const registry = registerBuiltInDecks(new InMemoryDeckRegistry());

function record(options: {
  readonly id: string;
  readonly mainQuestion: string;
  readonly cardId: string;
  readonly jumperCardId?: string;
}): ReadingRecord {
  const created = recordRound({
    id: options.id,
    spread: fixtureSpread({
      questions: ["現在的我"],
      mainQuestion: options.mainQuestion,
      draws: [
        fixtureDraw({
          drawNumber: 1,
          cardId: options.cardId,
          reversed: true,
          ...(options.jumperCardId
            ? { jumperCardId: options.jumperCardId }
            : {}),
          round: Number(options.id.at(-1)),
        }),
      ],
    }),
    deckId: FIXTURE_DECK_ID,
    spreadName: "單張",
    recordedAt: new Date(2026, 10, 20, 2, 10),
  });
  if (!created) throw new Error("Expected a record");
  return created;
}

const read = record({
  id: "r1",
  mainQuestion: "這份新工作適合我嗎？",
  cardId: "atelier-standard.major.17",
  jumperCardId: "atelier-standard.cups.two",
});
const unread = record({
  id: "r2",
  mainQuestion: "",
  cardId: "atelier-standard.not-in-deck",
});
const history: ReadingHistory = [
  ...attachReading([read], read.roundKey, {
    mainQuestion: read.mainQuestion,
    reading: fixtureReading("希望感仍在。"),
  }),
  unread,
];

const ENTRY: ContentsEntry = {
  place: RECORDS,
  numeral: "VI",
  title: "The Records",
  titleLanguage: "en",
  page: 13,
  section: "appendix",
};

/** A pre-written provider that answers only when the test releases it. */
function heldProvider() {
  const pending: (() => void)[] = [];
  const inner = new PrewrittenReadingProvider(registry);
  const provider: ReadingProvider = {
    id: "held",
    source: inner.source,
    interpret: (request, options) =>
      new Promise((resolve, reject) => {
        pending.push(() => void inner.interpret(request).then(resolve));
        options?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      }),
  };
  return { provider, release: () => pending.shift()?.() };
}

/**
 * The records on facing pages (or a phone's one page), in a book whose leaf
 * turns land when `land` is called.
 */
function renderRecords(
  options: {
    readonly entries?: ReadingHistory;
    readonly layout?: PageLayout;
    readonly provider?: ReadingProvider;
    readonly share?: ReturnType<typeof fakeShareServices>;
  } = {},
) {
  const historyStorage = new MemoryTextStorage();
  saveReadingHistory(historyStorage, options.entries ?? history);
  const share = options.share ?? fakeShareServices();
  const turns: TurnDirection[] = [];
  let landLeaf: (() => void) | undefined;
  const onBack = vi.fn();

  function Book() {
    const [leafTurning, setLeafTurning] = useState(false);
    landLeaf = () => setLeafTurning(false);
    return (
      <RecordsPage
        entry={ENTRY}
        layout={options.layout ?? "facing-pages"}
        turnLeaf={(direction) => {
          turns.push(direction);
          setLeafTurning(true);
        }}
        leafTurning={leafTurning}
        onBack={onBack}
        now={() => new Date(2026, 10, 20, 9, 0)}
      />
    );
  }

  render(
    <AtelierServicesProvider
      services={createTestServices({
        registry,
        historyStorage,
        share: share.services,
        ...(options.provider ? { readingProvider: options.provider } : {}),
      })}
    >
      <Book />
    </AtelierServicesProvider>,
  );
  const land = () => act(() => landLeaf?.());
  return { historyStorage, turns, land, onBack };
}

const stored = (storage: MemoryTextStorage) =>
  JSON.parse(storage.value ?? '{"records":[]}').records as readonly {
    readonly id: string;
    readonly reading?: { readonly source: string };
  }[];

const entry = (name: RegExp) => screen.getByRole("button", { name });
const article = () => screen.getByRole("article");

describe("RecordsPage on facing pages", () => {
  it("explains how rounds get here when there are none", () => {
    renderRecords({ entries: [] });
    expect(screen.getByText(/還沒有紀錄/u)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "全部清除" })).toBeNull();
    expect(screen.queryByRole("article")).toBeNull();
  });

  it("lists rounds newest first, and opens the newest beside them", () => {
    renderRecords();
    const list = screen.getByRole("list", { name: "歷史紀錄" });
    const [first, second] = within(list).getAllByRole("listitem");
    expect(first).toHaveTextContent("這份新工作適合我嗎？");
    expect(first).toHaveTextContent("已解讀");
    expect(second).toHaveTextContent("（未填主問題）");
    expect(second).toHaveTextContent("未解讀");
    expect(entry(/這份新工作適合我嗎/u)).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(
      within(article()).getByRole("heading", { name: "這份新工作適合我嗎？" }),
    ).toBeInTheDocument();
  });

  it("prints a round read-only, with its jumper and its reading", () => {
    renderRecords();
    expect(within(article()).getByText("星星・逆位")).toBeInTheDocument();
    expect(
      within(article()).getByText("跳牌・聖杯二・逆位"),
    ).toBeInTheDocument();
    expect(within(article()).getByText(/希望感仍在。/u)).toBeInTheDocument();
    expect(
      within(article()).getByText("範例解牌，不是 AI"),
    ).toBeInTheDocument();
    expect(document.querySelector("details")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens another round beside the list at once, without turning a leaf", () => {
    const { turns } = renderRecords();
    fireEvent.click(entry(/未填主問題/u));
    expect(turns).toEqual([]);
    expect(screen.getAllByText("這張牌已不在牌組裡").length).toBeGreaterThan(0);
    expect(screen.getByText("這次沒有產生解讀。")).toBeInTheDocument();
  });

  it("asks on the page before deleting one record, and cancelling keeps it", () => {
    const { historyStorage } = renderRecords();
    fireEvent.click(screen.getByRole("button", { name: "刪除這筆" }));
    expect(screen.getByRole("alert")).toHaveTextContent("確定刪除這筆紀錄？");
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(stored(historyStorage)).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "刪除這筆" }));
    fireEvent.click(screen.getByRole("button", { name: "刪除" }));
    expect(stored(historyStorage).map((kept) => kept.id)).toEqual(["r2"]);
  });

  it("asks on the page before clearing the whole history", () => {
    const { historyStorage } = renderRecords();
    fireEvent.click(screen.getByRole("button", { name: "全部清除" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "確定清除全部歷史紀錄？",
    );
    fireEvent.click(screen.getByRole("button", { name: "刪除" }));
    expect(stored(historyStorage)).toHaveLength(0);
    expect(screen.getByText(/還沒有紀錄/u)).toBeInTheDocument();
  });

  it("reads a round again with its own questions, replacing the reading", async () => {
    const { historyStorage } = renderRecords();
    fireEvent.click(screen.getByRole("button", { name: "重新解讀" }));
    await waitFor(() =>
      expect(stored(historyStorage)[0]?.reading?.source).toBe("prewritten"),
    );
    await waitFor(() =>
      expect(article()).not.toHaveTextContent("希望感仍在。"),
    );
  });

  it("explains why a round can no longer be read", () => {
    renderRecords();
    fireEvent.click(entry(/未填主問題/u));
    expect(screen.getByRole("button", { name: "產生解讀" })).toBeDisabled();
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });

  it("pauses the record's controls while reading", async () => {
    const held = heldProvider();
    const { historyStorage } = renderRecords({ provider: held.provider });
    fireEvent.click(screen.getByRole("button", { name: "重新解讀" }));
    expect(screen.getByRole("button", { name: "產生中…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "分享" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "刪除這筆" })).toBeDisabled();
    expect(screen.getByText(/正在/u)).toBeInTheDocument();

    held.release();
    await waitFor(() =>
      expect(stored(historyStorage)[0]?.reading?.source).toBe("prewritten"),
    );
  });

  it("shares a round", async () => {
    const share = fakeShareServices();
    renderRecords({ share });
    fireEvent.click(screen.getByRole("button", { name: "分享" }));
    const dialog = screen.getByRole("dialog", { name: "分享這次的牌" });
    await within(dialog).findByAltText("要分享的圖卡預覽");
    fireEvent.click(within(dialog).getByRole("button", { name: "複製文字" }));
    await within(dialog).findByText("已複製文字。");
    expect(share.sharer.copyText.mock.calls[0]?.[0]).toContain(
      "主問題：這份新工作適合我嗎？",
    );
  });
});

describe("RecordsPage on a phone", () => {
  it("shows the list, and turns a leaf to a round and back", () => {
    const { turns, land } = renderRecords({ layout: "single-page" });
    expect(screen.queryByRole("article")).toBeNull();

    fireEvent.click(entry(/這份新工作適合我嗎/u));
    expect(turns).toEqual(["forward"]);
    // The list stays until the leaf has landed over it.
    expect(screen.queryByRole("article")).toBeNull();
    land();
    expect(
      screen.getByRole("heading", { name: "這份新工作適合我嗎？" }),
    ).toHaveFocus();
    expect(screen.queryByRole("list", { name: "歷史紀錄" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "回到紀錄列表" }));
    expect(turns).toEqual(["forward", "back"]);
    land();
    expect(screen.getByRole("list", { name: "歷史紀錄" })).toBeInTheDocument();
  });
});
