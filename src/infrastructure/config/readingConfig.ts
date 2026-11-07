import {
  AI_READINGS_ON,
  READINGS_ROUTE,
} from "@/application/reading/readingEndpoint";
import { READING_WAIT_MS } from "@/application/reading/readingsApi";

/**
 * How the browser reads spreads, fixed at build time. The site scripts turn
 * AI readings on for builds that ship the reading endpoint; anything else,
 * such as `next dev`, reads with pre-written content only.
 */
export interface BrowserReadingConfig {
  readonly aiReadings: boolean;
  readonly endpoint: string;
  readonly timeoutMs: number;
}

export const browserReadingConfig: BrowserReadingConfig = Object.freeze({
  // Next.js inlines NEXT_PUBLIC_ values only when read by their full name.
  aiReadings: process.env.NEXT_PUBLIC_AI_READINGS === AI_READINGS_ON,
  endpoint: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/${READINGS_ROUTE}`,
  timeoutMs: READING_WAIT_MS.browser,
});
