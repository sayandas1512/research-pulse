import { buildFeedbackUrl } from "@/src/lib/feedback";

const BUTTON_CLASS =
  "rounded-md border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]";

export default async function FeedbackButtons({ briefItemId }: { briefItemId: string }) {
  const secret = process.env.FEEDBACK_HMAC_SECRET;
  const appUrl = process.env.APP_URL ?? "";
  if (!secret) return null;

  const [useful, notRelevant, saved] = await Promise.all([
    buildFeedbackUrl(appUrl, briefItemId, "useful", secret),
    buildFeedbackUrl(appUrl, briefItemId, "not_relevant", secret),
    buildFeedbackUrl(appUrl, briefItemId, "saved", secret),
  ]);

  return (
    <div className="mt-3 flex gap-2 border-t border-[var(--border)] pt-3">
      <a href={useful} className={BUTTON_CLASS}>
        Useful
      </a>
      <a href={notRelevant} className={BUTTON_CLASS}>
        Not relevant
      </a>
      <a href={saved} className={BUTTON_CLASS}>
        Save for client
      </a>
    </div>
  );
}
