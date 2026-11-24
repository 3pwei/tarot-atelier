import Image from "next/image";
import { BOOK_COPY } from "@/presentation/components/book/bookCopy";
import { PUBLIC_BASE_PATH } from "@/shared/config/publicBasePath";

interface BookCoverProps {
  /** Hears where the closed book lay, so the opening starts right there. */
  readonly onOpen: (book: DOMRect) => void;
}

/** The closed book on the desk; one tap opens it. */
export function BookCover({ onOpen }: BookCoverProps) {
  return (
    <button
      type="button"
      className="book-cover"
      aria-label={BOOK_COPY.openCoverLabel}
      onClick={(event) => {
        const front = event.currentTarget.querySelector(".book-cover__front");
        onOpen((front ?? event.currentTarget).getBoundingClientRect());
      }}
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
