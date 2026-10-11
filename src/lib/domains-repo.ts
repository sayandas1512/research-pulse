import { asc, eq } from "drizzle-orm";
import { getDb } from "./db/client";
import { domains } from "./db/schema";
import type { DomainConfig } from "./types";

type DomainRow = typeof domains.$inferSelect;

function toDomainConfig(row: DomainRow): DomainConfig {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    arxivCategories: row.arxivCategories,
    includeKeywords: row.includeKeywords,
    excludeKeywords: row.excludeKeywords,
    significanceNote: row.significanceNote,
    weightOverrides: row.weightOverrides ?? undefined,
    active: row.active,
    sortOrder: row.sortOrder,
  };
}

export async function listDomains(activeOnly = false): Promise<DomainConfig[]> {
  const db = getDb();
  const rows = activeOnly
    ? await db.select().from(domains).where(eq(domains.active, true)).orderBy(asc(domains.sortOrder))
    : await db.select().from(domains).orderBy(asc(domains.sortOrder));
  return rows.map(toDomainConfig);
}

export async function getDomain(id: string): Promise<DomainConfig | null> {
  const db = getDb();
  const [row] = await db.select().from(domains).where(eq(domains.id, id));
  return row ? toDomainConfig(row) : null;
}

export interface DomainInput {
  name: string;
  description: string;
  arxivCategories: string[];
  includeKeywords: string[];
  excludeKeywords: string[];
  significanceNote: string;
  weightOverrides?: Record<string, number>;
  active: boolean;
}

export async function createDomain(input: DomainInput): Promise<DomainConfig> {
  const db = getDb();
  const existing = await db.select({ sortOrder: domains.sortOrder }).from(domains);
  const nextSortOrder = existing.length === 0 ? 0 : Math.max(...existing.map((d) => d.sortOrder)) + 1;
  const [row] = await db
    .insert(domains)
    .values({ ...input, weightOverrides: input.weightOverrides ?? null, sortOrder: nextSortOrder })
    .returning();
  return toDomainConfig(row);
}

export async function updateDomain(id: string, input: Partial<DomainInput>): Promise<DomainConfig | null> {
  const db = getDb();
  const [row] = await db
    .update(domains)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(domains.id, id))
    .returning();
  return row ? toDomainConfig(row) : null;
}

export async function deleteDomain(id: string): Promise<boolean> {
  const db = getDb();
  const result = await db.delete(domains).where(eq(domains.id, id)).returning({ id: domains.id });
  return result.length > 0;
}

export async function reorderDomains(orderedIds: string[]): Promise<void> {
  const db = getDb();
  await Promise.all(orderedIds.map((id, index) => db.update(domains).set({ sortOrder: index }).where(eq(domains.id, id))));
}
