CREATE TYPE "public"."brief_status" AS ENUM('saved', 'sent', 'send_failed');--> statement-breakpoint
CREATE TYPE "public"."feedback_kind" AS ENUM('useful', 'not_relevant', 'saved', 'missed');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('queued', 'running', 'continuing', 'complete', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."run_trigger" AS ENUM('cron', 'manual', 'backtest');--> statement-breakpoint
CREATE TYPE "public"."run_type" AS ENUM('weekly', 'backtest');--> statement-breakpoint
CREATE TYPE "public"."step_status" AS ENUM('queued', 'running', 'complete', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "author_cache" (
	"author_key" text PRIMARY KEY NOT NULL,
	"h_index" integer,
	"works_count" integer,
	"source" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brief_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_id" uuid NOT NULL,
	"domain_id" uuid NOT NULL,
	"arxiv_id" text NOT NULL,
	"position" integer NOT NULL,
	"significance" integer NOT NULL,
	"paper_type" text NOT NULL,
	"evidence_strength" text NOT NULL,
	"so_what" text NOT NULL,
	"caveat" text NOT NULL,
	"action" text NOT NULL,
	"ai_available" boolean DEFAULT true NOT NULL,
	"model" text,
	"prompt_version" text
);
--> statement-breakpoint
CREATE TABLE "briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iso_week" text NOT NULL,
	"run_id" uuid NOT NULL,
	"headline" text,
	"html" text NOT NULL,
	"word_count" integer NOT NULL,
	"status" "brief_status" DEFAULT 'saved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"run_id" uuid NOT NULL,
	"domain_id" uuid NOT NULL,
	"arxiv_id" text NOT NULL,
	"signals" jsonb NOT NULL,
	"rank_score" real NOT NULL,
	"rank" integer NOT NULL,
	"shortlisted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "candidates_run_id_domain_id_arxiv_id_pk" PRIMARY KEY("run_id","domain_id","arxiv_id")
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"arxiv_categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"include_keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"exclude_keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"significance_note" text DEFAULT '' NOT NULL,
	"weight_overrides" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_item_id" uuid,
	"arxiv_id" text NOT NULL,
	"kind" "feedback_kind" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "http_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"body" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "papers" (
	"arxiv_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"abstract" text NOT NULL,
	"authors" jsonb NOT NULL,
	"categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"primary_category" text NOT NULL,
	"comment" text,
	"published_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"abs_url" text NOT NULL,
	"pdf_url" text NOT NULL,
	"code_url" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"domain_id" uuid,
	"step" text NOT NULL,
	"status" "step_status" DEFAULT 'queued' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"counts" jsonb,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iso_week" text NOT NULL,
	"type" "run_type" DEFAULT 'weekly' NOT NULL,
	"trigger" "run_trigger" NOT NULL,
	"status" "run_status" DEFAULT 'queued' NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"stats" jsonb,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "brief_items" ADD CONSTRAINT "brief_items_brief_id_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."briefs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brief_items" ADD CONSTRAINT "brief_items_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brief_items" ADD CONSTRAINT "brief_items_arxiv_id_papers_arxiv_id_fk" FOREIGN KEY ("arxiv_id") REFERENCES "public"."papers"("arxiv_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "briefs" ADD CONSTRAINT "briefs_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_arxiv_id_papers_arxiv_id_fk" FOREIGN KEY ("arxiv_id") REFERENCES "public"."papers"("arxiv_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_brief_item_id_brief_items_id_fk" FOREIGN KEY ("brief_item_id") REFERENCES "public"."brief_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_steps" ADD CONSTRAINT "run_steps_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_steps" ADD CONSTRAINT "run_steps_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "briefs_iso_week_unique" ON "briefs" USING btree ("iso_week");--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_item_kind_unique" ON "feedback" USING btree ("brief_item_id","kind");