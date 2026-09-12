import type { Slide } from "./types";
import Raja, { config as raja } from "./happy-birthday-raja";

// Array order = back-to-back play order when multiple events are active.
export const slides: Slide[] = [{ config: raja, Component: Raja }];
