import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryTextStorage } from "@/application/testing/memoryTextStorage";
import { createTestServices } from "@/composition/testing/createTestServices";
import {
  BUILT_IN_TEMPLATES,
  serializeTemplateLibrary,
} from "@/domain/spread/templates";
import { AtelierBook } from "@/presentation/components/book/AtelierBook";
import { AtelierServicesProvider } from "@/presentation/services/atelierServices";

beforeEach(() => {
  window.history.replaceState(null, "", "/");
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

function renderBook(templateStorage = new MemoryTextStorage()) {
  const services = createTestServices({ templateStorage });
  return render(
    <AtelierServicesProvider services={services}>
      <AtelierBook />
    </AtelierServicesProvider>,
  );
}

/** A pointer tap: a click that carries a click count, unlike Enter. */
function tap(element: Element) {
  fireEvent.click(element, { detail: 1 });
}

async function openToContents() {
  tap(screen.getByRole("button", { name: "打開魔法書" }));
  tap(await screen.findByRole("button", { name: "翻到目錄" }));
  return screen.findByRole("button", { name: /^The Cross，/u });
}

describe("AtelierBook", () => {
  it("opens closed on the desk, and the cover opens to the frontispiece", async () => {
    renderBook();
    tap(screen.getByRole("button", { name: "打開魔法書" }));

    expect(
      await screen.findByRole("img", { name: /巫師站在高塔上/u }),
    ).toBeInTheDocument();
    expect(screen.getByText("僅供娛樂與自我反思")).toBeInTheDocument();
  });

  it("lists every spread as a chapter, then the codex and the records", async () => {
    renderBook();
    await openToContents();

    const titles = screen
      .getAllByRole("button", { name: /，第 \d+ 頁$/u })
      .map((button) => button.getAttribute("aria-label")?.split("，")[0]);
    expect(titles).toEqual([
      "The Three Cards",
      "The Single Card",
      "The Cross",
      "The Circle",
      "The Codex",
      "The Records",
    ]);
  });

  it("lights an entry on the first tap and turns to it on the second", async () => {
    renderBook();
    const cross = await openToContents();

    tap(cross);
    expect(cross).toHaveAttribute("data-lit");
    expect(window.location.hash).toBe("#contents");

    tap(cross);
    expect(
      await screen.findByRole("heading", { name: "The Cross" }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe("#spread-five-card");
    await waitFor(() =>
      expect(document.querySelectorAll("[data-slot]")).toHaveLength(5),
    );
  });

  it("moves the light when another entry is tapped", async () => {
    renderBook();
    const cross = await openToContents();
    const circle = screen.getByRole("button", { name: /^The Circle，/u });

    tap(cross);
    tap(circle);
    expect(cross).not.toHaveAttribute("data-lit");
    expect(circle).toHaveAttribute("data-lit");
    expect(window.location.hash).toBe("#contents");
  });

  it("turns at once from the keyboard, where there is no second tap", async () => {
    renderBook();
    const cross = await openToContents();

    // Enter and Space press a button with a click that has no click count.
    fireEvent.click(cross, { detail: 0 });
    expect(
      await screen.findByRole("heading", { name: "The Cross" }),
    ).toBeInTheDocument();
  });

  it("goes back to the contents from a chapter", async () => {
    renderBook();
    const cross = await openToContents();
    tap(cross);
    tap(cross);
    await screen.findByRole("heading", { name: "The Cross" });

    tap(screen.getByRole("button", { name: "回到目錄" }));
    expect(
      await screen.findByRole("heading", { name: "Contents" }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe("#contents");
  });

  it("opens straight at a chapter a link points to", async () => {
    window.history.replaceState(null, "", "/#spread-circle");
    renderBook();

    expect(
      await screen.findByRole("heading", { name: "The Circle" }),
    ).toBeInTheDocument();
  });

  it("opens the contents when a link points to a spread that was deleted", async () => {
    window.history.replaceState(null, "", "/#spread-five-card");
    const storage = new MemoryTextStorage();
    storage.write(
      serializeTemplateLibrary(
        BUILT_IN_TEMPLATES.filter((template) => template.id !== "five-card"),
      ),
    );
    renderBook(storage);

    expect(
      await screen.findByRole("heading", { name: "Contents" }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe("#contents");
  });

  it("names a spread the reader saved as they named it", async () => {
    const storage = new MemoryTextStorage();
    storage.write(
      serializeTemplateLibrary([
        ...BUILT_IN_TEMPLATES,
        {
          id: "mine",
          name: "斜放三張",
          builtIn: false,
          positions: [{ name: "", question: "?", x: 0.5, y: 0.5, rotation: 0 }],
        },
      ]),
    );
    renderBook(storage);
    await openToContents();

    expect(
      screen.getByRole("button", { name: "斜放三張，第 11 頁" }),
    ).toBeInTheDocument();
  });

  it("opens the codex from the appendix", async () => {
    renderBook();
    await openToContents();
    const codex = screen.getByRole("button", { name: /^The Codex，/u });
    tap(codex);
    tap(codex);

    expect(
      await screen.findByRole("heading", { name: "The Codex of Cards" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "單卡檢視" }),
    ).toBeInTheDocument();
    expect(screen.getByText("22 張")).toBeInTheDocument();
  });

  it("opens the records printed on the page, and Back returns to the contents", async () => {
    window.history.replaceState(null, "", "/#records");
    renderBook();

    expect(
      await screen.findByRole("heading", { name: "The Records" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/還沒有紀錄/u)).toBeInTheDocument();
    tap(screen.getByRole("button", { name: "回到目錄" }));
    expect(
      await screen.findByRole("heading", { name: "Contents" }),
    ).toBeInTheDocument();
  });

  it("asks before leaving a chapter while a layout is being edited", async () => {
    window.history.replaceState(null, "", "/#spread-three-card");
    renderBook();
    await screen.findByRole("heading", { name: "The Three Cards" });
    tap(await screen.findByRole("button", { name: "編輯牌陣" }));

    tap(screen.getByRole("button", { name: "回到目錄" }));
    const question = await screen.findByRole("alertdialog", {
      name: "離開這一章？",
    });
    expect(question).toBeInTheDocument();

    tap(screen.getByRole("button", { name: "取消" }));
    expect(window.location.hash).toBe("#spread-three-card");

    tap(screen.getByRole("button", { name: "回到目錄" }));
    tap(await screen.findByRole("button", { name: "離開" }));
    expect(
      await screen.findByRole("heading", { name: "Contents" }),
    ).toBeInTheDocument();
  });

  it("leaves a chapter at once when nothing would be lost", async () => {
    window.history.replaceState(null, "", "/#spread-three-card");
    renderBook();
    await screen.findByRole("heading", { name: "The Three Cards" });

    tap(screen.getByRole("button", { name: "回到目錄" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Contents" }),
    ).toBeInTheDocument();
  });
});
