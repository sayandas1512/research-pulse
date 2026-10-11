import { NextResponse } from "next/server";
import { z } from "zod";
import { getDomain } from "@/src/lib/domains-repo";
import { weeklyWindow } from "@/src/lib/iso-week";
import { runDomainPipeline } from "@/src/lib/pipeline";
import type { DomainConfig } from "@/src/lib/types";

const InlineDomainSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  arxivCategories: z.array(z.string()).min(1),
  includeKeywords: z.array(z.string()).default([]),
  excludeKeywords: z.array(z.string()).default([]),
  significanceNote: z.string().default(""),
  weightOverrides: z.record(z.string(), z.number()).optional(),
});

const BodySchema = z.union([
  z.object({ domainId: z.string().min(1) }),
  z.object({ domain: InlineDomainSchema }),
]);

export async function POST(request: Request) {
  const contactEmail = process.env.CONTACT_EMAIL;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL;
  if (!contactEmail || !geminiApiKey || !geminiModel) {
    return NextResponse.json({ error: "Server misconfigured: missing required env vars" }, { status: 500 });
  }

  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  let domain: DomainConfig;
  if ("domainId" in parsed.data) {
    const found = await getDomain(parsed.data.domainId);
    if (!found) return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    domain = found;
  } else {
    domain = { id: "preview-unsaved", active: true, sortOrder: 0, ...parsed.data.domain };
  }

  const window = weeklyWindow(new Date());
  const result = await runDomainPipeline(domain, window, {
    contactEmail,
    geminiApiKey,
    geminiModel,
    s2ApiKey: process.env.S2_API_KEY,
    githubToken: process.env.GITHUB_TOKEN,
  });

  return NextResponse.json({
    domain: { id: domain.id, name: domain.name },
    funnel: result.funnel,
    aiAvailable: result.aiAvailable,
    error: result.error,
    shortlist: result.judged.map((c) => ({
      arxivId: c.paper.arxivId,
      title: c.paper.title,
      absUrl: c.paper.absUrl,
      rank: c.rank,
      rankScore: c.rankScore,
      signals: c.signals,
      verdict: c.verdict,
    })),
    picks: result.picks.map((p) => ({
      arxivId: p.paper.arxivId,
      title: p.paper.title,
      significance: p.verdict.significance,
      action: p.verdict.action,
      soWhat: p.verdict.soWhat,
    })),
    closestMiss: result.closestMiss
      ? {
          title: result.closestMiss.paper.title,
          significance: result.closestMiss.verdict?.significance ?? null,
        }
      : null,
  });
}
