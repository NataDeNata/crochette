const XENDIT_API = "https://api.xendit.co";

/** Lazily checked on first call, not on import — mirrors lib/db/index.ts and
 * lib/email/resend.ts so the app still builds/runs before XENDIT_SECRET_KEY
 * is configured. No SDK dependency — Xendit has no well-maintained official
 * Node SDK, so this calls the REST API directly with fetch. */
function authHeader(): string {
  if (!process.env.XENDIT_SECRET_KEY) {
    throw new Error(
      "XENDIT_SECRET_KEY is not set. Add a Xendit API key to .env.local — see .env.example."
    );
  }
  return "Basic " + Buffer.from(`${process.env.XENDIT_SECRET_KEY}:`).toString("base64");
}

export async function createPaymentSession(params: {
  referenceId: string;
  amountCents: number;
  items: Array<{ name: string; amountCents: number; quantity: number }>;
  customer: { name: string; email: string; phone?: string };
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; paymentLinkUrl: string }> {
  const [givenNames, ...rest] = params.customer.name.trim().split(/\s+/);
  const surname = rest.join(" ") || givenNames;

  const res = await fetch(`${XENDIT_API}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      reference_id: params.referenceId,
      session_type: "PAY",
      mode: "PAYMENT_LINK",
      currency: "PHP",
      country: "PH",
      amount: params.amountCents / 100,
      customer: {
        reference_id: params.referenceId,
        type: "INDIVIDUAL",
        email: params.customer.email,
        mobile_number: params.customer.phone || undefined,
        individual_detail: { given_names: givenNames, surname },
      },
      items: params.items.map((item) => ({
        reference_id: params.referenceId,
        type: "PHYSICAL_PRODUCT",
        name: item.name,
        net_unit_amount: item.amountCents / 100,
        quantity: item.quantity,
        category: "General",
      })),
      metadata: { orderId: params.referenceId },
      success_return_url: params.successUrl,
      cancel_return_url: params.cancelUrl,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xendit session creation failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  return { id: json.payment_session_id, paymentLinkUrl: json.payment_link_url };
}
