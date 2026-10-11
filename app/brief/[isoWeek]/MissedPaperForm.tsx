"use client";

import { useState } from "react";

export default function MissedPaperForm() {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    const res = await fetch("/api/feedback/missed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arxivIdOrUrl: value }),
    });
    setStatus(res.ok ? "done" : "error");
    if (res.ok) setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="arXiv id or URL"
        className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
      />
      <button
        type="submit"
        disabled={status === "submitting" || !value}
        className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-foreground)] disabled:opacity-50"
      >
        {status === "submitting" ? "Sending..." : "Report missed paper"}
      </button>
      {status === "done" && <span className="self-center text-xs text-emerald-600 dark:text-emerald-400">Thanks — logged.</span>}
      {status === "error" && <span className="self-center text-xs text-red-600 dark:text-red-400">Couldn&apos;t parse that id/URL.</span>}
    </form>
  );
}
