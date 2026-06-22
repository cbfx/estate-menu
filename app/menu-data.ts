export type RowKind = "espresso" | "addon" | "item" | "header" | "modifier";

export type Row = {
  price: string;
  name: string;
  kind: RowKind;
  squareId?: string;
};

// Left column — 6 espresso drinks, then milk options + flavors below.
// Prices reconciled to Square POS; squareId drives live updates.
export const espresso: Row[] = [
  { price: "3.50", name: "Espresso", kind: "espresso", squareId: "MPSXICQUEEZSJHNU4TYBFUTM" },
  { price: "3.75", name: "Macchiato", kind: "espresso", squareId: "JI2E5T5QI6IKUYYMUYY3VHRM" },
  { price: "4.00", name: "Cortado", kind: "espresso", squareId: "Q5OFTFKUYPS4ADXCC4B4SITR" },
  { price: "4.25", name: "Cappuccino", kind: "espresso", squareId: "PLEYAEQ2GEDFPHIDXJHWEZQU" },
  { price: "4.75", name: "Latte", kind: "espresso", squareId: "CXJH4O25WCPJAHLGM6R74G5S" },
  // Latte modifiers — hug Latte with no gap.
  { price: "+0.50", name: "Honey lavender, mocha, vanilla, kentucky smoke", kind: "modifier", squareId: "HRNS3NH3KDBKEGF6XKQQFYTS" },
  { price: "+2.00", name: "Large", kind: "modifier", squareId: "7DS4ACACAUT7U54WOWMYSF2L" },
  { price: "+0.50", name: "Breve", kind: "modifier", squareId: "6QCOWWNBM7OWVF6N2XQHFU4W" },
  { price: "+0.75", name: "Almond or oat", kind: "modifier", squareId: "WSP2S4SPBSDBFJYLAF2W6FIR" },
  { price: "4.00", name: "Americano", kind: "espresso", squareId: "QWCMPLSRYO55YWXHIZN6MRV2" },
];

// Middle column = first 2 groups; right column = the rest (see Menu.tsx).
export const sections: Row[][] = [
  [
    { price: "", name: "Specialty drinks", kind: "header" },
    { price: "8.00", name: "Espresso old fashioned", kind: "item", squareId: "RXKLK5TTWB37KJPYIIDCGWZS" },
    { price: "5.00", name: "Cold brew shandy", kind: "item", squareId: "K3IZJC7PWLXFZ3GA72SVARMU" },
    { price: "5.25", name: "Matcha lemonade", kind: "item", squareId: "IRPDAOC6OE36M6WUCXOYTRNW" },
    { price: "5.00", name: "Cold brew cola", kind: "item", squareId: "22RPTA4U7KAEYT3ABXWF2KKH" },
    { price: "5.00", name: "Lime espresso tonic", kind: "item", squareId: "HI5NY4YZMS6ZGIK4PZSW4FY4" },
  ],
  [
    { price: "2.75", name: "Drip", kind: "item", squareId: "KQNUEL4V55RK747DEPTZAJPD" },
    { price: "4.00", name: "Cold brew", kind: "item", squareId: "WROIDGIGYQUCDVJ22B4SXG2F" },
  ],
  [
    { price: "", name: "Not coffee", kind: "header" },
    { price: "4.50", name: "Chai", kind: "item", squareId: "PJI7N6AXP32IUT6WRDQGZP7U" },
    { price: "5.25", name: "Matcha latte", kind: "item", squareId: "WKIP5KJQJMSJ5CCVD5PTMAD6" },
    // Grouped tea line — all teas are 4.50 in POS; mapped to Hibiscus as the representative.
    { price: "4.50", name: "Hibiscus, chamomile, green, or black tea", kind: "item", squareId: "4BD326RIBBU65IG6JC2IBGBK" },
    { price: "3.00", name: "Chocolate milk", kind: "item", squareId: "BYPB7OQJTQTDCDVHQCO25N6V" },
    // Cold fridge drinks — real Square SKUs (Topo Chico → Seltzer, Mexican coke → Boylan Cane Cola).
    { price: "4.00", name: "Seltzer", kind: "item", squareId: "UCBB73L7UTRQHYJF5TLWLHQM" },
    { price: "4.00", name: "Boylan Cane Cola", kind: "item", squareId: "QHVIX3AIAUCM7NEFA3MAQWRF" },
  ],
];
