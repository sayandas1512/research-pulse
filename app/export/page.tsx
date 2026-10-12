import { Suspense } from "react";
import { listDomainOptions, listIsoWeekOptions, listLogEntries } from "@/src/lib/feedback-repo";
import { buildClientDigestMarkdown } from "@/src/lib/export";
import { buttonClass, Card, EmptyState, PageHeader, PageShell } from "../components/ui";
import CopyButton from "./CopyButton";

interface SearchParams {
  domain?: string;
  week?: string;
}

const SELECT_CLASS =
  "rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]";

async function ExportFilters({ searchParams }: { searchParams: SearchParams }) {
  const [domains, weeks] = await Promise.all([listDomainOptions(), listIsoWeekOptions()]);
  return (
    <Card className="mb-6">
      <form className="flex flex-wrap items-end gap-3 text-sm" method="get">
        <label className="flex flex-col gap-1 text-[var(--muted)]">
          Domain
          <select name="domain" defaultValue={searchParams.domain ?? ""} className={SELECT_CLASS}>
            <option value="">All</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[var(--muted)]">
          Week
          <select name="week" defaultValue={searchParams.week ?? ""} className={SELECT_CLASS}>
            <option value="">All</option>
            {weeks.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonClass("primary")}>
          Filter
        </button>
      </form>
    </Card>
  );
}

async function ExportPreview({ searchParams }: { searchParams: SearchParams }) {
  const rows = await listLogEntries({
    domainId: searchParams.domain || undefined,
    isoWeek: searchParams.week || undefined,
    savedOnly: true,
  });
  const markdown = buildClientDigestMarkdown(rows);

  if (rows.length === 0) {
    return <EmptyState>No saved picks yet — click &quot;Save for client&quot; on a brief item to add it here.</EmptyState>;
  }

  const query = new URLSearchParams();
  if (searchParams.domain) query.set("domain", searchParams.domain);
  if (searchParams.week) query.set("week", searchParams.week);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <CopyButton text={markdown} />
        <a href={`/api/export/client?${query.toString()}`} className={buttonClass("secondary")}>
          Download .md
        </a>
        <span className="text-xs text-[var(--muted)]">
          {rows.length} saved pick{rows.length === 1 ? "" : "s"}
        </span>
      </div>
      <Card className="!p-0">
        <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-[var(--foreground)]">
          {markdown}
        </pre>
      </Card>
    </>
  );
}

async function ExportFiltersResolver({ searchParamsPromise }: { searchParamsPromise: Promise<SearchParams> }) {
  const params = await searchParamsPromise;
  return <ExportFilters searchParams={params} />;
}

async function ExportPreviewResolver({ searchParamsPromise }: { searchParamsPromise: Promise<SearchParams> }) {
  const params = await searchParamsPromise;
  return <ExportPreview searchParams={params} />;
}

export default function ExportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <PageShell maxWidth="4xl">
      <PageHeader
        title="Client export"
        description='Turns everything marked "Save for client" into a ready-to-send digest, grouped by domain.'
      />
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading filters...</p>}>
        <ExportFiltersResolver searchParamsPromise={searchParams} />
      </Suspense>
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading...</p>}>
        <ExportPreviewResolver searchParamsPromise={searchParams} />
      </Suspense>
    </PageShell>
  );
}
