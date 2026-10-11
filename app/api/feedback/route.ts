import { NextResponse } from "next/server";
import { getBriefItemById, recordFeedback } from "@/src/lib/feedback-repo";
import { verifyFeedbackToken, type FeedbackKind } from "@/src/lib/feedback";

const KIND_LABEL: Record<FeedbackKind, string> = {
  useful: "Marked useful",
  not_relevant: "Marked not relevant",
  saved: "Saved for client",
  missed: "Reported as missed",
};

function htmlPage(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>body{font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:80px auto;padding:0 20px;color:#111;text-align:center;}
      a{color:#1d4ed8;}</style></head>
      <body><h1>${title}</h1><p>${body}</p><p><a href="/">Back to Research Pulse</a></p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: Request) {
  const secret = process.env.FEEDBACK_HMAC_SECRET;
  if (!secret) return htmlPage("Server misconfigured", "Missing FEEDBACK_HMAC_SECRET.", 500);

  const url = new URL(request.url);
  const token = url.searchParams.get("t");
  if (!token) return htmlPage("Invalid link", "This feedback link is missing its token.", 400);

  const payload = await verifyFeedbackToken(token, secret);
  if (!payload) {
    return htmlPage("Link expired or invalid", "This feedback link is no longer valid.", 400);
  }

  const item = await getBriefItemById(payload.brief_item_id);
  if (!item) return htmlPage("Not found", "This paper's entry could not be found.", 404);

  await recordFeedback({ briefItemId: item.id, arxivId: item.arxivId, kind: payload.kind });

  return htmlPage(KIND_LABEL[payload.kind], "Thanks — your feedback has been recorded.");
}
