"use client";

import { useEffect, useState } from "react";

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

function RecallRow({ label, level }: { label: string; level: RecallLevel }) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-900">
      <td className="py-1 pr-4">{label}</td>
      <td className="py-1 pr-4">
        {level.total === 0 ? "n/a (no known-important list)" : `${level.found}/${level.total}`}
      </td>
      <td className="py-1 pr-4">{level.recall !== null ? `${(level.recall * 100).toFixed(0)}%` : "—"}</td>
      <td className="py-1 text-xs text-gray-400">{level.missingIds.join(", ")}</td>
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
    <div className="mt-6">
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          Weeks ago
          <select
            value={weeksAgo}
            onChange={(e) => setWeeksAgo(Number(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} week{n > 1 ? "s" : ""} ago
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 flex flex-col gap-1 text-sm">
        Known-important arXiv ids (optional, comma or newline separated)
        <textarea
          value={knownIds}
          onChange={(e) => setKnownIds(e.target.value)}
          rows={3}
          placeholder="2610.12345, 2610.09876"
          className="rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>
      <button
        onClick={handleRun}
        disabled={running}
        className="mt-3 rounded bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
      >
        {running ? `Running backtest... ${elapsedSeconds}s (8 domains, live arXiv + Gemini calls — can take several minutes)` : "Run backtest"}
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-6 text-sm">
          <p className="text-gray-500">
            Window: {result.windowStart} → {result.windowEnd}
          </p>
          <table className="mt-3 w-full text-left">
            <thead>
              <tr className="text-xs text-gray-400">
                <th className="pb-1">Funnel level</th>
                <th className="pb-1">Found</th>
                <th className="pb-1">Recall</th>
                <th className="pb-1">Missing ids</th>
              </tr>
            </thead>
            <tbody>
              <RecallRow label="Fetched" level={result.recall.fetched} />
              <RecallRow label="Shortlisted" level={result.recall.shortlisted} />
              <RecallRow label="Picked" level={result.recall.picked} />
            </tbody>
          </table>

          <h2 className="mt-6 font-medium">Per-domain funnel</h2>
          <ul className="mt-2 space-y-1">
            {result.domains.map((d) => (
              <li key={d.domain.name}>
                {d.domain.name}: fetched {d.fetched} → shortlisted {d.shortlisted} → picked {d.picked}
                {d.error && <span className="text-red-600"> (error: {d.error})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
