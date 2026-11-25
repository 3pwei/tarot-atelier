import Image from "next/image";
import { BOOK_COPY } from "@/presentation/components/book/bookCopy";
import { PUBLIC_BASE_PATH } from "@/shared/config/publicBasePath";

interface BookCoverProps {
  readonly onOpen: () => void;
}

/** The closed book on the desk; one tap opens it. */
export function BookCover({ onOpen }: BookCoverProps) {
  return (
    <button
      type="button"
      className="book-cover"
      aria-label={BOOK_COPY.openCoverLabel}
      onClick={onOpen}
    >
      <span className="book-cover__front">
        <Image
          src={`${PUBLIC_BASE_PATH}/book/cover.webp`}
          alt={BOOK_COPY.coverAlt}
          width={340}
          height={520}
          preload
        />
      </span>
      <span className="book-float" lang="en" aria-hidden="true">
        {BOOK_COPY.openCover}
      </span>
    </button>
  );
}
