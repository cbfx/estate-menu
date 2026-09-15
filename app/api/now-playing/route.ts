import { parseNowPlaying } from "./parse";

export const dynamic = "force-dynamic";

const OFF = { playing: false, title: null, artist: null };

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function getAccessToken(id: string, secret: string, refresh: string): Promise<string | null> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: "Basic " + btoa(`${id}:${secret}`),
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export async function GET() {
  try {
    const id = process.env.SPOTIFY_CLIENT_ID;
    const secret = process.env.SPOTIFY_CLIENT_SECRET;
    const refresh = process.env.SPOTIFY_REFRESH_TOKEN;
    if (!id || !secret || !refresh) return json(OFF);

    const token = await getAccessToken(id, secret, refresh);
    if (!token) return json(OFF);

    const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { authorization: `Bearer ${token}` },
    });
    if (res.status === 204 || !res.ok) return json(OFF); // 204 = nothing playing

    const body = await res.json();
    return json(parseNowPlaying(body));
  } catch {
    return json(OFF);
  }
}
