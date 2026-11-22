import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  fixtureDraw,
  fixtureSpread,
} from "@/domain/history/testing/historyFixtures";
import { movePosition } from "@/domain/spread/spread";
import type { Spread } from "@/domain/spread/types";
import { captureEditBaseline } from "@/presentation/components/spread/editBaseline";
import type { EditBaseline } from "@/presentation/components/spread/editBaseline";
import type { SpreadAction } from "@/presentation/components/spread/spreadState";
import { useArrangeMode } from "@/presentation/components/spread/useArrangeMode";

const undrawn = fixtureSpread({ questions: ["現在"], draws: [] });
const drawn = fixtureSpread({
  questions: ["現在"],
  draws: [fixtureDraw({ drawNumber: 1, cardId: "a" })],
});

function moved(spread: Spread): Spread {
  const update = movePosition(spread, "p1", { x: 0.9, y: 0.9 });
  if (!update.ok) throw new Error(update.code);
  return update.spread;
}

function setup(spread: Spread, editBaseline?: EditBaseline) {
  const dispatch = vi.fn<(action: SpreadAction) => void>();
  const onDrawsCleared = vi.fn();
  const hook = renderHook(
    ({ table, baseline }) =>
      useArrangeMode({
        spread: table,
        ...(baseline ? { editBaseline: baseline } : {}),
        library: [],
        dispatch,
        onDrawsCleared,
      }),
    { initialProps: { table: spread, baseline: editBaseline } },
  );
  const types = () => dispatch.mock.calls.map(([action]) => action.type);
  return { ...hook, dispatch, onDrawsCleared, types };
}

describe("useArrangeMode", () => {
  it("enters arrange mode straight away when nothing is drawn", () => {
    const { result, types } = setup(undrawn);

    act(() => result.current.toggle());

    expect(result.current.mode).toBe("arrange");
    expect(result.current.confirmation).toBeUndefined();
    expect(types()).toEqual(["begin-edit"]);
  });

  it("asks before returning drawn cards, then clears them and enters", () => {
    const { result, types, onDrawsCleared } = setup(drawn);

    act(() => result.current.toggle());
    expect(result.current.mode).toBe("play");
    expect(result.current.confirmation).toEqual({ kind: "clear-draws" });

    act(() => result.current.confirm());
    expect(result.current.mode).toBe("arrange");
    expect(result.current.confirmation).toBeUndefined();
    expect(onDrawsCleared).toHaveBeenCalledOnce();
    expect(types()).toEqual(["clear-draws", "begin-edit"]);
  });

  it("stays in play when the clearing question is cancelled", () => {
    const { result, types } = setup(drawn);

    act(() => result.current.toggle());
    act(() => result.current.cancel());

    expect(result.current.mode).toBe("play");
    expect(result.current.confirmation).toBeUndefined();
    expect(types()).toEqual([]);
  });

  it("leaves without asking when the layout is unchanged", () => {
    const { result, rerender, types } = setup(undrawn);
    act(() => result.current.toggle());
    rerender({ table: undrawn, baseline: captureEditBaseline(undrawn) });

    act(() => result.current.toggle());

    expect(result.current.mode).toBe("play");
    expect(types()).toEqual(["begin-edit", "end-edit", "select"]);
  });

  it("asks before dropping an unsaved layout, then reverts it", () => {
    const { result, rerender, types } = setup(undrawn);
    act(() => result.current.toggle());
    rerender({ table: moved(undrawn), baseline: captureEditBaseline(undrawn) });

    act(() => result.current.toggle());
    expect(result.current.mode).toBe("arrange");
    expect(result.current.confirmation?.kind).toBe("leave-unsaved");

    act(() => result.current.confirm());
    expect(result.current.mode).toBe("play");
    expect(types()).toEqual(["begin-edit", "revert-edit", "select"]);
  });
});
