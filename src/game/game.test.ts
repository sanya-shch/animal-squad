import { describe, expect, it } from "vitest";

import { compileLevel } from "../core";
import { createGame, type Game, type Scheduler } from "./game";
import type { GameState } from "./machine";
import { STARTING_LIVES } from "./run";

const level = compileLevel({
  id: "test",
  name: "Test",
  layout: ["..", ".."],
  herd: { size: 5, spawnWeights: { normal: 1 } },
  goals: [5, 10, 20],
});

/** A clock that only moves when the test says so. */
function manualScheduler() {
  const active = new Map<number, () => void>();
  let nextId = 0;
  const scheduler: Scheduler & { started: number; lastIntervalMs: number } = {
    started: 0,
    lastIntervalMs: 0,
    every: (callback, ms) => {
      scheduler.started++;
      scheduler.lastIntervalMs = ms;
      const id = nextId++;
      active.set(id, callback);
      return () => {
        active.delete(id);
      };
    },
  };
  return {
    scheduler,
    /** Advances time by one interval. */
    tick: () => {
      for (const callback of [...active.values()]) callback();
    },
    activeTimers: () => active.size,
  };
}

function setup(overrides: { createSeed?: () => number } = {}) {
  const clock = manualScheduler();
  const game: Game = createGame({
    level,
    seed: 1,
    cowIntervalMs: 100,
    scheduler: clock.scheduler,
    ...overrides,
  });
  const seen: GameState[] = [];
  game.subscribe((state) => seen.push(state));
  return { game, clock, seen };
}

describe("createGame", () => {
  it("starts the timer when the gate opens, at the configured pace", () => {
    const { game, clock } = setup();
    expect(clock.activeTimers()).toBe(0);
    game.hold();
    expect(clock.activeTimers()).toBe(1);
    expect(clock.scheduler.lastIntervalMs).toBe(100);
  });

  it("brings one cow in per tick and stops the timer when the gate closes", () => {
    const { game, clock } = setup();
    game.hold();
    clock.tick();
    clock.tick();
    const state = game.getState();
    expect(state.phase === "admitting" && state.admitted).toBe(2);

    game.release();
    expect(game.getState().phase).toBe("result");
    expect(clock.activeTimers()).toBe(0);
  });

  it("stops the timer by itself once the herd is inside", () => {
    const { game, clock } = setup();
    game.hold();
    for (let i = 0; i < 5; i++) clock.tick();
    expect(game.getState().phase).toBe("result");
    expect(clock.activeTimers()).toBe(0);
  });

  it("never runs more than one timer, however often the gate is poked", () => {
    const { game, clock } = setup();
    game.hold();
    game.hold();
    game.hold();
    expect(clock.activeTimers()).toBe(1);
    expect(clock.scheduler.started).toBe(1);
  });

  it("does not notify listeners about events that changed nothing", () => {
    const { game, seen } = setup();
    game.release(); // nothing to release
    game.next(); // no result yet
    expect(seen).toHaveLength(0);

    game.hold();
    game.hold(); // already open
    expect(seen).toHaveLength(1);
  });

  it("notifies once per real change, with the new state", () => {
    const { game, clock, seen } = setup();
    game.hold();
    clock.tick();
    game.release();
    expect(seen.map((state) => state.phase)).toEqual(["admitting", "admitting", "result"]);
    expect(seen[2]).toBe(game.getState());
  });

  it("supports unsubscribing", () => {
    const { game } = setup();
    let calls = 0;
    const unsubscribe = game.subscribe(() => calls++);
    game.hold();
    unsubscribe();
    game.release();
    expect(calls).toBe(1);
  });

  it("plays on after a round, and starts a fresh run with a new seed after the last life", () => {
    const { game, clock } = setup({ createSeed: () => 777 });
    for (let life = 0; life < STARTING_LIVES; life++) {
      game.hold();
      for (let i = 0; i < 5; i++) clock.tick();
      game.next();
    }
    const state = game.getState();
    expect(state.phase).toBe("ready");
    expect(state.run.seed).toBe(777);
    expect(state.run.lives).toBe(STARTING_LIVES);
    expect(state.run.round).toBe(1);
  });

  it("restart() abandons a round in progress and stops its timer", () => {
    const { game, clock } = setup({ createSeed: () => 5 });
    game.hold();
    clock.tick();
    game.restart();
    expect(game.getState().phase).toBe("ready");
    expect(game.getState().run.seed).toBe(5);
    expect(clock.activeTimers()).toBe(0);
  });

  it("dispose() stops the timer, drops listeners and ignores later input", () => {
    const { game, clock, seen } = setup();
    game.hold();
    game.dispose();
    expect(clock.activeTimers()).toBe(0);

    const count = seen.length;
    game.release();
    game.hold();
    clock.tick();
    expect(seen).toHaveLength(count);
    expect(clock.activeTimers()).toBe(0);
  });
});
