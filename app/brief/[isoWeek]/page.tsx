import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getBriefWithItemsDetailed } from "@/src/lib/runs-repo";
import { readTimeMinutes } from "@/src/lib/render";
import FeedbackButtons from "./FeedbackButtons";
import MissedPaperForm from "./MissedPaperForm";

const ACTION_LABEL: Record<string, string> = {
  read: "Read",
  skim: "Skim",
  flag_for_client: "Flag for client",
  skip: "Skip",
};

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

  return (
    <>
      <h1 className="text-2xl font-semibold">Research Pulse — {isoWeek}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {readTimeMinutes(brief.wordCount)} min read · {brief.status}
      </p>
      {brief.headline && <p className="mt-4 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{brief.headline}</p>}

      <div className="mt-6 space-y-8">
        {[...byDomain.entries()].map(([domainName, rows]) => (
          <section key={domainName}>
            <h2 className="text-lg font-semibold">{domainName}</h2>
            <ul className="mt-2 space-y-4">
              {rows.map((row) => (
                <li key={row.item.id} className="border-t border-gray-100 pt-3 dark:border-gray-800">
                  <a
                    href={row.paper.absUrl}
                    className="font-medium text-blue-700 hover:underline dark:text-blue-400"
                  >
                    {row.paper.title}
                  </a>
                  <p className="text-xs text-gray-400">
                    {(row.paper.authors as string[]).slice(0, 3).join(", ")}
                    {(row.paper.authors as string[]).length > 3 ? " et al." : ""}
                  </p>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{row.item.soWhat}</p>
                  <p className="text-xs text-gray-400">Caveat: {row.item.caveat}</p>
                  <span className="mt-2 inline-block rounded bg-gray-900 px-2 py-0.5 text-xs text-white dark:bg-gray-100 dark:text-gray-900">
                    {ACTION_LABEL[row.item.action] ?? row.item.action}
                  </span>
                  <Suspense fallback={null}>
                    <FeedbackButtons briefItemId={row.item.id} />
                  </Suspense>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-500">No picks were significant this week.</p>}
      </div>

      <div className="mt-10 border-t border-gray-100 pt-4 dark:border-gray-800">
        <p className="text-sm font-medium">Missed something in this week&apos;s brief?</p>
        <MissedPaperForm />
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Preprints, not peer reviewed unless noted. Summaries are AI-generated from abstracts.
      </p>
    </>
  );
}

export default function BriefPage({ params }: { params: Promise<{ isoWeek: string }> }) {
  return (
    <main className="mx-auto max-w-2xl flex-1 p-6">
      <Suspense fallback={<p className="text-sm text-gray-500">Loading...</p>}>
        <BriefContentResolver paramsPromise={params} />
      </Suspense>
    </main>
  );
}

async function BriefContentResolver({ paramsPromise }: { paramsPromise: Promise<{ isoWeek: string }> }) {
  const { isoWeek } = await paramsPromise;
  return <BriefContent isoWeek={isoWeek} />;
}
