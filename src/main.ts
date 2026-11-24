import "./styles/base.css";
import "./styles/scene.css";
import "./styles/game.css";
import "./styles/home.css";

import { startApp } from "./app";
import { compileLevels } from "./core";
import { LEVEL_DEFINITIONS } from "./levels/definitions";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Missing #app root element");

const stop = startApp(root, compileLevels(LEVEL_DEFINITIONS));

// Hot reload would otherwise leave the old app's timers and listeners running.
import.meta.hot?.dispose(stop);
