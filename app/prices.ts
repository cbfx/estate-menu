import snapshot from "./square-snapshot.json";
import type { Row } from "./menu-data";

type SnapshotEntry = {
  label: string;
  price: string;
  amountCents: number;
  currency: string;
};
type Snapshot = Record<string, SnapshotEntry>;

export function resolvePrice(row: Row): string {
  const entry = (snapshot as Snapshot)[row.squareId ?? ""];
  return entry?.price ?? row.price;
}
