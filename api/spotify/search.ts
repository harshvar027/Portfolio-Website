import { searchSpotifyPreviews } from "../../server/spotifyPreview.js";

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

  const raw = req.query?.q;
  const query = Array.isArray(raw) ? raw[0] : raw;

  if (!query?.trim()) {
    res.status(400).setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Query is required" }));
    return;
  }

  try {
    const tracks = await searchSpotifyPreviews(query);
    res.status(200).setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ tracks }));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Spotify search failed";
    res.status(500).setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: message }));
  }
}
