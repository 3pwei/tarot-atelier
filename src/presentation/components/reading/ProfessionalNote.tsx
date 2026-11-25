import type { SensitiveTopic } from "@/domain/reading/types";
import {
  READING_COPY,
  TOPIC_LABELS,
} from "@/presentation/components/reading/readingLabels";

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
