import { describe, expect, it } from "vitest";

import { compileLevel } from "../core";
import { createGameMachine, ROUNDS_PER_RUN, type GameEvent, type GameState } from "../game";
import { cuesFor } from "./cues";

// A 2x2 pen and five plain cows: par is 4 cows, 4 points.
const level = compileLevel({
  id: "test",
  name: "Test",
  layout: ["..", ".."],
  herd: { size: 5, spawnWeights: { normal: 1 } },
  goals: [5, 10, 20],
});
const machine = createGameMachine(level);
const play = (state: GameState, ...events: GameEvent[]): GameState =>
  events.reduce(machine.transition, state);

const hold: GameEvent = { type: "hold" };
const tick: GameEvent = { type: "tick" };
const release: GameEvent = { type: "release" };
const next: GameEvent = { type: "next" };
const ticks = (count: number): GameEvent[] => Array.from({ length: count }, () => tick);

const ready = machine.initialState(1);
const sounds = (cues: readonly { sound: string }[]): string[] => cues.map((c) => c.sound);

describe("cuesFor", () => {
  it("makes no sound when nothing changed", () => {
    expect(cuesFor(ready, ready, 1000)).toEqual([]);
    expect(cuesFor(undefined, ready, 1000)).toEqual([]);
  });

  it("opens the gate with a creak", () => {
    expect(sounds(cuesFor(ready, play(ready, hold), 0))).toEqual(["open"]);
  });

  it("steps once per cow, higher as the pen fills", () => {
    const opened = play(ready, hold);
    const one = play(opened, tick);
    const two = play(one, tick);
    const [first] = cuesFor(opened, one, 0);
    const [second] = cuesFor(one, two, 0);
    expect(first).toEqual({ sound: "step", delayMs: 0, level: 1 / 5 });
    expect(second?.level).toBe(2 / 5);
  });

  it("pops every cow in time with its animation, then announces the stars", () => {
    const admitting = play(ready, hold, ...ticks(3));
    const result = play(admitting, release);
    const cues = cuesFor(admitting, result, 1000);

    const pops = cues.filter((c) => c.sound === "pop");
    expect(pops.map((c) => c.delayMs)).toEqual([150, 220, 290]);
    expect(pops[0]?.level).toBe(0);
    expect(pops[2]?.level).toBe(1);

    // 3 of a possible 4 points: two stars, heard after the herd has grown.
    const stars = cues.filter((c) => c.sound === "star");
    expect(stars.map((c) => c.delayMs)).toEqual([1250, 1410]);
    expect(sounds(cues)).not.toContain("snap");
  });

  it("breaks the fence with a snap instead of stars", () => {
    const admitting = play(ready, hold, ...ticks(4));
    const result = play(admitting, tick); // the fifth cow is too many
    const cues = cuesFor(admitting, result, 1000);
    expect(sounds(cues).filter((s) => s === "pop")).toHaveLength(5);
    const snaps = cues.filter((c) => c.sound === "snap");
    expect(snaps).toEqual([{ sound: "snap", delayMs: 450, level: 0 }]);
    expect(sounds(cues)).not.toContain("star");
  });

  it("says no when nobody came in", () => {
    const opened = play(ready, hold);
    expect(sounds(cuesFor(opened, play(opened, release), 0))).toEqual(["nope"]);
  });

  it("plays a sad tune when the last life is gone", () => {
    let state = ready;
    for (let life = 0; life < 3; life++) {
      state = play(state, hold, ...ticks(5));
      if (life < 2) state = play(state, next);
    }
    const before = play(ready, hold, ...ticks(4)); // any admitting state works as "previous"
    const cues = cuesFor(before, state, 1000);
    expect(sounds(cues)).toContain("lose");
    expect(sounds(cues)).not.toContain("win");
  });

  it("plays a fanfare after the last round, even with every life left", () => {
    let state = ready;
    for (let round = 1; round <= ROUNDS_PER_RUN; round++) {
      state = play(state, hold, ...ticks(3), release);
      if (round < ROUNDS_PER_RUN) state = play(state, next);
    }
    const before = play(ready, hold, ...ticks(3));
    const cues = cuesFor(before, state, 1000);
    expect(sounds(cues)).toContain("win");
    const win = cues.find((c) => c.sound === "win");
    const lastStar = Math.max(...cues.filter((c) => c.sound === "star").map((c) => c.delayMs));
    expect(win?.delayMs).toBeGreaterThan(lastStar);
  });

  it("is silent when leaving the result screen or repeating it", () => {
    const admitting = play(ready, hold, ...ticks(3));
    const result = play(admitting, release);
    expect(cuesFor(result, play(result, next), 0)).toEqual([]);
    expect(cuesFor(result, { ...result }, 0)).toEqual([]);
  });
});
