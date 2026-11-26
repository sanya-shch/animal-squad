export function create<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  children: readonly (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className !== "") element.className = className;
  element.append(...children);
  return element;
}

// A decorative sprite: no alt text, cannot be dragged, decoded off the main thread.
export function sprite(src: string, className: string): HTMLImageElement {
  const element = create("img", className);
  element.src = src;
  element.alt = "";
  element.draggable = false;
  element.decoding = "async";
  return element;
}

const round3 = (value: number): number => Math.round(value * 1000) / 1000;

// Sets CSS custom properties: `{ qx: 1.5 }` becomes `--qx: 1.5`.
export function setVars(
  element: HTMLElement,
  vars: Readonly<Record<string, number | string>>,
): void {
  for (const [name, value] of Object.entries(vars)) {
    const text = typeof value === "number" ? String(round3(value)) : value;
    element.style.setProperty(`--${name}`, text);
  }
}

// Sets an attribute only when it changes: rewriting the same value still counts as a mutation.
export function setAttr(element: Element, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

// Writes text only when it changed, so an unchanged value never touches the DOM.
export function setText(node: Node, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}
