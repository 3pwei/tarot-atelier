import type {
  ImageShare,
  ImageShareOutcome,
  Sharer,
  TextCopyOutcome,
} from "@/application/ports/sharer";

/** The parts of `navigator` and `document` sharing uses, so tests can fake them. */
export interface BrowserShareEnvironment {
  readonly share?: (data: ShareData) => Promise<void>;
  readonly canShare?: (data: ShareData) => boolean;
  readonly writeText?: (text: string) => Promise<void>;
  readonly download: (image: Blob, fileName: string) => void;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** Saves `image` through a temporary link, the way a download button does. */
function downloadWithLink(image: Blob, fileName: string): void {
  const url = URL.createObjectURL(image);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // The click has started the download; the URL is no longer needed.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function browserShareEnvironment(): BrowserShareEnvironment {
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  return {
    ...(nav?.share ? { share: (data) => nav.share(data) } : {}),
    ...(nav?.canShare ? { canShare: (data) => nav.canShare(data) } : {}),
    ...(nav?.clipboard?.writeText
      ? { writeText: (text) => nav.clipboard.writeText(text) }
      : {}),
    download: downloadWithLink,
  };
}

/**
 * Shares through the Web Share API where it can carry files, and downloads
 * the image everywhere else.
 */
export class BrowserSharer implements Sharer {
  readonly #environment: BrowserShareEnvironment;

  constructor(
    environment: BrowserShareEnvironment = browserShareEnvironment(),
  ) {
    this.#environment = environment;
  }

  async shareImage(share: ImageShare): Promise<ImageShareOutcome> {
    const { share: shareSheet, canShare, download } = this.#environment;
    const file = new File([share.image], share.fileName, {
      type: share.image.type,
    });
    const data: ShareData = {
      files: [file],
      title: share.title,
      text: share.text,
    };
    if (shareSheet && canShare?.(data)) {
      try {
        await shareSheet(data);
        return "shared";
      } catch (error) {
        if (isAbort(error)) return "cancelled";
        // Some browsers refuse files late; a download still delivers it.
      }
    }
    try {
      download(share.image, share.fileName);
      return "downloaded";
    } catch {
      return "failed";
    }
  }

  async copyText(text: string): Promise<TextCopyOutcome> {
    const { writeText } = this.#environment;
    if (!writeText) return "failed";
    try {
      await writeText(text);
      return "copied";
    } catch {
      return "failed";
    }
  }
}
