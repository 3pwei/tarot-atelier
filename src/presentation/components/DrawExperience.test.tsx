import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SpreadSessionStorage } from "@/application/ports/spreadSessionStorage";
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
  } = {},
) {
  const storage = options.storage ?? new MemoryStorage();
  const view = render(
    <DrawExperience
      randomSource={options.random ?? (() => 0.9)}
      storage={storage}
      createId={idFactory()}
    />,
  );
  return { ...view, storage };
}

async function ready() {
  await screen.findByText("準備好了，請洗牌");
}

async function shuffleAndDraw(index = 1) {
  fireEvent.click(screen.getByRole("button", { name: "洗牌" }));
  const pile = await screen.findByRole("button", {
    name: `從牌堆為牌位 ${index} 抽牌`,
  });
  fireEvent.click(pile);
  return pile;
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

function chooseCustom() {
  fireEvent.click(screen.getByRole("button", { name: "完全自訂" }));
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

  it("deals keyboard draws in number order and blocks duplicate clicks", async () => {
    renderTable();
    await ready();

    fireEvent.click(screen.getByRole("button", { name: "洗牌" }));
    const pile = await screen.findByRole("button", {
      name: "從牌堆為牌位 1 抽牌",
    });
    pile.focus();
    expect(pile).toHaveFocus();
    fireEvent.click(pile);
    fireEvent.click(pile);

    await screen.findByText("點擊卡牌，以火焰揭示牌面");
    expect(document.querySelectorAll("[data-draw-card]")).toHaveLength(1);
    expect(slot(1).querySelector("[data-draw-card]")).not.toBeNull();
    expect(screen.getByText("剩餘 77 張")).toBeInTheDocument();
  });

  it("keeps the face hidden until revealed, then offers the next position", async () => {
    renderTable();
    await ready();
    await shuffleAndDraw();

    const reveal = await screen.findByRole("button", {
      name: "以火焰揭示牌位 1 主牌",
    });
    const card = slot(1).querySelector("[data-draw-card='primary']");
    expect(card).toHaveAttribute("data-reveal-state", "sealed");
    expect(screen.getByRole("button", { name: "洗牌" })).toBeDisabled();

    fireEvent.click(reveal);

    await screen.findByText("請為牌位 2 抽牌");
    expect(card).toHaveAttribute("data-reveal-state", "revealed");
    expect(
      screen.getByRole("button", { name: /^牌位 1 主牌：.+，(正位|逆位)$/u }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "從牌堆為牌位 2 抽牌" }),
    );
    await screen.findByRole("button", { name: "以火焰揭示牌位 2 主牌" });
    expect(slot(2).querySelector("[data-draw-card]")).not.toBeNull();
    expect(screen.getByText("剩餘 76 張")).toBeInTheDocument();
  });

  it("puts a jumper on the same numbered position as its primary card", async () => {
    let calls = 0;
    const random = () => {
      calls += 1;
      return calls === 78 ? 0.029 : 0.9;
    };
    renderTable({ random });
    await ready();
    await shuffleAndDraw();

    await screen.findByText("點擊卡牌，以火焰揭示牌面");
    const first = slot(1);
    expect(first.querySelectorAll("[data-draw-card]")).toHaveLength(2);
    expect(within(first).getByText("跳牌")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-slot]")).toHaveLength(3);
    expect(screen.getByText("剩餘 76 張")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "以火焰揭示牌位 1 主牌" }),
    );
    expect(screen.queryByText("請為牌位 2 抽牌")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "以火焰揭示牌位 1 跳牌" }),
    );
    await screen.findByText("請為牌位 2 抽牌");
  });

  it("never shows players the jumper probability", async () => {
    const { container } = renderTable();
    await ready();
    expect(container.textContent).not.toMatch(/\d+(\.\d+)?\s*%/u);
    await shuffleAndDraw();
    await screen.findByText("點擊卡牌，以火焰揭示牌面");
    expect(container.textContent).not.toMatch(/\d+(\.\d+)?\s*%/u);
  });

  it("requires a question on every position before shuffling", async () => {
    renderTable();
    await ready();
    chooseCustom();

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
    chooseCustom();
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
    await shuffleAndDraw();
    await screen.findByRole("button", { name: "以火焰揭示牌位 1 主牌" });
    const before = slot(1).querySelector("[data-draw-card='primary']");

    fireEvent.keyDown(handle(1), {
      key: "ArrowDown",
      code: "ArrowDown",
    });

    expect(slot(1).style.getPropertyValue("--y")).toBe("0.51");
    expect(slot(1).querySelector("[data-draw-card='primary']")).toBe(before);
    expect(screen.getByText("剩餘 77 張")).toBeInTheDocument();
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
    await shuffleAndDraw();
    fireEvent.click(
      await screen.findByRole("button", { name: "以火焰揭示牌位 1 主牌" }),
    );
    await screen.findByText("請為牌位 2 抽牌");
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
    expect(screen.getByText("剩餘 77 張")).toBeInTheDocument();
    expect(screen.getByText("準備好了，請洗牌")).toBeInTheDocument();
  });

  it("recovers from corrupted saved data without a blank screen", async () => {
    const storage = new MemoryStorage();
    storage.value = '{"schemaVersion":1,"session":{"spread":42}}';
    renderTable({ storage });

    expect(
      await screen.findByText("本機儲存的牌陣無法讀取，已重新開始。"),
    ).toBeInTheDocument();
    expect(document.querySelectorAll("[data-slot]")).toHaveLength(3);
  });

  it("clears the current spread after confirmation", async () => {
    const { storage } = renderTable();
    await ready();
    await shuffleAndDraw();
    await screen.findByRole("button", { name: "以火焰揭示牌位 1 主牌" });

    fireEvent.click(screen.getByRole("button", { name: "清除本次牌陣" }));
    fireEvent.click(screen.getByRole("button", { name: "確定清除" }));

    expect(
      await screen.findByText("已清除本次牌陣，重新從經典三張開始。"),
    ).toBeInTheDocument();
    expect(document.querySelectorAll("[data-draw-card]")).toHaveLength(0);
    expect(screen.getByText("剩餘 78 張")).toBeInTheDocument();
    await waitFor(() => expect(storage.value).not.toContain("drawResult"));
  });
});
