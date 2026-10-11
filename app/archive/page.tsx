import Link from "next/link";
import { Suspense } from "react";
import { listBriefs } from "@/src/lib/runs-repo";
import { readTimeMinutes } from "@/src/lib/render";
import { Badge, Card, EmptyState, PageHeader, PageShell } from "../components/ui";

const STATUS_TONE = { sent: "success", saved: "accent", send_failed: "danger" } as const;

async function BriefList() {
  const briefs = await listBriefs();
  if (briefs.length === 0) return <EmptyState>No briefs published yet.</EmptyState>;

  return (
    <ul className="space-y-3">
      {briefs.map((b) => (
        <li key={b.id}>
          <Card className="flex items-center justify-between transition-colors hover:border-[var(--accent)]">
            <Link href={`/brief/${b.isoWeek}`} className="font-medium text-[var(--foreground)] hover:text-[var(--accent)]">
              {b.isoWeek}
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--muted)]">{readTimeMinutes(b.wordCount)} min read</span>
              <Badge tone={STATUS_TONE[b.status as keyof typeof STATUS_TONE] ?? "neutral"}>{b.status}</Badge>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export default function ArchivePage() {
  return (
    <PageShell>
      <PageHeader title="Archive" description="Every weekly brief Research Pulse has sent, newest first." />
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading...</p>}>
        <BriefList />
      </Suspense>
    </PageShell>
  );
}
