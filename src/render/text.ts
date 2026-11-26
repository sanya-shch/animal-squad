// "1 cow", "2 cows": a count with its noun, in the right number.
export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// "08h 42m": hours and minutes, for a countdown. Rounds down, never below zero.
export function clockTime(ms: number): { hours: string; minutes: string } {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const pad = (value: number): string => String(value).padStart(2, "0");
  return { hours: pad(Math.floor(totalMinutes / 60)), minutes: pad(totalMinutes % 60) };
}
