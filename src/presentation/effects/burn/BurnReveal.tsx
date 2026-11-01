"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import {
  DEFAULT_BANDS_CSS_PX,
  buildBurnField,
  burnRadius,
  renderBurnFrame,
  seedFromText,
  type BurnBands,
  type IgnitionPoint,
} from "./burnField";

export type BurnQuality = "full" | "lite";

interface BurnRevealProps {
  /** Returns the card-back SVG to rasterise; it must use literal colours. */
  readonly getSource: () => SVGSVGElement | null;
  readonly ignition: IgnitionPoint;
  readonly seed: string;
  readonly quality: BurnQuality;
  /** The burning layer is painted and the DOM back may be hidden. */
  readonly onReady: () => void;
  /** The flame has consumed the whole card. */
  readonly onComplete: () => void;
}

/** Space around the card for embers that drift beyond its edge, in CSS px. */
const PAD = { top: 72, side: 28, bottom: 20 } as const;
const DURATION_MS: Readonly<Record<BurnQuality, number>> = {
  full: 2600,
  lite: 2100,
};
const EMBERS_PER_FRAME: Readonly<Record<BurnQuality, number>> = {
  full: 7,
  lite: 3,
};
const MAX_PARTICLES = 260;
const MAX_RIM_SAMPLES = 4096;
const BLOOM_DOWNSAMPLE = 8;
const BLOOM_BLEED_CSS_PX = 10;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  kind: "spark" | "lick" | "ash";
}

function loadSvgImage(svg: SVGSVGElement, width: number, height: number) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute("preserveAspectRatio", "none");
  const markup = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(
    new Blob([markup], { type: "image/svg+xml" }),
  );
  const image = new Image();
  image.src = url;
  return image
    .decode()
    .then(() => image)
    .finally(() => URL.revokeObjectURL(url));
}

function spawnParticles(
  particles: Particle[],
  rim: Int32Array,
  rimCount: number,
  cardWidth: number,
  pixelRatio: number,
  count: number,
): void {
  if (rimCount === 0) return;
  for (
    let index = 0;
    index < count && particles.length < MAX_PARTICLES;
    index += 1
  ) {
    const pixel = rim[Math.floor(Math.random() * rimCount)] ?? 0;
    const roll = Math.random();
    const kind: Particle["kind"] =
      roll < 0.16 ? "lick" : roll < 0.26 ? "ash" : "spark";
    particles.push({
      x: (pixel % cardWidth) + PAD.side * pixelRatio,
      y: Math.floor(pixel / cardWidth) + PAD.top * pixelRatio,
      vx: (Math.random() - 0.5) * 0.9 * pixelRatio,
      vy: -(0.5 + Math.random() * (kind === "spark" ? 2.2 : 0.9)) * pixelRatio,
      life: 1,
      decay:
        kind === "lick"
          ? 0.06 + Math.random() * 0.04
          : 0.012 + Math.random() * 0.02,
      size:
        (kind === "lick"
          ? 2.4 + Math.random() * 3
          : 0.5 + Math.random() * 1.6) * pixelRatio,
      kind,
    });
  }
}

function drawParticles(
  context: CanvasRenderingContext2D,
  particles: Particle[],
  now: number,
) {
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index]!;
    particle.x += particle.vx + Math.sin(now / 180 + index) * 0.25;
    particle.y += particle.vy;
    particle.vy *= particle.kind === "ash" ? 0.995 : 1.004;
    particle.life -= particle.decay;
    if (particle.life <= 0) {
      particles.splice(index, 1);
      continue;
    }
    if (particle.kind === "ash") {
      context.globalCompositeOperation = "source-over";
      context.fillStyle = `rgba(30, 24, 22, ${particle.life * 0.7})`;
      context.fillRect(
        particle.x,
        particle.y,
        particle.size * 1.6,
        particle.size,
      );
      continue;
    }
    context.globalCompositeOperation = "lighter";
    if (particle.kind === "lick") {
      const gradient = context.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.size * 2.6,
      );
      gradient.addColorStop(0, `rgba(255, 236, 170, ${particle.life * 0.9})`);
      gradient.addColorStop(0.4, `rgba(255, 128, 30, ${particle.life * 0.55})`);
      gradient.addColorStop(1, "rgba(200, 40, 0, 0)");
      context.fillStyle = gradient;
      context.beginPath();
      context.ellipse(
        particle.x,
        particle.y,
        particle.size,
        particle.size * 2.6,
        0,
        0,
        Math.PI * 2,
      );
      context.fill();
    } else {
      const hot = particle.life > 0.6;
      context.fillStyle = hot
        ? `rgba(255, 226, 150, ${particle.life})`
        : `rgba(255, 120, 40, ${particle.life})`;
      context.beginPath();
      context.arc(
        particle.x,
        particle.y,
        particle.size * (0.6 + particle.life * 0.4),
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }
  context.globalCompositeOperation = "source-over";
}

function scaleBands(bands: BurnBands, pixelRatio: number): BurnBands {
  return {
    scorch: bands.scorch * pixelRatio,
    ember: bands.ember * pixelRatio,
    char: bands.char * pixelRatio,
  };
}

