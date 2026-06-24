import {
  deliverComment,
  parseCommentPayload,
} from "../server/comments.js";

type Req = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type Res = {
  status: (code: number) => Res;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
};

const readBody = (req: Req): Record<string, unknown> => {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    return req.body as Record<string, unknown>;
  }

  if (typeof req.body === "string" && req.body.trim()) {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  return {};
};

const getClientIp = (req: Req) => {
  const forwarded = req.headers?.["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return raw?.split(",")[0]?.trim() || "unknown";
};

export default async function handler(req: Req, res: Res) {
  if (req.method !== "POST") {
    res.status(405).setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    const parsed = parseCommentPayload(readBody(req));

    if ("error" in parsed) {
      res.status(400).setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: parsed.error }));
      return;
    }

    await deliverComment(parsed, {
      ip: getClientIp(req),
      userAgent: String(req.headers?.["user-agent"] ?? "unknown"),
    });

    res.status(200).setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save your comment";
    res.status(500).setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: message }));
  }
}
