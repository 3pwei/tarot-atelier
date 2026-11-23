import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it } from "vitest";
import {
  useBoardViewport,
  viewTransform,
} from "@/presentation/components/spread/useBoardViewport";

const WIDTH = 600;
const HEIGHT = 400;

function Table() {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const viewport = useBoardViewport(frame, canvas);
  return (
    <>
      <button type="button" onClick={viewport.zoomIn}>
        zoom in
      </button>
      <div
        ref={(element) => {
          frame.current = element;
          if (!element) return;
          Object.defineProperty(element, "clientWidth", { value: WIDTH });
          Object.defineProperty(element, "clientHeight", { value: HEIGHT });
        }}
        data-testid="frame"
        data-view={viewTransform(viewport.view)}
        {...viewport.gestureHandlers({ canPan: true })}
      >
        <div
          ref={canvas}
          data-testid="canvas"
          style={{ transform: viewTransform(viewport.view) }}
        />
      </div>
    </>
  );
}

const nextFrame = () =>
  act(() => new Promise<void>((done) => requestAnimationFrame(() => done())));

describe("panning a zoomed table", () => {
  it("moves the canvas frame by frame and commits the view once on release", async () => {
    render(<Table />);
    fireEvent.click(screen.getByRole("button", { name: "zoom in" }));
    const frame = screen.getByTestId("frame");
    const canvas = screen.getByTestId("canvas");
    const committed = frame.dataset.view;
    expect(canvas.style.transform).toBe(committed);

    fireEvent.pointerDown(frame, { pointerId: 1, clientX: 300, clientY: 200 });
    fireEvent.pointerMove(frame, { pointerId: 1, clientX: 260, clientY: 170 });
    await nextFrame();

    // The canvas has moved; the table has not re-rendered.
    expect(canvas.style.transform).not.toBe(committed);
    expect(frame.dataset.view).toBe(committed);
    const moved = canvas.style.transform;

    fireEvent.pointerUp(frame, { pointerId: 1, clientX: 260, clientY: 170 });
    expect(frame.dataset.view).toBe(moved);
    expect(canvas.style.transform).toBe(moved);
  });
});
