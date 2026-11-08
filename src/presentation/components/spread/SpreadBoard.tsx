"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import type { Spread, SpreadPosition, TablePoint } from "@/domain/spread/types";
import { TableOrnament } from "@/presentation/components/draw/TableOrnament";
import {
  FIELD_MARGIN_CQW,
  SLOT_WIDTH_CQW,
} from "@/presentation/components/spread/boardGeometry";
import { PositionSlot } from "@/presentation/components/spread/PositionSlot";
import type { useBoardViewport } from "@/presentation/components/spread/useBoardViewport";

type Viewport = ReturnType<typeof useBoardViewport>;

interface SpreadBoardProps {
  readonly spread: Spread;
  readonly selectedId?: string;
  /** Positions may be moved and rotated. */
  readonly arrangeable: boolean;
  readonly viewport: Viewport;
  readonly viewportRef: RefObject<HTMLDivElement | null>;
  readonly fieldRef: RefObject<HTMLDivElement | null>;
  readonly renderCards: (position: SpreadPosition) => ReactNode;
  readonly onSelect: (positionId?: string) => void;
  readonly onMove: (positionId: string, point: TablePoint) => void;
  readonly onNudge: (positionId: string, delta: TablePoint) => void;
  readonly onRotate: (positionId: string, degrees: number) => void;
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
  selectedId,
  arrangeable,
  viewport,
  viewportRef,
  fieldRef,
  renderCards,
  onSelect,
  onMove,
  onNudge,
  onRotate,
}: SpreadBoardProps) {
  const { view, gestureHandlers } = viewport;
  const canvasStyle = {
    transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
    "--slot-w": `${SLOT_WIDTH_CQW}cqw`,
    "--field-margin": `${FIELD_MARGIN_CQW}cqw`,
  } as CSSProperties;

  return (
    <div
      ref={viewportRef}
      className="spread-board"
      data-zoomed={view.scale > 1 || undefined}
      data-arranging={arrangeable || undefined}
      {...gestureHandlers}
    >
      <div
        className="spread-board__canvas"
        style={canvasStyle}
        onClick={(event) => {
          const target = event.target as Element;
          if (!target.closest?.("[data-slot]")) onSelect(undefined);
        }}
      >
        <TableOrnament />
        <div ref={fieldRef} className="spread-board__field">
          {spread.positions.map((position) => (
            <PositionSlot
              key={position.id}
              position={position}
              selected={position.id === selectedId}
              arrangeable={arrangeable}
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
        {spread.positions.length === 0 && (
          <p className="spread-board__empty">
            空白牌桌。按「新增牌位」放下第一個位置。
          </p>
        )}
      </div>
    </div>
  );
}
