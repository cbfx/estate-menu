export type RowKind = "espresso" | "addon" | "item";

export type Row = { price: string; name: string; kind: RowKind };

// Left column — all 6 espresso drinks, then the +0.50 flavor add-on last.
export const espresso: Row[] = [
  { price: "3.25", name: "Espresso", kind: "espresso" },
  { price: "3.50", name: "Macchiato", kind: "espresso" },
  { price: "3.75", name: "Cortado", kind: "espresso" },
  { price: "4.00", name: "Cappuccino", kind: "espresso" },
  { price: "4.50", name: "Latte", kind: "espresso" },
  { price: "3.50", name: "Americano", kind: "espresso" },
  { price: "+0.50", name: "Honey lavender, mocha, vanilla, kentucky smoke", kind: "addon" },
];

// Right column — three sections.
export const sections: Row[][] = [
  [
    { price: "8.00", name: "Espresso old fashioned", kind: "item" },
    { price: "4.50", name: "Cold brew shandy", kind: "item" },
    { price: "4.50", name: "Matcha lemonade", kind: "item" },
    { price: "4.50", name: "Cold brew cola", kind: "item" },
    { price: "4.50", name: "Lime espresso tonic", kind: "item" },
  ],
  [
    { price: "4.00", name: "Chai", kind: "item" },
    { price: "4.75", name: "Matcha latte", kind: "item" },
  ],
  [
    { price: "3.50", name: "Hibiscus, chamomile, chai, green, black", kind: "item" },
  ],
];
