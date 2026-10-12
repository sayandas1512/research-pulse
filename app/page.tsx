import Link from "next/link";
import { Suspense } from "react";
import { listBriefs } from "@/src/lib/runs-repo";
import { Card } from "./components/ui";
import { Reveal } from "./components/motion/Reveal";
import { PulseRings } from "./components/motion/PulseRings";
import { Logo } from "./components/Logo";
import DataFlowDemo from "./components/DataFlowDemo";

async function LatestBriefCta() {
  const briefs = await listBriefs();
  const latest = briefs[0];
  if (!latest) return <span className="text-sm text-[var(--muted)]">No briefs published yet — check back Monday.</span>;

  return (
    <>
      <Link
        href={`/brief/${latest.isoWeek}`}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-[var(--accent)] to-indigo-700 px-4 py-2.5 text-sm font-medium text-[var(--accent-foreground)] shadow-lg shadow-[var(--accent)]/25 transition-all duration-150 hover:shadow-xl hover:shadow-[var(--accent)]/35 active:scale-[0.97] sm:w-auto"
      >
        Read the latest brief ({latest.isoWeek})
        <span aria-hidden>→</span>
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
    <main className="flex flex-1 flex-col items-center gap-8 px-6 py-16">
      <Reveal className="w-full max-w-md">
        <Card className="relative overflow-hidden p-8 text-center">
          <div className="relative mx-auto flex h-14 w-14 items-center justify-center">
            <PulseRings />
            <Logo size={56} animated />
          </div>
          <span className="mt-5 inline-block rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
            Welcome back, Kavita
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Research Pulse</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Your weekly AI-research brief, organized by domain, short enough to read in under ten
            minutes — what matters this week, without reading every preprint yourself.
          </p>
          <div className="mt-6 flex flex-col items-center">
            <Suspense fallback={<span className="text-sm text-[var(--muted)]">Loading...</span>}>
              <LatestBriefCta />
            </Suspense>
          </div>
        </Card>
      </Reveal>

      <Reveal className="w-full max-w-md" delay={120}>
        <Card className="p-6">
          <p className="mb-1 text-sm font-semibold text-[var(--foreground)]">How it works</p>
          <p className="mb-4 text-xs leading-relaxed text-[var(--muted)]">
            Each week the pipeline scans new papers, scores them against Kavita&apos;s focus areas, and keeps
            only what&apos;s worth her time.
          </p>
          <DataFlowDemo />
        </Card>
      </Reveal>
    </main>
  );
}
