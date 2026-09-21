import { sendEmail } from "./resend";
import { formatPrice } from "@/lib/data/products";
import { SITE_URL } from "@/lib/site";
import { logError } from "@/lib/observability/log";
import { mintOrderToken } from "@/lib/security/order-token";

const STUDIO_NOTIFY_EMAIL = process.env.STUDIO_NOTIFY_EMAIL;

async function sendEmailSafe(params: { to: string; subject: string; html: string }, context: string) {
  try {
    await sendEmail(params);
  } catch (err) {
    // Deliberately swallowed — a failed notification must never fail a
    // submission whose DB write already succeeded. That makes this the single
    // most important thing in the app to report: all 10 notification call
    // sites funnel through here, including the paid-order receipt fired from
    // the Xendit webhook, and `sendEmail` also throws when RESEND_API_KEY is
    // unset — so a missing env var would otherwise drop every transactional
    // email forever with nothing but a stdout line.
    //
    // `emailContext` is the caller's label as a queryable field rather than
    // string-interpolated, which turns 10 sites into one filterable dimension.
    // The recipient address is deliberately NOT logged (and Resend's own error
    // message, which often contains it, is scrubbed by the logger).
    logError("email.send_failed", err, { emailContext: context });
  }
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

function wrapEmail(bodyHtml: string) {
  return `<div style="font-family: Georgia, 'Cormorant Garamond', serif; color: #3a332c; max-width: 480px; margin: 0 auto;">
    <h1 style="font-size: 22px; font-weight: 500; margin-bottom: 4px;">Yarns and Buttons</h1>
    ${bodyHtml}
    <p style="margin-top: 32px; font-size: 12px; color: #8a8175;">Made by hand, in small batches.</p>
  </div>`;
}

function detailList(items: Array<[label: string, value: string | null | undefined]>) {
  const rows = items
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, value]) => `<li>${escapeHtml(label)}: ${escapeHtml(value)}</li>`)
    .join("");
  return rows ? `<ul style="font-size: 13px; color: #6b6257; padding-left: 18px;">${rows}</ul>` : "";
}

export async function notifyCustomOrderSubmitted(data: {
  name: string;
  email: string;
  pieceType: string;
  preferredSize?: string | null;
  preferredColors?: string | null;
  budgetRange?: string | null;
  description: string;
  photoCount: number;
}) {
  const safeName = escapeHtml(data.name);

  await Promise.all([
    sendEmailSafe(
      {
        to: data.email,
        subject: "We received your custom order request",
        html: wrapEmail(`
          <p>Hi ${safeName},</p>
          <p>Thanks for reaching out about a custom ${escapeHtml(data.pieceType)} piece! We've received your request and will follow up by email with a quote soon.</p>
          ${detailList([
            ["Size", data.preferredSize],
            ["Colors", data.preferredColors],
            ["Budget", data.budgetRange],
            ["Photos attached", data.photoCount ? String(data.photoCount) : null],
          ])}
          <p style="font-size: 13px; color: #6b6257;">${escapeHtml(data.description)}</p>
        `),
      },
      "custom-order customer confirmation"
    ),
    STUDIO_NOTIFY_EMAIL
      ? sendEmailSafe(
          {
            to: STUDIO_NOTIFY_EMAIL,
            subject: `New custom order request from ${data.name}`,
            html: wrapEmail(`
              <p>New custom order request:</p>
              ${detailList([
                ["Name", data.name],
                ["Email", data.email],
                ["Piece type", data.pieceType],
                ["Size", data.preferredSize],
                ["Colors", data.preferredColors],
                ["Budget", data.budgetRange],
                ["Photos", String(data.photoCount)],
              ])}
              <p style="font-size: 13px;">${escapeHtml(data.description)}</p>
              <p style="font-size: 13px;"><a href="${SITE_URL}/admin/custom-orders">Review in admin dashboard</a></p>
            `),
          },
          "custom-order studio notification"
        )
      : Promise.resolve(),
  ]);
}

