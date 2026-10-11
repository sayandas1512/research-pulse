import { Suspense } from "react";
import { connection } from "next/server";
import { listRuns, listRunSteps } from "@/src/lib/runs-repo";
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
    <p className="mt-1 text-sm text-gray-500">
      Production cron fires every Monday at 02:00 UTC ({nextCron.toISOString()} is next). Use{" "}
      <strong>Run now</strong> to trigger the pipeline on demand — same orchestrator, same idempotency,
      no need to wait for Monday.
    </p>
  );
}

async function RunsList() {
  const runs = await listRuns(20);
  const runsWithSteps = await Promise.all(
    runs.map(async (run) => ({
      run,
      steps: await listRunSteps(run.id),
    })),
  );

  return (
    <ul className="mt-6 space-y-4">
      {runsWithSteps.map(({ run, steps }) => {
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
          <li key={run.id} className="rounded border border-gray-200 p-3 text-sm dark:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {run.isoWeek} — {run.status}{" "}
                <span className="text-xs text-gray-400">
                  ({run.trigger}, started {new Date(run.startedAt).toLocaleString()})
                </span>
              </span>
            </div>
            <p className="mt-1 text-gray-500">
              Domains complete: {completeSteps.length}/{steps.length || "?"} · fetched {totals.fetched} →
              shortlisted {totals.shortlisted} → picked {totals.picked}
            </p>
            {failedSteps.length > 0 && (
              <p className="mt-1 text-red-600">
                Failed domains: {failedSteps.map((s) => s.error).filter(Boolean).join("; ")}
              </p>
            )}
            {run.error && <p className="mt-1 text-red-600">Run error: {run.error}</p>}
          </li>
        );
      })}
      {runsWithSteps.length === 0 && <p className="text-sm text-gray-500">No runs yet.</p>}
    </ul>
  );
}

export default function RunsPage() {
  return (
    <main className="mx-auto max-w-4xl flex-1 p-6">
      <h1 className="text-2xl font-semibold">Run health</h1>
      <Suspense fallback={<p className="mt-1 text-sm text-gray-500">Loading...</p>}>
        <NextCronLine />
      </Suspense>

      <div className="mt-4">
        <RunNowButton />
      </div>

      <Suspense fallback={<p className="mt-6 text-sm text-gray-500">Loading...</p>}>
        <RunsList />
      </Suspense>
    </main>
  );
}
