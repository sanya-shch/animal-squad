// Vite turns every sprite into a URL up front but the browser only downloads the ones that
// an <img> actually uses, so unused skins cost nothing at runtime.
const urls = import.meta.glob<string>("../assets/**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

/** URL of a file inside src/assets, e.g. "cow/cow_7.png". */
export function assetUrl(file: string): string {
  const url = urls[`../assets/${file}`];
  if (url === undefined) throw new Error(`Missing asset: ${file}`);
  return url;
}
