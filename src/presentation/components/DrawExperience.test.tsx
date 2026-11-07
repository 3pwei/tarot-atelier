import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SpreadSessionStorage } from "@/application/ports/textStorage";
import { DrawExperience } from "@/presentation/components/DrawExperience";

class MemoryStorage implements SpreadSessionStorage {
  value: string | null = null;
  read() {
    return this.value;
  }
  write(value: string) {
    this.value = value;
  }
  clear() {
    this.value = null;
  }
}

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
    readonly storage?: MemoryStorage;
    readonly templateStorage?: MemoryStorage;
  } = {},
) {
  const storage = options.storage ?? new MemoryStorage();
  const templateStorage = options.templateStorage ?? new MemoryStorage();
  const view = render(
    <DrawExperience
      randomSource={options.random ?? (() => 0.9)}
      storage={storage}
      templateStorage={templateStorage}
      createId={idFactory()}
    />,
  );
  return { ...view, storage, templateStorage };
}

async function ready() {
  await screen.findByText("準備好了，請洗牌");
}

/** Shuffles, then deals every empty position with one click on the deck. */
async function shuffleAndDeal(count = 3) {
  fireEvent.click(screen.getByRole("button", { name: "洗牌" }));
  const pile = await screen.findByRole("button", {
    name: `從牌堆發牌到 ${count} 個牌位`,
  });
  fireEvent.click(pile);
  await screen.findByText("點擊卡牌，以火焰逐一揭示牌面");
  return pile;
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

/** The numbered handle on the table (the reading list has a twin button). */
function handle(index: number): HTMLElement {
  return within(slot(index)).getByRole("button", {
    name: new RegExp(`^牌位 ${index}：`, "u"),
  });
}

function chooseBlank() {
  fireEvent.click(screen.getByRole("button", { name: "空白牌桌" }));
}

function addPosition() {
  fireEvent.click(screen.getByRole("button", { name: "＋ 新增牌位" }));
}

describe("DrawExperience spread table", () => {
  it("starts with three numbered positions that each carry a question", async () => {
    renderTable();
    await ready();

    expect(document.querySelectorAll("[data-slot]")).toHaveLength(3);
    const list = screen.getByRole("list", { name: "牌位與問題" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("3 / 12 牌位")).toBeInTheDocument();
  });

  it("deals every position with one deck click and ignores repeats", async () => {
    renderTable();
    await ready();

    fireEvent.click(screen.getByRole("button", { name: "洗牌" }));
    const pile = await screen.findByRole("button", {
      name: "從牌堆發牌到 3 個牌位",
    });
    pile.focus();
    expect(pile).toHaveFocus();
    fireEvent.click(pile);
    fireEvent.click(pile);

    await screen.findByText("點擊卡牌，以火焰逐一揭示牌面");
    expect(document.querySelectorAll("[data-draw-card]")).toHaveLength(3);
    for (const index of [1, 2, 3]) {
      expect(slot(index).querySelectorAll("[data-draw-card]")).toHaveLength(1);
    }
    expect(screen.getByText("剩餘 75 張")).toBeInTheDocument();
  });

  it("keeps every face hidden until the person reveals it, in any order", async () => {
    renderTable();
    await ready();
    await shuffleAndDeal();

    const cards = [1, 2, 3].map((index) =>
      slot(index).querySelector("[data-draw-card='primary']"),
    );
    for (const card of cards) {
      expect(card).toHaveAttribute("data-reveal-state", "sealed");
    }
    expect(screen.getByRole("button", { name: "洗牌" })).toBeDisabled();

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
      screen.getByRole("button", { name: /^牌位 1 主牌：.+，(正位|逆位)$/u }),
    ).toBeInTheDocument();
  });

  it("deals only the new empty positions after the table grows", async () => {
    renderTable();
    await ready();
    await shuffleAndDeal();
    for (const index of [1, 2, 3]) reveal(index);
    await screen.findByText("牌陣已完成");

    addPosition();
    fireEvent.change(screen.getByLabelText(/這個牌位的問題/u), {
      target: { value: "還有什麼要知道？" },
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "從牌堆發牌到 1 個牌位" }),
    );

    await screen.findByRole("button", { name: "以火焰揭示牌位 4 主牌" });
    expect(document.querySelectorAll("[data-draw-card]")).toHaveLength(4);
    expect(screen.getByText("剩餘 74 張")).toBeInTheDocument();
  });

  it("puts a jumper on the same numbered position as its primary card", async () => {
    let calls = 0;
    const random = () => {
      calls += 1;
      return calls === 78 ? 0.029 : 0.9;
    };
    renderTable({ random });
    await ready();
    await shuffleAndDeal();

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
    await shuffleAndDeal();
    expect(
      screen.getByText("所有牌翻開後，就能產生解讀。"),
    ).toBeInTheDocument();
    [1, 2, 3].forEach((index) => reveal(index));
    await screen.findByText("牌陣已完成");

    fireEvent.click(screen.getByRole("button", { name: "產生範例解讀" }));
    expect(await screen.findByText("全局關聯")).toBeInTheDocument();
    expect(screen.getByText("範例解牌，不是 AI")).toBeInTheDocument();
    expect(screen.getAllByText("單牌象徵").length).toBeGreaterThan(0);
  });

  it("never shows players the jumper probability", async () => {
    const { container } = renderTable();
    await ready();
    expect(container.textContent).not.toMatch(/\d+(\.\d+)?\s*%/u);
    await shuffleAndDeal();
    expect(container.textContent).not.toMatch(/\d+(\.\d+)?\s*%/u);
  });

  it("requires a question on every position before shuffling", async () => {
    renderTable();
    await ready();
    chooseBlank();

    expect(await screen.findByText("請先新增至少一個牌位")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "洗牌" })).toBeDisabled();

    addPosition();
    expect(
      await screen.findByText("請先為牌位 1 設定問題"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "洗牌" })).toBeDisabled();

    const question = screen.getByLabelText(/這個牌位的問題/u);
    fireEvent.change(question, { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "洗牌" })).toBeDisabled();
    fireEvent.change(question, { target: { value: "我該把力氣放在哪裡？" } });

    await screen.findByText("準備好了，請洗牌");
    expect(screen.getByRole("button", { name: "洗牌" })).toBeEnabled();
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

  it("rotates a selected position with its turning-arrow button", async () => {
    renderTable();
    await ready();
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

  it("moves a drawn position without redrawing it", async () => {
    renderTable();
    await ready();
    await shuffleAndDeal();
    const before = slot(1).querySelector("[data-draw-card='primary']");

    fireEvent.keyDown(handle(1), { key: "ArrowDown", code: "ArrowDown" });

    expect(slot(1).style.getPropertyValue("--y")).toBe("0.51");
    expect(slot(1).querySelector("[data-draw-card='primary']")).toBe(before);
    expect(screen.getByText("剩餘 75 張")).toBeInTheDocument();
    fireEvent.click(handle(1));
    expect(screen.getByRole("button", { name: "刪除牌位" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "五張十字" })).toBeDisabled();
  });

  it("restores the spread, draws and reveals after a reload", async () => {
    const storage = new MemoryStorage();
    const first = renderTable({ storage });
    await ready();
    fireEvent.change(screen.getByLabelText(/主問題/u), {
      target: { value: "今年的重心？" },
    });
    await shuffleAndDeal();
    reveal(1);
    await waitFor(() => expect(storage.value).toContain("今年的重心？"));
    await waitFor(() =>
      expect(storage.value).toContain('revealedInstanceIds":["'),
    );
    first.unmount();

    renderTable({ storage });
    expect(await screen.findByText("已載入上次的牌陣。")).toBeInTheDocument();
    expect(screen.getByLabelText(/主問題/u)).toHaveValue("今年的重心？");
    expect(slot(1).querySelector("[data-draw-card='primary']")).toHaveAttribute(
      "data-reveal-state",
      "revealed",
    );
    expect(slot(2).querySelector("[data-draw-card='primary']")).toHaveAttribute(
      "data-reveal-state",
      "sealed",
    );
    expect(screen.getByText("剩餘 75 張")).toBeInTheDocument();
    reveal(2);
    reveal(3);
    await screen.findByText("牌陣已完成");
  });

  it("recovers from corrupted saved data without a blank screen", async () => {
    const storage = new MemoryStorage();
    const templateStorage = new MemoryStorage();
    storage.value = '{"schemaVersion":2,"session":{"spread":42}}';
    templateStorage.value = "not json";
    renderTable({ storage, templateStorage });

    expect(
      await screen.findByText(
        "本機儲存的牌陣無法讀取，已重新開始。本機的牌陣庫無法讀取，已換回預設範例。",
      ),
    ).toBeInTheDocument();
    expect(document.querySelectorAll("[data-slot]")).toHaveLength(3);
  });

  it("clears the current spread after confirmation", async () => {
    const { storage } = renderTable();
    await ready();
    await shuffleAndDeal();

    fireEvent.click(screen.getByRole("button", { name: "清除本次牌陣" }));
    fireEvent.click(screen.getByRole("button", { name: "確定清除" }));

    expect(
      await screen.findByText("已清除本次牌陣，重新從「經典三張」開始。"),
    ).toBeInTheDocument();
    expect(document.querySelectorAll("[data-draw-card]")).toHaveLength(0);
    expect(screen.getByText("剩餘 78 張")).toBeInTheDocument();
    await waitFor(() => expect(storage.value).not.toContain("drawResult"));
  });
});

describe("DrawExperience template library", () => {
  async function saveAs(name: string) {
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
    fireEvent.click(screen.getByRole("button", { name: "刪除牌陣「圓環」" }));
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.getByRole("button", { name: "圓環" })).toBeInTheDocument();
  });
});
