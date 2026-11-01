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

interface FlightPlan {
  readonly element: HTMLElement;
  readonly from: DOMRect;
  readonly role: "primary" | "jumper";
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
 * pushed it out on its own.
 */
export function buildDrawTimeline(
  gsap: Gsap,
  flights: readonly FlightPlan[],
  onComplete: () => void,
): Timeline {
  const timeline = gsap.timeline({ onComplete });

  flights.forEach(({ element, from, role }) => {
    const to = element.getBoundingClientRect();
    const startX = from.left + from.width / 2 - (to.left + to.width / 2);
    const startY = from.top + from.height / 2 - (to.top + to.height / 2);
    const startScale = from.width / Math.max(1, to.width);
    const isJumper = role === "jumper";
    const controlX = startX * 0.45;
    const controlY = Math.min(startY, 0) - to.height * (isJumper ? 0.9 : 0.55);
    const startRotation = isJumper ? -220 : -6;
    // The jumper's resting tilt lives on its inner button in CSS.
    const endRotation = 0;
    const path = { t: 0 };
    const at = isJumper ? 0.42 : 0;

    timeline
      .set(
        element,
        {
          x: startX,
          y: startY,
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
          y: startY - 18,
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
            gsap.set(element, {
              x: quadratic(startX, controlX, 0, path.t),
              y: quadratic(startY - 18, controlY, 0, path.t),
              scale: startScale * 1.06 + (1.04 - startScale * 1.06) * path.t,
              rotation: startRotation + (endRotation - startRotation) * path.t,
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
  });

  return timeline;
}
