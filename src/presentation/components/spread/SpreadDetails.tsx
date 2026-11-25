import type { Dispatch } from "react";
import type { Deck } from "@/domain/deck/deck";
import type { SpreadPosition } from "@/domain/spread/types";
import { PositionInspector } from "@/presentation/components/spread/PositionInspector";
import { PositionList } from "@/presentation/components/spread/PositionList";
import type { SpreadAction } from "@/presentation/components/spread/spreadState";
import type { PositionHandlers } from "@/presentation/components/spread/usePositionHandlers";

const ARRANGE_HINT =
  "編輯牌陣中：點選牌位可改問題、排序或刪除；拖曳可移動；長按牌位後拖曳，或拖曳右下角的迴轉箭頭可旋轉；也可聚焦牌位後用方向鍵、數字鍵盤操作。完成後按「結束編輯」。";

interface SpreadDetailsProps {
  readonly positions: readonly SpreadPosition[];
  readonly deck: Deck;
  readonly selected?: SpreadPosition;
  readonly arranging: boolean;
  readonly layoutLocked: boolean;
  readonly arrangeable: boolean;
  readonly revealedInstanceIds: ReadonlySet<string>;
  readonly nextPositionId?: string;
  readonly handlers: PositionHandlers;
  readonly dispatch: Dispatch<SpreadAction>;
}

/** Below the board: while arranging, the selected position's editor or how to arrange; then every position, as footnotes. */
export function SpreadDetails({
  positions,
  deck,
  selected,
  arranging,
  layoutLocked,
  arrangeable,
  revealedInstanceIds,
  nextPositionId,
  handlers,
  dispatch,
}: SpreadDetailsProps) {
  return (
    <div className="spread-details">
      {selected && arranging ? (
        <PositionInspector
          key={selected.id}
          position={selected}
          total={positions.length}
          locked={layoutLocked}
          arrangeable={arrangeable}
          onQuestion={(text) =>
            dispatch({ type: "question", positionId: selected.id, text })
          }
          onName={(name) =>
            dispatch({ type: "position-name", positionId: selected.id, name })
          }
          onRotate={(degrees) => handlers.rotate(selected.id, degrees)}
          onMove={(point) => handlers.move(selected.id, point)}
          onReorder={(index) =>
            dispatch({ type: "reorder", positionId: selected.id, index })
          }
          onRemove={() => dispatch({ type: "remove", positionId: selected.id })}
          onClose={() => handlers.select(undefined)}
        />
      ) : (
        arranging && <p className="spread-details__hint">{ARRANGE_HINT}</p>
      )}
      <PositionList
        positions={positions}
        deck={deck}
        selectedId={selected?.id}
        revealedInstanceIds={revealedInstanceIds}
        nextPositionId={nextPositionId}
        onSelect={handlers.select}
      />
    </div>
  );
}
