"use client";

import { useEffect, useRef } from "react";

const WIDTH = 220;
const HEIGHT = 330;
const BURN_DURATION_MS = 3_000;

interface BurnRevealCanvasProps {
  readonly active: boolean;
  readonly delayMs?: number;
  readonly reducedMotion?: boolean;
  readonly seed: string;
}

interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  size: number;
  flame: boolean;
}

function seedFromText(text: string): number {
  let seed = 2166136261;
  for (const character of text) {
    seed ^= character.codePointAt(0) ?? 0;
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

function hash(x: number, y: number, seed: number): number {
  let value = Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function smooth(value: number): number {
  return value * value * (3 - 2 * value);
}

function valueNoise(x: number, y: number, scale: number, seed: number): number {
  const scaledX = x / scale;
  const scaledY = y / scale;
  const x0 = Math.floor(scaledX);
  const y0 = Math.floor(scaledY);
  const tx = smooth(scaledX - x0);
  const ty = smooth(scaledY - y0);
  const a = hash(x0, y0, seed);
  const b = hash(x0 + 1, y0, seed);
  const c = hash(x0, y0 + 1, seed);
  const d = hash(x0 + 1, y0 + 1, seed);
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
}

function fractalNoise(x: number, y: number, seed: number): number {
  let value = 0;
  let amplitude = 0.58;
  let amplitudeSum = 0;
  let scale = 52;
  for (let octave = 0; octave < 5; octave += 1) {
    value += valueNoise(x, y, scale, seed + octave * 19) * amplitude;
    amplitudeSum += amplitude;
    amplitude *= 0.52;
    scale *= 0.48;
  }
  return value / amplitudeSum;
}

function interpolate(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function buildBackTexture(
  context: CanvasRenderingContext2D,
  seed: number,
): ImageData {
  const image = context.createImageData(WIDTH, HEIGHT);
  const pixels = image.data;
  for (let y = 0, index = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1, index += 1) {
      const offset = index * 4;
      const paper = fractalNoise(x * 1.1, y, seed);
      const grain = hash(x, y, seed + 37) - 0.5;
      const fiber = Math.sin(y * 0.24 + paper * 8) * 2;
      pixels[offset] = 18 + paper * 17 + grain * 8;
      pixels[offset + 1] = 14 + paper * 13 + grain * 6;
      pixels[offset + 2] = 28 + paper * 24 + grain * 9 + fiber;
      pixels[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  context.save();
  context.strokeStyle = "rgba(230, 197, 122, 0.92)";
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(7, 7, WIDTH - 14, HEIGHT - 14, 10);
  context.stroke();
  context.lineWidth = 1;
  context.strokeStyle = "rgba(230, 197, 122, 0.48)";
  context.beginPath();
  context.roundRect(13, 13, WIDTH - 26, HEIGHT - 26, 8);
  context.stroke();
  context.translate(WIDTH / 2, HEIGHT / 2);
  context.strokeStyle = "rgba(230, 197, 122, 0.78)";
  context.beginPath();
  context.arc(0, 0, 48, 0, Math.PI * 2);
  context.stroke();
  for (let ray = 0; ray < 16; ray += 1) {
    const angle = (ray * Math.PI) / 8;
    const outerRadius = 66 + (ray % 2) * 8;
    context.beginPath();
    context.moveTo(Math.cos(angle) * 54, Math.sin(angle) * 54);
    context.lineTo(
      Math.cos(angle) * outerRadius,
      Math.sin(angle) * outerRadius,
    );
    context.stroke();
  }
  context.fillStyle = "rgba(240, 211, 141, 0.94)";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "700 14px Georgia, serif";
  context.fillText("TAROT", 0, -5);
  context.font = "8px system-ui, sans-serif";
  context.fillText("ATELIER", 0, 11);
  context.restore();
  return context.getImageData(0, 0, WIDTH, HEIGHT);
}

function buildNoise(seed: number): Float32Array {
  const noise = new Float32Array(WIDTH * HEIGHT);
  for (let y = 0, index = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1, index += 1) {
      const broad = fractalNoise(x, y, seed);
      const fiber = valueNoise(x, y, 6, seed + 91);
      noise[index] = (broad - 0.5) * 25 + (fiber - 0.5) * 5;
    }
  }
  return noise;
}

function spawnParticles(
  particles: Particle[],
  radius: number,
  progress: number,
): void {
  if (progress > 0.97) return;
  const count = 2 + Math.floor(Math.random() * 3);
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const wobble = (Math.random() - 0.5) * 18;
    const x = WIDTH / 2 + Math.cos(angle) * (radius + wobble);
    const y = HEIGHT / 2 + Math.sin(angle) * (radius + wobble);
    if (x < 2 || x > WIDTH - 2 || y < 2 || y > HEIGHT - 2) continue;
    particles.push({
      x,
      y,
      velocityX: (Math.random() - 0.5) * 0.5,
      velocityY: -0.65 - Math.random() * 1.35,
      life: 1,
      size: 0.8 + Math.random() * 3.2,
      flame: Math.random() < 0.3,
    });
  }
  if (particles.length > 180) particles.splice(0, particles.length - 180);
}

function drawParticles(
  context: CanvasRenderingContext2D,
  particles: Particle[],
): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    if (!particle) continue;
    particle.x += particle.velocityX;
    particle.y += particle.velocityY;
    particle.velocityY -= 0.012;
    particle.life -= particle.flame ? 0.028 : 0.019;
    if (particle.life <= 0) {
      particles.splice(index, 1);
      continue;
    }
    if (particle.flame) {
      const glow = context.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.size * 3.4,
      );
      glow.addColorStop(0, `rgba(255, 250, 205, ${particle.life})`);
      glow.addColorStop(0.3, `rgba(255, 132, 28, ${particle.life * 0.9})`);
      glow.addColorStop(1, "rgba(255, 40, 0, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.ellipse(
        particle.x,
        particle.y,
        particle.size * 1.4,
        particle.size * 3.6,
        0,
        0,
        Math.PI * 2,
      );
      context.fill();
    } else {
      context.fillStyle = `rgba(255, 174, 54, ${particle.life})`;
      context.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
  }
  context.restore();
}

export function BurnRevealCanvas({
  active,
  delayMs = 650,
  reducedMotion = false,
  seed: seedText,
}: BurnRevealCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;
    const seed = seedFromText(seedText);
    const back = buildBackTexture(context, seed).data;
    const noise = buildNoise(seed + 73);
    const frame = context.createImageData(WIDTH, HEIGHT);
    const particles: Particle[] = [];
    let animationFrame = 0;
    let disposed = false;
    canvas.style.opacity = "1";
    context.putImageData(
      new ImageData(new Uint8ClampedArray(back), WIDTH, HEIGHT),
      0,
      0,
    );

    if (!active || reducedMotion) {
      canvas.style.opacity = reducedMotion ? "0" : "1";
      return;
    }

    const delayTimer = setTimeout(() => {
      const startedAt = performance.now();
      const maximumRadius = Math.hypot(WIDTH / 2, HEIGHT / 2) + 36;
      const render = (now: number) => {
        if (disposed) return;
        const progress = Math.min(1, (now - startedAt) / BURN_DURATION_MS);
        const easedProgress = 1 - Math.pow(1 - progress, 2.12);
        const radius = easedProgress * maximumRadius;
        const output = frame.data;

        for (let y = 0, index = 0; y < HEIGHT; y += 1) {
          for (let x = 0; x < WIDTH; x += 1, index += 1) {
            const offset = index * 4;
            const distance = Math.hypot(x - WIDTH / 2, y - HEIGHT / 2);
            const signedDistance = radius - distance - (noise[index] ?? 0);
            let red = back[offset] ?? 0;
            let green = back[offset + 1] ?? 0;
            let blue = back[offset + 2] ?? 0;
            let alpha = 255;

            if (signedDistance >= -8 && signedDistance < 0) {
              const layerProgress = (signedDistance + 8) / 8;
              red = interpolate(red, 205, layerProgress);
              green = interpolate(green, 128, layerProgress);
              blue = interpolate(blue, 45, layerProgress);
            } else if (signedDistance >= 0 && signedDistance < 5) {
              const layerProgress = signedDistance / 5;
              red = 255;
              green = interpolate(250, 100, layerProgress);
              blue = interpolate(206, 12, layerProgress);
            } else if (signedDistance >= 5 && signedDistance < 14) {
              const layerProgress = (signedDistance - 5) / 9;
              red = interpolate(238, 30, layerProgress);
              green = interpolate(86, 18, layerProgress);
              blue = interpolate(10, 12, layerProgress);
            } else if (signedDistance >= 14 && signedDistance < 24) {
              const layerProgress = (signedDistance - 14) / 10;
              const ash = 50 + hash(x, y, seed + 101) * 80;
              red = interpolate(24, ash, layerProgress);
              green = interpolate(18, ash * 0.94, layerProgress);
              blue = interpolate(14, ash * 0.9, layerProgress);
              alpha = interpolate(255, 170, layerProgress);
            } else if (signedDistance >= 24 && signedDistance < 33) {
              alpha = interpolate(170, 0, (signedDistance - 24) / 9);
            } else if (signedDistance >= 33) {
              alpha = 0;
            }

            output[offset] = red;
            output[offset + 1] = green;
            output[offset + 2] = blue;
            output[offset + 3] = alpha;
          }
        }

        context.clearRect(0, 0, WIDTH, HEIGHT);
        context.putImageData(frame, 0, 0);
        spawnParticles(particles, radius, progress);
        drawParticles(context, particles);

        if (progress < 1) {
          animationFrame = requestAnimationFrame(render);
        } else {
          context.clearRect(0, 0, WIDTH, HEIGHT);
          canvas.style.opacity = "0";
          canvas.dataset.burnComplete = "true";
        }
      };
      animationFrame = requestAnimationFrame(render);
    }, delayMs);

    return () => {
      disposed = true;
      clearTimeout(delayTimer);
      cancelAnimationFrame(animationFrame);
    };
  }, [active, delayMs, reducedMotion, seedText]);

  return (
    <canvas
      ref={canvasRef}
      className="burn-reveal-canvas"
      width={WIDTH}
      height={HEIGHT}
      data-burn-reveal
      aria-hidden="true"
    />
  );
}
