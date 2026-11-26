// "1 cow", "2 cows": a count with its noun, in the right number.
export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
