"use client";

import { useEffect, useState } from "react";
import { Badge } from "./ui";

type DemoPaper = {
  title: string;
  domain: string;
  score: number;
};

const PAPERS: DemoPaper[] = [
  { title: "Scaling Laws for Multi-Agent Coordination", domain: "Multi-agent systems", score: 91 },
  { title: "Benchmarking Long-Context Retrieval in Production LLMs", domain: "Applied AI", score: 84 },
  { title: "A Survey of Prompt-Injection Defenses", domain: "Safety & governance", score: 76 },
  { title: "Efficient Fine-Tuning via Low-Rank Adapters v3", domain: "Model efficiency", score: 38 },
];

const STEP_LABELS = [
  "Scanning this week's papers",
  "Scoring relevance to Kavita's focus areas",
  "Distilling the top picks into a brief",
];

const STEP_MS = 2600;

function scoreTone(score: number): "success" | "accent" | "neutral" {
  if (score >= 85) return "success";
  if (score >= 60) return "accent";
  return "neutral";
}

export default function DataFlowDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const id = setInterval(() => setStep((s) => (s + 1) % 3), STEP_MS);
    return () => clearInterval(id);
  }, []);

  const shortlisted = PAPERS.filter((p) => p.score >= 80);

  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{STEP_LABELS[step]}</p>

      {step < 2 ? (
        <ul className="space-y-2">
          {PAPERS.map((paper, idx) => (
            <li
              key={paper.title}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/60 px-3 py-2 animate-fade-in-up"
              style={{ animationDelay: `${idx * 140}ms` }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-[var(--foreground)]">{paper.title}</p>
                <p className="text-xs text-[var(--muted)]">{paper.domain}</p>
              </div>
              {step === 1 && (
                <span
                  className="shrink-0 animate-fade-in"
                  style={{ animationDelay: `${idx * 140 + 150}ms` }}
                >
                  <Badge tone={scoreTone(paper.score)}>{paper.score}</Badge>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {shortlisted.map((paper, idx) => (
            <li
              key={paper.title}
              className="flex items-start gap-2.5 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-2.5 animate-fade-in-up"
              style={{ animationDelay: `${idx * 120}ms` }}
            >
              <span aria-hidden className="mt-0.5 text-[var(--accent)]">
                ✓
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)]">{paper.title}</p>
                <p className="text-xs text-[var(--muted)]">{paper.domain} · relevance {paper.score}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
