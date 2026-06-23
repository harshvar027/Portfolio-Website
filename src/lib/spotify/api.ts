import type {
  SpotifyAudioFeatures,
  SpotifySearchResponse,
  SpotifyTrack,
} from "./types";

export function mapTrack(
  item: SpotifySearchResponse["tracks"]["items"][number]
): SpotifyTrack {
  return {
    id: item.id,
    name: item.name,
    artists: item.artists.map((a) => a.name).join(", "),
    album: item.album.name,
    albumArt: item.album.images[0]?.url ?? null,
    uri: item.uri,
    previewUrl: item.preview_url,
    durationMs: item.duration_ms,
  };
}

export async function searchSpotifyTracks(
  accessToken: string,
  query: string
): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: "8",
  });

  const res = await fetch(
    `https://api.spotify.com/v1/search?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error("Could not search Spotify — try another song name");
  }

  const data = (await res.json()) as SpotifySearchResponse;
  return data.tracks.items.map(mapTrack);
}

export async function fetchAudioFeatures(
  accessToken: string,
  trackId: string
): Promise<SpotifyAudioFeatures | null> {
  const res = await fetch(
    `https://api.spotify.com/v1/audio-features/${trackId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) return null;

  const data = (await res.json()) as SpotifyAudioFeatures;
  return data;
}

export async function transferPlaybackToDevice(
  accessToken: string,
  deviceId: string
) {
  await fetch("https://api.spotify.com/v1/me/player", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ device_ids: [deviceId], play: false }),
  });
}

export async function playOnDevice(
  accessToken: string,
  deviceId: string,
  uri: string
) {
  await transferPlaybackToDevice(accessToken, deviceId);

  const res = await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: [uri] }),
    }
  );

  if (res.ok || res.status === 204) return;

  if (res.status === 403) {
    throw new Error("Spotify Premium is required for full-track playback.");
  }

  if (res.status === 404) {
    throw new Error(
      "Spotify player is not ready yet. Wait a moment and try again."
    );
  }

  throw new Error("Could not start playback on Spotify.");
}
