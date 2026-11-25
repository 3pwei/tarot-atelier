import { act, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAnimationsFinished } from "@/presentation/components/book/turning/useAnimationsFinished";

const DURATION_MS = 500;

function Turning({ onFinished }: { readonly onFinished: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  useAnimationsFinished(root, DURATION_MS, onFinished);
  return <div ref={root} />;
}

/** An animation whose end the test decides. */
function deferredAnimation() {
  let end: () => void = () => undefined;
  const finished = new Promise<void>((resolve) => {
    end = resolve;
  });
  return { animation: { finished } as unknown as Animation, end };
}

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(HTMLElement.prototype, "getAnimations");
});

describe("useAnimationsFinished", () => {
  it("waits for every animation, however late they end", async () => {
    const slow = deferredAnimation();
    const quick = deferredAnimation();
    HTMLElement.prototype.getAnimations = () => [
      slow.animation,
      quick.animation,
    ];
    const onFinished = vi.fn();
    render(<Turning onFinished={onFinished} />);

    await act(async () => quick.end());
    expect(onFinished).not.toHaveBeenCalled();
    await act(async () => slow.end());
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it("says nothing once unmounted", async () => {
    const only = deferredAnimation();
    HTMLElement.prototype.getAnimations = () => [only.animation];
    const onFinished = vi.fn();
    const { unmount } = render(<Turning onFinished={onFinished} />);
    unmount();
    await act(async () => only.end());
    expect(onFinished).not.toHaveBeenCalled();
  });

  it("waits the turn's length where animations cannot be listed", () => {
    vi.useFakeTimers();
    const onFinished = vi.fn();
    render(<Turning onFinished={onFinished} />);
    act(() => vi.advanceTimersByTime(DURATION_MS - 1));
    expect(onFinished).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });
});
