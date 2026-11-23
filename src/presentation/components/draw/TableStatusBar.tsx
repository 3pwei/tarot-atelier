import { MainQuestionField } from "@/presentation/components/spread/MainQuestionField";

/** What the table is doing and how many cards are left, beside the main question. */
export function TableStatusBar({
  status,
  remaining,
  mainQuestion,
  onMainQuestion,
}: {
  readonly status: string;
  readonly remaining: number;
  readonly mainQuestion: string;
  readonly onMainQuestion: (text: string) => void;
}) {
  return (
    <div className="draw-table__bar">
      <div className="draw-status">
        <span className="draw-status__light" aria-hidden="true" />
        <strong aria-live="polite">{status}</strong>
        <span>剩餘 {remaining} 張</span>
      </div>
      {/* The question comes first: dealing needs it. */}
      <div className="draw-table__question">
        <MainQuestionField value={mainQuestion} onChange={onMainQuestion} />
      </div>
    </div>
  );
}
