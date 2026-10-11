import Link from "next/link";
import { Suspense } from "react";
import { listBriefs } from "@/src/lib/runs-repo";
import { readTimeMinutes } from "@/src/lib/render";

async function BriefList() {
  const briefs = await listBriefs();
  return (
    <ul className="mt-6 space-y-2">
      {briefs.map((b) => (
        <li key={b.id} className="rounded border border-gray-200 p-3 dark:border-gray-800">
          <Link href={`/brief/${b.isoWeek}`} className="font-medium text-blue-700 hover:underline dark:text-blue-400">
            {b.isoWeek}
          </Link>
          <span className="ml-2 text-xs text-gray-400">
            {b.status} · {readTimeMinutes(b.wordCount)} min read
          </span>
        </li>
      ))}
      {briefs.length === 0 && <p className="text-sm text-gray-500">No briefs yet.</p>}
    </ul>
  );
}

export default function ArchivePage() {
  return (
    <main className="mx-auto max-w-2xl flex-1 p-6">
      <h1 className="text-2xl font-semibold">Archive</h1>
      <p className="mt-1 text-sm text-gray-500">Past weekly briefs.</p>
      <Suspense fallback={<p className="mt-6 text-sm text-gray-500">Loading...</p>}>
        <BriefList />
      </Suspense>
    </main>
  );
}