export function BurnReveal({
  getSource,
  ignition,
  seed,
  quality,
  onReady,
  onComplete,
}: BurnRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLCanvasElement>(null);
  // Callbacks are read through refs so a parent re-render never restarts a burn.
  const callbacks = useRef({ getSource, onReady, onComplete });
  useLayoutEffect(() => {
    callbacks.current = { getSource, onReady, onComplete };
  });
  const ignitionX = ignition.x;
  const ignitionY = ignition.y;

  useEffect(() => {
    const container = containerRef.current;
    const scene = sceneRef.current;
    const card = container?.parentElement;
    const svg = callbacks.current.getSource();
    const sceneContext = scene?.getContext("2d");
    if (!card || !scene || !sceneContext || !svg) {
      callbacks.current.onReady();
      callbacks.current.onComplete();
      return;
    }

    let disposed = false;
    let frame = 0;
    const pixelRatio =
      quality === "full" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const cssWidth = card.offsetWidth;
    const cssHeight = card.offsetHeight;
    const width = Math.max(1, Math.round(cssWidth * pixelRatio));
    const height = Math.max(1, Math.round(cssHeight * pixelRatio));
    scene.width = Math.round((cssWidth + PAD.side * 2) * pixelRatio);
    scene.height = Math.round((cssHeight + PAD.top + PAD.bottom) * pixelRatio);

    const cardLayer = document.createElement("canvas");
    cardLayer.width = width;
    cardLayer.height = height;
    const cardContext = cardLayer.getContext("2d", {
      willReadFrequently: true,
    });
    // Bloom: the incandescent rim is downsampled and stretched back up, which
    // blurs it for free instead of running a CSS filter on every frame.
    const glowLayer = document.createElement("canvas");
    glowLayer.width = width;
    glowLayer.height = height;
    const glowContext = glowLayer.getContext("2d");
    const bloomLayer = document.createElement("canvas");
    bloomLayer.width = Math.max(1, Math.round(width / BLOOM_DOWNSAMPLE));
    bloomLayer.height = Math.max(1, Math.round(height / BLOOM_DOWNSAMPLE));
    const bloomContext = bloomLayer.getContext("2d");

    void loadSvgImage(svg, width, height)
      .then((image) => {
        if (disposed || !cardContext || !glowContext || !bloomContext) return;
        cardContext.drawImage(image, 0, 0, width, height);
        const source = cardContext.getImageData(0, 0, width, height).data;
        const frameImage = cardContext.createImageData(width, height);
        const glowImage = glowContext.createImageData(width, height);
        const field = buildBurnField(
          width,
          height,
          { x: ignitionX, y: ignitionY },
          seedFromText(seed),
        );
        const bands = scaleBands(DEFAULT_BANDS_CSS_PX, pixelRatio);
        const rim = new Int32Array(MAX_RIM_SAMPLES);
        const particles: Particle[] = [];
        const duration = DURATION_MS[quality];
        const offsetX = PAD.side * pixelRatio;
        const offsetY = PAD.top * pixelRatio;
        let startedAt = 0;
        let completed = false;

        // Paint the intact card first so hiding the DOM back is seamless.
        sceneContext.drawImage(cardLayer, offsetX, offsetY);
        callbacks.current.onReady();

        const render = (now: number) => {
          if (disposed) return;
          if (startedAt === 0) startedAt = now;
          const progress = Math.min(1, (now - startedAt) / duration);
          const radius = burnRadius(progress, field, bands);
          const flicker = 0.5 + 0.5 * Math.sin(now / 47) * Math.sin(now / 113);
          const rimCount = completed
            ? 0
            : renderBurnFrame(
                field,
                source,
                frameImage.data,
                glowImage.data,
                rim,
                radius,
                bands,
                flicker,
              );

          sceneContext.clearRect(0, 0, scene.width, scene.height);
          if (!completed) {
            cardContext.putImageData(frameImage, 0, 0);
            sceneContext.drawImage(cardLayer, offsetX, offsetY);
            glowContext.putImageData(glowImage, 0, 0);
            bloomContext.clearRect(0, 0, bloomLayer.width, bloomLayer.height);
            bloomContext.drawImage(
              glowLayer,
              0,
              0,
              bloomLayer.width,
              bloomLayer.height,
            );
            const bleed = BLOOM_BLEED_CSS_PX * pixelRatio;
            sceneContext.globalCompositeOperation = "lighter";
            sceneContext.imageSmoothingQuality = "high";
            sceneContext.drawImage(
              bloomLayer,
              offsetX - bleed,
              offsetY - bleed,
              width + bleed * 2,
              height + bleed * 2,
            );
            sceneContext.globalCompositeOperation = "source-over";
            spawnParticles(
              particles,
              rim,
              rimCount,
              width,
              pixelRatio,
              EMBERS_PER_FRAME[quality],
            );
          }
          drawParticles(sceneContext, particles, now);

          if (progress >= 1 && !completed) {
            completed = true;
            callbacks.current.onComplete();
          }
          if (completed && particles.length === 0) {
            container.dataset.burnState = "settled";
            return;
          }
          frame = requestAnimationFrame(render);
        };
        container.dataset.burnState = "burning";
        frame = requestAnimationFrame(render);
      })
      .catch(() => {
        if (disposed) return;
        callbacks.current.onReady();
        callbacks.current.onComplete();
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
    };
  }, [ignitionX, ignitionY, quality, seed]);

  return (
    <div
      ref={containerRef}
      className="burn-reveal"
      data-burn-reveal
      aria-hidden="true"
      style={
        {
          "--burn-pad-top": `${PAD.top}px`,
          "--burn-pad-side": `${PAD.side}px`,
          "--burn-pad-bottom": `${PAD.bottom}px`,
        } as React.CSSProperties
      }
    >
      <canvas ref={sceneRef} className="burn-reveal__scene" />
    </div>
  );
}
