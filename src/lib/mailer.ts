import { Resend } from "resend";
import nodemailer from "nodemailer";
import { withRetry } from "./limits";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface MailResult {
  ok: boolean;
  error?: string;
}

async function sendViaResend(message: MailMessage, apiKey: string, from: string): Promise<void> {
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [message.to],
    subject: message.subject,
    html: message.html,
  });
  if (error) throw new Error(error.message);
}

async function sendViaSmtp(message: MailMessage, smtpUrl: string, from: string): Promise<void> {
  const transport = nodemailer.createTransport(smtpUrl);
  await transport.sendMail({ from, to: message.to, subject: message.subject, html: message.html });
}

/** One retry on failure, per the brief. Mailer provider is chosen by MAIL_PROVIDER (resend | smtp). */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  const provider = process.env.MAIL_PROVIDER ?? "resend";
  const from = process.env.MAIL_FROM;
  if (!from) return { ok: false, error: "Missing MAIL_FROM" };

  try {
    await withRetry(
      async () => {
        if (provider === "smtp") {
          const smtpUrl = process.env.SMTP_URL;
          if (!smtpUrl) throw new Error("Missing SMTP_URL for MAIL_PROVIDER=smtp");
          await sendViaSmtp(message, smtpUrl, from);
        } else {
          const apiKey = process.env.RESEND_API_KEY;
          if (!apiKey) throw new Error("Missing RESEND_API_KEY for MAIL_PROVIDER=resend");
          await sendViaResend(message, apiKey, from);
        }
      },
      { retries: 1, baseDelayMs: 2_000 },
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
