import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DrawExperience } from "@/presentation/components/DrawExperience";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

describe("DrawExperience", () => {
  it("supports keyboard-focused drawing and blocks duplicate clicks", async () => {
    render(<DrawExperience randomSource={() => 0.9} initialJumperMode="off" />);

    fireEvent.click(screen.getByRole("button", { name: "洗牌" }));
    const pile = await screen.findByRole("button", {
      name: "從牌堆抽一張牌",
    });
    pile.focus();
    expect(pile).toHaveFocus();

    fireEvent.click(pile);
    fireEvent.click(pile);

    await waitFor(() =>
      expect(screen.getByText("牌面已揭示")).toBeInTheDocument(),
    );
    expect(document.querySelectorAll("[data-draw-card]")).toHaveLength(1);
    expect(screen.getByText("剩餘 77 張")).toBeInTheDocument();
  });

  it("shows the jumper role and removes two cards when rare mode hits", async () => {
    let calls = 0;
    const random = () => {
      calls += 1;
      return calls === 78 ? 0.029 : 0.9;
    };
    render(<DrawExperience randomSource={random} />);

    fireEvent.click(screen.getByRole("button", { name: "洗牌" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "從牌堆抽一張牌" }),
    );

    await waitFor(() =>
      expect(screen.getByText("牌面已揭示")).toBeInTheDocument(),
    );
    expect(document.querySelectorAll("[data-draw-card]")).toHaveLength(2);
    expect(screen.getByText("跳牌")).toBeInTheDocument();
    expect(screen.getByText("剩餘 76 張")).toBeInTheDocument();
  });
});
