const SESSION_COOKIE_NAME = "rp_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

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

/** session token = base64url(exp).signature, where signature = HMAC-SHA256(exp, SESSION_SECRET) */
export async function createSessionToken(secret: string, maxAgeSeconds = SESSION_MAX_AGE_SECONDS): Promise<string> {
  const exp = Date.now() + maxAgeSeconds * 1000;
  const payload = String(exp);
  const signature = await hmacSign(payload, secret);
  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null, secret: string): Promise<boolean> {
  if (!token) return false;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;
  let payload: string;
  try {
    payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  } catch {
    return false;
  }
  const expected = await hmacSign(payload, secret);
  if (!constantTimeEqual(signature, expected)) return false;
  const exp = Number(payload);
  if (!Number.isFinite(exp)) return false;
  return Date.now() < exp;
}

export function checkAdminPassword(candidate: string, adminPassword: string): boolean {
  return constantTimeEqual(candidate, adminPassword);
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };
