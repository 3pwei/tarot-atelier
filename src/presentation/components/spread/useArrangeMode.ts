import { useState, type Dispatch } from "react";
import { hasDraws } from "@/domain/spread/spread";
import type { TemplateLibrary } from "@/domain/spread/templates";
import type { Spread } from "@/domain/spread/types";
import {
  hasUnsavedLayout,
  revertTarget,
  type EditBaseline,
  type RevertTarget,
} from "@/presentation/components/spread/editBaseline";
import type { SpreadAction } from "@/presentation/components/spread/spreadState";
import type { TableMode } from "@/presentation/components/spread/tableMode";

/** A question the table asks before switching modes. */
export type ArrangeConfirmation =
  | { readonly kind: "clear-draws" }
  | { readonly kind: "leave-unsaved"; readonly target: RevertTarget };

export interface ArrangeMode {
  readonly mode: TableMode;
  readonly arranging: boolean;
  readonly confirmation?: ArrangeConfirmation;
  /** Enters or leaves arrange mode, asking first when something would be lost. */
  readonly toggle: () => void;
  /** Accepts the open question: clears the draws, or drops the unsaved edit. */
  readonly confirm: () => void;
  readonly cancel: () => void;
}

/**
 * Switching between playing and arranging the table. Drawn cards must be
 * returned before positions move, and leaving with an unsaved layout reverts
 * it, so both ask first.
 */
export function useArrangeMode({
  spread,
  editBaseline,
  library,
  dispatch,
  onDrawsCleared,
}: {
  readonly spread: Spread;
  readonly editBaseline?: EditBaseline;
  readonly library: TemplateLibrary;
  readonly dispatch: Dispatch<SpreadAction>;
  readonly onDrawsCleared: () => void;
}): ArrangeMode {
  const [mode, setMode] = useState<TableMode>("play");
  const [asking, setAsking] = useState<ArrangeConfirmation["kind"]>();
  const arranging = mode === "arrange";
  const leaveTarget = editBaseline
    ? revertTarget(editBaseline, spread, library)
    : undefined;

  const begin = () => {
    dispatch({ type: "begin-edit" });
    setMode("arrange");
  };
  const close = (ending: "end-edit" | "revert-edit") => {
    dispatch({ type: ending });
    dispatch({ type: "select", positionId: undefined });
    setAsking(undefined);
    setMode("play");
  };

  const toggle = () => {
    if (!arranging) {
      if (hasDraws(spread)) setAsking("clear-draws");
      else begin();
      return;
    }
    if (leaveTarget && hasUnsavedLayout(spread, leaveTarget)) {
      setAsking("leave-unsaved");
      return;
    }
    close("end-edit");
  };

  const confirm = () => {
    if (asking === "leave-unsaved") {
      close("revert-edit");
      return;
    }
    dispatch({ type: "clear-draws" });
    onDrawsCleared();
    setAsking(undefined);
    begin();
  };

  const confirmation: ArrangeConfirmation | undefined =
    asking === "clear-draws"
      ? { kind: "clear-draws" }
      : asking === "leave-unsaved" && leaveTarget
        ? { kind: "leave-unsaved", target: leaveTarget }
        : undefined;

  return {
    mode,
    arranging,
    ...(confirmation ? { confirmation } : {}),
    toggle,
    confirm,
    cancel: () => setAsking(undefined),
  };
}
