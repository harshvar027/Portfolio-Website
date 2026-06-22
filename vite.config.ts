import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import commentsLogPlugin from "./vite-plugin-comments-log";
import spotifyPreviewPlugin from "./vite-plugin-spotify-preview";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), commentsLogPlugin(), spotifyPreviewPlugin()],
  server: {
    // Open http://127.0.0.1:5173 for Spotify OAuth (localhost is blocked by Spotify)
    host: "127.0.0.1",
  },
});
