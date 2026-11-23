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
  fanSlotSelector,
  openSlots,
  type CardFan,
} from "@/presentation/components/draw/cardFan";
import {
  cardAngle,
  PULL_OUT_PX,
  turnByDrag,
  turnToShow,
  wheelLayout,
} from "@/presentation/components/draw/cardWheel";

function contains(
  box: DOMRect | undefined,
  point: { readonly x: number; readonly y: number },
): boolean {
  return (
    box !== undefined &&
    point.x >= box.left &&
    point.x <= box.right &&
    point.y >= box.top &&
    point.y <= box.bottom
  );
}

/** Movement that still counts as a tap rather than a turn or a pull. */
const TAP_SLOP_PX = 6;

interface CardWheelViewProps {
  readonly fan: CardFan;
  /** Laid out below the table, out of sight, until the shuffle completes. */
  readonly waiting: boolean;
  /** Card width as a percentage of the table's width, as on the positions. */
  readonly cardWidth: number;
  readonly backUrl?: string;
  /** Number of the position the chosen card goes to. */
  readonly positionIndex: number;
  /** The card in `slot` was drawn; `origin` is where it left the wheel. */
  readonly onPick: (slot: number, origin: DOMRect) => void;
}

type Gesture =
  | {
      readonly kind: "pending";
      readonly pointerId: number;
      readonly slot: number;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly kind: "turning";
      readonly pointerId: number;
      readonly x: number;
      readonly startTurn: number;
    }
  | {
      readonly kind: "pulling";
      readonly pointerId: number;
      readonly slot: number;
      readonly y: number;
      pull: number;
    };

/** Stable for the life of the wheel; they read the latest render from a ref. */
interface WheelHandlers {
  /** Slides a card forward where it lies, as a tap does. */
  choose(slot: number): void;
  /**
   * Slides a card forward and turns the wheel to bring it into view, as the
   * keyboard does: Enter, and the arrow keys moving to a card that may be off
   * to one side.
   */
  chooseAndShow(slot: number): void;
  draw(slot: number): void;
  setTurn(degrees: number): void;
  keyDown(event: KeyboardEvent<HTMLButtonElement>, slot: number): void;
}

/**
 * The shuffled pile laid face down on a wheel along the bottom of the table.
 * Tap a card to slide it forward where it lies, then pull it forward out of
 * the wheel. From the keyboard Enter does the same, turning the wheel to keep
 * the chosen card in view, as the arrow keys do moving along it. A sideways
 * drag turns the wheel when
 * not every card fits. Turning moves one layer, and only the chosen card
 * re-renders, so the other cards stay still and cheap.
 */
