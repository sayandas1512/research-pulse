"use client";

import { useEffect, useState } from "react";
import { buttonClass, Card } from "../components/ui";

interface RecallLevel {
  found: number;
  total: number;
  recall: number | null;
  missingIds: string[];
}

interface BacktestResult {
  windowStart: string;
  windowEnd: string;
  domains: {
    domain: { name: string };
    fetched: number;
    shortlisted: number;
    picked: number;
    error?: string;
  }[];
  recall: { fetched: RecallLevel; shortlisted: RecallLevel; picked: RecallLevel };
}

const INPUT_CLASS =
  "rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]";

function RecallRow({ label, level }: { label: string; level: RecallLevel }) {
  return (
    <tr className="border-b border-[var(--border)] last:border-0">
      <td className="py-2 pr-4 font-medium text-[var(--foreground)]">{label}</td>
      <td className="py-2 pr-4 text-[var(--muted)]">
        {level.total === 0 ? "n/a (no known-important list)" : `${level.found}/${level.total}`}
      </td>
      <td className="py-2 pr-4 text-[var(--foreground)]">{level.recall !== null ? `${(level.recall * 100).toFixed(0)}%` : "—"}</td>
      <td className="py-2 text-xs text-[var(--muted)]">{level.missingIds.join(", ")}</td>
    </tr>
  );
}

export default function BacktestClient() {
  const [weeksAgo, setWeeksAgo] = useState(1);
  const [knownIds, setKnownIds] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!running) return;
    const startedAt = Date.now();
    const interval = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [running]);

  async function handleRun() {
    setElapsedSeconds(0);
    setRunning(true);
    setError(null);
    setResult(null);
    const knownImportantIds = knownIds
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await fetch("/api/admin/backtest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weeksAgo, knownImportantIds }),
    });
    setRunning(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Backtest failed");
      return;
    }
    setResult(await res.json());
  }

  return (
    <div>
      <Card>
        <label className="flex flex-col gap-1 text-sm text-[var(--muted)]">
          Weeks ago
          <select value={weeksAgo} onChange={(e) => setWeeksAgo(Number(e.target.value))} className={`${INPUT_CLASS} w-fit`}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} week{n > 1 ? "s" : ""} ago
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 flex flex-col gap-1 text-sm text-[var(--muted)]">
          Known-important arXiv ids (optional, comma or newline separated)
          <textarea
            value={knownIds}
            onChange={(e) => setKnownIds(e.target.value)}
            rows={3}
            placeholder="2610.12345, 2610.09876"
            className={INPUT_CLASS}
          />
        </label>
        <button onClick={handleRun} disabled={running} className={buttonClass("primary", "mt-3")}>
          {running ? `Running backtest... ${elapsedSeconds}s (8 domains, live arXiv + Gemini calls — can take several minutes)` : "Run backtest"}
        </button>
      </Card>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {result && (
        <Card className="mt-6">
          <p className="text-sm text-[var(--muted)]">
            Window: {result.windowStart} → {result.windowEnd}
          </p>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-[var(--muted)]">
                <th className="pb-2">Funnel level</th>
                <th className="pb-2">Found</th>
                <th className="pb-2">Recall</th>
                <th className="pb-2">Missing ids</th>
              </tr>
            </thead>
            <tbody>
              <RecallRow label="Fetched" level={result.recall.fetched} />
              <RecallRow label="Shortlisted" level={result.recall.shortlisted} />
              <RecallRow label="Picked" level={result.recall.picked} />
            </tbody>
          </table>

          <h2 className="mt-6 text-sm font-medium text-[var(--foreground)]">Per-domain funnel</h2>
          <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
            {result.domains.map((d) => (
              <li key={d.domain.name}>
                <span className="text-[var(--foreground)]">{d.domain.name}</span>: fetched {d.fetched} → shortlisted{" "}
                {d.shortlisted} → picked {d.picked}
                {d.error && <span className="text-red-600 dark:text-red-400"> (error: {d.error})</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
