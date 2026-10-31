import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createEmptyTablePreview } from "@/domain/table/tablePreview";
import { StaticTarotTable } from "./StaticTarotTable";

describe("StaticTarotTable", () => {
  it("clearly identifies the foundation preview as non-interactive", () => {
    render(<StaticTarotTable preview={createEmptyTablePreview()} />);

    expect(screen.getByRole("status")).toHaveTextContent("目前沒有抽牌");
    expect(
      screen.queryByRole("button", { name: /抽牌/u }),
    ).not.toBeInTheDocument();
  });
});
