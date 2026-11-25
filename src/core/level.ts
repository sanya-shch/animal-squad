import { COW_KINDS, type CowKindId } from "./cows";
import { LayoutError, parseLayout, type Pen } from "./pen";

export const MAX_HERD_SIZE = 40;

export type SpawnWeights = Readonly<Partial<Record<CowKindId, number>>>;

/** Score needed for one, two and three stars on a level. */
export type StarGoals = readonly [one: number, two: number, three: number];

/** Hand-written level data. Cheap to author, validated by `compileLevel`. */
export interface LevelDefinition {
  readonly id: string;
  readonly name: string;
  /** See `parseLayout` for the alphabet. */
  readonly layout: readonly string[];
  readonly herd: {
    readonly size: number;
    /** Relative chance for each kind to show up in the herd. */
    readonly spawnWeights: SpawnWeights;
  };
  /** Run scores that earn stars. Strictly increasing. */
  readonly goals: StarGoals;
}

/** A validated, ready to play level. */
export interface Level {
  readonly id: string;
  readonly name: string;
  readonly pen: Pen;
  readonly herd: {
    readonly size: number;
    readonly spawnWeights: SpawnWeights;
  };
  readonly goals: StarGoals;
}

export class LevelError extends Error {
  override name = "LevelError";
}

/** Fails fast on broken data, so a typo in a level can never turn into a runtime surprise. */
export function compileLevel(definition: LevelDefinition): Level {
  const { id, name, layout, herd, goals } = definition;
  const fail = (message: string, cause?: unknown): never => {
    throw new LevelError(`Level "${id}": ${message}`, cause === undefined ? undefined : { cause });
  };

  if (id.trim() === "") throw new LevelError("Level id must not be empty");
  if (name.trim() === "") fail("name must not be empty");

  let pen: Pen;
  try {
    pen = parseLayout(layout);
  } catch (error) {
    if (error instanceof LayoutError) return fail(error.message, error);
    throw error;
  }

  if (!Number.isInteger(herd.size) || herd.size > MAX_HERD_SIZE) {
    fail(`herd size must be an integer up to ${MAX_HERD_SIZE}, got ${herd.size}`);
  }
  // Every cow needs at least one square, so a bigger herd guarantees that overflow is possible.
  // Without it a player could simply let everybody in and never take a risk.
  if (herd.size <= pen.capacity) {
    fail(`herd (${herd.size}) must be larger than the pen capacity (${pen.capacity})`);
  }

  let totalWeight = 0;
  for (const [kind, weight] of Object.entries(herd.spawnWeights)) {
    if (!Object.hasOwn(COW_KINDS, kind)) fail(`unknown cow kind "${kind}"`);
    if (!Number.isFinite(weight) || weight < 0) fail(`invalid spawn weight for "${kind}"`);
    totalWeight += weight;
  }
  if (totalWeight <= 0) fail("at least one cow kind needs a positive spawn weight");

  const goalsAreValid =
    goals.every((goal) => Number.isInteger(goal) && goal > 0) &&
    goals[0] < goals[1] &&
    goals[1] < goals[2];
  if (!goalsAreValid) fail(`star goals must be positive integers in increasing order`);

  return { id, name, pen, herd: { size: herd.size, spawnWeights: herd.spawnWeights }, goals };
}

export function compileLevels(definitions: readonly LevelDefinition[]): Level[] {
  const seen = new Set<string>();
  return definitions.map((definition) => {
    if (seen.has(definition.id)) {
      throw new LevelError(`Duplicate level id "${definition.id}"`);
    }
    seen.add(definition.id);
    return compileLevel(definition);
  });
}
