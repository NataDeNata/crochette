import { sendEmail } from "./resend";
import { formatPrice } from "@/lib/data/products";
import { SITE_URL } from "@/lib/site";

const STUDIO_NOTIFY_EMAIL = process.env.STUDIO_NOTIFY_EMAIL;

async function sendEmailSafe(params: { to: string; subject: string; html: string }, context: string) {
  try {
    await sendEmail(params);
  } catch (err) {
    console.error(`${context} email failed:`, err);
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
    <h1 style="font-size: 22px; font-weight: 500; margin-bottom: 4px;">Crochette</h1>
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
  totalCents: number;
}, items: Array<{ productName: string; unitPriceCents: number; quantity: number }>) {
  const safeName = escapeHtml(order.customerName);
  const address = [order.shippingLine1, order.shippingLine2, order.shippingCity, order.shippingProvince, order.shippingPostalCode]
    .filter(Boolean)
    .join(", ");

  const itemRows = items
    .map(
      (item) =>
        `<li>${escapeHtml(item.productName)} × ${item.quantity} — ${escapeHtml(formatPrice(item.unitPriceCents * item.quantity))}</li>`
    )
    .join("");

  await Promise.all([
    sendEmailSafe(
      {
        to: order.customerEmail,
        subject: "Your Crochette order is confirmed",
        html: wrapEmail(`
          <p>Hi ${safeName},</p>
          <p>Thank you for your order! We've received your payment and will start preparing it soon.</p>
          <ul style="font-size: 13px; color: #6b6257; padding-left: 18px;">${itemRows}</ul>
          ${detailList([
            ["Subtotal", formatPrice(order.subtotalCents)],
            ["Shipping", formatPrice(order.shippingCents)],
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
            subject: `New paid order from ${order.customerName} — ${formatPrice(order.totalCents)}`,
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
