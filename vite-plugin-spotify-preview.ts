import type { Connect, Plugin, PreviewServer, ViteDevServer } from "vite";
import { loadEnv } from "vite";
import { fetchLrclibLyrics } from "./server/lrclib.js";
import {
  resolveTrackPreview,
  searchSpotifyPreviews,
} from "./server/spotifyPreview.js";

const spotifySearchHandler: Connect.NextHandleFunction = async (req, res, next) => {
  const path = req.url?.split("?")[0];
  if (path !== "/api/spotify/search") {
    next();
    return;
  }

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const url = new URL(req.url!, `http://${req.headers.host}`);
  const query = url.searchParams.get("q")?.trim();

  if (!query) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Query is required" }));
    return;
  }

  try {
    const tracks = await searchSpotifyPreviews(query);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ tracks }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Spotify search failed",
      })
    );
  }
};

const spotifyPreviewHandler: Connect.NextHandleFunction = async (
  req,
  res,
  next
) => {
  const path = req.url?.split("?")[0];
  if (path !== "/api/spotify/preview") {
    next();
    return;
  }

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const url = new URL(req.url!, `http://${req.headers.host}`);
  const name = url.searchParams.get("name")?.trim();
  const artists = url.searchParams.get("artists")?.trim();

  if (!name || !artists) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "name and artists are required" }));
    return;
  }

  try {
    const previewUrl = await resolveTrackPreview(name, artists);
    if (!previewUrl) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "No preview available for this track" }));
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ previewUrl }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Preview lookup failed",
      })
    );
  }
};

const lrclibHandler: Connect.NextHandleFunction = async (req, res, next) => {
  const path = req.url?.split("?")[0];
  if (path !== "/api/lrclib/lyrics") {
    next();
    return;
  }

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const url = new URL(req.url!, `http://${req.headers.host}`);
  const trackName = url.searchParams.get("track_name")?.trim();
  const artistName = url.searchParams.get("artist_name")?.trim();
  const albumName = url.searchParams.get("album_name")?.trim();
  const durationRaw = url.searchParams.get("duration");

  if (!trackName || !artistName || !albumName || !durationRaw) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "track_name, artist_name, album_name, and duration are required",
      })
    );
    return;
  }

  const durationSec = parseFloat(durationRaw);
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
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
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Lyrics not found" }));
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  } catch {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Lyrics service unavailable" }));
  }
};

const handler: Connect.NextHandleFunction = (req, res, next) => {
  spotifySearchHandler(req, res, (err) => {
    if (err) {
      next(err);
      return;
    }
    spotifyPreviewHandler(req, res, (err2) => {
      if (err2) {
        next(err2);
        return;
      }
      lrclibHandler(req, res, next);
    });
  });
};

export default function spotifyPreviewPlugin(): Plugin {
  const applyEnv = (mode: string) => {
    const env = loadEnv(mode, process.cwd(), "");
    Object.assign(process.env, env);
  };

  return {
    name: "spotify-preview",
    config(_, { mode }) {
      applyEnv(mode);
    },
    configureServer(server: ViteDevServer) {
      applyEnv(server.config.mode);
      server.middlewares.use((req, res, next) => {
        applyEnv(server.config.mode);
        return handler(req, res, next);
      });
    },
    configurePreviewServer(server: PreviewServer) {
      applyEnv(server.config.mode);
      server.middlewares.use((req, res, next) => {
        applyEnv(server.config.mode);
        return handler(req, res, next);
      });
    },
  };
}
