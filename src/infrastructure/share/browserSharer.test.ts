import { describe, expect, it, vi } from "vitest";
import {
  BrowserSharer,
  type BrowserShareEnvironment,
} from "@/infrastructure/share/browserSharer";

const share = {
  image: new Blob(["png"], { type: "image/png" }),
  fileName: "tarot.png",
  title: "Tarot Atelier",
  text: "文字",
};

function environment(
  overrides: Partial<BrowserShareEnvironment> = {},
): BrowserShareEnvironment {
  return { download: vi.fn(), ...overrides };
}

describe("BrowserSharer", () => {
  it("opens the share sheet with the image when files can be shared", async () => {
    const shareSheet = vi.fn(() => Promise.resolve());
    const env = environment({ share: shareSheet, canShare: () => true });
    await expect(new BrowserSharer(env).shareImage(share)).resolves.toBe(
      "shared",
    );
    const [data] = shareSheet.mock.calls[0] as unknown as [ShareData];
    expect(data.files?.[0]?.name).toBe("tarot.png");
    expect(env.download).not.toHaveBeenCalled();
  });

  it("reports a closed share sheet without downloading", async () => {
    const env = environment({
      share: () => Promise.reject(new DOMException("closed", "AbortError")),
      canShare: () => true,
    });
    await expect(new BrowserSharer(env).shareImage(share)).resolves.toBe(
      "cancelled",
    );
    expect(env.download).not.toHaveBeenCalled();
  });

  it("downloads the image where files cannot be shared", async () => {
    const env = environment({ share: vi.fn(), canShare: () => false });
    await expect(new BrowserSharer(env).shareImage(share)).resolves.toBe(
      "downloaded",
    );
    expect(env.download).toHaveBeenCalledWith(share.image, "tarot.png");
  });

  it("downloads when the share sheet refuses the file", async () => {
    const env = environment({
      share: () => Promise.reject(new DOMException("no", "NotAllowedError")),
      canShare: () => true,
    });
    await expect(new BrowserSharer(env).shareImage(share)).resolves.toBe(
      "downloaded",
    );
  });

  it("copies text, and says so when the clipboard is unavailable", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    await expect(
      new BrowserSharer(environment({ writeText })).copyText("文字"),
    ).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith("文字");
    await expect(
      new BrowserSharer(environment()).copyText("文字"),
    ).resolves.toBe("failed");
  });
});
