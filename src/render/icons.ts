// Small outline icons, drawn inline so they take the colour of the text around them and need
// no files, no font and no CSP exceptions. Each one is a list of SVG shapes on a 24x24 grid.

const SVG_NS = "http://www.w3.org/2000/svg";

type Shape = readonly [tag: string, attributes: Readonly<Record<string, string>>];

const path = (d: string): Shape => ["path", { d }];

const ICONS = {
  tractor: [
    path("M4 15V8h6l2 4h5v3"),
    path("M14 8V3"),
    ["circle", { cx: "7", cy: "17", r: "3.5" }],
    ["circle", { cx: "18", cy: "18", r: "2.5" }],
  ],
  calendar: [
    ["rect", { x: "3", y: "4", width: "18", height: "18", rx: "2" }],
    path("M16 2v4M8 2v4M3 10h18"),
  ],
  clock: [["circle", { cx: "12", cy: "12", r: "10" }], path("M12 6v6l4 2")],
  lock: [
    ["rect", { x: "4", y: "11", width: "16", height: "10", rx: "2" }],
    path("M8 11V7a4 4 0 0 1 8 0v4"),
  ],
  trash: [path("M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6")],
  shield: [path("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z")],
  monitor: [
    ["rect", { x: "2", y: "3", width: "20", height: "14", rx: "2" }],
    path("M8 21h8M12 17v4"),
  ],
  zap: [path("M13 2 3 14h9l-1 8 10-12h-9z")],
  arrow: [path("M5 12h14M13 6l6 6-6 6")],
  medal: [
    ["circle", { cx: "12", cy: "15", r: "6" }],
    path("M8 2l4 7 4-7"),
    path("M12 12.5l1 2 2 .3-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1L9 14.8l2-.3z"),
  ],
  star: [path("m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2L7 14.2 2 9.3l6.9-1z")],
} as const satisfies Record<string, readonly Shape[]>;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName, className = "icon"): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  for (const [tag, attributes] of ICONS[name]) {
    const shape = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes)) shape.setAttribute(key, value);
    svg.append(shape);
  }
  return svg;
}
