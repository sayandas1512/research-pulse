import Link from "next/link";
import { Suspense } from "react";
import { getBriefWithItemsDetailed, getLatestBriefSummary, listBriefs } from "@/src/lib/runs-repo";
import { readTimeMinutes } from "@/src/lib/render";
import { Card, Kicker } from "./components/ui";
import { Reveal } from "./components/motion/Reveal";
import { SplitHeadline } from "./components/motion/SplitHeadline";
import { CountUp } from "./components/motion/CountUp";
import { Magnetic } from "./components/motion/Magnetic";
import { AmbientBackground } from "./components/motion/AmbientBackground";
import { Scribble } from "./components/motion/Scribble";
import { Ticker } from "./components/motion/Ticker";
import DataFlowDemo from "./components/DataFlowDemo";
import DemoReel from "./components/DemoReel";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="border-l border-[var(--rule)] pl-4">
      <CountUp value={value} className="block font-mono text-3xl font-light leading-none tracking-tight text-[var(--foreground)] sm:text-4xl" />
      <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</span>
    </div>
  );
}

/** This week's paper titles, scrolling across the top of the home page. */
async function HeadlineTicker() {
  const [latest] = await listBriefs();
  if (!latest) return null;
  const detailed = await getBriefWithItemsDetailed(latest.isoWeek);
  if (!detailed) return null;
  const items = detailed.items.map(({ paper, domainName }) => ({ label: domainName, title: paper.title }));
  return <Ticker items={items} href={`/brief/${latest.isoWeek}`} />;
}

async function LatestBrief() {
  const summary = await getLatestBriefSummary();
  if (!summary) {
    return (
      <p className="mt-10 text-sm text-[var(--muted)]">No briefs published yet. The first one arrives Monday morning.</p>
    );
  }
  const { brief, issueNumber } = summary;

  return (
    <>
      <Reveal delay={500} className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Stat value={summary.fetched} label="Papers scanned" />
        <Stat value={summary.shortlisted} label="Shortlisted" />
        <Stat value={summary.picked} label="Picked for you" />
        <Stat value={summary.domains} label="Domains" />
      </Reveal>

      <Reveal delay={650} className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Magnetic>
          <Link
            href={`/brief/${brief.isoWeek}`}
            className="group inline-flex items-center gap-2 rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-[var(--background)] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
          >
            Read issue № {issueNumber}
            <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </Magnetic>
        <span className="text-sm text-[var(--muted)]">
          {brief.isoWeek} · {readTimeMinutes(brief.wordCount)} min read ·{" "}
          <Link href="/archive" className="underline decoration-[var(--rule)] underline-offset-4 hover:text-[var(--accent)]">
            all past issues
          </Link>
        </span>
      </Reveal>

      {brief.headline && (
        <Reveal as="figure" delay={150} className="mt-20">
          <Kicker>This week, in one paragraph</Kicker>
          <blockquote className="whitespace-pre-line border-l-2 border-[var(--accent)] pl-6 font-serif text-xl leading-snug text-[var(--foreground)] sm:text-2xl">
            {brief.headline}
          </blockquote>
        </Reveal>
      )}
    </>
  );
}

const STEPS = [
  ["Scan", "Every Monday, new arXiv papers for each of your domains are pulled in, with signals from Hugging Face, Semantic Scholar and GitHub."],
  ["Score", "Each shortlisted paper is scored 0–10 for significance to your work; only papers scoring 6 or more can make the brief."],
  ["Distil", "The top picks become a short brief: the so-what, the caveat, and whether to read, skim or flag it for a client."],
] as const;

export default function HomePage() {
  return (
    <main className="flex-1">
      <Suspense fallback={null}>
        <HeadlineTicker />
      </Suspense>
      <section className="relative isolate overflow-hidden px-6 pb-40 pt-14 lg:px-12 lg:pt-24">
        <AmbientBackground />
        <div className="mx-auto max-w-4xl">
          <Kicker>Research Pulse · Your weekly AI-research brief</Kicker>
          <SplitHeadline className="font-serif text-6xl leading-[0.95] tracking-tight text-[var(--foreground)] sm:text-7xl lg:text-8xl">
            Welcome back,{" "}
            <Scribble delay={1100}>
              <em className="text-[var(--accent)]">Kavita.</em>
            </Scribble>
          </SplitHeadline>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
            What matters in AI research this week, sorted by domain and short enough to read in under ten minutes,
            so you never have to wade through every preprint yourself.
          </p>
          <Suspense fallback={<p className="mt-12 text-sm text-[var(--muted)]">Loading this week&apos;s numbers…</p>}>
            <LatestBrief />
          </Suspense>
        </div>
      </section>

      <section className="border-t border-[var(--rule)] px-6 py-20 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <Kicker>See it in action</Kicker>
            <h2 className="mb-10 font-serif text-4xl leading-[1.05] tracking-tight">
              A week of research, <em>distilled</em>.
            </h2>
          </Reveal>
          <DemoReel />
        </div>
      </section>

      <section className="border-t border-[var(--rule)] px-6 py-20 lg:px-12">
        <div className="mx-auto grid max-w-4xl items-start gap-10 md:grid-cols-[1fr_1.15fr]">
          <Reveal>
            <Kicker>How it works</Kicker>
            <h2 className="font-serif text-4xl leading-[1.05] tracking-tight">
              From hundreds of preprints to a{" "}
              <Scribble variant="circle">
                <em>ten-minute</em>
              </Scribble>{" "}
              read.
            </h2>
            <ol className="mt-8 space-y-6">
              {STEPS.map(([title, body], i) => (
                <li key={title} className="flex gap-4">
                  <span className="font-mono text-xs text-[var(--accent)]">0{i + 1}</span>
                  <div>
                    <p className="font-serif text-xl leading-none">{title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal delay={150}>
            <Card tilt className="p-6">
              <DataFlowDemo />
            </Card>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
