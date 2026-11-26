import { describe, expect, it } from "vitest";

import { compileLevel } from "../core";
import { createGameMachine, ROUNDS_PER_RUN, type GameEvent, type GameState } from "../game";
import { summarize, type FinalExtras, type ResultState } from "./panel";

// A 2x2 pen with five plain cows: par is 4 cows for 4 points.
const plain = createGameMachine(
  compileLevel({
    id: "plain",
    name: "Plain",
    layout: ["..", ".."],
    herd: { size: 5, spawnWeights: { normal: 1 } },
    goals: [5, 10, 20],
  }),
);

// A pen with a single square, and a herd of fat cows that can never fit in it.
const cramped = createGameMachine(
  compileLevel({
    id: "cramped",
    name: "Cramped",
    layout: ["."],
    herd: { size: 2, spawnWeights: { fat: 1 } },
    goals: [5, 10, 20],
  }),
);

const hold: GameEvent = { type: "hold" };
const tick: GameEvent = { type: "tick" };
const release: GameEvent = { type: "release" };
const next: GameEvent = { type: "next" };

function result(machine: typeof plain, ...events: GameEvent[]): ResultState {
  const state: GameState = events.reduce(machine.transition, machine.initialState(1));
  if (state.phase !== "result") throw new Error(`Expected a result, got ${state.phase}`);
  return state;
}

describe("summarize: a round", () => {
  it("says a single point and a single cow in the singular", () => {
    const one = summarize(result(plain, hold, tick, release), undefined);
    expect(one.title).toBe("Safe!");
    expect(one.lines[0]).toBe("+1 point");
    expect(one.lines[1]).toBe("Best possible: 4 points with 4 cows.");

    const lost = summarize(result(cramped, hold, tick, release), undefined);
    expect(lost.title).toBe("The fence broke!");
    expect(lost.lines[0]).toBe("You let in 1 cow and lost a life.");
    expect(lost.lines[1]).toBe("Best possible: 0 points with 0 cows.");
  });

  it("says several points and cows in the plural", () => {
    const three = summarize(result(plain, hold, tick, tick, tick, release), undefined);
    expect(three.lines[0]).toBe("+3 points");
    const broken = summarize(result(plain, hold, tick, tick, tick, tick, tick), undefined);
    expect(broken.lines[0]).toBe("You let in 5 cows and lost a life.");
  });

  it("celebrates a perfect round and shows the stars of the round", () => {
    const perfect = summarize(result(plain, hold, tick, tick, tick, tick, release), undefined);
    expect(perfect.title).toBe("Perfect!");
    expect(perfect.stars).toBe(3);
    expect(perfect.lines[1]).toBe("You could not have fit more.");
  });

  it("mentions the streak bonus only when there is one", () => {
    const first = result(plain, hold, tick, tick, tick, tick, release);
    expect(summarize(first, undefined).lines[0]).toBe("+4 points");
    const perfectRound = [hold, tick, tick, tick, tick, release];
    const second = result(plain, ...perfectRound, next, ...perfectRound);
    expect(summarize(second, undefined).lines[0]).toBe("+5 points (streak bonus +1)");
  });

  it("offers a retry, not a lost life, when nobody came in", () => {
    const empty = summarize(result(plain, hold, release), undefined);
    expect(empty.title).toBe("Nobody came in");
    expect(empty.button).toBe("Try again");
  });
});

describe("summarize: the end of a run", () => {
  const extras = (overrides: Partial<FinalExtras> = {}): FinalExtras => ({
    isNewBest: false,
    best: 40,
    stars: 1,
    nextGoal: 50,
    unlocked: [],
    ...overrides,
  });

  const lostRun = (): ResultState => {
    const events: GameEvent[] = [];
    for (let life = 0; life < 3; life++) {
      events.push(hold, tick, tick, tick, tick, tick);
      if (life < 2) events.push(next);
    }
    return result(plain, ...events);
  };

  it("calls the run over when the lives are gone", () => {
    const summary = summarize(lostRun(), extras());
    expect(summary.title).toBe("Game over");
    expect(summary.lines).toEqual(["Final score: 0", "Best: 40", "Next star at 50 points"]);
    expect(summary.button).toBe("Play again");
  });

  it("calls the run complete after the last round", () => {
    const events: GameEvent[] = [];
    for (let round = 1; round <= ROUNDS_PER_RUN; round++) {
      events.push(hold, tick, tick, tick, release);
      if (round < ROUNDS_PER_RUN) events.push(next);
    }
    expect(summarize(result(plain, ...events), extras()).title).toBe("Run complete");
  });

  it("announces a new best, an unlocked pen and a full set of stars", () => {
    const summary = summarize(
      lostRun(),
      extras({ isNewBest: true, stars: 3, nextGoal: undefined, unlocked: ["Paddock", "Lane"] }),
    );
    expect(summary.lines).toEqual([
      "Final score: 0",
      "New best!",
      "All three stars earned",
      "Paddock unlocked",
      "Lane unlocked",
    ]);
    expect(summary.stars).toBe(3);
  });

  it("says a single point of the next star in the singular", () => {
    const summary = summarize(lostRun(), extras({ nextGoal: 1 }));
    expect(summary.lines).toContain("Next star at 1 point");
  });

  it("shows no stars where there are none, as on the daily challenge", () => {
    const summary = summarize(lostRun(), extras({ stars: undefined, nextGoal: undefined }));
    expect(summary.stars).toBeUndefined();
    expect(summary.lines).toEqual(["Final score: 0", "Best: 40"]);
  });
});
