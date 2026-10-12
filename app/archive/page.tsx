import Link from "next/link";
import { Suspense } from "react";
import { listBriefs } from "@/src/lib/runs-repo";
import { readTimeMinutes } from "@/src/lib/render";
import { Badge, Card, EmptyState, PageHeader, PageShell } from "../components/ui";
import { Reveal } from "../components/motion/Reveal";

const STATUS_TONE = { sent: "success", saved: "accent", send_failed: "danger" } as const;

async function BriefList() {
  const briefs = await listBriefs();
  if (briefs.length === 0) return <EmptyState>No briefs published yet.</EmptyState>;

  return (
    <ul className="space-y-3">
      {briefs.map((b, idx) => (
        <Reveal as="li" key={b.id} delay={Math.min(idx * 40, 300)}>
          <Link href={`/brief/${b.isoWeek}`} className="group block">
            <Card className="flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-4">
                <span className="w-12 font-mono text-xs text-[var(--muted)]">№ {briefs.length - idx}</span>
                <span className="font-serif text-2xl leading-none text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)]">
                  {b.isoWeek}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--muted)]">{readTimeMinutes(b.wordCount)} min read</span>
                <Badge tone={STATUS_TONE[b.status as keyof typeof STATUS_TONE] ?? "neutral"}>{b.status}</Badge>
                <span aria-hidden className="text-[var(--muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--accent)]">→</span>
              </div>
            </Card>
          </Link>
        </Reveal>
      ))}
    </ul>
  );
}

export default function ArchivePage() {
  return (
    <PageShell>
      <PageHeader kicker="Read · The back catalogue" title="Archive" description="Every weekly brief Research Pulse has sent, newest first." />
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading...</p>}>
        <BriefList />
      </Suspense>
    </PageShell>
  );
}
