import type { EventConfig, Slide } from "./types";

export function isActive(config: EventConfig, nowMs: number): boolean {
  const start = Date.parse(config.start);
  const end = Date.parse(config.end);
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) return false;
  return nowMs >= start && nowMs <= end;
}

export function activeSlides(slides: Slide[], nowMs: number): Slide[] {
  return slides.filter((s) => isActive(s.config, nowMs));
}
