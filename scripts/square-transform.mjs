export function formatCents(amount) {
  return (amount / 100).toFixed(2);
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
    if (obj.type !== "ITEM_VARIATION") continue;
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
  }

  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return Object.fromEntries(entries);
}