export function CardWheelView({
  fan,
  waiting,
  cardWidth,
  backUrl,
  positionIndex,
  onPick,
}: CardWheelViewProps) {
  const hintId = useId();
  const area = useRef<HTMLDivElement>(null);
  const wheel = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const layout = useMemo(
    () =>
      wheelLayout({
        ...size,
        count: fan.size,
        cardWidth: (size.width * cardWidth) / 100,
      }),
    [size, fan.size, cardWidth],
  );
  const open = openSlots(fan);
  const [chosen, setChosen] = useState<number | undefined>();
  const current =
    chosen !== undefined && !fan.taken.has(chosen) ? chosen : undefined;
  const focusable = current ?? open[Math.floor(open.length / 2)];
  const turn = useRef(0);
  const gesture = useRef<Gesture | null>(null);

  const latest = useRef({ open, current, onPick, layout, size: fan.size });
  useLayoutEffect(() => {
    latest.current = { open, current, onPick, layout, size: fan.size };
  });

  useLayoutEffect(() => {
    const element = area.current;
    if (!element) return;
    const measure = () =>
      setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handlers = useMemo<WheelHandlers>(() => {
    const cardAt = (slot: number) =>
      wheel.current?.querySelector<HTMLElement>(fanSlotSelector(slot)) ?? null;
    const setTurn = (degrees: number) => {
      turn.current = degrees;
      wheel.current?.style.setProperty("--wheel-turn", `${degrees}deg`);
    };
    // The wheel stays put, so the card that slides forward is the one under
    // the finger.
    const choose = (slot: number) => {
      setChosen(slot);
    };
    const chooseAndShow = (slot: number) => {
      const { layout: geometry, size: count } = latest.current;
      setChosen(slot);
      setTurn(turnToShow(geometry, slot, count));
      cardAt(slot)?.focus();
    };
    const draw = (slot: number) => {
      const card = cardAt(slot);
      if (!card) return;
      latest.current.onPick(slot, card.getBoundingClientRect());
      setChosen(undefined);
    };
    return {
      choose,
      chooseAndShow,
      draw,
      setTurn,
      keyDown(event, slot) {
        const { open: slots, current: chosenSlot } = latest.current;
        const index = slots.indexOf(slot);
        const at = (offset: number) =>
          slots[Math.min(slots.length - 1, Math.max(0, index + offset))] ??
          slot;
        // Enter or Space draws the chosen card; on any other card, chooses it
        // and brings it into view: the keyboard has no finger to stay under,
        // and a focused card may lie off to one side of a wide wheel.
        const chooseOrDraw = () =>
          chosenSlot === slot ? draw(slot) : chooseAndShow(slot);
        const keys: Readonly<Record<string, () => void>> = {
          ArrowRight: () => chooseAndShow(at(1)),
          ArrowLeft: () => chooseAndShow(at(-1)),
          Home: () => chooseAndShow(slots[0] ?? slot),
          End: () => chooseAndShow(slots.at(-1) ?? slot),
          Enter: chooseOrDraw,
          " ": chooseOrDraw,
        };
        const action = keys[event.key];
        if (!action) return;
        event.preventDefault();
        action();
      },
    };
  }, []);

  const cardAt = (slot: number) =>
    wheel.current?.querySelector<HTMLElement>(fanSlotSelector(slot)) ?? null;

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const card = (event.target as Element).closest<HTMLElement>(
      "[data-fan-slot]",
    );
    if (!card) return;
    // Moves keep coming to the card, and bubble here, wherever the finger goes.
    card.setPointerCapture(event.pointerId);
    gesture.current = {
      kind: "pending",
      pointerId: event.pointerId,
      slot: Number(card.dataset.fanSlot),
      x: event.clientX,
      y: event.clientY,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (active.kind === "pending") {
      const dx = event.clientX - active.x;
      const dy = event.clientY - active.y;
      if (Math.hypot(dx, dy) < TAP_SLOP_PX) return;
      const forward = -dy > Math.abs(dx);
      // Neighbours overlap the chosen card; a forward drag that starts
      // anywhere over it pulls it, whichever card took the press.
      const pulled =
        current !== undefined &&
        (active.slot === current ||
          contains(cardAt(current)?.getBoundingClientRect(), active))
          ? current
          : undefined;
      if (forward && pulled !== undefined) {
        gesture.current = {
          kind: "pulling",
          pointerId: active.pointerId,
          slot: pulled,
          y: active.y,
          pull: 0,
        };
        cardAt(pulled)?.setAttribute("data-pulling", "true");
      } else {
        gesture.current = {
          kind: "turning",
          pointerId: active.pointerId,
          x: active.x,
          startTurn: turn.current,
        };
      }
      return;
    }
    if (active.kind === "turning") {
      handlers.setTurn(
        turnByDrag(layout, active.startTurn, event.clientX - active.x),
      );
      return;
    }
    active.pull = Math.max(0, active.y - event.clientY);
    cardAt(active.slot)?.style.setProperty("--pull", `${active.pull}px`);
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    gesture.current = null;
    const released = event.type === "pointerup";
    if (active.kind === "pending") {
      if (released) handlers.choose(active.slot);
      return;
    }
    if (active.kind !== "pulling") return;
    const card = cardAt(active.slot);
    card?.removeAttribute("data-pulling");
    if (released && active.pull >= PULL_OUT_PX) {
      handlers.draw(active.slot);
      return;
    }
    // Not far enough: it slides back to its chosen place.
    card?.style.removeProperty("--pull");
  }

  const wheelStyle = {
    "--wheel-x": `${layout.centerX}px`,
    "--wheel-y": `${layout.centerY}px`,
    "--wheel-radius": `${layout.radius}px`,
    "--wheel-card-width": `${layout.cardWidth}px`,
    "--nudge": `${layout.nudge}px`,
  } as CSSProperties;

  return (
    <div
      ref={area}
      className="card-wheel"
      role="group"
      aria-label={`扇形牌堆，剩 ${open.length} 張`}
      data-turnable={layout.maxTurn > 0 || undefined}
      data-waiting={waiting || undefined}
      inert={waiting}
    >
      <p id={hintId} className="sr-only">
        {`左右鍵挑牌，Enter 把牌往前推，再按一次 Enter 抽出，放到牌位 ${positionIndex}`}
      </p>
      {
        <div
          ref={wheel}
          className="card-wheel__wheel"
          style={wheelStyle}
          data-own-gesture
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          {Array.from({ length: fan.size }, (_, slot) =>
            fan.taken.has(slot) ? null : (
              <WheelCard
                key={slot}
                slot={slot}
                angle={cardAngle(layout, slot, fan.size)}
                chosen={current === slot}
                tabbable={focusable === slot}
                backUrl={backUrl}
                describedBy={hintId}
                handlers={handlers}
              />
            ),
          )}
        </div>
      }
    </div>
  );
}

interface WheelCardProps {
  readonly slot: number;
  readonly angle: number;
  readonly chosen: boolean;
  readonly tabbable: boolean;
  readonly backUrl?: string;
  readonly describedBy: string;
  readonly handlers: WheelHandlers;
}

/**
 * One face-down card on the wheel. Its place is fixed for the life of the
 * wheel, and every copy shares one decoded image of the back.
 */
const WheelCard = memo(function WheelCard({
  slot,
  angle,
  chosen,
  tabbable,
  backUrl,
  describedBy,
  handlers,
}: WheelCardProps) {
  return (
    <button
      type="button"
      className="card-wheel__card"
      data-fan-slot={slot}
      data-chosen={chosen || undefined}
      aria-pressed={chosen}
      aria-label={chosen ? "往前推出的牌，往前拉出抽出" : "背面朝上的牌"}
      aria-describedby={describedBy}
      tabIndex={tabbable ? 0 : -1}
      style={{ "--card-angle": `${angle}deg` } as CSSProperties}
      onKeyDown={(event) => handlers.keyDown(event, slot)}
    >
      {backUrl ? (
        // A static export serves files as they are; next/image adds nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="card-wheel__back"
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
