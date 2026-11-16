import {
  matchesLayout,
  type SpreadTemplate,
  type TemplateLibrary,
  type TemplatePosition,
} from "@/domain/spread/templates";
import type { Spread } from "@/domain/spread/types";

/**
 * What the table looked like when editing began. Leaving with unsaved
 * changes returns the table to the library's version of that template, or to
 * this snapshot when the table did not come from the library.
 */
export interface EditBaseline {
  /** Kept separately because adding or removing positions detaches it. */
  readonly templateId?: string;
  readonly layout: readonly TemplatePosition[];
}

/** Where leaving without saving takes the table. */
export type RevertTarget =
  | { readonly kind: "template"; readonly template: SpreadTemplate }
  | { readonly kind: "snapshot"; readonly layout: readonly TemplatePosition[] };

export function captureEditBaseline(spread: Spread): EditBaseline {
  return {
    ...(spread.templateId !== undefined
      ? { templateId: spread.templateId }
      : {}),
    layout: spread.positions.map(({ question, x, y, rotation }) => ({
      question,
      x,
      y,
      rotation,
    })),
  };
}

/**
 * The version the table is compared with. Saving during the edit makes the
 * saved template the baseline, since the spread then carries its id.
 */
export function revertTarget(
  baseline: EditBaseline,
  spread: Spread,
  library: TemplateLibrary,
): RevertTarget {
  const templateId = spread.templateId ?? baseline.templateId;
  const template = library.find((item) => item.id === templateId);
  return template
    ? { kind: "template", template }
    : { kind: "snapshot", layout: baseline.layout };
}

export function targetLayout(
  target: RevertTarget,
): readonly TemplatePosition[] {
  return target.kind === "template" ? target.template.positions : target.layout;
}

/** Whether leaving the edit now would lose changes. */
export function hasUnsavedLayout(
  spread: Spread,
  target: RevertTarget,
): boolean {
  return !matchesLayout(spread, targetLayout(target));
}
