import { describe, expect, it } from "vitest";

import { bindHoldGesture } from "./holdGesture";

class FakePage extends EventTarget {
  hidden = false;
}

interface Props {
  [key: string]: unknown;
}

function fire(target: EventTarget, type: string, props: Props = {}): Event {
  const event = Object.assign(new Event(type, { cancelable: true }), props);
  target.dispatchEvent(event);
  return event;
}

const pointer = (props: Props = {}): Props => ({
  pointerId: 1,
  isPrimary: true,
  button: 0,
  ...props,
});

function setup() {
  const target = new EventTarget();
  const keys = new EventTarget();
  const page = new FakePage();
  const log: string[] = [];
  const unbind = bindHoldGesture({
    target,
    keyTarget: keys,
    page,
    onHold: () => log.push("hold"),
    onRelease: () => log.push("release"),
  });
  return { target, keys, page, log, unbind };
}

describe("bindHoldGesture", () => {
  it("holds on pointer down and releases on pointer up", () => {
    const { target, log } = setup();
    fire(target, "pointerdown", pointer());
    fire(target, "pointerup", pointer());
    expect(log).toEqual(["hold", "release"]);
  });

  it("ignores secondary buttons and secondary touches", () => {
    const { target, log } = setup();
    fire(target, "pointerdown", pointer({ button: 2 }));
    fire(target, "pointerdown", pointer({ isPrimary: false, pointerId: 2 }));
    expect(log).toEqual([]);
  });

  it("ignores a second pointer while one is already holding", () => {
    const { target, log } = setup();
    fire(target, "pointerdown", pointer());
    fire(target, "pointerdown", pointer({ pointerId: 2 }));
    fire(target, "pointerup", pointer({ pointerId: 2 }));
    expect(log).toEqual(["hold"]);
    fire(target, "pointerup", pointer());
    expect(log).toEqual(["hold", "release"]);
  });

  it("releases only once, whichever of the ending events comes first", () => {
    const { target, log } = setup();
    fire(target, "pointerdown", pointer());
    fire(target, "pointercancel", pointer());
    fire(target, "lostpointercapture", pointer());
    fire(target, "pointerup", pointer());
    expect(log).toEqual(["hold", "release"]);
  });

  it("still releases when the pointer-up lands outside the pad", () => {
    const { target, keys, log } = setup();
    fire(target, "pointerdown", pointer());
    fire(keys, "pointerup", pointer());
    expect(log).toEqual(["hold", "release"]);
  });

  it("does not let a stray pointer-up of another pointer end the hold", () => {
    const { target, keys, log } = setup();
    fire(target, "pointerdown", pointer());
    fire(keys, "pointerup", pointer({ pointerId: 9 }));
    expect(log).toEqual(["hold"]);
  });

  it("works with the Space key and ignores key repeat", () => {
    const { keys, log } = setup();
    const down = fire(keys, "keydown", { code: "Space", repeat: false });
    fire(keys, "keydown", { code: "Space", repeat: true });
    fire(keys, "keyup", { code: "Space" });
    expect(log).toEqual(["hold", "release"]);
    expect(down.defaultPrevented).toBe(true);
  });

  it("ignores other keys", () => {
    const { keys, log } = setup();
    const event = fire(keys, "keydown", { code: "KeyA", repeat: false });
    fire(keys, "keyup", { code: "KeyA" });
    expect(log).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
  });

  it("keeps the pointer in charge: Space neither joins nor ends a pointer hold", () => {
    const { target, keys, log } = setup();
    fire(target, "pointerdown", pointer());
    fire(keys, "keydown", { code: "Space", repeat: false });
    fire(keys, "keyup", { code: "Space" });
    expect(log).toEqual(["hold"]);
  });

  it("never gets stuck: window blur and a hidden tab both release", () => {
    const first = setup();
    fire(first.keys, "keydown", { code: "Space", repeat: false });
    fire(first.keys, "blur");
    expect(first.log).toEqual(["hold", "release"]);

    const second = setup();
    fire(second.target, "pointerdown", pointer());
    second.page.hidden = true;
    fire(second.page, "visibilitychange");
    expect(second.log).toEqual(["hold", "release"]);
  });

  it("does not release when the tab becomes visible again", () => {
    const { page, log } = setup();
    fire(page, "visibilitychange");
    expect(log).toEqual([]);
  });

  it("suppresses the long-press context menu on the pad", () => {
    const { target } = setup();
    expect(fire(target, "contextmenu").defaultPrevented).toBe(true);
  });

  it("removes every listener when unbound", () => {
    const { target, keys, page, log, unbind } = setup();
    unbind();
    fire(target, "pointerdown", pointer());
    fire(keys, "keydown", { code: "Space", repeat: false });
    page.hidden = true;
    fire(page, "visibilitychange");
    expect(log).toEqual([]);
  });
});
