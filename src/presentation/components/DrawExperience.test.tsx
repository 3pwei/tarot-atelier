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

async function shuffleAndDraw() {
  fireEvent.click(screen.getByRole("button", { name: "洗牌" }));
  const pile = await screen.findByRole("button", { name: "從牌堆抽一張牌" });
  fireEvent.click(pile);
  return pile;
}

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

    await screen.findByText("點擊卡牌，以火焰揭示牌面");
    expect(document.querySelectorAll("[data-draw-card]")).toHaveLength(1);
    expect(screen.getByText("剩餘 77 張")).toBeInTheDocument();
  });

  it("keeps the face hidden until the person reveals the card", async () => {
    render(<DrawExperience randomSource={() => 0.9} initialJumperMode="off" />);
    await shuffleAndDraw();

    const reveal = await screen.findByRole("button", {
      name: "以火焰揭示主牌",
    });
    const card = document.querySelector("[data-draw-card='primary']");
    expect(card).toHaveAttribute("data-reveal-state", "sealed");
    expect(screen.getByRole("button", { name: "洗牌" })).toBeDisabled();

    fireEvent.click(reveal);

    await waitFor(() =>
      expect(screen.getByText("牌面已揭示")).toBeInTheDocument(),
    );
    expect(card).toHaveAttribute("data-reveal-state", "revealed");
    expect(
      screen.getByRole("button", { name: /^主牌：.+，(正位|逆位)$/u }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "洗牌" })).toBeEnabled();
  });

  it("shows the jumper role and removes two cards when rare mode hits", async () => {
    let calls = 0;
    const random = () => {
      calls += 1;
      return calls === 78 ? 0.029 : 0.9;
    };
    render(<DrawExperience randomSource={random} />);
    await shuffleAndDraw();

    await screen.findByText("點擊卡牌，以火焰揭示牌面");
    expect(document.querySelectorAll("[data-draw-card]")).toHaveLength(2);
    expect(screen.getAllByText("跳牌").length).toBeGreaterThan(0);
    expect(screen.getByText("剩餘 76 張")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "以火焰揭示主牌" }));
    expect(screen.queryByText("牌面已揭示")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "以火焰揭示跳牌" }));

    await waitFor(() =>
      expect(screen.getByText("牌面已揭示")).toBeInTheDocument(),
    );
  });
});
