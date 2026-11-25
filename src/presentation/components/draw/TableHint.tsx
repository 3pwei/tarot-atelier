interface TableHintProps {
  readonly status: string;
  /** Cards left in the pack: its thickness shows it, so it is read aloud only. */
  readonly remaining: number;
}

/** What the table is waiting for, in one line of ink under it. */
export function TableHint({ status, remaining }: TableHintProps) {
  return (
    <p className="table-hint">
      <span aria-live="polite">{status}</span>
      <span className="sr-only">剩餘 {remaining} 張</span>
    </p>
  );
}
