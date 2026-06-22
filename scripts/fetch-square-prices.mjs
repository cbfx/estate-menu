import { writeFileSync } from "node:fs";
import { buildSnapshot, findFeatured } from "./square-transform.mjs";

const OUT = new URL("../app/square-snapshot.json", import.meta.url);
const FEATURED_OUT = new URL("../app/featured.json", import.meta.url);

function baseUrl() {
  return process.env.SQUARE_ENV === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";
}

async function fetchAllObjects(token) {
  const objects = [];
  let cursor = "";
  do {
    const url = new URL("/v2/catalog/list", baseUrl());
    url.searchParams.set("types", "ITEM,ITEM_VARIATION,MODIFIER_LIST,MODIFIER,CATEGORY,IMAGE");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      throw new Error(`Square API ${res.status}: ${await res.text()}`);
    }
    const body = await res.json();
    if (Array.isArray(body.objects)) objects.push(...body.objects);
    cursor = body.cursor ?? "";
  } while (cursor);

  return objects;
}

async function main() {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) throw new Error("SQUARE_ACCESS_TOKEN is not set");

  const objects = await fetchAllObjects(token);
  if (objects.length === 0) {
    throw new Error("Square returned an empty catalog; refusing to overwrite snapshot");
  }

  const snapshot = buildSnapshot(objects);
  writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`Wrote ${Object.keys(snapshot).length} priced variations to app/square-snapshot.json`);

  const featured = findFeatured(objects);
  writeFileSync(FEATURED_OUT, JSON.stringify(featured ?? {}, null, 2) + "\n");
  console.log(featured?.imageUrl ? `Featured: ${featured.name}` : "No featured item/image found");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
