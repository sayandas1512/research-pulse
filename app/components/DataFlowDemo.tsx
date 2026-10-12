"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Badge } from "./ui";

type DemoPaper = {
  title: string;
  domain: string;
  score: number;
};

const PAPERS: DemoPaper[] = [
  { title: "Scaling Laws for Multi-Agent Coordination", domain: "Multi-agent systems", score: 9 },
  { title: "Benchmarking Long-Context Retrieval in Production LLMs", domain: "Applied AI", score: 8 },
  { title: "A Survey of Prompt-Injection Defenses", domain: "Safety & governance", score: 7 },
  { title: "Efficient Fine-Tuning via Low-Rank Adapters v3", domain: "Model efficiency", score: 4 },
];

const STEP_LABELS = [
  "Scanning this week's papers",
  "Scoring significance, 0–10 (6+ makes the cut)",
  "Distilling the top picks into a brief",
];

const STEP_MS = 2600;

function scoreTone(score: number): "success" | "accent" | "neutral" {
  if (score >= 8) return "success";
  if (score >= 6) return "accent";
  return "neutral";
}

export default function DataFlowDemo() {
  const [step, setStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrubRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const id = setInterval(() => setStep((s) => (s + 1) % 3), STEP_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      const label = container.querySelector(".demo-label");
      const items = container.querySelectorAll(".demo-item");

      if (reduceMotion) {
        if (label) gsap.set(label, { opacity: 1 });
        gsap.set(items, { opacity: 1, y: 0 });
        if (scrubRef.current) gsap.set(scrubRef.current, { width: "100%" });
        return;
      }

      if (label) gsap.fromTo(label, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(items, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.07, ease: "power2.out" });
      if (scrubRef.current) {
        gsap.fromTo(scrubRef.current, { width: "0%" }, { width: "100%", duration: STEP_MS / 1000, ease: "none" });
      }
    }, container);

    return () => ctx.revert();
  }, [step]);

  const shortlisted = PAPERS.filter((p) => p.score >= 6);

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[var(--accent)]" />
          <p className="demo-label font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">{STEP_LABELS[step]}</p>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">{step + 1}/3</span>
      </div>

      {step < 2 ? (
        <ul className="space-y-2">
          {PAPERS.map((paper) => (
            <li
              key={paper.title}
              className="demo-item flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-[var(--foreground)]">{paper.title}</p>
                <p className="text-xs text-[var(--muted)]">{paper.domain}</p>
              </div>
              {step === 1 && <Badge tone={scoreTone(paper.score)}>{paper.score}/10</Badge>}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {shortlisted.map((paper) => (
            <li
              key={paper.title}
              className="demo-item flex items-start gap-2.5 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-2.5"
            >
              <span aria-hidden className="mt-0.5 text-[var(--accent)]">
                ✓
              </span>
              <div className="min-w-0">
                <p className="font-serif text-base leading-snug text-[var(--foreground)]">{paper.title}</p>
                <p className="text-xs text-[var(--muted)]">{paper.domain} · significance {paper.score}/10</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-[var(--border)]">
        <div ref={scrubRef} className="h-full rounded-full bg-[var(--accent)]" />
      </div>
    </div>
  );
}
