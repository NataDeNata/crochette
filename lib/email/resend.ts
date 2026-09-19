import { Resend } from "resend";

let cached: Resend | undefined;

/** Lazily connects on first send, not on import — mirrors lib/db/index.ts so
 * routes that don't send email still build/run before RESEND_API_KEY is configured. */
function getResend(): Resend {
  if (cached) return cached;
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not set. Add a Resend API key to .env.local — see .env.example."
    );
  }
  cached = new Resend(process.env.RESEND_API_KEY);
  return cached;
}

/** Sender address. Read from `EMAIL_FROM` so the verified-domain sender
 * (`Yarns and Buttons <hello@yarnsandbuttons.com>`) is set per environment
 * rather than hardcoded — the same shape as SITE_URL in lib/site.ts. The
 * fallback is Resend's shared test domain, which keeps local dev and builds
 * working without the variable set; on the sandbox Resend only delivers to
 * the account's own verified email, regardless of the "to" address below. */
export const EMAIL_FROM = process.env.EMAIL_FROM?.trim() || "Yarns and Buttons <onboarding@resend.dev>";

export async function sendEmail(params: { to: string; subject: string; html: string }) {
  const resend = getResend();
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}
