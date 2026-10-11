import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteDomain, updateDomain } from "@/src/lib/domains-repo";

const DomainUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  arxivCategories: z.array(z.string()).optional(),
  includeKeywords: z.array(z.string()).optional(),
  excludeKeywords: z.array(z.string()).optional(),
  significanceNote: z.string().optional(),
  weightOverrides: z.record(z.string(), z.number()).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = DomainUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid domain payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const domain = await updateDomain(id, parsed.data);
  if (!domain) return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  return NextResponse.json({ domain });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteDomain(id);
  if (!ok) return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
