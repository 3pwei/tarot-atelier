import type { Orientation } from "@/domain/deck/types";

/** A drawn card's part in its position: the main card, or the jumper. */
export type CardRole = "primary" | "jumper";

export const ROLE_LABELS: Readonly<Record<CardRole, string>> = {
  primary: "主牌",
  jumper: "跳牌",
};

export const ORIENTATION_LABELS: Readonly<Record<Orientation, string>> = {
  upright: "正位",
  reversed: "逆位",
};
