import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useHoldToShuffle } from "@/presentation/components/draw/useHoldToShuffle";

function Deck(props: {
  readonly enabled?: boolean;
  readonly onHold: () => void;
  readonly onRelease: (heldMs: number) => void;
  readonly now: () => number;
}) {
  const hold = useHoldToShuffle({
    enabled: props.enabled ?? true,
    onHold: props.onHold,
    onRelease: props.onRelease,
    now: props.now,
  });
  return (
    <button
      type="button"
      {...hold.handlers}
      onPointerDown={(event) => hold.press(event.pointerId)}
    >
      洗牌
    </button>
  );
}

function setup(enabled = true) {
  let time = 1_000;
  const onHold = vi.fn();
  const onRelease = vi.fn();
  render(
    <Deck
      enabled={enabled}
      onHold={onHold}
      onRelease={onRelease}
      now={() => time}
    />,
  );
  return {
    onHold,
    onRelease,
    button: screen.getByRole("button", { name: "洗牌" }),
    wait: (ms: number) => {
      time += ms;
    },
  };
}

describe("useHoldToShuffle", () => {
  it("shuffles while the pointer is held and reports how long", () => {
    const { button, onHold, onRelease, wait } = setup();

    fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
    expect(onHold).toHaveBeenCalledTimes(1);
    wait(1_800);
    fireEvent.pointerUp(window, { pointerId: 1 });

    expect(onRelease).toHaveBeenCalledWith(1_800);
  });

  it("ends the shuffle when the pointer is let go outside the deck", () => {
    const { button, onRelease } = setup();

    fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
    fireEvent.pointerCancel(window, { pointerId: 1 });

    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it("keeps shuffling when another finger touches and lifts", () => {
    const { button, onRelease } = setup();

    fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
    fireEvent.pointerUp(window, { pointerId: 2 });
    fireEvent.pointerCancel(window, { pointerId: 2 });
    expect(onRelease).not.toHaveBeenCalled();

    fireEvent.pointerUp(window, { pointerId: 1 });
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it("ignores the click that follows letting go", () => {
    const { button, onHold, onRelease } = setup();

    fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
    fireEvent.pointerUp(window, { pointerId: 1 });
    fireEvent.click(button);

    expect(onHold).toHaveBeenCalledTimes(1);
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it("holds with the space bar, ignoring key repeats", () => {
    const { button, onHold, onRelease, wait } = setup();

    fireEvent.keyDown(button, { key: " " });
    fireEvent.keyDown(button, { key: " ", repeat: true });
    wait(900);
    fireEvent.keyUp(button, { key: " " });

    expect(onHold).toHaveBeenCalledTimes(1);
    expect(onRelease).toHaveBeenCalledWith(900);
  });

  it("shuffles one round on a click alone, as Enter gives", () => {
    const { button, onHold, onRelease } = setup();

    fireEvent.click(button);

    expect(onHold).toHaveBeenCalledTimes(1);
    expect(onRelease).toHaveBeenCalledWith(0);
  });

  it("does nothing while shuffling is not possible", () => {
    const { button, onHold } = setup(false);

    fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
    fireEvent.click(button);

    expect(onHold).not.toHaveBeenCalled();
  });
});
