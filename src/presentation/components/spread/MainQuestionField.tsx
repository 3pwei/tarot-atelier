"use client";

import { useId } from "react";
import { countCharacters } from "@/domain/spread/spread";
import { MAX_MAIN_QUESTION_LENGTH } from "@/domain/spread/types";

/** The count appears only once the question nears its limit. */
const COUNT_SHOWN_FROM = MAX_MAIN_QUESTION_LENGTH - 50;

interface MainQuestionFieldProps {
  readonly value: string;
  readonly onChange: (text: string) => void;
}

/**
 * The overall question, written on a line of the page; each position still
 * needs its own. Its label is read aloud but not printed.
 */
export function MainQuestionField({ value, onChange }: MainQuestionFieldProps) {
  const id = useId();
  const countId = `${id}-count`;
  const length = countCharacters(value);
  const counted = length >= COUNT_SHOWN_FROM;
  return (
    <label className="field spread-main-question" htmlFor={id}>
      <span className="sr-only">主問題</span>
      <input
        id={id}
        type="text"
        required
        value={value}
        placeholder="寫下你想問的事"
        aria-describedby={counted ? countId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {counted && (
        <small id={countId}>
          {length} / {MAX_MAIN_QUESTION_LENGTH} 字
        </small>
      )}
    </label>
  );
}
