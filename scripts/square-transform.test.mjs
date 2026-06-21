import { test } from "node:test";
import assert from "node:assert/strict";
import { formatCents, buildSnapshot } from "./square-transform.mjs";

test("formatCents converts cents to a 2-decimal string", () => {
  assert.equal(formatCents(450), "4.50");
  assert.equal(formatCents(400), "4.00");
  assert.equal(formatCents(325), "3.25");
  assert.equal(formatCents(5), "0.05");
});

test("buildSnapshot joins variations to parent item names and keeps fixed prices", () => {
  const objects = [
    { type: "ITEM", id: "ITEM1", item_data: { name: "Latte" } },
    {
      type: "ITEM_VARIATION",
      id: "VAR1",
      item_variation_data: { item_id: "ITEM1", name: "Regular", price_money: { amount: 450, currency: "USD" } },
    },
  ];
  assert.deepEqual(buildSnapshot(objects), {
    VAR1: { label: "Latte", price: "4.50", amountCents: 450, currency: "USD" },
  });
});

test("buildSnapshot skips variations without fixed price_money", () => {
  const objects = [
    { type: "ITEM", id: "ITEM1", item_data: { name: "Drip" } },
    {
      type: "ITEM_VARIATION",
      id: "VAR2",
      item_variation_data: { item_id: "ITEM1", name: "Variable", pricing_type: "VARIABLE_PRICING" },
    },
  ];
  assert.deepEqual(buildSnapshot(objects), {});
});

test("buildSnapshot output keys are sorted for stable diffs", () => {
  const objects = [
    { type: "ITEM", id: "I", item_data: { name: "X" } },
    { type: "ITEM_VARIATION", id: "B", item_variation_data: { item_id: "I", name: "n", price_money: { amount: 100, currency: "USD" } } },
    { type: "ITEM_VARIATION", id: "A", item_variation_data: { item_id: "I", name: "n", price_money: { amount: 200, currency: "USD" } } },
  ];
  assert.deepEqual(Object.keys(buildSnapshot(objects)), ["A", "B"]);
});
