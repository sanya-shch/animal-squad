import { describe, expect, it } from "vitest";

import { createPreloader } from "./preload";

function fakeImages() {
  const created: { src: string; decoding: string }[] = [];
  const makeImage = () => {
    const image = { src: "", decoding: "" };
    created.push(image);
    return image as unknown as HTMLImageElement;
  };
  return { created, makeImage };
}

describe("createPreloader", () => {
  it("requests each URL once, however often it is asked", () => {
    const { created, makeImage } = fakeImages();
    const preload = createPreloader(makeImage);
    expect(preload(["a.webp", "b.webp", "a.webp"])).toBe(2);
    expect(preload(["b.webp", "c.webp"])).toBe(1);
    expect(created.map((image) => image.src)).toEqual(["a.webp", "b.webp", "c.webp"]);
  });

  it("decodes off the main thread", () => {
    const { created, makeImage } = fakeImages();
    createPreloader(makeImage)(["a.webp"]);
    expect(created[0]?.decoding).toBe("async");
  });

  it("does nothing for an empty list", () => {
    const { created, makeImage } = fakeImages();
    expect(createPreloader(makeImage)([])).toBe(0);
    expect(created).toHaveLength(0);
  });
});
