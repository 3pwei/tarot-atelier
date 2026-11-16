"use client";

import type { ReactNode } from "react";
import type {
  SpreadTemplate,
  TemplateLibrary,
} from "@/domain/spread/templates";

interface SpreadPickerProps {
  readonly library: TemplateLibrary;
  readonly activeTemplateId?: string;
  /** Another layout cannot replace one that already has cards on it. */
  readonly disabled: boolean;
  readonly onApply: (templateId: string) => void;
  /** Extra controls for one spread, drawn beside its chip (e.g. delete). */
  readonly renderChipAction?: (template: SpreadTemplate) => ReactNode;
  /** Items after the spreads (e.g. a blank table while arranging). */
  readonly children?: ReactNode;
}

/** Every spread in the library, built-in and saved, one tap to lay it out. */
export function SpreadPicker({
  library,
  activeTemplateId,
  disabled,
  onApply,
  renderChipAction,
  children,
}: SpreadPickerProps) {
  return (
    <div className="template-shelf__list">
      {library.map((template) => (
        <div
          key={template.id}
          className="template-chip"
          data-active={template.id === activeTemplateId || undefined}
        >
          <button
            type="button"
            className="template-chip__apply"
            aria-pressed={template.id === activeTemplateId}
            disabled={disabled}
            title={`${template.positions.length} 個牌位`}
            onClick={() => onApply(template.id)}
          >
            {template.name}
            <small aria-hidden="true">{template.positions.length}</small>
          </button>
          {renderChipAction?.(template)}
        </div>
      ))}
      {children}
    </div>
  );
}
