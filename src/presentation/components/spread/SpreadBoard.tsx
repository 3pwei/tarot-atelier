"use client";

import type { CSSProperties, DOMAttributes, ReactNode, RefObject } from "react";
import type { Spread, SpreadPosition, TablePoint } from "@/domain/spread/types";
import { TableOrnament } from "@/presentation/components/draw/TableOrnament";
import { FIELD_MARGIN_CQW } from "@/presentation/components/spread/boardGeometry";
import { PositionSlot } from "@/presentation/components/spread/PositionSlot";
import {
  viewTransform,
  type BoardView,
} from "@/presentation/components/spread/useBoardViewport";

/** Pointer handlers for the table's background and anything pressed on it. */
export type BoardGestures = Pick<
  DOMAttributes<HTMLDivElement>,
  | "onPointerDown"
  | "onPointerDownCapture"
  | "onPointerMove"
  | "onPointerUp"
  | "onPointerCancel"
  | "onClickCapture"
>;

interface SpreadBoardProps {
  readonly spread: Spread;
  /** Card width as a percentage of the table's width. */
  readonly slotWidth: number;
  /** The table steps back to this while cards are drawn (see `tableZoom`). */
  readonly zoom: number;
  readonly selectedId?: string;
  /** Positions may be moved and rotated. */
  readonly arrangeable: boolean;
  /** Positions whose dealt card has not landed yet. */
  readonly awaitingIds: readonly string[];
  readonly view: BoardView;
  readonly gestures: BoardGestures;
  readonly viewportRef: RefObject<HTMLDivElement | null>;
  /** What zooms and pans inside the frame (see useBoardViewport). */
  readonly canvasRef: RefObject<HTMLDivElement | null>;
  readonly fieldRef: RefObject<HTMLDivElement | null>;
  readonly renderCards: (position: SpreadPosition) => ReactNode;
  readonly onSelect: (positionId?: string) => void;
  readonly onMove: (positionId: string, point: TablePoint) => void;
  readonly onNudge: (positionId: string, delta: TablePoint) => void;
  readonly onRotate: (positionId: string, degrees: number) => void;
  /** The deck and its motion, drawn on the cloth above the positions. */
  readonly overlay?: ReactNode;
}

/** The table centre currently in view, in relative coordinates. */
export function visibleCenter(
  viewport: HTMLElement | null,
  field: HTMLElement | null,
): TablePoint {
  const outer = viewport?.getBoundingClientRect();
  const inner = field?.getBoundingClientRect();
  if (!outer || !inner || inner.width === 0 || inner.height === 0) {
    return { x: 0.5, y: 0.5 };
  }
  return {
    x: (outer.left + outer.width / 2 - inner.left) / inner.width,
    y: (outer.top + outer.height / 2 - inner.top) / inner.height,
  };
}

export function SpreadBoard({
  spread,
  slotWidth,
  zoom,
  selectedId,
  arrangeable,
  awaitingIds,
  view,
  gestures,
  viewportRef,
  canvasRef,
  fieldRef,
  renderCards,
  onSelect,
  onMove,
  onNudge,
  onRotate,
  overlay,
}: SpreadBoardProps) {
  const canvasStyle = {
    transform: viewTransform(view),
    "--slot-w": `${slotWidth}cqw`,
    "--field-margin": `${FIELD_MARGIN_CQW}cqw`,
  } as CSSProperties;

  return (
    <div
      ref={viewportRef}
      className="spread-board"
      data-zoomed={view.scale > 1 || undefined}
      data-arranging={arrangeable || undefined}
      {...gestures}
    >
      <div
        ref={canvasRef}
        className="spread-board__canvas"
        style={canvasStyle}
        onClick={(event) => {
          const target = event.target as Element;
          if (!target.closest?.("[data-slot]")) onSelect(undefined);
        }}
      >
        {/* Zoomed inside the panned canvas, so pinching and panning stay exact. */}
        <div
          className="spread-board__table"
          style={{ "--table-zoom": zoom } as CSSProperties}
        >
          <TableOrnament />
          <div ref={fieldRef} className="spread-board__field">
            {spread.positions.map((position) => (
              <PositionSlot
                key={position.id}
                position={position}
                selected={position.id === selectedId}
                arrangeable={arrangeable}
                settled={
                  Boolean(position.drawResult) &&
                  !awaitingIds.includes(position.id)
                }
                field={fieldRef}
                onSelect={onSelect}
                onMove={onMove}
                onNudge={onNudge}
                onRotate={onRotate}
              >
                {renderCards(position)}
              </PositionSlot>
            ))}
          </div>
        </div>
        {spread.positions.length === 0 && (
          <p className="spread-board__empty">
            空白牌桌。按「編輯牌陣」再按「新增牌位」，放下第一個位置。
          </p>
        )}
      </div>
      {overlay}
    </div>
  );
}
