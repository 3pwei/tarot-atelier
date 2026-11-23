import type { ReadingSource } from "@/domain/reading/types";
import {
  FAILURE_MESSAGES,
  FALLBACK_MESSAGES,
  issueMessage,
  READING_COPY,
  SOURCE_COPY,
} from "@/presentation/components/reading/readingLabels";
import type { ReadingSession } from "@/presentation/components/reading/useReadingSession";

/**
 * How reading a recorded round is going, in the table's own words: what is
 * missing, the wait, a failure to retry, or a pre-written stand-in.
 */
export function RecordReadingStatus({
  session,
  source,
}: {
  readonly session: ReadingSession;
  readonly source: ReadingSource;
}) {
  const { build, state } = session;
  if (!build.ok) {
    return (
      <ul className="reading-issues" role="alert">
        {build.issues.map((issue) => (
          <li key={JSON.stringify(issue)}>{issueMessage(issue)}</li>
        ))}
      </ul>
    );
  }
  if (state.status === "loading") {
    return (
      <div className="history-reading-status history-reading-status--loading">
        <span role="status">{SOURCE_COPY[source].loading}</span>
        <button type="button" className="ghost-action" onClick={session.cancel}>
          {READING_COPY.cancel}
        </button>
      </div>
    );
  }
  if (state.status === "failed") {
    return (
      <div className="history-reading-status">
        <span role="status">{FAILURE_MESSAGES[state.failure]}</span>
        {state.failure === "cancelled" ? null : (
          <button
            type="button"
            className="ghost-action"
            onClick={session.retry}
          >
            {READING_COPY.retry}
          </button>
        )}
      </div>
    );
  }
  if (state.status === "ready" && state.result.fallback) {
    return (
      <p className="reading-fallback" role="status">
        {FALLBACK_MESSAGES[state.result.fallback.reason]}
      </p>
    );
  }
  return null;
}
