export const MAX_COMMENT_NAME = 100;
export const MAX_COMMENT_MESSAGE = 2000;

export type CommentPayload = {
  name: string;
  message: string;
};

export type CommentMeta = {
  ip: string;
  userAgent: string;
};

export const sanitizeCommentField = (value: unknown, max: number): string =>
  String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, max);

export const parseCommentPayload = (
  body: Record<string, unknown> | null | undefined
): CommentPayload | { error: string } => {
  const name =
    sanitizeCommentField(body?.name, MAX_COMMENT_NAME) || "Anonymous";
  const message = sanitizeCommentField(body?.message, MAX_COMMENT_MESSAGE);

  if (!message) {
    return { error: "Message is required" };
  }

  return { name, message };
};

export const buildCommentEntry = (
  payload: CommentPayload,
  meta: CommentMeta
) => ({
  timestamp: new Date().toISOString(),
  name: payload.name,
  message: payload.message,
  ip: meta.ip,
  userAgent: meta.userAgent,
});

export const deliverComment = async (
  payload: CommentPayload,
  meta: CommentMeta
): Promise<void> => {
  const entry = buildCommentEntry(payload, meta);
  const webhookUrl = process.env.COMMENTS_WEBHOOK_URL?.trim();

  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "New portfolio comment",
            color: 0x9b6dff,
            fields: [
              { name: "Name", value: payload.name, inline: true },
              { name: "Message", value: payload.message },
            ],
            footer: { text: `IP: ${meta.ip}` },
            timestamp: entry.timestamp,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error("Comment delivery failed");
    }
    return;
  }

  console.info("[comments]", JSON.stringify(entry));
};
