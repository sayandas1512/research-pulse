import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getBriefWithItemsDetailed, listRunSteps } from "@/src/lib/runs-repo";
import { readTimeMinutes } from "@/src/lib/render";
import { Badge, Card, EmptyState, Kicker, Label, PageShell } from "../../components/ui";
import { Reveal } from "../../components/motion/Reveal";
import FeedbackButtons from "./FeedbackButtons";
import MissedPaperForm from "./MissedPaperForm";

const ACTION_TONE = { read: "accent", skim: "neutral", flag_for_client: "solid", skip: "neutral" } as const;

const ACTION_LABEL: Record<string, string> = {
  read: "Read",
  skim: "Skim",
  flag_for_client: "Flag for client",
  skip: "Skip",
};

const CLAIM_CHECK_LABEL: Record<string, string> = {
  yes: "Supported",
  partial: "Partially supported",
  no: "Not supported",
  unclear: "Unclear",
};

const CLAIM_CHECK_TONE = { yes: "success", partial: "warning", no: "danger", unclear: "neutral" } as const;

const BRIEF_STATUS_TONE = { sent: "success", saved: "accent", send_failed: "danger" } as const;

async function BriefContent({ isoWeek }: { isoWeek: string }) {
  const data = await getBriefWithItemsDetailed(isoWeek);
  if (!data) notFound();

  const { brief, items } = data;
  const byDomain = new Map<string, typeof items>();
  for (const row of items) {
    const list = byDomain.get(row.domainName) ?? [];
    list.push(row);
    byDomain.set(row.domainName, list);
  }

  const steps = await listRunSteps(brief.runId);
  const coverageByDomainId = new Map(
    steps.map((s) => [s.domainId, (s.counts as Record<string, number> | null) ?? {}]),
  );
  const coverageByDomainName = new Map<string, { scanned: number; shortlisted: number }>();
  for (const row of items) {
    if (coverageByDomainName.has(row.domainName)) continue;
    const counts = coverageByDomainId.get(row.item.domainId) ?? {};
    coverageByDomainName.set(row.domainName, { scanned: counts.fetched ?? 0, shortlisted: counts.shortlisted ?? 0 });
  }

  return (
    <>
      <div className="mb-12 border-b border-[var(--rule)] pb-8">
        <Kicker>
          The weekly brief · {readTimeMinutes(brief.wordCount)} min read · {items.length} picks
        </Kicker>
        <div className="flex flex-wrap items-end gap-3">
          <h1 className="font-serif text-5xl leading-none tracking-tight">
            Week <em className="text-[var(--accent)]">{isoWeek}</em>
          </h1>
          <Badge tone={BRIEF_STATUS_TONE[brief.status as keyof typeof BRIEF_STATUS_TONE] ?? "neutral"}>
            {brief.status}
          </Badge>
        </div>
        {brief.headline && (
          <blockquote className="mt-6 whitespace-pre-line border-l-2 border-[var(--accent)] pl-5 font-serif text-xl leading-snug text-[var(--foreground)]">
            {brief.headline}
          </blockquote>
        )}
      </div>

      <div className="space-y-10">
        {[...byDomain.entries()].map(([domainName, rows]) => (
          <section key={domainName}>
            <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-[var(--border)] pb-2">
              <h2 className="font-serif text-2xl leading-tight">{domainName}</h2>
              <p className="text-xs text-[var(--muted)]">
                Scanned {coverageByDomainName.get(domainName)?.scanned ?? 0}, shortlisted{" "}
                {coverageByDomainName.get(domainName)?.shortlisted ?? 0}, shown {rows.length}
              </p>
            </div>
            <ul className="space-y-3">
              {rows.map((row, idx) => (
                <Reveal as="li" key={row.item.id} delay={Math.min(idx * 50, 300)}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <a
                        href={row.paper.absUrl}
                        className="font-serif text-xl leading-snug text-[var(--foreground)] hover:text-[var(--accent)]"
                      >
                        {row.paper.title}
                      </a>
                      <Badge tone={ACTION_TONE[row.item.action as keyof typeof ACTION_TONE] ?? "neutral"}>
                        {ACTION_LABEL[row.item.action] ?? row.item.action}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {(row.paper.authors as string[]).slice(0, 3).join(", ")}
                      {(row.paper.authors as string[]).length > 3 ? " et al." : ""}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]">{row.item.soWhat}</p>
                    <p className="mt-1.5 text-xs text-[var(--muted)]">Caveat: {row.item.caveat}</p>
                    {row.item.claimCheck && (
                      <div className="mt-2 flex items-start gap-2">
                        <Badge tone={CLAIM_CHECK_TONE[row.item.claimCheck.supported as keyof typeof CLAIM_CHECK_TONE] ?? "neutral"}>
                          Claim check: {CLAIM_CHECK_LABEL[row.item.claimCheck.supported] ?? row.item.claimCheck.supported}
                        </Badge>
                        <p className="text-xs text-[var(--muted)]">
                          ({row.item.claimCheck.usedFullText ? "full text" : "abstract only"}) {row.item.claimCheck.note}
                        </p>
                      </div>
                    )}
                    <Suspense fallback={null}>
                      <FeedbackButtons briefItemId={row.item.id} />
                    </Suspense>
                  </Card>
                </Reveal>
              ))}
            </ul>
          </section>
        ))}
        {items.length === 0 && <EmptyState>No picks were significant this week.</EmptyState>}
      </div>

      <Card className="mt-10">
        <Label>Missed something this week?</Label>
        <p className="mt-1 text-sm text-[var(--foreground)]">Report a paper by its arXiv id or URL.</p>
        <MissedPaperForm />
      </Card>

      <p className="mt-6 text-xs text-[var(--muted)]">
        Preprints, not peer reviewed unless noted. Summaries are AI-generated from abstracts.
      </p>
    </>
  );
}

export default function BriefPage({ params }: { params: Promise<{ isoWeek: string }> }) {
  return (
    <PageShell>
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading...</p>}>
        <BriefContentResolver paramsPromise={params} />
      </Suspense>
    </PageShell>
  );
}

async function BriefContentResolver({ paramsPromise }: { paramsPromise: Promise<{ isoWeek: string }> }) {
  const { isoWeek } = await paramsPromise;
  return <BriefContent isoWeek={isoWeek} />;
}
