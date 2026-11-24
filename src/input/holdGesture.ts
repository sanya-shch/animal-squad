/** An element that can capture the pointer. `HTMLElement` fits; tests use a plain `EventTarget`. */
export interface PointerSurface extends EventTarget {
  setPointerCapture?(pointerId: number): void;
}

export interface HoldGestureOptions {
  /** The pad the player presses. */
  readonly target: PointerSurface;
  readonly onHold: () => void;
  readonly onRelease: () => void;
  /** Receives Space presses and blur. Defaults to `window`. */
  readonly keyTarget?: EventTarget;
  /** Told when the tab gets hidden. Defaults to `document`. */
  readonly page?: EventTarget & { readonly hidden: boolean };
}

type Source = { readonly kind: "pointer"; readonly id: number } | { readonly kind: "key" };

/**
 * Turns mouse, touch, pen and the Space key into one "hold / release" gesture.
 *
 * The part that is easy to get wrong is the release. A hold must never get stuck, so besides
 * a normal pointer-up it also ends on pointer-cancel, lost capture, window blur and a hidden
 * tab. Only one source can hold at a time, and it is the one that has to let go.
 *
 * Returns a function that removes every listener. It does not fire `onRelease`.
 */
export function bindHoldGesture(options: HoldGestureOptions): () => void {
  const { target, onHold, onRelease } = options;
  const keyTarget = options.keyTarget ?? window;
  const page = options.page ?? document;
  const abort = new AbortController();
  const { signal } = abort;

  let source: Source | null = null;

  const press = (next: Source): void => {
    source = next;
    onHold();
  };

  const release = (): void => {
    if (source === null) return;
    source = null;
    onRelease();
  };

  const releasePointer = (event: Event): void => {
    const { pointerId } = event as PointerEvent;
    if (source?.kind === "pointer" && source.id === pointerId) release();
  };

  target.addEventListener(
    "pointerdown",
    (event) => {
      const { isPrimary, button, pointerId } = event as PointerEvent;
      if (source !== null || !isPrimary || button !== 0) return;
      try {
        // Keeps pointer-up coming to the pad even when the finger or cursor slides away.
        target.setPointerCapture?.(pointerId);
      } catch {
        // The pointer is already gone; the window level listeners below still end the hold.
      }
      press({ kind: "pointer", id: pointerId });
    },
    { signal },
  );

  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    target.addEventListener(type, releasePointer, { signal });
  }
  for (const type of ["pointerup", "pointercancel"]) {
    keyTarget.addEventListener(type, releasePointer, { signal });
  }

  // A long press on touch screens opens the context menu and steals the pointer.
  target.addEventListener("contextmenu", (event) => event.preventDefault(), { signal });

  keyTarget.addEventListener(
    "keydown",
    (event) => {
      const { code, repeat } = event as KeyboardEvent;
      if (code !== "Space") return;
      event.preventDefault(); // Space would scroll the page.
      if (!repeat && source === null) press({ kind: "key" });
    },
    { signal },
  );

  keyTarget.addEventListener(
    "keyup",
    (event) => {
      if ((event as KeyboardEvent).code === "Space" && source?.kind === "key") release();
    },
    { signal },
  );

  keyTarget.addEventListener("blur", release, { signal });
  page.addEventListener(
    "visibilitychange",
    () => {
      if (page.hidden) release();
    },
    { signal },
  );

  return () => {
    abort.abort();
  };
}
