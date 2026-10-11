import { Suspense } from "react";
import { listDomainOptions, listIsoWeekOptions, listLogEntries } from "@/src/lib/feedback-repo";
import { Badge, buttonClass, Card, PageHeader, PageShell } from "../components/ui";

interface SearchParams {
  domain?: string;
  action?: string;
  week?: string;
  saved?: string;
}

const SELECT_CLASS =
  "rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]";

const ACTION_TONE = { read: "accent", skim: "neutral", flag_for_client: "solid" } as const;

const FEEDBACK_LABEL: Record<string, string> = { useful: "Useful", not_relevant: "Not relevant", saved: "Saved" };
const FEEDBACK_TONE = { useful: "success", not_relevant: "danger", saved: "accent" } as const;

async function LogFilters({ searchParams }: { searchParams: SearchParams }) {
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
          Action
          <select name="action" defaultValue={searchParams.action ?? ""} className={SELECT_CLASS}>
            <option value="">All</option>
            <option value="read">Read</option>
            <option value="skim">Skim</option>
            <option value="flag_for_client">Flag for client</option>
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
        <label className="flex items-center gap-1.5 pb-1.5 text-[var(--foreground)]">
          <input type="checkbox" name="saved" value="1" defaultChecked={searchParams.saved === "1"} />
          Saved only
        </label>
        <button type="submit" className={buttonClass("primary")}>
          Filter
        </button>
        <a
          href={`/api/log/export?${new URLSearchParams(searchParams as Record<string, string>).toString()}`}
          className={buttonClass("secondary")}
        >
          Export CSV
        </a>
      </form>
    </Card>
  );
}

async function LogTable({ searchParams }: { searchParams: SearchParams }) {
  const rows = await listLogEntries({
    domainId: searchParams.domain || undefined,
    action: searchParams.action || undefined,
    isoWeek: searchParams.week || undefined,
    savedOnly: searchParams.saved === "1",
  });

  return (
    <Card className="overflow-x-auto !p-0">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-xs text-[var(--muted)]">
            <th className="px-4 py-3">Week</th>
            <th className="px-4 py-3">Domain</th>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Significance</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Feedback</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.item.id} className="border-b border-[var(--border)] last:border-0">
              <td className="px-4 py-2.5 text-[var(--muted)]">{row.isoWeek}</td>
              <td className="px-4 py-2.5 text-[var(--muted)]">{row.domainName}</td>
              <td className="px-4 py-2.5">
                <a href={row.paper.absUrl} className="text-[var(--foreground)] hover:text-[var(--accent)]">
                  {row.paper.title}
                </a>
              </td>
              <td className="px-4 py-2.5 text-[var(--foreground)]">{row.item.significance}</td>
              <td className="px-4 py-2.5">
                <Badge tone={ACTION_TONE[row.item.action as keyof typeof ACTION_TONE] ?? "neutral"}>
                  {row.item.action}
                </Badge>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {row.feedbackKinds.length === 0 && <span className="text-xs text-[var(--muted)]">—</span>}
                  {row.feedbackKinds.map((kind) => (
                    <Badge key={kind} tone={FEEDBACK_TONE[kind as keyof typeof FEEDBACK_TONE] ?? "neutral"}>
                      {FEEDBACK_LABEL[kind] ?? kind}
                    </Badge>
                  ))}
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">
                No entries match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}

async function LogFiltersResolver({ searchParamsPromise }: { searchParamsPromise: Promise<SearchParams> }) {
  const params = await searchParamsPromise;
  return <LogFilters searchParams={params} />;
}

async function LogTableResolver({ searchParamsPromise }: { searchParamsPromise: Promise<SearchParams> }) {
  const params = await searchParamsPromise;
  return <LogTable searchParams={params} />;
}

export default function LogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <PageShell maxWidth="4xl">
      <PageHeader title="Paper log" description="Every paper that has appeared in a brief, searchable and exportable." />
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading filters...</p>}>
        <LogFiltersResolver searchParamsPromise={searchParams} />
      </Suspense>
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading...</p>}>
        <LogTableResolver searchParamsPromise={searchParams} />
      </Suspense>
    </PageShell>
  );
}
