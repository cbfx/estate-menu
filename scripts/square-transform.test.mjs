import { test } from "node:test";
import assert from "node:assert/strict";
import { formatCents, buildSnapshot, findFeatured } from "./square-transform.mjs";

test("findFeatured returns the category's item with its first image url", () => {
  const objects = [
    { type: "CATEGORY", id: "CAT", category_data: { name: "Espresso of the Day" } },
    { type: "ITEM", id: "I", item_data: { name: "Brazil", categories: [{ id: "CAT" }], image_ids: ["IMG1", "IMG2"] } },
    { type: "IMAGE", id: "IMG1", image_data: { url: "https://img/1.jpg" } },
    { type: "IMAGE", id: "IMG2", image_data: { url: "https://img/2.jpg" } },
  ];
  assert.deepEqual(findFeatured(objects), { name: "Brazil", imageUrl: "https://img/1.jpg" });
});

test("findFeatured matches the category name case-insensitively", () => {
  const objects = [
    { type: "CATEGORY", id: "CAT", category_data: { name: "espresso of the day" } },
    { type: "ITEM", id: "I", item_data: { name: "X", categories: [{ id: "CAT" }], image_ids: ["IMG"] } },
    { type: "IMAGE", id: "IMG", image_data: { url: "u" } },
  ];
  assert.equal(findFeatured(objects)?.imageUrl, "u");
});

test("findFeatured returns null when the category or item is missing", () => {
  assert.equal(findFeatured([]), null);
  assert.equal(findFeatured([{ type: "CATEGORY", id: "C", category_data: { name: "Espresso of the day" } }]), null);
});

test("findFeatured returns null imageUrl when the item has no image", () => {
  const objects = [
    { type: "CATEGORY", id: "CAT", category_data: { name: "Espresso of the day" } },
    { type: "ITEM", id: "I", item_data: { name: "X", categories: [{ id: "CAT" }] } },
  ];
  assert.deepEqual(findFeatured(objects), { name: "X", imageUrl: null });
});

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

test("buildSnapshot includes modifiers, keyed by id, priced with a + prefix", () => {
  const objects = [
    { type: "MODIFIER", id: "MOD1", modifier_data: { name: "Breve", price_money: { amount: 50, currency: "USD" } } },
    { type: "MODIFIER", id: "MOD2", modifier_data: { name: "Oat", price_money: { amount: 75, currency: "USD" } } },
  ];
  assert.deepEqual(buildSnapshot(objects), {
    MOD1: { label: "Breve", price: "+0.50", amountCents: 50, currency: "USD" },
    MOD2: { label: "Oat", price: "+0.75", amountCents: 75, currency: "USD" },
  });
});

test("buildSnapshot skips modifiers without a price (e.g. text modifiers)", () => {
  const objects = [
    { type: "MODIFIER", id: "MOD3", modifier_data: { name: "No charge" } },
  ];
  assert.deepEqual(buildSnapshot(objects), {});
});

test("items and modifiers coexist in one flat map (ITEM itself yields no entry)", () => {
  const objects = [
    { type: "ITEM", id: "I", item_data: { name: "Latte" } },
    { type: "ITEM_VARIATION", id: "V", item_variation_data: { item_id: "I", price_money: { amount: 475, currency: "USD" } } },
    { type: "MODIFIER", id: "M", modifier_data: { name: "Vanilla", price_money: { amount: 50, currency: "USD" } } },
  ];
  assert.deepEqual(buildSnapshot(objects), {
    M: { label: "Vanilla", price: "+0.50", amountCents: 50, currency: "USD" },
    V: { label: "Latte", price: "4.75", amountCents: 475, currency: "USD" },
  });
});
