import { BookFlourish } from "@/presentation/components/book/BookFlourish";
import type { TitleLanguage } from "@/presentation/components/book/contents";

interface PageTitleProps {
  readonly id: string;
  readonly title: string;
  readonly language: TitleLanguage;
}

/**
 * A page's title and ornament. The book moves focus here after turning to
 * the page, so readers of every kind start at the top.
 */
export function PageTitle({ id, title, language }: PageTitleProps) {
  return (
    <>
      <h1
        id={id}
        className="book-title"
        lang={language}
        tabIndex={-1}
        data-page-title
      >
        {title}
      </h1>
      <BookFlourish />
    </>
  );
}
