import { NextResponse } from "next/server";
import { z } from "zod";
import { recordFeedback } from "@/src/lib/feedback-repo";
import { parseArxivIdInput } from "@/src/lib/feedback";

const BodySchema = z.object({ arxivIdOrUrl: z.string().min(1), note: z.string().optional() });

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const arxivId = parseArxivIdInput(parsed.data.arxivIdOrUrl);
  if (!arxivId) return NextResponse.json({ error: "Could not parse an arXiv id from that input" }, { status: 400 });

  await recordFeedback({ briefItemId: null, arxivId, kind: "missed", note: parsed.data.note });
  return NextResponse.json({ ok: true });
}
