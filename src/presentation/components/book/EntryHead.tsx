import { BookFloatButton } from "@/presentation/components/book/BookFloatButton";
import { BOOK_COPY } from "@/presentation/components/book/bookCopy";
import {
  runningHeadFor,
  type ContentsEntry,
} from "@/presentation/components/book/contents";
import { RunningHead } from "@/presentation/components/book/RunningHead";

interface EntryHeadProps {
  readonly entry: ContentsEntry;
  readonly onBack: () => void;
}

/** The running head of a chapter or appendix page, with the way back. */
export function EntryHead({ entry, onBack }: EntryHeadProps) {
  return (
    <RunningHead
      label={runningHeadFor(entry)}
      action={
        <BookFloatButton label={BOOK_COPY.backLabel} onPress={onBack}>
          <span lang="en">{BOOK_COPY.back}</span>
        </BookFloatButton>
      }
    />
  );
}
