"use client";

import { useMemo } from "react";
import {
  createReadingRequester,
  type ReadingRequester,
} from "@/application/use-cases/requestReading";
import type { RecordReadingServices } from "@/presentation/components/history/useRecordReading";
import { createRequestId as createReadingRequestId } from "@/presentation/components/reading/readingSession";
import { useAtelierServices } from "@/presentation/services/atelierServices";

export interface ReadingServicesOptions {
  /** Replaces the requester around the provider, e.g. in tests. */
  readonly requester?: ReadingRequester;
  readonly createRequestId?: () => string;
}

export interface ReadingServicesHandle {
  readonly requester: ReadingRequester;
  /** What a past round needs to ask for its reading again. */
  readonly recordServices: RecordReadingServices;
}

/** The site's reading requester, shared by the table and the records. */
export function useReadingServices({
  requester: requesterOverride,
  createRequestId = createReadingRequestId,
}: ReadingServicesOptions = {}): ReadingServicesHandle {
  const { readingProvider } = useAtelierServices();
  const requester = useMemo(
    () => requesterOverride ?? createReadingRequester(readingProvider),
    [requesterOverride, readingProvider],
  );
  const recordServices = useMemo(
    () => ({ requester, source: readingProvider.source, createRequestId }),
    [requester, readingProvider.source, createRequestId],
  );
  return { requester, recordServices };
}