export async function notifyOrderPaid(order: {
  id: string;
  customerName: string;
  customerEmail: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingProvince: string;
  shippingPostalCode: string;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
}, items: Array<{ productName: string; unitPriceCents: number; quantity: number }>) {
  const safeName = escapeHtml(order.customerName);
  const address = [order.shippingLine1, order.shippingLine2, order.shippingCity, order.shippingProvince, order.shippingPostalCode]
    .filter(Boolean)
    .join(", ");

  const itemRows = items
    .map(
      (item) =>
        `<li>${escapeHtml(item.productName)} × ${item.quantity}: ${escapeHtml(formatPrice(item.unitPriceCents * item.quantity))}</li>`
    )
    .join("");

  await Promise.all([
    sendEmailSafe(
      {
        to: order.customerEmail,
        subject: "Your Yarns and Buttons order is confirmed",
        html: wrapEmail(`
          <p>Hi ${safeName},</p>
          <p>Thank you for your order! We've received your payment and will start preparing it soon.</p>
          <ul style="font-size: 13px; color: #6b6257; padding-left: 18px;">${itemRows}</ul>
          ${detailList([
            ["Subtotal", formatPrice(order.subtotalCents)],
            ["Shipping", formatPrice(order.shippingCents)],
            ["Discount", order.discountCents > 0 ? `-${formatPrice(order.discountCents)}` : null],
            ["Total", formatPrice(order.totalCents)],
            ["Shipping to", address],
          ])}
        `),
      },
      "order customer receipt"
    ),
    STUDIO_NOTIFY_EMAIL
      ? sendEmailSafe(
          {
            to: STUDIO_NOTIFY_EMAIL,
            subject: `New paid order from ${order.customerName}: ${formatPrice(order.totalCents)}`,
            html: wrapEmail(`
              <p>New paid order:</p>
              <ul style="font-size: 13px; color: #6b6257; padding-left: 18px;">${itemRows}</ul>
              ${detailList([
                ["Total", formatPrice(order.totalCents)],
                ["Shipping to", address],
              ])}
              <p style="font-size: 13px;"><a href="${SITE_URL}/admin/orders/${order.id}">Review in admin dashboard</a></p>
            `),
          },
          "order studio notification"
        )
      : Promise.resolve(),
  ]);
}

export async function notifyOrderShipped(order: {
  id: string;
  customerName: string;
  customerEmail: string;
  trackingNumber: string | null;
  carrier: string | null;
}) {
  const safeName = escapeHtml(order.customerName);

  await sendEmailSafe(
    {
      to: order.customerEmail,
      subject: "Your Yarns and Buttons order has shipped!",
      html: wrapEmail(`
        <p>Hi ${safeName},</p>
        <p>Good news, your order is on its way!</p>
        ${detailList([
          ["Carrier", order.carrier],
          ["Tracking number", order.trackingNumber],
        ])}
        <p style="font-size: 13px;"><a href="${SITE_URL}/order/${order.id}?t=${mintOrderToken(order.id)}">View your order</a></p>
      `),
    },
    "order shipped notice"
  );
}

export async function notifyOrderDelivered(order: {
  id: string;
  customerName: string;
  customerEmail: string;
}) {
  const safeName = escapeHtml(order.customerName);

  await sendEmailSafe(
    {
      to: order.customerEmail,
      subject: "Your Yarns and Buttons order is complete",
      html: wrapEmail(`
        <p>Hi ${safeName},</p>
        <p>Your order is marked complete. We hope you love your piece! If anything's not quite right, just reply and let us know.</p>
        <p style="font-size: 13px;"><a href="${SITE_URL}/order/${order.id}?t=${mintOrderToken(order.id)}">View your order</a></p>
      `),
    },
    "order delivered notice"
  );
}

export async function notifyAccountCreated(data: { email: string; name: string }) {
  const safeName = escapeHtml(data.name);

  await sendEmailSafe(
    {
      to: data.email,
      subject: "Welcome to Yarns and Buttons",
      html: wrapEmail(`
        <p>Hi ${safeName},</p>
        <p>Your account is ready. You can now save shipping addresses and see your order history any time you're signed in.</p>
        <p style="font-size: 13px;"><a href="${SITE_URL}/account">Go to your account</a></p>
      `),
    },
    "account welcome"
  );
}

/**
 * The "prove this is your address" link, sent at signup and on every resend.
 *
 * Goes through `sendEmailSafe` like the other nine, so a mail failure can never
 * fail the signup that triggered it — an account that exists but has not been
 * mailed is recoverable from the banner's resend button, whereas a signup that
 * throws after the row is written is not.
 */
export async function notifyEmailVerification(data: { email: string; name?: string | null; token: string }) {
  const greeting = data.name ? `Hi ${escapeHtml(data.name)},` : "Hello,";
  const link = `${SITE_URL}/account/verify?token=${encodeURIComponent(data.token)}`;

  await sendEmailSafe(
    {
      to: data.email,
      subject: "Confirm your email address",
      html: wrapEmail(`
        <p>${greeting}</p>
        <p>Please confirm this is your email address so we can keep your order history and account recovery attached to it.</p>
        <p style="font-size: 13px;"><a href="${link}">Confirm my email address</a></p>
        <p style="font-size: 12px; color: #8a8175;">The link works for seven days. If you didn't create an account with us, you can ignore this — nothing happens until it's clicked.</p>
      `),
    },
    "email verification"
  );
}

/**
 * The reset link. Sent only where an account exists *and* has a password —
 * `notifyPasswordResetUnavailable` below is what a Google-only account gets
 * instead, so that the request form can answer identically in every case
 * without the mail itself becoming the oracle the form refused to be.
 */
