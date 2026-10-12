"use client";

import { useState } from "react";

type Kind = "useful" | "not_relevant" | "saved";

const LABELS: Record<Kind, string> = { useful: "Useful", not_relevant: "Not relevant", saved: "Save for client" };

const BUTTON_CLASS =
  "rounded-md border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:shadow-sm active:translate-y-0 disabled:pointer-events-none disabled:opacity-60";

export default function FeedbackButtonsClient({ urls }: { urls: Record<Kind, string> }) {
  const [sentKinds, setSentKinds] = useState<Set<Kind>>(new Set());
  const [pending, setPending] = useState<Kind | null>(null);
  const [toast, setToast] = useState<{ title: string; ok: boolean } | null>(null);

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>, kind: Kind) {
    e.preventDefault();
    if (pending || sentKinds.has(kind)) return;
    setPending(kind);
    try {
      const res = await fetch(urls[kind]);
      const html = await res.text();
      const title = html.match(/<h1>(.*?)<\/h1>/)?.[1] ?? (res.ok ? "Feedback recorded" : "Something went wrong");
      setToast({ title, ok: res.ok });
      if (res.ok) setSentKinds((s) => new Set(s).add(kind));
    } catch {
      setToast({ title: "Network error — try again", ok: false });
    } finally {
      setPending(null);
      window.setTimeout(() => setToast(null), 5000);
    }
  }

  return (
    <>
      <div className="mt-3 flex gap-2 border-t border-[var(--border)] pt-3">
        {(Object.keys(urls) as Kind[]).map((kind) => (
          <a
            key={kind}
            href={urls[kind]}
            aria-disabled={pending === kind}
            onClick={(e) => handleClick(e, kind)}
            className={`${BUTTON_CLASS} ${sentKinds.has(kind) ? "border-[var(--accent)] text-[var(--accent)]" : ""}`}
          >
            {sentKinds.has(kind) ? `✓ ${LABELS[kind]}` : pending === kind ? "Sending..." : LABELS[kind]}
          </a>
        ))}
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 left-1/2 z-50 w-[min(92vw,380px)] -translate-x-1/2 animate-fade-in-up rounded-xl border px-4 py-3 text-sm shadow-lg ${
            toast.ok ? "border-[var(--accent)]/40 bg-[var(--surface)] text-[var(--foreground)]" : "border-red-300 bg-[var(--surface)] text-red-600"
          }`}
        >
          <p className="font-medium">{toast.title}</p>
          {toast.ok && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              See it anytime on{" "}
              <a href="/runs" className="text-[var(--accent)] hover:underline">
                Run health
              </a>{" "}
              or{" "}
              <a href="/log" className="text-[var(--accent)] hover:underline">
                Log
              </a>
              .
            </p>
          )}
        </div>
      )}
    </>
  );
}
