import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PageSoundKind } from "@/application/ports/pageSound";
import { MemoryTextStorage } from "@/application/testing/memoryTextStorage";
import { createTestServices } from "@/composition/testing/createTestServices";
import { AtelierBook } from "@/presentation/components/book/AtelierBook";
import { openingMs } from "@/presentation/components/book/turning/opening";
import {
  riffleTimeline,
  SINGLE_TURN_MS,
} from "@/presentation/components/book/turning/timing";
import { AtelierServicesProvider } from "@/presentation/services/atelierServices";

/** A phone that animates: no reduced motion, one page at a time. */
function phoneScreen() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((media: string) => ({
      matches: false,
      media,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  window.history.replaceState(null, "", "/");
  phoneScreen();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderBook(soundStorage = new MemoryTextStorage()) {
  const played: { kind: PageSoundKind; durationMs: number }[] = [];
  const services = createTestServices({
    pageSound: {
      play: (kind, durationMs) => played.push({ kind, durationMs }),
    },
    soundPreferenceStorage: soundStorage,
  });
  render(
    <AtelierServicesProvider services={services}>
      <AtelierBook />
    </AtelierServicesProvider>,
  );
  return { played, soundStorage };
}

const tap = (element: Element) => fireEvent.click(element, { detail: 1 });
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
/** Lets the browser-only reads after mounting (storage, sizes) settle. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
}

describe("page turns", () => {
  it("plays the opening, then shows the frontispiece", async () => {
    renderBook();
    await settle();
    tap(screen.getByRole("button", { name: "打開魔法書" }));

    const scene = document.querySelector(".opening");
    expect(scene).toBeInTheDocument();
    expect(scene).toHaveAttribute("aria-hidden", "true");
    // The frontispiece already waits underneath; the scene fades off it.
    expect(
      screen.getByRole("img", { name: /巫師站在高塔上/u }),
    ).toBeInTheDocument();

    advance(openingMs());
    expect(document.querySelector(".opening")).toBeNull();
    expect(
      screen.getByRole("img", { name: /巫師站在高塔上/u }),
    ).toBeInTheDocument();
  });

  it("turns one page to a neighbour, with the leaf hidden from assistive tech", async () => {
    window.history.replaceState(null, "", "/#contents");
    renderBook();
    await settle();
    const first = screen.getByRole("button", { name: /^The Three Cards，/u });
    tap(first);
    tap(first);

    const leaf = document.querySelector(".page-turn");
    expect(leaf).toBeInTheDocument();
    expect(leaf).toHaveAttribute("aria-hidden", "true");
    expect(leaf).toHaveAttribute("inert");
    expect(document.querySelectorAll(".page-turn__sheet")).toHaveLength(0);

    advance(SINGLE_TURN_MS);
    expect(document.querySelector(".page-turn")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "The Three Cards" }),
    ).toBeInTheDocument();
  });

  it("riffles blank sheets past the pages in between", async () => {
    window.history.replaceState(null, "", "/#contents");
    renderBook();
    await settle();
    const codex = screen.getByRole("button", { name: /^The Codex，/u });
    tap(codex);
    tap(codex);

    expect(document.querySelectorAll(".page-turn__sheet")).toHaveLength(7);
    advance(riffleTimeline().totalMs);
    expect(
      screen.getByRole("heading", { name: "The Codex of Cards" }),
    ).toBeInTheDocument();
  });

  it("keeps a chapter's table off the page until the leaf has landed", async () => {
    window.history.replaceState(null, "", "/#contents");
    renderBook();
    await settle();
    const first = screen.getByRole("button", { name: /^The Three Cards，/u });
    tap(first);
    tap(first);

    expect(document.querySelector(".draw-experience")).toBeNull();
    advance(SINGLE_TURN_MS);
    expect(document.querySelector(".draw-experience")).toBeInTheDocument();
  });

  it("makes no sound until the reader turns it on, then remembers", async () => {
    window.history.replaceState(null, "", "/#contents");
    const { played, soundStorage } = renderBook();
    await settle();
    const first = screen.getByRole("button", { name: /^The Three Cards，/u });
    tap(first);
    tap(first);
    advance(SINGLE_TURN_MS);
    expect(played).toEqual([]);

    tap(screen.getByRole("button", { name: "回到目錄" }));
    advance(SINGLE_TURN_MS);
    const toggle = screen.getByRole("button", { name: "翻頁聲" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    tap(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(JSON.parse(soundStorage.read() ?? "")).toMatchObject({
      pageSounds: true,
    });

    const again = screen.getByRole("button", { name: /^The Three Cards，/u });
    tap(again);
    tap(again);
    expect(played).toEqual([{ kind: "turn", durationMs: SINGLE_TURN_MS }]);
  });

  it("does not turn for a link opened straight at a chapter", async () => {
    window.history.replaceState(null, "", "/#spread-circle");
    renderBook();
    await settle();
    expect(document.querySelector(".page-turn")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "The Circle" }),
    ).toBeInTheDocument();
  });
});

describe("reduced motion", () => {
  it("swaps pages at once, with no opening and no leaf", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((media: string) => ({
        matches: media.includes("reduce"),
        media,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    renderBook();
    await settle();
    tap(screen.getByRole("button", { name: "打開魔法書" }));
    expect(document.querySelector(".opening")).toBeNull();
    expect(
      screen.getByRole("img", { name: /巫師站在高塔上/u }),
    ).toBeInTheDocument();

    tap(screen.getByRole("button", { name: "翻到目錄" }));
    expect(document.querySelector(".page-turn")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Contents" }),
    ).toBeInTheDocument();
  });
});
