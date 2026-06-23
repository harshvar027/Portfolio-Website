import { fetchLrclibLyrics } from "../../server/lrclib.js";

type Req = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type Res = {
  status: (code: number) => Res;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
};

const getParam = (
  query: Record<string, string | string[] | undefined> | undefined,
  key: string
) => {
  const raw = query?.[key];
  return Array.isArray(raw) ? raw[0] : raw;
};

export default async function handler(req: Req, res: Res) {
  if (req.method !== "GET") {
    res.status(405).setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const trackName = getParam(req.query, "track_name")?.trim();
  const artistName = getParam(req.query, "artist_name")?.trim();
  const albumName = getParam(req.query, "album_name")?.trim();
  const durationRaw = getParam(req.query, "duration");

  if (!trackName || !artistName || !albumName || !durationRaw) {
    res.status(400).setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "track_name, artist_name, album_name, and duration are required",
      })
    );
    return;
  }

  const durationSec = parseFloat(durationRaw);
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    res.status(400).setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "duration must be a positive number" }));
    return;
  }

  try {
    const data = await fetchLrclibLyrics({
      trackName,
      artistName,
      albumName,
      durationSec,
    });

    if (!data) {
      res.status(404).setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Lyrics not found" }));
      return;
    }

    res.status(200).setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  } catch {
    res.status(502).setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Lyrics service unavailable" }));
  }
}
