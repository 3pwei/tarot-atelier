import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTableHold } from "@/presentation/components/draw/useTableHold";

function Table(props: {
  readonly enabled: boolean;
  readonly press: () => void;
  readonly tap: () => void;
  readonly onSelect: () => void;
  readonly schedule: (run: () => void, ms: number) => () => void;
}) {
  const hold = useTableHold(props);
  return (
    <div data-testid="table" {...hold}>
      <button type="button" onClick={props.onSelect}>
        牌位
      </button>
      <button type="button" data-own-gesture>
        牌堆
      </button>
    </div>
  );
}

function setup(enabled = true) {
  const pending = new Set<() => void>();
  const cancelled = vi.fn();
  const schedule = (run: () => void) => {
    pending.add(run);
    return () => {
      pending.delete(run);
      cancelled();
    };
  };
  const press = vi.fn();
  const tap = vi.fn();
  const onSelect = vi.fn();
  render(
    <Table
      enabled={enabled}
      press={press}
      tap={tap}
      onSelect={onSelect}
      schedule={schedule}
    />,
  );
  return {
    press,
    tap,
    onSelect,
    cancelled,
    table: screen.getByTestId("table"),
    position: screen.getByRole("button", { name: "牌位" }),
    deck: screen.getByRole("button", { name: "牌堆" }),
    graceEnds: () => {
      const due = [...pending];
      pending.clear();
      due.forEach((run) => run());
    },
  };
}

const finger = (pointerId: number) => ({
  button: 0,
  pointerId,
  pointerType: "touch",
});

describe("useTableHold", () => {
  it("shuffles at once when the mouse presses the table", () => {
    const { table, press } = setup();

    fireEvent.pointerDown(table, { button: 0, pointerId: 1 });

    expect(press).toHaveBeenCalledTimes(1);
  });

  it("holds a finger a moment for a second one, then shuffles", () => {
    const { table, press, graceEnds } = setup();

    fireEvent.pointerDown(table, finger(1));
    expect(press).not.toHaveBeenCalled();
    graceEnds();

    expect(press).toHaveBeenCalledTimes(1);
  });

  it("leaves a two-finger pinch to zoom", () => {
    const { table, press, tap, cancelled, graceEnds } = setup();

    fireEvent.pointerDown(table, finger(1));
    fireEvent.pointerDown(table, finger(2));
    fireEvent.pointerUp(window, finger(1));
    fireEvent.pointerUp(window, finger(2));
    graceEnds();

    expect(cancelled).toHaveBeenCalled();
    expect(press).not.toHaveBeenCalled();
    expect(tap).not.toHaveBeenCalled();
  });

  it("shuffles one round when a finger lifts before the grace ends", () => {
    const { table, press, tap } = setup();

    fireEvent.pointerDown(table, finger(1));
    fireEvent.pointerUp(window, finger(1));

    expect(tap).toHaveBeenCalledTimes(1);
    expect(press).not.toHaveBeenCalled();
  });

  it("shuffles when a position is pressed, without selecting it", () => {
    const { position, press, onSelect } = setup();

    fireEvent.pointerDown(position, { button: 0, pointerId: 1 });
    fireEvent.pointerUp(window, { button: 0, pointerId: 1 });
    fireEvent.click(position);

    expect(press).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("leaves the deck's own press alone", () => {
    const { deck, press } = setup();

    fireEvent.pointerDown(deck, { button: 0, pointerId: 1 });

    expect(press).not.toHaveBeenCalled();
  });

  it("does nothing while shuffling is not possible", () => {
    const { table, position, press, onSelect } = setup(false);

    fireEvent.pointerDown(table, { button: 0, pointerId: 1 });
    fireEvent.pointerUp(window, { button: 0, pointerId: 1 });
    fireEvent.click(position);

    expect(press).not.toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("ignores buttons other than the main one", () => {
    const { table, press } = setup();

    fireEvent.pointerDown(table, { button: 2, pointerId: 1 });

    expect(press).not.toHaveBeenCalled();
  });
});
