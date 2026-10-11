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
    <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="arXiv id or URL"
        className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
      />
      <button
        type="submit"
        disabled={status === "submitting" || !value}
        className="rounded bg-gray-900 px-3 py-1 text-xs text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
      >
        {status === "submitting" ? "Sending..." : "Report missed paper"}
      </button>
      {status === "done" && <span className="self-center text-xs text-green-600">Thanks — logged.</span>}
      {status === "error" && <span className="self-center text-xs text-red-600">Couldn&apos;t parse that id/URL.</span>}
    </form>
  );
}
