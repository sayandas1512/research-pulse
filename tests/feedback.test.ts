import { describe, expect, it } from "vitest";
import { parseArxivIdInput, signFeedbackToken, verifyFeedbackToken } from "../src/lib/feedback";

const SECRET = "test-secret-do-not-use-in-prod";

describe("signFeedbackToken / verifyFeedbackToken", () => {
  it("round-trips a valid token", async () => {
    const token = await signFeedbackToken({ brief_item_id: "item-1", kind: "useful" }, SECRET);
    const payload = await verifyFeedbackToken(token, SECRET);
    expect(payload).not.toBeNull();
    expect(payload?.brief_item_id).toBe("item-1");
    expect(payload?.kind).toBe("useful");
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signFeedbackToken({ brief_item_id: "item-1", kind: "useful" }, SECRET);
    const payload = await verifyFeedbackToken(token, "a-different-secret");
    expect(payload).toBeNull();
  });

  it("rejects a tampered payload (kind changed after signing)", async () => {
    const token = await signFeedbackToken({ brief_item_id: "item-1", kind: "useful" }, SECRET);
    const [encodedPayload, signature] = token.split(".");
    const tamperedPayload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    tamperedPayload.kind = "not_relevant";
    const tamperedToken = `${Buffer.from(JSON.stringify(tamperedPayload)).toString("base64url")}.${signature}`;
    const payload = await verifyFeedbackToken(tamperedToken, SECRET);
    expect(payload).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await signFeedbackToken({ brief_item_id: "item-1", kind: "useful" }, SECRET, -1);
    const payload = await verifyFeedbackToken(token, SECRET);
    expect(payload).toBeNull();
  });

  it("rejects a malformed token", async () => {
    expect(await verifyFeedbackToken("not-a-valid-token", SECRET)).toBeNull();
    expect(await verifyFeedbackToken("", SECRET)).toBeNull();
  });
});

describe("parseArxivIdInput", () => {
  it("extracts the id from a full arXiv abs URL", () => {
    expect(parseArxivIdInput("https://arxiv.org/abs/2610.12345")).toBe("2610.12345");
  });

  it("extracts the id from a versioned arXiv abs URL", () => {
    expect(parseArxivIdInput("https://arxiv.org/abs/2610.12345v2")).toBe("2610.12345");
  });

  it("accepts a bare id", () => {
    expect(parseArxivIdInput("2610.12345")).toBe("2610.12345");
  });

  it("strips a trailing version suffix from a bare id", () => {
    expect(parseArxivIdInput("2610.12345v3")).toBe("2610.12345");
  });

  it("returns null for an empty string", () => {
    expect(parseArxivIdInput("")).toBeNull();
  });
});
