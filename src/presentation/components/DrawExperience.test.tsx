import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  ARRANGING_SLOT_WIDTH_CQW,
  LARGEST_SLOT_WIDTH_CQW,
  STANDARD_SLOT_WIDTH_CQW,
} from "@/presentation/components/spread/boardGeometry";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryTextStorage as MemoryStorage } from "@/application/testing/memoryTextStorage";
import { DrawExperience } from "@/presentation/components/DrawExperience";
import { fakeShareServices } from "@/presentation/components/share/testing/fakeShareServices";

function idFactory() {
  let next = 0;
  return () => `test-${(next += 1)}`;
}

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

function renderTable(
  options: {
    readonly random?: () => number;
    readonly retiredTableStorage?: MemoryStorage;
    readonly templateStorage?: MemoryStorage;
    readonly historyStorage?: MemoryStorage;
    readonly share?: ReturnType<typeof fakeShareServices>;
  } = {},
) {
  const retiredTableStorage =
    options.retiredTableStorage ?? new MemoryStorage();
  const templateStorage = options.templateStorage ?? new MemoryStorage();
  const historyStorage = options.historyStorage ?? new MemoryStorage();
  const share = options.share ?? fakeShareServices();
  const view = render(
    <DrawExperience
      randomSource={options.random ?? (() => 0.9)}
      retiredTableStorage={retiredTableStorage}
      templateStorage={templateStorage}
      historyStorage={historyStorage}
      createId={idFactory()}
      now={() => new Date(2026, 10, 20, 2, 10)}
      shareServices={share.services}
    />,
  );
  return {
    ...view,
    retiredTableStorage,
    templateStorage,
    historyStorage,
    share,
  };
}

/** Asks a main question, which dealing needs, and waits until play can start. */
async function ready(mainQuestion = "這段時間的方向？") {
  await screen.findByText("請先輸入這次想問的主問題");
  fireEvent.change(screen.getByRole("textbox", { name: /^主問題/u }), {
    target: { value: mainQuestion },
  });
  await screen.findByText("準備好了，按住牌桌洗牌");
}

/** The fanned deck, once a shuffle has finished. */
function fannedDeck() {
  return screen.findByRole("group", { name: /^扇形牌堆/u });
}

/** Chooses the fanned card in `slot` from the keyboard: lift, then draw. */
function choose(slot: number) {
  const card = document.querySelector<HTMLElement>(`[data-fan-slot="${slot}"]`);
  if (!card) throw new Error(`no fanned card in slot ${slot}`);
  fireEvent.keyDown(card, { key: "Enter" });
  fireEvent.keyDown(card, { key: "Enter" });
}

/** The pack in the middle of the table, which shuffles while held. */
const DECK_PILE_NAME = /^(按住牌堆洗牌|牌堆：)/u;

function deckPile() {
  return screen.getByRole("button", { name: DECK_PILE_NAME });
}

function queryDeckPile() {
  return screen.queryByRole("button", { name: DECK_PILE_NAME });
}

/** Shuffles, then chooses a card for each of `count` empty positions. */
async function shuffleAndPick(count = 3) {
  fireEvent.click(deckPile());
  await fannedDeck();
  for (let picked = 0; picked < count; picked += 1) {
    // A jumper takes a neighbour too, so choose whichever card is first.
    const first = document.querySelector<HTMLElement>("[data-fan-slot]");
    choose(Number(first?.dataset.fanSlot));
  }
  await screen.findByText("點擊卡牌，以火焰逐一揭示牌面");
}

function reveal(index: number, role = "主牌") {
  fireEvent.click(
    screen.getByRole("button", { name: `以火焰揭示牌位 ${index} ${role}` }),
  );
}

function slot(index: number): HTMLElement {
  const element = document.querySelector<HTMLElement>(
    `[data-index='${index}']`,
  );
  if (!element) throw new Error(`slot ${index} not found`);
  return element;
}

/** The position's handle on the table (the reading list has a twin button). */
function handle(index: number): HTMLElement {
  return within(slot(index)).getByRole("button", {
    name: new RegExp(`^牌位 ${index}：`, "u"),
  });
}

/** Moving and rotating positions happens in arrange mode only. */
function arrange() {
  fireEvent.click(screen.getByRole("button", { name: "編輯牌陣" }));
}

/** Editing the layout (templates, adding, the inspector) needs arrange mode. */
function arrangeIfNeeded() {
  const toggle = screen.queryByRole("button", { name: "編輯牌陣" });
  if (toggle) fireEvent.click(toggle);
}

function finishArranging() {
  fireEvent.click(screen.getByRole("button", { name: "結束編輯" }));
}

