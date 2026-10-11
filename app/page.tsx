import Link from "next/link";
import { Suspense } from "react";
import { listBriefs } from "@/src/lib/runs-repo";

async function LatestBriefLink() {
  const briefs = await listBriefs();
  const latest = briefs[0];
  return latest ? (
    <Link href={`/brief/${latest.isoWeek}`} className="text-blue-700 hover:underline dark:text-blue-400">
      Latest brief ({latest.isoWeek})
    </Link>
  ) : (
    <span className="text-gray-400">No briefs published yet.</span>
  );
}

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Research Pulse</h1>
        <p className="mt-2 text-sm text-gray-500">
          A weekly AI-research brief, organized by domain, short enough to read in under ten
          minutes. Built for a senior AI-strategy consultant who needs to know what matters
          this week without reading every preprint herself.
        </p>
        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <Suspense fallback={<span className="text-gray-400">Loading...</span>}>
            <LatestBriefLink />
          </Suspense>
          <Link href="/archive" className="text-blue-700 hover:underline dark:text-blue-400">
            Browse the archive
          </Link>
          <Link href="/settings" className="text-gray-400 hover:underline">
            Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
