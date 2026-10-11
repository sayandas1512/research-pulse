import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "./db/client";
import { briefItems, feedback, papers } from "./db/schema";
import type { FeedbackKind } from "./feedback";

export async function getBriefItemById(id: string) {
  const db = getDb();
  const [item] = await db.select().from(briefItems).where(eq(briefItems.id, id));
  return item ?? null;
}

/** Idempotent: a repeat click on the same link just no-ops (unique on brief_item_id + kind). */
export async function recordFeedback(input: {
  briefItemId: string | null;
  arxivId: string;
  kind: FeedbackKind;
  note?: string;
}) {
  const db = getDb();
  if (input.briefItemId) {
    await db
      .insert(feedback)
      .values({ briefItemId: input.briefItemId, arxivId: input.arxivId, kind: input.kind, note: input.note })
      .onConflictDoNothing();
  } else {
    // "missed" feedback has no brief_item_id; the unique index is on (brief_item_id, kind),
    // which doesn't dedupe null brief_item_id rows — that's fine, each missed-paper report is distinct.
    await db.insert(feedback).values({ briefItemId: null, arxivId: input.arxivId, kind: input.kind, note: input.note });
  }
}

export interface FeedbackStats {
  useful: number;
  notRelevant: number;
  saved: number;
  missed: number;
  usefulPickRate: number | null;
}

export async function getFeedbackStats(): Promise<FeedbackStats> {
  const db = getDb();
  const rows = await db
    .select({ kind: feedback.kind, count: sql<number>`count(*)::int` })
    .from(feedback)
    .groupBy(feedback.kind);
  const byKind: Record<string, number> = {};
  for (const row of rows) byKind[row.kind] = row.count;
  const useful = byKind.useful ?? 0;
  const notRelevant = byKind.not_relevant ?? 0;
  const saved = byKind.saved ?? 0;
  const missed = byKind.missed ?? 0;
  const denom = useful + notRelevant;
  return { useful, notRelevant, saved, missed, usefulPickRate: denom > 0 ? useful / denom : null };
}

export interface LogFilters {
  domainId?: string;
  action?: string;
  isoWeek?: string;
  savedOnly?: boolean;
}

export async function listLogEntries(filters: LogFilters = {}) {
  const db = getDb();
  const { briefs, domains } = await import("./db/schema");

  const conditions = [];
  if (filters.domainId) conditions.push(eq(briefItems.domainId, filters.domainId));
  if (filters.action) conditions.push(eq(briefItems.action, filters.action));
  if (filters.isoWeek) conditions.push(eq(briefs.isoWeek, filters.isoWeek));

  const rows = await db
    .select({
      item: briefItems,
      paper: papers,
      domainName: domains.name,
      isoWeek: briefs.isoWeek,
    })
    .from(briefItems)
    .innerJoin(papers, eq(briefItems.arxivId, papers.arxivId))
    .innerJoin(domains, eq(briefItems.domainId, domains.id))
    .innerJoin(briefs, eq(briefItems.briefId, briefs.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(briefs.isoWeek), briefItems.position);

  const itemIds = rows.map((r) => r.item.id);
  const feedbackRows =
    itemIds.length > 0
      ? await db
          .select({ briefItemId: feedback.briefItemId, kind: feedback.kind })
          .from(feedback)
          .where(inArray(feedback.briefItemId, itemIds))
      : [];
  const feedbackByItemId = new Map<string, FeedbackKind[]>();
  for (const f of feedbackRows) {
    if (!f.briefItemId) continue;
    const list = feedbackByItemId.get(f.briefItemId) ?? [];
    list.push(f.kind);
    feedbackByItemId.set(f.briefItemId, list);
  }
  const withFeedback = rows.map((r) => ({ ...r, feedbackKinds: feedbackByItemId.get(r.item.id) ?? [] }));

  if (!filters.savedOnly) return withFeedback;
  return withFeedback.filter((r) => r.feedbackKinds.includes("saved"));
}

export async function listDomainOptions() {
  const db = getDb();
  const { domains } = await import("./db/schema");
  return db.select({ id: domains.id, name: domains.name }).from(domains).orderBy(domains.sortOrder);
}

export async function listIsoWeekOptions() {
  const db = getDb();
  const { briefs } = await import("./db/schema");
  const rows = await db.selectDistinct({ isoWeek: briefs.isoWeek }).from(briefs).orderBy(desc(briefs.isoWeek));
  return rows.map((r) => r.isoWeek);
}
