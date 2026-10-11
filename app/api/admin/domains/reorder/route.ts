import { NextResponse } from "next/server";
import { z } from "zod";
import { reorderDomains } from "@/src/lib/domains-repo";

const BodySchema = z.object({ orderedIds: z.array(z.string()).min(1) });

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  await reorderDomains(parsed.data.orderedIds);
  return NextResponse.json({ ok: true });
}
