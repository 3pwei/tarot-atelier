import type { JumperMode } from "@/domain/deck/draw";

export const JUMPER_OPTIONS = [
  { id: "off", label: "關閉", detail: "0%" },
  { id: "rare", label: "稀有", detail: "3%" },
  { id: "normal", label: "一般", detail: "8%" },
  { id: "chaos", label: "混沌", detail: "15%" },
] as const satisfies readonly {
  readonly id: JumperMode;
  readonly label: string;
  readonly detail: string;
}[];

interface JumperModeControlProps {
  readonly value: JumperMode;
  readonly disabled: boolean;
  readonly onChange: (mode: JumperMode) => void;
}

export function JumperModeControl({
  value,
  disabled,
  onChange,
}: JumperModeControlProps) {
  return (
    <fieldset className="jumper-control" disabled={disabled}>
      <legend>跳牌頻率</legend>
      <div className="jumper-control__options">
        {JUMPER_OPTIONS.map((option) => (
          <label key={option.id} className="jumper-control__option">
            <input
              type="radio"
              name="jumper-mode"
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
            />
            <span>
              {option.label}
              <small>{option.detail}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
