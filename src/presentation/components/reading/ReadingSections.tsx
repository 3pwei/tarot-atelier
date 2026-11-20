import type {
  CardReading,
  ReadingResult,
  SensitiveTopic,
} from "@/domain/reading/types";
import {
  MEANING_LABELS,
  READING_COPY,
  TOPIC_LABELS,
} from "@/presentation/components/reading/readingLabels";

function CardBlock({
  reading,
  heading,
}: {
  readonly reading: CardReading;
  readonly heading: string;
}) {
  return (
    <div className="reading-card">
      <h4>{heading}</h4>
      <p>{reading.symbolism}</p>
    </div>
  );
}

/** A reading's sections: each position, then the spread as a whole. */
export function ReadingSections({
  result,
}: {
  readonly result: ReadingResult;
}) {
  return (
    <div className="reading-result">
      {result.positions.map((position, order) => (
        <details
          key={position.index}
          className="reading-section"
          open={order === 0}
        >
          <summary>
            <span className="reading-index" aria-hidden="true">
              {position.index}
            </span>
            <span className="reading-section__title">
              <span className="sr-only">牌位 {position.index}：</span>
              {position.primary.cardName}
              <small>{MEANING_LABELS[position.primary.meaningMode]}</small>
            </span>
            <span className="reading-section__question">
              {position.question}
            </span>
          </summary>
          <CardBlock
            reading={position.primary}
            heading={READING_COPY.symbolism}
          />
          <div className="reading-card">
            <h4>{READING_COPY.interpretation}</h4>
            <p>{position.primary.interpretation}</p>
          </div>
          {position.jumper ? (
            <div className="reading-card reading-card--jumper">
              <h4>
                {READING_COPY.jumperMessage}・{position.jumper.cardName}
                <small>{MEANING_LABELS[position.jumper.meaningMode]}</small>
              </h4>
              <p>{position.jumper.symbolism}</p>
              <p>{position.jumper.interpretation}</p>
            </div>
          ) : null}
        </details>
      ))}
      <details className="reading-section">
        <summary>
          <span className="reading-section__title">
            {READING_COPY.synthesis}
          </span>
        </summary>
        <p className="reading-section__body">{result.synthesis}</p>
      </details>
      <details className="reading-section">
        <summary>
          <span className="reading-section__title">
            {READING_COPY.reflections}
          </span>
        </summary>
        <ul className="reading-list">
          {result.reflectionQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </details>
      <details className="reading-section">
        <summary>
          <span className="reading-section__title">
            {READING_COPY.suggestions}
          </span>
        </summary>
        <ul className="reading-list">
          {result.suggestions.map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

/** Points to a qualified professional when the questions touch on one. */
export function ProfessionalNote({
  topics,
}: {
  readonly topics: readonly SensitiveTopic[];
}) {
  if (topics.length === 0) return null;
  return (
    <p className="reading-professional" role="note">
      {READING_COPY.professional(
        topics.map((topic) => TOPIC_LABELS[topic]).join("、"),
      )}
    </p>
  );
}
