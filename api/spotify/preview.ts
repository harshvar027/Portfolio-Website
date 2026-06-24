import { resolveTrackPreview } from "../../server/spotifyPreview.js";

type Req = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type Res = {
  status: (code: number) => Res;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
};

export default async function handler(req: Req, res: Res) {
  if (req.method !== "GET") {
    res.status(405).setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const rawName = req.query?.name;
  const rawArtists = req.query?.artists;
  const name = Array.isArray(rawName) ? rawName[0] : rawName;
  const artists = Array.isArray(rawArtists) ? rawArtists[0] : rawArtists;

  if (!name?.trim() || !artists?.trim()) {
    res.status(400).setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "name and artists are required" }));
    return;
  }

  try {
    const previewUrl = await resolveTrackPreview(name.trim(), artists.trim());
    if (!previewUrl) {
      res.status(404).setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "No preview available for this track" }));
      return;
    }

    res.status(200).setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ previewUrl }));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Preview lookup failed";
    res.status(500).setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: message }));
  }
}
