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

/** A screen that animates: no reduced motion; facing pages if wide. */
function screenOf(facingPages: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((media: string) => ({
      matches: facingPages && media.includes("min-width"),
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

/** A phone: one page at a time. */
const phoneScreen = () => screenOf(false);

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
  it("turns over the page being left, untouched, with blank paper beneath", async () => {
    screenOf(true);
    window.history.replaceState(null, "", "/#contents");
    renderBook();
    await settle();
    const first = screen.getByRole("button", { name: /^The Three Cards，/u });
    tap(first);
    tap(first);

    // The contents stay as they are; the leaf alone is new.
    expect(first).toBeInTheDocument();
    expect(document.querySelector(".page-turn__still")).toBeNull();
    // The chapter beneath and on the leaf's back is blank until it lands.
    const under = document.querySelector(".page-turn__under-page");
    const back = document.querySelector(".page-turn__back");
    expect(under).toBeInTheDocument();
    expect(back).toBeInTheDocument();
    expect(under).not.toHaveTextContent("The Three Cards");
    expect(back).not.toHaveTextContent("The Three Cards");
    expect(document.querySelector(".page-turn__verso")).toBeNull();

    advance(SINGLE_TURN_MS);
    expect(document.querySelector(".page-turn")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "The Three Cards" }),
    ).toBeInTheDocument();
  });

  it("turning back with facing pages, lays the frontispiece under the lifting leaf", async () => {
    screenOf(true);
    window.history.replaceState(null, "", "/#spread-three-card");
    renderBook();
    await settle();
    tap(screen.getByRole("button", { name: "回到目錄" }));

    const still = document.querySelector(".page-turn__still");
    expect(still).toHaveAttribute("inert");
    expect(still?.querySelector(".book-frontispiece")).not.toBeNull();
    expect(document.querySelector(".page-turn__under-page")).toBeNull();
    advance(SINGLE_TURN_MS);
    expect(document.querySelector(".page-turn__still")).toBeNull();
  });

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
    // On a phone there is no left page: the back shows the front's ink through.
    expect(document.querySelector(".page-turn__verso")).toBeInTheDocument();
    expect(document.querySelector(".page-turn__back")).toBeNull();

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

  it("lays a lit chapter out unseen, and shows that same page once the leaf lands", async () => {
    window.history.replaceState(null, "", "/#contents");
    renderBook();
    await settle();
    const first = screen.getByRole("button", { name: /^The Three Cards，/u });
    tap(first);

    // Lit, its table waits unseen beneath the contents, out of reach.
    const unseen = document.querySelector(".book-place[data-unseen]");
    expect(unseen).toHaveAttribute("inert");
    expect(unseen).toHaveAttribute("aria-hidden", "true");
    const table = unseen?.querySelector(".draw-experience");
    expect(table).toBeInTheDocument();

    tap(first);
    advance(SINGLE_TURN_MS);
    expect(document.querySelector(".book-place[data-unseen]")).toBeNull();
    expect(document.querySelector(".draw-experience")).toBe(table);
  });

  it("turns from the keyboard with nothing laid out beforehand", async () => {
    window.history.replaceState(null, "", "/#contents");
    renderBook();
    await settle();
    const first = screen.getByRole("button", { name: /^The Three Cards，/u });
    fireEvent.click(first, { detail: 0 });

    expect(document.querySelector(".book-place[data-unseen]")).toBeNull();
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
