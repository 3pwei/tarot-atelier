/** How handing an image over ended. */
export type ImageShareOutcome =
  /** The system share sheet took it. */
  | "shared"
  /** The person closed the share sheet. */
  | "cancelled"
  /** Sharing files is unsupported here, so the image was downloaded. */
  | "downloaded"
  | "failed";

export type TextCopyOutcome = "copied" | "failed";

export interface ImageShare {
  readonly image: Blob;
  readonly fileName: string;
  readonly title: string;
  readonly text: string;
}

/**
 * Hands content to the platform: the system share sheet, a download or the
 * clipboard. A native app can plug in its own without touching callers.
 */
export interface Sharer {
  shareImage(share: ImageShare): Promise<ImageShareOutcome>;
  copyText(text: string): Promise<TextCopyOutcome>;
}
