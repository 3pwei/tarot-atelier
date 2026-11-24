import { describe, expect, it, vi } from "vitest";
import { WebAudioPageSound } from "@/infrastructure/sound/webAudioPageSound";

describe("WebAudioPageSound", () => {
  it("stays quiet where the browser has no audio", () => {
    const sound = new WebAudioPageSound(() => undefined);
    expect(() => sound.play("turn", 500)).not.toThrow();
  });

  it("gives up for the visit once the browser refuses audio", () => {
    const create = vi.fn(() => {
      throw new Error("not allowed");
    });
    const sound = new WebAudioPageSound(create);
    sound.play("turn", 500);
    sound.play("riffle", 900);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("opens one audio context and reuses it", () => {
    const context = fakeContext();
    const create = vi.fn(() => context as unknown as AudioContext);
    const sound = new WebAudioPageSound(create);
    sound.play("turn", 500);
    sound.play("riffle", 900);
    expect(create).toHaveBeenCalledTimes(1);
    expect(context.createBufferSource).toHaveBeenCalledTimes(2);
  });
});

/** Just enough of an AudioContext to wire the graph. */
function fakeContext() {
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  });
  const node = () => {
    const self = {
      connect: vi.fn(() => self),
      type: "",
      Q: param(),
      frequency: param(),
      gain: param(),
    };
    return self;
  };
  return {
    state: "running",
    currentTime: 0,
    sampleRate: 8000,
    destination: {},
    createBuffer: vi.fn((_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    })),
    createBufferSource: vi.fn(() => ({
      ...node(),
      buffer: null,
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createBiquadFilter: vi.fn(node),
    createGain: vi.fn(node),
  };
}
