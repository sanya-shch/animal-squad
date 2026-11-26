// Remembers what it has already asked for, so every URL is requested once.
export type Preloader = (urls: readonly string[]) => number;

/**
 * Starts downloading images in the background. Used while the result of a round is on screen,
 * so the next herd's sprites are already in the cache when the round begins and nothing pops in.
 * Returns how many URLs were new. `makeImage` is a parameter so that tests need no browser.
 */
export function createPreloader(makeImage: () => HTMLImageElement = () => new Image()): Preloader {
  const requested = new Set<string>();
  return (urls) => {
    let started = 0;
    for (const url of urls) {
      if (requested.has(url)) continue;
      requested.add(url);
      const image = makeImage();
      image.decoding = "async";
      image.src = url;
      started++;
    }
    return started;
  };
}
