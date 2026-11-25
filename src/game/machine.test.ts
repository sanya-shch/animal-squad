import { describe, expect, it } from "vitest";

import { compileLevel, createRng, generateHerd, type Level } from "../core";
import { createGameMachine, type GameEvent, type GameState } from "./machine";
import { ROUNDS_PER_RUN, roundSeed, STARTING_LIVES } from "./run";

// A 2x2 pen and a herd of five plain cows: par is 4 cows for 4 points.
const level: Level = compileLevel({
  id: "test",
  name: "Test",
  layout: ["..", ".."],
  herd: { size: 5, spawnWeights: { normal: 1 } },
  goals: [5, 10, 20],
});
const machine = createGameMachine(level);

const run = (state: GameState, ...events: GameEvent[]): GameState =>
  events.reduce(machine.transition, state);

const hold: GameEvent = { type: "hold" };
const tick: GameEvent = { type: "tick" };
const release: GameEvent = { type: "release" };
const next: GameEvent = { type: "next" };

const ticks = (count: number): GameEvent[] => Array.from({ length: count }, () => tick);

describe("game machine", () => {
  it("starts a run with the first herd waiting at the gate", () => {
    const state = machine.initialState(42);
    expect(state.phase).toBe("ready");
    expect(state.run).toEqual({
      seed: 42,
      round: 1,
      score: 0,
      lives: STARTING_LIVES,
      perfectStreak: 0,
    });
    expect(state.herd).toHaveLength(5);
  });

  it("is deterministic: the same seed gives the same herd, round after round", () => {
    expect(machine.initialState(42)).toEqual(machine.initialState(42));
    expect(machine.initialState(42).herd).not.toEqual(machine.initialState(43).herd);

    const second = run(machine.initialState(42), hold, ...ticks(5), next);
    expect(second.phase).toBe("ready");
    expect(second.herd).toEqual(generateHerd(level, createRng(roundSeed(second.run))));
  });

  it("lets cows in one per tick while the gate is held", () => {
    const state = run(machine.initialState(1), hold, ...ticks(3));
    expect(state.phase).toBe("admitting");
    if (state.phase === "admitting") expect(state.admitted).toBe(3);
  });

  it("closes the gate on release and scores the round", () => {
    const state = run(machine.initialState(1), hold, ...ticks(3), release);
    expect(state.phase).toBe("result");
    if (state.phase !== "result") return;
    expect(state.result.status).toBe("success");
    expect(state.gained).toBe(3);
    expect(state.run.score).toBe(3);
    expect(state.run.round).toBe(2);
    expect(state.final).toBe(false);
  });

  it("gives a perfect round the streak, and the bonus on the next one", () => {
    const first = run(machine.initialState(1), hold, ...ticks(4), release, next);
    expect(first.run.perfectStreak).toBe(1);
    const second = run(first, hold, ...ticks(4), release);
    if (second.phase !== "result") throw new Error("expected a result");
    expect(second.gained).toBe(5);
  });

  it("breaks the fence by itself once the whole herd is inside", () => {
    const state = run(machine.initialState(1), hold, ...ticks(5));
    expect(state.phase).toBe("result");
    if (state.phase !== "result") return;
    expect(state.result.status).toBe("overflow");
    expect(state.run.lives).toBe(STARTING_LIVES - 1);
  });

  it("treats a release before the first cow as a free retry of the same herd", () => {
    const start = machine.initialState(1);
    const result = run(start, hold, release);
    expect(result.phase).toBe("result");
    if (result.phase !== "result") return;
    expect(result.result.status).toBe("empty");

    const again = run(result, next);
    expect(again.phase).toBe("ready");
    expect(again.run).toEqual(start.run);
    expect(again.herd).toEqual(start.herd);
  });

  it("ends the run after the last life and only allows a restart", () => {
    let state = machine.initialState(1);
    for (let life = 0; life < STARTING_LIVES; life++) {
      state = run(state, hold, ...ticks(5));
      if (life < STARTING_LIVES - 1) state = run(state, next);
    }
    expect(state.phase).toBe("result");
    if (state.phase !== "result") return;
    expect(state.final).toBe(true);
    expect(state.run.lives).toBe(0);
    expect(machine.transition(state, next)).toBe(state);

    const fresh = machine.transition(state, { type: "restart", seed: 9 });
    expect(fresh.phase).toBe("ready");
    expect(fresh.run).toEqual({
      seed: 9,
      round: 1,
      score: 0,
      lives: STARTING_LIVES,
      perfectStreak: 0,
    });
  });

  it("ends the run after the last round, even when no life was lost", () => {
    let state = machine.initialState(1);
    for (let round = 1; round <= ROUNDS_PER_RUN; round++) {
      state = run(state, hold, ...ticks(3), release);
      if (round < ROUNDS_PER_RUN) {
        expect(state.phase === "result" && state.final).toBe(false);
        state = run(state, next);
      }
    }
    expect(state.phase).toBe("result");
    if (state.phase !== "result") return;
    expect(state.final).toBe(true);
    expect(state.run.lives).toBe(STARTING_LIVES);
    expect(state.run.score).toBe(3 * ROUNDS_PER_RUN);
    expect(machine.transition(state, next)).toBe(state);
  });

  it("does not count a retried empty round", () => {
    let state = machine.initialState(1);
    for (let attempt = 0; attempt < ROUNDS_PER_RUN + 2; attempt++) {
      state = run(state, hold, release, next);
    }
    expect(state.phase).toBe("ready");
    expect(state.run.round).toBe(1);
  });

  it("can restart from any phase", () => {
    const restart: GameEvent = { type: "restart", seed: 5 };
    for (const state of [
      machine.initialState(1),
      run(machine.initialState(1), hold, tick),
      run(machine.initialState(1), hold, release),
    ]) {
      const fresh = machine.transition(state, restart);
      expect(fresh.phase).toBe("ready");
      expect(fresh.run.seed).toBe(5);
    }
  });

  it("returns the very same state object for events that mean nothing right now", () => {
    const ready = machine.initialState(1);
    const admitting = run(ready, hold);
    const result = run(admitting, release);

    for (const event of [tick, release, next]) expect(machine.transition(ready, event)).toBe(ready);
    for (const event of [hold, next]) expect(machine.transition(admitting, event)).toBe(admitting);
    for (const event of [hold, tick, release]) {
      expect(machine.transition(result, event)).toBe(result);
    }
  });

  it("never mutates the state it is given", () => {
    const before = run(machine.initialState(1), hold, ...ticks(2));
    const snapshot = JSON.stringify(before);
    run(before, tick, release, next);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});
