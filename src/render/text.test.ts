import { describe, expect, it } from "vitest";

import { plural } from "./text";

describe("plural", () => {
  it("uses the singular for exactly one", () => {
    expect(plural(1, "cow")).toBe("1 cow");
  });

  it("uses the plural for everything else, zero included", () => {
    expect(plural(0, "cow")).toBe("0 cows");
    expect(plural(2, "point")).toBe("2 points");
    expect(plural(11, "day")).toBe("11 days");
  });
});
