import type { PageSound, PageSoundKind } from "@/application/ports/pageSound";

type AudioContextConstructor = new () => AudioContext;

/** The loudest a turn gets; quiet enough never to startle. */
const TURN_GAIN = 0.16;
const RIFFLE_GAIN = 0.2;
const LONGEST_SECONDS = 2.4;

/**
 * Paper sounds synthesised with Web Audio: band-passed noise sweeping down
 * for a turn, the same noise chopped into slowing flicks for a riffle. No
 * audio files, so nothing to license or download. The context is created on
 * the first sound, which always follows a tap, as browsers require.
 */
export class WebAudioPageSound implements PageSound {
  private context: AudioContext | undefined;
  private failed = false;

  constructor(
    private readonly createContext: () =>
      AudioContext | undefined = defaultContext,
  ) {}

  play(kind: PageSoundKind, durationMs: number): void {
    if (this.failed) return;
    try {
      const context = this.audio();
      if (!context) return;
      const seconds = Math.min(durationMs / 1000, LONGEST_SECONDS);
      if (kind === "turn") rustle(context, seconds);
      else riffle(context, seconds);
    } catch {
      // A browser that refuses audio stays quiet for the rest of the visit.
      this.failed = true;
    }
  }

  private audio(): AudioContext | undefined {
    this.context ??= this.createContext();
    if (this.context?.state === "suspended") void this.context.resume();
    return this.context;
  }
}

function defaultContext(): AudioContext | undefined {
  const Context =
    (globalThis as { AudioContext?: AudioContextConstructor }).AudioContext ??
    (globalThis as { webkitAudioContext?: AudioContextConstructor })
      .webkitAudioContext;
  return Context ? new Context() : undefined;
}

/** Soft brown-ish noise, so the paper hisses rather than crackles. */
function noise(context: AudioContext, seconds: number): AudioBufferSourceNode {
  const length = Math.ceil(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let index = 0; index < length; index += 1) {
    last = last * 0.6 + (Math.random() * 2 - 1) * 0.4;
    data[index] = last * (0.55 + 0.45 * Math.random());
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  return source;
}

function rustle(context: AudioContext, seconds: number): void {
  const start = context.currentTime;
  const source = noise(context, seconds + 0.1);
  const band = context.createBiquadFilter();
  const low = context.createBiquadFilter();
  const gain = context.createGain();
  band.type = "bandpass";
  band.Q.value = 0.9;
  band.frequency.setValueAtTime(3400, start);
  band.frequency.exponentialRampToValueAtTime(900, start + seconds * 0.85);
  low.type = "highpass";
  low.frequency.value = 380;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(TURN_GAIN, start + seconds * 0.12);
  gain.gain.linearRampToValueAtTime(TURN_GAIN * 0.55, start + seconds * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
  source.connect(band).connect(low).connect(gain).connect(context.destination);
  source.start(start);
  source.stop(start + seconds + 0.1);
}

function riffle(context: AudioContext, seconds: number): void {
  const start = context.currentTime;
  const source = noise(context, seconds + 0.1);
  const band = context.createBiquadFilter();
  const gain = context.createGain();
  band.type = "bandpass";
  band.Q.value = 0.7;
  band.frequency.value = 2400;
  gain.gain.setValueAtTime(0, start);
  // Fast flicks that slow down, like a thumb running off the edge.
  let at = start + 0.02;
  let gap = 0.028;
  while (at < start + seconds) {
    gain.gain.setValueAtTime(0.02, at);
    gain.gain.linearRampToValueAtTime(RIFFLE_GAIN, at + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.02, at + gap * 0.9);
    at += gap;
    gap *= 1.07;
  }
  gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
  source.connect(band).connect(gain).connect(context.destination);
  source.start(start);
  source.stop(start + seconds + 0.1);
}
