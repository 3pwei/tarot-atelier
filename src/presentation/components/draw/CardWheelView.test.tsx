import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { openFan, takeSlots } from "@/presentation/components/draw/cardFan";
import { CardWheelView } from "@/presentation/components/draw/CardWheelView";

beforeAll(() => {
  // jsdom has no pointer capture; the wheel only needs the call to exist.
  HTMLElement.prototype.setPointerCapture ??= () => undefined;
});

function renderWheel(onPick = vi.fn(), fan = openFan(5)) {
  render(
    <CardWheelView
      fan={fan}
      waiting={false}
      cardWidth={14}
      positionIndex={1}
      onPick={onPick}
    />,
  );
  return onPick;
}

function card(slot: number): HTMLElement {
  const found = document.querySelector<HTMLElement>(
    `[data-fan-slot="${slot}"]`,
  );
  if (!found) throw new Error(`no card in slot ${slot}`);
  return found;
}

/** A press and release in place, as a finger or a mouse click does. */
function tap(target: HTMLElement, at = { x: 100, y: 100 }) {
  fireEvent.pointerDown(target, {
    pointerId: 1,
    button: 0,
    clientX: at.x,
    clientY: at.y,
  });
  fireEvent.pointerUp(target, { pointerId: 1, clientX: at.x, clientY: at.y });
}

describe("choosing a card from the wheel", () => {
  it("lifts a card on the first tap without drawing it", () => {
    const onPick = renderWheel();

    tap(card(2));

    expect(card(2)).toHaveAttribute("aria-pressed", "true");
    expect(card(2)).toHaveAccessibleName("往前推出的牌，再點一次抽出");
    expect(onPick).not.toHaveBeenCalled();
  });

  it("draws the lifted card on a second tap", () => {
    const onPick = renderWheel();

    tap(card(2));
    tap(card(2));

    expect(onPick).toHaveBeenCalledOnce();
    expect(onPick).toHaveBeenCalledWith(2, expect.any(Object));
  });

  it("lifts another card instead when a different card is tapped", () => {
    const onPick = renderWheel();

    tap(card(2));
    tap(card(4), { x: 900, y: 900 });

    expect(card(2)).toHaveAttribute("aria-pressed", "false");
    expect(card(4)).toHaveAttribute("aria-pressed", "true");
    expect(onPick).not.toHaveBeenCalled();
  });

  it("does not draw when the press moves away, as a drag turns the wheel", () => {
    const onPick = renderWheel();
    tap(card(2));

    fireEvent.pointerDown(card(2), {
      pointerId: 1,
      button: 0,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(card(2), { pointerId: 1, clientX: 100, clientY: 10 });
    fireEvent.pointerUp(card(2), { pointerId: 1, clientX: 100, clientY: 10 });

    expect(onPick).not.toHaveBeenCalled();
    expect(card(2)).toHaveAttribute("aria-pressed", "true");
  });

  it("draws from the keyboard with Enter twice", () => {
    const onPick = renderWheel();

    fireEvent.keyDown(card(1), { key: "Enter" });
    fireEvent.keyDown(card(1), { key: "Enter" });

    expect(onPick).toHaveBeenCalledWith(1, expect.any(Object));
  });

  it("offers only the cards still on the wheel", () => {
    renderWheel(vi.fn(), takeSlots(openFan(5), [0, 3]));

    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(screen.getByRole("group")).toHaveAccessibleName("扇形牌堆，剩 3 張");
  });
});
