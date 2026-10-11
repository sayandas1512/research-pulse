import { NextResponse } from "next/server";
import { z } from "zod";
import { createDomain, listDomains } from "@/src/lib/domains-repo";

const DomainInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  arxivCategories: z.array(z.string()).default([]),
  includeKeywords: z.array(z.string()).default([]),
  excludeKeywords: z.array(z.string()).default([]),
  significanceNote: z.string().default(""),
  weightOverrides: z.record(z.string(), z.number()).optional(),
  active: z.boolean().default(true),
});

export async function GET() {
  const domains = await listDomains();
  return NextResponse.json({ domains });
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = DomainInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid domain payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const domain = await createDomain(parsed.data);
  return NextResponse.json({ domain }, { status: 201 });
}
