import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { registerBuiltInDecks } from "@/application/use-cases/createDeckLibrary";
import { recordRound } from "@/domain/history/readingHistory";
import {
  FIXTURE_DECK_ID,
  fixtureDraw,
  fixtureSpread,
} from "@/domain/history/testing/historyFixtures";
import { InMemoryDeckRegistry } from "@/infrastructure/decks/inMemoryDeckRegistry";
import type { ShareServices } from "@/presentation/components/share/SharePanel";
import { SharePanel } from "@/presentation/components/share/SharePanel";
import {
  FAKE_SITE_URL,
  fakeShareServices,
} from "@/presentation/components/share/testing/fakeShareServices";

const registry = registerBuiltInDecks(new InMemoryDeckRegistry());
const created = recordRound({
  id: "r1",
  spread: fixtureSpread({
    questions: ["現在的我"],
    mainQuestion: "這份新工作適合我嗎？",
    draws: [
      fixtureDraw({ drawNumber: 1, cardId: "atelier-standard.major.17" }),
    ],
  }),
  deckId: FIXTURE_DECK_ID,
  recordedAt: new Date(2026, 10, 20, 2, 10),
});
if (!created) throw new Error("Expected a record");
const record = created;

function renderPanel(services: ShareServices) {
  render(
    <SharePanel record={record} registry={registry} services={services} />,
  );
}

describe("SharePanel", () => {
  it("previews the image with the questions shown by default", async () => {
    const { services, rendered } = fakeShareServices();
    renderPanel(services);
    expect(await screen.findByAltText("要分享的圖卡預覽")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "隱藏我寫的問題" }),
    ).not.toBeChecked();
    expect(rendered.at(-1)?.mainQuestion).toBe("這份新工作適合我嗎？");
    expect(rendered.at(-1)?.siteUrl).toBe(FAKE_SITE_URL);
  });

  it("paints the image again without questions once they are hidden", async () => {
    const { services, rendered, sharer } = fakeShareServices();
    renderPanel(services);
    await screen.findByAltText("要分享的圖卡預覽");
    fireEvent.click(screen.getByRole("checkbox", { name: "隱藏我寫的問題" }));
    await waitFor(() => expect(rendered.at(-1)?.mainQuestion).toBe(""));
    expect(rendered.at(-1)?.positions[0]?.question).toBe("");

    await screen.findByAltText("要分享的圖卡預覽");
    fireEvent.click(screen.getByRole("button", { name: "分享圖卡" }));
    await screen.findByText("已送出圖卡。");
    const [shared] = sharer.shareImage.mock.calls[0] ?? [];
    expect(shared?.text).not.toContain("這份新工作");
    expect(shared?.fileName).toBe("tarot-atelier-20261120-0210.png");
  });

  it("says the image was downloaded where sharing files is unsupported", async () => {
    const { services } = fakeShareServices("downloaded");
    renderPanel(services);
    await screen.findByAltText("要分享的圖卡預覽");
    fireEvent.click(screen.getByRole("button", { name: "分享圖卡" }));
    expect(await screen.findByText("已下載圖卡。")).toBeInTheDocument();
  });

  it("copies the text on its own", async () => {
    const { services, sharer } = fakeShareServices();
    renderPanel(services);
    fireEvent.click(screen.getByRole("button", { name: "複製文字" }));
    expect(await screen.findByText("已複製文字。")).toBeInTheDocument();
    expect(sharer.copyText.mock.calls[0]?.[0]).toContain("星星（正位）");
  });

  it("still offers the text when the image cannot be painted", async () => {
    const { services } = fakeShareServices();
    renderPanel({
      ...services,
      renderImage: () => Promise.reject(new Error("no canvas")),
    });
    expect(
      await screen.findByText("圖卡產生失敗，仍可複製文字分享。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "分享圖卡" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "複製文字" })).toBeEnabled();
  });
});
