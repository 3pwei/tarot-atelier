import type { DrawState } from "@/domain/deck/draw";
import { useHoldToShuffle } from "@/presentation/components/draw/useHoldToShuffle";
import { useTableHold } from "@/presentation/components/draw/useTableHold";
import type { GestureOptions } from "@/presentation/components/spread/useBoardViewport";

/**
 * Holding the deck, or anywhere on the table, shuffles until it is let go.
 * While the deck can be held the table does not pan, so a press is never
 * read as both.
 */
export function useShuffleGestures<Gestures extends object>({
  ready,
  phase,
  onHold,
  onRelease,
  boardGestures,
}: {
  /** The deck may be held to shuffle now. */
  readonly ready: boolean;
  readonly phase: DrawState;
  readonly onHold: () => void;
  readonly onRelease: () => void;
  readonly boardGestures: (options: GestureOptions) => Gestures;
}) {
  const deckHold = useHoldToShuffle({ enabled: ready, onHold, onRelease });
  const tableHold = useTableHold({
    enabled: ready,
    press: deckHold.press,
    tap: deckHold.tap,
  });
  return {
    deckHold: deckHold.handlers,
    tableGestures: {
      ...boardGestures({ canPan: !ready && phase !== "shuffling" }),
      ...tableHold,
    },
  };
}
