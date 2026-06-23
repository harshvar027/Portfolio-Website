import type { LrclibResponse } from "../src/lib/lrclib/types.js";

const LRCLIB_BASE = "https://lrclib.net/api";
const USER_AGENT = "Portfolio-Website/1.0 (https://github.com)";

export type LrclibQuery = {
  trackName: string;
  artistName: string;
  albumName: string;
  durationSec: number;
};

export async function fetchLrclibLyrics(
  query: LrclibQuery
): Promise<LrclibResponse | null> {
  const params = new URLSearchParams({
    track_name: query.trackName,
    artist_name: query.artistName,
    album_name: query.albumName,
    duration: String(Math.round(query.durationSec)),
  });

  const res = await fetch(`${LRCLIB_BASE}/get?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`LRCLIB failed (${res.status})`);
  }

  return (await res.json()) as LrclibResponse;
}
