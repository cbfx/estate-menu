import { test } from "node:test";
import assert from "node:assert/strict";
import { isActive, activeSlides } from "./schedule.ts";

const cfg = (over = {}) => ({
  id: "e",
  start: "2026-09-12T14:00:00Z",
  end: "2026-09-12T17:00:00Z",
  durationSeconds: 60,
  ...over,
});
const at = (iso) => Date.parse(iso);

test("isActive true inside the window (inclusive bounds)", () => {
  assert.equal(isActive(cfg(), at("2026-09-12T14:00:00Z")), true);
  assert.equal(isActive(cfg(), at("2026-09-12T15:30:00Z")), true);
  assert.equal(isActive(cfg(), at("2026-09-12T17:00:00Z")), true);
});

test("isActive false outside the window", () => {
  assert.equal(isActive(cfg(), at("2026-09-12T13:59:59Z")), false);
  assert.equal(isActive(cfg(), at("2026-09-12T17:00:01Z")), false);
});

test("isActive false for malformed/misordered windows", () => {
  assert.equal(isActive(cfg({ start: "nonsense" }), at("2026-09-12T15:00:00Z")), false);
  assert.equal(isActive(cfg({ start: "2026-09-12T17:00:00Z", end: "2026-09-12T14:00:00Z" }), at("2026-09-12T15:00:00Z")), false);
});

test("activeSlides filters and preserves registry order", () => {
  const A = { config: cfg({ id: "a" }), Component: () => null };
  const B = { config: cfg({ id: "b", start: "2000-01-01T00:00:00Z", end: "2000-01-02T00:00:00Z" }), Component: () => null };
  const C = { config: cfg({ id: "c" }), Component: () => null };
  const now = at("2026-09-12T15:00:00Z");
  assert.deepEqual(activeSlides([A, B, C], now).map((s) => s.config.id), ["a", "c"]);
});
