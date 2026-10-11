import { Suspense } from "react";
import { connection } from "next/server";
import { listRuns, listRunSteps } from "@/src/lib/runs-repo";
import { getFeedbackStats } from "@/src/lib/feedback-repo";
import { Badge, Card, EmptyState, PageHeader, PageShell } from "../components/ui";
import RunNowButton from "./RunNowButton";

function nextMondayTwoAmUtc(from: Date): Date {
  const next = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 2, 0, 0, 0));
  const dayOfWeek = next.getUTCDay(); // 0=Sun..6=Sat
  let daysUntilMonday = (1 - dayOfWeek + 7) % 7;
  if (daysUntilMonday === 0 && from.getTime() >= next.getTime()) daysUntilMonday = 7;
  next.setUTCDate(next.getUTCDate() + daysUntilMonday);
  return next;
}

async function NextCronLine() {
  await connection();
  const nextCron = nextMondayTwoAmUtc(new Date());
  return (
    <p className="text-sm text-[var(--muted)]">
      Production cron fires every Monday at 02:00 UTC ({nextCron.toISOString()} is next). Use{" "}
      <strong className="text-[var(--foreground)]">Run now</strong> to trigger the pipeline on demand —
      same orchestrator, same idempotency, no need to wait for Monday.
    </p>
  );
}

async function FeedbackSummary() {
  const stats = await getFeedbackStats();
  return (
    <Card className="mt-4 flex flex-wrap items-center gap-3 text-sm">
      <span className="text-[var(--foreground)]">
        {stats.useful} useful · {stats.notRelevant} not relevant · {stats.saved} saved for client ·{" "}
        {stats.missed} reported missed
      </span>
      <Badge tone="accent">
        {stats.usefulPickRate !== null ? `${(stats.usefulPickRate * 100).toFixed(0)}% useful-pick rate` : "Not enough feedback yet"}
      </Badge>
    </Card>
  );
}

const RUN_STATUS_TONE = {
  complete: "success",
  running: "accent",
  continuing: "warning",
  partial: "warning",
  failed: "danger",
  queued: "neutral",
} as const;

async function RunsList() {
  const runs = await listRuns(20);
  const runsWithSteps = await Promise.all(
    runs.map(async (run) => ({
      run,
      steps: await listRunSteps(run.id),
    })),
  );

  if (runsWithSteps.length === 0) return <EmptyState>No runs yet.</EmptyState>;

  return (
    <ul className="space-y-3">
      {runsWithSteps.map(({ run, steps }, idx) => {
        const completeSteps = steps.filter((s) => s.status === "complete");
        const failedSteps = steps.filter((s) => s.status === "failed");
        const totals = completeSteps.reduce(
          (acc, s) => {
            const counts = (s.counts as Record<string, number>) ?? {};
            acc.fetched += counts.fetched ?? 0;
            acc.shortlisted += counts.shortlisted ?? 0;
            acc.picked += counts.picked ?? 0;
            return acc;
          },
          { fetched: 0, shortlisted: 0, picked: 0 },
        );

        return (
          <li key={run.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(idx * 40, 300)}ms` }}>
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--foreground)]">{run.isoWeek}</span>
                  <Badge tone={RUN_STATUS_TONE[run.status as keyof typeof RUN_STATUS_TONE] ?? "neutral"}>
                    {run.status}
                  </Badge>
                </div>
                <span className="text-xs text-[var(--muted)]">
                  {run.trigger}, started {new Date(run.startedAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Domains complete: {completeSteps.length}/{steps.length || "?"} · fetched {totals.fetched} →
                shortlisted {totals.shortlisted} → picked {totals.picked}
              </p>
              {failedSteps.length > 0 && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  Failed domains: {failedSteps.map((s) => s.error).filter(Boolean).join("; ")}
                </p>
              )}
              {run.error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">Run error: {run.error}</p>}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

export default function RunsPage() {
  return (
    <PageShell maxWidth="4xl">
      <PageHeader title="Run health" />
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading...</p>}>
        <NextCronLine />
      </Suspense>

      <div className="mt-4">
        <RunNowButton />
      </div>

      <Suspense fallback={null}>
        <FeedbackSummary />
      </Suspense>

      <div className="mt-6">
        <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading...</p>}>
          <RunsList />
        </Suspense>
      </div>
    </PageShell>
  );
}
