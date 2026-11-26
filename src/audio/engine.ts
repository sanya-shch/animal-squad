import type { Cue, SoundName } from "./cues";

export interface AudioEngine {
  play: (cues: readonly Cue[]) => void;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
  // Call from inside a user gesture: browsers keep audio locked until the player acts.
  unlock: () => void;
  dispose: () => void;
}

// What the game view needs from the sound system.
export type SoundControl = Pick<AudioEngine, "play" | "isMuted" | "setMuted">;

export interface EngineOptions {
  readonly muted?: boolean;
  // Where the audio context comes from. Tests pass a fake one.
  readonly createContext?: () => AudioContext | undefined;
}

const MASTER_GAIN = 0.6;
const MAX_CUES_PER_CALL = 48;

interface ToneSpec {
  readonly type: OscillatorType;
  readonly from: number;
  readonly to?: number;
  readonly start: number;
  readonly duration: number;
  readonly gain: number;
}

type Synth = (ctx: AudioContext, out: AudioNode, start: number, level: number) => void;

function tone(ctx: AudioContext, out: AudioNode, spec: ToneSpec): void {
  const { type, from, to, start, duration, gain } = spec;
  const oscillator = ctx.createOscillator();
  const amp = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, start);
  if (to !== undefined) oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
  // A short fade in and a long fade out: no clicks, and each note rings off naturally.
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(amp);
  amp.connect(out);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function noise(ctx: AudioContext, out: AudioNode, start: number, duration: number, gain: number) {
  const length = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) samples[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, start);
  filter.frequency.exponentialRampToValueAtTime(300, start + duration);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(gain, start);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(amp);
  amp.connect(out);
  source.start(start);
}

const NOTES = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6

// Every sound is a few oscillators: no audio files to download.
const SYNTHS: Record<SoundName, Synth> = {
  open: (ctx, out, start) =>
    tone(ctx, out, { type: "triangle", from: 200, to: 340, start, duration: 0.12, gain: 0.1 }),

  // Rises with every cow, so the pen filling up can be heard as tension.
  step: (ctx, out, start, level) =>
    tone(ctx, out, {
      type: "sine",
      from: 300 * 2 ** (level * 1.2),
      start,
      duration: 0.07,
      gain: 0.12,
    }),

  pop: (ctx, out, start, level) => {
    const from = 420 * 2 ** (level * 0.8);
    tone(ctx, out, { type: "sine", from, to: from * 1.8, start, duration: 0.16, gain: 0.14 });
  },

  snap: (ctx, out, start) => {
    noise(ctx, out, start, 0.35, 0.35);
    tone(ctx, out, { type: "sawtooth", from: 120, to: 45, start, duration: 0.3, gain: 0.22 });
  },

  star: (ctx, out, start, level) => {
    const note = NOTES[Math.round(level * 2)] ?? NOTES[0] ?? 523.25;
    tone(ctx, out, { type: "triangle", from: note, start, duration: 0.28, gain: 0.16 });
    tone(ctx, out, { type: "sine", from: note * 2, start, duration: 0.2, gain: 0.05 });
  },

  win: (ctx, out, start) => {
    NOTES.forEach((note, index) => {
      const at = start + index * 0.09;
      tone(ctx, out, { type: "triangle", from: note, start: at, duration: 0.3, gain: 0.15 });
    });
  },

  lose: (ctx, out, start) => {
    [330, 262, 196].forEach((note, index) => {
      const at = start + index * 0.16;
      tone(ctx, out, { type: "sawtooth", from: note, start: at, duration: 0.24, gain: 0.08 });
    });
  },

  nope: (ctx, out, start) =>
    tone(ctx, out, { type: "square", from: 160, to: 110, start, duration: 0.12, gain: 0.05 }),
};

function defaultContext(): AudioContext | undefined {
  return typeof AudioContext === "undefined" ? undefined : new AudioContext();
}

/**
 * Plays cues with the Web Audio API. Nothing is created until the first unlock, which is
 * how browsers want it, and any failure (no audio support, a blocked device) just means
 * silence: the game never depends on sound.
 */
export function createAudioEngine(options: EngineOptions = {}): AudioEngine {
  const createContext = options.createContext ?? defaultContext;
  let muted = options.muted ?? false;
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let failed = false;

  const ensure = (): AudioContext | undefined => {
    if (context || failed) return context;
    try {
      context = createContext();
      if (context) {
        master = context.createGain();
        master.gain.value = MASTER_GAIN;
        master.connect(context.destination);
      }
    } catch {
      context = undefined;
    }
    failed = context === undefined;
    return context;
  };

  const resume = (ctx: AudioContext): void => {
    if (ctx.state === "suspended") ctx.resume().catch(() => undefined);
  };

  return {
    play: (cues) => {
      // Before the first gesture there is no context, and a muted game makes no sound.
      if (muted || !context || !master || context.state === "closed") return;
      resume(context);
      const now = context.currentTime;
      for (const { sound, delayMs, level } of cues.slice(0, MAX_CUES_PER_CALL)) {
        SYNTHS[sound](context, master, now + delayMs / 1000, level);
      }
    },
    setMuted: (value) => {
      muted = value;
    },
    isMuted: () => muted,
    unlock: () => {
      const ctx = ensure();
      if (ctx) resume(ctx);
    },
    dispose: () => {
      if (context && context.state !== "closed") context.close().catch(() => undefined);
      context = undefined;
      master = undefined;
      failed = true;
    },
  };
}