/** Layout changes are kept only once saved to the library. */
function saveAndFinishArranging(name: string) {
  fireEvent.click(screen.getByRole("button", { name: "儲存目前牌陣" }));
  fireEvent.change(screen.getByLabelText("牌陣名稱"), {
    target: { value: name },
  });
  fireEvent.click(screen.getByRole("button", { name: "儲存" }));
  finishArranging();
}

function chooseBlank() {
  arrangeIfNeeded();
  fireEvent.click(screen.getByRole("button", { name: "空白牌桌" }));
}

function addPosition() {
  arrangeIfNeeded();
  fireEvent.click(screen.getByRole("button", { name: "＋ 新增牌位" }));
}

describe("DrawExperience spread table", () => {
  it("starts with three numbered positions that each carry a question", async () => {
    renderTable();
    await ready();

    expect(document.querySelectorAll("[data-slot]")).toHaveLength(3);
    const list = screen.getByRole("list", { name: "牌位與問題" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByText("3 / 12 牌位")).not.toBeInTheDocument();
    arrange();
    expect(screen.getByText("3 / 12 牌位")).toBeInTheDocument();
  });

  it("fans the shuffled pile and places each chosen card in number order", async () => {
    renderTable();
    await ready();

    fireEvent.click(deckPile());
    const fan = await fannedDeck();
    expect(fan.querySelectorAll("[data-fan-slot]")).toHaveLength(78);
    expect(
      screen.getByText("請選第 1 張（共 3 張）：點一下讓牌往前，再往前拉出"),
    ).toBeInTheDocument();

    choose(40);
    expect(slot(1).querySelectorAll("[data-draw-card]")).toHaveLength(1);
    expect(slot(2).querySelectorAll("[data-draw-card]")).toHaveLength(0);
    expect(fan.querySelector('[data-fan-slot="40"]')).toBeNull();
    expect(screen.getByText(/^請選第 2 張（共 3 張）/u)).toBeInTheDocument();
    // The pack stays laid out on the wheel until every position has its card.
    expect(queryDeckPile()).not.toBeInTheDocument();

    choose(3);
    choose(77);
    await screen.findByText("點擊卡牌，以火焰逐一揭示牌面");
    for (const index of [1, 2, 3]) {
      expect(slot(index).querySelectorAll("[data-draw-card]")).toHaveLength(1);
    }
    expect(screen.queryByRole("group", { name: /^扇形牌堆/u })).toBeNull();
    expect(screen.getByText("剩餘 75 張")).toBeInTheDocument();
  });

  it("lifts a fanned card first and draws only on the second Enter", async () => {
    renderTable();
    await ready();
    fireEvent.click(deckPile());
    await fannedDeck();
    const card = document.querySelector<HTMLElement>('[data-fan-slot="10"]');
    if (!card) throw new Error("no fanned card in slot 10");

    fireEvent.keyDown(card, { key: "Enter" });
    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(slot(1).querySelectorAll("[data-draw-card]")).toHaveLength(0);

    fireEvent.keyDown(card, { key: "ArrowRight" });
    const next = document.querySelector('[data-fan-slot="11"]');
    expect(next).toHaveAttribute("aria-pressed", "true");
    expect(card).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps every face hidden until the person reveals it, in any order", async () => {
    renderTable();
    await ready();
    await shuffleAndPick();

    const cards = [1, 2, 3].map((index) =>
      slot(index).querySelector("[data-draw-card='primary']"),
    );
    for (const card of cards) {
      expect(card).toHaveAttribute("data-reveal-state", "sealed");
    }
    expect(deckPile()).toBeDisabled();

    reveal(3);
    reveal(1);
    expect(cards[2]).toHaveAttribute("data-reveal-state", "revealed");
    expect(cards[1]).toHaveAttribute("data-reveal-state", "sealed");
    expect(
      screen.getByText("點擊卡牌，以火焰逐一揭示牌面"),
    ).toBeInTheDocument();

    reveal(2);
    await screen.findByText("牌陣已完成");
    expect(
      screen.getByRole("button", {
        name: /^牌位 1 主牌：.+，(正位|逆位)，點擊放大$/u,
      }),
    ).toBeInTheDocument();
  });

  it("puts a jumper on the same numbered position as its primary card", async () => {
    let calls = 0;
    const random = () => {
      calls += 1;
      return calls === 78 ? 0.029 : 0.9;
    };
    renderTable({ random });
    await ready();
    await shuffleAndPick();

    const first = slot(1);
    expect(first.querySelectorAll("[data-draw-card]")).toHaveLength(2);
    expect(within(first).getByText("跳牌")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-slot]")).toHaveLength(3);
    expect(screen.getByText("剩餘 74 張")).toBeInTheDocument();

    reveal(1);
    reveal(2);
    reveal(3);
    expect(screen.queryByText("牌陣已完成")).not.toBeInTheDocument();
    reveal(1, "跳牌");
    await screen.findByText("牌陣已完成");
  });

  it("reads the finished spread offline, labelled as a sample", async () => {
    renderTable();
    await ready();
    // An empty table has nothing unrevealed, but nothing to read either.
    expect(
      screen.getByRole("button", { name: "翻開所有牌後即可解讀" }),
    ).toBeDisabled();
    await shuffleAndPick();
    expect(
      screen.getByRole("button", { name: "翻開所有牌後即可解讀" }),
    ).toBeDisabled();
    [1, 2, 3].forEach((index) => reveal(index));
    await screen.findByText("牌陣已完成");

    fireEvent.click(screen.getByRole("button", { name: "產生解讀" }));
    expect(await screen.findByText("全局關聯")).toBeInTheDocument();
    expect(screen.getByText("範例解牌，不是 AI")).toBeInTheDocument();
    expect(screen.getAllByText("單牌象徵").length).toBeGreaterThan(0);
  });

  it("records a finished round once, and adds its reading when generated", async () => {
    const { historyStorage } = renderTable();
    await ready("這份新工作適合我嗎？");
    await shuffleAndPick();
    reveal(1);
    reveal(2);
    expect(historyStorage.value).toBeNull();
    reveal(3);
    await screen.findByText("牌陣已完成");

    fireEvent.click(screen.getByRole("button", { name: "歷史紀錄" }));
    const panel = screen.getByRole("dialog", { name: /歷史紀錄/u });
    const entries = within(panel).getAllByRole("listitem");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toHaveTextContent("這份新工作適合我嗎？");
    expect(entries[0]).toHaveTextContent("今天 02:10");
    expect(entries[0]).toHaveTextContent("未解讀");
    fireEvent.click(within(panel).getByRole("button", { name: "關閉" }));

    fireEvent.click(screen.getByRole("button", { name: "產生解讀" }));
    await screen.findByText("全局關聯");
    fireEvent.click(screen.getByRole("button", { name: "歷史紀錄" }));
    const reopened = screen.getByRole("dialog", { name: /歷史紀錄/u });
    expect(within(reopened).getAllByRole("listitem")).toHaveLength(1);
    expect(within(reopened).getByText("已解讀")).toBeInTheDocument();
    expect(JSON.parse(historyStorage.value ?? "{}").records).toHaveLength(1);
  });

  it("shares the finished table with its current reading", async () => {
    const { share } = renderTable();
    await ready("這份新工作適合我嗎？");
    await shuffleAndPick();
    [1, 2, 3].forEach((index) => reveal(index));
    await screen.findByText("牌陣已完成");
    fireEvent.click(screen.getByRole("button", { name: "產生解讀" }));
    await screen.findByText("全局關聯");

    fireEvent.click(screen.getByRole("button", { name: "分享" }));
    const dialog = screen.getByRole("dialog", { name: "分享這次的牌" });
    await within(dialog).findByAltText("要分享的圖卡預覽");
    const card = share.rendered.at(-1);
    expect(card?.mainQuestion).toBe("這份新工作適合我嗎？");
    expect(card?.positions).toHaveLength(3);
    expect(card?.summary).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "關閉" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shares a round from the history, inside the same panel", async () => {
    const { share } = renderTable();
    await ready("這份新工作適合我嗎？");
    await shuffleAndPick();
    [1, 2, 3].forEach((index) => reveal(index));
    await screen.findByText("牌陣已完成");

    fireEvent.click(screen.getByRole("button", { name: "歷史紀錄" }));
    const panel = screen.getByRole("dialog", { name: /歷史紀錄/u });
    fireEvent.click(
      within(panel).getByRole("button", { name: /這份新工作適合我嗎/u }),
    );
    fireEvent.click(within(panel).getByRole("button", { name: "分享" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    await screen.findByAltText("要分享的圖卡預覽");
    fireEvent.click(screen.getByRole("button", { name: "複製文字" }));
    await screen.findByText("已複製文字。");
    expect(share.sharer.copyText.mock.calls[0]?.[0]).toContain(
      "主問題：這份新工作適合我嗎？",
    );
    fireEvent.click(screen.getByRole("button", { name: "‹ 返回" }));
    expect(
      screen.getByRole("button", { name: "刪除這筆" }),
    ).toBeInTheDocument();
  });

  it("keeps a deleted record deleted after a reload", async () => {
    const historyStorage = new MemoryStorage();
    const first = renderTable({ historyStorage });
    await ready();
    await shuffleAndPick();
    [1, 2, 3].forEach((index) => reveal(index));
    await screen.findByText("牌陣已完成");

    fireEvent.click(screen.getByRole("button", { name: "歷史紀錄" }));
    fireEvent.click(screen.getByRole("button", { name: /這段時間的方向？/u }));
    fireEvent.click(screen.getByRole("button", { name: "刪除這筆" }));
    fireEvent.click(screen.getByRole("button", { name: "刪除" }));
    expect(historyStorage.value).toBeNull();
    first.unmount();

    renderTable({ historyStorage });
    await screen.findByText("請先輸入這次想問的主問題");
    fireEvent.click(screen.getByRole("button", { name: "歷史紀錄" }));
    expect(screen.getByText(/還沒有紀錄/u)).toBeInTheDocument();
  });

  it("clears the reading when the table starts over, so it never sits under new cards", async () => {
    renderTable();
    await ready();
    await shuffleAndPick();
    [1, 2, 3].forEach((index) => reveal(index));
    await screen.findByText("牌陣已完成");
    fireEvent.click(screen.getByRole("button", { name: "產生解讀" }));
    await screen.findByText("全局關聯");

    fireEvent.click(screen.getByRole("button", { name: "清除本次牌陣" }));
    expect(screen.queryByText("全局關聯")).toBeNull();
    expect(screen.queryByText(/牌陣已改變/u)).toBeNull();

    await ready();
    await shuffleAndPick();
    [1, 2, 3].forEach((index) => reveal(index));
    await screen.findByText("牌陣已完成");
    expect(screen.queryByText("全局關聯")).toBeNull();
    expect(screen.getByRole("button", { name: "產生解讀" })).toBeEnabled();
  });

  it("never shows players the jumper probability", async () => {
    const { container } = renderTable();
    await ready();
    expect(container.textContent).not.toMatch(/\d+(\.\d+)?\s*%/u);
    await shuffleAndPick();
    expect(container.textContent).not.toMatch(/\d+(\.\d+)?\s*%/u);
  });

  it("requires a question on every position before shuffling", async () => {
    renderTable();
    await ready();
    chooseBlank();

    expect(
      await screen.findByText("請按「編輯牌陣」新增至少一個牌位"),
    ).toBeInTheDocument();

    addPosition();
    expect(
      await screen.findByText("請按「編輯牌陣」為牌位 1 設定問題"),
    ).toBeInTheDocument();

    const question = screen.getByLabelText(/這個牌位的問題/u);
    fireEvent.change(question, { target: { value: "   " } });
    saveAndFinishArranging("一張牌");
    // A blank question still blocks play after arranging.
    expect(deckPile()).toBeDisabled();

    arrange();
    fireEvent.click(handle(1));
    fireEvent.change(screen.getByLabelText(/這個牌位的問題/u), {
      target: { value: "我該把力氣放在哪裡？" },
    });
    saveAndFinishArranging("一張牌");
    await screen.findByText("準備好了，按住牌桌洗牌");
    expect(deckPile()).toBeEnabled();
  });

  it("allows at most 12 positions and explains the limit", async () => {
    renderTable();
    await ready();
    chooseBlank();
    for (let count = 0; count < 12; count += 1) addPosition();

    expect(document.querySelectorAll("[data-slot]")).toHaveLength(12);
    expect(screen.getByText("12 / 12 牌位")).toBeInTheDocument();
    addPosition();

    expect(document.querySelectorAll("[data-slot]")).toHaveLength(12);
    expect(
      await screen.findByText(/牌位最多 12 個，請先移除一個再新增/u),
    ).toBeInTheDocument();
  });

  it("renumbers in order after a removal and announces it", async () => {
    renderTable();
    await ready();
    arrange();
    fireEvent.click(screen.getByRole("button", { name: "五張十字" }));
    fireEvent.click(handle(2));
    fireEvent.click(screen.getByRole("button", { name: "刪除牌位" }));

    expect(
      await screen.findByText("已移除牌位 2，原牌位 3–5 依序改為 2–4。"),
    ).toBeInTheDocument();
    const numbers = [...document.querySelectorAll("[data-slot]")].map(
      (element) => element.getAttribute("data-index"),
    );
    expect(numbers).toEqual(["1", "2", "3", "4"]);
  });

  it("moves with arrow keys or the numeric keypad and rotates with brackets", async () => {
    renderTable();
    await ready();
    arrange();
    const second = handle(2);

    fireEvent.keyDown(second, { key: "ArrowRight", code: "ArrowRight" });
    expect(slot(2).style.getPropertyValue("--x")).toBe("0.51");
    fireEvent.keyDown(second, { key: "8", code: "Numpad8", shiftKey: true });
    expect(slot(2).style.getPropertyValue("--y")).toBe("0.45");
    fireEvent.keyDown(second, { key: "]", code: "BracketRight" });
    expect(slot(2).style.getPropertyValue("--rot")).toBe("15deg");
    fireEvent.keyDown(second, { key: "[", code: "BracketLeft" });
    fireEvent.keyDown(second, { key: "[", code: "BracketLeft" });
    expect(slot(2).style.getPropertyValue("--rot")).toBe("345deg");
  });

  it("keeps cards at the smallest size while arranging, whatever moves", async () => {
    renderTable();
    await ready();
    const cardWidth = () =>
      document
        .querySelector<HTMLElement>(".spread-board__canvas")
        ?.style.getPropertyValue("--slot-w");
    const inPlay = cardWidth();
    expect(inPlay).toBe(`${LARGEST_SLOT_WIDTH_CQW}cqw`);

    arrange();
    expect(cardWidth()).toBe(`${ARRANGING_SLOT_WIDTH_CQW}cqw`);
    finishArranging();
    expect(cardWidth()).toBe(inPlay);

    arrange();
    // Moving a position away from the others would fit larger cards and
    // moving it next to one smaller; while arranging the size holds still.
    const first = handle(1);
    first.focus();
    for (const key of ["ArrowDown", "ArrowRight", "ArrowRight"]) {
      for (let step = 0; step < 4; step += 1) {
        fireEvent.keyDown(first, { key, shiftKey: true });
        expect(cardWidth()).toBe(`${ARRANGING_SLOT_WIDTH_CQW}cqw`);
      }
    }
  });

  it("offers zoom buttons only while arranging, and stops at the table's limits", async () => {
    renderTable();
    await ready();
    expect(
      screen.queryByRole("group", { name: "牌桌縮放" }),
    ).not.toBeInTheDocument();
    arrange();
    const zoom = screen.getByRole("group", { name: "牌桌縮放" });
    const zoomIn = within(zoom).getByRole("button", { name: "放大牌桌" });
    const zoomOut = within(zoom).getByRole("button", { name: "縮小牌桌" });
    expect(zoomOut).toBeDisabled();

    // Five steps of 1.25 pass the 2.5× limit.
    for (let step = 0; step < 5; step += 1) fireEvent.click(zoomIn);
    expect(zoomIn).toBeDisabled();
    expect(zoomOut).toBeEnabled();

    finishArranging();
    expect(
      screen.queryByRole("group", { name: "牌桌縮放" }),
    ).not.toBeInTheDocument();
  });

  it("rotates a selected position with its turning-arrow button", async () => {
    renderTable();
    await ready();
    arrange();
    expect(
      screen.queryByRole("button", { name: /順時針轉 45°/u }),
    ).not.toBeInTheDocument();

    fireEvent.click(handle(2));
    const onTable = within(slot(2)).getByRole("button", {
      name: "牌位 2 順時針轉 45°",
    });
    fireEvent.click(onTable);
    fireEvent.click(onTable);
    expect(slot(2).style.getPropertyValue("--rot")).toBe("90deg");
    // The rotate button never toggles the selection.
    expect(screen.getByTestId("position-inspector")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "逆時針轉 45°" }));
    expect(slot(2).style.getPropertyValue("--rot")).toBe("45deg");
  });

  it("edits order, rotation and position from the inspector", async () => {
    renderTable();
    await ready();
    arrange();
    fireEvent.click(handle(3));

    fireEvent.change(screen.getByLabelText("排序"), { target: { value: "1" } });
    expect(
      await screen.findByText("牌位 3 已移到第 1 號，其餘依序調整。"),
    ).toBeInTheDocument();
    expect(slot(1)).toHaveAttribute("title", "接下來可能的走向是什麼？");

    fireEvent.change(screen.getByLabelText("旋轉（度）"), {
      target: { value: "90" },
    });
    fireEvent.change(screen.getByLabelText("水平位置（0–100）"), {
      target: { value: "10" },
    });
    expect(slot(1).style.getPropertyValue("--rot")).toBe("90deg");
    expect(slot(1).style.getPropertyValue("--x")).toBe("0.1");
  });

  it("asks before clearing the draws to edit the layout, and keeps the layout", async () => {
    renderTable();
    await ready("今年的重心？");
    await shuffleAndPick();
    reveal(1);

    arrange();
    const dialog = screen.getByRole("alertdialog", {
      name: "清除這次的抽牌結果？",
    });
    expect(within(dialog).getByRole("button", { name: "取消" })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "編輯牌陣", pressed: false }),
    ).toBeInTheDocument();
    expect(slot(1).querySelector("[data-draw-card='primary']")).not.toBeNull();

    arrange();
    fireEvent.click(screen.getByRole("button", { name: "清除並編輯" }));
    expect(
      screen.getByRole("button", { name: "結束編輯", pressed: true }),
    ).toBeInTheDocument();
    expect(document.querySelector("[data-draw-card]")).toBeNull();
    expect(screen.getByText("剩餘 78 張")).toBeInTheDocument();
    // Positions, their questions and the main question stay.
    expect(
      within(screen.getByRole("list", { name: "牌位與問題" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(3);
    expect(screen.getByRole("textbox", { name: /^主問題/u })).toHaveValue(
      "今年的重心？",
    );
    // Editing is open at once: a position can be removed.
    fireEvent.click(handle(3));
    expect(screen.getByRole("button", { name: "刪除牌位" })).toBeEnabled();
  });

  it("requires a main question before shuffling", async () => {
    renderTable();
    expect(
      await screen.findByText("請先輸入這次想問的主問題"),
    ).toBeInTheDocument();
    expect(deckPile()).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: /^主問題/u }), {
      target: { value: "   " },
    });
    expect(deckPile()).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: /^主問題/u }), {
      target: { value: "下個月的方向" },
    });
    expect(
      await screen.findByText("準備好了，按住牌桌洗牌"),
    ).toBeInTheDocument();
    expect(deckPile()).toBeEnabled();
  });

  it("never moves or rotates positions during play", async () => {
    renderTable();
    await ready();
    const second = handle(2);

    fireEvent.keyDown(second, { key: "ArrowRight", code: "ArrowRight" });
    fireEvent.keyDown(second, { key: "]", code: "BracketRight" });
    expect(slot(2).style.getPropertyValue("--x")).toBe("0.5");
    expect(slot(2).style.getPropertyValue("--rot")).toBe("0deg");

    fireEvent.click(second);
    expect(
      screen.queryByRole("button", { name: /順時針轉 45°/u }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("position-inspector")).not.toBeInTheDocument();
  });

  it("shows layout editing controls only while arranging", async () => {
    renderTable();
    await ready();
    const editing = ["＋ 新增牌位", "儲存目前牌陣", "空白牌桌"] as const;
    for (const name of editing) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
    expect(
      screen.getByRole("textbox", { name: /^主問題/u }),
    ).toBeInTheDocument();
    // Starting over belongs to play.
    expect(
      screen.getByRole("button", { name: "清除本次牌陣" }),
    ).toBeInTheDocument();

    arrange();
    for (const name of editing) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(
      screen.queryByRole("button", { name: "清除本次牌陣" }),
    ).not.toBeInTheDocument();
    fireEvent.click(handle(2));
    expect(screen.getByTestId("position-inspector")).toBeInTheDocument();

    finishArranging();
    expect(screen.queryByTestId("position-inspector")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "＋ 新增牌位" }),
    ).not.toBeInTheDocument();
  });

  it("pauses shuffling and dealing while arranging, and resumes after", async () => {
    renderTable();
    await ready();
    arrange();
    // Arranging takes the deck off the table.
    expect(queryDeckPile()).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "結束編輯", pressed: true }),
    ).toBeInTheDocument();

    finishArranging();
    expect(deckPile()).toBeEnabled();
    await shuffleAndPick();
  });

  it("enlarges a revealed card and returns focus when closed", async () => {
    renderTable();
    await ready();
    await shuffleAndPick();
    reveal(1);
    const card = screen.getByRole("button", { name: /^牌位 1 主牌：/u });
    card.focus();
    fireEvent.click(card);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName(/.+(正位|逆位)$/u);
    expect(within(dialog).getByText("牌位 1 · 主牌")).toBeInTheDocument();
    expect(
      within(dialog).getByText("這件事的過去與起因是什麼？"),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(card).toHaveFocus();

    fireEvent.click(card);
    fireEvent.click(screen.getByRole("button", { name: "關閉放大檢視" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("starts from the default spread after a reload, keeping the round in the history", async () => {
    const historyStorage = new MemoryStorage();
    const retiredTableStorage = new MemoryStorage(
      '{"schemaVersion":2,"session":{"deckId":"atelier-standard-tarot"}}',
    );
    const first = renderTable({ historyStorage, retiredTableStorage });
    await ready("今年的重心？");
    expect(retiredTableStorage.value).toBeNull();
    await shuffleAndPick();
    [1, 2, 3].forEach((index) => reveal(index));
    await screen.findByText("牌陣已完成");
    first.unmount();

    renderTable({ historyStorage });
    await screen.findByText("請先輸入這次想問的主問題");
    expect(screen.queryByText(/已載入上次/u)).toBeNull();
    expect(screen.getByRole("textbox", { name: /^主問題/u })).toHaveValue("");
    expect(document.querySelectorAll("[data-draw-card]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-slot]")).toHaveLength(3);
    expect(screen.getByText("剩餘 78 張")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "歷史紀錄" }));
    const panel = screen.getByRole("dialog", { name: /歷史紀錄/u });
    expect(within(panel).getAllByRole("listitem")[0]).toHaveTextContent(
      "今年的重心？",
    );
  });

  it("starts from the default spread at once when the library is unreadable", async () => {
    const templateStorage = new MemoryStorage("not json");
    renderTable({ templateStorage });

    expect(
      await screen.findByText("本機的牌陣庫無法讀取，已換回預設範例。"),
    ).toBeInTheDocument();
    expect(document.querySelectorAll("[data-slot]")).toHaveLength(3);
  });

  it("can start over while the wheel is laid out, before any card is chosen", async () => {
    renderTable();
    await ready();
    fireEvent.click(deckPile());
    await fannedDeck();

    const restart = screen.getByRole("button", { name: "清除本次牌陣" });
    expect(restart).toBeEnabled();
    fireEvent.click(restart);

    expect(
      screen.queryByRole("group", { name: /^扇形牌堆/u }),
    ).not.toBeInTheDocument();
    // The whole spread starts over, the pack back in the middle.
    expect(deckPile()).toBeInTheDocument();
    expect(
      await screen.findByText("已清除本次牌陣，重新從「經典三張」開始。"),
    ).toBeInTheDocument();
  });

  it("takes the rest of the deck off the table once every position has its card", async () => {
    renderTable();
    await ready();
    expect(deckPile().closest(".table-deck__pack")).not.toHaveAttribute(
      "data-gone",
    );
    await shuffleAndPick();
    expect(document.querySelector(".table-deck__pack")).toHaveAttribute(
      "data-gone",
    );
  });

  it("keeps a long press on the pack from opening the phone's image menu", async () => {
    renderTable();
    await ready();
    const pressed = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    deckPile().dispatchEvent(pressed);
    expect(pressed.defaultPrevented).toBe(true);
  });

  it("explains holding the table to people using assistive technology", async () => {
    renderTable();
    await ready();
    expect(deckPile()).toHaveAccessibleDescription(
      /按住牌桌任何地方或牌堆.*放開後收回並攤開/u,
    );
  });

  it("shuffles while a position on the table is held, without selecting it", async () => {
    renderTable();
    await ready();
    const position = document.querySelector<HTMLElement>("[data-slot]");
    if (!position) throw new Error("the table has no positions");

    fireEvent.pointerDown(position, { button: 0, pointerId: 1 });
    expect(await screen.findByText("洗牌中，放開後收牌攤開")).toBeVisible();
    fireEvent.pointerUp(window, { button: 0, pointerId: 1 });
    fireEvent.click(position);

    expect(position).not.toHaveAttribute("data-selected");
  });

  it("lays out any spread in the library straight from play, without editing", async () => {
    renderTable();
    await ready();
    const picker = screen.getByRole("region", { name: "選擇牌陣" });
    for (const name of ["經典三張", "五張十字", "圓環"]) {
      expect(within(picker).getByRole("button", { name })).toBeEnabled();
    }
    // Deleting spreads belongs to editing.
    expect(
      within(picker).queryByRole("button", { name: /^刪除牌陣/u }),
    ).not.toBeInTheDocument();

    fireEvent.click(within(picker).getByRole("button", { name: "圓環" }));
    expect(document.querySelectorAll("[data-slot]")).toHaveLength(8);
    expect(
      within(picker).getByRole("button", { name: "圓環", pressed: true }),
    ).toBeInTheDocument();
  });

  it("offers every saved spread as a choice, and locks choosing once cards are dealt", async () => {
    renderTable();
    await ready();
    arrange();
    fireEvent.click(screen.getByRole("button", { name: "儲存目前牌陣" }));
    fireEvent.change(screen.getByLabelText("牌陣名稱"), {
      target: { value: "我的三張" },
    });
    fireEvent.click(screen.getByRole("button", { name: "儲存" }));
    finishArranging();

    const picker = screen.getByRole("region", { name: "選擇牌陣" });
    expect(
      within(picker).getByRole("button", { name: "我的三張" }),
    ).toBeInTheDocument();

    await shuffleAndPick();
    expect(within(picker).getByRole("button", { name: "圓環" })).toBeDisabled();
  });

  it("draws cards 1.5 times larger when the spread has room, smaller when it has not", async () => {
    renderTable();
    await ready();
    const canvas = () =>
      document.querySelector<HTMLElement>(".spread-board__canvas");
    expect(canvas()?.style.getPropertyValue("--slot-w")).toBe(
      `${LARGEST_SLOT_WIDTH_CQW}cqw`,
    );
    fireEvent.click(screen.getByRole("button", { name: "五張十字" }));
    expect(canvas()?.style.getPropertyValue("--slot-w")).toBe(
      `${STANDARD_SLOT_WIDTH_CQW}cqw`,
    );
  });

  it("has no zoom buttons: the table zooms with a pinch only", async () => {
    renderTable();
    await ready();
    for (const name of ["放大牌桌", "縮小牌桌"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });

  it("clears the current spread at once, without asking", async () => {
    renderTable();
    await ready();
    await shuffleAndPick();

    fireEvent.click(screen.getByRole("button", { name: "清除本次牌陣" }));

    expect(
      await screen.findByText("已清除本次牌陣，重新從「經典三張」開始。"),
    ).toBeInTheDocument();
    expect(document.querySelectorAll("[data-draw-card]")).toHaveLength(0);
    expect(screen.getByText("剩餘 78 張")).toBeInTheDocument();
  });
});

describe("DrawExperience template library", () => {
  async function saveAs(name: string) {
    arrangeIfNeeded();
    fireEvent.click(screen.getByRole("button", { name: "儲存目前牌陣" }));
    fireEvent.change(screen.getByLabelText("牌陣名稱"), {
      target: { value: name },
    });
    fireEvent.click(screen.getByRole("button", { name: "儲存" }));
  }

  it("saves the current layout under a name and applies it later", async () => {
    const templateStorage = new MemoryStorage();
    const first = renderTable({ templateStorage });
    await ready();
    chooseBlank();
    addPosition();
    fireEvent.change(screen.getByLabelText(/這個牌位的問題/u), {
      target: { value: "這週最重要的一件事？" },
    });
    fireEvent.click(
      within(slot(1)).getByRole("button", { name: "牌位 1 順時針轉 45°" }),
    );

    await saveAs("每週一張");
    expect(
      await screen.findByText("已把目前牌陣存成「每週一張」。"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "每週一張", pressed: true }),
    ).toBeInTheDocument();
    await waitFor(() => expect(templateStorage.value).toContain("每週一張"));
    first.unmount();

    renderTable({ templateStorage });
    await ready();
    arrange();
    fireEvent.click(screen.getByRole("button", { name: "每週一張" }));
    expect(
      await screen.findByText("已套用「每週一張」，共 1 個牌位。"),
    ).toBeInTheDocument();
    expect(slot(1)).toHaveAttribute("title", "這週最重要的一件事？");
    expect(slot(1).style.getPropertyValue("--rot")).toBe("45deg");
  });

  it("asks for a name and updates a template saved under the same name", async () => {
    renderTable();
    await ready();
    await saveAs("   ");
    expect(await screen.findByText("請輸入牌陣名稱。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));

    await saveAs("我的三張");
    await screen.findByText("已把目前牌陣存成「我的三張」。");
    addPosition();
    await saveAs("我的三張");
    expect(
      await screen.findByText("已更新牌陣庫裡的「我的三張」。"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "我的三張" })).toHaveLength(1);
  });

  it("deletes built-in and saved templates, and restores the built-ins", async () => {
    const templateStorage = new MemoryStorage();
    renderTable({ templateStorage });
    await ready();
    arrange();

    fireEvent.click(
      screen.getByRole("button", { name: "刪除牌陣「經典三張」" }),
    );
    expect(
      screen.getByText("刪除「經典三張」？之後可用「還原預設範例」找回。"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "刪除" }));

    expect(
      await screen.findByText("已刪除「經典三張」，可用「還原預設範例」找回。"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "經典三張" }),
    ).not.toBeInTheDocument();
    // The table keeps what is on it.
    expect(document.querySelectorAll("[data-slot]")).toHaveLength(3);
    await waitFor(() =>
      expect(templateStorage.value).not.toContain("經典三張"),
    );

    fireEvent.click(screen.getByRole("button", { name: "還原預設範例" }));
    expect(
      await screen.findByRole("button", { name: "經典三張" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "還原預設範例" }),
    ).not.toBeInTheDocument();
  });

  it("can cancel a deletion", async () => {
    renderTable();
    await ready();
    arrange();
    fireEvent.click(screen.getByRole("button", { name: "刪除牌陣「圓環」" }));
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.getByRole("button", { name: "圓環" })).toBeInTheDocument();
  });
});
