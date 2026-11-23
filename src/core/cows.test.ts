import { describe, expect, it } from "vitest";

import { COW_KINDS, COW_KIND_IDS, cowSize } from "./cows";

describe("COW_KINDS", () => {
  it("keeps every orientation of a kind the same size", () => {
    for (const id of COW_KIND_IDS) {
      const { shapes } = COW_KINDS[id];
      expect(shapes.length).toBeGreaterThan(0);
      for (const shape of shapes) expect(shape.length).toBe(cowSize(id));
    }
  });

  it("anchors every shape at the top-left corner with non-negative offsets", () => {
    for (const id of COW_KIND_IDS) {
      for (const shape of COW_KINDS[id].shapes) {
        for (const [dx, dy] of shape) {
          expect(dx >= 0 && dy >= 0).toBe(true);
        }
        expect(shape.some(([dx, dy]) => dx === 0 && dy === 0)).toBe(true);
      }
    }
  });

  it("gives every kind positive points and at least one skin", () => {
    for (const id of COW_KIND_IDS) {
      expect(COW_KINDS[id].points).toBeGreaterThan(0);
      expect(COW_KINDS[id].skins).toBeGreaterThan(0);
    }
  });
});
