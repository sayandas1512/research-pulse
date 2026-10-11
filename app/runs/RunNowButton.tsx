"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RunNowButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick(force: boolean) {
    setRunning(true);
    setResult(null);
    const res = await fetch("/api/admin/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force }),
    });
    const data = await res.json();
    setRunning(false);
    setResult(res.ok ? `Status: ${data.status}` : `Error: ${data.error}`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleClick(false)}
        disabled={running}
        className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
      >
        {running ? "Running..." : "Run now"}
      </button>
      <button
        onClick={() => handleClick(true)}
        disabled={running}
        title="Force a new run even if this week's brief was already sent"
        className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-700"
      >
        Force re-run
      </button>
      {result && <span className="text-sm text-gray-500">{result}</span>}
    </div>
  );
}
