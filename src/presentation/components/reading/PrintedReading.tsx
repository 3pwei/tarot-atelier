import type { CardReading, ReadingResult } from "@/domain/reading/types";
import {
  MEANING_LABELS,
  READING_COPY,
} from "@/presentation/components/reading/readingLabels";

interface PrintedReadingProps {
  readonly result: ReadingResult;
  /** Each position's short name, by its number, where it has one. */
  readonly positionNames: ReadonlyMap<number, string>;
}

/**
 * A reading printed on the book's pages: each position a short heading
 * (number, short name, card, orientation) over one paragraph, then the
 * spread as a whole. The questions are on the table's pages, a leaf back.
 */
export function PrintedReading({ result, positionNames }: PrintedReadingProps) {
  return (
    <div className="printed-reading">
      {result.positions.map((position) => {
        const name = positionNames.get(position.index);
        return (
          <section key={position.index} className="printed-reading__section">
            <h3 className="printed-reading__heading">
              <span className="printed-reading__number" aria-hidden="true">
                {position.index}
              </span>
              <span className="sr-only">牌位 {position.index}：</span>
              {name ? (
                <span className="printed-reading__name">{name}</span>
              ) : null}
              {position.primary.cardName}
              <small>{MEANING_LABELS[position.primary.meaningMode]}</small>
            </h3>
            <p>{paragraphOf(position.primary)}</p>
            {position.jumper ? (
              <p className="printed-reading__jumper">
                {READING_COPY.jumperMessage}・{position.jumper.cardName}（
                {MEANING_LABELS[position.jumper.meaningMode]}）：
                {position.jumper.interpretation}
              </p>
            ) : null}
          </section>
        );
      })}
      <section className="printed-reading__section">
        <h3 className="printed-reading__heading">{READING_COPY.synthesis}</h3>
        <p>{result.synthesis}</p>
      </section>
      <section className="printed-reading__section">
        <h3 className="printed-reading__heading">{READING_COPY.reflections}</h3>
        <ul>
          {result.reflectionQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </section>
      <section className="printed-reading__section">
        <h3 className="printed-reading__heading">{READING_COPY.suggestions}</h3>
        <ul>
          {result.suggestions.map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** What the card shows, then what it says here, read as one paragraph. */
function paragraphOf(card: CardReading): string {
  return `${card.symbolism}${card.interpretation}`;
}
