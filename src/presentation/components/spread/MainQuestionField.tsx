"use client";

import { useId } from "react";
import { countCharacters } from "@/domain/spread/spread";
import { MAX_MAIN_QUESTION_LENGTH } from "@/domain/spread/types";

interface MainQuestionFieldProps {
  readonly value: string;
  readonly onChange: (text: string) => void;
}

/** The optional overall question; each position still needs its own. */
export function MainQuestionField({ value, onChange }: MainQuestionFieldProps) {
  const id = useId();
  return (
    <label className="field spread-main-question" htmlFor={id}>
      <span>
        主問題 <em className="optional">選填</em>
      </span>
      <input
        id={id}
        type="text"
        value={value}
        placeholder="這次占卜想整體看見什麼？"
        aria-describedby={`${id}-count`}
        onChange={(event) => onChange(event.target.value)}
      />
      <small id={`${id}-count`}>
        {countCharacters(value)} / {MAX_MAIN_QUESTION_LENGTH} 字
      </small>
    </label>
  );
}
