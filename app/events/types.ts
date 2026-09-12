import type { ComponentType } from "react";

export type EventConfig = {
  id: string;
  start: string; // UTC ISO 8601, e.g. "2026-09-12T14:00:00Z"
  end: string; // UTC ISO 8601
  durationSeconds: number;
};

export type Slide = {
  config: EventConfig;
  Component: ComponentType;
};
