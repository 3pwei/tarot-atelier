import { fireEvent, render, screen, within } from "@testing-library/react";
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
import { HistoryDialog } from "@/presentation/components/history/HistoryDialog";

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

function renderDialog(entries: ReadingHistory = history) {
  const handlers = {
    onRemove: vi.fn(),
    onClearAll: vi.fn(),
    onClose: vi.fn(),
  };
  render(
    <HistoryDialog
      history={entries}
      registry={registry}
      now={() => new Date(2026, 10, 20, 9, 0)}
      {...handlers}
    />,
  );
  return handlers;
}

describe("HistoryDialog", () => {
  it("explains how rounds get here when there are none", () => {
    renderDialog([]);
    expect(screen.getByText(/還沒有紀錄/u)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "全部清除" })).toBeNull();
  });

  it("lists rounds newest first, marking which have a reading", () => {
    renderDialog();
    const [first, second] = screen.getAllByRole("listitem");
    expect(first).toHaveTextContent("這份新工作適合我嗎？");
    expect(first).toHaveTextContent("已解讀");
    expect(second).toHaveTextContent("（未填主問題）");
    expect(second).toHaveTextContent("未解讀");
    expect(screen.getByRole("button", { name: "關閉" })).toHaveFocus();
  });

  it("shows a round read-only, with its jumper and its reading", () => {
    renderDialog();
    fireEvent.click(
      screen.getByRole("button", { name: /這份新工作適合我嗎/u }),
    );
    const article = screen.getByRole("article");
    expect(within(article).getByText("星星・逆位")).toBeInTheDocument();
    expect(within(article).getByText("跳牌・聖杯二・逆位")).toBeInTheDocument();
    expect(within(article).getByText("希望感仍在。")).toBeInTheDocument();
    expect(within(article).getByText("範例解牌，不是 AI")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("button", { name: "‹ 返回" })).toHaveFocus();
  });

  it("names a card the deck no longer holds instead of failing", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /未填主問題/u }));
    expect(screen.getAllByText("這張牌已不在牌組裡").length).toBeGreaterThan(0);
    expect(screen.getByText("這次沒有產生解讀。")).toBeInTheDocument();
  });

  it("asks before deleting one record, and cancelling keeps it", () => {
    const { onRemove } = renderDialog();
    fireEvent.click(
      screen.getByRole("button", { name: /這份新工作適合我嗎/u }),
    );
    fireEvent.click(screen.getByRole("button", { name: "刪除這筆" }));
    expect(screen.getByRole("alert")).toHaveTextContent("確定刪除這筆紀錄？");
    expect(screen.getByRole("button", { name: "取消" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(onRemove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "刪除這筆" }));
    fireEvent.click(screen.getByRole("button", { name: "刪除" }));
    expect(onRemove).toHaveBeenCalledWith("r1");
  });

  it("asks before clearing the whole history", () => {
    const { onClearAll } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "全部清除" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "確定清除全部歷史紀錄？",
    );
    fireEvent.click(screen.getByRole("button", { name: "刪除" }));
    expect(onClearAll).toHaveBeenCalledOnce();
  });

  it("closes with Escape", () => {
    const { onClose } = renderDialog();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
