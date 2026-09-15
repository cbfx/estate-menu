export type NowPlaying = {
  playing: boolean;
  title: string | null;
  artist: string | null;
};

const OFF: NowPlaying = { playing: false, title: null, artist: null };

export function parseNowPlaying(body: unknown): NowPlaying {
  if (!body || typeof body !== "object") return OFF;
  const b = body as { is_playing?: unknown; item?: unknown };
  if (b.is_playing !== true || !b.item || typeof b.item !== "object") return OFF;
  const item = b.item as { name?: unknown; artists?: unknown };
  const title = typeof item.name === "string" ? item.name : null;
  const artists = Array.isArray(item.artists)
    ? item.artists
        .map((a) => (a && typeof a === "object" ? (a as { name?: unknown }).name : null))
        .filter((n): n is string => typeof n === "string")
    : [];
  if (!title || artists.length === 0) return OFF;
  return { playing: true, title, artist: artists.join(", ") };
}
