import { spawnSync } from "node:child_process";

export interface RunOptions {
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
  /** Capture stdout and return it instead of streaming it to the terminal. */
  readonly capture?: boolean;
}

/** Runs a command and returns its stdout (empty unless captured). */
export type Run = (
  command: string,
  args: readonly string[],
  options?: RunOptions,
) => string;

export class StepFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StepFailedError";
  }
}

/** The real runner; tests inject their own. Throws when the command fails. */
export const run: Run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdio: options.capture ? ["ignore", "pipe", "inherit"] : "inherit",
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new StepFailedError(
      `\`${[command, ...args].join(" ")}\` exited with status ${result.status}.`,
    );
  }
  return options.capture ? result.stdout : "";
};
