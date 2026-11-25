import type { Dispatch } from "react";
import type { TemplateLibrary } from "@/domain/spread/templates";
import type { SpreadAction } from "@/presentation/components/spread/spreadState";
import { SpreadToolbar } from "@/presentation/components/spread/SpreadToolbar";
import { TemplateShelf } from "@/presentation/components/spread/TemplateShelf";

interface SpreadSetupProps {
  readonly library: TemplateLibrary;
  readonly activeTemplateId?: string;
  readonly positionCount: number;
  /** Some position holds a card, so templates cannot be applied. */
  readonly drawn: boolean;
  readonly layoutLocked: boolean;
  readonly arranging: boolean;
  readonly canToggleArrange: boolean;
  readonly canClear: boolean;
  readonly dispatch: Dispatch<SpreadAction>;
  readonly onToggleArrange: () => void;
  readonly onAdd: () => void;
  readonly onClear: () => void;
}

/**
 * Above the board: while arranging, manage the template library. In play the
 * spread is the chapter's, chosen from the book's contents. The toolbar is the
 * same in both.
 */
export function SpreadSetup({
  library,
  activeTemplateId,
  positionCount,
  drawn,
  layoutLocked,
  arranging,
  canToggleArrange,
  canClear,
  dispatch,
  onToggleArrange,
  onAdd,
  onClear,
}: SpreadSetupProps) {
  const apply = (templateId: string) =>
    dispatch({ type: "apply-template", templateId });
  return (
    <div className="spread-setup">
      {arranging && (
        <TemplateShelf
          library={library}
          activeTemplateId={activeTemplateId}
          applyLocked={drawn}
          busy={layoutLocked}
          onApply={apply}
          onBlank={() => dispatch({ type: "blank" })}
          onSave={(name) => dispatch({ type: "save-template", name })}
          onDelete={(templateId) =>
            dispatch({ type: "delete-template", templateId })
          }
          onRestore={() => dispatch({ type: "restore-templates" })}
        />
      )}
      <SpreadToolbar
        positionCount={positionCount}
        layoutLocked={layoutLocked}
        arranging={arranging}
        canToggleArrange={canToggleArrange}
        onToggleArrange={onToggleArrange}
        onAdd={onAdd}
        canClear={canClear}
        onClear={onClear}
      />
    </div>
  );
}
