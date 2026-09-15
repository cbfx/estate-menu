// One-time helper to obtain a Spotify refresh token. No fragile shell curl.
// Usage: node scripts/spotify-refresh-token.mjs
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const REDIRECT = "http://127.0.0.1:8888/callback";
const SCOPE = "user-read-currently-playing";
const rl = createInterface({ input, output });

const id = (await rl.question("Spotify Client ID: ")).trim();
const secret = (await rl.question("Spotify Client Secret: ")).trim();

const authUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({ client_id: id, response_type: "code", redirect_uri: REDIRECT, scope: SCOPE });

console.log("\n1) Open this URL in your browser and approve:\n\n" + authUrl + "\n");
console.log(`2) You'll land on ${REDIRECT}?code=... (the page won't load — that's fine).`);
const code = (await rl.question("3) Paste the code value here: ")).trim();
rl.close();

const res = await fetch("https://accounts.spotify.com/api/token", {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
  },
  body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT }),
});
const data = await res.json();
if (!res.ok || !data.refresh_token) {
  console.error("\nFailed:", JSON.stringify(data, null, 2));
  process.exit(1);
}
console.log("\nSUCCESS. Add these as secrets (GitHub production environment):\n");
console.log("SPOTIFY_CLIENT_ID=" + id);
console.log("SPOTIFY_CLIENT_SECRET=" + secret);
console.log("SPOTIFY_REFRESH_TOKEN=" + data.refresh_token);
