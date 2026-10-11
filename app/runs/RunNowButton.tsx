"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonClass } from "../components/ui";

export default function RunNowButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!running) return;
    const startedAt = Date.now();
    const interval = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [running]);

  async function handleClick(force: boolean) {
    setElapsedSeconds(0);
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
    <div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleClick(false)}
          disabled={running}
          title="Can take several minutes for all 8 domains — each one does a live arXiv fetch and a live Gemini call"
          className={buttonClass("primary")}
        >
          {running ? `Running... ${elapsedSeconds}s` : "Run now"}
        </button>
        <button
          onClick={() => handleClick(true)}
          disabled={running}
          title="Force a new run even if this week's brief was already sent"
          className={buttonClass("secondary")}
        >
          Force re-run
        </button>
        {result && <span className="text-sm text-[var(--muted)]">{result}</span>}
      </div>
      {running && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Processing domains one at a time against live data — a full run across all 8 domains
          typically takes several minutes. If it exceeds the time budget it will report
          &quot;continuing&quot; and finish in a follow-up invocation automatically; refresh this
          page in a bit to see progress.
        </p>
      )}
    </div>
  );
}
