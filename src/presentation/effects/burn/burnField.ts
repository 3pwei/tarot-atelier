/**
 * Pure pixel maths for the burn reveal. No DOM access, so it can be unit
 * tested and reused by any renderer that hands it RGBA buffers.
 *
 * A burn is described by a distance field: each pixel stores how far the
 * flame front must travel from the ignition point before reaching it. The
 * field is warped by fractal noise so the edge is ragged, and stretched so
 * fire climbs upward faster than it creeps down, like burning paper.
 */

export interface IgnitionPoint {
  /** 0–1 across the card. */
  readonly x: number;
  /** 0–1 down the card. */
  readonly y: number;
}

export interface BurnField {
  readonly width: number;
  readonly height: number;
  readonly distances: Float32Array;
  readonly maxDistance: number;
}

/** Widths of each visual band, in device pixels. */
export interface BurnBands {
  readonly scorch: number;
  readonly ember: number;
  readonly char: number;
}

export const DEFAULT_BANDS_CSS_PX: BurnBands = {
  scorch: 16,
  ember: 3.2,
  char: 6,
};

const UPWARD_STRETCH = 0.7;
const DOWNWARD_STRETCH = 1.2;

function hash2(x: number, y: number, seed: number): number {
  let value = Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep(x - x0);
  const ty = smoothstep(y - y0);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  const top = a + (b - a) * tx;
  return top + (c + (d - c) * tx - top) * ty;
}

/** Fractal noise in roughly [-0.5, 0.5]. */
export function fractalNoise(x: number, y: number, seed: number): number {
  let total = 0;
  let amplitude = 0.55;
  let frequency = 1;
  let norm = 0;
  for (let octave = 0; octave < 5; octave += 1) {
    total +=
      valueNoise(x * frequency, y * frequency, seed + octave * 101) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return total / norm - 0.5;
}

export function seedFromText(text: string): number {
  let seed = 2166136261;
  for (const character of text) {
    seed ^= character.codePointAt(0) ?? 0;
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

export function buildBurnField(
  width: number,
  height: number,
  ignition: IgnitionPoint,
  seed: number,
): BurnField {
  const distances = new Float32Array(width * height);
  const originX = ignition.x * width;
  const originY = ignition.y * height;
  const diagonal = Math.hypot(width, height);
  const coarseAmplitude = diagonal * 0.2;
  const fineAmplitude = diagonal * 0.035;
  // Noise frequencies are relative to the card so the burn looks the same at
  // any pixel ratio.
  const coarseScale = 3.2 / width;
  const fineScale = 22 / width;
  let maxDistance = 0;

  for (let y = 0, index = 0; y < height; y += 1) {
    const dy = y - originY;
    const stretchedY = dy * (dy < 0 ? UPWARD_STRETCH : DOWNWARD_STRETCH);
    for (let x = 0; x < width; x += 1, index += 1) {
      const radial = Math.hypot(x - originX, stretchedY);
      const coarse = fractalNoise(x * coarseScale, y * coarseScale, seed);
      const fine = fractalNoise(x * fineScale, y * fineScale, seed + 17);
      // Noise matters less right at the ignition point so the flame always
      // starts where the person touched.
      const warp = Math.min(1, radial / (diagonal * 0.12));
      const distance = Math.max(
        0,
        radial + (coarse * coarseAmplitude + fine * fineAmplitude) * warp,
      );
      distances[index] = distance;
      if (distance > maxDistance) maxDistance = distance;
    }
  }

  return { width, height, distances, maxDistance };
}

/**
 * Radius of the flame front for a 0–1 progress value. The front starts slowly
 * (catching), accelerates, then eases as the last corners curl away. It ends
 * beyond the farthest pixel so every band has fully passed.
 */
export function burnRadius(
  progress: number,
  field: BurnField,
  bands: BurnBands,
): number {
  const clamped = Math.min(1, Math.max(0, progress));
  const eased =
    clamped < 0.5
      ? 2 * clamped * clamped * (0.6 + 0.4 * clamped * 2)
      : 1 - Math.pow(-2 * clamped + 2, 2.2) / 2;
  const travel = field.maxDistance + bands.ember + bands.char + 2;
  return -bands.scorch * 0.3 + eased * (travel + bands.scorch * 0.3);
}

function mix(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

/**
 * Shades one frame. `source` is the intact card, `output` receives the burnt
 * card, `glow` receives only the incandescent rim (for a blurred bloom
 * layer), and `rim` collects indices of rim pixels for ember particles.
 * Returns how many rim indices were written.
 */
export function renderBurnFrame(
  field: BurnField,
  source: Uint8ClampedArray,
  output: Uint8ClampedArray,
  glow: Uint8ClampedArray,
  rim: Int32Array,
  radius: number,
  bands: BurnBands,
  flicker: number,
): number {
  const { distances } = field;
  const emberEnd = bands.ember;
  const charEnd = bands.ember + bands.char;
  let rimCount = 0;

  for (let index = 0; index < distances.length; index += 1) {
    const offset = index * 4;
    const front = radius - (distances[index] ?? 0);
    const alphaSource = source[offset + 3] ?? 0;

    if (front < -bands.scorch) {
      output[offset] = source[offset] ?? 0;
      output[offset + 1] = source[offset + 1] ?? 0;
      output[offset + 2] = source[offset + 2] ?? 0;
      output[offset + 3] = alphaSource;
      glow[offset + 3] = 0;
      continue;
    }

    if (front < 0) {
      // Scorch: paper browns and darkens ahead of the flame.
      const heat = 1 + front / bands.scorch;
      const amount = Math.pow(heat, 1.6) * 0.88;
      output[offset] = mix(source[offset] ?? 0, 74, amount);
      output[offset + 1] = mix(source[offset + 1] ?? 0, 34, amount);
      output[offset + 2] = mix(source[offset + 2] ?? 0, 12, amount);
      output[offset + 3] = alphaSource;
      const warm = heat > 0.75 ? (heat - 0.75) * 4 : 0;
      glow[offset] = 255;
      glow[offset + 1] = 110;
      glow[offset + 2] = 20;
      glow[offset + 3] = warm * 90 * (alphaSource / 255);
      continue;
    }

    if (front < emberEnd) {
      // Incandescent rim: white-gold at the leading edge, cooling to red.
      const cool = front / emberEnd;
      const intensity = 0.82 + 0.18 * flicker;
      output[offset] = 255;
      output[offset + 1] = mix(236, 92, cool) * intensity;
      output[offset + 2] = mix(170, 14, cool) * intensity;
      output[offset + 3] = alphaSource;
      glow[offset] = 255;
      glow[offset + 1] = mix(190, 70, cool);
      glow[offset + 2] = mix(80, 10, cool);
      glow[offset + 3] = alphaSource * (1 - cool * 0.4);
      if (alphaSource > 0 && rimCount < rim.length) {
        rim[rimCount] = index;
        rimCount += 1;
      }
      continue;
    }

    if (front < charEnd) {
      // Char: a thin black curl that crumbles away.
      const crumble = (front - emberEnd) / bands.char;
      output[offset] = mix(36, 10, crumble);
      output[offset + 1] = mix(20, 8, crumble);
      output[offset + 2] = mix(14, 8, crumble);
      output[offset + 3] = alphaSource * Math.pow(1 - crumble, 1.4);
      glow[offset] = 255;
      glow[offset + 1] = 80;
      glow[offset + 2] = 16;
      glow[offset + 3] = crumble < 0.25 ? (0.25 - crumble) * 4 * 120 : 0;
      continue;
    }

    output[offset + 3] = 0;
    glow[offset + 3] = 0;
  }

  return rimCount;
}
