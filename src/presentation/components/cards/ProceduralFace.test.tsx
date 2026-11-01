import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { registerBuiltInDecks } from "@/application/use-cases/createDeckLibrary";
import { InMemoryDeckRegistry } from "@/infrastructure/decks/inMemoryDeckRegistry";
import { MAJOR_ART_COUNT } from "./MajorArt";
import { ProceduralFace } from "./ProceduralFace";

const deck = registerBuiltInDecks(new InMemoryDeckRegistry()).get(
  "atelier-standard-tarot",
);
const cards = deck?.cards ?? [];
const majors = cards.filter((card) => card.category === "major");

describe("ProceduralFace", () => {
  it("has an illustration for every major arcana card", () => {
    expect(majors).toHaveLength(22);
    expect(MAJOR_ART_COUNT).toBe(22);

    for (const card of majors) {
      const { container, unmount } = render(<ProceduralFace card={card} />);
      const art = container.querySelector("[data-major-art]");
      expect(art?.getAttribute("data-major-art")).toBe(
        String(card.metadata?.numeral ?? card.sequence),
      );
      // The fallback placeholder is a lone circle; real scenes draw more.
      expect(art?.querySelectorAll("*").length ?? 0).toBeGreaterThan(3);
      unmount();
    }
  });

  it("labels every face with its name and header", () => {
    for (const card of cards) {
      const { getByRole, unmount } = render(<ProceduralFace card={card} />);
      const face = getByRole("img", { name: `${card.name.zhHant}程序式牌面` });
      expect(face.textContent).toContain(card.name.zhHant);
      unmount();
    }
  });
});