export async function notifyPasswordReset(data: { email: string; name?: string | null; token: string }) {
  const greeting = data.name ? `Hi ${escapeHtml(data.name)},` : "Hello,";
  const link = `${SITE_URL}/account/reset-password?token=${encodeURIComponent(data.token)}`;

  await sendEmailSafe(
    {
      to: data.email,
      subject: "Reset your password",
      html: wrapEmail(`
        <p>${greeting}</p>
        <p>Someone asked to reset the password on your Yarns and Buttons account. If that was you, choose a new one here:</p>
        <p style="font-size: 13px;"><a href="${link}">Set a new password</a></p>
        <p style="font-size: 12px; color: #8a8175;">The link works for two hours and can only be used once. If it wasn't you, ignore this email — your password hasn't changed, and nobody can reset it without this link.</p>
      `),
    },
    "password reset"
  );
}

/**
 * Sent once a password has actually changed — the other half of the reset mail,
 * and the more important one.
 *
 * The reset link tells someone a reset was *requested*, which they can ignore if
 * it wasn't them. This tells them it *succeeded*, which they cannot: if it
 * wasn't them, somebody now holds their account and this mail is how they find
 * out. That is the whole justification for a message with no action in it.
 *
 * Deliberately contains **no link that does anything** — no reset, no sign-in
 * token, nothing spendable. A mail sent to someone whose account may already be
 * compromised should not also be a credential, and "your password changed" is a
 * natural shape for a phishing lure, so this one points only at the contact
 * form the site already publishes.
 */
export async function notifyPasswordChanged(data: { email: string; name?: string | null; at?: Date }) {
  const greeting = data.name ? `Hi ${escapeHtml(data.name)},` : "Hello,";
  // Spelled out with the zone named, because a bare timestamp in an unknown
  // zone is not evidence a reader can act on — the question this mail has to
  // answer is "was that me, twenty minutes ago?"
  const when = (data.at ?? new Date()).toLocaleString("en-PH", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  });

  await sendEmailSafe(
    {
      to: data.email,
      subject: "Your password was changed",
      html: wrapEmail(`
        <p>${greeting}</p>
        <p>The password on your Yarns and Buttons account was changed on ${escapeHtml(when)} (Philippine time). Every other device that was signed in has been signed out.</p>
        <p style="font-size: 13px;">If this was you, there's nothing to do.</p>
        <p style="font-size: 13px;"><strong>If it wasn't you, tell us straight away</strong> — reply to this email or use the contact form at <a href="${SITE_URL}/contact">${SITE_URL}/contact</a>. Don't use any password-reset link you may have received; ask us first.</p>
      `),
    },
    "password changed"
  );
}

/** What a reset request against a Google-only account gets: how to sign in,
 * not a link to a password the account has never had. */
export async function notifyPasswordResetUnavailable(data: { email: string; name?: string | null }) {
  const greeting = data.name ? `Hi ${escapeHtml(data.name)},` : "Hello,";

  await sendEmailSafe(
    {
      to: data.email,
      subject: "Reset your password",
      html: wrapEmail(`
        <p>${greeting}</p>
        <p>Someone asked to reset the password on your Yarns and Buttons account. This account signs in with Google, so there's no password to reset — use the "Continue with Google" button instead.</p>
        <p style="font-size: 13px;"><a href="${SITE_URL}/account/login">Go to sign in</a></p>
        <p style="font-size: 12px; color: #8a8175;">If it wasn't you who asked, you can ignore this email. Nothing about your account has changed.</p>
      `),
    },
    "password reset unavailable"
  );
}

export async function notifyContactMessageSubmitted(data: {
  name: string;
  email: string;
  subject?: string | null;
  message: string;
}) {
  const safeName = escapeHtml(data.name);

  await Promise.all([
    sendEmailSafe(
      {
        to: data.email,
        subject: "We received your message",
        html: wrapEmail(`
          <p>Hi ${safeName},</p>
          <p>Thanks for reaching out! We've received your message and will get back to you soon.</p>
          <p style="font-size: 13px; color: #6b6257;">${escapeHtml(data.message)}</p>
        `),
      },
      "contact customer confirmation"
    ),
    STUDIO_NOTIFY_EMAIL
      ? sendEmailSafe(
          {
            to: STUDIO_NOTIFY_EMAIL,
            subject: `New contact message from ${data.name}${data.subject ? `: ${data.subject}` : ""}`,
            html: wrapEmail(`
              <p>New contact message:</p>
              ${detailList([
                ["Name", data.name],
                ["Email", data.email],
                ["Subject", data.subject],
              ])}
              <p style="font-size: 13px;">${escapeHtml(data.message)}</p>
            `),
          },
          "contact studio notification"
        )
      : Promise.resolve(),
  ]);
}
