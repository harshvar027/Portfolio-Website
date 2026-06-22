import type { SpotifyTrack } from "./types";

type PreviewSearchResponse = {
  tracks?: SpotifyTrack[];
  error?: string;
};

export async function searchPreviewTracks(
  query: string
): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams({ q: query.trim() });
  const res = await fetch(`/api/spotify/search?${params.toString()}`);

  const data = (await res.json().catch(() => ({}))) as PreviewSearchResponse;

  if (!res.ok) {
    throw new Error(data.error || "Could not search Spotify");
  }

  return data.tracks ?? [];
}
