import { fireEvent, screen } from "@testing-library/react";

/**
 * Plays the spread table the way a person does, for tests of the table and
 * of the pages it is printed on.
 */

/** Asks a main question, which dealing needs, and waits until play can start. */
export async function ready(mainQuestion = "這段時間的方向？") {
  await screen.findByText("請先輸入這次想問的主問題");
  fireEvent.change(screen.getByRole("textbox", { name: /^主問題/u }), {
    target: { value: mainQuestion },
  });
  await screen.findByText("準備好了，按住牌桌洗牌");
}

/** The fanned deck, once a shuffle has finished. */
export function fannedDeck() {
  return screen.findByRole("group", { name: /^扇形牌堆/u });
}

/** Chooses the fanned card in `slot` from the keyboard: lift, then draw. */
export function choose(slot: number) {
  const card = document.querySelector<HTMLElement>(`[data-fan-slot="${slot}"]`);
  if (!card) throw new Error(`no fanned card in slot ${slot}`);
  fireEvent.keyDown(card, { key: "Enter" });
  fireEvent.keyDown(card, { key: "Enter" });
}

/** The pack in the middle of the table, which shuffles while held. */
const DECK_PILE_NAME = /^(按住牌堆洗牌|牌堆：)/u;

export function deckPile() {
  return screen.getByRole("button", { name: DECK_PILE_NAME });
}

export function queryDeckPile() {
  return screen.queryByRole("button", { name: DECK_PILE_NAME });
}

/** Shuffles, then chooses a card for each of `count` empty positions. */
export async function shuffleAndPick(count = 3) {
  fireEvent.click(deckPile());
  await fannedDeck();
  for (let picked = 0; picked < count; picked += 1) {
    // A jumper takes a neighbour too, so choose whichever card is first.
    const first = document.querySelector<HTMLElement>("[data-fan-slot]");
    choose(Number(first?.dataset.fanSlot));
  }
  await screen.findByText("點擊卡牌，以火焰逐一揭示牌面");
}

export function reveal(index: number, role = "主牌") {
  fireEvent.click(
    screen.getByRole("button", { name: `以火焰揭示牌位 ${index} ${role}` }),
  );
}

/** Once every card is revealed, the reading opens from "Card Reading". */
export function openReading() {
  fireEvent.click(screen.getByRole("button", { name: "看解讀" }));
}

/**
 * Reveals every card on positions 1 to `count`, a jumper included where
 * the deck drew one (the chance is real when randomness is not injected).
 */
export function revealAll(count: number) {
  for (let index = 1; index <= count; index += 1) {
    reveal(index);
    const jumper = screen.queryByRole("button", {
      name: `以火焰揭示牌位 ${index} 跳牌`,
    });
    if (jumper) fireEvent.click(jumper);
  }
}
