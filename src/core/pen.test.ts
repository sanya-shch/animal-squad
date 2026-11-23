import { describe, expect, it } from "vitest";

import { LayoutError, parseLayout, terrainAt } from "./pen";

describe("parseLayout", () => {
  it("reads terrain and counts capacity", () => {
    const pen = parseLayout(["..-", ".#."]);
    expect(pen.width).toBe(3);
    expect(pen.height).toBe(2);
    expect(pen.capacity).toBe(4);
    expect(terrainAt(pen, 0, 0)).toBe("pen");
    expect(terrainAt(pen, 2, 0)).toBe("outside");
    expect(terrainAt(pen, 1, 1)).toBe("rock");
  });

  it("treats everything beyond the grid as outside", () => {
    const pen = parseLayout(["."]);
    expect(terrainAt(pen, -1, 0)).toBe("outside");
    expect(terrainAt(pen, 0, 1)).toBe("outside");
  });

  it("rejects malformed layouts", () => {
    expect(() => parseLayout([])).toThrow(LayoutError);
    expect(() => parseLayout([""])).toThrow(LayoutError);
    expect(() => parseLayout(["..", "."])).toThrow(LayoutError);
    expect(() => parseLayout(["..", ".x"])).toThrow(LayoutError);
    expect(() => parseLayout(["#-", "-#"])).toThrow(LayoutError);
    expect(() => parseLayout([".".repeat(13)])).toThrow(LayoutError);
    expect(() => parseLayout(Array.from({ length: 7 }, () => ".".repeat(6)))).toThrow(LayoutError);
  });
});
