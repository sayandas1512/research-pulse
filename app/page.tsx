import Link from "next/link";
import { Suspense } from "react";
import { listBriefs } from "@/src/lib/runs-repo";
import { buttonClass, Card } from "./components/ui";

async function LatestBriefCta() {
  const briefs = await listBriefs();
  const latest = briefs[0];
  if (!latest) return <span className="text-sm text-[var(--muted)]">No briefs published yet — check back Monday.</span>;

  return (
    <>
      <Link href={`/brief/${latest.isoWeek}`} className={buttonClass("primary", "w-full sm:w-auto")}>
        Read the latest brief ({latest.isoWeek})
      </Link>
      {briefs.length > 1 && (
        <Link href="/archive" className="mt-3 text-sm text-[var(--muted)] hover:text-[var(--accent)] hover:underline">
          or see all {briefs.length} past briefs
        </Link>
      )}
    </>
  );
}

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md animate-fade-in-up p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)] text-base font-bold text-[var(--accent-foreground)]">
          RP
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Research Pulse</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          A weekly AI-research brief, organized by domain, short enough to read in under ten
          minutes. Built for a senior AI-strategy consultant who needs to know what matters
          this week without reading every preprint herself.
        </p>
        <div className="mt-6 flex flex-col items-center">
          <Suspense fallback={<span className="text-sm text-[var(--muted)]">Loading...</span>}>
            <LatestBriefCta />
          </Suspense>
        </div>
      </Card>
    </main>
  );
}
