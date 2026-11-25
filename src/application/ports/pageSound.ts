/** The kinds of page sound the book makes. */
export type PageSoundKind = "turn" | "riffle";

/**
 * The paper sound of a turning page. Playing may fail silently: a browser can
 * refuse audio, and the book reads the same without it.
 */
export interface PageSound {
  play(kind: PageSoundKind, durationMs: number): void;
}
