import type { LrclibResponse } from "./types";

export const fetchLyricsFromApi = async (
  trackName: string,
  artistName: string,
  albumName: string,
  durationSec: number
): Promise<LrclibResponse | null> => {
  const params = new URLSearchParams({
    track_name: trackName,
    artist_name: artistName,
    album_name: albumName,
    duration: String(Math.round(durationSec)),
  });

  const res = await fetch(`/api/lrclib/lyrics?${params.toString()}`);

  if (res.status === 404) return null;
  if (!res.ok) return null;

  return (await res.json()) as LrclibResponse;
};
