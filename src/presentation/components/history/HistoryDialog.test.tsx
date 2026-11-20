import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { registerBuiltInDecks } from "@/application/use-cases/createDeckLibrary";
import {
  createReadingRequester,
  type ReadingOutcome,
  type ReadingRequester,
} from "@/application/use-cases/requestReading";
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
import { HistoryDialog } from "@/presentation/components/history/HistoryDialog";
import { fakeShareServices } from "@/presentation/components/share/testing/fakeShareServices";

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

const prewritten = () =>
  createReadingRequester(new PrewrittenReadingProvider(registry));

let nextRequest = 0;
const createRequestId = () =>
  `00000000-0000-4000-8000-${(nextRequest += 1).toString().padStart(12, "0")}`;

/** A pre-written requester that answers only when the test releases it. */
function heldRequester() {
  const pending: (() => void)[] = [];
  const inner = prewritten();
  const requester: ReadingRequester = {
    request: (requestId, request, signal) =>
      new Promise<ReadingOutcome>((resolve) => {
        pending.push(
          () => void inner.request(requestId, request).then(resolve),
        );
        signal?.addEventListener("abort", () =>
          resolve({ ok: false, failure: "cancelled" }),
        );
      }),
  };
  return { requester, release: () => pending.shift()?.() };
}

function renderDialog(
  entries: ReadingHistory = history,
  requester: ReadingRequester = prewritten(),
) {
  const handlers = {
    onRemove: vi.fn(),
    onClearAll: vi.fn(),
    onClose: vi.fn(),
    onReading: vi.fn(),
  };
  render(
    <HistoryDialog
      history={entries}
      registry={registry}
      shareServices={fakeShareServices().services}
      readingServices={{ requester, source: "prewritten", createRequestId }}
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

  it("reads a round again with its own questions, replacing the reading", async () => {
    const { onReading } = renderDialog();
    fireEvent.click(
      screen.getByRole("button", { name: /這份新工作適合我嗎/u }),
    );
    fireEvent.click(screen.getByRole("button", { name: "重新解讀" }));
    await waitFor(() => expect(onReading).toHaveBeenCalledOnce());
    const [roundKey, answered] = onReading.mock.calls[0] ?? [];
    expect(roundKey).toBe(read.roundKey);
    expect(answered.mainQuestion).toBe("這份新工作適合我嗎？");
    expect(answered.reading.source).toBe("prewritten");
    expect(answered.reading.positions[0].question).toBe("現在的我");
    expect(answered.reading.positions[0].primary.orientation).toBe("reversed");
  });

  it("explains why a round can no longer be read", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /未填主問題/u }));
    expect(screen.getByRole("button", { name: "產生解讀" })).toBeDisabled();
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });

  it("pauses the record's buttons while reading, and keeps reading behind the list", async () => {
    const held = heldRequester();
    const { onReading } = renderDialog(history, held.requester);
    fireEvent.click(
      screen.getByRole("button", { name: /這份新工作適合我嗎/u }),
    );
    fireEvent.click(screen.getByRole("button", { name: "重新解讀" }));
    expect(screen.getByRole("button", { name: "產生中…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "分享" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "刪除這筆" })).toBeDisabled();
    expect(screen.getByText(/正在/u)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "‹ 返回" }));
    held.release();
    await waitFor(() => expect(onReading).toHaveBeenCalledOnce());
  });

  it("closes with Escape", () => {
    const { onClose } = renderDialog();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
