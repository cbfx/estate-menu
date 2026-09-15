import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNowPlaying } from "./parse.ts";

const OFF = { playing: false, title: null, artist: null };

test("parses a playing track with one artist", () => {
  const body = { is_playing: true, item: { name: "Redbone", artists: [{ name: "Childish Gambino" }] } };
  assert.deepEqual(parseNowPlaying(body), { playing: true, title: "Redbone", artist: "Childish Gambino" });
});

test("joins multiple artists with a comma", () => {
  const body = { is_playing: true, item: { name: "Song", artists: [{ name: "A" }, { name: "B" }] } };
  assert.equal(parseNowPlaying(body).artist, "A, B");
});

test("not playing when is_playing is false", () => {
  assert.deepEqual(parseNowPlaying({ is_playing: false, item: { name: "x", artists: [{ name: "y" }] } }), OFF);
});

test("not playing when there is no item", () => {
  assert.deepEqual(parseNowPlaying({ is_playing: true, item: null }), OFF);
});

test("safe on null/empty/garbage bodies", () => {
  assert.deepEqual(parseNowPlaying(null), OFF);
  assert.deepEqual(parseNowPlaying(undefined), OFF);
  assert.deepEqual(parseNowPlaying({}), OFF);
  assert.deepEqual(parseNowPlaying({ is_playing: true, item: { name: "x" } }), OFF); // no artists
});
