import { vi } from "vitest";
import type { ImageShareOutcome, Sharer } from "@/application/ports/sharer";
import type { ShareCard } from "@/presentation/components/share/shareCard";
import type { ShareServices } from "@/presentation/components/share/SharePanel";

export const FAKE_SITE_URL = "https://games.example.test/tarot/";

/** Share services that record what they were given and paint no canvas. */
export function fakeShareServices(imageOutcome: ImageShareOutcome = "shared") {
  const rendered: ShareCard[] = [];
  const sharer = {
    shareImage: vi.fn<Sharer["shareImage"]>(() =>
      Promise.resolve(imageOutcome),
    ),
    copyText: vi.fn<Sharer["copyText"]>(() => Promise.resolve("copied")),
  };
  const services: ShareServices = {
    sharer,
    renderImage: (card) => {
      rendered.push(card);
      return Promise.resolve(new Blob(["png"], { type: "image/png" }));
    },
    siteUrl: () => FAKE_SITE_URL,
  };
  return { services, sharer, rendered };
}
