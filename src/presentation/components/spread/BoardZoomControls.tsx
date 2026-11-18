"use client";

interface BoardZoomControlsProps {
  readonly canZoomIn: boolean;
  readonly canZoomOut: boolean;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
}

/**
 * Zoom buttons in the table's top-right corner while arranging, for a mouse:
 * touch screens pinch instead, so the buttons show only where the main
 * pointer is fine and can hover.
 */
export function BoardZoomControls({
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
}: BoardZoomControlsProps) {
  return (
    <div
      className="board-zoom"
      role="group"
      aria-label="牌桌縮放"
      // The table's own pan and pinch leave these buttons alone.
      data-own-gesture
    >
      <button
        type="button"
        className="board-zoom__button"
        aria-label="放大牌桌"
        disabled={!canZoomIn}
        onClick={onZoomIn}
      >
        +
      </button>
      <button
        type="button"
        className="board-zoom__button"
        aria-label="縮小牌桌"
        disabled={!canZoomOut}
        onClick={onZoomOut}
      >
        −
      </button>
    </div>
  );
}
