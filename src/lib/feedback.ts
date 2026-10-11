export type FeedbackKind = "useful" | "not_relevant" | "saved" | "missed";

export interface FeedbackPayload {
  brief_item_id: string;
  kind: FeedbackKind;
  exp: number;
}

function toBase64Url(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString("base64url");
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(signature);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const DEFAULT_TTL_SECONDS = 180 * 24 * 60 * 60; // 180 days — links in old emails should still work.

/** token = base64url(JSON payload).signature, signature = HMAC-SHA256(payload, FEEDBACK_HMAC_SECRET) */
export async function signFeedbackToken(
  payload: Omit<FeedbackPayload, "exp">,
  secret: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<string> {
  const full: FeedbackPayload = { ...payload, exp: Date.now() + ttlSeconds * 1_000 };
  const json = JSON.stringify(full);
  const encodedPayload = Buffer.from(json).toString("base64url");
  const signature = await hmacSign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export async function verifyFeedbackToken(token: string, secret: string): Promise<FeedbackPayload | null> {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;
  const expected = await hmacSign(encodedPayload, secret);
  if (!constantTimeEqual(signature, expected)) return null;
  let payload: FeedbackPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
  if (!payload.brief_item_id || !payload.kind) return null;
  return payload;
}

export async function buildFeedbackUrl(
  appUrl: string,
  briefItemId: string,
  kind: Exclude<FeedbackKind, "missed">,
  secret: string,
): Promise<string> {
  const token = await signFeedbackToken({ brief_item_id: briefItemId, kind }, secret);
  return `${appUrl}/api/feedback?t=${encodeURIComponent(token)}`;
}

/** Extracts a bare arXiv id from either a raw id (e.g. "2610.12345") or a full arXiv URL. */
export function parseArxivIdInput(input: string): string | null {
  const trimmed = input.trim();
  const urlMatch = /arxiv\.org\/abs\/([a-zA-Z0-9.\-/]+?)(v\d+)?\/?$/.exec(trimmed);
  if (urlMatch) return urlMatch[1];
  if (/^[a-zA-Z0-9.\-/]+$/.test(trimmed) && trimmed.length > 0) return trimmed.replace(/v\d+$/, "");
  return null;
}
