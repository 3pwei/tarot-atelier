import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chapter } from "@/presentation/components/book/bookPlace";
import { SINGLE_TURN_MS } from "@/presentation/components/book/turning/timing";
import {
  TURN_GRACE_MS,
  usePageTurns,
  type PageTurnsOptions,
} from "@/presentation/components/book/turning/usePageTurns";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
  vi.useRealTimers();
});

const PLACE = chapter("three-card");

function renderTurns(options: Partial<PageTurnsOptions> = {}) {
  return renderHook(() =>
    usePageTurns({
      place: PLACE,
      turned: false,
      entries: [],
      facingPages: true,
      reducedMotion: false,
      sound: { play: vi.fn() },
      soundOn: false,
      ...options,
    }),
  );
}

describe("usePageTurns turnLeaf", () => {
  it("turns one leaf over the place shown, until it lands", async () => {
    const { result } = renderTurns();
    act(() => result.current.turnLeaf("forward"));

    expect(result.current.turn).toMatchObject({
      plan: { kind: "single", direction: "forward" },
      from: PLACE,
      to: PLACE,
    });
    expect(result.current.leafTurning).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(SINGLE_TURN_MS + TURN_GRACE_MS);
    });
    expect(result.current.turn).toBeUndefined();
    expect(result.current.leafTurning).toBe(false);
    expect(result.current.shown).toEqual(PLACE);
  });

  it("lands when the leaf's animations report it has finished", () => {
    const { result } = renderTurns();
    act(() => result.current.turnLeaf("back"));
    const leaf = result.current.turn;
    if (!leaf) throw new Error("no leaf turning");

    act(() => result.current.finishTurn(leaf));
    expect(result.current.leafTurning).toBe(false);
  });

  it("turns no leaf under reduced motion", () => {
    const { result } = renderTurns({ reducedMotion: true });
    act(() => result.current.turnLeaf("forward"));
    expect(result.current.turn).toBeUndefined();
    expect(result.current.leafTurning).toBe(false);
  });
});
