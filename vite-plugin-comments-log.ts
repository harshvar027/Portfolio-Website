import fs from "node:fs";
import path from "node:path";
import type { Connect, Plugin, ViteDevServer, PreviewServer } from "vite";

const LOG_FILE = path.resolve(process.cwd(), "comments.log");
const MAX_NAME = 100;
const MAX_MESSAGE = 2000;

const readBody = (req: Connect.IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      // Guard against oversized payloads (~64KB).
      if (size > 64 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

const sanitize = (value: unknown, max: number): string =>
  String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, max);

const handler: Connect.NextHandleFunction = async (req, res, next) => {
  if (req.url?.split("?")[0] !== "/api/comments") {
    next();
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    const raw = await readBody(req);
    const parsed = raw ? JSON.parse(raw) : {};

    const name = sanitize(parsed.name, MAX_NAME) || "Anonymous";
    const message = sanitize(parsed.message, MAX_MESSAGE);

    if (!message) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Message is required" }));
      return;
    }

    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";

    const entry =
      JSON.stringify({
        timestamp: new Date().toISOString(),
        name,
        message,
        ip,
        userAgent: req.headers["user-agent"] ?? "unknown",
      }) + "\n";

    fs.appendFileSync(LOG_FILE, entry, "utf-8");

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Bad request",
      })
    );
  }
};

export default function commentsLogPlugin(): Plugin {
  return {
    name: "comments-log",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(handler);
    },
  };
}
