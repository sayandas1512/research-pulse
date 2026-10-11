import { buildFeedbackUrl } from "./feedback";
import type { Action, DomainConfig, SelectedPick } from "./types";

export const WORD_BUDGET = 1_800;
const WORDS_PER_MINUTE = 230;

/** A pick plus the brief_item id it will be persisted under, generated before insertion so the
 * email HTML (rendered and saved before the DB write) can embed real, working feedback links. */
export interface RenderPick extends SelectedPick {
  itemId: string;
}

export interface DomainBriefSection {
  domain: DomainConfig;
  picks: RenderPick[];
  closestMissTitle: string | null;
  scanned: number;
  shortlisted: number;
  aiAvailable: boolean;
}

export interface BriefData {
  isoWeek: string;
  headline: string | null;
  sections: DomainBriefSection[];
  unavailableDomains: string[];
  appUrl: string;
  feedbackSecret?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function countWords(text: string): number {
  const stripped = text.replace(/<[^>]+>/g, " ");
  const words = stripped.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

const ACTION_LABEL: Record<Action, string> = {
  read: "Read",
  skim: "Skim",
  flag_for_client: "Flag for client",
  skip: "Skip",
};

function chip(label: string): string {
  return `<span style="display:inline-block;background:#f1f1f1;color:#444;border-radius:4px;padding:2px 6px;font-size:11px;margin-right:4px;">${escapeHtml(label)}</span>`;
}

async function renderFeedbackLinks(pick: RenderPick, appUrl: string, secret?: string): Promise<string> {
  if (!secret) return "";
  const [useful, notRelevant, saved] = await Promise.all([
    buildFeedbackUrl(appUrl, pick.itemId, "useful", secret),
    buildFeedbackUrl(appUrl, pick.itemId, "not_relevant", secret),
    buildFeedbackUrl(appUrl, pick.itemId, "saved", secret),
  ]);
  const btn = (href: string, label: string) =>
    `<a href="${href}" style="display:inline-block;border:1px solid #ddd;border-radius:4px;padding:3px 8px;font-size:11px;color:#444;text-decoration:none;margin-right:4px;">${escapeHtml(label)}</a>`;
  return `<div style="margin-top:8px;">${btn(useful, "Useful")}${btn(notRelevant, "Not relevant")}${btn(saved, "Save for client")}</div>`;
}

async function renderPick(pick: RenderPick, appUrl: string, secret?: string): Promise<string> {
  const verdict = pick.verdict;
  const chips: string[] = [];
  if (pick.signals.hfUpvotes) chips.push(`${pick.signals.hfUpvotes} HF upvotes`);
  if (pick.signals.codeLink) chips.push("code released");
  if (pick.signals.venueHint) chips.push("venue noted");
  const authors = pick.paper.authors.slice(0, 3).join(", ") + (pick.paper.authors.length > 3 ? " et al." : "");
  const alsoIn = pick.alsoInDomains.length > 0 ? ` <span style="color:#888;">(also in ${escapeHtml(pick.alsoInDomains.join(", "))})</span>` : "";
  const feedbackLinks = await renderFeedbackLinks(pick, appUrl, secret);

  return `
    <tr><td style="padding:10px 0;border-top:1px solid #eee;">
      <a href="${pick.paper.absUrl}" style="font-size:15px;font-weight:600;color:#111;text-decoration:none;">${escapeHtml(pick.paper.title)}</a>${alsoIn}
      <div style="font-size:12px;color:#777;margin-top:2px;">${escapeHtml(authors)}</div>
      <div style="margin-top:6px;">${chips.map(chip).join("")}</div>
      <div style="font-size:12px;color:#999;margin-top:4px;">${escapeHtml(verdict.paperType.replace(/_/g, " "))} · evidence: ${escapeHtml(verdict.evidenceStrength)}</div>
      <p style="font-size:14px;color:#222;margin:6px 0 2px;">${escapeHtml(verdict.soWhat)}</p>
      <p style="font-size:12px;color:#999;margin:0 0 6px;">Caveat: ${escapeHtml(verdict.caveat)}</p>
      <span style="display:inline-block;background:#111;color:#fff;border-radius:4px;padding:3px 8px;font-size:12px;">${escapeHtml(ACTION_LABEL[verdict.action])}</span>
      ${feedbackLinks}
    </td></tr>`;
}

async function renderSection(section: DomainBriefSection, appUrl: string, secret?: string): Promise<string> {
  const header = `
    <tr><td style="padding:18px 0 4px;">
      <h2 style="font-size:16px;margin:0;color:#111;">${escapeHtml(section.domain.name)}</h2>
      <div style="font-size:11px;color:#aaa;">Scanned ${section.scanned}, shortlisted ${section.shortlisted}, shown ${section.picks.length}.</div>
    </td></tr>`;

  if (!section.aiAvailable) {
    return `${header}<tr><td style="padding:4px 0;font-size:13px;color:#b45309;">AI summaries unavailable for this domain this week — showing ranked titles only.</td></tr>`;
  }

  if (section.picks.length === 0) {
    const miss = section.closestMissTitle
      ? ` Closest miss: "${escapeHtml(section.closestMissTitle)}".`
      : "";
    return `${header}<tr><td style="padding:4px 0;font-size:13px;color:#777;">Nothing significant this week.${miss}</td></tr>`;
  }

  const picksHtml = await Promise.all(section.picks.map((p) => renderPick(p, appUrl, secret)));
  return header + picksHtml.join("");
}

export async function renderBriefHtml(data: BriefData): Promise<{ html: string; wordCount: number }> {
  const sectionsHtml = await Promise.all(data.sections.map((s) => renderSection(s, data.appUrl, data.feedbackSecret)));
  const bodyRows = [
    data.headline
      ? `<tr><td style="padding:0 0 16px;font-size:14px;color:#333;">${escapeHtml(data.headline)
          .split("\n")
          .join("<br/>")}</td></tr>`
      : "",
    ...sectionsHtml,
  ].join("");

  const unavailableNote =
    data.unavailableDomains.length > 0
      ? `<tr><td style="padding:8px 0;font-size:12px;color:#b45309;">Unavailable this week: ${escapeHtml(data.unavailableDomains.join(", "))}.</td></tr>`
      : "";

  const totalScanned = data.sections.reduce((sum, s) => sum + s.scanned, 0);
  const totalShortlisted = data.sections.reduce((sum, s) => sum + s.shortlisted, 0);
  const totalShown = data.sections.reduce((sum, s) => sum + s.picks.length, 0);

  const bodyText = `${data.headline ?? ""} ${data.sections
    .flatMap((s) => s.picks.flatMap((p) => [p.paper.title, p.verdict.soWhat, p.verdict.caveat]))
    .join(" ")}`;
  const wordCount = countWords(bodyText);
  const readMinutes = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f7f7;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;padding:24px;">
          <tr><td>
            <h1 style="font-size:20px;margin:0 0 4px;color:#111;">Research Pulse — ${escapeHtml(data.isoWeek)}</h1>
            <div style="font-size:12px;color:#999;margin-bottom:12px;">About ${readMinutes} min read</div>
          </td></tr>
          ${bodyRows}
          ${unavailableNote}
          <tr><td style="padding:20px 0 0;border-top:1px solid #eee;font-size:11px;color:#aaa;">
            Preprints, not peer reviewed unless noted. Summaries are AI-generated from abstracts.
            Scanned ${totalScanned}, shortlisted ${totalShortlisted}, shown ${totalShown}.
            <br/><a href="${data.appUrl}/brief/${data.isoWeek}" style="color:#aaa;">View in browser</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { html, wordCount };
}

export function readTimeMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

/**
 * If the rendered brief exceeds the word budget, drop the single lowest-significance
 * pick across all domains (not domain-local) and re-render, repeating until under
 * budget or there is nothing left to drop. Never pads — only removes.
 */
export async function applyWordBudget(
  data: BriefData,
  budget = WORD_BUDGET,
): Promise<{ data: BriefData; html: string; wordCount: number; dropped: number }> {
  let working = data;
  let dropped = 0;

  while (true) {
    const { html, wordCount } = await renderBriefHtml(working);
    if (wordCount <= budget) return { data: working, html, wordCount, dropped };

    let lowestSection = -1;
    let lowestPickIndex = -1;
    let lowestSignificance = Infinity;
    working.sections.forEach((section, sIdx) => {
      section.picks.forEach((pick, pIdx) => {
        if (pick.verdict.significance < lowestSignificance) {
          lowestSignificance = pick.verdict.significance;
          lowestSection = sIdx;
          lowestPickIndex = pIdx;
        }
      });
    });

    if (lowestSection === -1) return { data: working, html, wordCount, dropped };

    const newSections = working.sections.map((section, idx) => {
      if (idx !== lowestSection) return section;
      return { ...section, picks: section.picks.filter((_, pIdx) => pIdx !== lowestPickIndex) };
    });
    working = { ...working, sections: newSections };
    dropped += 1;
  }
}
