import Image from "next/image";
import { useId } from "react";
import { BookFloatButton } from "@/presentation/components/book/BookFloatButton";
import { BOOK_COPY } from "@/presentation/components/book/bookCopy";
import { BookPage } from "@/presentation/components/book/BookPage";
import { PUBLIC_BASE_PATH } from "@/shared/config/publicBasePath";

interface FrontispiecePageProps {
  readonly onToContents: () => void;
}

/** Page one: the plate, and the reminder that this is for reflection. */
export function FrontispiecePage({ onToContents }: FrontispiecePageProps) {
  const titleId = useId();
  return (
    <BookPage side="left" labelledBy={titleId}>
      <h1 id={titleId} className="sr-only" tabIndex={-1} data-page-title>
        {BOOK_COPY.bookLabel}
      </h1>
      <div className="book-frontispiece">
        <Image
          src={`${PUBLIC_BASE_PATH}/book/frontispiece.webp`}
          alt={BOOK_COPY.frontispieceAlt}
          width={300}
          height={640}
        />
      </div>
      <div className="book-frontispiece__foot">
        <p className="book-disclaimer">{BOOK_COPY.disclaimer}</p>
        <BookFloatButton
          className="book-only-narrow"
          label={BOOK_COPY.toContentsLabel}
          onPress={onToContents}
        >
          <span lang="en">{BOOK_COPY.toContents}</span>
        </BookFloatButton>
      </div>
    </BookPage>
  );
}
