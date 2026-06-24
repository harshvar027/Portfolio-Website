import type { SpotifyTrack } from "./types";

type PreviewSearchResponse = {
  tracks?: SpotifyTrack[];
  error?: string;
};

type PreviewResolveResponse = {
  previewUrl?: string;
  error?: string;
};

const SEARCH_TIMEOUT_MS = 15_000;
const PREVIEW_TIMEOUT_MS = 12_000;

export async function searchPreviewTracks(
  query: string
): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams({ q: query.trim() });
  const res = await fetch(`/api/spotify/search?${params.toString()}`, {
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });

  const data = (await res.json().catch(() => ({}))) as PreviewSearchResponse;

  if (!res.ok) {
    throw new Error(data.error || "Could not search Spotify");
  }

  return data.tracks ?? [];
}

export async function resolvePreviewUrl(
  track: Pick<SpotifyTrack, "name" | "artists" | "previewUrl">
): Promise<string | null> {
  if (track.previewUrl) return track.previewUrl;

  const params = new URLSearchParams({
    name: track.name,
    artists: track.artists,
  });

  const res = await fetch(`/api/spotify/preview?${params.toString()}`, {
    signal: AbortSignal.timeout(PREVIEW_TIMEOUT_MS),
  });

  const data = (await res.json().catch(() => ({}))) as PreviewResolveResponse;
  if (!res.ok) return null;
  return data.previewUrl ?? null;
}
