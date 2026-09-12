import type { Slide } from "./types";
import Raja, { config as raja } from "./happy-birthday-raja";
import Wifi, { config as wifi } from "./wifi-password";

// Array order = back-to-back play order when multiple events are active.
export const slides: Slide[] = [
  { config: raja, Component: Raja },
  { config: wifi, Component: Wifi },
];
