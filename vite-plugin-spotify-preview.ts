import type { Connect, Plugin, PreviewServer, ViteDevServer } from "vite";
import { loadEnv } from "vite";
import { searchSpotifyPreviews } from "./server/spotifyPreview";

const handler: Connect.NextHandleFunction = async (req, res, next) => {
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
