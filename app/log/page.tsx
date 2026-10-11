import { Suspense } from "react";
import { listDomainOptions, listIsoWeekOptions, listLogEntries } from "@/src/lib/feedback-repo";

interface SearchParams {
  domain?: string;
  action?: string;
  week?: string;
  saved?: string;
}

async function LogFilters({ searchParams }: { searchParams: SearchParams }) {
  const [domains, weeks] = await Promise.all([listDomainOptions(), listIsoWeekOptions()]);
  return (
    <form className="mt-4 flex flex-wrap items-end gap-3 text-sm" method="get">
      <label className="flex flex-col gap-1">
        Domain
        <select name="domain" defaultValue={searchParams.domain ?? ""} className="rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900">
          <option value="">All</option>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        Action
        <select name="action" defaultValue={searchParams.action ?? ""} className="rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900">
          <option value="">All</option>
          <option value="read">Read</option>
          <option value="skim">Skim</option>
          <option value="flag_for_client">Flag for client</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        Week
        <select name="week" defaultValue={searchParams.week ?? ""} className="rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900">
          <option value="">All</option>
          {weeks.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1">
        <input type="checkbox" name="saved" value="1" defaultChecked={searchParams.saved === "1"} />
        Saved only
      </label>
      <button type="submit" className="rounded bg-gray-900 px-3 py-1.5 text-white dark:bg-gray-100 dark:text-gray-900">
        Filter
      </button>
      <a
        href={`/api/log/export?${new URLSearchParams(searchParams as Record<string, string>).toString()}`}
        className="rounded border border-gray-300 px-3 py-1.5 dark:border-gray-700"
      >
        Export CSV
      </a>
    </form>
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
    <div className="mt-6 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs text-gray-400 dark:border-gray-800">
            <th className="py-2 pr-3">Week</th>
            <th className="py-2 pr-3">Domain</th>
            <th className="py-2 pr-3">Title</th>
            <th className="py-2 pr-3">Significance</th>
            <th className="py-2 pr-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.item.id} className="border-b border-gray-100 dark:border-gray-900">
              <td className="py-2 pr-3 text-gray-400">{row.isoWeek}</td>
              <td className="py-2 pr-3">{row.domainName}</td>
              <td className="py-2 pr-3">
                <a href={row.paper.absUrl} className="text-blue-700 hover:underline dark:text-blue-400">
                  {row.paper.title}
                </a>
              </td>
              <td className="py-2 pr-3">{row.item.significance}</td>
              <td className="py-2 pr-3">{row.item.action}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-gray-400">
                No entries match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
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
    <main className="mx-auto max-w-4xl flex-1 p-6">
      <h1 className="text-2xl font-semibold">Paper log</h1>
      <p className="mt-1 text-sm text-gray-500">Every paper that has appeared in a brief, searchable and exportable.</p>
      <Suspense fallback={<p className="mt-4 text-sm text-gray-500">Loading filters...</p>}>
        <LogFiltersResolver searchParamsPromise={searchParams} />
      </Suspense>
      <Suspense fallback={<p className="mt-6 text-sm text-gray-500">Loading...</p>}>
        <LogTableResolver searchParamsPromise={searchParams} />
      </Suspense>
    </main>
  );
}
