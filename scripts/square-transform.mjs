export function formatCents(amount) {
  return (amount / 100).toFixed(2);
}

export function findFeatured(objects, categoryName = "Espresso of the day") {
  const target = categoryName.trim().toLowerCase();
  const category = objects.find(
    (o) => o.type === "CATEGORY" && (o.category_data?.name ?? "").trim().toLowerCase() === target,
  );
  if (!category) return null;

  const item = objects.find(
    (o) =>
      o.type === "ITEM" &&
      (o.item_data?.categories ?? []).some((c) => c.id === category.id),
  );
  if (!item) return null;

  const imageId = (item.item_data?.image_ids ?? [])[0];
  const image = imageId
    ? objects.find((o) => o.type === "IMAGE" && o.id === imageId)
    : null;

  return { name: item.item_data?.name ?? "", imageUrl: image?.image_data?.url ?? null };
}

export function buildSnapshot(objects) {
  const itemNames = {};
  for (const obj of objects) {
    if (obj.type === "ITEM") {
      itemNames[obj.id] = obj.item_data?.name ?? "";
    }
  }

  const entries = [];
  for (const obj of objects) {
    if (obj.type === "ITEM_VARIATION") {
      const data = obj.item_variation_data ?? {};
      const money = data.price_money;
      if (!money || typeof money.amount !== "number") continue; // skip variable pricing
      entries.push([
        obj.id,
        {
          label: itemNames[data.item_id] ?? data.name ?? "",
          price: formatCents(money.amount),
          amountCents: money.amount,
          currency: money.currency,
        },
      ]);
    } else if (obj.type === "MODIFIER") {
      const data = obj.modifier_data ?? {};
      const money = data.price_money;
      if (!money || typeof money.amount !== "number") continue; // skip no-charge / text modifiers
      entries.push([
        obj.id,
        {
          label: data.name ?? "",
          price: "+" + formatCents(money.amount),
          amountCents: money.amount,
          currency: money.currency,
        },
      ]);
    }
  }

  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return Object.fromEntries(entries);
}
