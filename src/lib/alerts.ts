import { sendMail } from "./mailer";

export async function sendAlert(subject: string, message: string): Promise<void> {
  const alertEmail = process.env.ALERT_EMAIL;
  if (!alertEmail) return;
  await sendMail({
    to: alertEmail,
    subject: `[Research Pulse] ${subject}`,
    html: `<pre style="font-family:monospace;white-space:pre-wrap;">${message.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`,
  });
}
