import type { SpotifySearchResponse } from "../src/lib/spotify/types.js";

export type PreviewTrack = {
  id: string;
  name: string;
  artists: string;
  album: string;
  albumArt: string | null;
  uri: string;
  previewUrl: string | null;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

export function getSpotifyCredentials() {
  const clientId =
    process.env.SPOTIFY_CLIENT_ID?.trim() ||
    process.env.VITE_SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      "Spotify credentials missing. Set SPOTIFY_CLIENT_SECRET (and client ID) in .env"
    );
  }

  return { clientId, clientSecret };
}

async function getAppAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const { clientId, clientSecret } = getSpotifyCredentials();

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as {
      error?: string;
      error_description?: string;
    };
    const message =
      detail.error_description ||
      detail.error ||
      "Could not authenticate with Spotify";
    throw new Error(message);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.value;
}

function mapTrack(
  item: SpotifySearchResponse["tracks"]["items"][number]
): PreviewTrack {
  return {
    id: item.id,
    name: item.name,
    artists: item.artists.map((a) => a.name).join(", "),
    album: item.album.name,
    albumArt: item.album.images[0]?.url ?? null,
    uri: item.uri,
    previewUrl: item.preview_url,
  };
}

export async function searchSpotifyPreviews(
  query: string,
  limit = 10
): Promise<PreviewTrack[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const token = await getAppAccessToken();
  const safeLimit = Math.min(10, Math.max(1, Math.floor(limit) || 10));
  const params = new URLSearchParams({
    q: trimmed,
    type: "track",
    limit: String(safeLimit),
  });

  const res = await fetch(
    `https://api.spotify.com/v1/search?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      detail
        ? `Spotify search failed (${res.status}): ${detail}`
        : `Spotify search failed (${res.status})`
    );
  }

  const data = (await res.json()) as SpotifySearchResponse;
  return data.tracks.items.map(mapTrack);
}
