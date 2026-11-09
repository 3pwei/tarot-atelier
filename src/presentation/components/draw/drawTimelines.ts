import type { gsap as GsapInstance } from "gsap";

type Gsap = typeof GsapInstance;
type Timeline = ReturnType<Gsap["timeline"]>;

const RIFFLE_ROUNDS = 2;

/**
 * Two riffle passes: the pack splits into halves that tilt apart, then the
 * cards fall back in alternating order, and finally the deck squares up with
 * a small bridge bounce.
 */
export function buildShuffleTimeline(
  gsap: Gsap,
  cards: readonly HTMLElement[],
  cardWidth: number,
  onComplete: () => void,
): Timeline {
  const timeline = gsap.timeline({ onComplete });
  const spread = cardWidth * 0.58;
  const left = cards.filter((_, index) => index % 2 === 0);
  const right = cards.filter((_, index) => index % 2 === 1);

  timeline.set(cards, { transformOrigin: "50% 100%" });

  for (let round = 0; round < RIFFLE_ROUNDS; round += 1) {
    const label = `split-${round}`;
    timeline
      .addLabel(label)
      .to(
        left,
        {
          x: -spread,
          y: (index) => -index * 1.5,
          rotation: -9,
          duration: 0.34,
          ease: "power3.out",
          stagger: { each: 0.012, from: "end" },
        },
        label,
      )
      .to(
        right,
        {
          x: spread,
          y: (index) => -index * 1.5,
          rotation: 9,
          duration: 0.34,
          ease: "power3.out",
          stagger: { each: 0.012, from: "end" },
        },
        label,
      )
      // Bend the halves like thumbs pulling up the corners before release.
      .to(left, { rotation: -14, skewY: 4, duration: 0.14, ease: "sine.inOut" })
      .to(
        right,
        { rotation: 14, skewY: -4, duration: 0.14, ease: "sine.inOut" },
        "<",
      )
      .to(cards, {
        x: 0,
        y: 0,
        rotation: 0,
        skewY: 0,
        duration: 0.2,
        ease: "power2.in",
        stagger: { each: 0.028, from: "start" },
        onStart() {
          // Interleave: alternate halves land on top of each other.
          cards.forEach((card, index) => {
            card.style.zIndex = String(
              round % 2 === 0 ? cards.length - index : index + 1,
            );
          });
        },
      });
  }

  return timeline
    .to(cards, {
      y: (index) => -index * 0.6,
      scaleY: 0.96,
      duration: 0.12,
      ease: "power1.out",
    })
    .to(cards, {
      y: 0,
      scaleY: 1,
      duration: 0.42,
      ease: "elastic.out(1, 0.55)",
      clearProps: "transform,zIndex",
    });
}

/**
 * The landing slot's frame on screen. Cards inside a rotated position on a
 * zoomed table are animated in that slot's local coordinates.
 */
export interface FlightFrame {
  /** Slot rotation in degrees. */
  readonly rotation: number;
  /** Table zoom factor. */
  readonly scale: number;
}

const SCREEN_FRAME: FlightFrame = { rotation: 0, scale: 1 };

/** Gap between consecutive positions when a whole spread is dealt. */
export const DEAL_STAGGER_MS = 180;

interface FlightPlan {
  readonly element: HTMLElement;
  readonly from: DOMRect;
  readonly role: "primary" | "jumper";
  readonly frame?: FlightFrame;
  /** Dealing order; each step leaves the deck `DEAL_STAGGER_MS` later. */
  readonly order?: number;
  /** Called when the card touches down. The timeline writes no state itself:
   * a reverted GSAP context would restore anything it wrote to the DOM. */
  readonly onLanded?: () => void;
}

/** Converts a screen-space offset into the slot's local (unrotated, unzoomed) space. */
export function toLocalOffset(
  dx: number,
  dy: number,
  frame: FlightFrame,
): { readonly x: number; readonly y: number } {
  const radians = (-frame.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const scale = Math.max(frame.scale, 1e-6);
  return {
    x: (dx * cos - dy * sin) / scale,
    y: (dx * sin + dy * cos) / scale,
  };
}

function quadratic(
  start: number,
  control: number,
  end: number,
  t: number,
): number {
  const inverse = 1 - t;
  return inverse * inverse * start + 2 * inverse * t * control + t * t * end;
}

/**
 * Each drawn card lifts from the deck, sails on a curved path to its slot and
 * settles. The jumper bursts out a beat later with a spin, as if the deck
 * pushed it out on its own. The path is planned on screen and converted into
 * the slot's frame, so it lands exactly on a rotated position of a zoomed
 * table.
 */
export function buildDrawTimeline(
  gsap: Gsap,
  flights: readonly FlightPlan[],
  onComplete: () => void,
): Timeline {
  const timeline = gsap.timeline({ onComplete });

  flights.forEach(
    ({ element, from, role, frame = SCREEN_FRAME, order = 0, onLanded }) => {
      const to = element.getBoundingClientRect();
      // Screen-space offsets from the landing point.
      const startX = from.left + from.width / 2 - (to.left + to.width / 2);
      const startY = from.top + from.height / 2 - (to.top + to.height / 2);
      const landedWidth = Math.max(1, element.offsetWidth * frame.scale);
      const startScale = from.width / landedWidth;
      const isJumper = role === "jumper";
      const liftY = startY - 18;
      const controlX = startX * 0.45;
      const controlY =
        Math.min(startY, 0) - to.height * (isJumper ? 0.9 : 0.55);
      // Leave the deck upright on screen, whatever the slot's rotation.
      const startRotation = (isJumper ? -220 : -6) - frame.rotation;
      // The jumper's resting tilt lives on its inner button in CSS.
      const endRotation = 0;
      const path = { t: 0 };
      const at = (order * DEAL_STAGGER_MS) / 1000 + (isJumper ? 0.42 : 0);
      const start = toLocalOffset(startX, startY, frame);
      const lifted = toLocalOffset(startX, liftY, frame);

      timeline
        .set(
          element,
          {
            x: start.x,
            y: start.y,
            scale: startScale,
            rotation: startRotation,
            opacity: 1,
            "--lift": 0,
          },
          0,
        )
        // Lift off the deck.
        .to(
          element,
          {
            x: lifted.x,
            y: lifted.y,
            scale: startScale * 1.06,
            "--lift": 1,
            duration: isJumper ? 0.12 : 0.22,
            ease: "power2.out",
          },
          at,
        )
        .to(
          path,
          {
            t: 1,
            duration: isJumper ? 0.62 : 0.78,
            ease: "power3.inOut",
            onUpdate() {
              const local = toLocalOffset(
                quadratic(startX, controlX, 0, path.t),
                quadratic(liftY, controlY, 0, path.t),
                frame,
              );
              gsap.set(element, {
                x: local.x,
                y: local.y,
                scale: startScale * 1.06 + (1.04 - startScale * 1.06) * path.t,
                rotation:
                  startRotation + (endRotation - startRotation) * path.t,
              });
            },
          },
          `>`,
        )
        // Land: a soft press into the table.
        .to(element, {
          scale: 1,
          "--lift": 0,
          duration: 0.32,
          ease: "back.out(2.2)",
        });
      if (onLanded) timeline.call(onLanded);
    },
  );

  return timeline;
}
