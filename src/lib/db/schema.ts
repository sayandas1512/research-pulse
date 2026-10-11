import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const runTypeEnum = pgEnum("run_type", ["weekly", "backtest"]);
export const runTriggerEnum = pgEnum("run_trigger", ["cron", "manual", "backtest"]);
export const runStatusEnum = pgEnum("run_status", ["queued", "running", "continuing", "complete", "partial", "failed"]);
export const briefStatusEnum = pgEnum("brief_status", ["saved", "sent", "send_failed"]);
export const feedbackKindEnum = pgEnum("feedback_kind", ["useful", "not_relevant", "saved", "missed"]);
export const stepStatusEnum = pgEnum("step_status", ["queued", "running", "complete", "failed", "skipped"]);

export const domains = pgTable("domains", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  arxivCategories: text("arxiv_categories").array().notNull().default(sql`'{}'::text[]`),
  includeKeywords: text("include_keywords").array().notNull().default(sql`'{}'::text[]`),
  excludeKeywords: text("exclude_keywords").array().notNull().default(sql`'{}'::text[]`),
  significanceNote: text("significance_note").notNull().default(""),
  weightOverrides: jsonb("weight_overrides").$type<Record<string, number>>(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const papers = pgTable("papers", {
  arxivId: text("arxiv_id").primaryKey(),
  title: text("title").notNull(),
  abstract: text("abstract").notNull(),
  authors: jsonb("authors").$type<string[]>().notNull(),
  categories: text("categories").array().notNull().default(sql`'{}'::text[]`),
  primaryCategory: text("primary_category").notNull(),
  comment: text("comment"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  absUrl: text("abs_url").notNull(),
  pdfUrl: text("pdf_url").notNull(),
  codeUrl: text("code_url"),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  isoWeek: text("iso_week").notNull(),
  type: runTypeEnum("type").notNull().default("weekly"),
  trigger: runTriggerEnum("trigger").notNull(),
  status: runStatusEnum("status").notNull().default("queued"),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  stats: jsonb("stats").$type<Record<string, unknown>>(),
  error: text("error"),
});

export const runSteps = pgTable("run_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  domainId: uuid("domain_id").references(() => domains.id, { onDelete: "set null" }),
  step: text("step").notNull(),
  status: stepStatusEnum("status").notNull().default("queued"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  counts: jsonb("counts").$type<Record<string, number>>(),
  error: text("error"),
});

export const candidates = pgTable(
  "candidates",
  {
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    domainId: uuid("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    arxivId: text("arxiv_id")
      .notNull()
      .references(() => papers.arxivId, { onDelete: "cascade" }),
    signals: jsonb("signals").$type<Record<string, unknown>>().notNull(),
    rankScore: real("rank_score").notNull(),
    rank: integer("rank").notNull(),
    shortlisted: boolean("shortlisted").notNull().default(false),
    verdict: jsonb("verdict").$type<Record<string, unknown>>(),
  },
  (table) => [primaryKey({ columns: [table.runId, table.domainId, table.arxivId] })],
);

export const briefs = pgTable(
  "briefs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    isoWeek: text("iso_week").notNull(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    headline: text("headline"),
    html: text("html").notNull(),
    wordCount: integer("word_count").notNull(),
    status: briefStatusEnum("status").notNull().default("saved"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("briefs_iso_week_unique").on(table.isoWeek)],
);

export const briefItems = pgTable("brief_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  briefId: uuid("brief_id")
    .notNull()
    .references(() => briefs.id, { onDelete: "cascade" }),
  domainId: uuid("domain_id")
    .notNull()
    .references(() => domains.id, { onDelete: "cascade" }),
  arxivId: text("arxiv_id")
    .notNull()
    .references(() => papers.arxivId, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  significance: integer("significance").notNull(),
  paperType: text("paper_type").notNull(),
  evidenceStrength: text("evidence_strength").notNull(),
  soWhat: text("so_what").notNull(),
  caveat: text("caveat").notNull(),
  action: text("action").notNull(),
  aiAvailable: boolean("ai_available").notNull().default(true),
  model: text("model"),
  promptVersion: text("prompt_version"),
});

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    briefItemId: uuid("brief_item_id").references(() => briefItems.id, { onDelete: "cascade" }),
    arxivId: text("arxiv_id").notNull(),
    kind: feedbackKindEnum("kind").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("feedback_item_kind_unique").on(table.briefItemId, table.kind)],
);

export const authorCache = pgTable("author_cache", {
  authorKey: text("author_key").primaryKey(),
  hIndex: integer("h_index"),
  worksCount: integer("works_count"),
  source: text("source").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

export const httpCache = pgTable("http_cache", {
  key: text("key").primaryKey(),
  body: jsonb("body").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});
