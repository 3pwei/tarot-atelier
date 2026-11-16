"use client";

import {
  memo,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { ProceduralBack } from "@/presentation/components/cards/ProceduralBack";
import {
  fanPlacements,
  fanSpan,
  openSlots,
  type CardFan,
  type FanPlacement,
} from "@/presentation/components/draw/cardFan";
import { cardBackUrl } from "@/presentation/components/library/prerenderedArt";
import { fanSlotSelector } from "@/presentation/components/spread/useSpreadDealer";

/** How far up a lifted card must be pulled to leave the fan. */
export const PULL_OUT_PX = 56;

interface CardFanViewProps {
  readonly deckId: string;
  readonly fan: CardFan;
  /** Number of the position the chosen card goes to. */
  readonly positionIndex: number;
  /** The card in `slot` was chosen; `origin` is where it left the fan. */
  readonly onPick: (slot: number, origin: DOMRect) => void;
}

interface Pull {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  dy: number;
}

/** Stable for the life of the fan; each card passes its own slot. */
interface FanHandlers {
  lift(slot: number): void;
  keyDown(event: KeyboardEvent<HTMLButtonElement>, slot: number): void;
  pointerDown(event: PointerEvent<HTMLButtonElement>, slot: number): void;
  pointerMove(event: PointerEvent<HTMLButtonElement>): void;
  pointerEnd(event: PointerEvent<HTMLButtonElement>, slot: number): void;
}

/**
 * The shuffled pile fanned out face down. Tap a card to lift it, then pull it
 * up and out to choose it; Enter does the same from the keyboard. Only the
 * card being touched re-renders or moves.
 */
export function CardFanView({
  deckId,
  fan,
  positionIndex,
  onPick,
}: CardFanViewProps) {
  const hintId = useId();
  const scroller = useRef<HTMLDivElement>(null);
  const placements = useMemo(() => fanPlacements(fan.size), [fan.size]);
  const open = openSlots(fan);
  const [lifted, setLifted] = useState<number | undefined>();
  const current =
    lifted !== undefined && !fan.taken.has(lifted) ? lifted : undefined;
  const focusable = current ?? open[Math.floor(open.length / 2)];
  const backUrl = cardBackUrl(deckId);

  const latest = useRef({ open, current, onPick });
  const pull = useRef<Pull | null>(null);
  useLayoutEffect(() => {
    latest.current = { open, current, onPick };
  });

  // Open with the middle of the fan in view, the way a fanned deck is held.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2;
  }, []);

  const handlers = useMemo<FanHandlers>(() => {
    const cardAt = (slot: number) =>
      scroller.current?.querySelector<HTMLElement>(fanSlotSelector(slot)) ??
      null;
    const lift = (slot: number | undefined, focus: boolean) => {
      if (slot === undefined) return;
      setLifted(slot);
      if (focus) cardAt(slot)?.focus();
    };
    const choose = (slot: number) => {
      const card = cardAt(slot);
      if (!card) return;
      latest.current.onPick(slot, card.getBoundingClientRect());
      setLifted(undefined);
    };
    const step = (from: number, offset: number) => {
      const slots = latest.current.open;
      const index = slots.indexOf(from);
      lift(
        slots[Math.min(slots.length - 1, Math.max(0, index + offset))],
        true,
      );
    };

    return {
      lift: (slot) => lift(slot, false),
      keyDown(event, slot) {
        const keyMoves: Readonly<Record<string, () => void>> = {
          ArrowRight: () => step(slot, 1),
          ArrowLeft: () => step(slot, -1),
          Home: () => lift(latest.current.open[0], true),
          End: () => lift(latest.current.open.at(-1), true),
          // Enter chooses a lifted card; on any other card it lifts it.
          Enter: () =>
            latest.current.current === slot ? choose(slot) : lift(slot, false),
        };
        const move = keyMoves[event.key];
        if (!move) return;
        event.preventDefault();
        move();
      },
      pointerDown(event, slot) {
        if (latest.current.current !== slot || event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        pull.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          dy: 0,
        };
        event.currentTarget.dataset.pulling = "true";
      },
      pointerMove(event) {
        const active = pull.current;
        if (!active || active.pointerId !== event.pointerId) return;
        active.dy = event.clientY - active.startY;
        event.currentTarget.style.setProperty(
          "translate",
          `${event.clientX - active.startX}px ${active.dy}px`,
        );
      },
      pointerEnd(event, slot) {
        const active = pull.current;
        if (!active || active.pointerId !== event.pointerId) return;
        const pulledOut =
          -active.dy >= PULL_OUT_PX && event.type === "pointerup";
        pull.current = null;
        const card = event.currentTarget;
        delete card.dataset.pulling;
        if (pulledOut) {
          choose(slot);
          return;
        }
        // Not far enough: it settles back into the fan.
        card.style.removeProperty("translate");
      },
    };
  }, []);

  return (
    <div
      className="card-fan"
      role="group"
      aria-label={`扇形牌堆，剩 ${open.length} 張`}
    >
      <p id={hintId} className="sr-only">
        {`左右鍵挑牌，Enter 讓牌浮起，再按一次 Enter 抽出，放到牌位 ${positionIndex}`}
      </p>
      <div className="card-fan__scroller" ref={scroller}>
        <div
          className="card-fan__track"
          style={{ "--fan-span": `${fanSpan(fan.size)}px` } as CSSProperties}
        >
          {placements.map((placement, slot) =>
            fan.taken.has(slot) ? null : (
              <FanCard
                key={slot}
                slot={slot}
                placement={placement}
                lifted={current === slot}
                tabbable={focusable === slot}
                backUrl={backUrl}
                describedBy={hintId}
                handlers={handlers}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

interface FanCardProps {
  readonly slot: number;
  readonly placement: FanPlacement;
  readonly lifted: boolean;
  readonly tabbable: boolean;
  readonly backUrl?: string;
  readonly describedBy: string;
  readonly handlers: FanHandlers;
}

/**
 * One face-down card. Its place is fixed for the life of the fan, and every
 * copy shares one decoded image of the back.
 */
const FanCard = memo(function FanCard({
  slot,
  placement,
  lifted,
  tabbable,
  backUrl,
  describedBy,
  handlers,
}: FanCardProps) {
  const style = {
    "--fan-x": `${placement.x}px`,
    "--fan-y": `${placement.y}px`,
    "--fan-rotate": `${placement.rotation}deg`,
  } as CSSProperties;
  return (
    <button
      type="button"
      className="card-fan__card"
      data-fan-slot={slot}
      data-lifted={lifted || undefined}
      aria-pressed={lifted}
      aria-label={lifted ? "浮起的牌，往上拉出抽出" : "背面朝上的牌"}
      aria-describedby={describedBy}
      tabIndex={tabbable ? 0 : -1}
      style={style}
      onClick={() => handlers.lift(slot)}
      onKeyDown={(event) => handlers.keyDown(event, slot)}
      onPointerDown={(event) => handlers.pointerDown(event, slot)}
      onPointerMove={handlers.pointerMove}
      onPointerUp={(event) => handlers.pointerEnd(event, slot)}
      onPointerCancel={(event) => handlers.pointerEnd(event, slot)}
    >
      {backUrl ? (
        // A static export serves files as they are; next/image adds nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="card-fan__back"
          src={backUrl}
          alt=""
          draggable={false}
        />
      ) : (
        <ProceduralBack label="" />
      )}
    </button>
  );
});
