import { buildFeedbackUrl } from "@/src/lib/feedback";

const BUTTON_CLASS =
  "rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800";

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
    <div className="mt-2 flex gap-2">
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
