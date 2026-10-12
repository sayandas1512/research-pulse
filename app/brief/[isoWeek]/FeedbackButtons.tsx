import { buildFeedbackUrl } from "@/src/lib/feedback";
import FeedbackButtonsClient from "./FeedbackButtonsClient";

export default async function FeedbackButtons({ briefItemId }: { briefItemId: string }) {
  const secret = process.env.FEEDBACK_HMAC_SECRET;
  const appUrl = process.env.APP_URL ?? "";
  if (!secret) return null;

  const [useful, notRelevant, saved] = await Promise.all([
    buildFeedbackUrl(appUrl, briefItemId, "useful", secret),
    buildFeedbackUrl(appUrl, briefItemId, "not_relevant", secret),
    buildFeedbackUrl(appUrl, briefItemId, "saved", secret),
  ]);

  return <FeedbackButtonsClient urls={{ useful, not_relevant: notRelevant, saved }} />;
}
