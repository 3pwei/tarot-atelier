import { useCallback, useMemo, type Dispatch } from "react";
import type { TablePoint } from "@/domain/spread/types";
import type { SpreadAction } from "@/presentation/components/spread/spreadState";

export interface PositionHandlers {
  readonly select: (positionId?: string) => void;
  readonly move: (positionId: string, point: TablePoint) => void;
  readonly nudge: (positionId: string, delta: TablePoint) => void;
  readonly rotate: (positionId: string, degrees: number) => void;
}

/**
 * Stable callbacks for editing positions on the board. Selecting opens a
 * position's editor, which belongs to arrange mode, so it does nothing in play.
 */
export function usePositionHandlers({
  dispatch,
  arranging,
}: {
  readonly dispatch: Dispatch<SpreadAction>;
  readonly arranging: boolean;
}): PositionHandlers {
  const select = useCallback(
    (positionId?: string) => {
      if (arranging) dispatch({ type: "select", positionId });
    },
    [arranging, dispatch],
  );
  return useMemo(
    () => ({
      select,
      move: (positionId, point) =>
        dispatch({ type: "move", positionId, point }),
      nudge: (positionId, delta) =>
        dispatch({ type: "nudge", positionId, delta }),
      rotate: (positionId, degrees) =>
        dispatch({ type: "rotate", positionId, degrees }),
    }),
    [select, dispatch],
  );
}
