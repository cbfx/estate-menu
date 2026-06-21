export type RowKind = "espresso" | "addon" | "item";

export type Row = {
  price: string;
  name: string;
  kind: RowKind;
  squareId?: string;
};

// Left column — all 6 espresso drinks, then the flavor add-on last.
// Prices reconciled to Square POS; squareId drives live updates.
export const espresso: Row[] = [
  { price: "3.50", name: "Espresso", kind: "espresso", squareId: "MPSXICQUEEZSJHNU4TYBFUTM" },
  { price: "3.75", name: "Macchiato", kind: "espresso", squareId: "JI2E5T5QI6IKUYYMUYY3VHRM" },
  { price: "4.00", name: "Cortado", kind: "espresso", squareId: "Q5OFTFKUYPS4ADXCC4B4SITR" },
  { price: "4.25", name: "Cappuccino", kind: "espresso", squareId: "PLEYAEQ2GEDFPHIDXJHWEZQU" },
  { price: "4.75", name: "Latte", kind: "espresso", squareId: "CXJH4O25WCPJAHLGM6R74G5S" },
  { price: "4.00", name: "Americano", kind: "espresso", squareId: "QWCMPLSRYO55YWXHIZN6MRV2" },
  // Modifier (not a catalog item) — shown as "extra", no price.
  { price: "extra", name: "Honey lavender, mocha, vanilla, kentucky smoke", kind: "addon" },
];

// Right column — three sections.
export const sections: Row[][] = [
  [
    { price: "8.00", name: "Espresso old fashioned", kind: "item", squareId: "RXKLK5TTWB37KJPYIIDCGWZS" },
    { price: "5.00", name: "Cold brew shandy", kind: "item", squareId: "K3IZJC7PWLXFZ3GA72SVARMU" },
    { price: "5.25", name: "Matcha lemonade", kind: "item", squareId: "IRPDAOC6OE36M6WUCXOYTRNW" },
    { price: "5.00", name: "Cold brew cola", kind: "item", squareId: "22RPTA4U7KAEYT3ABXWF2KKH" },
    { price: "5.00", name: "Lime espresso tonic", kind: "item", squareId: "HI5NY4YZMS6ZGIK4PZSW4FY4" },
  ],
  [
    { price: "4.50", name: "Chai", kind: "item", squareId: "PJI7N6AXP32IUT6WRDQGZP7U" },
    { price: "5.25", name: "Matcha latte", kind: "item", squareId: "WKIP5KJQJMSJ5CCVD5PTMAD6" },
  ],
  [
    // Grouped tea line — all teas are 4.50 in POS; static (one line, many items).
    { price: "4.50", name: "Hibiscus, chamomile, chai, green, black", kind: "item" },
  ],
  [
    // Cold fridge drinks — real Square SKUs (Topo Chico → Seltzer, Mexican coke → Boylan Cane Cola).
    { price: "4.00", name: "Seltzer", kind: "item", squareId: "UCBB73L7UTRQHYJF5TLWLHQM" },
    { price: "4.00", name: "Boylan Cane Cola", kind: "item", squareId: "QHVIX3AIAUCM7NEFA3MAQWRF" },
  ],
];
