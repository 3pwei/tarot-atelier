import type { ReactNode } from "react";

interface RunningHeadProps {
  readonly label: string;
  readonly action?: ReactNode;
}

/** The small line at the top of a page: where you are, and the way back. */
export function RunningHead({ label, action }: RunningHeadProps) {
  return (
    <div className="book-running-head">
      <span lang="en">{label}</span>
      {action}
    </div>
  );
}
