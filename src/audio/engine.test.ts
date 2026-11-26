import { describe, expect, it } from "vitest";

import type { Cue } from "./cues";
import { createAudioEngine } from "./engine";

// Just enough of the Web Audio API to see what the engine asks for.
function fakeContext(initial: "running" | "suspended" = "running") {
  const log = { oscillatorStarts: [] as number[], noiseStarts: 0, resumed: 0, closed: 0 };
  const param = () => ({
    value: 0,
    setValueAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined,
  });
  const node = () => ({ connect: () => undefined });
  const context = {
    state: initial,
    currentTime: 10,
    sampleRate: 8000,
    destination: {},
    createGain: () => ({ ...node(), gain: param() }),
    createOscillator: () => ({
      ...node(),
      type: "sine",
      frequency: param(),
      start: (time: number) => log.oscillatorStarts.push(time),
      stop: () => undefined,
    }),
    createBiquadFilter: () => ({ ...node(), type: "lowpass", frequency: param() }),
    createBuffer: (_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    }),
    createBufferSource: () => ({
      ...node(),
      buffer: null,
      start: () => {
        log.noiseStarts++;
      },
    }),
    resume: () => {
      log.resumed++;
      context.state = "running";
      return Promise.resolve();
    },
    close: () => {
      log.closed++;
      context.state = "closed" as never;
      return Promise.resolve();
    },
  };
  return { context: context as unknown as AudioContext, log };
}

const cue = (sound: Cue["sound"], delayMs = 0, level = 0): Cue => ({ sound, delayMs, level });

function setup(options: { muted?: boolean; state?: "running" | "suspended" } = {}) {
  const fake = fakeContext(options.state);
  let created = 0;
  const engine = createAudioEngine({
    ...(options.muted === undefined ? {} : { muted: options.muted }),
    createContext: () => {
      created++;
      return fake.context;
    },
  });
  return { engine, log: fake.log, created: () => created };
}

describe("createAudioEngine", () => {
  it("creates nothing until the player has acted", () => {
    const { engine, log, created } = setup();
    engine.play([cue("step")]);
    expect(created()).toBe(0);
    expect(log.oscillatorStarts).toHaveLength(0);
  });

  it("creates exactly one context, however often it is unlocked", () => {
    const { engine, created } = setup();
    engine.unlock();
    engine.unlock();
    engine.unlock();
    expect(created()).toBe(1);
  });

  it("schedules every cue relative to the audio clock", () => {
    const { engine, log } = setup();
    engine.unlock();
    engine.play([cue("step", 0), cue("pop", 500), cue("step", 1250)]);
    expect(log.oscillatorStarts).toEqual([10, 10.5, 11.25]);
  });

  it("builds richer sounds from several parts", () => {
    const { engine, log } = setup();
    engine.unlock();
    engine.play([cue("snap")]);
    expect(log.noiseStarts).toBe(1);
    expect(log.oscillatorStarts).toHaveLength(1);

    const second = setup();
    second.engine.unlock();
    second.engine.play([cue("star"), cue("win"), cue("lose")]);
    expect(second.log.oscillatorStarts).toHaveLength(2 + 4 + 3);
  });

  it("stays silent while muted and speaks again when unmuted", () => {
    const { engine, log } = setup({ muted: true });
    engine.unlock();
    engine.play([cue("step")]);
    expect(log.oscillatorStarts).toHaveLength(0);
    expect(engine.isMuted()).toBe(true);

    engine.setMuted(false);
    engine.play([cue("step")]);
    expect(log.oscillatorStarts).toHaveLength(1);
  });

  it("wakes a context that the browser left suspended", () => {
    const { engine, log } = setup({ state: "suspended" });
    engine.unlock();
    expect(log.resumed).toBe(1);
    engine.play([cue("step")]);
    expect(log.oscillatorStarts).toHaveLength(1);
  });

  it("limits how much a single change can ask for", () => {
    const { engine, log } = setup();
    engine.unlock();
    engine.play(Array.from({ length: 200 }, () => cue("step")));
    expect(log.oscillatorStarts.length).toBeLessThanOrEqual(48);
  });

  it("survives a browser with no audio, asking only once", () => {
    let asked = 0;
    const engine = createAudioEngine({
      createContext: () => {
        asked++;
        return undefined;
      },
    });
    expect(() => {
      engine.unlock();
      engine.unlock();
      engine.play([cue("step")]);
    }).not.toThrow();
    expect(asked).toBe(1);
  });

  it("survives a context that cannot be created", () => {
    const engine = createAudioEngine({
      createContext: () => {
        throw new Error("no audio device");
      },
    });
    expect(() => {
      engine.unlock();
      engine.play([cue("step")]);
    }).not.toThrow();
  });

  it("closes its context on dispose and plays nothing afterwards", () => {
    const { engine, log } = setup();
    engine.unlock();
    engine.dispose();
    engine.play([cue("step")]);
    engine.unlock();
    expect(log.closed).toBe(1);
    expect(log.oscillatorStarts).toHaveLength(0);
  });
});
