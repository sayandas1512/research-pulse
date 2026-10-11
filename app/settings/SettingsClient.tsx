"use client";

import { useEffect, useState } from "react";
import type { Action, EvidenceStrength, PaperType } from "@/src/lib/types";
import { Badge, buttonClass, Card } from "../components/ui";

interface DomainConfig {
  id: string;
  name: string;
  description: string;
  arxivCategories: string[];
  includeKeywords: string[];
  excludeKeywords: string[];
  significanceNote: string;
  active: boolean;
  sortOrder: number;
}

interface FormState {
  name: string;
  description: string;
  arxivCategories: string;
  includeKeywords: string;
  excludeKeywords: string;
  significanceNote: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  arxivCategories: "",
  includeKeywords: "",
  excludeKeywords: "",
  significanceNote: "",
};

function toForm(d: DomainConfig): FormState {
  return {
    name: d.name,
    description: d.description,
    arxivCategories: d.arxivCategories.join(", "),
    includeKeywords: d.includeKeywords.join(", "),
    excludeKeywords: d.excludeKeywords.join(", "),
    significanceNote: d.significanceNote,
  };
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function formToPayload(form: FormState) {
  return {
    name: form.name,
    description: form.description,
    arxivCategories: splitCsv(form.arxivCategories),
    includeKeywords: splitCsv(form.includeKeywords),
    excludeKeywords: splitCsv(form.excludeKeywords),
    significanceNote: form.significanceNote,
  };
}

interface PreviewShortlistItem {
  arxivId: string;
  title: string;
  absUrl: string;
  rank: number;
  rankScore: number;
  verdict: {
    significance: number;
    paperType: PaperType;
    evidenceStrength: EvidenceStrength;
    soWhat: string;
    caveat: string;
    action: Action;
  } | null;
}

interface PreviewResult {
  domain: { id: string; name: string };
  funnel: { fetched: number; afterExcludes: number; shortlisted: number; picked: number };
  aiAvailable: boolean;
  error?: string;
  shortlist: PreviewShortlistItem[];
  picks: { arxivId: string; title: string; significance: number; action: Action; soWhat: string }[];
  closestMiss: { title: string; significance: number | null } | null;
}

const INPUT_CLASS =
  "rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]";

function DomainFormFields({ form, onChange }: { form: FormState; onChange: (f: FormState) => void }) {
  return (
    <div className="grid gap-2">
      <input
        className={INPUT_CLASS}
        placeholder="Name"
        value={form.name}
        onChange={(e) => onChange({ ...form, name: e.target.value })}
      />
      <input
        className={INPUT_CLASS}
        placeholder="Description"
        value={form.description}
        onChange={(e) => onChange({ ...form, description: e.target.value })}
      />
      <input
        className={INPUT_CLASS}
        placeholder="arXiv categories (comma-separated, e.g. cs.AI, cs.CL)"
        value={form.arxivCategories}
        onChange={(e) => onChange({ ...form, arxivCategories: e.target.value })}
      />
      <input
        className={INPUT_CLASS}
        placeholder="Include keywords (comma-separated)"
        value={form.includeKeywords}
        onChange={(e) => onChange({ ...form, includeKeywords: e.target.value })}
      />
      <input
        className={INPUT_CLASS}
        placeholder="Exclude keywords (comma-separated)"
        value={form.excludeKeywords}
        onChange={(e) => onChange({ ...form, excludeKeywords: e.target.value })}
      />
      <textarea
        className={INPUT_CLASS}
        placeholder="Significance note — what counts as significant in this domain"
        rows={2}
        value={form.significanceNote}
        onChange={(e) => onChange({ ...form, significanceNote: e.target.value })}
      />
    </div>
  );
}

function PreviewPanel({ result }: { result: PreviewResult }) {
  return (
    <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm">
      <div className="font-medium text-[var(--foreground)]">
        Funnel — fetched {result.funnel.fetched} → after excludes {result.funnel.afterExcludes} → shortlisted{" "}
        {result.funnel.shortlisted} → picked {result.funnel.picked}
      </div>
      {!result.aiAvailable && (
        <p className="mt-1 text-amber-700 dark:text-amber-400">AI unavailable: {result.error}</p>
      )}
      {result.picks.length === 0 ? (
        <p className="mt-2 text-[var(--muted)]">
          Nothing significant this week.
          {result.closestMiss && ` Closest miss: "${result.closestMiss.title}" (significance=${result.closestMiss.significance ?? "-"})`}
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {result.picks.map((p) => (
            <li key={p.arxivId}>
              <span className="font-medium text-[var(--foreground)]">[{p.significance}]</span> {p.title} ({p.action})
              <p className="text-[var(--muted)]">{p.soWhat}</p>
            </li>
          ))}
        </ul>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer text-[var(--muted)]">Full shortlist ({result.shortlist.length})</summary>
        <ul className="mt-2 space-y-1">
          {result.shortlist.map((c) => (
            <li key={c.arxivId}>
              #{c.rank} [{c.rankScore.toFixed(1)}] {c.title}
              {c.verdict && ` — significance=${c.verdict.significance}, action=${c.verdict.action}`}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export default function SettingsClient() {
  const [domains, setDomains] = useState<DomainConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(EMPTY_FORM);

  const [draftOpen, setDraftOpen] = useState(false);
  const [draftDescription, setDraftDescription] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [previewResults, setPreviewResults] = useState<Record<string, PreviewResult>>({});
  const [previewElapsedSeconds, setPreviewElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!previewLoadingId) return;
    const startedAt = Date.now();
    const interval = setInterval(() => setPreviewElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [previewLoadingId]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/domains");
    const data = await res.json();
    setDomains(data.domains ?? []);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/domains");
      const data = await res.json();
      if (!cancelled) {
        setDomains(data.domains ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formToPayload(addForm)),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create domain");
      return;
    }
    setAddForm(EMPTY_FORM);
    setAddOpen(false);
    await load();
  }

  async function handleEditSave(id: string) {
    setError(null);
    const res = await fetch(`/api/admin/domains/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formToPayload(editForm)),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save domain");
      return;
    }
    setEditingId(null);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this domain? This cannot be undone.")) return;
    await fetch(`/api/admin/domains/${id}`, { method: "DELETE" });
    await load();
  }

  async function handleToggleActive(d: DomainConfig) {
    await fetch(`/api/admin/domains/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !d.active }),
    });
    await load();
  }

  async function handleReorder(id: string, direction: -1 | 1) {
    const sorted = [...domains].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sorted.findIndex((d) => d.id === id);
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= sorted.length) return;
    [sorted[index], sorted[swapWith]] = [sorted[swapWith], sorted[index]];
    await fetch("/api/admin/domains/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: sorted.map((d) => d.id) }),
    });
    await load();
  }

  async function handleDraft() {
    setDraftLoading(true);
    setDraftError(null);
    const res = await fetch("/api/admin/domain-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: draftDescription }),
    });
    setDraftLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDraftError(data.error ?? "Draft generation failed");
      return;
    }
    const data = await res.json();
    const draft = data.draft;
    setAddForm({
      name: draft.name,
      description: draftDescription,
      arxivCategories: draft.arxivCategories.join(", "),
      includeKeywords: draft.includeKeywords.join(", "),
      excludeKeywords: draft.excludeKeywords.join(", "),
      significanceNote: draft.significanceNote,
    });
    setDraftOpen(false);
    setAddOpen(true);
  }

  async function handlePreview(domainId: string) {
    setPreviewElapsedSeconds(0);
    setPreviewLoadingId(domainId);
    const res = await fetch("/api/admin/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domainId }),
    });
    setPreviewLoadingId(null);
    if (!res.ok) {
      setError("Preview failed");
      return;
    }
    const data = await res.json();
    setPreviewResults((prev) => ({ ...prev, [domainId]: data }));
  }

  if (loading) return <p className="mt-6 text-sm text-[var(--muted)]">Loading...</p>;

  const sorted = [...domains].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="mt-6 space-y-4">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button onClick={() => setDraftOpen((v) => !v)} className={buttonClass("secondary")}>
          Draft with Gemini
        </button>
        <button onClick={() => setAddOpen((v) => !v)} className={buttonClass("secondary")}>
          Add domain manually
        </button>
      </div>

      {draftOpen && (
        <Card>
          <p className="text-sm text-[var(--muted)]">
            Describe a domain in plain English. Gemini will draft categories/keywords/significance note
            for you to review before saving.
          </p>
          <textarea
            className={`mt-2 w-full ${INPUT_CLASS}`}
            rows={2}
            value={draftDescription}
            onChange={(e) => setDraftDescription(e.target.value)}
            placeholder="e.g. On-device / edge LLM deployment for mobile and embedded hardware"
          />
          {draftError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{draftError}</p>}
          <button
            onClick={handleDraft}
            disabled={draftLoading || !draftDescription}
            className={buttonClass("primary", "mt-2")}
          >
            {draftLoading ? "Drafting..." : "Draft"}
          </button>
        </Card>
      )}

      {addOpen && (
        <Card>
          <form onSubmit={handleAddSubmit}>
            <p className="mb-2 text-sm font-medium text-[var(--foreground)]">New domain (review before saving)</p>
            <DomainFormFields form={addForm} onChange={setAddForm} />
            <button type="submit" className={buttonClass("primary", "mt-2")}>
              Save domain
            </button>
          </form>
        </Card>
      )}

      <ul className="space-y-3">
        {sorted.map((d, idx) => (
          <li key={d.id}>
            <Card>
              {editingId === d.id ? (
                <div>
                  <DomainFormFields form={editForm} onChange={setEditForm} />
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => handleEditSave(d.id)} className={buttonClass("primary")}>
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className={buttonClass("secondary")}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[var(--foreground)]">{d.name}</p>
                      {!d.active && <Badge>inactive</Badge>}
                    </div>
                    <p className="text-sm text-[var(--muted)]">{d.description}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {d.arxivCategories.join(", ")} · include: {d.includeKeywords.join(", ") || "-"} · exclude:{" "}
                      {d.excludeKeywords.join(", ") || "-"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <button onClick={() => handleReorder(d.id, -1)} disabled={idx === 0} className={buttonClass("ghost", "!px-2")}>
                      ↑
                    </button>
                    <button
                      onClick={() => handleReorder(d.id, 1)}
                      disabled={idx === sorted.length - 1}
                      className={buttonClass("ghost", "!px-2")}
                    >
                      ↓
                    </button>
                    <button onClick={() => handleToggleActive(d)} className={buttonClass("secondary")}>
                      {d.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(d.id);
                        setEditForm(toForm(d));
                      }}
                      className={buttonClass("secondary")}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handlePreview(d.id)}
                      disabled={previewLoadingId === d.id}
                      title="Fetches live arXiv data and runs a real Gemini judging call — typically takes 20-60s depending on the domain's paper volume"
                      className={buttonClass("primary")}
                    >
                      {previewLoadingId === d.id ? `Previewing... ${previewElapsedSeconds}s` : "Preview"}
                    </button>
                    <button onClick={() => handleDelete(d.id)} className={buttonClass("danger")}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
              {previewLoadingId === d.id && (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  Running the real pipeline against live arXiv data, then a live Gemini call — this
                  can take 20-60s depending on how many papers this domain pulls in. ({previewElapsedSeconds}s elapsed)
                </p>
              )}
              {previewResults[d.id] && <PreviewPanel result={previewResults[d.id]} />}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
