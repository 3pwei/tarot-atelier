export interface TextPrompt {
  /** Instructions the model follows; never contains player text. */
  readonly system: string;
  /** The data to work on, including the player's questions. */
  readonly user: string;
}

/**
 * Generates text with a language model. Implementations reject with a
 * `ReadingUnavailableError`: `daily-limit` when the model's allocation is used
 * up, `unavailable` for anything else.
 */
export interface TextGenerator {
  generate(prompt: TextPrompt, signal?: AbortSignal): Promise<string>;
}
