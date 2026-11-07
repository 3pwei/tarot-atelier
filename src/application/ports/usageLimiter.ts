export type UsageClaim = "granted" | "visitor-limit" | "daily-limit";

/** Counts AI readings per visitor and for the whole site, per day. */
export interface UsageLimiter {
  /**
   * Counts one reading for `visitor` on `day` when both the visitor's and
   * the site's limits allow it; counts nothing otherwise.
   */
  claim(visitor: string, day: string): Promise<UsageClaim>;
}
